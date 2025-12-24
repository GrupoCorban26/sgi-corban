# PLANIFICACIÓN DEL PROYECTO
## SGI - Sistema de Gestión Integral | Grupo Corban

Versión: 1.0  
Fecha de Creación: Diciembre 2025
Última Actualización: Diciembre 2025 
Autor: Branco Arguedas
Estado: En Planificación

---

## 📑 ÍNDICE

1. [Definición del Proyecto](#1-definición-del-proyecto)
2. [Alcance del Proyecto](#2-alcance-del-proyecto)
3. [Análisis de Interesados](#3-análisis-de-interesados)
4. [Análisis de Riesgos](#4-análisis-de-riesgos)
5. [Recursos Necesarios](#5-recursos-necesarios)
6. [Cronograma del Proyecto](#6-cronograma-del-proyecto)
7. [Metodología de Desarrollo](#7-metodología-de-desarrollo)
8. [Estrategia de Calidad](#8-estrategia-de-calidad)
9. [Criterios de Éxito](#9-criterios-de-éxito)
10. [Plan de Capacitación](#10-plan-de-capacitación)
11. [Plan de Comunicación](#11-plan-de-comunicación)
12. [Supuestos y Restricciones](#12-supuestos-y-restricciones)

---

## 1. DEFINICIÓN DEL PROYECTO

### 1.1 Nombre del Proyecto
**"SGI - Sistema de Gestión Integral para Grupo Corban"**

### 1.2 Objetivo General
Desarrollar un sistema web integrado que permita digitalizar y centralizar los procesos operativos de Grupo Corban (agencia de cargas y aduanas), comenzando por el área comercial, eliminando la gestión dispersa por WhatsApp y Excel, estableciendo trazabilidad completa y generando métricas para la toma de decisiones.

### 1.3 Objetivos Específicos

1. **Digitalizar el proceso de cotizaciones comerciales**
   - Implementar el flujo integral: Vendedor (Requerimiento) → Pricing (Costos) → Vendedor (Margen/PDF) → Jefa Comercial (Aprobación/Rechazo).
   - Reducir errores de cálculo mediante la automatización de IGV, márgenes de ganancia (Profit) y totales.
   - Eliminar la edición manual de documentos mediante la generación automática de PDFs estandarizados.
   - Registrar todas las cotizaciones en una base de datos única

2. **Centralizar la información maestra**
   - Consolidar datos de empleados
   - Migrar base de clientes histórica a sistema único
   - Establecer áreas y jerarquías organizacionales

3. **Implementar trazabilidad y métricas**
   - Medir tiempos de respuesta de la solicitud de cotización
   - Cuantificar cotizaciones generadas mensualmente (dato actualmente desconocido)
   - Generar métricas de conversión y desempeño comercial

4. **Establecer controles de acceso**
   - Sistema de roles: Administrador, Jefa Comercial, Vendedor, Consulta
   - Permisos granulares por módulo
   - Seguridad en acceso a información sensible

5. **Preparar escalabilidad**
   - Arquitectura modular que permita agregar Operaciones, Facturación, etc.
   - Diseño de base de datos extensible

### 1.4 Justificación del Proyecto

#### Problemática Actual:
- **Gestión dispersa:** Aprobaciones por WhatsApp sin registro formal
- **Falta de métricas:** No se conoce cuántas cotizaciones se generan mensualmente
- **Datos fragmentados:** Empleados y clientes en Excel sin consolidar
- **Imposibilidad de medir:** Tiempos de respuesta, tasas de conversión, desempeño
- **Riesgo de pérdida de información:** Dependencia de mensajes y archivos locales

#### Impacto Esperado:
- **Eficiencia operativa:** Reducción de tiempos de aprobación
- **Visibilidad:** Métricas en tiempo real del área comercial
- **Profesionalización:** Imagen más formal ante clientes
- **Escalabilidad:** Base para digitalizar otras áreas
- **Toma de decisiones:** Datos concretos para estrategias comerciales

---

## 2. ALCANCE DEL PROYECTO

### 2.1 Versión 1.0 - MVP (Producto Mínimo Viable)

#### ✅ DENTRO DEL ALCANCE

**Módulo 1: Gestión de Empleados y Áreas**
- Registro de empleados (migración desde Excel actual)
- CRUD completo de empleados
- Gestión de áreas organizacionales
- Asignación de jefaturas (estructura jerárquica)
- Búsqueda y filtrado de empleados
- Activación/desactivación de empleados
- Exportación de listados a Excel

**Módulo 2: Autenticación y Seguridad**
- Sistema de login con usuario y contraseña
- Gestión de usuarios vinculados a empleados
- Sistema de roles:
  - Administrador (acceso total)
  - Jefa Comercial (aprobaciones, dashboards)
  - Vendedor (crear/editar cotizaciones)
  - Consulta (solo lectura)
- Sistema de permisos por módulo y acción
- Cambio de contraseña obligatorio en primer login
- Recuperación de contraseña
- Sesiones con JWT (tokens de 30 minutos)

**Módulo 3: Gestión Comercial - Cotizaciones**
- CRUD completo de cotizaciones
- Campos configurables:
  - Cliente
  - Tipo de servicio (importación aérea, marítima, exportación, courier, etc.)
  - Origen y destino
  - Detalles de la carga (peso, volumen, tipo de mercancía)
  - Conceptos de costo (flete, gastos aduaneros, almacenaje, etc.)
  - Monedas (USD, PEN)
  - Tiempo de validez
  - Observaciones
- **Flujo de aprobación:**
  - Estados: Borrador → Pendiente Aprobación → Aprobada/Rechazada → Cerrada/caida
  - Vendedor recibe requerimiento del cliente
  - Vendedor 
- Versionamiento de cotizaciones (historial de cambios)
- Búsqueda y filtros avanzados
- Exportación de cotización a PDF (para enviar a cliente)
- Historial de cotizaciones por cliente y fecha

**Módulo 4: Dashboard Comercial**
- Métricas principales:
  - Cotizaciones del mes (totales)
  - Cotizaciones pendientes de aprobación
  - Cotizaciones aprobadas/rechazadas
  - Tasa de conversión (cerradas/totales)
  - Tiempo promedio de aprobación
  - Tiempo promedio de cotización
  - Cotizaciones por vendedor
- Gráficos de tendencias
- Filtros por período, vendedor, estado

**Características Generales del Sistema**
- Interfaz responsive (escritorio y tablet)
- Exportación de listados a Excel
- Sistema de notificaciones in-app (campana de notificaciones)
- Búsqueda global
- Auditoría básica (registro de acciones críticas: login, aprobaciones, cambios importantes)

#### ❌ FUERA DEL ALCANCE (Versión 1.0)

**Funcionalidades Aplazadas:**
- Base de datos de clientes con CRUD completo (solo se usará para vincular a cotizaciones, migración de Excel histórico)
- Gestión de prospectos y pipeline (v1.1)
- Alertas in-app avanzadas (solo notificaciones básicas en v1.0)
- Auditoría completa de todas las acciones (solo acciones críticas)

**Módulos Futuros (v2.0+):**
- Módulo de Operaciones (tracking de servicios en curso)
- Módulo de Facturación y Cuentas por Cobrar
- Módulo de RRHH completo (planillas, asistencias, vacaciones)
- Módulo de Gestión Documental (repositorio de documentos)
- Integraciones externas:
  - SUNAT (facturación electrónica)
  - Bancos (conciliación)
  - APIs de navieras
- Aplicación móvil nativa
- Notificaciones por email y SMS
- Reportes avanzados con Business Intelligence
- Portal de clientes (consulta de servicios)
- Multi-sede (por ahora solo Centro Aéreo Comercial)

### 2.2 Criterios de Aceptación del MVP

El MVP será aceptado cuando:
1. ✅ **100% de cotizaciones** se gestionen en el sistema (0% por WhatsApp)
2. ✅ **Jefa Comercial pueda aprobar/rechazar** cotizaciones desde el sistema
3. ✅ **Dashboard muestre métricas** en tiempo real
4. ✅ **Todos los empleados estén registrados** y puedan hacer login
5. ✅ **Sistema sea estable** (sin bugs críticos que impidan operación)
6. ✅ **Tiempo de carga < 3 segundos** en cualquier pantalla
7. ✅ **Datos de clientes históricos migrados** correctamente

---

## 3. ANÁLISIS DE INTERESADOS (STAKEHOLDERS)

| Stakeholder | Rol | Interés en el Proyecto | Nivel de Influencia | Estrategia de Gestión |
|-------------|-----|------------------------|---------------------|----------------------|
| **Gerencia General** | Sponsor/Decisor | Alto - Aprobación de presupuesto para servidor | **MUY ALTA** | Presentar avances cada 2-3 semanas, enfatizar ROI y beneficios |
| **Aranza Rincón** | Usuario Clave | Alto - Usuario principal (aprobaciones) | **ALTA** | Involucrar desde diseño, validaciones continuas, capacitación prioritaria |
| **Karina (Asistente Pricing)** | Usuario Apoyo | Alto - Validación de cálculos y tarifas | **MEDIA-ALTA** | Involucrar en validación de módulo de cotizaciones |
| **Vendedores (6-12)** | Usuarios Finales | Alto - Usarán diariamente para cotizaciones | **MEDIA** | Informar cuando proyecto esté maduro, capacitación grupal, recoger feedback |
| **Desarrollador (Tú)** | Implementador | Alto - Responsable total del desarrollo | **ALTA** | Auto-gestión, documentación continua, aprendizaje constante |
| **Área de Operaciones** | Usuario Futuro | Medio - Usarán en fase 2 | **BAJA** (por ahora) | Mantener informados, preparar terreno para v2.0 |
| **Área de Facturación** | Usuario Futuro | Medio - Usarán en fase 3 | **BAJA** (por ahora) | Comunicación informativa |

### Mapa de Poder-Interés

```
Alta Influencia
    │
    │  [Gerencia]        [Aranza - Jefa Com.]
    │      ↑                    ↑
    │      │                    │
    │   Mantener                Gestionar
    │   Satisfecho              Activamente
    │
────┼────────────────────────────────────────
    │
    │  [Operaciones]      [Vendedores]
    │  [Facturación]      [Karina]
    │      ↓                    ↓
    │   Monitorear          Mantener
    │                       Informado
    │
Baja Influencia
```

---

## 4. ANÁLISIS DE RIESGOS

### 4.1 Matriz de Riesgos

| ID | Riesgo | Probabilidad | Impacto | Nivel | Plan de Mitigación | Plan de Contingencia |
|----|--------|--------------|---------|-------|-------------------|---------------------|
| **R01** | **Falta de tiempo del desarrollador** (otras responsabilidades: generación de base de datos comercial) | **ALTA** | **ALTO** | 🔴 **CRÍTICO** | • Priorizar sprints estrictamente<br>• Automatizar tareas repetitivas<br>• Bloques de tiempo dedicados solo a desarrollo | • Comunicar retrasos tempranamente<br>• Re-priorizar features<br>• Aplazar funcionalidades no críticas |
| **R02** | **Desconocimiento técnico** (FastAPI, Next.js, SQL Server avanzado) | **MEDIA** | **MEDIO** | 🟡 **ALTO** | • Formación continua (tutoriales, documentación)<br>• Desarrollo de POCs antes de features complejas<br>• Consulta a comunidades (Stack Overflow, GitHub) | • Simplificar implementación si es muy compleja<br>• Buscar alternativas tecnológicas más sencillas |
| **R03** | **Mal manejo del sistema por área comercial** (resistencia al cambio, uso incorrecto) | **MEDIA** | **MEDIO** | 🟡 **ALTO** | • Involucrar a Aranza desde el diseño<br>• UX/UI intuitivo<br>• Capacitación gradual y personalizada<br>• Tooltips y ayudas en el sistema | • Soporte intensivo primeras 2 semanas<br>• Crear videos tutoriales<br>• Habilitar modo "asistido" temporal |
| **R04** | **Requisitos incompletos o cambiantes** | **ALTA** | **MEDIO** | 🟡 **ALTO** | • Desarrollo iterativo con validaciones frecuentes<br>• Prototipos antes de implementar<br>• Documentar bien los requisitos | • Metodología ágil permite ajustes<br>• Control de cambios formal post-MVP |
| **R05** | **Pérdida de datos durante migración** (Excel → SQL Server) | **BAJA** | **CRÍTICO** | 🟡 **ALTO** | • Backups de Excel originales<br>• Scripts de migración probados en ambiente de prueba<br>• Validación cruzada post-migración | • Mantener Excel como respaldo temporal<br>• Operación en paralelo primeras semanas |
| **R06** | **Falta de presupuesto para servidor hosting** | **BAJA** | **ALTO** | 🟡 **MEDIO** | • Desarrollar primero en localhost (ya contemplado)<br>• Justificar costo con métricas de ahorro/eficiencia<br>• Evaluar opciones económicas (VPS) | • Iniciar con hosting compartido económico<br>• Escalar cuando sea aprobado presupuesto mayor |
| **R07** | **Servidor local (localhost) no suficiente para pruebas multi-usuario** | **MEDIA** | **MEDIO** | 🟡 **MEDIO** | • Configurar red LAN para acceso local<br>• Simular carga con herramientas (Locust, JMeter) | • Adelantar compra de servidor staging si es necesario |
| **R08** | **Fallo del único desarrollador** (enfermedad, renuncia) | **BAJA** | **CRÍTICO** | 🟡 **MEDIO** | • Documentación exhaustiva<br>• Código limpio y comentado<br>• Repositorio Git actualizado diariamente | • Documentación permite que otro dev pueda continuar<br>• Gerencia debe considerar contingencia |
| **R09** | **Contratación continua de vendedores** (6-12 actual, creciendo) | **ALTA** | **BAJO** | 🟢 **BAJO** | • Sistema diseñado para escalar usuarios<br>• Proceso de onboarding automatizado | • Ajustar recursos de servidor si crece exponencialmente |
| **R10** | **No se conoce volumen real de cotizaciones** (impide sizing adecuado) | **MEDIA** | **BAJO** | 🟢 **BAJO** | • Diseñar BD con capacidad holgada<br>• Monitoreo de performance desde día 1 | • Optimización reactiva según métricas reales |

### 4.2 Estrategia General de Riesgos

**Prioridades:**
1. 🔴 Gestión del tiempo del desarrollador (crítico)
2. 🟡 Formación técnica continua
3. 🟡 Adopción del sistema por usuarios

**Revisión:** Evaluar riesgos cada 2 semanas (al finalizar cada sprint)

---

## 5. RECURSOS NECESARIOS

### 5.1 Recursos Humanos

| Rol | Persona | Dedicación | Responsabilidad |
|-----|---------|------------|-----------------|
| **Desarrollador Full Stack** | Tú | **20 horas/semana** | Desarrollo backend, frontend, BD, despliegue |
| **Product Owner / Validador** | Aranza Rincón | 2 horas/semana | Validación de requisitos, pruebas UAT |
| **Usuario de Pruebas** | Karina (Asistente Pricing) | 1 hora/semana | Validación de cálculos y funcionalidades |
| **Sponsor** | Gerencia | 30 min/quincenal | Aprobaciones y seguimiento |

### 5.2 Recursos Tecnológicos

#### Software (Desarrollo)
| Herramienta | Costo | Estado |
|-------------|-------|--------|
| Python 3.13.2 | Gratis | ✅ Disponible |
| FastAPI | Gratis (Open Source) | ✅ Disponible |
| Next.js | Gratis (Open Source) | ✅ Disponible |
| SQL Server 2025 | Licencia empresarial | ✅ Ya tienen |
| Visual Studio Code | Gratis | ✅ Disponible |
| Git + GitLab | Gratis (plan privado) | ⏳ A configurar |
| Postman | Gratis | ✅ Disponible |
| Figma / Draw.io | Gratis | ✅ Disponible |

#### Hardware / Infraestructura
| Recurso | Especificación | Costo Estimado | Estado |
|---------|----------------|----------------|--------|
| **Servidor de Desarrollo** | Localhost (tu PC) | $0 | ✅ Disponible |
| **Servidor de Producción** | VPS/Cloud (a definir) | $20-50/mes | ⏳ Pendiente aprobación |
| **Dominio** | grupocorban.com (ejemplo) | $15/año | ⏳ A evaluar |
| **Certificado SSL** | Let's Encrypt | Gratis | ⏳ Al desplegar |

**Opciones de Servidor de Producción:**
1. **VPS Económico:** DigitalOcean Droplet ($24/mes) - 2GB RAM, 50GB SSD
2. **Servidor Local Dedicado:** Dell PowerEdge (compra única ~$800) - mayor control
3. **Cloud:** Azure/AWS (escalable pero más caro, ~$50-100/mes inicial)

### 5.3 Recursos Financieros

#### Presupuesto Estimado (Primer Año)

| Concepto | Costo Mensual | Costo Anual | Notas |
|----------|---------------|-------------|-------|
| Servidor Hosting | $30 | $360 | VPS intermedio |
| Dominio | - | $15 | Pago único anual |
| SSL | - | $0 | Let's Encrypt gratis |
| GitLab (privado) | $0 | $0 | Plan gratuito suficiente |
| **TOTAL** | **$30** | **$375** | **Presupuesto a aprobar** |

**Nota:** SQL Server 2025 ya lo tienen licenciado. Python, FastAPI, Next.js son gratuitos.

---

## 6. CRONOGRAMA DEL PROYECTO

### 6.1 Contexto de Tiempo

- **Dedicación:** 20 horas/semana
- **Metodología:** Sprints de 2 semanas (40 horas de desarrollo efectivo por sprint)
- **Duración estimada:** **24 semanas (6 meses)** para MVP completo
- **Fecha objetivo:** Flexible, sin deadline estricta

### 6.2 Fases del Proyecto

```
┌─────────────────────────────────────────────────────────────────┐
│                    FASE 1: PLANIFICACIÓN                        │
│                    Duración: 2 semanas                          │
│  • Levantamiento de requisitos                                 │
│  • Diseño de base de datos                                     │
│  • Diseño de arquitectura                                      │
│  • Mockups/wireframes                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  FASE 2: SETUP Y FUNDACIÓN                      │
│                    Duración: 2 semanas                          │
│  • Configuración de repositorio Git                            │
│  • Setup backend (FastAPI + SQL Server)                        │
│  • Setup frontend (Next.js)                                    │
│  • Estructura de proyecto                                      │
│  • Base de datos inicial                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              FASE 3: MÓDULO EMPLEADOS Y ÁREAS                   │
│                    Duración: 3 semanas                          │
│  Sprint 1 (2 sem): CRUD Empleados + Áreas                      │
│  Sprint 2 (1 sem): Migración de datos desde Excel              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│           FASE 4: AUTENTICACIÓN Y SEGURIDAD                     │
│                    Duración: 3 semanas                          │
│  Sprint 3 (2 sem): Login, JWT, Roles y Permisos                │
│  Sprint 4 (1 sem): Recuperación contraseña + Auditoría básica  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│            FASE 5: MÓDULO COMERCIAL - COTIZACIONES              │
│                    Duración: 6 semanas                          │
│  Sprint 5 (2 sem): Migración clientes + CRUD Cotizaciones      │
│  Sprint 6 (2 sem): Flujo de aprobación + Estados               │
│  Sprint 7 (1 sem): Versionamiento + Notificaciones             │
│  Sprint 8 (1 sem): Exportación PDF + Búsquedas avanzadas       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              FASE 6: DASHBOARD Y REPORTES                       │
│                    Duración: 2 semanas                          │
│  Sprint 9: Dashboard comercial + Gráficos                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│            FASE 7: PRUEBAS Y AJUSTES                            │
│                    Duración: 4 semanas                          │
│  Sprint 10 (2 sem): Pruebas integrales + Corrección bugs       │
│  Sprint 11 (1 sem): UAT con Aranza y Karina                    │
│  Sprint 12 (1 sem): Ajustes finales + Optimización             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│          FASE 8: DESPLIEGUE Y CAPACITACIÓN                      │
│                    Duración: 2 semanas                          │
│  • Despliegue en servidor de producción                        │
│  • Capacitación a Jefa Comercial y Asistente                   │
│  • Capacitación a Vendedores                                   │
│  • Operación asistida primeras 2 semanas                       │
│  • GO LIVE 🚀                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Cronograma Detallado (Gantt Simplificado)

| Fase | Semanas | Sem 1-2 | Sem 3-4 | Sem 5-7 | Sem 8-10 | Sem 11-16 | Sem 17-18 | Sem 19-22 | Sem 23-24 |
|------|---------|---------|---------|---------|----------|-----------|-----------|-----------|-----------|
| **Planificación** | 2 | ████████ | | | | | | | |
| **Setup** | 2 | | ████████ | | | | | | |
| **Empleados** | 3 | | | ████████ | | | | | |
| **Autenticación** | 3 | | | | ████████ | | | | |
| **Cotizaciones** | 6 | | | | | ██████████████ | | | |
| **Dashboard** | 2 | | | | | | ████████ | | |
| **Pruebas** | 4 | | | | | | | ████████ | |
| **Despliegue** | 2 | | | | | | | | ████████ |

**Total: 24 semanas (6 meses)**

### 6.4 Hitos Clave (Milestones)

| Hito | Semana | Fecha Estimada | Entregable | Validación |
|------|--------|----------------|------------|------------|
| **M1: Documentación Completa** | 2 | Semana 2 | Requisitos, BD, Arquitectura | Revisión con Aranza |
| **M2: Entorno Configurado** | 4 | Semana 4 | Proyecto levantado localmente | Auto-validación |
| **M3: Empleados Operativo** | 7 | Semana 7 | Módulo completo + datos migrados | Demo a Gerencia |
| **M4: Login Funcional** | 10 | Semana 10 | Sistema de autenticación | Demo a Aranza |
| **M5: Cotizaciones Beta** | 16 | Semana 16 | CRUD + Flujo completo | UAT con Aranza y Karina |
| **M6: Dashboard Completo** | 18 | Semana 18 | Métricas visibles | Demo a Gerencia |
| **M7: Sistema Estable** | 22 | Semana 22 | Sin bugs críticos | UAT final |
| **M8: GO LIVE** | 24 | Semana 24 | **Producción** 🚀 | Operación real |

### 6.5 Cronograma de Riesgo (Buffer)

- **Buffer integrado:** 2 semanas adicionales no planificadas (total 26 semanas / 6.5 meses)
- **Razón:** Posibles retrasos por aprendizaje técnico o responsabilidades adicionales
- **Fecha realista de GO LIVE:** 7 meses desde inicio

---

## 7. METODOLOGÍA DE DESARROLLO

### 7.1 Framework: Scrum Adaptado (Desarrollador Individual)

Dado que eres el único desarrollador, se adaptará Scrum para maximizar productividad:

#### Estructura de Sprints
- **Duración:** 2 semanas (40 horas de desarrollo)
- **Objetivo:** Entregable funcional al final de cada sprint
- **Ceremonias simplificadas:**

| Ceremonia | Frecuencia | Duración | Descripción |
|-----------|------------|----------|-------------|
| **Sprint Planning** | Inicio de sprint | 1 hora | Definir qué features desarrollar en las próximas 2 semanas |
| **Daily Standup** | Diario (mental/escrito) | 5 min | ¿Qué hice ayer? ¿Qué haré hoy? ¿Tengo bloqueadores? |
| **Sprint Review** | Fin de sprint | 1 hora | Demo a Aranza/Gerencia de lo desarrollado |
| **Sprint Retrospective** | Fin de sprint | 30 min | ¿Qué funcionó? ¿Qué mejorar? Lecciones aprendidas |

#### Product Backlog (Priorizado)

```
Prioridad 1 (Must Have - MVP):
  ☐ Gestión de empleados
  ☐ Autenticación y roles
  ☐ CRUD de cotizaciones
  ☐ Flujo de aprobación
  ☐ Dashboard básico

Prioridad 2 (Should Have - MVP):
  ☐ Notificaciones in-app
  ☐ Exportación PDF
  ☐ Auditoría de acciones críticas
  ☐ Versionamiento de cotizaciones

Prioridad 3 (Nice to Have - v1.1):
  ☐ Gestión completa de clientes
  ☐ Pipeline de prospectos
  ☐ Notificaciones por email
  ☐ Reportes avanzados
```

### 7.2 Definition of Done (DoD)

Una funcionalidad está "Done" cuando cumple:

✅ **Código:**
- Desarrollado y funcional
- Comentado en partes clave
- Sigue convenciones de estilo (PEP 8 para Python, ESLint para TypeScript)
- Sin errores de linting

✅ **Testing:**
- Probado manualmente (happy path + edge cases)
- Pruebas unitarias escritas (cuando sea crítico)
- Sin bugs conocidos que impidan su