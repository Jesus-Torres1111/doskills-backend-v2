// backend/src/routes/gestion.routes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/gestion.controller");

const { verificarToken } = require("../middlewares/auth.middleware");

const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

// Subir plan
router.post(
  "/plan",
  verificarToken,
  upload.single("file"),
  controller.subirPlanAnual,
);

// Eliminar plan anual
router.delete("/plan", verificarToken, controller.vaciarPlanAnual);

// Protegemos el avance
router.get("/avance", verificarToken, controller.obtenerAvance);

// Protegemos la lista de temas
router.get("/temas", verificarToken, controller.obtenerListaTemas);

module.exports = router;
