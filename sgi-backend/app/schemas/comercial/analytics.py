"""
Schemas Pydantic para el endpoint de analytics del buzón.
Estructura de 3 niveles: General, Por Canal, Comparativo.
"""
from pydantic import BaseModel
from typing import List, Optional


# =========================================================================
# ITEMS INDIVIDUALES (para listas/gráficos)
# =========================================================================

class ItemConteo(BaseModel):
    """Item genérico para gráficos: { name, value }."""
    name: str
    value: int


class LeadsPorComercial(BaseModel):
    """Rendimiento individual de un comercial."""
    nombre: str
    total: int
    convertidos: int
    descartados: int
    tasa_conversion: float


class TendenciaMensual(BaseModel):
    """Punto de datos para gráfico de tendencia mensual."""
    mes: str
    whatsapp: int
    web: int
    total: int


# =========================================================================
# NIVEL 1 — VISTA GENERAL (FUSIONADA)
# =========================================================================

class ResumenGeneral(BaseModel):
    """KPIs globales fusionando WhatsApp + Web."""
    total_leads: int
    total_convertidos: int
    total_descartados: int
    total_en_gestion: int
    tasa_conversion: float
    tasa_descarte: float
    tiempo_respuesta_promedio_minutos: Optional[float] = None
    proporcion_canal: List[ItemConteo]  # [{ name: "WhatsApp", value: X }, { name: "Web", value: Y }]
    tendencia_mensual: List[TendenciaMensual]


# =========================================================================
# NIVEL 2 — POR CANAL
# =========================================================================

class ResumenCanalWhatsApp(BaseModel):
    """KPIs específicos del canal WhatsApp (Inbox)."""
    total: int
    nuevos: int
    pendientes: int
    en_gestion: int
    cotizados: int
    cierre: int
    descartados: int
    tasa_conversion: float  # CIERRE / total
    tasa_descarte: float
    tiempo_respuesta_promedio_minutos: Optional[float] = None
    motivos_descarte: List[ItemConteo]
    leads_por_comercial: List[LeadsPorComercial]


class ResumenCanalWeb(BaseModel):
    """KPIs específicos del canal Web (LeadWeb)."""
    total: int
    nuevos: int
    pendientes: int
    en_gestion: int
    convertidos: int
    descartados: int
    tasa_conversion: float  # CONVERTIDO / total
    tasa_descarte: float
    tiempo_respuesta_promedio_minutos: Optional[float] = None
    motivos_descarte: List[ItemConteo]
    leads_por_pagina: List[ItemConteo]
    leads_por_comercial: List[LeadsPorComercial]


class AnalyticsPorCanal(BaseModel):
    """Contenedor del Nivel 2."""
    whatsapp: ResumenCanalWhatsApp
    web: ResumenCanalWeb


# =========================================================================
# NIVEL 3 — COMPARATIVO
# =========================================================================

class ComparativoItem(BaseModel):
    """Item para gráfico comparativo lado a lado."""
    metrica: str
    whatsapp: float
    web: float


class AnalyticsComparativo(BaseModel):
    """Contenedor del Nivel 3."""
    metricas: List[ComparativoItem]
    rendimiento_por_comercial: List[dict]  # Estructura flexible por comercial


# =========================================================================
# RESPONSE PRINCIPAL
# =========================================================================

class AnalyticsBuzonResponse(BaseModel):
    """Response completo del endpoint de analytics del buzón."""
    general: ResumenGeneral
    por_canal: AnalyticsPorCanal
    comparativo: AnalyticsComparativo
