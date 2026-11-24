from fastapi import Header, HTTPException, Query

NC_VALIDO = "22111724"


def verificar_api_key(x_api_key: str | None = Header(default=None)) -> None:
    if not x_api_key or x_api_key != NC_VALIDO:
        raise HTTPException(status_code=401, detail="API Key inválida o ausente.")


def paginacion(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> dict[str, int]:
    return {"skip": (page - 1) * limit, "limit": limit}