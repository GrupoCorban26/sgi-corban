# Schemas del módulo comercial
from app.schemas.comercial.cliente import ClienteCreate, ClienteUpdate, ClienteResponse
from app.schemas.comercial.contactos import ContactoCreate, ContactoUpdate, ContactoResponse
from app.schemas.comercial.cita import CitaCreate, CitaUpdate, CitaResponse, CitaAprobar, CitaRechazar
from app.schemas.comercial.casos_llamada import CasoLlamadaCreate, CasoLlamadaUpdate, CasoLlamadaResponse
from app.schemas.comercial.importaciones import ImportacionPagination
from app.schemas.comercial.seguimiento import (
    TipoCargaResponse, TipoServicioComercialResponse, SegmentacionCierreResponse,
    CotizacionItemCreate, CotizacionItemResponse, SeguimientoCreate, SeguimientoResponse,
    CotizacionCerrar, SeguimientoCaer, SeguimientoMover,
    SeguimientoComentarioCreate, SeguimientoComentarioResponse, SeguimientoHistorialResponse
)
from app.schemas.comercial.incidencia import (
    IncidenciaCreate, IncidenciaUpdate, IncidenciaResolver, IncidenciaResponse
)

