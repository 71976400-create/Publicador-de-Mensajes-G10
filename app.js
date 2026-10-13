// ==========================================
// 1. REFERENCIAS A LOS ELEMENTOS DEL DOM
// ==========================================
// Se consultan una sola vez y se reutilizan durante toda la aplicación.
const postForm = document.getElementById('post-form');
const titleInput = document.getElementById('title');
const bodyInput = document.getElementById('body');
const btnSubmit = document.getElementById('btn-submit');
const btnText = document.getElementById('btn-text');
const btnSpinner = document.getElementById('btn-spinner');
const statusMessage = document.getElementById('status-message');

const resultContainer = document.getElementById('result-container');
const resId = document.getElementById('res-id');
const resRemoteId = document.getElementById('res-remote-id');
const resTitle = document.getElementById('res-title');
const resBody = document.getElementById('res-body');

const searchIdInput = document.getElementById('search-id');
const btnSearch = document.getElementById('btn-search');
const searchMessage = document.getElementById('search-message');
const historyList = document.getElementById('history-list');
const historyEmpty = document.getElementById('history-empty');

// API pública obligatoria (el POST principal del trabajo práctico).
const API_URL = 'https://jsonplaceholder.typicode.com/posts';

// API local de persistencia (servida por server.js en el mismo origen).
const LOCAL_API = '/api/posts';

// ==========================================
// 2. GESTIÓN DEL EVENTO DE ENVÍO
// ==========================================
postForm.addEventListener('submit', handleSubmit);

async function handleSubmit(event) {
  // Evita que el navegador recargue la página al enviar el formulario.
  event.preventDefault();

  // Lectura y limpieza de los campos (trim elimina los espacios sobrantes).
  const titleVal = titleInput.value.trim();
  const bodyVal = bodyInput.value.trim();

  // Reinicia el feedback visual de intentos anteriores.
  hideStatus();
  resultContainer.classList.add('hidden');

  // Validación: ambos campos deben contener texto real.
  if (!titleVal || !bodyVal) {
    showStatus(
      'Completa el título y el contenido. No se admiten campos vacíos ni con solo espacios en blanco.',
      'error'
    );
    return; // No se ejecuta la petición HTTP.
  }

  // Objeto que viajará como cuerpo de la petición.
  const postData = {
    title: titleVal,
    body: bodyVal,
    userId: 1
  };

  await sendPostRequest(postData);
}

// ==========================================
// 3. PETICIÓN HTTP POST (FETCH + ASYNC/AWAIT)
// ==========================================
async function sendPostRequest(data) {
  setLoadingState(true);

  try {
    // --- 1) POST obligatorio a la API pública -------------------------------
    let response;
    try {
      response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data) // Serialización del objeto a JSON.
      });
    } catch (networkError) {
      // fetch() rechaza la promesa cuando falla la conexión (red, CORS, DNS, etc.).
      throw buildError(
        'No se pudo conectar con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.',
        networkError
      );
    }

    // fetch() NO rechaza la promesa ante códigos HTTP de error (404, 500, etc.),
    // por eso se comprueba explícitamente response.ok.
    if (!response.ok) {
      throw buildError(
        `El servidor respondió con un error HTTP ${response.status} (${response.statusText}). Inténtalo más tarde.`
      );
    }

    // Interpretación del cuerpo de la respuesta en formato JSON.
    let resultData;
    try {
      resultData = await response.json();
    } catch (parseError) {
      throw buildError(
        'La respuesta del servidor no contiene un JSON válido y no se puede interpretar.',
        parseError
      );
    }

    // --- 2) Persistencia local para poder consultar por ID ------------------
    // La API pública no almacena nada, por eso guardamos una copia local.
    let localPost = null;
    try {
      localPost = await persistPostLocally(data, resultData);
    } catch (persistError) {
      // La publicación remota ya fue exitosa; solo avisamos que no se guardó.
      console.warn('La publicación no se pudo guardar en el historial local:', persistError);
    }

    // --- 3) Actualización del DOM ------------------------------------------
    renderResult(resultData, localPost);
    showStatus(
      localPost
        ? `¡Publicación creada correctamente! Se guardó localmente con el ID ${localPost.id}.`
        : '¡Publicación creada correctamente en el servidor! (No se pudo guardar en el historial local).',
      'success'
    );

    postForm.reset();
    await loadHistory();

  } catch (error) {
    // Control centralizado de errores de red, HTTP y de interpretación del JSON.
    console.error('Detalle del error:', error.cause || error);
    showStatus(`${error.message}`, 'error');
  } finally {
    // Pase lo que pase (éxito o error) se restablecen los controles.
    setLoadingState(false);
  }
}

// Guarda la publicación en la API local y devuelve el registro con su ID propio.
async function persistPostLocally(postData, remoteData) {
  const response = await fetch(LOCAL_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: postData.title,
      body: postData.body,
      userId: postData.userId,
      remoteId: remoteData && remoteData.id != null ? remoteData.id : null
    })
  });

  if (!response.ok) {
    throw new Error(`La API local respondió con el estado ${response.status}.`);
  }

  return await response.json();
}

// ==========================================
// 4. HISTORIAL LOCAL (listar y buscar por ID)
// ==========================================
async function loadHistory() {
  try {
    const response = await fetch(LOCAL_API);
    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }
    const posts = await response.json();
    renderHistory(posts);
  } catch (error) {
    // El historial es una mejora: si falla, no rompe la app.
    console.error('No se pudo cargar el historial local:', error);
  }
}

function renderHistory(posts) {
  historyList.textContent = ''; // Limpieza segura (sin innerHTML).

  if (!Array.isArray(posts) || posts.length === 0) {
    historyEmpty.classList.remove('hidden');
    return;
  }

  historyEmpty.classList.add('hidden');

  posts.forEach((post) => {
    const item = document.createElement('li');
    item.className = 'history-item';

    const head = document.createElement('div');
    head.className = 'history-head';

    const localBadge = document.createElement('span');
    localBadge.className = 'badge';
    localBadge.textContent = `ID local: ${post.id}`;

    const remoteBadge = document.createElement('span');
    remoteBadge.className = 'badge badge-muted';
    remoteBadge.textContent = `ID remoto: ${post.remoteId != null ? post.remoteId : '-'}`;

    head.append(localBadge, remoteBadge);

    const title = document.createElement('p');
    title.className = 'history-title';
    title.textContent = post.title;

    const body = document.createElement('p');
    body.className = 'history-body';
    body.textContent = post.body;

    item.append(head, title, body);
    historyList.appendChild(item);
  });
}

btnSearch.addEventListener('click', handleSearch);

searchIdInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    handleSearch();
  }
});

async function handleSearch() {
  const raw = searchIdInput.value.trim();
  hideSearchMessage();

  if (!raw) {
    showSearchMessage('Escribe un ID para buscar.', 'error');
    return;
  }

  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    showSearchMessage('El ID debe ser un número entero positivo.', 'error');
    return;
  }

  btnSearch.disabled = true;

  try {
    const response = await fetch(`${LOCAL_API}/${id}`);

    if (response.status === 404) {
      showSearchMessage(`No existe una publicación guardada con el ID ${id}.`, 'error');
      return;
    }

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    const post = await response.json();
    showSearchMessage(`ID ${post.id} → "${post.title}": ${post.body}`, 'success');

  } catch (error) {
    console.error('Error al buscar por ID:', error);
    showSearchMessage(`No se pudo buscar la publicación: ${error.message}`, 'error');
  } finally {
    btnSearch.disabled = false;
  }
}

// ==========================================
// 5. ACTUALIZACIÓN DEL DOM Y UTILIDADES
// ==========================================
function renderResult(remoteData, localData) {
  // textContent inserta texto plano. Es seguro frente a XSS porque NO interpreta
  // el contenido como HTML (a diferencia de innerHTML).
  resId.textContent = localData && localData.id != null ? localData.id : '-';
  resRemoteId.textContent = remoteData && remoteData.id != null ? remoteData.id : '-';
  resTitle.textContent = remoteData && remoteData.title != null ? remoteData.title : '';
  resBody.textContent = remoteData && remoteData.body != null ? remoteData.body : '';

  resultContainer.classList.remove('hidden');
}

function showStatus(message, type) {
  statusMessage.textContent = message; // Uso seguro contra XSS.
  statusMessage.className = `status-box ${type}`;
}

function hideStatus() {
  statusMessage.textContent = '';
  statusMessage.className = 'status-box hidden';
}

function showSearchMessage(message, type) {
  searchMessage.textContent = message; // Uso seguro contra XSS.
  searchMessage.className = `status-box ${type}`;
}

function hideSearchMessage() {
  searchMessage.textContent = '';
  searchMessage.className = 'status-box hidden';
}

function setLoadingState(isLoading) {
  if (isLoading) {
    // Evita envíos repetidos y muestra el indicador de carga.
    btnSubmit.disabled = true;
    btnSubmit.setAttribute('aria-busy', 'true');
    btnText.textContent = 'Enviando...';
    btnSpinner.classList.remove('hidden');
  } else {
    // Restablece el botón para permitir nuevos intentos.
    btnSubmit.disabled = false;
    btnSubmit.setAttribute('aria-busy', 'false');
    btnText.textContent = 'Publicar Mensaje';
    btnSpinner.classList.add('hidden');
  }
}

// Crea un Error con mensaje comprensible y, opcionalmente, la causa original.
function buildError(message, cause) {
  const error = new Error(message);
  if (cause) {
    error.cause = cause;
  }
  return error;
}

// ==========================================
// 6. CARGA INICIAL DEL HISTORIAL
// ==========================================
loadHistory();
