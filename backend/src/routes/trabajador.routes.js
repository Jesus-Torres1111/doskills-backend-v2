// backend/src/routes/trabajador.routes.js
console.log("🟢 ---> CARGANDO RUTAS NUEVAS DE TRABAJADOR <--- 🟢");
const { Router } = require("express");
const router = Router();
const controller = require("../controllers/trabajador.controller");

// 🟢 CORRECCIÓN: Usamos llaves para importar la función correcta
const { verificarToken } = require("../middlewares/auth.middleware");

// Configuración de Multer (Memoria RAM para Cloudinary/Buffer)
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

// --- RUTAS ESTÁTICAS (Van primero) ---
router.get("/listado", verificarToken, controller.getTrabajadoresSelect);

// Ruta para carga masiva de firmas
router.post(
  "/upload-masivo",
  verificarToken,
  upload.array("firmas"),
  controller.cargaMasivaFirmas,
);

// Ruta para importar Excel
router.post(
  "/importar-excel",
  verificarToken,
  upload.single("excel"),
  controller.importarExcelInteligente,
);

// 🟢 NUEVO: Vaciar todos los trabajadores (Por empresa)
router.delete("/vaciar", verificarToken, controller.vaciarTrabajadores);

// 🟢 NUEVO: Eliminar varios trabajadores seleccionados
router.post(
  "/eliminar-varios",
  verificarToken,
  controller.eliminarVariosTrabajadores,
);

// --- RUTAS GENERALES ---
router.get("/", verificarToken, controller.obtenerTrabajadores);

// Ruta para CREAR trabajador
router.post(
  "/",
  verificarToken,
  upload.single("firma"),
  controller.guardarTrabajador,
);

// --- RUTAS DINÁMICAS (Van al final) ---
router.get("/:dni", verificarToken, controller.buscarPorDNI);

router.put(
  "/:id",
  verificarToken,
  upload.single("firma"),
  controller.actualizarTrabajador,
);

router.put("/:id/eliminar-firma", verificarToken, controller.eliminarFirma);
router.delete("/:id", verificarToken, controller.eliminarTrabajador);

module.exports = router;
