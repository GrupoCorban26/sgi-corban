import asyncio
import logging
from dotenv import load_dotenv

# Cargar variables de entorno antes de importar modulos internos
load_dotenv()

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | WORKER | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("WorkerTareas")

from app.services.scheduler import iniciar_scheduler

async def main():
    logger.info("=====================================================")
    logger.info("   INICIANDO WORKER DE TAREAS EN SEGUNDO PLANO")
    logger.info("=====================================================")
    
    try:
        # Esto correrá todos los loops internamente con asyncio.gather
        await iniciar_scheduler()
    except asyncio.CancelledError:
        logger.info("Worker detenido correctamente.")
    except Exception as e:
        logger.error(f"Error crítico en el worker: {e}", exc_info=True)

if __name__ == "__main__":
    try:
        if hasattr(asyncio, 'WindowsSelectorEventLoopPolicy'):
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
            
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Proceso del Worker interrumpido por el usuario.")
