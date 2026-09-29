import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

/**
 * Retratos oficiales (headshots con fondo transparente) de formula1.com (media.formula1.com)
 * para los 22 pilotos de la parrilla 2026.
 */
const PILOTOS = [
  {
    id: "VER",
    nombre: "Max Verstappen",
    escuderia_id: "RBR",
    headshotUrl:
      "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/redbullracing/maxver01/2026redbullracingmaxver01right.png",
  },
  {
    id: "HAD",
    nombre: "Isack Hadjar",
    escuderia_id: "RBR",
    headshotUrl:
      "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/redbullracing/isahad01/2026redbullracingisahad01right.png",
  },
  {
    id: "LEC",
    nombre: "Charles Leclerc",
    escuderia_id: "FER",
    headshotUrl:
      "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/ferrari/chalec01/2026ferrarichalec01right.png",
  },
  {
    id: "HAM",
    nombre: "Lewis Hamilton",
    escuderia_id: "FER",
    headshotUrl:
      "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/ferrari/lewham01/2026ferrarilewham01right.png",
  },
  {
    id: "NOR",
    nombre: "Lando Norris",
    escuderia_id: "MCL",
    headshotUrl:
      "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/mclaren/lannor01/2026mclarenlannor01right.png",
  },
  {
    id: "PIA",
    nombre: "Oscar Piastri",
    escuderia_id: "MCL",
    headshotUrl:
      "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/mclaren/oscpia01/2026mclarenoscpia01right.png",
  },
  {
    id: "RUS",
    nombre: "George Russell",
    escuderia_id: "MER",
    headshotUrl:
      "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/mercedes/georus01/2026mercedesgeorus01right.png",
  },
  {
    id: "ANT",
    nombre: "Kimi Antonelli",
    escuderia_id: "MER",
    headshotUrl:
      "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/mercedes/andant01/2026mercedesandant01right.png",
  },
  {
    id: "ALO",
    nombre: "Fernando Alonso",
    escuderia_id: "AMR",
    headshotUrl:
      "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/astonmartin/feralo01/2026astonmartinferalo01right.png",
  },
  {
    id: "STR",
    nombre: "Lance Stroll",
    escuderia_id: "AMR",
    headshotUrl:
      "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/astonmartin/lanstr01/2026astonmartinlanstr01right.png",
  },
  {
    id: "ALB",
    nombre: "Alexander Albon",
    escuderia_id: "WIL",
    headshotUrl:
      "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/williams/alealb01/2026williamsalealb01right.png",
  },
  {
    id: "SAI",
    nombre: "Carlos Sainz",
    escuderia_id: "WIL",
    headshotUrl:
      "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/williams/carsai01/2026williamscarsai01right.png",
  },
  {
    id: "COL",
    nombre: "Franco Colapinto",
    escuderia_id: "ALP",
    headshotUrl:
      "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/alpine/fracol01/2026alpinefracol01right.png",
  },
  {
    id: "GAS",
    nombre: "Pierre Gasly",
    escuderia_id: "ALP",
    headshotUrl:
      "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/alpine/piegas01/2026alpinepiegas01right.png",
  },
  {
    id: "LAW",
    nombre: "Liam Lawson",
    escuderia_id: "VCARB",
    headshotUrl:
      "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/racingbulls/lialaw01/2026racingbullslialaw01right.png",
  },
  {
    id: "LIN",
    nombre: "Arvid Lindblad",
    escuderia_id: "VCARB",
    headshotUrl:
      "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/racingbulls/arvlin01/2026racingbullsarvlin01right.png",
  },
  {
    id: "OCO",
    nombre: "Esteban Ocon",
    escuderia_id: "HAA",
    headshotUrl:
      "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/haasf1team/estoco01/2026haasf1teamestoco01right.png",
  },
  {
    id: "BEA",
    nombre: "Oliver Bearman",
    escuderia_id: "HAA",
    headshotUrl:
      "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/haasf1team/olibea01/2026haasf1teamolibea01right.png",
  },
  {
    id: "HUL",
    nombre: "Nico Hülkenberg",
    escuderia_id: "AUD",
    headshotUrl:
      "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/audi/nichul01/2026audinichul01right.png",
  },
  {
    id: "BOR",
    nombre: "Gabriel Bortoleto",
    escuderia_id: "AUD",
    headshotUrl:
      "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/audi/gabbor01/2026audigabbor01right.png",
  },
  {
    id: "BOT",
    nombre: "Valtteri Bottas",
    escuderia_id: "CAD",
    headshotUrl:
      "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/cadillac/valbot01/2026cadillacvalbot01right.png",
  },
  {
    id: "PER",
    nombre: "Checo Perez",
    escuderia_id: "CAD",
    headshotUrl:
      "https://media.formula1.com/image/upload/c_fill,w_440,h_440,g_north/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/cadillac/serper01/2026cadillacserper01right.png",
  },
];

// Carpetas de destino
const avatarsDir = path.join(rootDir, "avatars_pilotos");
const publicAvatarsDir = path.join(rootDir, "public", "avatars_pilotos");

if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}
if (!fs.existsSync(publicAvatarsDir)) {
  fs.mkdirSync(publicAvatarsDir, { recursive: true });
}

function downloadBinary(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    protocol
      .get(
        url,
        { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } },
        (res) => {
          if (
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            return downloadBinary(res.headers.location)
              .then(resolve)
              .catch(reject);
          }
          if (res.statusCode !== 200) {
            return reject(
              new Error(`HTTP ${res.statusCode} al descargar ${url}`)
            );
          }
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => resolve(Buffer.concat(chunks)));
        }
      )
      .on("error", reject);
  });
}

// Cargar variables de .env.local
function loadEnv() {
  const envPath = path.join(rootDir, ".env.local");
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [k, ...v] = trimmed.split("=");
        if (k) env[k.trim()] = v.join("=").trim();
      }
    }
  }
  return env;
}

async function uploadToFirebaseStorage(bucketName, filename, buffer) {
  if (!bucketName) return null;
  const destination = `avatars_pilotos/${filename}`;
  const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o?uploadType=media&name=${encodeURIComponent(
    destination
  )}`;

  return new Promise((resolve) => {
    const req = https.request(
      uploadUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "image/png",
          "Content-Length": buffer.length,
        },
      },
      (res) => {
        let responseData = "";
        res.on("data", (chunk) => (responseData += chunk));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
              destination
            )}?alt=media`;
            resolve(publicUrl);
          } else {
            resolve(null);
          }
        });
      }
    );
    req.on("error", () => resolve(null));
    req.write(buffer);
    req.end();
  });
}

async function main() {
  console.log("=============================================================");
  console.log("🏎️ GRIDPRODE F1: Retratos Oficiales formula1.com (Fondo Transparente)");
  console.log("=============================================================\n");

  const env = loadEnv();
  const bucketName = env["NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"];
  const isFirebaseActive = Boolean(
    bucketName && bucketName.includes(".appspot.com")
  );

  // Limpiar archivos .jpg anteriores de Wikipedia
  for (const p of PILOTOS) {
    const oldJpg1 = path.join(avatarsDir, `${p.id}.jpg`);
    const oldJpg2 = path.join(publicAvatarsDir, `${p.id}.jpg`);
    if (fs.existsSync(oldJpg1)) fs.unlinkSync(oldJpg1);
    if (fs.existsSync(oldJpg2)) fs.unlinkSync(oldJpg2);
  }

  console.log(
    `Descargando ${PILOTOS.length} headshots oficiales (PNG transparente) desde media.formula1.com...\n`
  );

  const results = [];

  for (let i = 0; i < PILOTOS.length; i++) {
    const p = PILOTOS[i];
    process.stdout.write(
      `[${i + 1}/${PILOTOS.length}] ${p.nombre} (${p.id})... `
    );

    try {
      const imageBuffer = await downloadBinary(p.headshotUrl);
      const filename = `${p.id}.png`;

      // Guardar en avatars_pilotos/ y en public/avatars_pilotos/
      fs.writeFileSync(path.join(avatarsDir, filename), imageBuffer);
      fs.writeFileSync(path.join(publicAvatarsDir, filename), imageBuffer);

      let storageUrl = null;
      if (isFirebaseActive) {
        storageUrl = await uploadToFirebaseStorage(
          bucketName,
          filename,
          imageBuffer
        );
      }

      // Usamos la URL oficial de media.formula1.com (o storageUrl si se subió a Firebase Storage)
      const finalUrl = storageUrl || p.headshotUrl;
      console.log(
        `✅ Oficial F1 (${(imageBuffer.length / 1024).toFixed(1)} KB) -> ${p.headshotUrl}`
      );

      results.push({
        id: p.id,
        nombre: p.nombre,
        escuderia_id: p.escuderia_id,
        status: "ok",
        bytes: imageBuffer.length,
        url: finalUrl,
        headshotUrl: p.headshotUrl,
      });
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
      results.push({
        id: p.id,
        nombre: p.nombre,
        status: "error",
        error: err.message,
      });
    }
  }

  console.log("\n=============================================================");
  console.log("📊 Resumen de Retratos Oficiales F1:");
  const okCount = results.filter((r) => r.status === "ok").length;
  console.log(
    `✅ ${okCount} de ${PILOTOS.length} headshots oficiales sincronizados.`
  );
  console.log(`📁 Carpeta local (PNG transparente): ${avatarsDir}`);
  console.log(`🌐 Carpeta pública Next.js: ${publicAvatarsDir}`);

  updateF1InitialData(results.filter((r) => r.status === "ok"));
  console.log("=============================================================\n");
}

function updateF1InitialData(successfulDownloads) {
  const dataFilePath = path.join(rootDir, "src", "data", "f1InitialData.ts");
  if (!fs.existsSync(dataFilePath)) return;

  let content = fs.readFileSync(dataFilePath, "utf-8");

  for (const item of successfulDownloads) {
    const regex = new RegExp(
      `\\{\\s*id:\\s*"${item.id}",\\s*nombre:\\s*"${item.nombre}",\\s*escuderia_id:\\s*"([^"]+)"(,\\s*foto_url:\\s*"[^"]*")?\\s*\\}`
    );
    content = content.replace(
      regex,
      `{ id: "${item.id}", nombre: "${item.nombre}", escuderia_id: "$1", foto_url: "${item.headshotUrl}" }`
    );
  }

  fs.writeFileSync(dataFilePath, content, "utf-8");
  console.log(
    "✨ src/data/f1InitialData.ts actualizado con los retratos oficiales de formula1.com."
  );
}

main().catch(console.error);
