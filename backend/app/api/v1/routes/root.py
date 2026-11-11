from fastapi import APIRouter

router = APIRouter()


@router.get("/", summary="Describe the versioned API")
def api_root() -> dict[str, str]:
    return {"name": "SkyFare API", "version": "v1"}
