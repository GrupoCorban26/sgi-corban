# SGI Backend - API Documentation

## Overview

**Framework:** FastAPI with async SQLAlchemy  
**Database:** Microsoft SQL Server (via aioodbc)  
**Authentication:** JWT Bearer Token (HS256, 30min expiration)  
**Base URL:** `http://localhost:8000/api/v1`  
**Version:** 1.0.0

---

## 🔧 System Endpoints

### GET `/`
**Description:** Root endpoint - Welcome message  
**Response:**
```json
{
  "message": "Bienvenido al SGI de Grupo Corban"
}
```

### GET `/health`
**Description:** Health check endpoint for monitoring  
**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-15T12:15:00.000000",
  "version": "1.0.0"
}
```

---

## 🔐 Authentication

### POST `/login/`
**Description:** Authenticate user and get JWT token  
**Auth Required:** No  
**Request Body:**
```json
{
  "correo": "string",
  "password": "string"
}
```
**Response:**
```json
{
  "access_token": "jwt_token",
  "token_type": "bearer",
  "user": {
    "nombre": "string",
    "area": "string",
    "cargo": "string",
    "roles": ["string"],
    "debe_cambiar_password": boolean
  }
}
```

---

## 👤 Usuarios

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/usuarios` | List users with pagination | ✅ |
| GET | `/usuarios/{id}` | Get user by ID | ✅ |
| POST | `/usuarios` | Create user | ✅ |
| PUT | `/usuarios/{id}` | Update user | ✅ |
| DELETE | `/usuarios/{id}` | Deactivate user (soft delete) | ✅ |
| PUT | `/usuarios/{id}/reactivar` | Reactivate user | ✅ |
| PUT | `/usuarios/{id}/roles` | Assign roles to user | ✅ |
| PUT | `/usuarios/{id}/password` | Change password | ✅ |
| GET | `/usuarios/roles/dropdown` | Get roles for dropdown | ✅ |
| GET | `/usuarios/empleados/disponibles` | Get employees without user | ✅ |

---

## 👥 Empleados

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/empleados/` | List employees with pagination | No |
| GET | `/empleados/dropdown` | Get employees for dropdown | No |
| POST | `/empleados/` | Create employee | No |
| PUT | `/empleados/{empleado_id}` | Update employee | No |
| DELETE | `/empleados/{empleado_id}` | Deactivate employee | No |
| PATCH | `/empleados/{empleado_id}/reactivar` | Reactivate employee | No |

---

## 🏢 Departamentos

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/departamentos/` | List departments | No |
| GET | `/departamentos/dropdown` | Get departments for dropdown | No |
| POST | `/departamentos/` | Create department | No |
| PUT | `/departamentos/{depto_id}` | Update department | No |
| DELETE | `/departamentos/{depto_id}` | Deactivate department | No |

---

## 🏠 Áreas

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/areas/` | List areas with pagination | No |
| GET | `/areas/dropdown` | Get areas for dropdown | No |
| GET | `/areas/by-departamento/{depto_id}` | Get areas by department | No |
| POST | `/areas/` | Create area | No |
| PUT | `/areas/{area_id}` | Update area | No |
| DELETE | `/areas/{area_id}` | Deactivate area | No |

---

## 💼 Cargos

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/cargos/` | List positions with pagination | No |
| GET | `/cargos/dropdown` | Get positions for dropdown | No |
| GET | `/cargos/by-area/{area_id}` | Get positions by area | No |
| POST | `/cargos/` | Create position | No |
| PUT | `/cargos/{cargo_id}` | Update position | No |
| DELETE | `/cargos/{cargo_id}` | Deactivate position | No |

---

## 📊 Importaciones

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/importaciones/` | List imports with pagination | No |
| POST | `/importaciones/upload` | Upload Excel file | No |

**Query Params for GET:**
- `page`, `page_size`, `search`, `sin_telefono`, `sort_by_ruc`

---

## 📞 Contactos

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/contactos/ruc/{ruc}` | Get contacts by RUC | No |
| GET | `/contactos/list/paginated` | List contacts paginated | No |
| GET | `/contactos/stats` | Get contact statistics | No |
| GET | `/contactos/mis-asignados` | Get my assigned contacts | ✅ |
| GET | `/contactos/filtros-base` | Get filters (countries/tariffs) | No |
| POST | `/contactos/` | Create contact | No |
| POST | `/contactos/upload` | Upload Excel file | No |
| POST | `/contactos/assign-batch` | Assign 50 leads to user | ✅ |
| POST | `/contactos/cargar-base` | Load 50 contacts for commercial | ✅ |
| POST | `/contactos/enviar-feedback` | Submit feedback batch | ✅ |
| PUT | `/contactos/{id}` | Update contact | No |
| PUT | `/contactos/{id}/feedback` | Update contact feedback | ✅ |
| DELETE | `/contactos/{id}` | Delete contact | No |

---

## 📝 Casos de Llamada

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/casos-llamada/` | List all call cases | No |
| GET | `/casos-llamada/{id}` | Get call case by ID | No |
| POST | `/casos-llamada/` | Create call case | No |
| PUT | `/casos-llamada/{id}` | Update call case | No |
| DELETE | `/casos-llamada/{id}` | Delete call case | No |

---

## 📋 Base Comercial

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/base/` | Get commercial base (merge imports + contacts) | No |
| GET | `/base/stats` | Get base statistics | No |

**Filters:** RUC >= 20400000000, FOB max <= 300,000, estado = DISPONIBLE

---

## 🏪 Clientes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/clientes` | List clients with pagination | No |
| GET | `/clientes/{id}` | Get client by ID | No |
| GET | `/clientes/dropdown` | Get clients for dropdown | No |
| GET | `/clientes/stats` | Get client statistics | No |
| POST | `/clientes` | Create client | ✅ |
| PUT | `/clientes/{id}` | Update client | ✅ |
| DELETE | `/clientes/{id}` | Deactivate client | ✅ |

---

## 📍 Ubigeo

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/ubigeo/departamentos` | List departments (Peru) | No |
| GET | `/ubigeo/provincias/{depto}` | List provinces | No |
| GET | `/ubigeo/distritos/{depto}/{prov}` | List districts | No |

---

## Response Patterns

### Pagination Response
```json
{
  "total": 100,
  "page": 1,
  "page_size": 15,
  "data": [...]
}
```

### Operation Result
```json
{
  "success": 1,
  "message": "Operación completada",
  "id": 123
}
```

### Error Response
```json
{
  "detail": "Error message here"
}
```

---

## Architecture Summary

```
sgi-backend/
├── main.py                    # FastAPI app + router registration
├── app/
│   ├── api/v1/               # API Routers
│   │   ├── auth.py           # Login endpoint
│   │   ├── usuarios.py       # User management
│   │   ├── comercial/        # Commercial module
│   │   │   ├── base.py
│   │   │   ├── casos_llamada.py
│   │   │   ├── clientes.py
│   │   │   ├── contactos.py
│   │   │   └── importaciones.py
│   │   ├── organizacion/     # Organization module
│   │   │   ├── areas.py
│   │   │   ├── cargos.py
│   │   │   ├── departamentos.py
│   │   │   └── empleados.py
│   │   └── core/
│   │       └── ubigeo.py
│   ├── core/
│   │   └── security.py       # JWT + Password hashing
│   ├── database/
│   │   └── db_connection.py  # Async MSSQL connection
│   ├── schemas/              # Pydantic models
│   └── services/             # Business logic + DB operations
└── querys/                   # SQL stored procedures
```

**Total Endpoints:** 58
