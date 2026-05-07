"""
Listado centralizado de todos los permisos del sistema.
Cualquier permiso nuevo debe agregarse a esta lista para que el sincronizador 
lo registre automáticamente en la base de datos al iniciar el servidor.
"""

PERMISOS_BASE = [
    # Módulo Seguridad y Accesos
    {
        "nombre_tecnico": "seg:usuarios:ver",
        "nombre_display": "Ver Usuarios",
        "modulo": "Seguridad",
        "descripcion": "Permite listar y ver detalles de los usuarios del sistema."
    },
    {
        "nombre_tecnico": "seg:usuarios:crear",
        "nombre_display": "Crear Usuarios",
        "modulo": "Seguridad",
        "descripcion": "Permite registrar nuevos usuarios y asignarles credenciales."
    },
    {
        "nombre_tecnico": "seg:usuarios:editar",
        "nombre_display": "Editar Usuarios",
        "modulo": "Seguridad",
        "descripcion": "Permite modificar información de usuarios y cambiar contraseñas."
    },
    {
        "nombre_tecnico": "seg:roles:ver",
        "nombre_display": "Ver Roles y Permisos",
        "modulo": "Seguridad",
        "descripcion": "Permite visualizar los roles existentes y sus permisos asignados."
    },
    {
        "nombre_tecnico": "seg:roles:gestionar",
        "nombre_display": "Gestionar Roles",
        "modulo": "Seguridad",
        "descripcion": "Permite crear, editar roles y asignarles permisos específicos."
    },
    
    # Módulo Comercial
    {
        "nombre_tecnico": "com:dashboard:ver",
        "nombre_display": "Ver Dashboard Comercial",
        "modulo": "Comercial",
        "descripcion": "Permite acceder a los indicadores y métricas del área comercial."
    },
    {
        "nombre_tecnico": "com:clientes:ver",
        "nombre_display": "Ver Clientes",
        "modulo": "Comercial",
        "descripcion": "Permite buscar y visualizar la cartera de clientes."
    },
    {
        "nombre_tecnico": "com:clientes:crear",
        "nombre_display": "Crear Clientes",
        "modulo": "Comercial",
        "descripcion": "Permite registrar nuevos clientes o prospectos."
    },
    {
        "nombre_tecnico": "com:clientes:editar",
        "nombre_display": "Editar Clientes",
        "modulo": "Comercial",
        "descripcion": "Permite modificar datos de clientes existentes."
    },
    {
        "nombre_tecnico": "com:inbox:gestionar",
        "nombre_display": "Gestionar Buzón WhatsApp",
        "modulo": "Comercial",
        "descripcion": "Permite interactuar con los leads que ingresan por WhatsApp."
    },
    
    # Módulo Administración y RRHH
    {
        "nombre_tecnico": "adm:empleados:ver",
        "nombre_display": "Ver Empleados",
        "modulo": "Administrativo",
        "descripcion": "Permite consultar el listado y fichas de empleados."
    },
    {
        "nombre_tecnico": "adm:empleados:gestionar",
        "nombre_display": "Gestionar Empleados",
        "modulo": "Administrativo",
        "descripcion": "Permite crear, editar y dar de baja empleados."
    },
    
    # Módulo Core (Configuración)
    {
        "nombre_tecnico": "core:configuraciones:gestionar",
        "nombre_display": "Gestionar Configuraciones",
        "modulo": "Core",
        "descripcion": "Permite alterar parámetros globales y catálogos del sistema."
    }
]
