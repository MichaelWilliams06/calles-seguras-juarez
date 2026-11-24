from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Bache, CambioEstado, Colonia, Encharcamiento, Sector, Usuario
from app.seguridad import hashear_contrasena


def _get_or_create_sector(db: Session, nombre: str) -> Sector:
    sector = db.scalar(select(Sector).where(Sector.nombre == nombre))
    if sector:
        return sector
    sector = Sector(nombre=nombre)
    db.add(sector)
    db.flush()
    return sector


def _get_or_create_colonia(db: Session, nombre: str, id_sector: int, activa: bool = True) -> Colonia:
    colonia = db.scalar(select(Colonia).where(Colonia.nombre == nombre))
    if colonia:
        return colonia
    colonia = Colonia(nombre=nombre, id_sector=id_sector, activa=activa)
    db.add(colonia)
    db.flush()
    return colonia


def _get_or_create_usuario(
    db: Session,
    nombre: str,
    correo: str,
    password_plana: str,
    rol: str,
    activo: bool = True,
) -> Usuario:
    usuario = db.scalar(select(Usuario).where(Usuario.correo == correo))
    if usuario:
        return usuario
    usuario = Usuario(
        nombre=nombre,
        correo=correo,
        password_hash=hashear_contrasena(password_plana),
        rol=rol,
        activo=activo,
    )
    db.add(usuario)
    db.flush()
    return usuario


def _get_or_create_bache(
    db: Session,
    *,
    folio: str,
    id_colonia: int,
    id_usuario: int | None,
    calle: str,
    latitud: Decimal,
    longitud: Decimal,
    descripcion: str,
    tipo_dano: str,
    tamano: str,
    profundidad_cm: Decimal,
    carril_afectado: str,
    severidad: str,
    senalizado: bool,
    estado: str,
    confirmaciones: int,
    responsable_cambio_id: int | None = None,
    comentario_cambio: str | None = None,
) -> Bache:
    bache = db.scalar(select(Bache).where(Bache.folio == folio))
    if bache:
        return bache
    bache = Bache(
        folio=folio,
        id_colonia=id_colonia,
        id_usuario=id_usuario,
        calle=calle,
        latitud=latitud,
        longitud=longitud,
        descripcion=descripcion,
        tipo_dano=tipo_dano,
        tamano=tamano,
        profundidad_cm=profundidad_cm,
        carril_afectado=carril_afectado,
        severidad=severidad,
        senalizado=senalizado,
        estado=estado,
        confirmaciones=confirmaciones,
    )
    db.add(bache)
    db.flush()

    if responsable_cambio_id and comentario_cambio:
        existe_cambio = db.scalar(
            select(CambioEstado).where(
                CambioEstado.id_bache == bache.id_bache,
                CambioEstado.comentario_publico == comentario_cambio,
            )
        )
        if not existe_cambio:
            db.add(
                CambioEstado(
                    id_bache=bache.id_bache,
                    id_usuario_responsable=responsable_cambio_id,
                    comentario_publico=comentario_cambio,
                )
            )
    return bache


def _get_or_create_encharcamiento(
    db: Session,
    *,
    folio: str,
    id_colonia: int,
    id_usuario: int | None,
    calle: str,
    latitud: Decimal,
    longitud: Decimal,
    descripcion: str,
    nivel_agua: str,
    riesgo_alto: bool,
    estado: str,
    confirmaciones: int,
) -> Encharcamiento:
    enc = db.scalar(select(Encharcamiento).where(Encharcamiento.folio == folio))
    if enc:
        return enc
    enc = Encharcamiento(
        folio=folio,
        id_colonia=id_colonia,
        id_usuario=id_usuario,
        calle=calle,
        latitud=latitud,
        longitud=longitud,
        descripcion=descripcion,
        nivel_agua=nivel_agua,
        riesgo_alto=riesgo_alto,
        estado=estado,
        confirmaciones=confirmaciones,
    )
    db.add(enc)
    db.flush()
    return enc


def run_seed() -> None:
    db = SessionLocal()
    try:
        # 1. Sectores de Ciudad Juárez
        sectores_data = ["Norte", "Centro", "Poniente", "Suroriente"]
        sectores = {nombre: _get_or_create_sector(db, nombre) for nombre in sectores_data}

        # 2. Colonias representativas de Ciudad Juárez
        colonias_data = [
            ("Zona Pronaf", "Norte"),
            ("Partido Romero", "Centro"),
            ("Anapra", "Poniente"),
            ("Las Torres", "Suroriente"),
            ("Parajes del Sur", "Suroriente"),
        ]
        colonias = {
            nombre: _get_or_create_colonia(db, nombre, sectores[sector_nombre].id_sector)
            for nombre, sector_nombre in colonias_data
        }

        # 3. Usuarios de prueba con los roles del sistema
        usuarios_data = [
            ("Ciudadano Juárez", "ciudadano@callesseguras.mx", "Ciudadano123!", "Ciudadano"),
            ("Moderador Vial", "moderador@callesseguras.mx", "Moderador123!", "Moderador"),
            ("Coordinador Operativo", "coordinador@callesseguras.mx", "Coordinador123!", "Coordinador"),
            ("Enlace Municipal", "enlace@callesseguras.mx", "Enlace123!", "Enlace_Municipal"),
            ("Administrador Sistema", "admin@callesseguras.mx", "Admin123!", "Administrador"),
        ]
        usuarios = {
            rol: _get_or_create_usuario(db, nombre, correo, pwd, rol)
            for nombre, correo, pwd, rol in usuarios_data
        }

        # 4. Reportes iniciales de baches
        _get_or_create_bache(
            db,
            folio="BCH-2026-0001",
            id_colonia=colonias["Partido Romero"].id_colonia,
            id_usuario=usuarios["Ciudadano"].id_usuario,
            calle="Av. Lerdo y Calle Constitución",
            latitud=Decimal("31.738512"),
            longitud=Decimal("-106.487215"),
            descripcion="Bache profundo en carril central con riesgo para vehículos compactos.",
            tipo_dano="Bache profundo",
            tamano="Grande",
            profundidad_cm=Decimal("14.50"),
            carril_afectado="Central",
            severidad="Alta",
            senalizado=False,
            estado="En revision",
            confirmaciones=3,
            responsable_cambio_id=usuarios["Moderador"].id_usuario,
            comentario_cambio="Reporte validado y enviado a revisión operativa.",
        )
        _get_or_create_bache(
            db,
            folio="BCH-2026-0002",
            id_colonia=colonias["Las Torres"].id_colonia,
            id_usuario=usuarios["Ciudadano"].id_usuario,
            calle="Av. de las Torres y Blvd. Zaragoza",
            latitud=Decimal("31.651204"),
            longitud=Decimal("-106.408912"),
            descripcion="Fractura de pavimento con desprendimiento de asfalto cerca de parada de camión.",
            tipo_dano="Fractura de pavimento",
            tamano="Mediano",
            profundidad_cm=Decimal("8.00"),
            carril_afectado="Derecho",
            severidad="Media",
            senalizado=True,
            estado="Recibido",
            confirmaciones=1,
        )

        # 5. Reportes iniciales de encharcamientos
        _get_or_create_encharcamiento(
            db,
            folio="ENC-2026-0001",
            id_colonia=colonias["Zona Pronaf"].id_colonia,
            id_usuario=usuarios["Ciudadano"].id_usuario,
            calle="Av. Henry Dunant y Av. Lincoln",
            latitud=Decimal("31.751890"),
            longitud=Decimal("-106.453120"),
            descripcion="Acumulación de agua pluvial por obstrucción en rejilla.",
            nivel_agua="Banqueta / Arillo",
            riesgo_alto=True,
            estado="Activo",
            confirmaciones=4,
        )
        _get_or_create_encharcamiento(
            db,
            folio="ENC-2026-0002",
            id_colonia=colonias["Parajes del Sur"].id_colonia,
            id_usuario=usuarios["Ciudadano"].id_usuario,
            calle="Calle Tierra de Fuego y Calle Ramón Rayón",
            latitud=Decimal("31.618450"),
            longitud=Decimal("-106.389410"),
            descripcion="Espejo de agua en cruce vial tras riego o lluvia ligera.",
            nivel_agua="Ras de banqueta",
            riesgo_alto=False,
            estado="Activo",
            confirmaciones=2,
        )

        db.commit()
        print("Seed de Calles Seguras Juárez ejecutado correctamente.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()