import asyncio
import json
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from copy import deepcopy

class BotMessage(BaseModel):
    type: str
    content: str
    
class WhatsAppResponse(BaseModel):
    action: str
    messages: list[BotMessage]

class MockData(BaseModel):
    model_config = ConfigDict(extra='ignore')
    from_number: str
    message_text: str = ""
    button_id: str|None = None
    contact_name: str = "Test User"
    lat: float|None = None
    lon: float|None = None

class MockSession:
    def __init__(self, telefono, estado, datos=None):
        self.telefono = telefono
        self.estado = estado
        self.datos = json.dumps(datos) if datos else None
        self.updated_at = datetime.now()
        self.expires_at = datetime.now()

class MockResult:
    def __init__(self, val=None):
        self.val = val
    def scalars(self):
        class S:
            def first(s): return self.val
            def all(s): return []
        return S()

class MockDB:
    async def execute(self, *args, **kwargs): return MockResult(None)
    async def commit(self): pass

async def simulate():
    import sys
    import os
    sys.path.append(os.path.abspath('.'))
    from app.services.comercial.chatbot_service import ChatbotService
    
    # Custom Mock ChatbotService to avoid DB queries
    class TestBot(ChatbotService):
        def __init__(self):
            self.db = MockDB()
            self._is_working_hours = lambda: True
            
        async def _cleanup_expired_sessions(self): pass
        
        async def _get_active_session(self, phone):
            pass # Overridden below
            
        async def _delete_session(self, session): pass
        async def _create_session(self, *args): return MockSession(args[0], args[1])

    print("\n" + "="*50)
    print("SIMULADOR DE FLUJOS DEL CHATBOT SGI".center(50))
    print("="*50 + "\n")
    
    bot = TestBot()

    async def run_case(name, estado_actual, mensaje, boton=None):
        print(f"🔹 CASO: {name}")
        print(f"💬 ESTADO PREVIO: {estado_actual or 'Sin sesión'}")
        print(f"👤 CLIENTE DICE: '{mensaje}' {f'[BOTÓN: {boton}]' if boton else ''}")
        
        # Setup session mock
        session = MockSession("51999999999", estado_actual) if estado_actual else None
        bot._get_active_session = lambda phone: asyncio.sleep(0) or session
        
        try:
            data = MockData(from_number="51999999999", message_text=mensaje, button_id=boton)
            res = await bot.process_message(data)
            
            print(f"🤖 ACCIÓN BOT: {res.action}")
            for m in res.messages:
                print(f"🤖 MENSAJE BOT:\n{m.content}\n")
        except Exception as e:
            import traceback
            print(f"❌ ERROR: {e}")
            traceback.print_exc()
        print("-" * 50)

    # ==== PRUEBAS ======
    
    await run_case(
        "1. Flujo Nuevo lead (sin sesión)", 
        estado_actual=None, 
        mensaje="Hola buenas tardes"
    )

    await run_case(
        "2. Cliente dice 'Muchas gracias!' (Post Atención)", 
        estado_actual="POST_ATENCION_CONFIRMAR", 
        mensaje="Muchas gracias!"
    )
    
    await run_case(
        "3. Cliente pide nueva consulta (Post Atención)", 
        estado_actual="POST_ATENCION_CONFIRMAR", 
        mensaje="Oye olvidé preguntar algo, necesito cotizar otra cosa"
    )
    
    await run_case(
        "4. Cliente hace clic en 'Finalizar' (Post Atención)", 
        estado_actual="POST_ATENCION_CONFIRMAR", 
        mensaje="",
        boton="btn_finalizar"
    )

    await run_case(
        "5. Cliente hace clic en 'Nueva consulta' (Post Atención)", 
        estado_actual="POST_ATENCION_CONFIRMAR", 
        mensaje="",
        boton="btn_otra_consulta"
    )
    
    await run_case(
        "6. Bot de legado (Silencio) recibe 'ok'", 
        estado_actual="SILENCIO_POST_ATENCION", 
        mensaje="ok gracias!"
    )

    await run_case(
        "7. Bot de legado (Silencio) recibe texto largo", 
        estado_actual="SILENCIO_POST_ATENCION", 
        mensaje="Hola, ha pasado un rato, quisiera ver los precios actuales."
    )

if __name__ == '__main__':
    asyncio.run(simulate())
