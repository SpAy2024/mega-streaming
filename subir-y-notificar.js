const { Storage } = require('megajs');
const https = require('https');
const readline = require('readline');
const path = require('path');

require('dotenv').config();

const RENDER_URL = "https://mega-streaming.onrender.com";
const WEBHOOK_SECRET = "a7f3k9m2x8q4w1e6r5t0y9u4i7o2p1l3";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function notificarRender() {
    return new Promise((resolve) => {
        const url = new URL('/webhook/actualizar', RENDER_URL);
        const req = https.request(url, {
            method: 'POST',
            headers: {
                'x-webhook-secret': WEBHOOK_SECRET,
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log("✅ Render actualizado correctamente");
                } else {
                    console.log(`⚠️ Respuesta de Render: ${res.statusCode}`);
                }
                resolve();
            });
        });
        req.on('error', () => resolve());
        req.end();
    });
}

async function subirPelicula() {
    rl.question('📁 Ruta del archivo a subir: ', async (ruta) => {
        rl.question('🎬 ID de TMDb (ej: 9495 para El Cuervo): ', async (tmdbId) => {
            rl.question('🏷️ Calidad (ej: LAT_R1080p): ', async (calidad) => {
                rl.close();
                
                const nombreArchivo = path.basename(ruta);
                const nuevoNombre = `${path.parse(nombreArchivo).name} = ${tmdbId} = ${calidad}.mp4`;
                
                console.log(`\n📤 Subiendo: ${nuevoNombre}`);
                console.log("🔐 Conectando a MEGA...");
                
                try {
                    const storage = await new Storage({
                        email: process.env.MEGA_EMAIL,
                        password: process.env.MEGA_PASSWORD
                    }).ready;
                    
                    console.log("📂 Subiendo archivo...");
                    const uploadStream = await storage.upload({
                        name: nuevoNombre,
                        size: (await fs.promises.stat(ruta)).size
                    });
                    
                    const fs = require('fs');
                    const readStream = fs.createReadStream(ruta);
                    await new Promise((resolve, reject) => {
                        readStream.pipe(uploadStream)
                            .on('error', reject)
                            .on('finish', resolve);
                    });
                    
                    console.log("✅ Archivo subido exitosamente");
                    console.log("📡 Notificando a Render...");
                    await notificarRender();
                    
                    console.log("\n🎉 Proceso completado. La película estará disponible en minutos.");
                    console.log(`🌐 ${RENDER_URL}`);
                    
                } catch (error) {
                    console.error("❌ Error:", error.message);
                }
            });
        });
    });
}

// Asegurar que fs.promises existe
const fs = require('fs');
if (!fs.promises) {
    const { promises } = require('fs');
    fs.promises = promises;
}

subirPelicula();