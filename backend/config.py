import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

AGENT_MODEL: str = os.getenv("GEMINI_AGENT_MODEL", "gemini-1.5-flash-latest")
TEXT_MODEL: str = os.getenv("GEMINI_TEXT_MODEL", "gemini-1.5-flash-latest")
GEMINI_RPM: int = int(os.getenv("GEMINI_RPM", "10"))
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

DATA_DIR = Path("data")
SCREENSHOTS_DIR = DATA_DIR / "screenshots"
DB_PATH: str = str(DATA_DIR / "paraverse.db")

TIME_COST_SECONDS: dict[str, float] = {
    "click": 5.0,
    "type": 20.0,
    "scroll": 3.0,
    "wait": 2.0,
    "give_up": 0.0,
    "goal_reached": 0.0,
}

SEGMENT_MULTIPLIER: dict[str, float] = {
    "new_hire": 1.5,
    "power_user": 0.7,
    "non_native": 1.8,
    "frontline_mobile": 1.3,
    "low_vision": 2.0,
    "occasional": 1.4,
}

DEFAULT_SEGMENT_MIX: dict[str, int] = {
    "new_hire": 4,
    "power_user": 3,
    "non_native": 3,
    "frontline_mobile": 4,
    "low_vision": 2,
    "occasional": 4,
}

STEP_CAP: int = 12
DEMO_PORT: int = int(os.getenv("DEMO_PORT", "3001"))
BACKEND_PORT: int = 8000
FRONTEND_PORT: int = 5173
