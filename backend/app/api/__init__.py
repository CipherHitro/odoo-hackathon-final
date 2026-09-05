import importlib
from pathlib import Path
from fastapi import APIRouter

api_router = APIRouter()

# Dynamically import all routers from subdirectories in app/api
_current_dir = Path(__file__).parent

for _item in sorted(_current_dir.iterdir()):
    if _item.is_dir() and not _item.name.startswith("__"):
        _routes_file = _item / "routes.py"
        if _routes_file.exists():
            _module_name = f"app.api.{_item.name}.routes"
            _module = importlib.import_module(_module_name)
            _router = getattr(_module, "router", None)
            if _router and isinstance(_router, APIRouter):
                api_router.include_router(_router)
