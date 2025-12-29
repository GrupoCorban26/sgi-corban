import json
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import Optional

def listar_empleados(
    db: Session, 
    page: int = 1, 
    page_size: int = 20, 
    busqueda: Optional[str] = None, 
    activo: Optional[bool] = None, 
    area_id: Optional[int] = None
):
    try:
        query = text("""
            EXEC rrhh.sp_listar_empleados 
                @page = :page, 
                @page_size = :page_size, 
                @busqueda = :busqueda, 
                @activo = :activo, 
                @area_id = :area_id
        """)
        
        params = {
            "page": page,
            "page_size": page_size,
            "busqueda": busqueda,
            "activo": activo,
            "area_id": area_id
        }
        
        result = db.execute(query, params).fetchone()
        
        # El SP devuelve un solo objeto JSON con: total, page, page_size, total_pages, data[]
        if result and result[0]:
            return json.loads(result[0])
        
        return {"total": 0, "page": page, "page_size": page_size, "total_pages": 0, "data": []}
    except Exception as e:
        print(f"Error en listar_empleados: {e}")
        return None

def obtener_empleado_por_id(db: Session, empleado_id: int):
    try:
        query = text("EXEC rrhh.sp_obtener_empleado @id = :id")
        result = db.execute(query, {"id": empleado_id}).fetchone()
        
        if result and result[0]:
            return json.loads(result[0])
        return None
    except Exception as e:
        # Si el RAISERROR de SQL salta, se captura aquí
        print(f"Error en obtener_empleado_por_id: {e}")
        return None

def crear_empleado(db: Session, datos: dict, current_user_id: int):
    try:
        query = text("""
            EXEC rrhh.sp_crear_empleado 
                @codigo_empleado = :codigo_empleado,
                @nombres = :nombres,
                @apellido_paterno = :apellido_paterno,
                @apellido_materno = :apellido_materno,
                @fecha_nacimiento = :fecha_nacimiento,
                @tipo_documento = :tipo_documento,
                @nro_documento = :nro_documento,
                @celular = :celular,
                @email_personal = :email_personal,
                @direccion = :direccion,
                @distrito = :distrito,
                @provincia = :provincia,
                @fecha_ingreso = :fecha_ingreso,
                @cargo_id = :cargo_id,
                @area_id = :area_id,
                @jefe_id = :jefe_id,
                @created_by = :created_by
        """)
        
        # Añadimos quien crea el registro
        datos["created_by"] = current_user_id
        
        result = db.execute(query, datos).fetchone()
        db.commit() # Importante para INSERT
        
        if result and result[0]:
            return json.loads(result[0])
        return None
    except Exception as e:
        db.rollback()
        print(f"Error en crear_empleado: {e}")
        raise e

def actualizar_empleado(db: Session, empleado_id: int, datos: dict, current_user_id: int):
    try:
        # Aseguramos que el ID esté en los parámetros
        datos["id"] = empleado_id
        datos["updated_by"] = current_user_id
        
        # Construimos el EXEC dinámicamente según lo que venga en el dict (opcionales)
        # O simplemente mapeamos todos los campos del SP
        query = text("""
            EXEC rrhh.sp_actualizar_empleado 
                @id = :id,
                @nombres = :nombres,
                @apellido_paterno = :apellido_paterno,
                @apellido_materno = :apellido_materno,
                @fecha_nacimiento = :fecha_nacimiento,
                @tipo_documento = :tipo_documento,
                @nro_documento = :nro_documento,
                @celular = :celular,
                @email_personal = :email_personal,
                @direccion = :direccion,
                @distrito = :distrito,
                @provincia = :provincia,
                @fecha_cese = :fecha_cese,
                @activo = :activo,
                @cargo_id = :cargo_id,
                @area_id = :area_id,
                @jefe_id = :jefe_id,
                @updated_by = :updated_by
        """)
        
        result = db.execute(query, datos).fetchone()
        db.commit()
        
        if result and result[0]:
            return json.loads(result[0])
        return None
    except Exception as e:
        db.rollback()
        print(f"Error en actualizar_empleado: {e}")
        raise e

def desactivar_empleado(db: Session, empleado_id: int, current_user_id: int):
    try:
        query = text("EXEC rrhh.sp_desactivar_empleado @id = :id, @updated_by = :updated_by")
        result = db.execute(query, {"id": empleado_id, "updated_by": current_user_id}).fetchone()
        db.commit()
        
        if result and result[0]:
            return json.loads(result[0])
        return None
    except Exception as e:
        db.rollback()
        print(f"Error en desactivar_empleado: {e}")
        raise e