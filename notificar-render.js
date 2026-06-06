const https = require('https');
const readline = require('readline');

// Configuración
const RENDER_URL = "https://mega-streaming.onrender.com";
const WEBHOOK_SECRET = "a7f3k9m2x8q4w1e6r5t0y9u4i7o2p1l3";  // Misma que pusiste en servidor.js

function notificarRender() {
    const url = new URL('/webhook/actualizar', RENDER_URL);
    
    const options = {
        method: 'POST',
        headers: {
            'x-webhook-secret': WEBHOOK_SECRET,
            'Content-Type': 'application/json'
        }
    };
    
    console.log("📡 Notificando a Render para actualizar el índice...");
    
    const req = https.request(url, options, (res) => {
        let data = '';
        
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            if (res.statusCode === 200) {
                console.log("✅ Notificación exitosa. Render está actualizando el índice.");
                try {
                    const response = JSON.parse(data);
                    console.log(response.message);
                } catch(e) {
                    console.log(data);
                }
            } else {
                console.log(`❌ Error: Código ${res.statusCode}`);
                console.log(data);
            }
        });
    });
    
    req.on('error', (error) => {
        console.error("❌ Error al notificar a Render:", error.message);
    });
    
    req.end();
}

// Crear interfaz para preguntar
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('¿Actualizar índice de películas en Render? (s/n): ', (respuesta) => {
    if (respuesta.toLowerCase() === 's') {
        notificarRender();
    } else {
        console.log("Operación cancelada.");
    }
    rl.close();
});