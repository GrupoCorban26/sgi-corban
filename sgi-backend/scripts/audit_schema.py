"""
Script de Auditoría: Modelos Python vs Base de Datos SQL Server.

Compara la estructura definida en los modelos SQLAlchemy contra
las tablas reales en la base de datos y genera un reporte de diferencias.

Uso:
    python scripts/audit_schema.py
"""

import os
import sys
import pyodbc
from dotenv import load_dotenv
from collections import defaultdict

# Agregar el directorio raíz al path para importar modelos
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

# ============================================
# 1. LEER MODELOS DE SQLALCHEMY
# ============================================

def get_sqlalchemy_models():
    """Lee todos los modelos registrados en SQLAlchemy Base."""
    from app.models.base import Base
    # Importar TODOS los modelos para que se registren en Base.metadata
    import app.models  # noqa: F401

    models = {}
    for table in Base.metadata.tables.values():
        schema = table.schema or "dbo"
        table_name = table.name
        key = f"{schema}.{table_name}"

        columns = {}
        for col in table.columns:
            columns[col.name] = {
                "type": str(col.type),
                "nullable": col.nullable,
                "primary_key": col.primary_key,
                "has_fk": bool(col.foreign_keys),
                "fk_target": str(list(col.foreign_keys)[0].target_fullname) if col.foreign_keys else None,
            }

        models[key] = {
            "schema": schema,
            "table": table_name,
            "columns": columns,
        }

    return models


# ============================================
# 2. LEER ESQUEMA REAL DE SQL SERVER
# ============================================

def get_database_schema():
    """Lee la estructura real de las tablas en SQL Server."""
    server = os.getenv("DB_SERVER")
    database = os.getenv("DB_NAME")
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASS")
    driver = os.getenv("DB_DRIVER", "ODBC Driver 18 for SQL Server")

    conn_str = (
        f"DRIVER={{{driver}}};"
        f"SERVER={server};"
        f"DATABASE={database};"
        f"UID={user};"
        f"PWD={password};"
        f"TrustServerCertificate=yes;"
        f"Encrypt=yes;"
    )

    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()

    # Obtener todas las columnas
    cursor.execute("""
        SELECT 
            TABLE_SCHEMA,
            TABLE_NAME,
            COLUMN_NAME,
            DATA_TYPE,
            CHARACTER_MAXIMUM_LENGTH,
            IS_NULLABLE,
            COLUMNPROPERTY(OBJECT_ID(TABLE_SCHEMA + '.' + TABLE_NAME), COLUMN_NAME, 'IsIdentity') AS is_identity
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')
        ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
    """)

    db_schema = {}
    for row in cursor.fetchall():
        schema, table, col_name, data_type, max_len, is_nullable, is_identity = row
        key = f"{schema}.{table}"

        if key not in db_schema:
            db_schema[key] = {
                "schema": schema,
                "table": table,
                "columns": {},
            }

        db_schema[key]["columns"][col_name] = {
            "type": data_type,
            "max_length": max_len,
            "nullable": is_nullable == "YES",
            "is_identity": bool(is_identity),
        }

    # Obtener foreign keys existentes
    cursor.execute("""
        SELECT 
            OBJECT_SCHEMA_NAME(fk.parent_object_id) AS schema_name,
            OBJECT_NAME(fk.parent_object_id) AS table_name,
            COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS column_name,
            OBJECT_SCHEMA_NAME(fk.referenced_object_id) + '.' + 
            OBJECT_NAME(fk.referenced_object_id) + '.' + 
            COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS referenced
        FROM sys.foreign_keys fk
        JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
    """)

    for row in cursor.fetchall():
        schema_name, table_name, col_name, referenced = row
        key = f"{schema_name}.{table_name}"
        if key in db_schema and col_name in db_schema[key]["columns"]:
            db_schema[key]["columns"][col_name]["has_fk"] = True
            db_schema[key]["columns"][col_name]["fk_target"] = referenced

    conn.close()
    return db_schema


# ============================================
# 3. COMPARAR Y GENERAR REPORTE
# ============================================

def compare_schemas(models, db_schema):
    """Compara modelos Python vs BD y retorna diferencias."""

    report = []
    summary = {"tables_ok": 0, "tables_with_issues": 0, "missing_in_db": 0,
               "extra_in_db": 0, "missing_cols": 0, "extra_cols": 0, "fk_missing": 0}

    # Ordenar por schema
    all_keys = sorted(set(list(models.keys()) + list(db_schema.keys())))

    for key in all_keys:
        in_model = key in models
        in_db = key in db_schema
        issues = []

        # Tabla existe en Python pero NO en BD
        if in_model and not in_db:
            issues.append(f"  🔴 TABLA FALTA EN BD — Existe en Python pero no en SQL Server")
            summary["missing_in_db"] += 1

        # Tabla existe en BD pero NO en Python
        elif in_db and not in_model:
            cols = ", ".join(db_schema[key]["columns"].keys())
            issues.append(f"  🟡 TABLA EXTRA EN BD — Existe en SQL Server pero no en los modelos Python")
            issues.append(f"     Columnas: {cols}")
            summary["extra_in_db"] += 1

        # Tabla existe en ambos → comparar columnas
        else:
            model_cols = models[key]["columns"]
            db_cols = db_schema[key]["columns"]

            # Columnas que faltan en BD
            for col_name in sorted(model_cols.keys()):
                if col_name not in db_cols:
                    col_info = model_cols[col_name]
                    fk_info = f" → FK: {col_info['fk_target']}" if col_info['has_fk'] else ""
                    issues.append(f"  ❌ FALTA en BD:  '{col_name}' ({col_info['type']}{fk_info})")
                    summary["missing_cols"] += 1

            # Columnas que sobran en BD (no están en Python)
            for col_name in sorted(db_cols.keys()):
                if col_name not in model_cols:
                    col_info = db_cols[col_name]
                    issues.append(f"  ⚠️  SOBRA en BD:  '{col_name}' ({col_info['type']})")
                    summary["extra_cols"] += 1

            # Foreign keys que faltan en BD
            for col_name in sorted(model_cols.keys()):
                if col_name in db_cols:
                    model_has_fk = model_cols[col_name]["has_fk"]
                    db_has_fk = db_cols[col_name].get("has_fk", False)
                    if model_has_fk and not db_has_fk:
                        target = model_cols[col_name]["fk_target"]
                        issues.append(f"  🔗 FK FALTA en BD: '{col_name}' debería apuntar a {target}")
                        summary["fk_missing"] += 1

        if issues:
            report.append(f"\n📋 {key}")
            report.extend(issues)
            summary["tables_with_issues"] += 1
        else:
            if in_model and in_db:
                summary["tables_ok"] += 1

    return report, summary


# ============================================
# 4. EJECUTAR
# ============================================

def main():
    print("=" * 65)
    print("  AUDITORÍA DE ESQUEMA: Modelos Python vs SQL Server")
    print("=" * 65)
    print()

    print("📖 Leyendo modelos de SQLAlchemy...")
    models = get_sqlalchemy_models()
    print(f"   Encontrados: {len(models)} tablas en los modelos Python")
    print()

    print("🗄️  Leyendo esquema de SQL Server...")
    db_schema = get_database_schema()
    print(f"   Encontradas: {len(db_schema)} tablas en la base de datos")
    print()

    print("🔍 Comparando...")
    report, summary = compare_schemas(models, db_schema)

    if report:
        print()
        print("=" * 65)
        print("  DIFERENCIAS ENCONTRADAS")
        print("=" * 65)
        for line in report:
            print(line)

    print()
    print("=" * 65)
    print("  RESUMEN")
    print("=" * 65)
    print(f"  ✅ Tablas OK (sin diferencias):        {summary['tables_ok']}")
    print(f"  ⚠️  Tablas con diferencias:              {summary['tables_with_issues']}")
    print(f"  🔴 Tablas faltan en BD:                 {summary['missing_in_db']}")
    print(f"  🟡 Tablas extra en BD (sin modelo):     {summary['extra_in_db']}")
    print(f"  ❌ Columnas faltan en BD:               {summary['missing_cols']}")
    print(f"  ⚠️  Columnas sobran en BD:               {summary['extra_cols']}")
    print(f"  🔗 Foreign Keys faltan en BD:           {summary['fk_missing']}")
    print("=" * 65)


if __name__ == "__main__":
    main()
