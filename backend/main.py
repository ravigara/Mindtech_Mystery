"""
MindTech Mystery – FastAPI Backend
Handles answer validation for all puzzle stages.
Correct answers are stored server-side only.
"""

import os
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="MindTech Mystery API", version="1.0.0")


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
    "stage2": "A9X3",
    "stage4": "sister",
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


# --- Helper ---
def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


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


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "message": "MindTech Mystery API is running"}
