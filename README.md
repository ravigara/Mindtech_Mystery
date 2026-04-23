# MindTech Mystery – Vercel Deployment

A multi-stage puzzle challenge: static frontend + FastAPI backend, deployed as a single Vercel project.

## Architecture

| Component | Technology | Vercel Runtime |
|-----------|-----------|----------------|
| Frontend  | HTML / CSS / JS | Static Files (`frontend/`) |
| Backend   | FastAPI (Python) | Serverless Function (`api/`) |

All API endpoints are served under `/api/*` on the same domain as the frontend — no CORS issues in production.

## Project Structure

```
├── api/
│   └── index.py          # Vercel serverless entry point (re-exports FastAPI app)
├── backend/
│   ├── main.py            # FastAPI application (answer validation, rate limiting)
│   └── requirements.txt   # Python dependencies (backend-local reference)
├── frontend/
│   ├── index.html         # Main puzzle app
│   ├── puzzle.html         # Sliding puzzle (embedded via iframe)
│   ├── env.js             # Runtime config (API_BASE_URL)
│   ├── css/               # Styles
│   ├── js/                # Application logic
│   └── assets/            # Images and media
├── requirements.txt       # Python dependencies (Vercel reads this)
└── vercel.json            # Vercel project configuration
```

## Deploy to Vercel

### One-click

1. Push this repo to GitHub / GitLab / Bitbucket.
2. Import the repo at [vercel.com/new](https://vercel.com/new).
3. Vercel auto-detects `vercel.json` — no extra config needed.
4. Click **Deploy**.

### CLI

```bash
npm i -g vercel
vercel
```

### Environment Variables (optional)

| Variable | Purpose | Default |
|----------|---------|---------|
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins | `*` (all origins) |

Set via **Vercel Dashboard → Settings → Environment Variables** or `vercel env add`.

## Local Development

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend

Serve the `frontend/` directory with any static file server. For example:

```bash
cd frontend
npx serve .
```

> **Note:** For local development, edit `frontend/env.js` and set `API_BASE_URL` to `http://localhost:8000` so the frontend can reach the local backend.

## Deployment Check

- No puzzle logic was changed.
- No vault or validation logic was changed.
- No UI or UX behavior was changed.
- Only deployment configuration was migrated from Azure to Vercel.
