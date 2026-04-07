@echo off
title Iniciador SGI Backend (Produccion)
echo ====================================================
echo  Iniciando SGI Backend para Produccion (Windows)
echo ====================================================
echo.

:: 1. Activar entorno virtual si existe (asumiendo .venv or venv)
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
    echo [OK] Entorno virtual '.venv' activado.
) else if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    echo [OK] Entorno virtual 'venv' activado.
) else (
    echo [WARN] No se detecto entorno virtual local. Usando Python global.
)

:: 2. Levantar el Worker de Tareas en una nueva ventana oculta/paralela
echo [INFO] Levantando Worker de Tareas en segundo plano...
start "SGI Worker Tareas" cmd /c "python worker_tareas.py"

:: 3. Levantar la API de FastAPI con 4 Workers en esta misma ventana
echo [INFO] Levantando API FastAPI con 4 workers (Uvicorn)...
echo.
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4

pause
