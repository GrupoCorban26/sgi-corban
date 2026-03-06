import os
import re

filepath = "app/services/comercial/clientes_service.py"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Fix the bug with indentation in 4 occurrences:
buggy_v1 = """            if cliente.updated_at:
                updated_naive = cliente.updated_at.replace(tzinfo=None)
            tiempo_en_estado = int((datetime.now() - updated_naive).total_seconds() / 60)"""

correct_v1 = """            if cliente.updated_at:
                updated_naive = cliente.updated_at.replace(tzinfo=None)
                tiempo_en_estado = int((datetime.now() - updated_naive).total_seconds() / 60)"""

content = content.replace(buggy_v1, correct_v1)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("Bug fixed.")
