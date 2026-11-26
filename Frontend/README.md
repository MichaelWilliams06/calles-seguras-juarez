# Calles Seguras Juárez

Plataforma web ciudadana para el reporte, consulta, validación, moderación y seguimiento de incidencias viales —baches, hundimientos, grietas, alcantarillas sin tapa y encharcamientos— en **Ciudad Juárez, Chihuahua**.

El sistema permite a la ciudadanía consultar problemas activos sin fricción, confirmar incidencias existentes, evaluar el estado de su zona y reportar nuevas ubicaciones dentro del municipio, mientras que los equipos operativos (`Moderador`, `Coordinador`, `Enlace_Municipal` y `Administrador`) gestionan la validación, el avance de reparación, los catálogos territoriales, los indicadores y el control de accesos.

---

## Equipo de Desarrollo

Proyecto desarrollado en el **Instituto Tecnológico de Ciudad Juárez** (Ingeniería en Sistemas Computacionales):

| Integrante | Número de control | Institución |
| :--- | :---: | :--- |
| **Liam Michael Williams Alcazar** | `22111724` | Instituto Tecnológico de Ciudad Juárez |
| **Daniel Eduardo Silva Lopez** | `21111099` | Instituto Tecnológico de Ciudad Juárez |
| **Ricardo Daniel García García** | `21111136` | Instituto Tecnológico de Ciudad Juárez |

---

## Arquitectura y Stack Tecnológico

El proyecto está organizado como un monorepo con separación clara entre API, interfaz web, infraestructura y documentación:

```text
Programa_Web_Final/
├── Backend/          # API REST en Python + FastAPI, SQLAlchemy, Alembic, Pydantic y seguridad JWT / Argon2id
├── Frontend/         # Aplicación SPA en React, TypeScript, React Router y Vite
├── infra/            # Definición de servicios y despliegue con Docker Compose
├── docs/             # Documentación técnica y reporte de evidencias (REPORTE.pdf)
└── README.md