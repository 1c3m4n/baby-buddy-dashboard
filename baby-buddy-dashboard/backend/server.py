import asyncio
import logging
import os
import json
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import httpx

from .daily_summary import build_daily_summary

# --- Configuration ---

BABY_BUDDY_URL = os.environ.get("BABY_BUDDY_URL", "").rstrip("/")
BABY_BUDDY_API_KEY = os.environ.get("BABY_BUDDY_API_KEY", "")
REFRESH_INTERVAL = int(os.environ.get("REFRESH_INTERVAL", "30"))
DEMO_MODE = os.environ.get("DEMO_MODE", "").lower() in ("true", "1", "yes")
UNIT_SYSTEM = os.environ.get("UNIT_SYSTEM", "metric").lower()
SUPERVISOR_TOKEN = os.environ.get("SUPERVISOR_TOKEN", "")
SUPERVISOR_URL = os.environ.get("SUPERVISOR_URL", "http://supervisor").rstrip("/")

logger = logging.getLogger(__name__)

# Fallback: read from HA add-on options.json
if not BABY_BUDDY_URL:
    options_path = Path("/data/options.json")
    if options_path.exists():
        opts = json.loads(options_path.read_text())
        BABY_BUDDY_URL = opts.get("baby_buddy_url", "").rstrip("/")
        BABY_BUDDY_API_KEY = opts.get("baby_buddy_api_key", "")
        REFRESH_INTERVAL = opts.get("refresh_interval", 30)
        DEMO_MODE = DEMO_MODE or opts.get("demo_mode", False)
        UNIT_SYSTEM = opts.get("unit_system", UNIT_SYSTEM)

STATIC_DIR = Path(__file__).parent.parent / "static"

# --- App lifecycle ---

http_client: httpx.AsyncClient | None = None
home_assistant_client: httpx.AsyncClient | None = None
summary_task: asyncio.Task | None = None


async def _baby_buddy_results(path: str, params: dict | None = None) -> list[dict]:
    if http_client is None:
        raise RuntimeError("Baby Buddy client is not ready")
    response = await http_client.get(f"/api/{path}", params=params)
    response.raise_for_status()
    payload = response.json()
    return payload.get("results", payload if isinstance(payload, list) else [])


async def _home_assistant_timezone():
    if home_assistant_client is not None:
        try:
            response = await home_assistant_client.get("config")
            response.raise_for_status()
            return ZoneInfo(response.json()["time_zone"])
        except (httpx.HTTPError, KeyError, ValueError) as error:
            logger.warning("Could not read Home Assistant timezone: %s", error)
    return datetime.now().astimezone().tzinfo


async def get_today_summary() -> dict:
    """Fetch Baby Buddy records and aggregate the current local calendar day."""
    timezone = await _home_assistant_timezone()
    now = datetime.now(timezone)
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    children = await _baby_buddy_results("children/", {"limit": 100})
    if not children:
        raise HTTPException(404, "No Baby Buddy child found")
    child = children[0]
    child_id = child["id"]

    feedings, sleeps, timers = await asyncio.gather(
        _baby_buddy_results(
            "feedings/",
            {
                "child": child_id,
                "start_min": day_start.isoformat(),
                "start_max": now.isoformat(),
                "ordering": "-start",
                "limit": 500,
            },
        ),
        _baby_buddy_results(
            "sleep/",
            {
                "child": child_id,
                "end_min": day_start.isoformat(),
                "start_max": now.isoformat(),
                "ordering": "-start",
                "limit": 500,
            },
        ),
        _baby_buddy_results("timers/", {"limit": 100}),
    )
    summary = build_daily_summary(
        feedings, sleeps, timers, child_id=child_id, now=now
    )
    summary["child"] = {
        "id": child_id,
        "name": " ".join(
            part for part in (child.get("first_name"), child.get("last_name")) if part
        ),
    }
    return summary


def _format_minutes(minutes: int) -> str:
    hours, remainder = divmod(minutes, 60)
    return f"{hours}h {remainder}m" if hours else f"{remainder}m"


async def _publish_summary_to_home_assistant(summary: dict) -> None:
    if home_assistant_client is None:
        return
    child_name = summary["child"]["name"]
    feeding = summary["feeding"]
    sleep = summary["sleep"]
    entities = {
        "sensor.baby_buddy_feeding_today": {
            "state": feeding["total_amount_ml"],
            "attributes": {
                "friendly_name": "Baby Buddy feeding today",
                "icon": "mdi:baby-bottle-outline",
                "unit_of_measurement": "mL",
                "state_class": "measurement",
                "child": child_name,
                "date": summary["date"],
                "generated_at": summary["generated_at"],
                **feeding,
            },
        },
        "sensor.baby_buddy_sleep_today": {
            "state": sleep["total_minutes"],
            "attributes": {
                "friendly_name": "Baby Buddy sleep today",
                "icon": "mdi:sleep",
                "unit_of_measurement": "min",
                "device_class": "duration",
                "state_class": "measurement",
                "child": child_name,
                "date": summary["date"],
                "generated_at": summary["generated_at"],
                "formatted_total": _format_minutes(sleep["total_minutes"]),
                **sleep,
            },
        },
    }
    for entity_id, payload in entities.items():
        response = await home_assistant_client.post(
            f"states/{entity_id}", json=payload
        )
        response.raise_for_status()


async def _summary_publish_loop() -> None:
    while True:
        try:
            await _publish_summary_to_home_assistant(await get_today_summary())
        except asyncio.CancelledError:
            raise
        except Exception as error:
            logger.warning("Could not publish Baby Buddy daily summary: %s", error)
        await asyncio.sleep(max(REFRESH_INTERVAL, 30))


@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client, home_assistant_client, summary_task
    http_client = httpx.AsyncClient(
        base_url=BABY_BUDDY_URL,
        headers={
            "Authorization": f"Token {BABY_BUDDY_API_KEY}",
            "Content-Type": "application/json",
        },
        timeout=15.0,
        limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
    )
    if SUPERVISOR_TOKEN:
        home_assistant_client = httpx.AsyncClient(
            base_url=f"{SUPERVISOR_URL}/core/api/",
            headers={
                "Authorization": f"Bearer {SUPERVISOR_TOKEN}",
                "Content-Type": "application/json",
            },
            timeout=15.0,
        )
        summary_task = asyncio.create_task(_summary_publish_loop())

    yield

    if summary_task:
        summary_task.cancel()
        try:
            await summary_task
        except asyncio.CancelledError:
            pass
    if home_assistant_client:
        await home_assistant_client.aclose()
    await http_client.aclose()


app = FastAPI(lifespan=lifespan)


# --- API routes ---


@app.get("/api/config")
async def get_config():
    return {"refresh_interval": REFRESH_INTERVAL, "demo_mode": DEMO_MODE, "unit_system": UNIT_SYSTEM}


@app.get("/api/summary/today")
async def get_daily_summary():
    """Return today's feeding and sleep totals used by Home Assistant."""
    try:
        return await get_today_summary()
    except httpx.ConnectError:
        raise HTTPException(502, "Cannot connect to Baby Buddy")
    except httpx.TimeoutException:
        raise HTTPException(504, "Baby Buddy request timed out")
    except httpx.HTTPStatusError as error:
        raise HTTPException(error.response.status_code, "Baby Buddy API request failed")


@app.api_route(
    "/api/baby-buddy/{path:path}",
    methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
)
async def proxy_baby_buddy(path: str, request: Request):
    """Proxy requests to the remote Baby Buddy API."""
    target_url = f"/api/{path}"
    params = dict(request.query_params)

    body = None
    content_type = request.headers.get("content-type", "")
    if request.method in ("POST", "PATCH", "PUT"):
        body = await request.body()

    try:
        headers = {}
        if body and "application/json" in content_type:
            headers["Content-Type"] = "application/json"

        response = await http_client.request(
            method=request.method,
            url=target_url,
            params=params,
            content=body,
            headers=headers,
        )
    except httpx.ConnectError:
        raise HTTPException(502, "Cannot connect to Baby Buddy")
    except httpx.TimeoutException:
        raise HTTPException(504, "Baby Buddy request timed out")

    excluded_headers = {"transfer-encoding", "content-encoding", "content-length", "connection", "server"}
    response_headers = {
        k: v
        for k, v in response.headers.items()
        if k.lower() not in excluded_headers
    }

    return Response(
        content=response.content,
        status_code=response.status_code,
        headers=response_headers,
    )


@app.get("/api/media/{path:path}")
async def proxy_media(path: str):
    """Proxy media files (e.g. child photos) from Baby Buddy."""
    try:
        response = await http_client.get(
            f"/{path}",
            headers={"Accept": "*/*"},
        )
    except httpx.ConnectError:
        raise HTTPException(502, "Cannot connect to Baby Buddy")
    except httpx.TimeoutException:
        raise HTTPException(504, "Baby Buddy request timed out")

    if response.status_code != 200:
        raise HTTPException(response.status_code, "Media not found")

    return Response(
        content=response.content,
        headers={"Content-Type": response.headers.get("content-type", "application/octet-stream")},
    )


# --- Static files (React SPA) ---

if STATIC_DIR.exists():
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.exists():
        app.mount(
            "/assets", StaticFiles(directory=str(assets_dir)), name="assets"
        )

    @app.get("/{path:path}")
    async def serve_spa(path: str, request: Request):
        file_path = STATIC_DIR / path
        if file_path.is_file() and ".." not in path:
            return FileResponse(file_path)

        # Inject <base> tag with ingress path so relative URLs resolve correctly
        ingress_path = request.headers.get("X-Ingress-Path", "")
        index_html = (STATIC_DIR / "index.html").read_text()
        if ingress_path:
            base_href = ingress_path.rstrip("/") + "/"
            index_html = index_html.replace("<head>", f'<head><base href="{base_href}">', 1)

        return Response(
            content=index_html,
            media_type="text/html",
            headers={"Cache-Control": "no-cache"},
        )
