from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

confirmaciones_bache = Table(
    "confirmaciones_bache",
    Base.metadata,
    Column("id_usuario", ForeignKey("usuarios.id_usuario", ondelete="CASCADE"), primary_key=True),
    Column("id_bache", ForeignKey("baches.id_bache", ondelete="CASCADE"), primary_key=True),
    Column(
        "fecha_confirmacion",
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    ),
)


class Usuario(Base):
    __tablename__ = "usuarios"

    id_usuario: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    correo: Mapped[str] = mapped_column(String(160), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    rol: Mapped[str] = mapped_column(String(30), default="Ciudadano", nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    baches_creados: Mapped[list["Bache"]] = relationship(
        back_populates="autor", foreign_keys="Bache.id_usuario"
    )
    encharcamientos_creados: Mapped[list["Encharcamiento"]] = relationship(
        back_populates="autor", foreign_keys="Encharcamiento.id_usuario"
    )
    baches_confirmados: Mapped[list["Bache"]] = relationship(
        secondary=confirmaciones_bache, back_populates="usuarios_confirmadores"
    )
    cambios_estado: Mapped[list["CambioEstado"]] = relationship(back_populates="responsable")


class Sector(Base):
    __tablename__ = "sectores"

    id_sector: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)

    colonias: Mapped[list["Colonia"]] = relationship(back_populates="sector")


class Colonia(Base):
    __tablename__ = "colonias"

    id_colonia: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_sector: Mapped[int] = mapped_column(ForeignKey("sectores.id_sector"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    activa: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    sector: Mapped["Sector"] = relationship(back_populates="colonias")
    baches: Mapped[list["Bache"]] = relationship(back_populates="colonia")
    encharcamientos: Mapped[list["Encharcamiento"]] = relationship(back_populates="colonia")


class Bache(Base):
    __tablename__ = "baches"

    id_bache: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    folio: Mapped[str] = mapped_column(String(25), unique=True, index=True, nullable=False)
    id_colonia: Mapped[int] = mapped_column(ForeignKey("colonias.id_colonia"), nullable=False)
    id_usuario: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id_usuario"), nullable=True)
    calle: Mapped[str] = mapped_column(String(160), nullable=False)
    latitud: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    longitud: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    tipo_dano: Mapped[str] = mapped_column(String(30), nullable=False)
    tamano: Mapped[str | None] = mapped_column(String(20), nullable=True)
    profundidad_cm: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    carril_afectado: Mapped[str | None] = mapped_column(String(40), nullable=True)
    severidad: Mapped[str] = mapped_column(String(15), default="Media", nullable=False)
    senalizado: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    estado: Mapped[str] = mapped_column(String(20), default="Recibido", nullable=False)
    confirmaciones: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    colonia: Mapped["Colonia"] = relationship(back_populates="baches")
    autor: Mapped["Usuario | None"] = relationship(
        back_populates="baches_creados", foreign_keys=[id_usuario]
    )
    usuarios_confirmadores: Mapped[list["Usuario"]] = relationship(
        secondary=confirmaciones_bache, back_populates="baches_confirmados"
    )
    cambios_estado: Mapped[list["CambioEstado"]] = relationship(
        back_populates="bache", cascade="all, delete-orphan"
    )


class Encharcamiento(Base):
    __tablename__ = "encharcamientos"

    id_encharcamiento: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    folio: Mapped[str] = mapped_column(String(25), unique=True, index=True, nullable=False)
    id_colonia: Mapped[int] = mapped_column(ForeignKey("colonias.id_colonia"), nullable=False)
    id_usuario: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id_usuario"), nullable=True)
    calle: Mapped[str] = mapped_column(String(160), nullable=False)
    latitud: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    longitud: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    nivel_agua: Mapped[str] = mapped_column(String(30), nullable=False)
    riesgo_alto: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    estado: Mapped[str] = mapped_column(String(20), default="Activo", nullable=False)
    confirmaciones: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    colonia: Mapped["Colonia"] = relationship(back_populates="encharcamientos")
    autor: Mapped["Usuario | None"] = relationship(
        back_populates="encharcamientos_creados", foreign_keys=[id_usuario]
    )


class CambioEstado(Base):
    __tablename__ = "cambios_estado"

    id_cambio_estado: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_bache: Mapped[int] = mapped_column(
        ForeignKey("baches.id_bache", ondelete="CASCADE"), nullable=False
    )
    id_usuario_responsable: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id_usuario"), nullable=False
    )
    comentario_publico: Mapped[str | None] = mapped_column(Text, nullable=True)
    fecha_cambio: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    bache: Mapped["Bache"] = relationship(back_populates="cambios_estado")
    responsable: Mapped["Usuario"] = relationship(back_populates="cambios_estado")