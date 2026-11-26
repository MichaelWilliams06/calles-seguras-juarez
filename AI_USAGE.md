# Declaración de Uso de Inteligencia Artificial (`AI_USAGE.md`)

**Proyecto:** Calles Seguras Juárez — Plataforma ciudadana de baches y encharcamientos  
**Materia:** Programación Web (AEB-1055) · Instituto Tecnológico de Ciudad Juárez  
**Política aplicada:** Política de autoría de la ACM (la IA generativa es una herramienta de apoyo; los autores humanos asumen la responsabilidad total sobre la exactitud, seguridad y defensa del código entregado).

---

## 1. Herramientas y modelos utilizados

| Integrante | Herramienta / Servicio | Modelo / Versión | Uso principal |
| :--- | :--- | :--- | :--- |
| Liam Michael Williams Alcazar | Gemini (Google AI) | Gemini (Nov 2026) | Depuración de autenticación (`pwdlib`), consultas SQL de limpieza/administración, ajuste de geocodificación con Nominatim y redacción de documentación técnica. |
| *(Agregar compañero si aplica)* | *(Ej. GitHub Copilot / ChatGPT / Claude)* | *(Modelo)* | *(Área: frontend / backend / pruebas / infra)* |

---

## 2. Harness, modo de uso e entorno (IDE / Terminal)

* **Modo de interacción:** Chat conversacional fuera del editor (copia, revisión y adaptación manual de fragmentos de código y comandos). No se utilizó ejecución autónoma directa sobre el sistema de archivos.
* **IDE y entorno de desarrollo:** Visual Studio Code en Windows 10, consola Símbolo del sistema (`cmd`) para Git, Python/Uvicorn y Vite, y **pgAdmin 4** para inspección y administración de PostgreSQL (`db_calles_seguras`).

---

## 3. Archivos de contexto e instrucciones en el repositorio

* No se incluyeron archivos de instrucciones automáticas para agentes (`CLAUDE.md`, `AGENTS.md` o `.github/copilot-instructions.md`) en el repositorio, ya que la interacción se realizó mediante consultas puntuales acotadas por archivo y regla de negocio.
* Las especificaciones de negocio y arquitectura se tomaron directamente de los documentos del curso (`Requerimientos del cliente` y `Proyecto Final Integrador AEB-1055`).

---

## 4. Bitácora de prompts significativos

| Fecha | Integrante | Herramienta / Modelo | Prompt (resumen fiel) | Archivos afectados | Ajustes humanos realizados |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 2026-11-24 | Liam Michael Williams Alcazar | Gemini | "Solicité apoyo para diagnosticar un error 500 `UnknownHashError` al iniciar sesión con `pwdlib` y generar el hash Argon2 para un usuario Administrador en PostgreSQL." | `Backend/app/seguridad.py` | Se encapsuló `password_hash.verify()` en un bloque `try-except UnknownHashError` para devolver `False` (HTTP `401`) ante hashes inválidos y se ejecutó el `UPDATE` en pgAdmin con el hash Argon2 real. |
| 2026-11-24 | Liam Michael Williams Alcazar | Gemini | "Pedí limpiar los registros de prueba de baches, encharcamientos y tablas dependientes reiniciando secuencias sin alterar el esquema." | Base de datos `db_calles_seguras` (SQL) | Se verificaron las llaves foráneas en pgAdmin y se ejecutó `TRUNCATE TABLE ... RESTART IDENTITY` conservando catálogos y usuarios. |
| 2026-11-24 | Liam Michael Williams Alcazar | Gemini | "Solicité mejorar la geocodificación de calles y colonias de Ciudad Juárez en el formulario de reportes y verificar la visualización de marcadores en el mapa zonal." | `Frontend/src/pages/ReportarPage.tsx`, `Frontend/src/pages/MiZonaPage.tsx` | Se limpiaron sufijos de colonia y prefijos de vialidad en `prepararConsultaCalle`, se agregaron variantes de cruce en Nominatim y se validó que los marcadores distinguieran centro consultado vs. reportes activos. |
| 2026-11-24 | Liam Michael Williams Alcazar | Gemini | "Pedí generar `.gitignore`, inicializar el monorepo en `main` y estructurar la documentación técnica y autoevaluación para la entrega." | `.gitignore`, `AI_USAGE.md`, `README.md`, `docs/` | Se adaptaron las rutas a la estructura local (`Backend/`, `Frontend/`), se excluyeron archivos temporales (`.osm`, `.env`) y se verificaron los commits antes del push a GitHub. |

---

## 5. Marcado en commits

Todo commit que incorpore código, configuración o documentación generada o asistida por IA incluye al final del mensaje de Conventional Commits la etiqueta de atribución correspondiente:

```text
Assisted-by: Gemini