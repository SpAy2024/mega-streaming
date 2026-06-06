require('dotenv').config();
const { Storage } = require('megajs');
const axios = require('axios');
const fs = require('fs');

const MEGA_EMAIL = process.env.MEGA_EMAIL;
const MEGA_PASSWORD = process.env.MEGA_PASSWORD;
const TMDB_API_KEY = process.env.TMDB_API_KEY;

let storage = null;
let tmdbMegaMap = {};

// Cargar el mapeo existente
function cargarMapeo() {
    try {
        const data = fs.readFileSync('peliculas.json', 'utf8');
        tmdbMegaMap = JSON.parse(data);
    } catch (error) {
        tmdbMegaMap = {};
    }
}

// Guardar el mapeo
function guardarMapeo() {
    fs.writeFileSync('peliculas.json', JSON.stringify(tmdbMegaMap, null, 2));
}

// Procesar un archivo nuevo
async function procesarArchivo(file) {
    if (file.directory) return;
    
    const nombre = file.name;
    const match = nombre.match(/=\s*(\d+)\s*=/);
    
    if (!match) return;
    
    const tmdbId = match[1];
    
    // Evitar duplicados
    if (tmdbMegaMap[tmdbId]) {
        console.log(`   ⏭️ Ya existe: ${nombre}`);
        return;
    }
    
    console.log(`   ✅ Nueva película detectada: ${nombre}`);
    console.log(`      ID extraído: ${tmdbId}`);
    
    try {
        // Obtener info de TMDb
        const tmdbUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=es-ES`;
        const tmdbRes = await axios.get(tmdbUrl);
        const titulo = tmdbRes.data.title;
        
        // Generar enlace público
        const link = await file.link();
        const iframeUrl = link.replace('/file/', '/embed/');
        
        tmdbMegaMap[tmdbId] = {
            titulo: titulo,
            nombre_archivo: nombre,
            mega_url: link,
            iframe_url: iframeUrl
        };
        
        guardarMapeo();
        console.log(`      ✅ Mapeado: ${titulo}`);
        
    } catch (error) {
        console.log(`      ⚠️ Error: ${error.message}`);
    }
}

async function main() {
    console.log("🔐 Conectando a MEGA...");
    
    storage = await new Storage({
        email: MEGA_EMAIL,
        password: MEGA_PASSWORD
    }).ready;
    
    console.log("📂 Cargando mapeo existente...");
    cargarMapeo();
    
    console.log("📂 Escaneando archivos iniciales...");
    
    // Procesar archivos existentes
    for (const file of storage.root.children) {
        await procesarArchivo(file);
    }
    
    console.log(`\n👀 Monitoreando cambios en MEGA...`);
    console.log("   Esperando nuevas películas...\n");
    
    // Escuchar eventos en tiempo real
    storage.on('add', async (file) => {
        console.log(`\n📁 Cambio detectado: Nuevo archivo añadido`);
        await procesarArchivo(file);
        console.log("   👀 Continuando monitoreo...\n");
    });
    
    storage.on('delete', (file) => {
        console.log(`\n🗑️ Archivo eliminado: ${file.name}`);
        // Opcional: eliminar del mapeo
        for (const [id, info] of Object.entries(tmdbMegaMap)) {
            if (info.nombre_archivo === file.name) {
                delete tmdbMegaMap[id];
                guardarMapeo();
                console.log(`      Eliminado del índice`);
                break;
            }
        }
        console.log("   👀 Continuando monitoreo...\n");
    });
    
    storage.on('update', async (file) => {
        console.log(`\n✏️ Archivo modificado: ${file.name}`);
        await procesarArchivo(file);
        console.log("   👀 Continuando monitoreo...\n");
    });
}

main().catch(console.error);