
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  console.log("Configurando entorno de prueba con los 3 roles...\n");

  const empresaBase = await prisma.empresa.upsert({
    where: { id_empresa: 1 },
    update: {},
    create: {
      id_empresa: 1,
      nombre: "Empresa Demo SST",
      ruc: "20123456789",
      direccion_principal: "Sede Central",
      actividad_economica: "Servicios Generales",
      codigo_formato: "FOR-SST-01",
      revision_actual: "01",
      estado: true,
    },
  });
  console.log(`Empresa base lista: [${empresaBase.id_empresa}] ${empresaBase.nombre}`);

  const salt = await bcrypt.genSalt(10);

  // 2. Crear / Actualizar Administrador
  const passAdmin = await bcrypt.hash("Admin2026!", salt);
  const admin = await prisma.usuarios.upsert({
    where: { usuario: "admin_doskills" },
    update: { contrasena: passAdmin, rol: "Administrador", id_empresa: 1 },
    create: {
      nombre: "Administrador Demo",
      usuario: "admin_doskills",
      email: "admin@doskills.com",
      contrasena: passAdmin,
      rol: "Administrador",
      id_empresa: 1,
      estado: true,
    },
  });
  console.log(`Usuario ADMIN listo: ${admin.usuario} (Rol: ${admin.rol})`);

  // 3. Crear / Actualizar Auditor
  const passAuditor = await bcrypt.hash("Auditor2026!", salt);
  const auditor = await prisma.usuarios.upsert({
    where: { usuario: "auditor_doskills" },
    update: { contrasena: passAuditor, rol: "Auditor", id_empresa: 1 },
    create: {
      nombre: "Auditor de Seguridad",
      usuario: "auditor_doskills",
      email: "auditor@doskills.com",
      contrasena: passAuditor,
      rol: "Auditor",
      id_empresa: 1,
      estado: true,
    },
  });
  console.log(`Usuario AUDITOR listo: ${auditor.usuario} (Rol: ${auditor.rol})`);

  console.log("\n¡Todos los roles han sido creados correctamente!");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });