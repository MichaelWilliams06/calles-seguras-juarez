"""E2. Servidor de prueba: def contra async def (subtema 4.1.4).

Levanta SIN recarga automática:
    uvicorn ejercicios.e2_concurrencia:app --port 8000
"""
import asyncio
import time


from fastapi import FastAPI

app = FastAPI()


@app.get("/sync-bloqueante")
def sync_bloqueante() -> dict[str, str]:
    time.sleep(1)
    return {"modo": "def + time.sleep"}


@app.get("/async-bloqueante")
async def async_bloqueante() -> dict[str, str]:
    time.sleep(1)  # bloquea el event loop
    return {"modo": "async def + time.sleep"}


@app.get("/async-cooperativo")
async def async_cooperativo() -> dict[str, str]:
    await asyncio.sleep(1)  # cede el control
    return {"modo": "async def + await asyncio.sleep"}
