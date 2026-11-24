from datetime import datetime
from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ColoniaRespuesta(BaseModel):
    id_colonia: int
    nombre: str
    sector: str
    activa: bool

    model_config = ConfigDict(from_attributes=True)


class ColoniaCrear(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: str = Field(..., min_length=2, max_length=100)
    id_sector: int = Field(..., ge=1)
    activa: bool = True


class UsuarioRegistro(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: str = Field(..., min_length=2, max_length=150)
    correo: EmailStr
    contrasena: str = Field(..., min_length=6, max_length=128)


class UsuarioLogin(BaseModel):
    model_config = ConfigDict(extra="forbid")

    correo: EmailStr
    contrasena: str = Field(..., min_length=1)


class UsuarioRespuesta(BaseModel):
    id_usuario: int
    nombre: str
    correo: str
    rol: str
    activo: bool

    model_config = ConfigDict(from_attributes=True)


class TokenRespuesta(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioRespuesta


class BacheCrear(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id_colonia: int = Field(..., ge=1)
    calle: str = Field(..., min_length=3, max_length=160)
    latitud: Decimal = Field(..., ge=-90, le=90)
    longitud: Decimal = Field(..., ge=-180, le=180)
    descripcion: str | None = Field(default=None, max_length=500)
    tipo_dano: Literal["bache", "hundimiento", "grieta", "alcantarilla_sin_tapa"]
    tamano: Literal["chico", "mediano", "grande"] | None = None
    profundidad_cm: Decimal | None = Field(default=None, gt=0, le=200)
    carril_afectado: str | None = Field(default=None, max_length=40)
    severidad: Literal["Baja", "Media", "Alta"] = "Media"
    senalizado: bool | None = None


class BacheActualizar(BaseModel):
    model_config = ConfigDict(extra="forbid")

    calle: str | None = Field(default=None, min_length=3, max_length=160)
    descripcion: str | None = Field(default=None, max_length=500)
    severidad: Literal["Baja", "Media", "Alta"] | None = None
    estado: Literal["Recibido", "En revisión", "Asignado", "Reparado", "Rechazado"] | None = None
    comentario_publico: str | None = Field(default=None, max_length=300)


class EncharcamientoCrear(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id_colonia: int = Field(..., ge=1)
    calle: str = Field(..., min_length=3, max_length=160)
    latitud: Decimal = Field(..., ge=-90, le=90)
    longitud: Decimal = Field(..., ge=-180, le=180)
    descripcion: str | None = Field(default=None, max_length=500)
    nivel_agua: Literal[
        "a un lado de la calle",
        "cubre un carril",
        "a media llanta",
        "intransitable",
    ]
    riesgo_alto: bool = False


class EncharcamientoActualizar(BaseModel):
    model_config = ConfigDict(extra="forbid")

    calle: str | None = Field(default=None, min_length=3, max_length=160)
    descripcion: str | None = Field(default=None, max_length=500)
    nivel_agua: Literal[
        "a un lado de la calle",
        "cubre un carril",
        "a media llanta",
        "intransitable",
    ] | None = None
    riesgo_alto: bool | None = None
    estado: Literal["Activo", "Resuelto", "Descartado"] | None = None


class ReporteItem(BaseModel):
    id: int
    kind: Literal["pavimento", "encharcamiento"]
    folio: str
    colonia_id: int
    colonia_nombre: str
    calle: str
    latitud: float
    longitud: float
    estado: str
    tipo_dano: str | None = None
    severidad: str | None = None
    nivel_agua: str | None = None
    riesgo_alto: bool | None = None
    fecha_creacion: datetime
    confirmaciones: int


class ReportesPaginados(BaseModel):
    items: list[ReporteItem]
    total: int


class ResumenRespuesta(BaseModel):
    total_baches: int
    total_encharcamientos: int
    baches_riesgo_alto: int
    encharcamientos_riesgo_alto: int
    total_confirmaciones: int


class ClimaJuarezRespuesta(BaseModel):
    ciudad: str
    temperatura_c: float | None = None
    precipitacion_mm: float | None = None
    alerta_encharcamiento: bool
    fuente: str
    disponible: bool