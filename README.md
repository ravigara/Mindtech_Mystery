# MindTech Mystery Azure Deployment

This project remains a static frontend plus FastAPI backend. The only changes added here are for Azure deployment.

## Frontend: Azure Static Web Apps

The frontend now has a build step that outputs `frontend/dist` and injects the backend base URL from an environment variable.

### Local build

```bash
cd frontend
npm run build
```

### Azure Static Web Apps configuration

- App location: `frontend`
- Output location: `dist`
- Build command: `npm run build`
- Build environment variable: `API_BASE_URL=https://<your-app-service-name>.azurewebsites.net`

`frontend/staticwebapp.config.json` is included for Static Web Apps routing, and the build writes the configured API URL into `dist/env.js`.

## Backend: Azure App Service

The backend already exposes `app` from `backend/main.py` and already includes the required FastAPI packages in `backend/requirements.txt`.

Deploy the `backend/` folder as the App Service application root.

### Local run

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Azure App Service configuration

- Startup command: `startup.txt`
- App setting: `ALLOWED_ORIGINS=https://<your-static-web-app-domain>`

`backend/startup.txt` contains:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

If you need multiple frontend origins, set `ALLOWED_ORIGINS` to a comma-separated list.

## Deployment Check

- No puzzle logic was changed.
- No vault or validation logic was changed.
- No UI or UX behavior was changed.
- Only Azure deployment and configuration support was added.
