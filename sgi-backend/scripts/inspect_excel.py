import pandas as pd
import sys

file_path = r"C:\Users\egobu\Downloads\reporte_cnn_data (5).xlsx"
try:
    df = pd.read_excel(file_path)
    print("--- COLUMNAS ---")
    for col in df.columns:
        print(col)
    
    print("\n--- PRIMERAS 2 FILAS DE MUESTRA ---")
    # Imprimir primeras filas como dict para que sea legible
    print(df.head(2).to_dict('records'))
except Exception as e:
    print(f"Error reading excel: {e}")
