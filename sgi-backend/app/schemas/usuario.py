from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# =========================================
# REQUEST SCHEMAS
# =========================================

class UsuarioCreate(BaseModel):
    empleado_id: int
    correo_corp: EmailStr
    password: str
    roles: List[int] = []


class UsuarioUpdate(BaseModel):
    correo_corp: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    debe_cambiar_pass: Optional[bool] = None
    is_bloqueado: Optional[bool] = None
    roles: Optional[List[int]] = None


class UsuarioChangePassword(BaseModel):
    password: str


class UsuarioAssignRoles(BaseModel):
    roles: List[int]


# =========================================
# RESPONSE SCHEMAS
# =========================================

class RolDropdown(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None


class EmpleadoSinUsuario(BaseModel):
    id: int
    nombre_completo: str
    nro_documento: str
    area_nombre: Optional[str] = None
    cargo_nombre: Optional[str] = None


class UsuarioResponse(BaseModel):
    id: int
    empleado_id: Optional[int] = None
    empleado_nombre: Optional[str] = None
    correo_corp: str
    is_active: bool
    is_bloqueado: bool
    ultimo_acceso: Optional[datetime] = None
    debe_cambiar_pass: bool = False
    roles: Optional[str] = None
    total_registros: Optional[int] = None


class UsuarioDetailResponse(BaseModel):
    id: int
    empleado_id: Optional[int] = None
    empleado_nombre: Optional[str] = None
    correo_corp: str
    is_active: bool
    is_bloqueado: bool
    ultimo_acceso: Optional[datetime] = None
    debe_cambiar_pass: bool
    intentos_fallidos: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    roles: List[RolDropdown] = []


class UsuarioPaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    data: List[UsuarioResponse]
