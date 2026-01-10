-- =====================================================
-- 01 - CREACIÓN DE BASE DE DATOS Y SCHEMAS
-- SGI - Sistema de Gestión Integral | Grupo Corban
-- SQL Server 2025
-- =====================================================
-- Ejecutar primero este script
-- =====================================================

USE master;
GO

-- =====================================================
-- 1. CREACIÓN DE LA BASE DE DATOS
-- =====================================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'SGI_GrupoCorban')
BEGIN
    CREATE DATABASE SGI_GrupoCorban;
    PRINT '✓ Base de datos SGI_GrupoCorban creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠ La base de datos SGI_GrupoCorban ya existe';
END
GO

USE SGI_GrupoCorban;
GO

-- =====================================================
-- 2. CREACIÓN DE SCHEMAS
-- =====================================================

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'seg')
BEGIN
    EXEC('CREATE SCHEMA seg');
    PRINT '✓ Schema seg creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'adm')
BEGIN
    EXEC('CREATE SCHEMA adm');
    PRINT '✓ Schema adm creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'core')
BEGIN
    EXEC('CREATE SCHEMA core');
    PRINT '✓ Schema core creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'comercial')
BEGIN
    EXEC('CREATE SCHEMA comercial');
    PRINT '✓ Schema comercial creado';
END
GO

-- =====================================================
-- 3. CREACIÓN DE USUARIO PARA BACKEND
-- =====================================================
-- Usuario: UsuarioGeneral (conexión del backend)

-- Opción A: Si usas SQL Server Authentication
IF NOT EXISTS (SELECT name FROM sys.server_principals WHERE name = 'UsuarioGeneral')
BEGIN
    CREATE LOGIN UsuarioGeneral WITH PASSWORD = 'Arguedasxd10$$';
    PRINT '✓ Login UsuarioGeneral creado';
END
ELSE
    PRINT '⚠ Login UsuarioGeneral ya existe';
GO

IF NOT EXISTS (SELECT name FROM sys.database_principals WHERE name = 'UsuarioGeneral')
BEGIN
    CREATE USER UsuarioGeneral FOR LOGIN UsuarioGeneral;
    ALTER ROLE db_owner ADD MEMBER UsuarioGeneral;
    PRINT '✓ Usuario UsuarioGeneral creado con rol db_owner';
END
ELSE
    PRINT '⚠ Usuario UsuarioGeneral ya existe';
GO

PRINT '';
PRINT '=====================================================';
PRINT '✓ BASE DE DATOS, SCHEMAS Y USUARIO CREADOS';
PRINT '=====================================================';
GO
