"""
MindTech Mystery – FastAPI Backend
Handles answer validation for all puzzle stages.
Correct answers are stored server-side only.
Team results are persisted in Upstash Redis (Vercel KV).
"""

import json
import os
import time
import csv
import io

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="MindTech Mystery API", version="1.0.0")


# --- Redis / Upstash KV Setup ---
REDIS_KEY = "mindtech:completed_teams"

_redis_client = None


def get_redis():
    """Lazy-initialize the Upstash Redis client."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    url = os.getenv("KV_REST_API_URL") or os.getenv("UPSTASH_REDIS_REST_URL")
    token = os.getenv("KV_REST_API_TOKEN") or os.getenv("UPSTASH_REDIS_REST_TOKEN")

    if url and token:
        try:
            from upstash_redis import Redis
            _redis_client = Redis(url=url, token=token)
            return _redis_client
        except Exception as e:
            print(f"[WARN] Failed to initialize Redis: {e}")

    return None


# --- In-memory fallback (local dev only) ---
_local_teams: list[dict] = []


def save_team(team_data: dict):
    """Save a team result to Redis (persistent) or in-memory (fallback)."""
    redis = get_redis()
    if redis:
        redis.rpush(REDIS_KEY, json.dumps(team_data))
    else:
        _local_teams.append(team_data)


def load_all_teams() -> list[dict]:
    """Load all completed team results from Redis or in-memory."""
    redis = get_redis()
    if redis:
        raw_list = redis.lrange(REDIS_KEY, 0, -1)
        teams = []
        for item in raw_list:
            if isinstance(item, str):
                teams.append(json.loads(item))
            elif isinstance(item, dict):
                teams.append(item)
        return teams
    else:
        return list(_local_teams)


def get_allowed_origins() -> list[str]:
    configured_origins = os.getenv("ALLOWED_ORIGINS", "")
    if configured_origins.strip():
        return [
            origin.strip()
            for origin in configured_origins.split(",")
            if origin.strip()
        ]

    return [
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Answer Store (server-side only, never exposed) ---
ANSWERS = {
    "stage1": "OKPEVFEI",
    "stage2": "Q9B",
    "stage4": "niece",
}

# --- Vault brute-force protection ---
vault_attempts: dict[str, list[float]] = {}
VAULT_MAX_ATTEMPTS = 3
VAULT_COOLDOWN_SECONDS = 5


# --- Request Models ---
class Stage1Request(BaseModel):
    answer: str


class Stage2Request(BaseModel):
    answer: str


class VaultRequest(BaseModel):
    code1: str
    code2: str


class Stage4Request(BaseModel):
    answer: str


class TeamCompleteRequest(BaseModel):
    team_number: str
    team_leader_name: str
    time_taken: str
    stages_solved: int = 4


# --- Helper ---
def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def time_str_to_seconds(time_str: str) -> int:
    """Convert MM:SS format to total seconds for sorting."""
    try:
        parts = time_str.strip().split(":")
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
    except (ValueError, IndexError):
        pass
    return 999999


# --- Endpoints ---
@app.post("/stage1")
async def validate_stage1(body: Stage1Request):
    """Validate cipher decode answer (3-digit number)."""
    correct = body.answer.strip().upper() == ANSWERS["stage1"]
    return {"correct": correct}


@app.post("/stage2")
async def validate_stage2(body: Stage2Request):
    """Validate sliding puzzle code (4-char alphanumeric)."""
    correct = body.answer.strip().upper() == ANSWERS["stage2"]
    return {"correct": correct}


@app.post("/vault")
async def validate_vault(body: VaultRequest, request: Request):
    """
    Validate both codes for vault unlock.
    Includes rate limiting to prevent brute-force attempts.
    """
    client_ip = get_client_ip(request)
    now = time.time()

    # Clean up old attempts (older than cooldown window)
    if client_ip in vault_attempts:
        vault_attempts[client_ip] = [
            t for t in vault_attempts[client_ip]
            if now - t < VAULT_COOLDOWN_SECONDS
        ]

    # Check rate limit
    if client_ip in vault_attempts and len(vault_attempts[client_ip]) >= VAULT_MAX_ATTEMPTS:
        oldest = vault_attempts[client_ip][0]
        wait_time = round(VAULT_COOLDOWN_SECONDS - (now - oldest), 1)
        return {
            "correct": False,
            "error": f"Too many attempts. Please wait {max(wait_time, 0.1)} seconds.",
            "rate_limited": True,
        }

    # Validate both codes
    code1_correct = body.code1.strip().upper() == ANSWERS["stage1"]
    code2_correct = body.code2.strip().upper() == ANSWERS["stage2"]
    correct = code1_correct and code2_correct

    if not correct:
        # Track failed attempt
        if client_ip not in vault_attempts:
            vault_attempts[client_ip] = []
        vault_attempts[client_ip].append(now)

    return {"correct": correct}


@app.post("/stage4")
async def validate_stage4(body: Stage4Request):
    """Validate logical question answer (case-insensitive)."""
    correct = body.answer.strip().lower() == ANSWERS["stage4"]
    return {"correct": correct}


@app.post("/team-complete")
async def register_team_completion(body: TeamCompleteRequest):
    """Register a team's completion. Persisted in Upstash Redis."""
    team_data = {
        "team_number": body.team_number.strip(),
        "team_leader_name": body.team_leader_name.strip(),
        "time_taken": body.time_taken.strip(),
        "stages_solved": body.stages_solved,
    }
    save_team(team_data)
    return {"success": True, "message": "Team result recorded."}


@app.get("/teams")
async def get_completed_teams(format: str = "json"):
    """
    Public endpoint: returns all completed teams sorted by time (fastest first).
    Data is persisted in Upstash Redis and available at any time.
    """
    all_teams = load_all_teams()
    sorted_teams = sorted(
        all_teams,
        key=lambda t: time_str_to_seconds(t.get("time_taken", "99:99")),
    )

    if format.lower() == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Rank", "Team Number", "Team Leader", "Time Taken", "Stages Solved"])
        for rank, team in enumerate(sorted_teams, 1):
            writer.writerow([
                rank,
                team.get("team_number", ""),
                team.get("team_leader_name", ""),
                team.get("time_taken", ""),
                team.get("stages_solved", 4)
            ])
        csv_content = output.getvalue()
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=teams_leaderboard.csv"}
        )

    return {
        "total_teams": len(sorted_teams),
        "teams": sorted_teams,
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    redis = get_redis()
    return {
        "status": "ok",
        "message": "MindTech Mystery API is running",
        "storage": "redis" if redis else "in-memory (local dev)",
    }

