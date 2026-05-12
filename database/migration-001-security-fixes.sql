-- ============================================================
-- Migration 001: Security fixes
-- ============================================================
-- Fecha: 2026-05-12
-- Descripción:
--   1. Migra datos existentes de certificado_password a certificado_password_encrypted
--   2. Elimina la columna certificado_password (plaintext) de la tabla emisores
-- ============================================================

-- Paso 1: Migrar datos existentes de certificado_password a certificado_password_encrypted
-- Si certificado_password_encrypted está vacío pero certificado_password tiene datos,
-- asumimos que los datos están encriptados (era el comportamiento anterior)
UPDATE emisores
SET certificado_password_encrypted = certificado_password
WHERE (certificado_password_encrypted IS NULL OR certificado_password_encrypted = '')
  AND (certificado_password IS NOT NULL AND certificado_password != '');

-- Paso 2: Eliminar la columna certificado_password
ALTER TABLE emisores DROP COLUMN IF EXISTS certificado_password;
