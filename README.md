# Publicador de Mensajes

Miniaplicación web del trabajo práctico de **Ingeniería Web**. Permite redactar
una publicación, validarla, enviarla por `HTTP POST` a una API REST con
`fetch()`, procesar la respuesta de forma asíncrona y reflejarla en el DOM.
Incluye además un **historial local con persistencia real** para poder consultar
las publicaciones guardadas por su **ID**.

---

## Inicio rápido

```powershell
cd C:\Users\Alumno\Downloads\actividad
npm start
```

Luego abre en el navegador: **http://localhost:8080**

Para detener el servidor: `Ctrl + C`.

> Lo detallado paso a paso está en la sección **5. Pasos de ejecución**, y el
> uso de la aplicación en la sección **6. Guion de demostración**.

---

## 1. Características principales

- Formulario semántico con campo de **título** y **contenido**.
- Validación con `.trim()`: no se admiten campos vacíos ni con solo espacios.
- Petición `POST` a `https://jsonplaceholder.typicode.com/posts` con
  `Content-Type: application/json` y cuerpo serializado con `JSON.stringify()`.
- Flujo asíncrono con `async/await` y verificación explícita de `response.ok`.
- Manejo de errores diferenciado: **red**, **HTTP** y **JSON inválido**.
- Indicador de carga (spinner) y botón deshabilitado durante el envío.
- Render seguro en el DOM usando únicamente `textContent` (prevención de XSS).
- **Servidor local** con persistencia en archivo para listar y buscar por ID.

---

## 2. Requisitos previos

- **Node.js 18 o superior** (probado con Node 24).
- Un navegador moderno (Chrome, Edge o Firefox).

Comprueba la instalación:

```powershell
node -v
npm -v
```

> No se necesita instalar ninguna dependencia: el servidor usa solo módulos
> nativos de Node. La carpeta `node_modules` no es necesaria.

---

## 3. Estructura del proyecto

```
actividad/
├── server.js          # Servidor Node + API local (persistencia en data/posts.json)
├── package.json       # Script de arranque "npm start"
├── index.html         # Estructura semántica y contenedores (formulario, resultados, historial)
├── style.css          # Diseño responsive, estados de éxito/error y spinner
├── app.js             # Eventos, validaciones, Fetch asíncrono y manipulación del DOM
├── data/
│   └── posts.json     # Almacenamiento local (se crea automáticamente)
└── markdown.md        # Rúbrica de evaluación y banco de preguntas
```

---

## 4. Rutas del proyecto

### 4.1 Rutas de archivos estáticos

| Método | Ruta          | Devuelve                          |
|--------|---------------|-----------------------------------|
| GET    | `/`           | `index.html` (la aplicación)      |
| GET    | `/style.css`  | Hoja de estilos                   |
| GET    | `/app.js`     | Lógica JavaScript del cliente     |

### 4.2 Rutas de la API local (persistencia)

| Método | Ruta               | Descripción                                                        |
|--------|--------------------|--------------------------------------------------------------------|
| POST   | `/api/posts`       | Guarda una publicación y le asigna un **ID local incremental**.    |
| GET    | `/api/posts`       | Lista **todas** las publicaciones guardadas (historial).          |
| GET    | `/api/posts/:id`   | Devuelve **una** publicación por su ID (`404` si no existe).      |
| DELETE | `/api/posts/:id`   | Elimina una publicación del historial.                            |

### 4.3 API externa (obligatoria)

| Método | URL                                            |
|--------|------------------------------------------------|
| POST   | `https://jsonplaceholder.typicode.com/posts`   |

> **Importante:** JSONPlaceholder es una API de prueba. Devuelve una respuesta
> simulada (siempre con `id: 101`) pero **no almacena** los datos. Por eso la
> aplicación guarda una copia local que sí persiste y es consultable por ID.

---

## 5. Pasos de ejecución

### Paso 1. Abrir una terminal en la carpeta del proyecto

```powershell
cd C:\Users\Alumno\Downloads\actividad
```

### Paso 2. (Opcional) Empezar con el historial vacío

Borra el archivo de datos para iniciar la demostración sin registros previos:

```powershell
Remove-Item .\data\posts.json -ErrorAction SilentlyContinue
```

Se volverá a crear automáticamente como `[]` al arrancar.

### Paso 3. Iniciar el servidor

```powershell
npm start
```

o, directamente:

```powershell
node server.js
```

Deberías ver en consola:

```
==============================================
  Publicador de Mensajes - servidor local
==============================================
  App:      http://localhost:8080/
  Listar:   http://localhost:8080/api/posts
  Por ID:   http://localhost:8080/api/posts/1
  Datos:    C:\Users\Alumno\Downloads\actividad\data\posts.json
  Detén el servidor con Ctrl + C
==============================================
```

### Paso 4. Abrir la aplicación

En el navegador entra a:

```
http://localhost:8080
```

> **No** abras `index.html` con doble clic. Con `file://` las rutas `/api/posts`
> no funcionan; es necesario servir la carpeta por HTTP.

### Paso 5. Detener el servidor

En la terminal presiona `Ctrl + C`.

---

## 6. Guion de demostración (secuencia sugerida)

### Demostración 1 — Validación de campos vacíos

1. Deja el **título** y el **contenido** vacíos y pulsa **Publicar Mensaje**.
2. **Resultado esperado:** aparece un mensaje en rojo ("Completa el título y el
   contenido…") y **no se realiza ninguna petición** (verifícalo en la pestaña
   *Network*: no hay registros nuevos).

### Demostración 2 — Validación de solo espacios

1. Escribe solo espacios en el título (por ejemplo, 4 espacios) y cualquier
   texto en el contenido.
2. Pulsa **Publicar Mensaje**.
3. **Resultado esperado:** el mensaje de error vuelve a mostrarse (el `.trim()`
   elimina los espacios y detecta el campo como vacío).

### Demostración 3 — Publicación válida

1. Escribe un título, por ejemplo `Arquitectura REST`, y un contenido.
2. Pulsa **Publicar Mensaje**.
3. Observa brevemente el **spinner** y el botón deshabilitado ("Enviando…").
4. **Resultado esperado:**
   - Mensaje verde de éxito.
   - Tarjeta **"Última Publicación Creada"** con: **ID local** (1, 2, 3…),
     **ID remoto** (101), **título** y **contenido**.
   - La publicación aparece en **"Publicaciones guardadas localmente"**.

### Demostración 4 — Búsqueda por ID

1. En la sección del historial, escribe un ID (por ejemplo `1`) y pulsa
   **Buscar**.
2. **Resultado esperado:** se muestra el detalle de esa publicación.
3. Prueba con un ID inexistente (por ejemplo `99`).
4. **Resultado esperado:** mensaje de error "No existe una publicación guardada
   con el ID 99."

### Demostración 5 — Persistencia real

1. Publica dos o tres mensajes.
2. Recarga la página (F5).
3. **Resultado esperado:** el historial sigue completo (los datos están en
   `data/posts.json`, no en memoria).
4. Detén el servidor (`Ctrl + C`), ábrelo de nuevo (`npm start`) y recarga.
5. **Resultado esperado:** las publicaciones siguen ahí.

### Demostración 6 — Gestión de errores

| Escenario                          | Cómo provocarlo                                   | Resultado esperado                                   |
|------------------------------------|---------------------------------------------------|------------------------------------------------------|
| Error de red                       | Desconecta internet o pon el navegador *Offline*  | Mensaje: "No se pudo conectar con el servidor…"      |
| Error HTTP                         | DevTools → Network → bloquea la petición o simula | Mensaje con el código HTTP recibido                  |
| JSON inválido                      | Respuesta del servidor que no sea JSON             | Mensaje: "…no contiene un JSON válido…"              |
| Botón restablecido tras el error   | Cualquiera de los casos anteriores                | El botón vuelve a mostrar "Publicar Mensaje"         |

---

## 7. Verificación técnica en el navegador

### Pestaña Network (Red)

1. Abre las DevTools con `F12` → pestaña **Network**.
2. Publica un mensaje válido y revisa dos peticiones:
   - `posts` (dominio `jsonplaceholder.typicode.com`):
     - **Method:** `POST`
     - **Request Headers:** `Content-Type: application/json`
     - **Request Payload:** `{ "title": "...", "body": "...", "userId": 1 }`
     - **Status:** `201 Created`
   - `posts` (dominio `localhost`):
     - **Method:** `POST`, **Status:** `201`
     - Respuesta con el `id` local asignado.
3. En la carga inicial verás `GET /api/posts` (historial) con **Status 200**.

### Pestaña Console (Consola)

- No debe haber errores en el flujo normal.
- Ante un fallo controlado se registra `Detalle del error: …` mediante
  `console.error`, sin detener la aplicación.

---

## 8. Probar la API local sin navegador (opcional)

Con el servidor en marcha, desde otra terminal:

```powershell
# Listar todo el historial
Invoke-RestMethod -Uri 'http://localhost:8080/api/posts'

# Consultar por ID
Invoke-RestMethod -Uri 'http://localhost:8080/api/posts/1'

# Crear una publicación
$body = @{ title = 'Prueba'; body = 'Contenido'; userId = 1 } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:8080/api/posts' -Method Post -ContentType 'application/json' -Body $body

# Eliminar por ID
Invoke-RestMethod -Uri 'http://localhost:8080/api/posts/1' -Method Delete
```

---

## 9. Correspondencia con la rúbrica

| Criterio de la rúbrica                                   | Dónde se implementa                        |
|----------------------------------------------------------|--------------------------------------------|
| Estructura del formulario y contenedores                 | `index.html` (`form`, `status-message`, `result-container`) |
| Separación HTML / CSS / JavaScript                       | `index.html`, `style.css`, `app.js`        |
| Selección del DOM                                        | `app.js` (sección 1, `getElementById`)     |
| Gestión de eventos (`addEventListener` + `preventDefault`) | `app.js` (`handleSubmit`)                 |
| Validación con `.trim()`                                 | `app.js` (`handleSubmit`)                  |
| Petición HTTP (URL, POST, `Content-Type`)                | `app.js` (`sendPostRequest`)               |
| Serialización con `JSON.stringify()`                     | `app.js` (`sendPostRequest`)               |
| Programación asíncrona (`async/await`)                   | `app.js` (`sendPostRequest`)               |
| Verificación de `response.ok`                            | `app.js` (`sendPostRequest`)               |
| Procesamiento de JSON (`response.json()`)                | `app.js` (`sendPostRequest`)               |
| Actualización dinámica del DOM                           | `app.js` (`renderResult`, `renderHistory`) |
| Seguridad con `textContent`                              | `app.js` (todas las inserciones)           |
| Indicador de carga y control de envíos                   | `app.js` (`setLoadingState`)               |
| Gestión de errores (red / HTTP / JSON)                   | `app.js` (`try/catch` anidados)            |
| Persistencia (JSONPlaceholder vs. almacenamiento real)   | `server.js` + `data/posts.json`            |

---

## 10. Solución de problemas

| Problema                                   | Causa probable / solución                                              |
|--------------------------------------------|------------------------------------------------------------------------|
| "No se pudo conectar con el servidor"      | Sin internet o el navegador está en modo Offline.                      |
| Las rutas `/api/posts` dan 404             | Abriste `index.html` con `file://`. Usa `http://localhost:8080`.       |
| `EADDRINUSE` al arrancar                   | El puerto 8080 está ocupado. Cierra el otro proceso o usa `set PORT=8081` (Windows) y vuelve a ejecutar. |
| El historial aparece vacío tras reiniciar  | Se borró `data/posts.json`. Es normal: se recrea vacío.                |
| El botón queda deshabilitado               | Recarga la página; el estado se restablece siempre en el bloque `finally`. |

---

## 11. Detener y reiniciar

- **Detener:** `Ctrl + C` en la terminal donde corre `npm start`.
- **Reiniciar:** vuelve a ejecutar `npm start` y abre `http://localhost:8080`.

---

## 12. Tecnologías utilizadas

- **HTML5** semántico y accesible (`aria-live`, `role`, labels asociados).
- **CSS3** con variables, Flexbox, diseño responsive y animaciones.
- **JavaScript (ES2017+)** con funciones `async`, `await`, `fetch` y DOM API.
- **Node.js** (módulos `http`, `fs`, `path`) para el servidor local y la API de persistencia.
"# Publicador-de-Mensajes-G10" 
