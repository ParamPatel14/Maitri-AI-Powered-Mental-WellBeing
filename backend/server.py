"""
backend/server.py
──────────────────
FastAPI server providing the Maitri REST + WebSocket API.

Startup
───────
    cd c:\\Projects\\maitri
    .venv\\Scripts\\uvicorn backend.server:app --reload --port 8000

Endpoints
─────────
    GET  /health    — liveness probe
    GET  /registry  — list of available exercises
    WS   /ws        — real-time analysis stream

WebSocket protocol  (client → server, JSON strings)
────────────────────────────────────────────────────
    {"type": "start",  "exercise": "Squats"}
    {"type": "frame",  "data": "<base64-jpeg>"}
    {"type": "stop"}

WebSocket protocol  (server → client, JSON strings)
────────────────────────────────────────────────────
    See backend/pipeline.py for the full payload schema.
    status field is always present: "ok" | "no_pose" | "session_started" | "error"
"""

import asyncio
import base64
import json
import logging

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from exercises        import EXERCISE_REGISTRY
from backend.pipeline import process_frame, CalibrationState
from backend.rehab    import get_recommendations

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("maitri.server")

# ── App setup ──────────────────────────────────────────────────────────────────
app = FastAPI(title="Maitri Core API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1):\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── REST endpoints ─────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/registry")
async def registry():
    return {"exercises": list(EXERCISE_REGISTRY.keys())}


# ── Rehab recommendation endpoint ─────────────────────────────────────────────
class RecommendRequest(BaseModel):
    problem: str


@app.post("/recommend")
async def recommend(request: RecommendRequest):
    """
    Call Gemini with the user's physical problem and return a list of
    recommended exercises with reasons.

    Body:   {"problem": "I have knee pain after running..."}
    Returns: {"recommendations": [{"exercise": "Squats", "reason": "..."}]}
    """
    if not request.problem.strip():
        raise HTTPException(status_code=400, detail="Problem description cannot be empty.")

    loop = asyncio.get_event_loop()
    try:
        recs = await loop.run_in_executor(None, get_recommendations, request.problem)
        return {"recommendations": recs}

    except ValueError as e:
        # Missing API key
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        import json
        if isinstance(e, json.JSONDecodeError):
            raise HTTPException(
                status_code=502,
                detail="AI returned an unexpected format. Please try again."
            )
        logger.error(f"/recommend error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Recommendation failed: {str(e)}")


# ── WebSocket endpoint ─────────────────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("Client connected")

    analyser = None
    calibration = None
    session_ctx: dict | None = None
    loop     = asyncio.get_event_loop()

    async def send(payload: dict) -> None:
        await websocket.send_text(json.dumps(payload))

    try:
        while True:
            raw     = await websocket.receive_text()
            message = json.loads(raw)
            kind    = message.get("type")

            # ── Select exercise ────────────────────────────────────────────────
            if kind == "start":
                exercise = message.get("exercise", "Squats")
                if exercise not in EXERCISE_REGISTRY:
                    await send({"status": "error",
                                "message": f"Unknown exercise '{exercise}'. "
                                           f"Available: {list(EXERCISE_REGISTRY)}"})
                    continue
                analyser = EXERCISE_REGISTRY[exercise]()
                goal_mode = message.get("goal_mode") or "Rehab"
                patient = message.get("patient") or None
                session_ctx = {"goal_mode": goal_mode, "patient": patient}
                calibration = CalibrationState(duration_s=float(message.get("calibration_seconds", 15.0)))
                logger.info(f"Session started: {exercise}")
                await send({"status": "session_started", "exercise": exercise, "goal_mode": goal_mode, "patient": patient})

            # ── Process video frame ────────────────────────────────────────────
            elif kind == "frame":
                if analyser is None:
                    await send({"status": "error",
                                "message": "Send {type:'start', exercise:'...'} first."})
                    continue

                data_url = message.get("data", "")
                if "," in data_url:           # strip "data:image/jpeg;base64," prefix
                    data_url = data_url.split(",", 1)[1]

                jpeg_bytes = base64.b64decode(data_url)

                # Run blocking CPU work off the async event loop
                payload = await loop.run_in_executor(
                    None, process_frame, jpeg_bytes, analyser, None, calibration, session_ctx
                )
                await send(payload)

            # ── Stop session ───────────────────────────────────────────────────
            elif kind == "stop":
                analyser = None
                calibration = None
                session_ctx = None
                logger.info("Session stopped by client")
                await send({"status": "session_stopped"})

    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        try:
            await send({"status": "error", "message": str(e)})
        except Exception:
            pass
