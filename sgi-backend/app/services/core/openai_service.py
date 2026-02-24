import os
import logging
from openai import AsyncOpenAI
from typing import Literal

logger = logging.getLogger(__name__)

# Intentos posibles que el bot puede entender
Intencion = Literal["SALUDO", "AGENDAR", "ASESOR", "INFO", "DESCONOCIDO"]

class OpenAIService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        # Initialize client only if API key exists
        self.client = AsyncOpenAI(api_key=self.api_key) if self.api_key else None

    async def clasificar_intencion(self, texto: str) -> Intencion:
        """
        Envía el texto del usuario a GPT-4o-mini para clasificar la intención.
        Retorna la etiqueta correspondiente.
        """
        if not self.client:
            logger.warning("OPENAI_API_KEY no configurada. Retornando DESCONOCIDO.")
            return "DESCONOCIDO"

        if not texto or len(texto.strip()) < 2:
            return "DESCONOCIDO"

        try:
            prompt = (
                "Eres el clasificador de intenciones del bot de WhatsApp de 'Grupo Corban', "
                "una agencia de Cargas y Aduanas (logística internacional). "
                "Lee el siguiente mensaje del cliente y clasifícalo en UNA sola de estas categorías exactas:\n"
                "- SALUDO: Si el cliente solo está saludando o diciendo hola (ej: 'hola', 'buenos días', 'hola corban').\n"
                "- AGENDAR: Si el cliente explícitamente pide agendar una cita o reunión.\n"
                "- ASESOR: Si el cliente tiene dudas sobre importación, exportación, necesita una cotización, o tiene un problema logístico complejo.\n"
                "- INFO: Si el cliente pregunta dónde quedan ubicados, horarios, o qué hacen.\n"
                "- DESCONOCIDO: Cualquier otra cosa, insultos, o mensajes incomprensibles.\n\n"
                "SOLO debes responder con la categoría (una sola palabra). No des explicaciones."
            )

            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": texto}
                ],
                max_tokens=10,
                temperature=0.0
            )
            
            resultado = response.choices[0].message.content.strip().upper()
            
            # Validar que el resultado sea uno de los esperados
            if resultado in ["SALUDO", "AGENDAR", "ASESOR", "INFO", "DESCONOCIDO"]:
                return resultado
            
            logger.warning(f"OpenAI retornó una categoría inválida: {resultado}")
            return "DESCONOCIDO"
            
        except Exception as e:
            logger.error(f"Error llamando a OpenAI para clasificar: {e}", exc_info=True)
            return "DESCONOCIDO"
