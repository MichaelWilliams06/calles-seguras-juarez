from datetime import datetime, timezone
from fastapi import Depends, FastAPI, HTTPException, Path, Query, status
from fastapi.middleware.cors import CORSMiddleware
import httpx
from sqlalchemy import String, cast, func, select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencias import paginacion
from app.models import Bache, CambioEstado, Colonia, Encharcamiento, Usuario
from app.schemas import (
    BacheActualizar,
    BacheCrear,
    ClimaJuarezRespuesta,
    ColoniaCrear,
    ColoniaRespuesta,
    EncharcamientoActualizar,
    EncharcamientoCrear,
    ReporteItem,
    ReportesPaginados,
    ResumenRespuesta,
    TokenRespuesta,
    UsuarioLogin,
    UsuarioRegistro,
    UsuarioRespuesta,
)
from app.seguridad import (
    crear_token_acceso,
    exigir_roles,
    hashear_contrasena,
    obtener_usuario_actual,
    verificar_contrasena,
)
from app.servicios import dentro_de_juarez, distancia_metros
from app.zona_service import consultar_zona

app = FastAPI(title="Calles Seguras Juárez API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _rol_str(usuario: Usuario) -> str:
    return getattr(usuario.rol, "value", usuario.rol)


def _usuario_a_respuesta(u: Usuario) -> UsuarioRespuesta:
    return UsuarioRespuesta(
        id_usuario=u.id_usuario,
        nombre=u.nombre,
        correo=u.correo,
        rol=_rol_str(u),
        activo=u.activo,
    )


def _bache_a_item(b: Bache) -> ReporteItem:
    return ReporteItem(
        id=b.id_bache,
        kind="pavimento",
        folio=b.folio,
        colonia_id=b.id_colonia,
        colonia_nombre=b.colonia.nombre if b.colonia else str(b.id_colonia),
        calle=b.calle,
        latitud=float(b.latitud),
        longitud=float(b.longitud),
        estado=b.estado,
        tipo_dano=b.tipo_dano,
        severidad=b.severidad,
        fecha_creacion=b.fecha_creacion,
        confirmaciones=b.confirmaciones,
    )


def _enc_a_item(e: Encharcamiento) -> ReporteItem:
    return ReporteItem(
        id=e.id_encharcamiento,
        kind="encharcamiento",
        folio=e.folio,
        colonia_id=e.id_colonia,
        colonia_nombre=e.colonia.nombre if e.colonia else str(e.id_colonia),
        calle=e.calle,
        latitud=float(e.latitud),
        longitud=float(e.longitud),
        estado=e.estado,
        nivel_agua=e.nivel_agua,
        riesgo_alto=e.riesgo_alto,
        fecha_creacion=e.fecha_creacion,
        confirmaciones=e.confirmaciones,
    )


@app.get("/salud")
def salud() -> dict[str, str]:
    return {"estado": "ok", "servicio": "calles-seguras-juarez"}


# --- Autenticación y usuarios ---


@app.post("/api/auth/registro", response_model=UsuarioRespuesta, status_code=status.HTTP_201_CREATED)
def registrar_usuario(datos: UsuarioRegistro, db: Session = Depends(get_db)):
    correo_limpio = datos.correo.lower().strip()
    if db.scalar(select(Usuario).where(Usuario.correo == correo_limpio)):
        raise HTTPException(status_code=409, detail="El correo ya está registrado.")

    nuevo = Usuario(
        nombre=datos.nombre.strip(),
        correo=correo_limpio,
        password_hash=hashear_contrasena(datos.contrasena),
        rol="Ciudadano",
        activo=True,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return _usuario_a_respuesta(nuevo)


@app.post("/api/auth/login", response_model=TokenRespuesta)
def iniciar_sesion(datos: UsuarioLogin, db: Session = Depends(get_db)):
    correo_limpio = datos.correo.lower().strip()
    usuario = db.scalar(select(Usuario).where(Usuario.correo == correo_limpio))
    if not usuario or not verificar_contrasena(datos.contrasena, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos.")
    if not usuario.activo:
        raise HTTPException(status_code=403, detail="Usuario inactivo.")

    rol_actual = _rol_str(usuario)
    token = crear_token_acceso(subject=usuario.correo, rol=rol_actual)
    return TokenRespuesta(
        access_token=token,
        usuario=_usuario_a_respuesta(usuario),
    )


@app.get("/api/auth/me", response_model=UsuarioRespuesta)
def perfil_actual(usuario: Usuario = Depends(obtener_usuario_actual)):
    return _usuario_a_respuesta(usuario)


# --- Colonias ---


@app.get("/api/colonias", response_model=list[ColoniaRespuesta])
def listar_colonias(
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    colonias = db.scalars(
        select(Colonia).options(joinedload(Colonia.sector)).order_by(Colonia.nombre)
    ).all()

    if q and q.strip():
        ql = q.strip().lower()
        colonias = [c for c in colonias if ql in c.nombre.lower()]

    return [
        ColoniaRespuesta(
            id_colonia=c.id_colonia,
            nombre=c.nombre,
            sector=c.sector.nombre if c.sector else "",
            activa=c.activa,
        )
        for c in colonias
    ]


@app.post("/api/colonias", response_model=ColoniaRespuesta, status_code=status.HTTP_201_CREATED)
def crear_colonia(
    datos: ColoniaCrear,
    _usuario: Usuario = Depends(exigir_roles("Coordinador", "Administrador")),
    db: Session = Depends(get_db),
):
    nombre_limpio = datos.nombre.strip()
    if db.scalar(select(Colonia).where(Colonia.nombre == nombre_limpio)):
        raise HTTPException(status_code=409, detail="La colonia ya existe.")

    colonia = Colonia(
        nombre=nombre_limpio,
        id_sector=datos.id_sector,
        activa=datos.activa,
    )
    db.add(colonia)
    db.commit()
    db.refresh(colonia)
    db.refresh(colonia, ["sector"])
    return ColoniaRespuesta(
        id_colonia=colonia.id_colonia,
        nombre=colonia.nombre,
        sector=colonia.sector.nombre if colonia.sector else "",
        activa=colonia.activa,
    )


# --- Reportes (listado, cercanos, detalle, baches, encharcamientos, confirmaciones) ---


@app.get("/api/reportes", response_model=ReportesPaginados)
def listar_reportes(
    q: str | None = Query(default=None),
    tipo: str = Query(default="todos"),
    colonia_id: int | None = Query(default=None),
    pag: dict = Depends(paginacion),
    db: Session = Depends(get_db),
):
    combinados: list[ReporteItem] = []

    if tipo in ("todos", "pavimento"):
        stmt_b = (
            select(Bache)
            .options(joinedload(Bache.colonia))
            .where(cast(Bache.estado, String) != "Rechazado")
        )
        if colonia_id:
            stmt_b = stmt_b.where(Bache.id_colonia == colonia_id)
        for b in db.scalars(stmt_b).all():
            combinados.append(_bache_a_item(b))

    if tipo in ("todos", "encharcamiento"):
        stmt_e = (
            select(Encharcamiento)
            .options(joinedload(Encharcamiento.colonia))
            .where(cast(Encharcamiento.estado, String) == "Activo")
        )
        if colonia_id:
            stmt_e = stmt_e.where(Encharcamiento.id_colonia == colonia_id)
        for e in db.scalars(stmt_e).all():
            combinados.append(_enc_a_item(e))

    if q and q.strip():
        ql = q.strip().lower()
        combinados = [r for r in combinados if ql in r.calle.lower() or ql in r.folio.lower()]

    combinados.sort(key=lambda r: r.fecha_creacion, reverse=True)
    total = len(combinados)
    items = combinados[pag["skip"] : pag["skip"] + pag["limit"]]
    return ReportesPaginados(items=items, total=total)


@app.get("/api/reportes/cercanos", response_model=list[ReporteItem])
def reportes_cercanos(
    lat: float = Query(...),
    lng: float = Query(...),
    kind: str = Query(...),
    db: Session = Depends(get_db),
):
    umbral = 30.0 if kind == "pavimento" else 50.0
    cercanos: list[ReporteItem] = []

    if kind == "pavimento":
        baches = db.scalars(
            select(Bache)
            .options(joinedload(Bache.colonia))
            .where(cast(Bache.estado, String).notin_(["Rechazado", "Reparado"]))
        ).all()
        for b in baches:
            if distancia_metros(lat, lng, float(b.latitud), float(b.longitud)) <= umbral:
                cercanos.append(_bache_a_item(b))
    else:
        encs = db.scalars(
            select(Encharcamiento)
            .options(joinedload(Encharcamiento.colonia))
            .where(cast(Encharcamiento.estado, String) == "Activo")
        ).all()
        for e in encs:
            if distancia_metros(lat, lng, float(e.latitud), float(e.longitud)) <= umbral:
                cercanos.append(_enc_a_item(e))

    return cercanos


@app.get("/api/reportes/{kind}/{reporte_id}", response_model=ReporteItem)
def obtener_reporte_detalle(
    kind: str,
    reporte_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
):
    if kind == "pavimento":
        b = db.scalar(select(Bache).options(joinedload(Bache.colonia)).where(Bache.id_bache == reporte_id))
        if not b:
            raise HTTPException(status_code=404, detail="Reporte de pavimento no encontrado.")
        return _bache_a_item(b)
    if kind == "encharcamiento":
        e = db.scalar(
            select(Encharcamiento)
            .options(joinedload(Encharcamiento.colonia))
            .where(Encharcamiento.id_encharcamiento == reporte_id)
        )
        if not e:
            raise HTTPException(status_code=404, detail="Reporte de encharcamiento no encontrado.")
        return _enc_a_item(e)
    raise HTTPException(status_code=400, detail="Tipo de reporte inválido.")


@app.post("/api/baches", response_model=ReporteItem, status_code=status.HTTP_201_CREATED)
def crear_bache(datos: BacheCrear, db: Session = Depends(get_db)):
    if not dentro_de_juarez(float(datos.latitud), float(datos.longitud)):
        raise HTTPException(status_code=400, detail="La ubicación está fuera del municipio de Ciudad Juárez.")

    colonia = db.get(Colonia, datos.id_colonia)
    if not colonia or not colonia.activa:
        raise HTTPException(status_code=404, detail="Colonia no encontrada o inactiva.")

    anio = datetime.now(timezone.utc).year
    consecutivo = (db.scalar(select(Bache.id_bache).order_by(Bache.id_bache.desc())) or 0) + 1
    folio = f"BCH-{anio}-{consecutivo:06d}"

    severidad = "Alta" if datos.tipo_dano == "alcantarilla_sin_tapa" else datos.severidad
    nuevo = Bache(
        folio=folio,
        id_colonia=datos.id_colonia,
        calle=datos.calle.strip(),
        latitud=datos.latitud,
        longitud=datos.longitud,
        descripcion=datos.descripcion.strip() if datos.descripcion else None,
        tipo_dano=datos.tipo_dano,
        tamano=datos.tamano if datos.tipo_dano == "bache" else None,
        profundidad_cm=datos.profundidad_cm if datos.tipo_dano == "bache" else None,
        carril_afectado=datos.carril_afectado if datos.tipo_dano == "bache" else None,
        severidad=severidad,
        senalizado=datos.senalizado if datos.tipo_dano == "alcantarilla_sin_tapa" else None,
        estado="Recibido",
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    nuevo.colonia = colonia
    return _bache_a_item(nuevo)


@app.patch("/api/baches/{bache_id}", response_model=ReporteItem)
def actualizar_bache(
    bache_id: int = Path(..., ge=1),
    datos: BacheActualizar = ...,
    usuario: Usuario = Depends(exigir_roles("Moderador", "Coordinador", "Enlace_Municipal", "Administrador")),
    db: Session = Depends(get_db),
):
    b = db.scalar(select(Bache).options(joinedload(Bache.colonia)).where(Bache.id_bache == bache_id))
    if not b:
        raise HTTPException(status_code=404, detail="Bache no encontrado.")

    estado_anterior = b.estado
    if datos.calle is not None:
        b.calle = datos.calle.strip()
    if datos.descripcion is not None:
        b.descripcion = datos.descripcion.strip() or None
    if datos.severidad is not None:
        b.severidad = datos.severidad
    if datos.estado is not None:
        b.estado = datos.estado

    if datos.estado is not None and datos.estado != estado_anterior:
        db.add(
            CambioEstado(
                id_bache=b.id_bache,
                id_usuario_responsable=usuario.id_usuario,
                comentario_publico=datos.comentario_publico or f"Estado actualizado a {datos.estado}",
            )
        )

    db.commit()
    db.refresh(b)
    return _bache_a_item(b)


@app.delete("/api/baches/{bache_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_bache(
    bache_id: int = Path(..., ge=1),
    _usuario: Usuario = Depends(exigir_roles("Moderador", "Coordinador", "Administrador")),
    db: Session = Depends(get_db),
):
    b = db.get(Bache, bache_id)
    if not b:
        raise HTTPException(status_code=404, detail="Bache no encontrado.")
    db.delete(b)
    db.commit()


@app.post("/api/encharcamientos", response_model=ReporteItem, status_code=status.HTTP_201_CREATED)
def crear_encharcamiento(datos: EncharcamientoCrear, db: Session = Depends(get_db)):
    if not dentro_de_juarez(float(datos.latitud), float(datos.longitud)):
        raise HTTPException(status_code=400, detail="La ubicación está fuera del municipio de Ciudad Juárez.")

    colonia = db.get(Colonia, datos.id_colonia)
    if not colonia or not colonia.activa:
        raise HTTPException(status_code=404, detail="Colonia no encontrada o inactiva.")

    anio = datetime.now(timezone.utc).year
    consecutivo = (
        db.scalar(select(Encharcamiento.id_encharcamiento).order_by(Encharcamiento.id_encharcamiento.desc()))
        or 0
    ) + 1
    folio = f"ENC-{anio}-{consecutivo:06d}"

    nuevo = Encharcamiento(
        folio=folio,
        id_colonia=datos.id_colonia,
        calle=datos.calle.strip(),
        latitud=datos.latitud,
        longitud=datos.longitud,
        descripcion=datos.descripcion.strip() if datos.descripcion else None,
        nivel_agua=datos.nivel_agua,
        riesgo_alto=datos.riesgo_alto if datos.nivel_agua == "intransitable" else False,
        estado="Activo",
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    nuevo.colonia = colonia
    return _enc_a_item(nuevo)


@app.patch("/api/encharcamientos/{enc_id}", response_model=ReporteItem)
def actualizar_encharcamiento(
    enc_id: int = Path(..., ge=1),
    datos: EncharcamientoActualizar = ...,
    _usuario: Usuario = Depends(exigir_roles("Moderador", "Coordinador", "Enlace_Municipal", "Administrador")),
    db: Session = Depends(get_db),
):
    e = db.scalar(
        select(Encharcamiento)
        .options(joinedload(Encharcamiento.colonia))
        .where(Encharcamiento.id_encharcamiento == enc_id)
    )
    if not e:
        raise HTTPException(status_code=404, detail="Encharcamiento no encontrado.")

    if datos.calle is not None:
        e.calle = datos.calle.strip()
    if datos.descripcion is not None:
        e.descripcion = datos.descripcion.strip() or None
    if datos.nivel_agua is not None:
        e.nivel_agua = datos.nivel_agua
    if datos.riesgo_alto is not None:
        e.riesgo_alto = datos.riesgo_alto
    if datos.estado is not None:
        e.estado = datos.estado

    db.commit()
    db.refresh(e)
    return _enc_a_item(e)


@app.post("/api/{kind}/{reporte_id}/confirmar", status_code=status.HTTP_204_NO_CONTENT)
def confirmar_reporte(kind: str, reporte_id: int = Path(..., ge=1), db: Session = Depends(get_db)):
    if kind == "baches":
        obj = db.get(Bache, reporte_id)
    elif kind == "encharcamientos":
        obj = db.get(Encharcamiento, reporte_id)
    else:
        raise HTTPException(status_code=400, detail="Tipo de reporte inválido.")

    if not obj:
        raise HTTPException(status_code=404, detail="Reporte no encontrado.")

    obj.confirmaciones += 1
    db.commit()


# --- Resumen y servicio externo ---


@app.get("/api/resumen", response_model=ResumenRespuesta)
def obtener_resumen(db: Session = Depends(get_db)):
    total_baches = db.scalar(select(func.count()).select_from(Bache)) or 0
    total_enc = db.scalar(select(func.count()).select_from(Encharcamiento)) or 0
    baches_alto = (
        db.scalar(select(func.count()).select_from(Bache).where(Bache.severidad == "Alta")) or 0
    )
    enc_alto = (
        db.scalar(
            select(func.count()).select_from(Encharcamiento).where(Encharcamiento.riesgo_alto.is_(True))
        )
        or 0
    )
    conf_b = db.scalar(select(func.coalesce(func.sum(Bache.confirmaciones), 0))) or 0
    conf_e = db.scalar(select(func.coalesce(func.sum(Encharcamiento.confirmaciones), 0))) or 0

    return ResumenRespuesta(
        total_baches=total_baches,
        total_encharcamientos=total_enc,
        baches_riesgo_alto=baches_alto,
        encharcamientos_riesgo_alto=enc_alto,
        total_confirmaciones=int(conf_b) + int(conf_e),
    )


@app.get("/api/externo/clima-juarez", response_model=ClimaJuarezRespuesta)
def clima_juarez():
    url = (
        "https://api.open-meteo.com/v1/forecast"
        "?latitude=31.6904&longitude=-106.4245&current=temperature_2m,precipitation"
    )
    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.get(url)
            resp.raise_for_status()
            data = resp.json().get("current", {})
            temp = data.get("temperature_2m")
            precip = data.get("precipitation", 0.0)
            return ClimaJuarezRespuesta(
                ciudad="Ciudad Juárez",
                temperatura_c=float(temp) if temp is not None else None,
                precipitacion_mm=float(precip) if precip is not None else 0.0,
                alerta_encharcamiento=bool(precip and float(precip) > 0.5),
                fuente="Open-Meteo",
                disponible=True,
            )
    except httpx.HTTPError:
        return ClimaJuarezRespuesta(
            ciudad="Ciudad Juárez",
            temperatura_c=None,
            precipitacion_mm=None,
            alerta_encharcamiento=False,
            fuente="Open-Meteo",
            disponible=False,
        )


@app.get("/api/zona/consulta")
def estado_de_mi_zona(
    lat: float = Query(...),
    lon: float = Query(...),
    radio_km: float = Query(1.0, gt=0.05, le=10.0),
    solo_con_etiquetas: bool = Query(default=True),
    db: Session = Depends(get_db),
):
    if not dentro_de_juarez(lat, lon):
        raise HTTPException(
            status_code=400,
            detail="La ubicación está fuera del municipio de Ciudad Juárez.",
        )

    zona_osm = consultar_zona(
        lat=lat,
        lon=lon,
        radio_km=radio_km,
        solo_con_etiquetas=solo_con_etiquetas,
    )

    radio_m = radio_km * 1000.0

    baches_en_radio = [
        b
        for b in db.scalars(
            select(Bache)
            .options(joinedload(Bache.colonia))
            .where(cast(Bache.estado, String).notin_(["Rechazado", "Reparado"]))
        ).all()
        if distancia_metros(lat, lon, float(b.latitud), float(b.longitud)) <= radio_m
    ]

    encs_en_radio = [
        e
        for e in db.scalars(
            select(Encharcamiento)
            .options(joinedload(Encharcamiento.colonia))
            .where(cast(Encharcamiento.estado, String) == "Activo")
        ).all()
        if distancia_metros(lat, lon, float(e.latitud), float(e.longitud)) <= radio_m
    ]

    colonias_detectadas = sorted({
        *(b.colonia.nombre for b in baches_en_radio if b.colonia and b.colonia.nombre),
        *(e.colonia.nombre for e in encs_en_radio if e.colonia and e.colonia.nombre),
    })

    reportes_items = [
        *[_bache_a_item(b) for b in baches_en_radio],
        *[_enc_a_item(e) for e in encs_en_radio],
    ]

    return {
        **zona_osm,
        "colonias_cercanas": colonias_detectadas,
        "reportes_cercanos": {
            "baches_activos": len(baches_en_radio),
            "encharcamientos_activos": len(encs_en_radio),
            "items": reportes_items,
        },
    }