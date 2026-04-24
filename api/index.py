"""
Vercel Serverless Function entry point.
Re-exports the FastAPI app from the backend package under the /api prefix.
"""

import sys
import os

# Add the backend directory to the Python path so we can import main.py
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from main import (
    app as backend_app,
    validate_stage1,
    validate_stage2,
    validate_vault,
    validate_stage4,
    register_team_completion,
    get_completed_teams,
    health_check,
    Stage1Request,
    Stage2Request,
    VaultRequest,
    Stage4Request,
    TeamCompleteRequest,
)

# Create a new app mounted at /api so Vercel routing works correctly
app = FastAPI(title="MindTech Mystery API", version="1.0.0")

# Copy CORS settings – on Vercel the frontend and API share the same domain,
# but we keep permissive CORS for local dev and custom domain setups.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Re-mount all endpoints under /api
app.post("/api/stage1")(validate_stage1)
app.post("/api/stage2")(validate_stage2)
app.post("/api/vault")(validate_vault)
app.post("/api/stage4")(validate_stage4)
app.post("/api/team-complete")(register_team_completion)
app.get("/api/teams")(get_completed_teams)
app.get("/api/health")(health_check)
