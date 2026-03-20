from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class ReporteLlamadaResponse(BaseModel):
    id: int
    ruc: str
    razon_social: str
    telefono: str
    contesto: bool
    caso_nombre: str
    comentario: Optional[str] = None
    comercial_nombre: str
    fecha_llamada: datetime

    model_config = ConfigDict(from_attributes=True)

class ReporteLlamadaPaginated(BaseModel):
    total: int
    page: int
    page_size: int
    data: List[ReporteLlamadaResponse]

# ==========================================
# REPORTES OPERATIVOS (Fase 3)
# ==========================================

class KPIBaseDatos(BaseModel):
    total_leads_ingresados: int
    leads_contactados: int
    porcentaje_contactabilidad: float
    leads_convertidos: int
    porcentaje_conversion: float

class DetalleBaseDatos(BaseModel):
    id: int
    razon_social: str
    ruc: Optional[str]
    estado: str
    origen: Optional[str]
    fecha_ingreso: datetime
    ultimo_contacto: Optional[datetime]
    comercial_nombre: Optional[str]

    model_config = ConfigDict(from_attributes=True)

class ReporteBaseDatos(BaseModel):
    kpis: KPIBaseDatos
    detalle: List[DetalleBaseDatos]

class KPIMantenimientoCartera(BaseModel):
    clientes_activos: int
    clientes_recontactados: int
    porcentaje_cobertura: float
    clientes_en_riesgo: int # sin contacto > 30 días
    porcentaje_riesgo: float

class DetalleMantenimientoCartera(BaseModel):
    id: int
    razon_social: str
    estado: str
    ultimo_contacto: Optional[datetime]
    proxima_fecha_contacto: Optional[datetime]
    dias_sin_contacto: int
    comercial_nombre: Optional[str]

    model_config = ConfigDict(from_attributes=True)

class ReporteMantenimientoCartera(BaseModel):
    kpis: KPIMantenimientoCartera
    detalle: List[DetalleMantenimientoCartera]

class KPIGestionLeads(BaseModel):
    leads_recibidos: int
    leads_atendidos: int
    porcentaje_atencion: float
    tiempo_promedio_respuesta_minutos: float
    leads_descartados: int

class DetalleGestionLeads(BaseModel):
    id: int
    fuente: str # "Whatsapp" o "Web"
    nombre: str
    estado: str
    fecha_recepcion: datetime
    tiempo_respuesta_minutos: Optional[int]
    comercial_nombre: Optional[str]

    model_config = ConfigDict(from_attributes=True)

class ReporteGestionLeads(BaseModel):
    kpis: KPIGestionLeads
    detalle: List[DetalleGestionLeads]
