// backend/src/config/firebase.js
const admin = require("firebase-admin");
require("dotenv").config();

let storage = null;

try {
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  };

  // Solo inicializa si las credenciales existen en el .env
  if (serviceAccount.projectId && serviceAccount.privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });

    storage = admin.storage().bucket();
    console.log("🔥 Firebase Admin configurado con variables de entorno (.env).");
  } else {
    console.warn("⚠️ Firebase Admin no configurado (faltan variables en .env). El servidor funcionará, pero la subida de fotos a la nube estará deshabilitada.");
  }
} catch (error) {
  console.error("❌ Error configurando Firebase Admin:", error.message);
}

module.exports = { admin, storage };