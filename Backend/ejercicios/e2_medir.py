"""E2. Cliente que lanza N peticiones simultáneas y mide el tiempo total.

Uso:  python ejercicios/e2_medir.py /sync-bloqueante 10
"""
import asyncio
import sys
import time
import httpx


async def main(ruta: str, n: int) -> None:
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000", timeout=120) as cliente:
        inicio = time.perf_counter()
        await asyncio.gather(*(cliente.get(ruta) for _ in range(n)))
        total = time.perf_counter() - inicio
    print(f"{ruta}: {n} peticiones concurrentes en {total:.2f} s")


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1], int(sys.argv[2])))
