// ==========================================================================
// Servidor local - "Publicador de Mensajes"
// --------------------------------------------------------------------------
// No requiere dependencias externas: usa solo módulos nativos de Node.
//
// Sirve los archivos estáticos (index.html, style.css, app.js) y expone
// una API local con persistencia real en disco (data/posts.json) para poder
// listar y consultar las publicaciones guardadas por su ID.
//
// Arranque:  npm start   (o)   node server.js
// URL base:  http://localhost:8080
// ==========================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'posts.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// ==========================================================================
// Persistencia en archivo JSON
// ==========================================================================
function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
  }
}

function readPosts() {
  ensureDataFile();
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('posts.json ilegible, se reinicia el historial:', error.message);
    return [];
  }
}

function writePosts(posts) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2), 'utf-8');
}

function nextId(posts) {
  return posts.reduce((max, post) => Math.max(max, Number(post.id) || 0), 0) + 1;
}

// ==========================================================================
// Utilidades HTTP
// ==========================================================================
function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error('El cuerpo de la petición es demasiado grande.'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function serveStatic(res, pathname) {
  const relative = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(ROOT, path.normalize(relative));

  // Protección contra "path traversal" (salir de la carpeta del proyecto).
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 - Acceso prohibido');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 - Recurso no encontrado');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

// ==========================================================================
// Servidor y enrutado
// ==========================================================================
const server = http.createServer(async (req, res) => {
  const host = req.headers.host || `localhost:${PORT}`;
  const { pathname } = new URL(req.url, `http://${host}`);

  try {
    // ---------------------- GET /api/posts ----------------------
    // Devuelve el historial completo de publicaciones guardadas.
    if (pathname === '/api/posts' && req.method === 'GET') {
      return sendJson(res, 200, readPosts());
    }

    // ---------------------- POST /api/posts ----------------------
    // Guarda una publicación en el historial local con un ID incremental.
    if (pathname === '/api/posts' && req.method === 'POST') {
      let payload;
      try {
        payload = JSON.parse(await readBody(req));
      } catch {
        return sendJson(res, 400, { error: 'El cuerpo de la petición no es un JSON válido.' });
      }

      const title = typeof payload.title === 'string' ? payload.title.trim() : '';
      const body = typeof payload.body === 'string' ? payload.body.trim() : '';
      if (!title || !body) {
        return sendJson(res, 422, { error: 'El título y el contenido son obligatorios.' });
      }

      const posts = readPosts();
      const post = {
        id: nextId(posts),
        title,
        body,
        userId: Number(payload.userId) || 1,
        remoteId: payload.remoteId != null ? payload.remoteId : null,
        createdAt: new Date().toISOString()
      };

      posts.push(post);
      writePosts(posts);
      return sendJson(res, 201, post);
    }

    // -------------- GET /api/posts/:id  y  DELETE /api/posts/:id --------------
    const match = pathname.match(/^\/api\/posts\/(\d+)$/);
    if (match) {
      const id = Number(match[1]);
      const posts = readPosts();
      const post = posts.find((item) => item.id === id);

      if (req.method === 'GET') {
        if (!post) {
          return sendJson(res, 404, { error: `No existe una publicación guardada con el ID ${id}.` });
        }
        return sendJson(res, 200, post);
      }

      if (req.method === 'DELETE') {
        if (!post) {
          return sendJson(res, 404, { error: `No existe una publicación guardada con el ID ${id}.` });
        }
        writePosts(posts.filter((item) => item.id !== id));
        return sendJson(res, 200, { message: `Publicación ${id} eliminada del historial.` });
      }

      res.writeHead(405, { Allow: 'GET, DELETE' });
      res.end();
      return;
    }

    // ---------------------- Rutas de API desconocidas ----------------------
    if (pathname.startsWith('/api/')) {
      return sendJson(res, 404, { error: 'Ruta de API no encontrada.' });
    }

    // ---------------------- Archivos estáticos ----------------------
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('405 - Método no permitido');
      return;
    }
    return serveStatic(res, pathname);

  } catch (error) {
    console.error('Error interno:', error);
    return sendJson(res, 500, { error: 'Error interno del servidor.' });
  }
});

ensureDataFile();

server.listen(PORT, () => {
  console.log('==============================================');
  console.log('  Publicador de Mensajes - servidor local');
  console.log('==============================================');
  console.log(`  App:      http://localhost:${PORT}/`);
  console.log(`  Listar:   http://localhost:${PORT}/api/posts`);
  console.log(`  Por ID:   http://localhost:${PORT}/api/posts/1`);
  console.log(`  Datos:    ${DATA_FILE}`);
  console.log('  Detén el servidor con Ctrl + C');
  console.log('==============================================');
});
