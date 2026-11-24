"""E7. LABORATORIO DE INYECCIÓN SQL. SOLO PARA USO LOCAL.

Este archivo contiene a propósito una ruta vulnerable para fines didácticos.
Nunca copies /lab/vulnerable al proyecto integrador ni a otro sistema.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import get_db

router = APIRouter(prefix="/lab", tags=["laboratorio (NO producción)"])


@router.get("/vulnerable")
def vulnerable(nombre: str, db: Session = Depends(get_db)) -> list[dict]:
    sql = f"SELECT id, nombre FROM productos WHERE nombre = '{nombre}'"  # MAL
    return [dict(r._mapping) for r in db.execute(text(sql))]


@router.get("/seguro")
def seguro(nombre: str, db: Session = Depends(get_db)) -> list[dict]:
    sql = text("SELECT id, nombre FROM productos WHERE nombre = :nombre")
    return [dict(r._mapping) for r in db.execute(sql, {"nombre": nombre})]
