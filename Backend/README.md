# Programación Web, Unidad 4: Tienda U4 (FastAPI + PostgreSQL)

Instituto Tecnológico de Ciudad Juárez · Ingeniería en Sistemas Computacionales

## Datos del alumno (llénalo en tu primer commit)

| Campo | Valor |
| --- | --- |
| Nombre | |
| Número de control (NC) | |
| Versión de Python | |
| Entorno usado | Codespaces / Local con Docker / Local sin Docker |

## Instrucciones de los ejercicios

Las instrucciones completas (E0 a E7, evidencias, reporte, rúbrica y autoevaluación) están aquí:

**[Documento de ejercicios de la Unidad 4](ENLACE_AL_DOCUMENTO)**

Este repositorio ya trae la estructura y los archivos base. **No crees un proyecto nuevo:** trabaja sobre estos archivos. Cada uno indica con `TODO` y con el identificador del ejercicio (E1, E3, ...) qué te toca escribir.

## Antes de empezar

Escribe tu número de control (formato `YY11NNNN`, ejemplo `26110001`) en la variable `NC` de:

- `app/main.py`
- `ejercicios/e1_fundamentos.py`
- `ejercicios/e5_clases.py`

## Opción A: GitHub Codespaces (recomendada si no tienes Docker)

1. En la página de tu repositorio: **Code → Codespaces → Create codespace on main**.
2. Espera a que termine la instalación (crea Python 3.12, PostgreSQL 16 e instala dependencias).
3. En la terminal del Codespace:

```bash
fastapi dev app/main.py
```

4. Abre el puerto 8000 que te ofrece VS Code y agrega `/docs` a la URL.
5. Para entrar a la base: `psql postgresql://postgres:u4local@localhost:5432/tienda`

## Opción B: en tu computadora

Requisitos: Python 3.11 o superior, Git y Docker Desktop (o PostgreSQL instalado de forma nativa).

```bash
git clone <URL de tu repositorio>
cd <carpeta del repositorio>

python -m venv .venv
# Linux/macOS
source .venv/bin/activate
# Windows (PowerShell)
.venv\Scripts\Activate.ps1

pip install -r requirements.txt

# Base de datos (con Docker)
docker compose up -d

# API
fastapi dev app/main.py
```

Abre `http://127.0.0.1:8000/docs`.

**Sin Docker:** instala PostgreSQL 14 o superior, crea la base `tienda` y, si tu usuario o contraseña son distintos, copia `.env.example` como `.env`, ajusta `DATABASE_URL` y expórtala en tu terminal antes de correr la API.

## Migraciones (a partir de E6)

```bash
alembic upgrade head      # aplica todas las migraciones
alembic history           # muestra el historial
```

## Estructura

```text
app/
  main.py            E0, E3, E4, E6 (rutas)
  schemas.py         E3, E5 (modelos Pydantic)
  dependencias.py    E4 (Depends)
  servicios.py       E5 (clase pura CalculadoraPrecio)
  database.py        conexión a PostgreSQL (ya está lista)
  models.py          E5, E6 (modelos SQLAlchemy)
  lab_inyeccion.py   E7 (laboratorio, SOLO local)
ejercicios/
  e1_fundamentos.py  E1
  e2_concurrencia.py E2 (servidor de prueba, ya está listo)
  e2_medir.py        E2 (cliente de medición, ya está listo)
  e5_clases.py       E5
alembic/             se crea en E6 con: alembic init alembic
reporte/             tu PDF final: U4_Ejercicios_<NC>.pdf
```

## Cómo entregar

1. **Commits frecuentes**, mínimo uno por ejercicio, con mensaje que empiece con el identificador:
   `git commit -m "E3: modelos de entrada y salida"`
2. **Sube tus cambios** con `git push`. Cada push a `main` queda registrado como entrega.
3. **Reporte:** guarda tu PDF en `reporte/U4_Ejercicios_<NC>.pdf`, haz commit y push.
4. Antes de la fecha límite verifica en GitHub que el último commit contiene tu código y tu PDF.

Nunca subas `.venv/`, `.env` ni contraseñas reales. El `.gitignore` ya los excluye; no lo borres.

## Verificación automática

Cada push ejecuta la revisión **Verificación U4** (pestaña *Actions*). No es tu calificación; solo confirma que:

- `NC` tiene tu número de control real.
- No subiste `.venv/` ni `.env`.
- El código compila.
- Las migraciones de Alembic se aplican sobre una base vacía (desde E6).
- La API arranca y responde en `/salud`.

Si aparece una ❌, abre el detalle: el mensaje dice qué corregir. Al inicio fallará el paso de `NC` hasta que escribas tu número de control.
