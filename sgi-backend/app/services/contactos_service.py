import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from fastapi import UploadFile, HTTPException
import io

class ContactosService:
    @staticmethod
    async def process_excel_contactos(db: AsyncSession, file: UploadFile):
        try:
            contents = await file.read()
            df = pd.read_excel(io.BytesIO(contents))
            df.columns = [c.lower() for c in df.columns]
            df = df.where(pd.notnull(df), None)
            records = df.to_dict(orient='records')
            
            inserted_count = 0
            
            # Loop for 28k rows might be slow async one by one. 
            # But acceptable for prototype.
            for row in records:
                ruc = str(row.get('ruc', '')).strip()
                telefono = str(row.get('telefono', '')).strip()
                email = row.get('email', row.get('correo', None))
                cargo = row.get('cargo', None)
                origen = row.get('origen', 'EXCEL_UPLOAD')
                is_client = bool(row.get('is_client', 0))
                
                if not ruc or not telefono:
                    continue 

                await db.execute(text("""
                    EXEC comercial.usp_crear_contacto 
                    @Ruc=:ruc, @Cargo=:cargo, @Telefono=:telefono, @Email=:email, @Origen=:origen, @IsClient=:is_client
                """), {
                    "ruc": ruc, 
                    "cargo": cargo, 
                    "telefono": telefono, 
                    "email": email, 
                    "origen": origen,
                    "is_client": is_client
                })
                inserted_count += 1
            
            await db.commit()
            return {"message": f"Processed file. Inserted/Checked {inserted_count} contacts."}

        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

    @staticmethod
    async def get_contactos_by_ruc(db: AsyncSession, ruc: str):
        result = await db.execute(text("EXEC comercial.usp_listar_contactos_por_ruc :ruc"), {"ruc": ruc})
        return result.mappings().all()

    @staticmethod
    async def create_contacto(db: AsyncSession, data: dict):
        await db.execute(text("""
            EXEC comercial.usp_crear_contacto 
            @Ruc=:ruc, @Cargo=:cargo, @Telefono=:telefono, @Email=:email, @Origen=:origen, @IsClient=:is_client
        """), data)
        await db.commit()
        return True

    @staticmethod
    async def update_contacto(db: AsyncSession, id: int, data: dict):
        params = {
            "Id": id,
            "Cargo": data.get("cargo"),
            "Telefono": data.get("telefono"),
            "Email": data.get("email"),
            "IsClient": data.get("is_client")
        }
        await db.execute(text("""
            EXEC comercial.usp_actualizar_contacto 
            @Id=:Id, @Cargo=:Cargo, @Telefono=:Telefono, @Email=:Email, @IsClient=:IsClient
        """), params)
        await db.commit()
        return True

    @staticmethod
    async def delete_contacto(db: AsyncSession, id: int):
        await db.execute(text("EXEC comercial.usp_eliminar_contacto @Id=:id"), {"id": id})
        await db.commit()
        return True

    @staticmethod
    async def assign_leads_batch(db: AsyncSession, user_id: int):
        result = await db.execute(text("EXEC comercial.usp_asignar_lote_leads @UsuarioId=:uid, @Cantidad=50"), {"uid": user_id})
        rows = result.mappings().all()
        await db.commit()
        return rows
