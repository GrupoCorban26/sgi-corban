"""
Utilidades de horario laboral.
Funciones para determinar si una fecha/hora cae en horario laboral
y calcular diferencias de tiempo considerando solo horas hábiles.

Horario laboral:
- Lunes a Viernes: 8:00am - 6:00pm (10 horas)
- Sábado: 8:00am - 11:00am (3 horas)
- Domingo: No laboral
- Feriados: No laboral
"""
from datetime import datetime, date, time, timedelta

# ==========================================
# FERIADOS PERÚ
# ==========================================

# Feriados fijos (mes, día) - se repiten cada año
FERIADOS_FIJOS = [
    (1, 1),    # Año Nuevo
    (5, 1),    # Día del Trabajo
    (6, 29),   # San Pedro y San Pablo
    (7, 28),   # Fiestas Patrias
    (7, 29),   # Fiestas Patrias
    (8, 6),    # Batalla de Junín
    (8, 30),   # Santa Rosa de Lima
    (10, 8),   # Combate de Angamos
    (11, 1),   # Todos los Santos
    (12, 8),   # Inmaculada Concepción
    (12, 9),   # Batalla de Ayacucho
    (12, 25),  # Navidad
]

# Feriados variables 2026 (Semana Santa - cambian cada año)
FERIADOS_VARIABLES_2026 = [
    date(2026, 4, 9),   # Jueves Santo
    date(2026, 4, 10),  # Viernes Santo
]

# Horarios por día de semana (weekday: 0=Lunes ... 6=Domingo)
HORARIO_LABORAL = {
    0: (time(8, 0), time(18, 0)),  # Lunes
    1: (time(8, 0), time(18, 0)),  # Martes
    2: (time(8, 0), time(18, 0)),  # Miércoles
    3: (time(8, 0), time(18, 0)),  # Jueves
    4: (time(8, 0), time(18, 0)),  # Viernes
    5: (time(8, 0), time(11, 0)),  # Sábado
    # Domingo: no aparece = no laboral
}

DIAS_SEMANA = {
    0: "Lunes", 1: "Martes", 2: "Miércoles",
    3: "Jueves", 4: "Viernes",
}


def es_feriado(fecha: date) -> bool:
    """Verifica si una fecha es feriado peruano."""
    if (fecha.month, fecha.day) in FERIADOS_FIJOS:
        return True
    if fecha in FERIADOS_VARIABLES_2026:
        return True
    return False


def es_dia_habil(fecha: date) -> bool:
    """Verifica si una fecha es día hábil (no fin de semana domingo, no feriado)."""
    if fecha.weekday() == 6:  # Domingo
        return False
    if es_feriado(fecha):
        return False
    return fecha.weekday() in HORARIO_LABORAL


def es_horario_laboral(dt: datetime = None) -> bool:
    """Verifica si un datetime está dentro del horario laboral."""
    if dt is None:
        try:
            from zoneinfo import ZoneInfo
            dt = datetime.now(ZoneInfo('America/Lima'))
        except ImportError:
            dt = datetime.now() - timedelta(hours=5)
    
    horario = HORARIO_LABORAL.get(dt.weekday())
    if not horario:
        return False
    if es_feriado(dt.date()):
        return False
    
    hora_inicio, hora_fin = horario
    return hora_inicio <= dt.time() < hora_fin


def proximos_dias_habiles(desde: date, cantidad: int = 10) -> list:
    """Obtiene los próximos N días hábiles a partir de una fecha."""
    dias = []
    current = desde
    while len(dias) < cantidad:
        current += timedelta(days=1)
        if es_dia_habil(current):
            dias.append(current)
    return dias


def calcular_segundos_horario_laboral(inicio: datetime, fin: datetime) -> int:
    """
    Calcula la cantidad de segundos transcurridos dentro del horario laboral
    entre dos datetimes.
    
    Ejemplo: si un lead se deriva el viernes a las 5pm y el comercial responde
    el lunes a las 9am, el resultado será:
    - Viernes 5pm-6pm = 3600 seg
    - Lunes 8am-9am = 3600 seg
    - Total = 7200 seg (2 horas)
    
    En lugar de ~232,000 seg (64+ horas de diferencia bruta).
    """
    if fin <= inicio:
        return 0
    
    # Normalizar a naive datetimes
    if inicio.tzinfo:
        inicio = inicio.replace(tzinfo=None)
    if fin.tzinfo:
        fin = fin.replace(tzinfo=None)
    
    total_segundos = 0
    dia_actual = inicio.date()
    dia_fin = fin.date()
    
    while dia_actual <= dia_fin:
        # Verificar si el día es laboral
        horario = HORARIO_LABORAL.get(dia_actual.weekday())
        if horario and not es_feriado(dia_actual):
            hora_inicio_laboral, hora_fin_laboral = horario
            
            # Determinar el inicio efectivo del conteo para este día
            if dia_actual == inicio.date():
                # Primer día: empezar desde la hora del inicio (o la hora laboral, lo que sea mayor)
                inicio_efectivo = max(inicio.time(), hora_inicio_laboral)
            else:
                inicio_efectivo = hora_inicio_laboral
            
            # Determinar el fin efectivo del conteo para este día
            if dia_actual == fin.date():
                # Último día: terminar en la hora del fin (o la hora laboral, lo que sea menor)
                fin_efectivo = min(fin.time(), hora_fin_laboral)
            else:
                fin_efectivo = hora_fin_laboral
            
            # Solo contar si el rango es válido
            if inicio_efectivo < fin_efectivo:
                dt_inicio = datetime.combine(dia_actual, inicio_efectivo)
                dt_fin = datetime.combine(dia_actual, fin_efectivo)
                total_segundos += int((dt_fin - dt_inicio).total_seconds())
        
        dia_actual += timedelta(days=1)
    
    return total_segundos
