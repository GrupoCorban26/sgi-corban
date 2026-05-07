"""
LotesService - Gestión de lotes de contactos.
Responsabilidad única: CRUD de lotes y upload de contactos asociados a un lote.
"""
import logging
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, case, update
from fastapi import UploadFile, HTTPException
import io

from app.models.comercial import LoteContactos, ClienteContacto
from app.models.comercial_catalogos import EstadoContacto
from app.models.seguridad import Usuario
from app.models.administrativo import Empleado

logger = logging.getLogger(__name__)


class LotesService:
    """Servicio de gestión de lotes de contactos."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_estado_contacto_id(self, nombre: str) -> int:
        result = await self.db.execute(
            select(EstadoContacto.id).where(EstadoContacto.nombre == nombre)
        )
        estado_id = result.scalar()
        if not estado_id:
            raise HTTPException(500, f"Estado contacto '{nombre}' no encontrado")
        return estado_id

    async def get_lotes(self):
        """Lista todos los lotes con estadísticas de total y disponibles."""
        estado_disponible_id = await self._get_estado_contacto_id('DISPONIBLE')

        stmt = select(
            LoteContactos.id,
            LoteContactos.nombre,
            LoteContactos.is_active,
            LoteContactos.created_by,
            LoteContactos.created_at,
            func.count(ClienteContacto.id).label('total_contactos'),
            func.sum(
                case(
                    (
                        (ClienteContacto.estado_id == estado_disponible_id) &
                        (ClienteContacto.is_active == True),
                        1
                    ),
                    else_=0
                )
            ).label('disponibles'),
            func.concat(Empleado.nombres, ' ', Empleado.apellido_paterno).label('created_by_nombre')
        ).outerjoin(
            ClienteContacto,
            (ClienteContacto.lote_id == LoteContactos.id) &
            (ClienteContacto.is_active == True)
        ).outerjoin(
            Usuario, LoteContactos.created_by == Usuario.id
        ).outerjoin(
            Empleado, Usuario.empleado_id == Empleado.id
        ).group_by(
            LoteContactos.id,
            LoteContactos.nombre,
            LoteContactos.is_active,
            LoteContactos.created_by,
            LoteContactos.created_at,
            Empleado.nombres,
            Empleado.apellido_paterno
        ).order_by(LoteContactos.created_at.desc())

        result = await self.db.execute(stmt)
        rows = result.all()

        return [
            {
                "id": row.id,
                "nombre": row.nombre,
                "is_active": row.is_active,
                "total_contactos": row.total_contactos or 0,
                "disponibles": row.disponibles or 0,
                "created_by_nombre": row.created_by_nombre if row.created_by else None,
                "created_at": row.created_at,
            }
            for row in rows
        ]

    async def create_lote(self, nombre: str, user_id: int):
        """Crea un nuevo lote vacío."""
        # Verificar nombre duplicado
        existing = await self.db.execute(
            select(LoteContactos).where(LoteContactos.nombre == nombre)
        )
        if existing.scalars().first():
            raise HTTPException(400, f"Ya existe un lote con el nombre '{nombre}'")

        nuevo_lote = LoteContactos(
            nombre=nombre,
            is_active=True,
            created_by=user_id
        )
        self.db.add(nuevo_lote)
        await self.db.commit()
        await self.db.refresh(nuevo_lote)

        return {
            "id": nuevo_lote.id,
            "nombre": nuevo_lote.nombre,
            "is_active": nuevo_lote.is_active,
            "total_contactos": 0,
            "disponibles": 0,
            "created_at": nuevo_lote.created_at,
        }

    async def toggle_lote(self, lote_id: int):
        """Activa o desactiva un lote."""
        lote = await self.db.get(LoteContactos, lote_id)
        if not lote:
            raise HTTPException(404, "Lote no encontrado")

        lote.is_active = not lote.is_active
        await self.db.commit()

        estado_texto = "activado" if lote.is_active else "desactivado"
        return {
            "success": True,
            "lote_id": lote.id,
            "is_active": lote.is_active,
            "message": f"Lote '{lote.nombre}' {estado_texto} correctamente."
        }

    async def upload_contactos_a_lote(self, lote_id: int, file: UploadFile):
        """Procesa un Excel de contactos y los asocia al lote indicado."""
        # Verificar que el lote existe
        lote = await self.db.get(LoteContactos, lote_id)
        if not lote:
            raise HTTPException(404, "Lote no encontrado")

        estado_disponible_id = await self._get_estado_contacto_id('DISPONIBLE')

        try:
            contents = await file.read()
            df = pd.read_excel(io.BytesIO(contents))
            df.columns = [c.lower().strip() for c in df.columns]
            df = df.where(pd.notnull(df), None)

            import re
            
            def limpiar_telefono(val):
                if pd.isna(val):
                    return None
                val_str = str(val).strip()
                # Si hay varios teléfonos separados por guión, barra o coma, tomar el primero
                primer_telefono = re.split(r'[-/,\s]+', val_str)[0]
                # Extraer solo los dígitos del primer teléfono
                solo_digitos = re.sub(r'\D', '', primer_telefono)
                return solo_digitos if solo_digitos else None

            # Limpiar y preparar datos
            df['ruc'] = df['ruc'].apply(
                lambda x: str(int(x)).strip() if pd.notna(x) and x != '' else None
            )
            df['telefono'] = df['telefono'].apply(limpiar_telefono)

            # Buscar columna correo/email
            if 'correo' not in df.columns and 'email' in df.columns:
                df['correo'] = df['email']
            elif 'correo' not in df.columns:
                df['correo'] = None

            # Filtrar filas inválidas
            df = df.dropna(subset=['ruc', 'telefono'])
            df = df[df['ruc'] != '']
            df = df[df['telefono'] != '']

            # Eliminar duplicados dentro del mismo Excel (por teléfono)
            df = df.drop_duplicates(subset=['telefono'], keep='first')

            total_registros = len(df)
            if total_registros == 0:
                return {
                    "message": "No se encontraron registros válidos en el archivo.",
                    "inserted": 0,
                    "duplicates": 0,
                    "total_processed": 0,
                    "lote_nombre": lote.nombre
                }

            # Obtener teléfonos existentes activos
            stmt_existing = select(ClienteContacto.telefono).where(
                ClienteContacto.is_active == True
            )
            existing = await self.db.execute(stmt_existing)
            existing_phones = {row for row in existing.scalars().all()}

            # Separar nuevos vs duplicados
            df_new = df[~df['telefono'].isin(existing_phones)]
            duplicates_count = len(df) - len(df_new)

            # Insertar nuevos contactos
            inserted = 0
            for _, row in df_new.iterrows():
                nombre = row.get('nombre') or row.get('contacto')
                if pd.isna(nombre):
                    nombre = None

                razon_social = row.get('razon_social') or row.get('empresa')
                if pd.isna(razon_social):
                    razon_social = None

                if not nombre and razon_social:
                    nombre = razon_social

                correo_val = row.get('correo')
                if pd.isna(correo_val):
                    correo_val = None

                cargo_val = row.get('cargo')
                if pd.isna(cargo_val):
                    cargo_val = None

                contacto = ClienteContacto(
                    ruc=row['ruc'],
                    nombre=nombre,
                    cargo=cargo_val,
                    telefono=row['telefono'],
                    correo=correo_val,
                    origen='EXCEL_UPLOAD',
                    estado_id=estado_disponible_id,
                    lote_id=lote_id,
                    is_active=True,
                )
                self.db.add(contacto)
                inserted += 1

            await self.db.commit()

            return {
                "message": f"Se importaron {inserted} contactos al lote '{lote.nombre}'."
                           + (f" {duplicates_count} duplicados omitidos." if duplicates_count > 0 else ""),
                "inserted": inserted,
                "duplicates": duplicates_count,
                "total_processed": total_registros,
                "lote_nombre": lote.nombre
            }

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error upload_contactos_a_lote: {e}")
            raise HTTPException(status_code=500, detail=f"Error al procesar archivo: {str(e)}")
