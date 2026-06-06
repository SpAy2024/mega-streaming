require('dotenv').config();
const express = require('express');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para leer JSON en las peticiones
app.use(express.json());

function cargarPeliculas() {
    try {
        const data = fs.readFileSync('peliculas.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

// Página principal
app.get('/', (req, res) => {
    const peliculas = cargarPeliculas();
    
    let listaHtml = '';
    for (const [id, info] of Object.entries(peliculas)) {
        listaHtml += `<li><a href="#" onclick="cargarPelicula('${id}')">${info.titulo} (ID: ${id})</a></li>`;
    }
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Mi Videoteca MEGA</title>
        <style>
            body { font-family: Arial; background: #1a1a1a; color: white; padding: 20px; }
            iframe { width: 100%; height: 500px; border: none; border-radius: 10px; }
            .pelicula { margin-bottom: 30px; padding: 20px; background: #2a2a2a; border-radius: 10px; }
            h1 { color: #ff4444; }
            input { padding: 10px; width: 300px; margin: 10px; }
            button { padding: 10px 20px; background: #ff4444; color: white; border: none; cursor: pointer; }
            a { color: #ff8888; text-decoration: none; }
            li { margin: 10px 0; }
        </style>
    </head>
    <body>
        <h1>🎬 Mi Videoteca MEGA</h1>
        
        <div>
            <input type="text" id="buscar" placeholder="Ej: 9495 (El cuervo)" onkeypress="if(event.key=='Enter') verPelicula()">
            <button onclick="verPelicula()">Ver película</button>
        </div>
        
        <div id="reproductor" style="margin-top: 20px;"></div>
        
        <h2>📋 Películas disponibles:</h2>
        <ul id="lista-peliculas">
            ${listaHtml}
        </ul>
        
        <script>
            function cargarPelicula(id) {
                fetch(\`/api/pelicula/\${id}\`)
                    .then(res => res.json())
                    .then(data => {
                        document.getElementById('reproductor').innerHTML = \`
                            <div class="pelicula">
                                <h3>\${data.titulo}</h3>
                                <iframe src="\${data.iframe_url}" allowfullscreen></iframe>
                            </div>
                        \`;
                    });
            }
            
            function verPelicula() {
                const id = document.getElementById('buscar').value;
                if(id) cargarPelicula(id);
            }
        </script>
    </body>
    </html>
    `;
    
    res.send(html);
});

// API para obtener los datos de una película
app.get('/api/pelicula/:tmdbId', (req, res) => {
    const peliculas = cargarPeliculas();
    const tmdbId = req.params.tmdbId;
    
    if (peliculas[tmdbId]) {
        res.json(peliculas[tmdbId]);
    } else {
        res.status(404).json({ error: 'Película no encontrada' });
    }
});

// Endpoint secreto para actualizar el índice (Webhook)
app.post('/webhook/actualizar', (req, res) => {
    const secreto = req.headers['x-webhook-secret'];
    const SECRETO_CORRECTO = process.env.WEBHOOK_SECRET || "MiClaveSuperSecreta123";
    
    if (secreto !== SECRETO_CORRECTO) {
        console.log(`❌ Webhook rechazado: secreto inválido`);
        return res.status(403).json({ error: 'No autorizado' });
    }
    
    console.log("🔄 Webhook recibido. Actualizando índice...");
    
    exec('node indexador.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Error al ejecutar indexador: ${error}`);
            return res.status(500).json({ error: 'Error al actualizar' });
        }
        
        console.log("✅ Índice actualizado correctamente");
        console.log(stdout);
        
        res.json({ 
            success: true, 
            message: 'Índice actualizado correctamente',
            output: stdout 
        });
    });
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📺 Webhook disponible en: /webhook/actualizar`);
});