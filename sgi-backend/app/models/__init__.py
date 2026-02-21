from .base import Base
from .administrativo import (
    Departamento, Area, Cargo, Empleado,
    Activo, EmpleadoActivo, EstadoActivo, ActivoHistorial,
    LineaCorporativa, LineaHistorial
)
from .logistica import Vehiculo, AsignacionVehiculo
from .seguridad import Usuario, Rol, Permiso, Sesion
from .core import (
    DepartamentoGeo, Provincia, Distrito, Configuracion, Notificacion,
    Incoterm, TipoContenedor, Via, TipoMercaderia, Servicios
)
from .comercial import (
    Cliente, ClienteContacto, CasoLlamada, RegistroImportacion,
    Cita, CitaComercial
)
from .comercial_inbox import Inbox
from .comercial_session import ConversationSession
from .chat_message import ChatMessage
