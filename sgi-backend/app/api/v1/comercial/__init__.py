# Cfrom . import gestiones
from . import citas
from . import chat
from . import whatsapp
from . import reportes

api_router = APIRouter()

api_router.include_router(inbox.router)
api_router.include_router(importaciones.router)
api_router.include_router(base.router)
api_router.include_router(contactos.router)
api_router.include_router(casos_llamada.router)
api_router.include_router(clientes.router)
api_router.include_router(gestiones.router)
api_router.include_router(citas.router)
api_router.include_router(chat.router)
api_router.include_router(whatsapp.router)
api_router.include_router(reportes.router)
