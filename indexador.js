require('dotenv').config();

const { Storage } = require('megajs');
const axios = require('axios');
const fs = require('fs');

// Leer credenciales desde .env
const MEGA_EMAIL = process.env.MEGA_EMAIL;
const MEGA_PASSWORD = process.env.MEGA_PASSWORD;
const TMDB_API_KEY = process.env.TMDB_API_KEY;

// Validar que existan
if (!MEGA_EMAIL || !MEGA_PASSWORD) {
    console.error("❌ Faltan credenciales de MEGA en el archivo .env");
    process.exit(1);
}

if (!TMDB_API_KEY) {
    console.error("❌ Falta la API key de TMDb en el archivo .env");
    process.exit(1);
}

async function main() {
    console.log("🔐 Conectando a MEGA...");
    
    // Conectar a MEGA
    const storage = await new Storage({
        email: MEGA_EMAIL,
        password: MEGA_PASSWORD
    }).ready;

    console.log("📂 Obteniendo archivos...");
    
    // Acceder a los archivos mediante root.children
    const files = storage.root.children;
    
    const tmdbMegaMap = {};
    let contador = 0;

    console.log("🔄 Procesando archivos...");

   for (const file of files) {
    if (file.directory) continue;
    
    // Esperar 2 segundos antes de procesar cada archivo
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const nombre = file.name;
    const match = nombre.match(/=\s*(\d+)\s*=/);
        
        if (match) {
            const tmdbId = match[1];
            contador++;
            console.log(`   ✅ Procesando: ${nombre}`);
            console.log(`      ID extraído: ${tmdbId}`);
            
            try {
                // Obtener información de TMDb
                const tmdbUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=es-ES`;
                const tmdbRes = await axios.get(tmdbUrl);
                const titulo = tmdbRes.data.title;
                
                // Generar enlace público de MEGA
                const link = await file.link();
                const iframeUrl = link.replace('/file/', '/embed/');
                
                tmdbMegaMap[tmdbId] = {
                    titulo: titulo,
                    nombre_archivo: nombre,
                    mega_url: link,
                    iframe_url: iframeUrl
                };
                console.log(`      ✅ Mapeado: ${titulo}`);
                
            } catch (error) {
                console.log(`      ⚠️ Error con ID ${tmdbId}: ${error.message}`);
            }
        } else {
            if (nombre) {
                console.log(`   ⚠️ Saltando: ${nombre} (sin ID reconocible)`);
            }
        }
    }

    console.log(`\n📊 Procesados ${contador} archivos con ID`);

    // Guardar el mapeo
    fs.writeFileSync('peliculas.json', JSON.stringify(tmdbMegaMap, null, 2));
    console.log("💾 Guardado en 'peliculas.json'");

    if (contador > 0) {
        console.log("\n📋 Películas indexadas:");
        for (const [id, info] of Object.entries(tmdbMegaMap)) {
            console.log(`   ${id}: ${info.titulo}`);
        }
    } else {
        console.log("\n⚠️ No se encontraron películas con IDs en los nombres.");
        console.log("   Asegúrate de que los archivos tengan formato: 'Nombre = 9495 = calidad.mp4'");
    }
}

main().catch(console.error);