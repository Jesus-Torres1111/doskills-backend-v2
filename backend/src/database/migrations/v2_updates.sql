-- 1. ACTUALIZACIÓN TABLA EMPRESA (Registro V2 y Autocompletado CIIU)
ALTER TABLE `empresa`
ADD COLUMN `numero_sedes` VARCHAR(20) NULL AFTER `ruc`,
ADD COLUMN `ciiu_seccion` VARCHAR(10) NULL AFTER `numero_sedes`,
ADD COLUMN `ciiu_division` VARCHAR(10) NULL AFTER `ciiu_seccion`,
ADD COLUMN `ciiu_actividad` VARCHAR(10) NULL AFTER `ciiu_division`;

-- 2. NUEVAS TABLAS DE MULTITENANCY (Sedes, Alcances, Periodos)
CREATE TABLE `sede` (
  `id_sede` int NOT NULL AUTO_INCREMENT,
  `id_empresa` int NOT NULL,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `departamento` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provincia` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `distrito` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_sede`),
  KEY `sede_id_empresa_fkey` (`id_empresa`),
  CONSTRAINT `sede_id_empresa_fkey` FOREIGN KEY (`id_empresa`) REFERENCES `empresa` (`id_empresa`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `alcance` (
  `id_alcance` int NOT NULL AUTO_INCREMENT,
  `id_sede` int NOT NULL,
  `tipo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_alcance`),
  KEY `alcance_id_sede_fkey` (`id_sede`),
  CONSTRAINT `alcance_id_sede_fkey` FOREIGN KEY (`id_sede`) REFERENCES `sede` (`id_sede`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `alcance_periodo` (
  `id_periodo` int NOT NULL AUTO_INCREMENT,
  `id_alcance` int NOT NULL,
  `anio` int NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  PRIMARY KEY (`id_periodo`),
  KEY `periodo_id_alcance_fkey` (`id_alcance`),
  CONSTRAINT `periodo_id_alcance_fkey` FOREIGN KEY (`id_alcance`) REFERENCES `alcance` (`id_alcance`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. ACTUALIZACIÓN TABLA USUARIOS (Roles y Restricciones Operativas por Sede/Alcance)
ALTER TABLE `usuarios`
ADD COLUMN `apellidos` VARCHAR(150) COLLATE utf8mb4_unicode_ci NULL AFTER `nombre`,
ADD COLUMN `cargo` VARCHAR(100) COLLATE utf8mb4_unicode_ci NULL AFTER `apellidos`,
ADD COLUMN `area` VARCHAR(100) COLLATE utf8mb4_unicode_ci NULL AFTER `cargo`,
ADD COLUMN `id_sede` INT NULL AFTER `rol`,
ADD COLUMN `id_alcance` INT NULL AFTER `id_sede`,
ADD CONSTRAINT `usuarios_id_sede_fkey` FOREIGN KEY (`id_sede`) REFERENCES `sede` (`id_sede`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `usuarios_id_alcance_fkey` FOREIGN KEY (`id_alcance`) REFERENCES `alcance` (`id_alcance`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. ACTUALIZACIÓN TABLA MAESTRO_TRABAJADORES (Nuevos campos y aislamiento)
ALTER TABLE `maestro_trabajadores`
ADD COLUMN `apellido_paterno` VARCHAR(100) COLLATE utf8mb4_unicode_ci NULL AFTER `nombres`,
ADD COLUMN `apellido_materno` VARCHAR(100) COLLATE utf8mb4_unicode_ci NULL AFTER `apellido_paterno`,
ADD COLUMN `subarea` VARCHAR(100) COLLATE utf8mb4_unicode_ci NULL AFTER `area`,
ADD COLUMN `fecha_nacimiento` DATE NULL AFTER `subarea`,
ADD COLUMN `fecha_ingreso` DATE NULL AFTER `fecha_nacimiento`,
ADD COLUMN `fecha_cese` DATE NULL AFTER `fecha_ingreso`,
ADD COLUMN `grupos` JSON NULL AFTER `fecha_cese`, 
ADD COLUMN `id_sede` INT NULL AFTER `grupos`,
ADD COLUMN `id_alcance` INT NULL AFTER `id_sede`,
ADD COLUMN `anio` INT NULL AFTER `id_alcance`,
ADD CONSTRAINT `trabajador_id_sede_fkey` FOREIGN KEY (`id_sede`) REFERENCES `sede` (`id_sede`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `trabajador_id_alcance_fkey` FOREIGN KEY (`id_alcance`) REFERENCES `alcance` (`id_alcance`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. TABLA OTP (Para el código de verificación de 4 dígitos en el registro)
CREATE TABLE `verificacion_registro` (
  `id_verificacion` int NOT NULL AUTO_INCREMENT,
  `correo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `intentos` int NOT NULL DEFAULT '0',
  `expira_en` datetime NOT NULL,
  `usado` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_verificacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. NUEVO MÓDULO: PLAN DE CAPACITACIONES V2 (Por Sede, Alcance y Año)
CREATE TABLE `plan_tema` (
  `id_tema` int NOT NULL AUTO_INCREMENT,
  `id_alcance` int NOT NULL,
  `anio` int NOT NULL,
  `tema` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `origen` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL, -- 'Interna' o 'Externa'
  `tipo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL, -- 'Inducción', 'Simulacro', etc.
  `estandares` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_tema`),
  KEY `tema_id_alcance_fkey` (`id_alcance`),
  CONSTRAINT `tema_id_alcance_fkey` FOREIGN KEY (`id_alcance`) REFERENCES `alcance` (`id_alcance`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `plan_sesion` (
  `id_sesion` int NOT NULL AUTO_INCREMENT,
  `id_tema` int NOT NULL,
  `fecha_programada` date NOT NULL,
  `responsable` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_sesion`),
  KEY `sesion_id_tema_fkey` (`id_tema`),
  CONSTRAINT `sesion_id_tema_fkey` FOREIGN KEY (`id_tema`) REFERENCES `plan_tema` (`id_tema`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `plan_tema_filtro` (
  `id_filtro` int NOT NULL AUTO_INCREMENT,
  `id_tema` int NOT NULL,
  `tipo_filtro` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL, -- 'Área', 'Cargo', 'Grupo'
  `valor` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_filtro`),
  KEY `filtro_id_tema_fkey` (`id_tema`),
  CONSTRAINT `filtro_id_tema_fkey` FOREIGN KEY (`id_tema`) REFERENCES `plan_tema` (`id_tema`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. ACTUALIZACIÓN TABLA CAPACITACIONES (Borradores, Cronómetro y enlace a Plan)
ALTER TABLE `capacitaciones`
ADD COLUMN `id_sesion` INT NULL AFTER `codigo_acta`,
ADD COLUMN `estado` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'BORRADOR' AFTER `id_sesion`,
ADD COLUMN `tiempo_empleado` INT NOT NULL DEFAULT '0' AFTER `estado`, -- Cronómetro en segundos
ADD COLUMN `origen` VARCHAR(50) COLLATE utf8mb4_unicode_ci NULL AFTER `actividad`,
ADD COLUMN `estandares` VARCHAR(255) COLLATE utf8mb4_unicode_ci NULL AFTER `categoria`,
ADD COLUMN `norma_referencia` TEXT COLLATE utf8mb4_unicode_ci NULL AFTER `estandares`,
ADD CONSTRAINT `capacitacion_id_sesion_fkey` FOREIGN KEY (`id_sesion`) REFERENCES `plan_sesion` (`id_sesion`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 8. TABLA ENLACES PARTICIPANTES (Para el QR temporal de 8 horas)
CREATE TABLE `enlace_participante` (
  `id_enlace` int NOT NULL AUTO_INCREMENT,
  `id_capacitacion` int NOT NULL,
  `token` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expira_en` datetime NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_enlace`),
  UNIQUE KEY `enlace_token_key` (`token`),
  KEY `enlace_id_capacitacion_fkey` (`id_capacitacion`),
  CONSTRAINT `enlace_id_capacitacion_fkey` FOREIGN KEY (`id_capacitacion`) REFERENCES `capacitaciones` (`id_capacitacion`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. TABLA DE OBSERVACIONES DE AUDITORÍA
CREATE TABLE `observacion_auditoria` (
  `id_observacion` int NOT NULL AUTO_INCREMENT,
  `id_capacitacion` int NOT NULL,
  `id_auditor` int NOT NULL,
  `texto_observacion` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_registro` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id_observacion`),
  KEY `observacion_id_capacitacion_fkey` (`id_capacitacion`),
  KEY `observacion_id_auditor_fkey` (`id_auditor`),
  CONSTRAINT `observacion_id_capacitacion_fkey` FOREIGN KEY (`id_capacitacion`) REFERENCES `capacitaciones` (`id_capacitacion`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `observacion_id_auditor_fkey` FOREIGN KEY (`id_auditor`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;