
# DEFINICIÓN OFICIAL DE PERMISOS Y ROLES
# Este archivo sirve como "Source of Truth" para el sistema de seguridad.

PERMISOS_DEFINICION = [
    # --- USUARIOS (Rol SISTEMAS) ---
    ("usuarios.listar", "Listar Usuarios", "Usuarios"),
    ("usuarios.ver", "Ver Detalle Usuario", "Usuarios"),
    ("usuarios.crear", "Crear Usuario", "Usuarios"),
    ("usuarios.editar", "Editar Usuario", "Usuarios"),
    ("usuarios.eliminar", "Desactivar Usuario", "Usuarios"), # Soft Delete
    ("usuarios.reactivar", "Reactivar Usuario", "Usuarios"),
    ("usuarios.asignar_roles", "Asignar Roles", "Usuarios"),
    ("usuarios.cambiar_password", "Cambiar Password (Otros)", "Usuarios"),

    # --- EMPLEADOS (Rol ADMIN) ---
    ("empleados.listar", "Listar Empleados", "Organizativo"),
    ("empleados.ver", "Ver Detalle Empleado", "Organizativo"),
    ("empleados.crear", "Crear Empleado", "Organizativo"),
    ("empleados.editar", "Editar Empleado", "Organizativo"),
    ("empleados.eliminar", "Eliminar Empleado", "Organizativo"),

    # --- COMERCIAL (Roles COMERCIAL, JEFE) ---
    ("clientes.listar", "Listar Clientes (Base)", "Comercial"), # Acceso básico
    ("clientes.ver_todo", "Ver Clientes (Global)", "Comercial"), # Para Jefes
    ("clientes.crear", "Crear Cliente", "Comercial"),
    ("clientes.editar", "Editar Cliente", "Comercial"),
    ("clientes.desactivar", "Desactivar Cliente", "Comercial"),
    
    ("contactos.listar", "Listar Contactos", "Comercial"),
    ("contactos.crear", "Crear Contacto", "Comercial"),
    ("contactos.editar", "Editar Contacto", "Comercial"),

    # --- SISTEMA / IMPORTACIONES (Rol SISTEMAS) ---
    ("importaciones.cargar", "Cargar Bases Excel", "Sistema"),
    
    # --- REPORTES (Roles JEFE, AUDITOR) ---
    ("reportes.ver_comercial", "Ver Reportes Comerciales", "Reportes"),
    ("reportes.ver_general", "Ver Reportes Globales", "Reportes"),
]

ROLES_DEFINICION = {
    "SISTEMAS": [
        "usuarios.listar", "usuarios.ver", "usuarios.crear", "usuarios.editar", "usuarios.eliminar", 
        "usuarios.reactivar", "usuarios.asignar_roles", "usuarios.cambiar_password",
        "empleados.listar", "empleados.ver",
        "importaciones.cargar", "reportes.ver_general"
    ],
    "ADMIN": [ # Organizativo
        "empleados.listar", "empleados.ver", "empleados.crear", "empleados.editar", "empleados.eliminar",
        "usuarios.listar", 
    ],
    "JEFE_COMERCIAL": [
        "clientes.listar", "clientes.ver_todo", "clientes.crear", "clientes.editar", "clientes.desactivar",
        "contactos.listar", "contactos.crear", "contactos.editar",
        "empleados.listar",
        "reportes.ver_comercial"
    ],
    "COMERCIAL": [
        "clientes.listar", "clientes.crear", "clientes.editar", "clientes.desactivar",
        "contactos.listar", "contactos.crear", "contactos.editar",
        "empleados.listar" 
    ],
    "AUDITOR": [
        "reportes.ver_comercial", "reportes.ver_general",
        "usuarios.listar", "empleados.listar", "clientes.listar", "clientes.ver_todo"
    ]
}
