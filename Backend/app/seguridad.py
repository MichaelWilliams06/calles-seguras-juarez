from datetime import datetime, timedelta, timezone
import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Usuario

password_hash = PasswordHash.recommended()  # Usa Argon2 / bcrypt de forma segura
bearer_scheme = HTTPBearer(auto_error=False)

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "cambia-este-secreto-en-entorno-123456")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "60"))


def hashear_contrasena(plain_password: str) -> str:
    return password_hash.hash(plain_password)


def verificar_contrasena(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    try:
        return password_hash.verify(plain_password, hashed_password)
    except UnknownHashError:
        return False


def crear_token_acceso(subject: str, rol: str) -> str:
    expira = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": subject,
        "rol": rol,
        "exp": expira,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def obtener_usuario_actual(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    if not creds or creds.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticación requerida.",
        )
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        correo = payload.get("sub")
        if not correo:
            raise HTTPException(status_code=401, detail="Token inválido.")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="El token ha expirado.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token inválido.")

    usuario = db.scalar(select(Usuario).where(Usuario.correo == correo))
    if not usuario or not usuario.activo:
        raise HTTPException(status_code=401, detail="Usuario inactivo o no encontrado.")
    return usuario


def obtener_usuario_opcional(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Usuario | None:
    if not creds or creds.scheme.lower() != "bearer":
        return None
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        correo = payload.get("sub")
        if not correo:
            return None
        usuario = db.scalar(select(Usuario).where(Usuario.correo == correo))
        return usuario if (usuario and usuario.activo) else None
    except jwt.PyJWTError:
        return None


def exigir_roles(*roles_permitidos: str):
    def _dep(usuario: Usuario = Depends(obtener_usuario_actual)) -> Usuario:
        rol_val = getattr(usuario.rol, "value", usuario.rol)
        if rol_val not in roles_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos suficientes para realizar esta acción.",
            )
        return usuario
    return _dep