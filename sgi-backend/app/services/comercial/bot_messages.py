"""
Mensajes centralizados del chatbot Corby.

Todos los textos que el bot envía al cliente están definidos aquí
como constantes. Esto permite modificar el tono, corregir ortografía
o traducir sin tocar la lógica del servicio.
"""

# ==========================================
# MENÚ PRINCIPAL
# ==========================================

MSG_BIENVENIDA = "Hola, soy Corby🤖, tu asistente virtual del Grupo Corban. ¿En qué puedo ayudarte hoy?🤗"

MSG_MENU_REGRESO = "¿En qué más puedo ayudarte? 😊"

MENU_BUTTONS = [
    {"id": "btn_asesor", "title": "Hablar con un asesor"},
    {"id": "btn_cotizar", "title": "Quiero cotizar"},
    {"id": "btn_carga", "title": "Tengo carga lista"},
]


# ==========================================
# ASIGNACIÓN DE ASESOR
# ==========================================

MSG_ASESOR_ASIGNADO = "¡Perfecto! El asesor *{nombre}* se comunicará contigo. 🚀"

MSG_ASESOR_ASIGNADO_FUERA_HORARIO = (
    "¡Perfecto! El asesor *{nombre}* se comunicará contigo. 🚀\n\n"
    "{horario}"
)

MSG_ASESOR_EXISTENTE = "Tu asesor *{nombre}* te atenderá en unos minutos. 👋"

MSG_ASESOR_EXISTENTE_FUERA_HORARIO = (
    "Tu asesor *{nombre}* continuará con tu atención.\n\n"
    "{horario}"
)


# ==========================================
# COTIZACIÓN
# ==========================================

MSG_COTIZAR_PEDIR_REQ = "Cuéntame, ¿cuáles son tus requerimientos? 😄"

MSG_COTIZAR_CONFIRMAR = "📝 Recibido. ¿Eso es todo o deseas agregar más detalles?"

MSG_COTIZAR_AGREGAR_MAS = "👍 Envíame los detalles adicionales."

MSG_COTIZAR_FALLBACK = "¿Deseas agregar más detalles o eso es todo?"

MSG_COTIZAR_DERIVADO = "¡Perfecto! El asesor *{nombre}* revisará tu cotización y se comunicará contigo. 🚀"

MSG_COTIZAR_DERIVADO_FUERA_HORARIO = (
    "¡Perfecto! El asesor *{nombre}* revisará tu cotización y se comunicará contigo. 🚀\n\n"
    "{horario}"
)

COTIZAR_CONFIRM_BUTTONS = [
    {"id": "btn_cotizar_listo", "title": "✅ Eso es todo"},
    {"id": "btn_cotizar_mas", "title": "📝 Agregar más"},
    {"id": "btn_volver", "title": "⬅️ Volver"},
]


# ==========================================
# CARGA LISTA
# ==========================================

MSG_CARGA_LISTA_ASIGNADO = "¡Entendido! El asesor *{nombre}* coordinará la operación contigo. 🚛"

MSG_CARGA_LISTA_ASIGNADO_FUERA_HORARIO = (
    "¡Entendido! El asesor *{nombre}* coordinará la operación contigo. 🚛\n\n"
    "{horario}"
)


# ==========================================
# CIERRE Y DESPEDIDA
# ==========================================

MSG_DESPEDIDA = "¡Gracias por comunicarte con Grupo Corban! Fue un placer atenderte. ¡Que tengas un excelente día! 🤗"

MSG_CANCELADO = "Operación cancelada. Escribe *menu* cuando quieras volver a empezar. 👋"


# ==========================================
# HORARIO E INFORMACIÓN
# ==========================================

MSG_HORARIO_INFO = "Recuerda que nuestro horario de atención es de Lunes a Viernes de 8am a 6pm y Sábados de 8am a 11am."


# ==========================================
# ERRORES
# ==========================================

MSG_ERROR_OCUPADOS = (
    "En este momento estamos atendiendo a varios clientes. "
    "Tu solicitud ha sido registrada y un asesor se comunicará contigo a la brevedad. 🚛"
)

MSG_ERROR_INESPERADO = "Ocurrió un error inesperado. Escribe *menu* para volver a empezar. 🔄"


# ==========================================
# KEYWORDS PARA DETECCIÓN DE INTENCIÓN
# ==========================================

KEYWORDS_COTIZACION = [
    "cotizar", "cotización", "cotizacion", "precio", "precios",
    "cuánto cuesta", "cuanto cuesta", "tarifa", "tarifas",
    "presupuesto", "costo", "costos",
]

KEYWORDS_CARGA = [
    "carga", "carga lista", "embarque", "contenedor", "contenedores",
    "despacho", "despachar", "envío", "envio", "enviar",
    "importar", "importación", "importacion",
    "exportar", "exportación", "exportacion",
    "flete", "fletes", "operación", "operacion",
]
