"""
ContactosExcelService - Procesamiento de archivos Excel para contactos.
Responsabilidad única: importación masiva de contactos desde Excel.
"""
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text
from fastapi import UploadFile, HTTPException
import io
from app.models.comercial import ClienteContacto


class ContactosExcelService:
    """Servicio para procesamiento de Excel de contactos."""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def process_excel_contactos(self, file: UploadFile):
        """
        Procesa Excel de contactos con BULK INSERT y UPDATE.
        - Nuevos registros: INSERT
        - Registros existentes: UPDATE (solo asignación y estado si aplica)
        """
        try:
            contents = await file.read()
            df = pd.read_excel(io.BytesIO(contents))
            df.columns = [c.lower().strip() for c in df.columns]
            df = df.where(pd.notnull(df), None)
            
            # Limpiar y preparar datos
            df['ruc'] = df['ruc'].apply(lambda x: str(int(x)).strip() if pd.notna(x) and x != '' else None)
            df['telefono'] = df['telefono'].apply(lambda x: str(x).strip() if pd.notna(x) else None)
            df['correo'] = df.get('correo', df.get('email', pd.Series([None]*len(df))))
            
            # Filtrar filas inválidas
            df = df.dropna(subset=['ruc', 'telefono'])
            df = df[df['ruc'] != '']
            df = df[df['telefono'] != '']
            
            # Eliminar duplicados dentro del mismo Excel (por teléfono)
            df = df.drop_duplicates(subset=['telefono'], keep='first')
            
            total_registros = len(df)
            if total_registros == 0:
                return {"message": "No se encontraron registros válidos.", "inserted": 0, "updated": 0}
            
            # Obtener teléfonos existentes
            stmt_existing = select(ClienteContacto.telefono).where(ClienteContacto.is_active == True)
            existing = await self.db.execute(stmt_existing)
            existing_phones = {row for row in existing.scalars().all()}
            
            # Separar nuevos y existentes
            df_new = df[~df['telefono'].isin(existing_phones)]
            df_existing = df[df['telefono'].isin(existing_phones)]
            
            inserted = await self._insert_new_contacts(df_new)
            updated = await self._update_existing_contacts(df_existing)

            await self.db.commit()
            
            return {
                "message": f"Importación completada. {inserted} nuevos, {updated} actualizados.",
                "inserted": inserted,
                "updated": updated,
                "total_processed": total_registros
            }

        except Exception as e:
            await self.db.rollback()
            raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

    async def _insert_new_contacts(self, df_new) -> int:
        """Inserta nuevos contactos desde DataFrame."""
        if df_new.empty:
            return 0
            
        inserted = 0
        batch_size = 500
        to_insert = []
        
        for _, row in df_new.iterrows():
            nombre = row.get('nombre') or row.get('contacto') or row.get('razon_social') or row.get('empresa')
            if pd.isna(nombre): nombre = None
            
            # Logica Asignación
            asignado_a = row.get('asignado_a')
            if pd.isna(asignado_a): asignado_a = None
            else: 
                try: asignado_a = int(float(asignado_a))
                except: asignado_a = None

            fecha_asignacion = row.get('fecha_asignacion')
            if pd.isna(fecha_asignacion): fecha_asignacion = None

            estado = 'ASIGNADO' if asignado_a else 'DISPONIBLE'
            
            to_insert.append({
                "ruc": row['ruc'],
                "telefono": row['telefono'],
                "nombre": nombre,
                "correo": row.get('correo') if pd.notna(row.get('correo')) else None,
                "origen": 'EXCEL_UPLOAD',
                "is_client": False,
                "is_active": True,
                "estado": estado,
                "asignado_a": asignado_a,
                "fecha_asignacion": fecha_asignacion
            })
            
            if len(to_insert) >= batch_size:
                await self._execute_batch_insert(to_insert)
                inserted += len(to_insert)
                to_insert = []
        
        if to_insert:
            await self._execute_batch_insert(to_insert)
            inserted += len(to_insert)
            
        return inserted

    async def _execute_batch_insert(self, batch: list):
        """Ejecuta inserción por lotes."""
        await self.db.execute(
            text("""INSERT INTO comercial.cliente_contactos 
                    (ruc, telefono, nombre, correo, origen, is_client, is_active, estado, asignado_a, fecha_asignacion, created_at) 
                    VALUES (:ruc, :telefono, :nombre, :correo, :origen, :is_client, :is_active, :estado, :asignado_a, :fecha_asignacion, GETDATE())"""), 
            batch
        )

    async def _update_existing_contacts(self, df_existing) -> int:
        """Actualiza contactos existentes desde DataFrame."""
        if df_existing.empty:
            return 0
            
        updated = 0
        batch_size = 500
        to_update = []
        
        for _, row in df_existing.iterrows():
            asignado_a = row.get('asignado_a')
            if pd.isna(asignado_a): continue
            
            try: asignado_a = int(float(asignado_a))
            except: continue

            fecha_asignacion = row.get('fecha_asignacion')
            if pd.isna(fecha_asignacion): fecha_asignacion = None
            
            to_update.append({
                "telefono": row['telefono'],
                "asignado_a": asignado_a,
                "fecha_asignacion": fecha_asignacion,
                "estado": 'ASIGNADO'
            })
            
            if len(to_update) >= batch_size:
                await self._execute_batch_update(to_update)
                updated += len(to_update)
                to_update = []

        if to_update:
            await self._execute_batch_update(to_update)
            updated += len(to_update)
            
        return updated

    async def _execute_batch_update(self, batch: list):
        """Ejecuta actualización por lotes."""
        await self.db.execute(
            text("""UPDATE comercial.cliente_contactos 
                    SET asignado_a = :asignado_a, 
                        fecha_asignacion = :fecha_asignacion, 
                        estado = :estado 
                    WHERE telefono = :telefono"""),
            batch
        )
