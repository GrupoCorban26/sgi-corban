import json
import pandas as pd

file_path = r"C:\Users\egobu\Downloads\reporte_cnn_data (5).xlsx"
df = pd.read_excel(file_path)

# Fill na with None to be able to output json
df = df.where(pd.notnull(df), None)

print(json.dumps(df.head(2).to_dict('records'), indent=2))
