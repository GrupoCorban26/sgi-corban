# SGI - Sistema de Gestión Integral
## Grupo Corban - Agencia de Cargas y Aduanas

## 📋 Descripción del Proyecto

Sistema web integral desarrollado para **Grupo Corban** que centraliza y digitaliza los procesos operativos de la agencia de cargas y aduanas. El sistema, en un inicio, reemplaza la gestión manual dispersa (WhatsApp, emails, Excel) por una plataforma unificada con trazabilidad completa, flujos de aprobación digitales y generación de métricas para la toma de decisiones.

### Objetivo Principal
Digitalizar y optimizar los procesos internos comenzando por el área comercial, con capacidad de escalar gradualmente a todas las áreas operativas de la empresa.

---

## 🎯 Alcance Versión 1.0 (MVP)

### Módulos Incluidos:
- **Gestión de Empleados y Áreas** - Administración centralizada de personal
- **Autenticación y Seguridad** - Control de accesos con roles y permisos
- **Gestión de Clientes** - Base de datos de clientes y prospectos
- **Gestión Comercial** - Solicitud de cotizaciones a pricing, aprobacion de cotizacion a jefa comercial
- **Dashboard y Reportes** - Métricas y KPIs del área comercial
- **Sistema de Notificaciones** - Alertas in-app de eventos importantes
- **Auditoría** - Registro de acciones críticas del sistema

### Módulos Futuros (v2.0+):
- Gestión de Operaciones (tracking de servicios)
- Facturación y Cuentas por Cobrar
- Gestión Documental
- Integraciones con SUNAT y servicios externos

---

## 🛠️ Stack Tecnológico

### Backend
- **Lenguaje:** Python 3.13.2
- **Framework:** FastAPI
- **ORM:** SQLAlchemy
- **Base de Datos:** SQL Server 2025
- **Autenticación:** JWT (JSON Web Tokens)
- **Validación:** Pydantic

### Frontend
- **Framework:** Next.js (React)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS
- **Gestión de Estado:** React Query / Zustand
- **Peticiones HTTP:** Axios

### Infraestructura
- **Servidor:** En desarrollo será de manera local, en producción en un servidor VPS.
- **Web Server:** IIS / Nginx
- **Control de Versiones:** GitLab (repositorio privado)
- **Contenedores:** Docker (opcional)

### Herramientas de Desarrollo
- **IDE:** Visual Studio Code
- **API Testing:** Postman
- **Documentación API:** Swagger UI (FastAPI automático)
- **Diseño:** Figma / Draw.io

---

## 📁 Estructura del Proyecto

```
Intranet/
├── docs/                          # Documentación del proyecto
│   ├── README.md                  # Este archivo
│   ├── PLANNING.md                # Plan general del proyecto
│   ├── REQUIREMENTS.md            # Especificación de requisitos
│   ├── DATABASE_DESIGN.md         # Diseño de base de datos
│   ├── API_DOCUMENTATION.md       # Documentación de endpoints
│   └── USER_GUIDE.md              # Manual de usuario
│
├── backend/                       # Aplicación FastAPI
│   ├── app/
│   │   ├── api/                   # Endpoints
│   │   │   ├── v1/
│   │   │   │   ├── employees.py
│   │   │   │   ├── auth.py
│   │   │   │   ├── clients.py
│   │   │   │   └── quotations.py
│   │   │   └── dependencies.py
│   │   ├── core/                  # Configuración y seguridad
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── database.py
│   │   ├── models/                # Modelos de base de datos
│   │   ├── schemas/               # Schemas Pydantic
│   │   ├── services/              # Lógica de negocio
│   │   └── main.py                # Punto de entrada
│   ├── tests/                     # Tests unitarios e integración
│   ├── alembic/                   # Migraciones de BD
│   ├── requirements.txt           # Dependencias Python
│   ├── .env.example               # Variables de entorno
│   └── Dockerfile                 # Contenedor Docker (opcional)
│
├── frontend/                      # Aplicación Next.js
│   ├── src/
│   │   ├── app/                   # App Router (Next.js 13+)
│   │   │   ├── (auth)/
│   │   │   ├── (dashboard)/
│   │   │   └── layout.tsx
│   │   ├── components/            # Componentes reutilizables
│   │   │   ├── ui/
│   │   │   ├── forms/
│   │   │   └── layouts/
│   │   ├── lib/                   # Utilidades y configuración
│   │   ├── hooks/                 # Custom hooks
│   │   ├── services/              # Servicios API
│   │   └── types/                 # Tipos TypeScript
│   ├── public/                    # Archivos estáticos
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.js
│
├── database/                      # Scripts de base de datos
│   ├── schema/                    # Definición de esquemas
│   ├── migrations/                # Scripts de migración
│   ├── seeds/                     # Datos iniciales
│   └── backup/                    # Scripts de respaldo
│
├── assets/                        # Recursos del proyecto
│   ├── logo.png
│   ├── diagrams/
│   └── mockups/
│
├── .gitignore
├── .gitlab-ci.yml                 # CI/CD (futuro)
└── docker-compose.yml             # Orquestación (opcional)
```

---

## 🚀 Instalación y Configuración

### Prerrequisitos
- Python 3.13.2
- Node.js 20+ y npm/yarn
- SQL Server 2025
- Git

### 1. Clonar el Repositorio
```bash
git clone git@gitlab.com:repositorio-grupo-corban/sistema-gestion-integral.git
cd sistema-gestion-integral
```

### 2. Configurar Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv

# Activar entorno virtual (Windows)
venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Copiar archivo de configuración
copy .env.example .env

# Editar .env con tus credenciales de BD
notepad .env

# Ejecutar migraciones
alembic upgrade head

# Iniciar servidor de desarrollo
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

El backend estará disponible en: `http://localhost:8000`
Documentación API: `http://localhost:8000/docs`

### 3. Configurar Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Copiar archivo de configuración
copy .env.local.example .env.local

# Editar .env.local con la URL del backend
notepad .env.local

# Iniciar servidor de desarrollo
npm run dev
```

El frontend estará disponible en: `http://localhost:3000`

### 4. Configurar Base de Datos

```bash
# Conectarse a SQL Server y crear la base de datos
sqlcmd -S localhost -U sa -P tu_password

CREATE DATABASE SGI_GrupoCorban;
GO

# Ejecutar scripts iniciales
cd database
sqlcmd -S localhost -d SGI_GrupoCorban -U sa -P tu_password -i schema/init.sql
```

---

## 🔐 Configuración de Variables de Entorno

### Backend (.env)
```env
# Base de datos
DATABASE_URL=mssql+pyodbc://usuario:password@localhost/SGI_GrupoCorban?driver=ODBC+Driver+17+for+SQL+Server

# Seguridad
SECRET_KEY=tu-clave-secreta-super-segura-cambiar-en-produccion
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Aplicación
PROJECT_NAME=SGI Grupo Corban
VERSION=1.0.0
API_V1_STR=/api/v1
DEBUG=True

# CORS
ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_NAME=SGI Grupo Corban
```

---

## 👤 Usuario Administrador Inicial

Después de ejecutar las migraciones, se crea automáticamente un usuario administrador:

- **Usuario:** basededatos@grupocorban.pe
- **Contraseña:** admin123

---

## 📚 Documentación Adicional

- **[Plan del Proyecto](./PLANNING.md)** - Cronograma, alcance, metodología
- **[Requisitos del Sistema](./REQUIREMENTS.md)** - Casos de uso y requisitos funcionales
- **[Diseño de Base de Datos](./DATABASE_DESIGN.md)** - Modelo ER y diccionario de datos
- **[Documentación de API](http://localhost:8000/docs)** - Swagger UI (con el backend corriendo)
- **[Manual de Usuario](./USER_GUIDE.md)** - Guía para usuarios finales

---

## 🧪 Pruebas

### Backend
```bash
cd backend
pytest tests/ -v --cov=app
```

### Frontend
```bash
cd frontend
npm run test
npm run test:coverage
```

---

## 📦 Despliegue en Producción

### Backend (Windows Server)
```bash
# Crear ejecutable con PyInstaller (opcional)
pyinstaller --onefile app/main.py

# O configurar como servicio de Windows con NSSM
nssm install SGI-Backend "C:\path\to\venv\Scripts\python.exe" "C:\path\to\app\main.py"
nssm start SGI-Backend
```

### Frontend (Next.js)
```bash
cd frontend
npm run build
npm run start

# O configurar con IIS como reverse proxy
```

### Base de Datos
- Configurar backups automáticos diarios
- Configurar replicación (si es necesario)
- Monitoreo de performance

---

## 🔒 Seguridad

- ✅ Autenticación JWT con tokens de corta duración
- ✅ Contraseñas hasheadas con bcrypt
- ✅ Validación de entrada con Pydantic
- ✅ CORS configurado
- ✅ Rate limiting en endpoints críticos
- ✅ Auditoría de acciones sensibles
- ✅ HTTPS en producción (certificado SSL)
- ✅ Variables sensibles en .env (no commiteadas)

---

## 📊 Métricas y Monitoreo

- Logs estructurados (backend)
- Métricas de performance
- Alertas de errores críticos
- Monitoreo de disponibilidad

---

## 🐛 Reporte de Bugs

Si encuentras algún bug o tienes sugerencias:

1. Verifica que no exista un issue similar en GitLab
2. Crea un nuevo issue con:
   - Descripción clara del problema
   - Pasos para reproducir
   - Comportamiento esperado vs actual
   - Screenshots (si aplica)
   - Logs relevantes

---

## 📝 Convenciones de Código

### Python (Backend)
- Seguir PEP 8
- Docstrings en español para funciones públicas
- Type hints obligatorios
- Nombres de variables en snake_case

### TypeScript (Frontend)
- ESLint + Prettier configurados
- Componentes funcionales con hooks
- Nombres de componentes en PascalCase
- Nombres de funciones/variables en camelCase

### Base de Datos
- Nombres de tablas en singular, snake_case (español)
- Claves primarias: `id`
- Claves foráneas: `[tabla]_id`
- Timestamps: `created_at`, `updated_at`

### Git
- Commits en español, descriptivos
- Branches: `feature/nombre`, `bugfix/nombre`, `hotfix/nombre`
- Pull/Merge Requests requeridos para `main`

---

## 📅 Roadmap

### Versión 1.0 (MVP) - Q1 2025 ✅
- [x] Módulo de Empleados
- [x] Autenticación y Roles
- [x] Módulo de Clientes
- [x] Módulo de Cotizaciones
- [x] Dashboard Comercial

### Versión 1.1 - Q2 2025
- [ ] Notificaciones por email
- [ ] Exportación avanzada de reportes
- [ ] Mejoras de UX basadas en feedback

### Versión 2.0 - Q3 2025
- [ ] Módulo de Operaciones
- [ ] Tracking de servicios
- [ ] Integración con proveedores

### Versión 3.0 - Q4 2025
- [ ] Módulo de Facturación
- [ ] Integración con SUNAT
- [ ] Portal de clientes

---

## 👨‍💻 Autor y Mantenimiento

**Desarrollador Principal:** Branco Arguedas
**Empresa:** Grupo Corban  
**Contacto Interno:** [basededatos@grupocorban.com]  
**Última Actualización:** Diciembre 2025

---

## 📄 Licencia

Este proyecto es de uso exclusivo interno de **Grupo Corban**. Todos los derechos reservados.

Prohibida su distribución, copia o uso fuera de la organización sin autorización expresa.

---

## 🙏 Agradecimientos

- Equipo de Grupo Corban por su colaboración en el levantamiento de requisitos
- Jefatura Comercial por las validaciones continuas del sistema

---

**¿Preguntas o necesitas soporte?** Contacta al área de TI.