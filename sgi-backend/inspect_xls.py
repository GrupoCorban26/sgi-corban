import pandas as pd

for fname in [
    r"C:\Users\egobu\Desktop\reporte_507.xls",
    r"C:\Users\egobu\Desktop\1_StandardReport.xls",
    r"C:\Users\egobu\Desktop\reporte_508.xls",
]:
    print("=" * 80)
    print(f"FILE: {fname}")
    try:
        xl = pd.ExcelFile(fname)
        print(f"  Sheets: {xl.sheet_names}")
        
        # Try to find the attendance sheet
        target = None
        for s in xl.sheet_names:
            if "asistencia" in s.lower():
                target = s
                break
        if not target:
            for s in xl.sheet_names:
                if "reporte" in s.lower():
                    target = s
                    break
        if not target:
            target = xl.sheet_names[0]
        
        print(f"  Target sheet: '{target}'")
        df = pd.read_excel(xl, sheet_name=target, header=None)
        print(f"  Shape: {df.shape}")
        
        for i in range(min(20, len(df))):
            cells = []
            for j in range(len(df.columns)):
                v = str(df.iloc[i, j])
                if v != "nan":
                    cells.append(f"c{j}={v[:40]}")
            print(f"  Row {i}: {cells}")
    except Exception as e:
        print(f"  ERROR: {e}")
    print()
