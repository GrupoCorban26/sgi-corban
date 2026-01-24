from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from app.models.administrativo import ActivoHistorial, Activo, EstadoActivo


class ActivoHistorialService:
    """
    Servicio de Historial de Activos - ORM
    Registra y consulta cambios de estado de activos.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db

    # =========================================================================
    # CONSULTAS
    # =========================================================================

    async def get_by_activo(self, activo_id: int) -> list:
        """Obtiene el historial de cambios de un activo"""
        # Verificar que el activo existe
        activo_exists = await self.db.execute(
            select(func.count()).select_from(Activo).where(Activo.id == activo_id)
        )
        if activo_exists.scalar() == 0:
            raise HTTPException(404, "Activo no encontrado")
        
        stmt = select(ActivoHistorial).options(
            selectinload(ActivoHistorial.estado_anterior),
            selectinload(ActivoHistorial.estado_nuevo),
            selectinload(ActivoHistorial.usuario)
        ).where(
            ActivoHistorial.activo_id == activo_id
        ).order_by(ActivoHistorial.fecha_cambio.desc())
        
        result = await self.db.execute(stmt)
        historiales = result.scalars().all()
        
        data = []
        for h in historiales:
            # Obtener nombre del usuario que registró
            usuario_nombre = None
            if h.usuario and hasattr(h.usuario, 'empleado'):
                emp = h.usuario.empleado
                if emp:
                    usuario_nombre = f"{emp.nombres} {emp.apellido_paterno}"
            
            data.append({
                "id": h.id,
                "activo_id": h.activo_id,
                "estado_anterior_id": h.estado_anterior_id,
                "estado_anterior_nombre": h.estado_anterior.nombre if h.estado_anterior else None,
                "estado_nuevo_id": h.estado_nuevo_id,
                "estado_nuevo_nombre": h.estado_nuevo.nombre if h.estado_nuevo else None,
                "motivo": h.motivo,
                "observaciones": h.observaciones,
                "empleado_activo_id": h.empleado_activo_id,
                "registrado_por": h.registrado_por,
                "registrado_por_nombre": usuario_nombre,
                "fecha_cambio": h.fecha_cambio
            })
        
        return data

    # =========================================================================
    # REGISTRO
    # =========================================================================

    async def registrar_cambio(
        self, 
        activo_id: int, 
        estado_anterior_id: int | None,
        estado_nuevo_id: int,
        motivo: str,
        observaciones: str = None,
        empleado_activo_id: int = None,
        registrado_por: int = None
    ) -> ActivoHistorial:
        """
        Registra un cambio de estado en el historial.
        Usado internamente por ActivoService.
        """
        historial = ActivoHistorial(
            activo_id=activo_id,
            estado_anterior_id=estado_anterior_id,
            estado_nuevo_id=estado_nuevo_id,
            motivo=motivo,
            observaciones=observaciones,
            empleado_activo_id=empleado_activo_id,
            registrado_por=registrado_por
        )
        self.db.add(historial)
        await self.db.flush()  # Para obtener el ID sin hacer commit
        return historial

    async def get_ultimos_cambios(self, limit: int = 10) -> list:
        """Obtiene los últimos cambios de estado (para dashboard)"""
        stmt = select(ActivoHistorial).options(
            selectinload(ActivoHistorial.activo),
            selectinload(ActivoHistorial.estado_anterior),
            selectinload(ActivoHistorial.estado_nuevo)
        ).order_by(ActivoHistorial.fecha_cambio.desc()).limit(limit)
        
        result = await self.db.execute(stmt)
        historiales = result.scalars().all()
        
        return [{
            "id": h.id,
            "activo_id": h.activo_id,
            "activo_nombre": h.activo.producto if h.activo else None,
            "estado_anterior_nombre": h.estado_anterior.nombre if h.estado_anterior else None,
            "estado_nuevo_nombre": h.estado_nuevo.nombre if h.estado_nuevo else None,
            "motivo": h.motivo,
            "fecha_cambio": h.fecha_cambio
        } for h in historiales]
