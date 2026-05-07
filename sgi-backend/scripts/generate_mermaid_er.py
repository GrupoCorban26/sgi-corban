import sys
import os

# Agregamos la ruta del backend al path para poder importar la app
current_dir = os.path.dirname(os.path.abspath(__file__))
# sgi-backend path (asumiendo que corre en sgi-backend/scripts)
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from sqlalchemy.orm import class_mapper
from sqlalchemy.orm.properties import RelationshipProperty, ColumnProperty

def generate_mermaid_er():
    # Import settings to load env vars effectively if needed, though they shouldn't block model parsing.
    os.environ['DB_SERVER'] = 'localhost\\SQLEXPRESS'
    os.environ['DB_NAME'] = 'test'
    os.environ['DB_USER'] = 'test'
    os.environ['DB_PASS'] = 'test'
    os.environ['SECRET_KEY'] = 'test'

    # Check imported app.models
    import app.models  # Trigger import from __init__.py which imports all models

    from app.models.base import Base

    print("erDiagram")

    models = [c for c in Base.registry._class_registry.values() if hasattr(c, '__table__')]

    # Draw entities
    for model in models:
        table_name = model.__table__.name
        print(f"    {table_name} {{")
        
        mapper = class_mapper(model)
        for column in mapper.columns:
            # Tipos
            col_type = str(column.type).split('(')[0]
            col_name = column.name
            pk = "PK" if column.primary_key else ""
            fk = "FK" if column.foreign_keys else ""
            key_tag = []
            if pk: key_tag.append("PK")
            if fk: key_tag.append("FK")
            key_str = ",".join(key_tag)

            # Some characters inside mermaid need quotes or we just simplify
            print(f"        {col_type} {col_name} {key_str}")
            
        print("    }")

    # Draw relationships from Foreign Keys to keep it simple and accurate
    # and avoid duplicates.
    emitted_rels = set()

    for model in models:
        table_name = model.__table__.name
        for column in class_mapper(model).columns:
            if column.foreign_keys:
                for fk in column.foreign_keys:
                    target_table = fk.column.table.name
                    # Mermaid syntax: TABLE_A }|--|| TABLE_B : relationship
                    # We'll just draw a generic one to many for simplicity unless we know better
                    rel_id = f"{table_name}-{target_table}"
                    if rel_id not in emitted_rels:
                        print(f"    {target_table} ||--o{{ {table_name} : \"\"")
                        emitted_rels.add(rel_id)

if __name__ == "__main__":
    generate_mermaid_er()
