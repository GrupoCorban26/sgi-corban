"""
ContactosService - Fachada para mantener compatibilidad con la API existente.

Este servicio fue refactorizado en módulos más pequeños:
- ContactosExcelService: Procesamiento de Excel
- ContactosCrudService: Operaciones CRUD y listados
- ContactosAsignacionService: Lógica de asignación y feedback

Esta clase actúa como fachada para mantener la compatibilidad con los endpoints existentes.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import UploadFile

from app.services.comercial.contactos_excel_service import ContactosExcelService
from app.services.comercial.contactos_crud_service import ContactosCrudService
from app.services.comercial.contactos_asignacion_service import ContactosAsignacionService


class ContactosService:
    """
    Fachada de Contactos - Mantiene compatibilidad con la API existente.
    Delega operaciones a servicios especializados.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self._excel_service = ContactosExcelService(db)
        self._crud_service = ContactosCrudService(db)
        self._asignacion_service = ContactosAsignacionService(db)

    # =========================================================================
    # PROCESAMIENTO DE EXCEL (delegado a ContactosExcelService)
    # =========================================================================

    async def process_excel_contactos(self, file: UploadFile):
        """Procesa Excel de contactos con BULK INSERT y UPDATE."""
        return await self._excel_service.process_excel_contactos(file)

    # =========================================================================
    # CRUD BÁSICO (delegado a ContactosCrudService)
    # =========================================================================

    async def get_contactos_by_ruc(self, ruc: str):
        """Obtiene contactos por RUC."""
        return await self._crud_service.get_contactos_by_ruc(ruc)

    async def create_contacto(self, data: dict):
        """Crea un nuevo contacto."""
        return await self._crud_service.create_contacto(data)

    async def update_contacto(self, id: int, data: dict):
        """Actualiza un contacto existente."""
        return await self._crud_service.update_contacto(id, data)

    async def delete_contacto(self, id: int):
        """Desactiva un contacto (soft delete)."""
        return await self._crud_service.delete_contacto(id)

    # =========================================================================
    # LISTADO Y ESTADÍSTICAS (delegado a ContactosCrudService)
    # =========================================================================

    async def get_contactos_paginado(self, page: int, page_size: int, search: str = None, estado: str = None):
        """Lista contactos paginados usando ORM."""
        return await self._crud_service.get_contactos_paginado(page, page_size, search, estado)

    async def get_estadisticas(self):
        """Retorna estadísticas de contactos."""
        return await self._crud_service.get_estadisticas()

    async def get_kpis_gestion(self, fecha_inicio=None, fecha_fin=None):
        """Retorna KPIs de gestión."""
        return await self._crud_service.get_kpis_gestion(fecha_inicio, fecha_fin)

    # =========================================================================
    # COMERCIAL/BASE (delegado a ContactosAsignacionService)
    # =========================================================================
    
    async def get_mis_contactos_asignados(self, user_id: int):
        """Obtiene los contactos asignados al comercial."""
        return await self._asignacion_service.get_mis_contactos_asignados(user_id)
    
    async def cargar_base(self, user_id: int, pais_origen: list = None, partida_arancelaria: list = None):
        """Lógica de asignación de lotes con TRANSACCIÓN EXPLÍCITA."""
        return await self._asignacion_service.cargar_base(user_id, pais_origen, partida_arancelaria)

    async def assign_leads_batch(self, user_id: int):
        """Asigna contactos a un comercial siguiendo la lógica de lotes y empresas únicas."""
        return await self._asignacion_service.assign_leads_batch(user_id)
    
    async def actualizar_feedback(self, contacto_id: int, caso_id: int, comentario: str, user_id: int = None):
        """Actualiza el feedback y crea Cliente si es positivo."""
        return await self._asignacion_service.actualizar_feedback(contacto_id, caso_id, comentario, user_id)
    
    async def enviar_feedback_lote(self, user_id: int):
        """Envía el feedback de todos los contactos asignados."""
        return await self._asignacion_service.enviar_feedback_lote(user_id)
    
    async def get_filtros_base(self):
        """Obtiene países y partidas disponibles para filtrar."""
        return await self._asignacion_service.get_filtros_base()
