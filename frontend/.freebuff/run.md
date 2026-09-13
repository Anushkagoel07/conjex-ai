# Run doc — Conjex AI frontend (Vite + React)

Plain Vite + React SPA with client-side routing (`react-router-dom`):
routes `/dashboard`, `/conjunctions`, `/conjunctions/:satNorad/:debNorad`,
`/avoidance`, `/visualization`. No env files, no secrets, no build artifacts
needed for dev. Vite's dev server serves the SPA fallback for deep links
automatically — no extra config required.

## Reproduce artifacts

1. Install dependencies (from this directory, `AI-2/frontend`):

   ```
   npm install
   ```

   `package-lock.json` is committed; npm ci also works.

2. No `.env` files exist or are needed — the API base URL is hard-coded in
   `src/lib/api.js` to `http://127.0.0.1:8000` (the FastAPI backend).

3. Optional: `npm run lint` (oxlint) and `npm run build` (vite build) to verify.

## Run the server

### Backend data source (required for live data)

The FastAPI backend lives in `AI-2/backend/` (`app.py`, `data/*.json`,
`data/avoidance_visualization.png`). Without it the frontend shows its
UPLINK FAILED / retry screen.

```
python -m uvicorn app:app --host 127.0.0.1 --port 8000
```

Run from `C:\Users\DELL\OneDrive\Desktop\AI-2\backend` (so `app.py` and
`data/` resolve). Requires Python with `fastapi` + `uvicorn` installed.
Serves `/api/dashboard`, `/api/conjunctions`, `/api/metadata`, `/api/health`,
`/api/avoidance/tradeoff`, and the chart at `/data/avoidance_visualization.png`.
It also statically exposes `data/candidate_trajectories.json` — the SGP4
ephemeris export (tens of MB) that the Visualization page's close-approach
chart draws from. The backend regenerates all of these on each pipeline run,
so the frontend always revalidates that fetch (`cache: "reload"`) and offers
a "Reload trajectory data" retry if a stale copy slips through.

A detached Windows launch that has been used successfully:

```
powershell -NoProfile -Command "(Start-Process -FilePath 'python.exe' -ArgumentList '-m','uvicorn','app:app','--host','127.0.0.1','--port','8000' -WorkingDirectory 'C:\Users\DELL\OneDrive\Desktop\AI-2\backend' -RedirectStandardOutput '<log>' -RedirectStandardError '<log>.err' -WindowStyle Hidden -PassThru).Id"
```

(Same spurious-timeout caveat as the frontend launch below.)

### Frontend dev server

```
npm run dev
```

- Default port **5173** (free unless another session holds it — if busy, pass
  `-- --port 5174 --strictPort` and use that URL instead).
- Detached launch on Windows (stdout and stderr MUST go to different files):

  ```
  powershell -NoProfile -Command "(Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -RedirectStandardOutput '<log>' -RedirectStandardError '<log>.err' -WindowStyle Hidden -PassThru).Id"
  ```

  Note: the launching bash call may report a timeout even though the process
  started fine — check the log file and `netstat -ano | grep :5173` before
  retrying, to avoid double-starting.

### Verify

- `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/` → 200
- `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/api/dashboard` → 200
