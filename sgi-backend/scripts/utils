import os
import re

filepath = "app/services/comercial/clientes_service.py"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Make sure traceback is imported
if "import traceback" not in content:
    content = content.replace("import logging", "import logging\nimport traceback")

# Find all except Exception as e: blocks and add traceback.print_exc()
# Be careful to preserve indentation
import re
new_content = ""
lines = content.split('\n')
for i, line in enumerate(lines):
    new_content += line + '\n'
    if re.match(r'^(\s*)except\s+Exception\s+as\s+e:', line):
        indent = re.match(r'^(\s*)except\s+Exception\s+as\s+e:', line).group(1)
        # Add traceback.print_exc() right after the except statement
        new_content += indent + '    traceback.print_exc()\n'

# remove trailing newline
new_content = new_content.rstrip()

with open(filepath, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Exceptions logging added successfully.")
