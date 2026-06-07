// backend/src/controllers/trabajador.controller.js

const prisma = require("../utils/db");
const path = require("path");
const XLSX = require("xlsx");
const fs = require("fs");
const {
  uploadFromBuffer,
  uploadFromBase64,
} = require("../utils/uploadToFirebase");

// 1. LISTAR TODOS
const obtenerTrabajadores = async (req, res) => {
  try {
    const rol = req.user?.rol;
    const id_empresa = req.user?.id_empresa;
    const filtro = rol === "SOPORTE" ? {} : { id_empresa };

    const trabajadores = await prisma.trabajadores.findMany({
      where: filtro,
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    });
    res.json(trabajadores);
  } catch (error) {
    console.error("Error al listar:", error);
    res.status(500).json({ error: "Error al listar trabajadores" });
  }
};

const getTrabajadoresSelect = async (req, res) => {
  try {
    const rol = req.user?.rol;
    const id_empresa = req.user?.id_empresa;
    const filtro =
      rol === "SOPORTE" ? { estado: true } : { estado: true, id_empresa };

    const trabajadores = await prisma.trabajadores.findMany({
      where: filtro,
      select: {
        dni: true,
        nombres: true,
        apellidos: true,
        area: true,
        cargo: true,
        genero: true,
        firma_url: true,
        categoria: true,
      },
      orderBy: { apellidos: "asc" },
    });
    res.json(trabajadores);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar trabajadores" });
  }
};

// 2. BUSCAR POR DNI
const buscarPorDNI = async (req, res) => {
  try {
    const { dni } = req.params;
    const trabajador = await prisma.trabajadores.findUnique({
      where: { dni },
    });
    if (!trabajador) return res.status(404).json({ error: "No encontrado" });
    res.json(trabajador);
  } catch (error) {
    res.status(500).json({ error: "Error al buscar" });
  }
};

// 3. GUARDAR (CREAR O ACTUALIZAR)
const guardarTrabajador = async (req, res) => {
  try {
    const {
      dni,
      nombres,
      apellidos,
      area,
      cargo,
      genero,
      firma_url,
      id_empresa,
    } = req.body;
    if (!nombres || !apellidos)
      return res.status(400).json({ error: "Faltan datos." });

    const empresaDestino =
      req.user?.rol === "SOPORTE" && id_empresa
        ? Number(id_empresa)
        : req.user?.id_empresa || 1;
    let urlFinal = firma_url;

    if (firma_url && firma_url.startsWith("data:image")) {
      const upload = await uploadFromBase64(firma_url, "firmas_trabajadores");
      urlFinal = upload.secure_url;
    } else if (req.file) {
      const upload = await uploadFromBuffer(
        req.file.buffer,
        "firmas_trabajadores",
      );
      urlFinal = upload.secure_url;
    }

    const trabajador = await prisma.trabajadores.upsert({
      where: { dni },
      update: {
        nombres,
        apellidos,
        area,
        cargo,
        genero,
        firma_url: urlFinal,
        estado: true, // 🟢 REACTIVA AL TRABAJADOR SI ESTABA INACTIVO
      },
      create: {
        dni,
        nombres,
        apellidos,
        area,
        cargo,
        genero,
        firma_url: urlFinal,
        id_empresa: empresaDestino,
        estado: true,
      },
    });
    res.json(trabajador);
  } catch (error) {
    res.status(500).json({ error: "Error al guardar trabajador" });
  }
};

// 4. ELIMINAR UNO SOLO (AHORA DESACTIVA)
const eliminarTrabajador = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.trabajadores.update({
      where: { id_trabajador: Number(id) },
      data: { estado: false }, // 🟢 BORRADO LÓGICO
    });
    res.json({ message: "Desactivado correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al desactivar." });
  }
};

// 4.1. VACIAR TODOS (AHORA DESACTIVA)
const vaciarTrabajadores = async (req, res) => {
  try {
    const id_empresa = req.user?.id_empresa;
    const resultado = await prisma.trabajadores.updateMany({
      where: { id_empresa, estado: true },
      data: { estado: false }, // 🟢 BORRADO LÓGICO MASIVO
    });
    res.json({
      mensaje: "Todos los trabajadores han sido desactivados.",
      registrosEliminados: resultado.count,
    });
  } catch (error) {
    res.status(500).json({ error: "Error al vaciar trabajadores." });
  }
};

// 4.2. ELIMINAR MÚLTIPLES (AHORA DESACTIVA)
const eliminarVariosTrabajadores = async (req, res) => {
  try {
    const { ids } = req.body;
    const id_empresa = req.user?.id_empresa;
    const resultado = await prisma.trabajadores.updateMany({
      where: { id_trabajador: { in: ids }, id_empresa: id_empresa },
      data: { estado: false }, // 🟢 BORRADO LÓGICO POR LOTE
    });
    res.json({
      mensaje: `${resultado.count} desactivados correctamente.`,
      registrosEliminados: resultado.count,
    });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar seleccionados." });
  }
};

// 5. CARGA MASIVA DE FIRMAS
const cargaMasivaFirmas = async (req, res) => {
  try {
    const archivos = req.files;
    if (!archivos || archivos.length === 0) {
      return res.status(400).json({ error: "No se enviaron archivos." });
    }

    const { id_empresa } = req.body;
    const empresaDestino =
      req.user?.rol === "SOPORTE" && id_empresa
        ? Number(id_empresa)
        : req.user?.id_empresa || 1;
    const folderPath = `empresas/empresa_${empresaDestino}/firmas_trabajadores`;

    let actualizados = 0;
    let errores = 0;

    for (const archivo of archivos) {
      try {
        const nombreOriginal = archivo.originalname;
        const dniExtraido = path.parse(nombreOriginal).name;

        if (/^\d{8}$/.test(dniExtraido)) {
          const result = await uploadFromBuffer(
            archivo.buffer,
            folderPath,
            archivo.originalname,
          );
          const urlPublica = result.secure_url;

          const resultado = await prisma.trabajadores.updateMany({
            where: { dni: dniExtraido, id_empresa: empresaDestino },
            data: { firma_url: urlPublica },
          });

          if (resultado.count > 0) actualizados++;
          else errores++;
        } else {
          errores++;
        }
      } catch (err) {
        console.error(err);
        errores++;
      }
    }

    res.json({
      mensaje: "Proceso masivo finalizado",
      total_procesados: archivos.length,
      actualizados_correctamente: actualizados,
      no_encontrados_o_error: errores,
    });
  } catch (error) {
    console.error("Error masivo:", error);
    res.status(500).json({ error: "Error en la carga masiva" });
  }
};

// 🟢 6. IMPORTAR EXCEL INTELIGENTE (MEJORADO PARA DUPLICADOS Y COLUMNAS UNIDAS)
const importarExcelInteligente = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "Sube un archivo Excel (.xlsx)" });

    const id_empresa_body = req.body.id_empresa;
    const empresaDestino =
      req.user?.rol === "SOPORTE" && id_empresa_body
        ? Number(id_empresa_body)
        : req.user?.id_empresa || 1;

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });

    // --- 🟢 INICIO DE LA LÓGICA DE BÚSQUEDA DE HOJA INTELIGENTE ---
    let rawData = [];
    let headers = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const tempRawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (tempRawData.length < 2) continue;

      // Normalizar cabeceras temporales para analizarlas
      const tempHeaders = tempRawData[0].map((h) =>
        String(h)
          .toLowerCase()
          .trim()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, ""),
      );

      // Verificamos qué tipo de hoja es
      const tieneDNI = tempHeaders.some((h) =>
        ["dni", "documento", "codigogeneral"].some((k) => h.includes(k)),
      );
      const tieneNombres = tempHeaders.some((h) =>
        ["nombre", "apellido", "colaborador"].some((k) => h.includes(k)),
      );
      const esTablaDinamica = tempHeaders.some(
        (h) => h.includes("cuenta") || h.includes("etiquetas"),
      );

      // Si tiene DNI, tiene Nombres y NO es un resumen/tabla dinámica, es la hoja correcta
      if (tieneDNI && tieneNombres && !esTablaDinamica) {
        rawData = tempRawData;
        headers = tempHeaders;
        break;
      }
    }

    if (rawData.length < 2) {
      return res.status(400).json({
        error:
          "No se encontró una hoja válida con datos reales de trabajadores.",
      });
    }
    // --- 🟢 FIN DE LA BÚSQUEDA DE HOJA ---

    const findCol = (keywords) =>
      headers.findIndex((h) => keywords.some((k) => h.includes(k)));

    // DICCIONARIOS DE BÚSQUEDA AMPLIADOS
    const idxDNI = findCol(["dni", "documento", "cedula", "codigogeneral"]);
    const idxArea = findCol([
      "area",
      "unidad",
      "departamento",
      "seccion",
      "subplanilla",
    ]);
    const idxCargo = findCol(["cargo", "puesto", "ocupacion"]);
    const idxGenero = findCol(["genero", "sexo"]);
    const idxCategoria = findCol(["categoria", "grupo", "comite"]);
    
    // Nombres y Apellidos
    const idxNombres = findCol(["nombres", "nombre", "colaborador"]);
    const idxApellidosGeneral = findCol(["apellidos", "apellido"]);
    const idxPaterno = findCol(["paterno"]);
    const idxMaterno = findCol(["materno"]);
    const idxApellidosNombresUnido = findCol([
      "apellidosynombres",
      "nombresyapellidos",
    ]);

    if (idxDNI === -1)
      return res.status(400).json({ error: "No encontré columna DNI" });

    const trabajadoresMap = new Map();

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;

      let dni = row[idxDNI];
      if (dni) dni = String(dni).replace(/\D/g, "").padStart(8, "0");
      if (!dni || dni.length < 8) continue; // Ignoramos DNI inválidos

      let nombres = "SIN NOMBRE";
      let apellidos = "SIN APELLIDO";

      // 🟢 LÓGICA DE EXTRACCIÓN DE NOMBRES/APELLIDOS (Prioridades)
      if (idxApellidosNombresUnido !== -1 && row[idxApellidosNombresUnido]) {
        // CASO A: Vienen juntos en "Apellidos y Nombres" (Ej: "DIAZ VALLADOLID OSCAR SANTIAGO")
        const nombreCompleto = String(row[idxApellidosNombresUnido]).trim();
        const partes = nombreCompleto.split(" ").filter((p) => p.length > 0);

        if (partes.length >= 4) {
          apellidos = `${partes[0]} ${partes[1]}`;
          nombres = partes.slice(2).join(" ");
        } else if (partes.length === 3) {
          apellidos = `${partes[0]} ${partes[1]}`;
          nombres = partes[2];
        } else if (partes.length === 2) {
          apellidos = partes[0];
          nombres = partes[1];
        } else {
          apellidos = partes[0] || "SIN APELLIDO";
          nombres = "SIN NOMBRE";
        }
      } else {
        // CASO B: Vienen separados (Formato tradicional)
        if (idxNombres !== -1)
          nombres = String(row[idxNombres] || "SIN NOMBRE").trim();

        if (idxPaterno !== -1 && idxMaterno !== -1) {
          const p = String(row[idxPaterno] || "").trim();
          const m = String(row[idxMaterno] || "").trim();
          apellidos = `${p} ${m}`.trim();
        } else if (idxApellidosGeneral !== -1) {
          apellidos = String(row[idxApellidosGeneral] || "").trim();
          // Truco por si el Excel exportado de Nisira pone "APELLIDO, NOMBRE" en la columna Nombres
          if (apellidos === "" && idxNombres !== -1) {
            const completo = String(row[idxNombres]).trim();
            if (completo.includes(",")) {
              apellidos = completo.split(",")[0].trim();
              nombres = completo.split(",")[1].trim();
            }
          }
        } else if (idxPaterno !== -1) {
          apellidos = String(row[idxPaterno] || "").trim();
        }
      }

      if (!apellidos) apellidos = "SIN APELLIDO";
      if (!nombres) nombres = "SIN NOMBRE";

      // Extracción de Área, Cargo y Categoría
      const area =
        idxArea !== -1 && row[idxArea]
          ? String(row[idxArea]).trim()
          : "General";
      const cargo =
        idxCargo !== -1 && row[idxCargo]
          ? String(row[idxCargo]).trim()
          : "Trabajador";
      const categoria =
        idxCategoria !== -1 && row[idxCategoria]
          ? String(row[idxCategoria]).trim()
          : null;

      // Extraemos el género SOLO si la celda tiene un valor
      let generoExtraido = null;
      if (idxGenero !== -1 && row[idxGenero]) {
        const gRaw = String(row[idxGenero]).toUpperCase().trim();
        if (gRaw.startsWith("F") || gRaw.includes("MUJER"))
          generoExtraido = "F";
        else generoExtraido = "M"; // Si hay algo escrito que no es mujer, asumimos M
      }

      // 🟢 LÓGICA DE FUSIÓN (MERGE) PARA DUPLICADOS
      if (trabajadoresMap.has(dni)) {
        const dataPrevia = trabajadoresMap.get(dni);

        // 1. Actualizamos los datos laborales con la fila más reciente
        dataPrevia.area = area !== "General" ? area : dataPrevia.area;
        dataPrevia.cargo = cargo !== "Trabajador" ? cargo : dataPrevia.cargo;
        if (categoria) dataPrevia.categoria = categoria;

        // 2. Rescatamos los datos personales previos si la nueva fila los perdió
        if (nombres !== "SIN NOMBRE") dataPrevia.nombres = nombres;
        if (apellidos !== "SIN APELLIDO") dataPrevia.apellidos = apellidos;
        if (generoExtraido) dataPrevia.genero = generoExtraido; // Solo cambia si la nueva fila SÍ trajo género
      } else {
        // Es la primera vez que vemos este DNI, lo guardamos normal
        trabajadoresMap.set(dni, {
          dni,
          nombres,
          apellidos,
          area,
          cargo,
          genero: generoExtraido || "M", // Por defecto M solo en el primer registro si viene vacío
          categoria,
        });
      }
    }

    let procesados = 0;
    let errores = 0;

    // 🟢 Insertamos o actualizamos en BD (Upsert)
    for (const [dni, data] of trabajadoresMap.entries()) {
      try {
        await prisma.trabajadores.upsert({
          where: { dni },
          update: {
            nombres: data.nombres,
            apellidos: data.apellidos,
            area: data.area,
            cargo: data.cargo,
            genero: data.genero,
            categoria: data.categoria,
            estado: true, // Reactiva si el trabajador estaba inactivo
          },
          create: {
            ...data,
            estado: true,
            id_empresa: empresaDestino,
          },
        });
        procesados++;
      } catch (e) {
        console.error(`Error procesando DNI ${dni}:`, e);
        errores++;
      }
    }

    res.json({ mensaje: "Importación finalizada", procesados, errores });
  } catch (error) {
    console.error("Error general en importación:", error);
    res.status(500).json({ error: "Error procesando Excel" });
  }
};

// 7. ELIMINAR FIRMA
const eliminarFirma = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.trabajadores.update({
      where: { id_trabajador: Number(id) },
      data: { firma_url: null },
    });
    res.json({ mensaje: "Firma eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar firma" });
  }
};

// 8. ACTUALIZAR TRABAJADOR
const actualizarTrabajador = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_trabajador, ...datos } = req.body;

    if (req.file) {
      console.log("📤 Actualizando firma en Firebase...");
      const result = await uploadFromBuffer(
        req.file.buffer,
        "firmas_trabajadores",
        req.file.originalname,
      );
      datos.firma_url = result.secure_url;
    }

    const trabajadorActualizado = await prisma.trabajadores.update({
      where: { id_trabajador: parseInt(id) },
      data: datos,
    });

    return res.json(trabajadorActualizado);
  } catch (error) {
    console.error("Error actualizando trabajador:", error);
    return res.status(500).json({ message: "Error al actualizar trabajador" });
  }
};

module.exports = {
  obtenerTrabajadores,
  buscarPorDNI,
  guardarTrabajador,
  eliminarTrabajador,
  vaciarTrabajadores,
  eliminarVariosTrabajadores,
  cargaMasivaFirmas,
  getTrabajadoresSelect,
  importarExcelInteligente,
  eliminarFirma,
  actualizarTrabajador,
};
