// ================= CONFIGURACIÓN DE SUPABASE (NUBE LOCAL-FIRST) =================
const SUPABASE_URL = 'https://gzbjsbhgpqtycsndwkpc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_TrvXyss9fBLXQ4BKRAzMYg_S7yOlAP-';
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

let usuarioActual = null;
let authModoActual = 'login';
let sincronizandoNube = false;

// Base de Datos Local
let transacciones = JSON.parse(localStorage.getItem('transacciones')) || [];
let categorias = JSON.parse(localStorage.getItem('categorias')) || [];
let cuentas = JSON.parse(localStorage.getItem('cuentas')) || [];
let metas = JSON.parse(localStorage.getItem('metas')) || [];
let agendaPagos = JSON.parse(localStorage.getItem('assist_agenda_pagos')) || [];
let appPin = localStorage.getItem('app_pin') || null;
let pinQuestions = JSON.parse(localStorage.getItem('assist_pin_questions')) || [];

// Mapa de Colores Personalizados por Categoría (Local-First)
const PALETA_COLORES_CATEGORIAS = [
    '#0A84FF', '#FF453A', '#32D74B', '#FF9F0A', '#BF5AF2',
    '#64D2FF', '#FFD60A', '#FF375F', '#5E5CE6', '#00C7BE',
    '#FF6482', '#30D158', '#E586C6', '#FFB340', '#4A90E2', '#50E3C2'
];
let categoriasColores = JSON.parse(localStorage.getItem('assist_categorias_colores')) || {};
let colorNuevaCategoriaSeleccionado = PALETA_COLORES_CATEGORIAS[0];
let categoriaEditandoColorIndex = null;

// Datos de Perfil de Usuario (Local-First)
let userNombre = localStorage.getItem('assist_user_name') || '';
let userAvatar = localStorage.getItem('assist_user_avatar') || null;

// Variables Globales de Tasas e Historial Real
let tasaBCV = 1;
let tasaParalelo = 1;
let tasaEUR = 1;
let cuentaActivaId = cuentas.length > 0 ? cuentas[0].id : null;
let chartInstancia = null;

let tasasData = {
    BCV: { valor: 1, previo: 1, fecha: null },
    USDT: { valor: 1, previo: 1, fecha: null },
    EUR: { valor: 1, previo: 1, fecha: null },
    Custom: { valor: 1, previo: 1, fecha: new Date().toISOString() }
};

let tasasHistoricas = {
    BCV: JSON.parse(localStorage.getItem('assist_hist_serie_BCV')) || [],
    EUR: JSON.parse(localStorage.getItem('assist_hist_serie_EUR')) || [],
    USDT: JSON.parse(localStorage.getItem('assist_hist_serie_USDT')) || []
};

let tasasVigentesHoy = {
    BCV: { valor: 1, previo: 1, fecha: null },
    EUR: { valor: 1, previo: 1, fecha: null },
    USDT: { valor: 1, previo: 1, fecha: null }
};
let tasasFechaPosterior = { BCV: null, EUR: null, USDT: null };
let hayFechaPosteriorBCV = false;
let usandoFechaPosterior = false;
let fechaHistoricaCalcSeleccionada = null;

function getLocalYYYYMMDD(d = new Date()) {
    const fechaSegura = (d instanceof Date && !isNaN(d.getTime())) ? d : new Date();
    const tzOffset = fechaSegura.getTimezoneOffset() * 60000;
    return new Date(fechaSegura.getTime() - tzOffset).toISOString().split('T')[0];
}

function parsearFechaSeguraLocal(fechaStr) {
    if (!fechaStr) return new Date();
    const str = String(fechaStr).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return new Date(str + 'T00:00:00');
    const d = new Date(str);
    return isNaN(d.getTime()) ? new Date() : d;
}

// ================= GESTIÓN DE COLORES DE CATEGORÍAS =================
function asegurarColoresCategorias() {
    let modificado = false;
    categorias.forEach((cat, idx) => {
        if (!categoriasColores[cat]) {
            categoriasColores[cat] = PALETA_COLORES_CATEGORIAS[idx % PALETA_COLORES_CATEGORIAS.length];
            modificado = true;
        }
    });
    if (modificado) localStorage.setItem('assist_categorias_colores', JSON.stringify(categoriasColores));
}

function obtenerColorCategoria(nombreCat) {
    if (!nombreCat) return '#8E8E93';
    if (nombreCat === 'Ingreso') return '#32D74B';
    if (nombreCat === 'Ahorro') return '#FFD60A';
    if (nombreCat === 'Transferencia / P2P') return '#64D2FF';
    if (categoriasColores[nombreCat]) return categoriasColores[nombreCat];

    let hash = 0;
    for (let i = 0; i < nombreCat.length; i++) hash = nombreCat.charCodeAt(i) + ((hash << 5) - hash);
    const colorAuto = PALETA_COLORES_CATEGORIAS[Math.abs(hash) % PALETA_COLORES_CATEGORIAS.length];
    categoriasColores[nombreCat] = colorAuto;
    localStorage.setItem('assist_categorias_colores', JSON.stringify(categoriasColores));
    return colorAuto;
}

function renderizarPaletaColorNuevaCat() {
    const contenedor = document.getElementById('paleta-color-nueva-cat');
    if (!contenedor) return;
    contenedor.innerHTML = '';
    PALETA_COLORES_CATEGORIAS.forEach(color => {
        const esActivo = color.toLowerCase() === (colorNuevaCategoriaSeleccionado || '').toLowerCase();
        contenedor.innerHTML += `<div class="cat-color-dot-pick ${esActivo ? 'activo' : ''}" style="background: ${color};" onclick="seleccionarColorNuevaCat('${color}')"></div>`;
    });
    const previewBtn = document.getElementById('preview-nueva-cat-color');
    const inputColor = document.getElementById('nueva-categoria-color');
    if (previewBtn) previewBtn.style.background = colorNuevaCategoriaSeleccionado;
    if (inputColor && inputColor.value.toLowerCase() !== colorNuevaCategoriaSeleccionado.toLowerCase()) inputColor.value = colorNuevaCategoriaSeleccionado;
}

function seleccionarColorNuevaCat(color) {
    if (!color) return;
    colorNuevaCategoriaSeleccionado = color;
    renderizarPaletaColorNuevaCat();
}

function abrirSelectorColorCategoria(index) {
    if (index < 0 || index >= categorias.length) return;
    categoriaEditandoColorIndex = index;
    const catNombre = categorias[index];
    const colorActual = obtenerColorCategoria(catNombre);

    const boxEditar = document.getElementById('box-editar-color-existente');
    const lblNombre = document.getElementById('lbl-editar-color-cat-nombre');
    const previewColor = document.getElementById('preview-editar-cat-color');
    const inputColorLibre = document.getElementById('input-color-libre-cat-existente');
    const paletaContenedor = document.getElementById('paleta-editar-cat-existente');

    if (lblNombre) lblNombre.innerText = `Cambiar color: ${catNombre}`;
    if (previewColor) previewColor.style.background = colorActual;
    if (inputColorLibre) inputColorLibre.value = colorActual;
    if (paletaContenedor) {
        paletaContenedor.innerHTML = PALETA_COLORES_CATEGORIAS.map(color => {
            const esActivo = color.toLowerCase() === (colorActual || '').toLowerCase();
            return `<div class="cat-color-dot-pick ${esActivo ? 'activo' : ''}" style="background: ${color};" onclick="seleccionarColorCategoriaExistente('${color}')"></div>`;
        }).join('');
    }
    if (boxEditar) {
        boxEditar.classList.remove('oculto');
        boxEditar.style.display = 'block';
    }
}

function seleccionarColorCategoriaExistente(nuevoColor) {
    if (!nuevoColor || categoriaEditandoColorIndex === null || categoriaEditandoColorIndex < 0 || categoriaEditandoColorIndex >= categorias.length) return;
    const catNombre = categorias[categoriaEditandoColorIndex];
    categoriasColores[catNombre] = nuevoColor;
    localStorage.setItem('assist_categorias_colores', JSON.stringify(categoriasColores));

    abrirSelectorColorCategoria(categoriaEditandoColorIndex);
    renderizarListasGestion();
    actualizarInterfaz();
    if (usuarioActual) sincronizarHaciaNube().catch(e => console.error(e));
}

function cerrarSelectorColorCategoriaExistente() {
    const boxEditar = document.getElementById('box-editar-color-existente');
    if (boxEditar) {
        boxEditar.classList.add('oculto');
        boxEditar.style.display = 'none';
    }
    categoriaEditandoColorIndex = null;
}

function aplicarCambioColorCategoriaExistente(event) {
    const nuevoColor = event && event.target ? event.target.value : null;
    if (nuevoColor) seleccionarColorCategoriaExistente(nuevoColor);
}

// ================= PERFIL DE USUARIO Y AVATAR =================
function actualizarUIPerfil() {
    const avatarSrc = userAvatar || 'logo.jpg';
    const tieneAvatar = Boolean(userAvatar);

    const headerAvatar = document.getElementById('header-user-avatar');
    const settingsAvatar = document.getElementById('settings-user-avatar');
    const modalAvatar = document.getElementById('modal-user-avatar');
    if (headerAvatar) headerAvatar.src = avatarSrc;
    if (settingsAvatar) settingsAvatar.src = avatarSrc;
    if (modalAvatar) modalAvatar.src = avatarSrc;

    const inNombreSettings = document.getElementById('in-perfil-nombre');
    const inNombreModal = document.getElementById('in-modal-perfil-nombre');
    if (inNombreSettings && document.activeElement !== inNombreSettings) inNombreSettings.value = userNombre;
    if (inNombreModal && document.activeElement !== inNombreModal) inNombreModal.value = userNombre;

    const subGreeting = document.getElementById('header-greeting-sub');
    if (subGreeting) subGreeting.innerText = userNombre ? `Hola, ${userNombre}` : 'Control de Capital';

    const btnQuitarSettings = document.getElementById('btn-quitar-foto-settings');
    const btnQuitarModal = document.getElementById('btn-quitar-foto-modal');
    if (btnQuitarSettings) {
        btnQuitarSettings.classList.toggle('oculto', !tieneAvatar);
        btnQuitarSettings.style.display = tieneAvatar ? 'inline-block' : 'none';
    }
    if (btnQuitarModal) {
        btnQuitarModal.classList.toggle('oculto', !tieneAvatar);
        btnQuitarModal.style.display = tieneAvatar ? 'inline-block' : 'none';
    }
}

function sincronizarInputsNombre(valor) {
    const inSettings = document.getElementById('in-perfil-nombre');
    const inModal = document.getElementById('in-modal-perfil-nombre');
    if (inSettings && inSettings.value !== valor) inSettings.value = valor;
    if (inModal && inModal.value !== valor) inModal.value = valor;
}

function guardarPerfilUsuario() {
    const inSettings = document.getElementById('in-perfil-nombre');
    const inModal = document.getElementById('in-modal-perfil-nombre');
    const nuevoNombre = (inModal && document.activeElement === inModal) ? inModal.value.trim() : (inSettings ? inSettings.value.trim() : '');

    userNombre = nuevoNombre;
    if (userNombre) localStorage.setItem('assist_user_name', userNombre);
    else localStorage.removeItem('assist_user_name');

    if (inSettings) inSettings.blur();
    if (inModal) inModal.blur();
    actualizarUIPerfil();
    if (usuarioActual) sincronizarHaciaNube().catch(e => console.error(e));
}

function seleccionarFotoPerfil() {
    const input = document.getElementById('in-perfil-img');
    if (input) input.click();
}

function redimensionarAvatarPerfil(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const size = 300;
            canvas.width = size;
            canvas.height = size;
            const minSide = Math.min(img.width, img.height);
            const sx = (img.width - minSide) / 2;
            const sy = (img.height - minSide) / 2;
            ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
            callback(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function procesarFotoPerfil(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    redimensionarAvatarPerfil(file, (base64) => {
        userAvatar = base64;
        localStorage.setItem('assist_user_avatar', userAvatar);
        actualizarUIPerfil();
        if (usuarioActual) sincronizarHaciaNube().catch(e => console.error(e));
    });
    event.target.value = '';
}

function eliminarFotoPerfil() {
    if (!userAvatar) return;
    userAvatar = null;
    localStorage.removeItem('assist_user_avatar');
    actualizarUIPerfil();
    if (usuarioActual) sincronizarHaciaNube().catch(e => console.error(e));
}

// ================= TUTORIAL GUIADO INTERACTIVO (ONBOARDING V3.0) =================
const PASOS_TUTORIAL = [
    {
        icono: "🚀",
        titulo: "Bienvenido a A$$IST 3.0",
        desc: "Tu centro de control financiero personal. Diseñado para ser ultrarrápido, funcionar 100% offline en la calle y adaptarse a la economía real.",
        tip: "✨ <b>Filosofía Local-First + Nube:</b> Todo se guarda al instante en tu teléfono, se sincroniza silenciosamente en la nube y puedes personalizar tu perfil con nombre y foto desde el avatar superior."
    },
    {
        icono: "💳",
        titulo: "1. Cuentas Multidivisa",
        desc: "Registra dónde tienes tu dinero: bancos en <b>Bolívares (VES)</b>, efectivo en <b>Dólares (USD)</b> o billeteras cripto en <b>USDT</b>.",
        tip: "💡 Ve a <b>Ajustes > Gestionar Cuentas</b> para crearlas y ordenarlas con las flechas <b>▲ / ▼</b>. En Inicio, desliza la tarjeta principal hacia los lados para cambiar de cuenta activa."
    },
    {
        icono: "🏷️",
        titulo: "2. Categorías con Color y Memoria",
        desc: "Crea tus categorías personalizadas y asígnales un <b>color propio</b> desde la paleta o el selector libre para identificarlas al instante.",
        tip: "🧠 <b>Memoria inteligente:</b> A$$IST recuerda automáticamente con qué moneda pagaste por última vez cada categoría y puedes cambiar el color de cualquier categoría existente tocando su círculo."
    },
    {
        icono: "⚡",
        titulo: "3. Registro, Tasa USDT y Comisiones",
        desc: "El formulario bloquea monedas incompatibles según la cuenta activa y, si operas en <b>Bs desde una cuenta USDT</b>, te permite editar la tasa USDT exacta.",
        tip: "🇻🇪 <b>Comisiones Bancarias VE:</b> Al registrar un gasto en VES, elige entre <b>Tarjeta/POS (0 Bs)</b>, <b>Pago Móvil P2P (0,30%)</b>, <b>Comercio P2C (1,50%)</b> o comisión manual."
    },
    {
        icono: "🔄",
        titulo: "4. Transferencias P2P en 1 Clic",
        desc: "¿Cambiaste USDT a Bolívares o viceversa? Selecciona <b>Transferir</b> en el panel de registro principal.",
        tip: "⚡ En un solo paso, A$$IST descuenta el saldo de la cuenta de origen y suma el monto convertido en la cuenta destino usando la tasa que indiques."
    },
    {
        icono: "📅",
        titulo: "5. Nueva Agenda de Pagos",
        desc: "Organiza tus deudas, recibos y suscripciones en la pestaña <b>Agenda</b> con vistas de <b>Pendientes</b>, <b>📅 Calendario mensual</b> y <b>Pagados</b>.",
        tip: "🔔 Recibe avisos no invasivos en Inicio cuando un pago vence en <b>≤ 3 días</b>, págalo en 1 clic descontando de tu cuenta (si es mensual avanza al próximo mes) o reviértelo si lo borras del historial."
    },
    {
        icono: "📊",
        titulo: "6. Historial Pro y Metas Visuales",
        desc: "Analiza tus gastos con el nuevo <b>gráfico de dona interactivo</b> con leyenda lateral de colores y porcentajes, o filtra con el botón <b>Total</b> (por Mes/Año) y <b>📅 Día</b>.",
        tip: "🗑️ <b>Swipe to Delete y Reembolso:</b> Desliza hacia la izquierda cualquier movimiento para borrarlo. Y si eliminas una <b>Meta</b> con dinero ahorrado, se reembolsa automáticamente a tu cuenta."
    },
    {
        icono: "🔒",
        titulo: "7. PIN 2.0, Modo Pánico y Temas",
        desc: "Protege tu app con el nuevo <b>teclado numérico integrado en pantalla</b> y <b>3 preguntas de seguridad personalizadas</b> con tolerancia inteligente y pistas sutiles.",
        tip: "🕵️‍♂️ Da <b>doble toque rápido</b> en tu balance para activar el <b>Modo Pánico</b> (********) y personaliza A$$IST con los temas <b>Oscuro</b>, <b>Claro</b> o <b>Liquid Glass</b> y 20 colores de acento."
    },
    {
        icono: "🛠️",
        titulo: "8. AskBot y Calculadora en Vivo",
        desc: "<b>AskBot</b> se encuentra temporalmente en mantenimiento programado mientras reconstruimos su motor de IA desde cero para próximas actualizaciones.",
        tip: "💱 Mientras tanto, la <b>Calculadora Bidireccional</b> con <b>Brecha Cambiaria</b>, <b>Fecha Valor BCV</b> y <b>Calendario Histórico</b> está <b>100% operativa</b> en tiempo real."
    }
];

let pasoTutorialActual = 0;
let tutTouchStartX = 0;

function actualizarHeaderTutorial() {
    const btn = document.getElementById('btn-tutorial-header');
    if (!btn) return;
    const visto = localStorage.getItem('assist_tutorial_visto') === 'true';
    btn.classList.toggle('oculto', visto);
    btn.style.display = visto ? 'none' : 'inline-flex';
}

function iniciarTutorial() {
    pasoTutorialActual = 0;
    renderizarPasoTutorial();
    abrirModal('modal-tutorial');
}

function renderizarPasoTutorial() {
    const paso = PASOS_TUTORIAL[pasoTutorialActual];
    if (!paso) return;
    const slideBody = document.getElementById('tut-slide-body');
    if (slideBody) {
        slideBody.style.animation = 'none';
        void slideBody.offsetWidth;
        slideBody.style.animation = 'scaleFadeIn 0.35s var(--ios-spring) forwards';
    }
    document.getElementById('tut-icono').innerText = paso.icono;
    document.getElementById('tut-titulo').innerText = paso.titulo;
    document.getElementById('tut-desc').innerHTML = paso.desc;
    document.getElementById('tut-detalle').innerHTML = paso.tip;
    document.getElementById('tut-paso-contador').innerText = `PASO ${pasoTutorialActual + 1} DE ${PASOS_TUTORIAL.length}`;

    const dotsContainer = document.getElementById('tut-dots');
    if (dotsContainer) {
        dotsContainer.innerHTML = '';
        PASOS_TUTORIAL.forEach((_, idx) => {
            dotsContainer.innerHTML += `<div class="tut-dot ${idx === pasoTutorialActual ? 'activo' : ''}"></div>`;
        });
    }
    const btnPrev = document.getElementById('btn-tut-prev');
    const btnNext = document.getElementById('btn-tut-next');
    if (btnPrev) {
        btnPrev.disabled = (pasoTutorialActual === 0);
        btnPrev.style.opacity = (pasoTutorialActual === 0) ? '0.35' : '1';
    }
    if (btnNext) btnNext.innerText = (pasoTutorialActual === PASOS_TUTORIAL.length - 1) ? "¡Empezar!" : "Siguiente";
}

function moverPasoTutorial(direccion) {
    pasoTutorialActual += direccion;
    if (pasoTutorialActual < 0) { pasoTutorialActual = 0; return; }
    if (pasoTutorialActual >= PASOS_TUTORIAL.length) { completarTutorial(); return; }
    renderizarPasoTutorial();
}

function completarTutorial() {
    localStorage.setItem('assist_tutorial_visto', 'true');
    cerrarModal('modal-tutorial');
    actualizarHeaderTutorial();
}

function omitirTutorial() { completarTutorial(); }
function tutTouchStart(e) { tutTouchStartX = e.changedTouches[0].screenX; }
function tutTouchEnd(e) {
    const diff = e.changedTouches[0].screenX - tutTouchStartX;
    if (diff < -45) moverPasoTutorial(1);
    else if (diff > 45) moverPasoTutorial(-1);
}

// ================= AUTENTICACIÓN Y SINCRONIZACIÓN SUPABASE =================
function cambiarModoAuth(modo) {
    authModoActual = modo;
    document.getElementById('seg-auth-login').classList.toggle('activo', modo === 'login');
    document.getElementById('seg-auth-registro').classList.toggle('activo', modo === 'registro');
    document.getElementById('btn-auth-submit').innerText = modo === 'login' ? 'Entrar a mi cuenta' : 'Crear cuenta y respaldar';
    const errEl = document.getElementById('auth-error-msg');
    if (errEl) { errEl.classList.add('oculto'); errEl.style.display = 'none'; }
}

function mostrarErrorAuth(msg) {
    const errEl = document.getElementById('auth-error-msg');
    if (!errEl) return alert(msg);
    errEl.innerText = msg;
    errEl.classList.remove('oculto');
    errEl.style.display = 'block';
}

function abrirPantallaAuth() {
    const authScreen = document.getElementById('auth-screen');
    if (!authScreen) return;
    cambiarModoAuth('login');
    authScreen.classList.remove('oculto');
}

function continuarSinCuenta() {
    localStorage.setItem('assist_skip_auth', 'true');
    const authScreen = document.getElementById('auth-screen');
    const appContainer = document.getElementById('app-main-container');
    if (authScreen) authScreen.classList.add('oculto');
    if (!appPin && appContainer) appContainer.classList.add('app-unlocked');
    actualizarUIEstadoNube();
    actualizarHeaderTutorial();
    if (localStorage.getItem('assist_tutorial_visto') !== 'true' && !tieneDatosLocales()) {
        setTimeout(() => iniciarTutorial(), 350);
    }
}

function tieneDatosLocales() {
    return (cuentas.length > 0 || transacciones.length > 0 || metas.length > 0 || categorias.length > 0 || agendaPagos.length > 0);
}

function actualizarUIEstadoNube() {
    const badge = document.getElementById('cloud-status-badge');
    const boxOut = document.getElementById('cloud-logged-out-box');
    const boxIn = document.getElementById('cloud-logged-in-box');
    const emailEl = document.getElementById('cloud-user-email');

    const modalBadge = document.getElementById('modal-cloud-status-badge');
    const modalBoxOut = document.getElementById('modal-cloud-logged-out-box');
    const modalBoxIn = document.getElementById('modal-cloud-logged-in-box');
    const modalEmailEl = document.getElementById('modal-cloud-user-email');
    const headerDot = document.getElementById('header-avatar-dot');

    if (usuarioActual) {
        if (boxOut) { boxOut.classList.add('oculto'); boxOut.style.display = 'none'; }
        if (boxIn) { boxIn.classList.remove('oculto'); boxIn.style.display = 'flex'; }
        if (emailEl) emailEl.innerText = usuarioActual.email;
        if (modalBoxOut) { modalBoxOut.classList.add('oculto'); modalBoxOut.style.display = 'none'; }
        if (modalBoxIn) { modalBoxIn.classList.remove('oculto'); modalBoxIn.style.display = 'flex'; }
        if (modalEmailEl) modalEmailEl.innerText = usuarioActual.email;

        const pendiente = localStorage.getItem('assist_pending_sync') === 'true';
        if (!navigator.onLine || pendiente) {
            if (badge) { badge.innerText = 'Pendiente (Sin señal)'; badge.className = 'cloud-badge pendiente'; }
            if (modalBadge) { modalBadge.innerText = 'Pendiente (Sin señal)'; modalBadge.className = 'cloud-badge pendiente'; }
            if (headerDot) headerDot.className = 'avatar-online-dot pendiente';
        } else {
            if (badge) { badge.innerText = 'Sincronizado ☁️'; badge.className = 'cloud-badge conectado'; }
            if (modalBadge) { modalBadge.innerText = 'Sincronizado ☁️'; modalBadge.className = 'cloud-badge conectado'; }
            if (headerDot) headerDot.className = 'avatar-online-dot conectado';
        }
    } else {
        if (boxOut) { boxOut.classList.remove('oculto'); boxOut.style.display = 'block'; }
        if (boxIn) { boxIn.classList.add('oculto'); boxIn.style.display = 'none'; }
        if (badge) { badge.innerText = 'Solo Local'; badge.className = 'cloud-badge desconectado'; }
        if (modalBoxOut) { modalBoxOut.classList.remove('oculto'); modalBoxOut.style.display = 'block'; }
        if (modalBoxIn) { modalBoxIn.classList.add('oculto'); modalBoxIn.style.display = 'none'; }
        if (modalBadge) { modalBadge.innerText = 'Solo Local'; modalBadge.className = 'cloud-badge desconectado'; }
        if (headerDot) headerDot.className = 'avatar-online-dot desconectado';
    }
    actualizarUIPerfil();
}

async function procesarAuth() {
    if (!supabaseClient) return mostrarErrorAuth("Librería de nube no disponible.");
    if (!navigator.onLine) return mostrarErrorAuth("Necesitas conexión a internet para iniciar sesión o registrarte.");

    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const btn = document.getElementById('btn-auth-submit');

    if (!email || !password) return mostrarErrorAuth("Ingresa tu correo y contraseña.");
    if (password.length < 6) return mostrarErrorAuth("La contraseña debe tener al menos 6 caracteres.");

    btn.disabled = true;
    const textoOriginal = btn.innerText;
    btn.innerText = "Conectando...";
    const eraUsuarioNuevoSinDatos = !tieneDatosLocales();

    try {
        if (authModoActual === 'registro') {
            const { data, error } = await supabaseClient.auth.signUp({ email, password });
            if (error) throw error;
            usuarioActual = data.user;
            if (usuarioActual && tieneDatosLocales()) await sincronizarHaciaNube();
            else if (usuarioActual) await descargarDesdeNube();
        } else {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            usuarioActual = data.user;
            if (usuarioActual) {
                const descargado = await descargarDesdeNube();
                if (!descargado && tieneDatosLocales()) await sincronizarHaciaNube();
            }
        }

        localStorage.removeItem('assist_skip_auth');
        document.getElementById('auth-email').value = '';
        document.getElementById('auth-password').value = '';
        document.getElementById('auth-screen').classList.add('oculto');
        document.getElementById('app-main-container').classList.add('app-unlocked');
        actualizarUIEstadoNube();
        actualizarHeaderTutorial();
        cargarSelects();
        renderizarListasGestion();
        actualizarInterfaz();

        if (localStorage.getItem('assist_tutorial_visto') !== 'true' && (authModoActual === 'registro' || !tieneDatosLocales()) && eraUsuarioNuevoSinDatos) {
            setTimeout(() => iniciarTutorial(), 400);
        }
    } catch (err) {
        mostrarErrorAuth(err.message || "Error al autenticar. Verifica tus datos.");
    } finally {
        btn.disabled = false;
        btn.innerText = textoOriginal;
    }
}

async function sincronizarHaciaNube() {
    if (!supabaseClient || !usuarioActual) return;
    if (!navigator.onLine) {
        localStorage.setItem('assist_pending_sync', 'true');
        actualizarUIEstadoNube();
        return;
    }
    if (sincronizandoNube) return;
    sincronizandoNube = true;

    try {
        const uid = usuarioActual.id;
        const ahora = new Date().toISOString();

        const basePerfil = {
            user_id: uid,
            email: usuarioActual.email,
            theme_mode: localStorage.getItem('app_theme_mode') || 'dark',
            theme_color: localStorage.getItem('app_theme_color') || '#FFFFFF',
            app_pin: appPin,
            censurado: censurado,
            updated_at: ahora
        };

        let { error: errPerfil } = await supabaseClient.from('perfiles').upsert({
            ...basePerfil,
            user_name: userNombre || null,
            avatar_url: userAvatar || null,
            pin_questions: pinQuestions.length === 3 ? JSON.stringify(pinQuestions) : null,
            categorias_colores: Object.keys(categoriasColores).length > 0 ? JSON.stringify(categoriasColores) : null,
            agenda_pagos: JSON.stringify(agendaPagos)
        });

        if (errPerfil) {
            let retryColores = await supabaseClient.from('perfiles').upsert({
                ...basePerfil,
                user_name: userNombre || null,
                avatar_url: userAvatar || null,
                pin_questions: pinQuestions.length === 3 ? JSON.stringify(pinQuestions) : null,
                categorias_colores: Object.keys(categoriasColores).length > 0 ? JSON.stringify(categoriasColores) : null
            });
            if (retryColores.error) {
                let retryPin = await supabaseClient.from('perfiles').upsert({
                    ...basePerfil,
                    user_name: userNombre || null,
                    avatar_url: userAvatar || null,
                    pin_questions: pinQuestions.length === 3 ? JSON.stringify(pinQuestions) : null
                });
                if (retryPin.error) {
                    let retry1 = await supabaseClient.from('perfiles').upsert({
                        ...basePerfil,
                        user_name: userNombre || null,
                        avatar_url: userAvatar || null
                    });
                    if (retry1.error) {
                        const retry2 = await supabaseClient.from('perfiles').upsert(basePerfil);
                        if (retry2.error) throw retry2.error;
                    }
                }
            }
        }

        await supabaseClient.from('cuentas').delete().eq('user_id', uid);
        if (cuentas.length > 0) {
            const filasCuentas = cuentas.map((c, idx) => ({
                user_id: uid, id: String(c.id), nombre: c.nombre, moneda: c.moneda, orden: idx, updated_at: ahora
            }));
            const { error: errCuentas } = await supabaseClient.from('cuentas').upsert(filasCuentas);
            if (errCuentas) throw errCuentas;
        }

        await supabaseClient.from('categorias').delete().eq('user_id', uid);
        if (categorias.length > 0) {
            const categoriasUnicas = [...new Set(categorias)];
            const filasCat = categoriasUnicas.map((cat, idx) => ({
                user_id: uid, nombre: String(cat), orden: idx
            }));
            const { error: errCat } = await supabaseClient.from('categorias').upsert(filasCat);
            if (errCat) throw errCat;
        }

        await supabaseClient.from('metas').delete().eq('user_id', uid);
        if (metas.length > 0) {
            const filasMetas = metas.map((m, idx) => ({
                user_id: uid, id: String(m.id), nombre: m.nombre, acumulado: Number(m.acumulado) || 0,
                objetivo: Number(m.objetivo) || 0, moneda: m.moneda || 'USD', imagen: m.imagen || null, orden: idx, updated_at: ahora
            }));
            const { error: errMetas } = await supabaseClient.from('metas').upsert(filasMetas);
            if (errMetas) throw errMetas;
        }

        await supabaseClient.from('transacciones').delete().eq('user_id', uid);
        if (transacciones.length > 0) {
            const filasTrans = transacciones.map((t, idx) => {
                let fechaValida = new Date();
                if (t.fecha) {
                    const parsed = new Date(t.fecha);
                    if (!isNaN(parsed.getTime())) fechaValida = parsed;
                } else if (t.id && !isNaN(Number(t.id))) {
                    const parsedId = new Date(Number(t.id));
                    if (!isNaN(parsedId.getTime())) fechaValida = parsedId;
                }
                return {
                    user_id: uid,
                    id: t.id !== undefined && t.id !== null ? String(t.id) : `${Date.now()}_${idx}`,
                    cuenta_id: String(t.cuentaId),
                    monto_usd: Number(t.montoUSD) || 0,
                    tipo: t.tipo || 'gasto',
                    categoria: t.categoria || 'Varios',
                    nota: t.nota || '',
                    moneda_input_original: t.monedaInputOriginal || 'USD',
                    fecha_formateada: t.fechaFormateada || '',
                    fecha: fechaValida.toISOString(),
                    fecha_iso_local: t.fechaIsoLocal || getLocalYYYYMMDD(fechaValida),
                    updated_at: ahora
                };
            });
            const { error: errTrans } = await supabaseClient.from('transacciones').upsert(filasTrans);
            if (errTrans) throw errTrans;
        }

        localStorage.removeItem('assist_pending_sync');
        actualizarUIEstadoNube();
    } catch (err) {
        console.error("Error al sincronizar con Supabase:", err);
        localStorage.setItem('assist_pending_sync', 'true');
        actualizarUIEstadoNube();
        throw err;
    } finally {
        sincronizandoNube = false;
    }
}

async function descargarDesdeNube() {
    if (!supabaseClient || !usuarioActual || !navigator.onLine) return false;
    try {
        const uid = usuarioActual.id;
        const [resPerfil, resCuentas, resCat, resMetas, resTrans] = await Promise.all([
            supabaseClient.from('perfiles').select('*').eq('user_id', uid).maybeSingle(),
            supabaseClient.from('cuentas').select('*').eq('user_id', uid).order('orden', { ascending: true }),
            supabaseClient.from('categorias').select('*').eq('user_id', uid).order('orden', { ascending: true }),
            supabaseClient.from('metas').select('*').eq('user_id', uid).order('orden', { ascending: true }),
            supabaseClient.from('transacciones').select('*').eq('user_id', uid)
        ]);

        const hayDatosEnNube = (
            (resCuentas.data && resCuentas.data.length > 0) ||
            (resTrans.data && resTrans.data.length > 0) ||
            (resMetas.data && resMetas.data.length > 0) ||
            (resCat.data && resCat.data.length > 0)
        );
        if (!hayDatosEnNube && !resPerfil.data) return false;

        const necesitaSubirTransLocales = (!resTrans.data || resTrans.data.length === 0) && transacciones.length > 0;

        if (resPerfil.data) {
            if (resPerfil.data.theme_color) cambiarColorAcento(resPerfil.data.theme_color, true);
            if (resPerfil.data.theme_mode) cambiarModo(resPerfil.data.theme_mode, true);
            if (resPerfil.data.app_pin !== undefined) {
                appPin = resPerfil.data.app_pin;
                if (appPin) localStorage.setItem('app_pin', appPin);
                else localStorage.removeItem('app_pin');
            }
            if (resPerfil.data.pin_questions) {
                try {
                    const parsedQ = typeof resPerfil.data.pin_questions === 'string' ? JSON.parse(resPerfil.data.pin_questions) : resPerfil.data.pin_questions;
                    if (Array.isArray(parsedQ) && parsedQ.length === 3) {
                        pinQuestions = parsedQ;
                        localStorage.setItem('assist_pin_questions', JSON.stringify(pinQuestions));
                    }
                } catch (e) { console.error(e); }
            }
            if (resPerfil.data.categorias_colores) {
                try {
                    const parsedCol = typeof resPerfil.data.categorias_colores === 'string' ? JSON.parse(resPerfil.data.categorias_colores) : resPerfil.data.categorias_colores;
                    if (parsedCol && typeof parsedCol === 'object') {
                        categoriasColores = { ...categoriasColores, ...parsedCol };
                        localStorage.setItem('assist_categorias_colores', JSON.stringify(categoriasColores));
                    }
                } catch (e) { console.error(e); }
            }
            if (resPerfil.data.agenda_pagos !== undefined && resPerfil.data.agenda_pagos !== null) {
                try {
                    const parsedAgenda = typeof resPerfil.data.agenda_pagos === 'string' ? JSON.parse(resPerfil.data.agenda_pagos) : resPerfil.data.agenda_pagos;
                    if (Array.isArray(parsedAgenda)) {
                        agendaPagos = parsedAgenda;
                        localStorage.setItem('assist_agenda_pagos', JSON.stringify(agendaPagos));
                    }
                } catch (e) { console.error(e); }
            }
            if (typeof resPerfil.data.censurado === 'boolean') {
                censurado = resPerfil.data.censurado;
                localStorage.setItem('censurado', censurado);
            }
            if (resPerfil.data.user_name) {
                userNombre = resPerfil.data.user_name;
                localStorage.setItem('assist_user_name', userNombre);
            }
            if (resPerfil.data.avatar_url) {
                userAvatar = resPerfil.data.avatar_url;
                localStorage.setItem('assist_user_avatar', userAvatar);
            }
        }

        if (resCuentas.data && resCuentas.data.length > 0) {
            cuentas = resCuentas.data.map(c => ({ id: isNaN(Number(c.id)) ? c.id : Number(c.id), nombre: c.nombre, moneda: c.moneda }));
        }
        if (resCat.data && resCat.data.length > 0) {
            categorias = resCat.data.map(c => c.nombre);
            asegurarColoresCategorias();
        }
        if (resMetas.data && resMetas.data.length > 0) {
            metas = resMetas.data.map(m => ({
                id: isNaN(Number(m.id)) ? m.id : Number(m.id), nombre: m.nombre,
                acumulado: Number(m.acumulado) || 0, objetivo: Number(m.objetivo) || 0,
                moneda: m.moneda || 'USD', imagen: m.imagen || null
            }));
        }
        if (resTrans.data && resTrans.data.length > 0) {
            transacciones = resTrans.data.map(t => ({
                id: isNaN(Number(t.id)) ? t.id : Number(t.id),
                cuentaId: isNaN(Number(t.cuenta_id)) ? t.cuenta_id : Number(t.cuenta_id),
                montoUSD: Number(t.monto_usd) || 0,
                tipo: t.tipo,
                categoria: t.categoria,
                nota: t.nota || '',
                monedaInputOriginal: t.moneda_input_original || 'USD',
                fechaFormateada: t.fecha_formateada || '',
                fecha: t.fecha,
                fechaIsoLocal: t.fecha_iso_local
            }));
            transacciones.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        }

        cuentaActivaId = cuentas.length > 0 ? cuentas[0].id : null;
        localStorage.setItem('cuentas', JSON.stringify(cuentas));
        localStorage.setItem('categorias', JSON.stringify(categorias));
        localStorage.setItem('transacciones', JSON.stringify(transacciones));
        localStorage.setItem('metas', JSON.stringify(metas));
        localStorage.setItem('assist_agenda_pagos', JSON.stringify(agendaPagos));

        if (necesitaSubirTransLocales) await sincronizarHaciaNube();
        else localStorage.removeItem('assist_pending_sync');

        cargarSelects();
        renderizarListasGestion();
        actualizarInterfaz();
        actualizarUIEstadoNube();
        return true;
    } catch (err) {
        console.error("Error al descargar datos de Supabase:", err);
        return false;
    }
}

async function forzarSincronizacionManual() {
    if (!navigator.onLine) return alert("Sin conexión a internet. Tus datos siguen seguros en tu teléfono.");
    try {
        await sincronizarHaciaNube();
        alert("☁️ ¡Datos sincronizados con éxito en la nube!");
    } catch (e) {
        alert("⚠️ Hubo un detalle al sincronizar: " + (e.message || "Intenta de nuevo."));
    }
}

async function cerrarSesionNube() {
    if (!confirm("¿Deseas cerrar tu sesión en la nube en este dispositivo?")) return;
    if (navigator.onLine && usuarioActual) {
        try { await sincronizarHaciaNube(); } catch (e) { console.error(e); }
        await supabaseClient.auth.signOut();
    }
    usuarioActual = null;
    transacciones = [];
    categorias = [];
    categoriasColores = {};
    cuentas = [];
    metas = [];
    agendaPagos = [];
    appPin = null;
    pinQuestions = [];
    cuentaActivaId = null;

    localStorage.removeItem('transacciones');
    localStorage.removeItem('categorias');
    localStorage.removeItem('assist_categorias_colores');
    localStorage.removeItem('cuentas');
    localStorage.removeItem('metas');
    localStorage.removeItem('assist_agenda_pagos');
    localStorage.removeItem('app_pin');
    localStorage.removeItem('assist_pin_questions');
    localStorage.removeItem('assist_skip_auth');
    localStorage.removeItem('assist_pending_sync');

    cargarSelects();
    renderizarListasGestion();
    actualizarInterfaz();
    actualizarUIEstadoNube();
    abrirPantallaAuth();
}

window.addEventListener('online', () => {
    actualizarUIEstadoNube();
    if (usuarioActual && localStorage.getItem('assist_pending_sync') === 'true') {
        sincronizarHaciaNube().catch(e => console.error(e));
    }
});
window.addEventListener('offline', () => actualizarUIEstadoNube());

// ================= SEGURIDAD PIN 2.0 (TECLADO NUMÉRICO EN PANTALLA), PREGUNTAS Y CARGA =================
let nivelPistaRecuperacion = 0;
let preguntaRecuperacionIdx = 0;
let verificandoPinEnCurso = false;

function enfocarInputPIN(event) {
    if (event && event.target && event.target.closest('.btn-forgot-pin')) return;
}

function actualizarIndicadoresPIN(estado = '') {
    const pinInput = document.getElementById('input-pin');
    const dots = document.querySelectorAll('#pin-dots-row .pin-dot-ind');
    const len = pinInput ? pinInput.value.length : 0;

    dots.forEach((dot, idx) => {
        dot.classList.remove('activo', 'error', 'exito');
        if (estado === 'error') dot.classList.add('error');
        else if (estado === 'exito') dot.classList.add('exito');
        else if (idx < len) dot.classList.add('activo');
    });
}

function mostrarPantallaPINInteractiva(enfocar = true) {
    const pinScreen = document.getElementById('pin-screen');
    const pinCard = document.getElementById('pin-box-card');
    const pinInput = document.getElementById('input-pin');
    const errEl = document.getElementById('pin-error-feedback');

    if (!pinScreen) return;
    if (pinInput) pinInput.value = '';
    actualizarIndicadoresPIN();

    if (errEl) {
        errEl.innerText = '';
        errEl.classList.add('oculto');
    }
    pinScreen.classList.remove('oculto');
    pinScreen.style.opacity = '1';

    if (pinCard) {
        pinCard.classList.remove('pin-enter-active');
        void pinCard.offsetWidth;
        pinCard.classList.add('pin-enter-active');
    }
}

function presionarDigitoPIN(digito) {
    if (verificandoPinEnCurso) return;
    const pinInput = document.getElementById('input-pin');
    if (!pinInput) return;

    const errEl = document.getElementById('pin-error-feedback');
    if (errEl && !errEl.classList.contains('oculto')) errEl.classList.add('oculto');

    const actual = (pinInput.value || '').replace(/\D/g, '');
    if (actual.length >= 4) return;

    pinInput.value = actual + String(digito).replace(/\D/g, '').slice(0, 1);
    actualizarIndicadoresPIN();

    if (pinInput.value.length === 4) verificarPIN();
}

function borrarDigitoPIN() {
    if (verificandoPinEnCurso) return;
    const pinInput = document.getElementById('input-pin');
    if (!pinInput || !pinInput.value) return;

    pinInput.value = pinInput.value.slice(0, -1);
    const errEl = document.getElementById('pin-error-feedback');
    if (errEl && !errEl.classList.contains('oculto')) errEl.classList.add('oculto');
    actualizarIndicadoresPIN();
}

window.addEventListener('load', () => {
    const savedThemeColor = localStorage.getItem('app_theme_color') || '#FFFFFF';
    const savedThemeMode = localStorage.getItem('app_theme_mode') || 'dark';
    cambiarColorAcento(savedThemeColor, true);
    cambiarModo(savedThemeMode, true);

    document.getElementById('val-fecha').value = getLocalYYYYMMDD();
    actualizarHeaderTutorial();
    actualizarUIPerfil();

    const splash = document.getElementById('splash-screen');
    const pinScreen = document.getElementById('pin-screen');
    const appContainer = document.getElementById('app-main-container');
    
    if (appPin) {
        pinScreen.style.zIndex = '99998'; 
        mostrarPantallaPINInteractiva(false);
    }
    
    setTimeout(() => {
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.style.display = 'none';
            if (appPin) {
                pinScreen.style.zIndex = '100000'; 
                mostrarPantallaPINInteractiva(true);
            } else {
                const skipAuth = localStorage.getItem('assist_skip_auth') === 'true';
                if (!usuarioActual && !tieneDatosLocales() && !skipAuth) abrirPantallaAuth();
                else appContainer.classList.add('app-unlocked');
            }
        }, 500); 
    }, 1200); 
});

window.addEventListener('keydown', (e) => {
    const pinScreen = document.getElementById('pin-screen');
    const modalRec = document.getElementById('modal-recuperar-pin');
    if (!pinScreen || pinScreen.classList.contains('oculto')) return;
    if (modalRec && !modalRec.classList.contains('oculto')) return;

    if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        presionarDigitoPIN(e.key);
    } else if (e.key === 'Backspace') {
        e.preventDefault();
        borrarDigitoPIN();
    }
});

function cambiarColorAcento(color, omitirSync = false) {
    document.documentElement.style.setProperty('--accent', color);
    localStorage.setItem('app_theme_color', color);
    if (!omitirSync && usuarioActual) sincronizarHaciaNube().catch(e => console.error(e));
}

function cambiarModo(modo, omitirSync = false) {
    document.documentElement.setAttribute('data-theme', modo);
    document.body.setAttribute('data-theme', modo);
    localStorage.setItem('app_theme_mode', modo);
    if (!omitirSync && usuarioActual) sincronizarHaciaNube().catch(e => console.error(e));
}

let timeoutBloqueo;
function reiniciarInactividad() {
    clearTimeout(timeoutBloqueo);
    if (appPin) {
        timeoutBloqueo = setTimeout(() => {
            document.getElementById('app-main-container').classList.remove('app-unlocked');
            mostrarPantallaPINInteractiva(true);
        }, 3 * 60 * 1000); 
    }
}
window.addEventListener('touchstart', reiniciarInactividad);
window.addEventListener('click', reiniciarInactividad);

let lastTap = 0;
document.getElementById('slider-cuentas-wrapper').addEventListener('touchstart', (e) => {
    if(e.target.closest('button')) return; 
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    if (tapLength < 300 && tapLength > 0) {
        toggleCensura();
        e.preventDefault();
    }
    lastTap = currentTime;
});

document.getElementById('input-pin').addEventListener('input', function() {
    if (verificandoPinEnCurso) return;
    this.value = this.value.replace(/\D/g, '').slice(0, 4);
    const errEl = document.getElementById('pin-error-feedback');
    if (errEl && !errEl.classList.contains('oculto')) errEl.classList.add('oculto');
    actualizarIndicadoresPIN();
    if (this.value.length === 4) verificarPIN();
});

function verificarPIN() {
    const input = document.getElementById('input-pin');
    if (!input || verificandoPinEnCurso) return;

    if (input.value === appPin) {
        verificandoPinEnCurso = true;
        actualizarIndicadoresPIN('exito');
        const screen = document.getElementById('pin-screen');
        const container = document.getElementById('app-main-container');

        setTimeout(() => {
            screen.style.opacity = '0';
            container.classList.add('app-unlocked');
            setTimeout(() => {
                screen.classList.add('oculto');
                screen.style.opacity = '1';
                input.value = '';
                actualizarIndicadoresPIN();
                verificandoPinEnCurso = false;
            }, 240);
        }, 120);
        reiniciarInactividad();
    } else {
        verificandoPinEnCurso = true;
        actualizarIndicadoresPIN('error');
        const area = document.getElementById('pin-interactive-area');
        const errEl = document.getElementById('pin-error-feedback');

        if (errEl) {
            errEl.innerText = 'PIN incorrecto. Inténtalo de nuevo.';
            errEl.classList.remove('oculto');
        }
        if (area) {
            area.classList.remove('pin-shake');
            void area.offsetWidth;
            area.classList.add('pin-shake');
        }
        setTimeout(() => {
            input.value = '';
            actualizarIndicadoresPIN();
            verificandoPinEnCurso = false;
        }, 420);
    }
}

function configurarPIN() {
    const inPin = document.getElementById('in-new-pin');
    const badge = document.getElementById('badge-estado-pin');
    const btnDesactivar = document.getElementById('btn-desactivar-pin');
    const msgEl = document.getElementById('config-pin-msg');

    if (inPin) inPin.value = appPin || '';
    for (let i = 0; i < 3; i++) {
        const qInput = document.getElementById(`in-pin-q${i + 1}`);
        const aInput = document.getElementById(`in-pin-a${i + 1}`);
        const item = pinQuestions[i] || { q: '', a: '' };
        if (qInput) qInput.value = item.q || '';
        if (aInput) aInput.value = item.a || '';
    }

    if (badge) {
        if (appPin) { badge.innerText = 'Activo 🔒'; badge.className = 'cloud-badge conectado'; }
        else { badge.innerText = 'Inactivo'; badge.className = 'cloud-badge desconectado'; }
    }
    if (btnDesactivar) {
        btnDesactivar.classList.toggle('oculto', !appPin);
        btnDesactivar.style.display = appPin ? 'flex' : 'none';
    }
    if (msgEl) { msgEl.innerText = ''; msgEl.classList.add('oculto'); }
    abrirModal('modal-config-pin');
}

function mostrarMensajeConfigPIN(texto, esExito = false) {
    const msgEl = document.getElementById('config-pin-msg');
    if (!msgEl) return alert(texto);
    msgEl.innerText = texto;
    msgEl.style.color = esExito ? '#32D74B' : '#FF453A';
    msgEl.classList.remove('oculto');
}

function guardarConfiguracionPIN() {
    const inPin = document.getElementById('in-new-pin');
    const nuevoPin = inPin ? inPin.value.replace(/\D/g, '').trim() : '';
    if (nuevoPin.length !== 4) return mostrarMensajeConfigPIN('⚠️ El PIN debe tener exactamente 4 dígitos numéricos.');

    const nuevasPreguntas = [];
    for (let i = 1; i <= 3; i++) {
        const q = (document.getElementById(`in-pin-q${i}`)?.value || '').trim();
        const a = (document.getElementById(`in-pin-a${i}`)?.value || '').trim();
        if (!q || !a) return mostrarMensajeConfigPIN(`⚠️ Completa la Pregunta ${i} y su respuesta corta para proteger tu PIN.`);
        nuevasPreguntas.push({ q, a });
    }

    appPin = nuevoPin;
    pinQuestions = nuevasPreguntas;
    localStorage.setItem('app_pin', appPin);
    localStorage.setItem('assist_pin_questions', JSON.stringify(pinQuestions));

    reiniciarInactividad();
    if (usuarioActual) sincronizarHaciaNube().catch(e => console.error(e));

    mostrarMensajeConfigPIN('✅ ¡PIN y preguntas de seguridad guardados!', true);
    setTimeout(() => cerrarModal('modal-config-pin'), 550);
}

function desactivarPINActual() {
    if (!confirm('¿Deseas desactivar el bloqueo por PIN en este dispositivo?')) return;
    localStorage.removeItem('app_pin');
    appPin = null;
    clearTimeout(timeoutBloqueo);
    if (usuarioActual) sincronizarHaciaNube().catch(e => console.error(e));
    cerrarModal('modal-config-pin');
}

// ================= MOTOR INTELIGENTE DE 1 PREGUNTA ALEATORIA, TOLERANCIA Y PISTAS =================
function normalizarRespuestaSeguridad(str) {
    if (!str) return '';
    return String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function distanciaEdicionDamerau(a, b) {
    const lenA = a.length, lenB = b.length;
    if (lenA === 0) return lenB;
    if (lenB === 0) return lenA;

    const dp = Array.from({ length: lenA + 1 }, () => new Array(lenB + 1).fill(0));
    for (let i = 0; i <= lenA; i++) dp[i][0] = i;
    for (let j = 0; j <= lenB; j++) dp[0][j] = j;

    for (let i = 1; i <= lenA; i++) {
        for (let j = 1; j <= lenB; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
            if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
                dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + cost);
            }
        }
    }
    return dp[lenA][lenB];
}

function palabrasCoincidenConTolerancia(palabraUser, palabraMeta) {
    if (!palabraUser || !palabraMeta) return false;
    if (palabraUser === palabraMeta) return true;
    if (palabraMeta.length >= 4 && palabraUser.includes(palabraMeta)) return true;

    if (palabraUser.length === palabraMeta.length && palabraMeta.length >= 4) {
        const sortU = palabraUser.split('').sort().join('');
        const sortM = palabraMeta.split('').sort().join('');
        if (sortU === sortM && distanciaEdicionDamerau(palabraUser, palabraMeta) <= 2) return true;
    }

    if (Math.abs(palabraUser.length - palabraMeta.length) > 2) return false;
    const dist = distanciaEdicionDamerau(palabraUser, palabraMeta);
    if (palabraMeta.length >= 6 && palabraUser[0] === palabraMeta[0] && dist <= 2) return true;
    if (palabraMeta.length >= 4 && dist <= 1) return true;
    return false;
}

function esRespuestaSeguridadValida(inputUsuario, respuestaGuardada) {
    const normUser = normalizarRespuestaSeguridad(inputUsuario);
    const normTarget = normalizarRespuestaSeguridad(respuestaGuardada);
    if (!normUser || !normTarget) return false;

    const userWords = normUser.split(' ').filter(Boolean);
    if (normUser === normTarget || userWords.includes(normTarget)) return true;

    const palabrasIgnorar = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'es', 'mi', 'mis', 'de', 'del', 'en', 'por', 'claro', 'obvio', 'creo', 'que', 'si', 'fue', 'era']);
    const targetWords = normTarget.split(' ').filter(w => !palabrasIgnorar.has(w));
    const clavesMeta = targetWords.length > 0 ? targetWords : normTarget.split(' ').filter(Boolean);
    if (clavesMeta.length === 0) return false;

    return clavesMeta.every(metaWord => userWords.some(uWord => palabrasCoincidenConTolerancia(uWord, metaWord)));
}

function generarTextoPistaSutil(respuestaRaw, nivel = 1) {
    const limpia = (respuestaRaw || '').trim();
    if (!limpia) return 'Sin pista disponible';
    const len = limpia.length;
    const primera = limpia.charAt(0).toUpperCase();
    const ultima = limpia.charAt(len - 1).toUpperCase();

    if (nivel <= 1) {
        const mascara = primera + ' ' + Array(Math.max(1, len - 1)).fill('_').join(' ');
        return `💡 Pista 1: Tiene ${len} letras y empieza con "${primera}" (${mascara})`;
    } else {
        const revelada = limpia.split('').map((ch, idx) => {
            if (idx === 0 || idx === len - 1 || ch === ' ') return ch;
            if (/[aeiouáéíóúAEIOUÁÉÍÓÚ]/.test(ch)) return ch.toLowerCase();
            return '_';
        }).join(' ');
        return `💡 Pista 2: Empieza con "${primera}", termina en "${ultima}" → ${revelada}`;
    }
}

function renderizarPreguntaAleatoriaUI() {
    const boxQuestions = document.getElementById('rec-pin-questions-body');
    if (!boxQuestions || !Array.isArray(pinQuestions) || pinQuestions.length === 0) return;
    const item = pinQuestions[preguntaRecuperacionIdx] || pinQuestions[0];

    boxQuestions.innerHTML = `
        <p style="font-size: 12.5px; color: var(--text-secondary); line-height: 1.4; margin-bottom: 12px;">
            Responde esta pregunta de seguridad elegida al azar para cambiar tu PIN (no importan mayúsculas, acentos ni palabras extra):
        </p>
        <div class="pin-question-card" id="card-rec-unica" style="margin-bottom: 10px; transition: border-color 0.25s ease;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                <span class="pin-q-badge">Pregunta de Seguridad (${preguntaRecuperacionIdx + 1} de ${pinQuestions.length})</span>
                <button type="button" onclick="cambiarPreguntaRecuperacionPIN()" style="background: var(--card-dark); border: 1px solid var(--border-light); color: var(--text-secondary); font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 10px; cursor: pointer;">🎲 Otra pregunta</button>
            </div>
            <label id="lbl-rec-unica" class="pin-rec-q-title" style="font-size: 15px; margin-top: 2px;">${item.q}</label>
            <input type="text" id="in-rec-unica" placeholder="Escribe tu respuesta aquí..." autocomplete="off" oninput="limpiarErrorRecuperacionPIN()" onkeydown="if(event.key === 'Enter') verificarRecuperacionPIN()">
            <div id="hint-rec-unica" class="pin-subtle-hint" style="display: none;"></div>
        </div>
        <div id="rec-pin-feedback" style="display: none; padding: 10px 12px; border-radius: 14px; font-size: 12.5px; font-weight: 700; text-align: center; margin-top: 6px; line-height: 1.35;"></div>
    `;
    const btnPista = document.getElementById('btn-pedir-pista-pin');
    if (btnPista) btnPista.innerText = '💡 No recuerdo / Dame una pista sutil';
}

function limpiarErrorRecuperacionPIN() {
    const feedback = document.getElementById('rec-pin-feedback');
    const card = document.getElementById('card-rec-unica');
    if (feedback) feedback.style.display = 'none';
    if (card) card.style.borderColor = '';
}

function cambiarPreguntaRecuperacionPIN() {
    if (!Array.isArray(pinQuestions) || pinQuestions.length <= 1) return;
    let nuevoIdx = preguntaRecuperacionIdx;
    while (nuevoIdx === preguntaRecuperacionIdx) nuevoIdx = Math.floor(Math.random() * pinQuestions.length);
    preguntaRecuperacionIdx = nuevoIdx;
    nivelPistaRecuperacion = 0;
    renderizarPreguntaAleatoriaUI();
    const inp = document.getElementById('in-rec-unica');
    if (inp) setTimeout(() => inp.focus(), 50);
}

function resetearPIN(event) {
    if (event) event.stopPropagation();
    nivelPistaRecuperacion = 0;
    const tienePreguntas = Array.isArray(pinQuestions) && pinQuestions.length === 3 && pinQuestions.every(q => q.q && q.a);

    const boxQuestions = document.getElementById('rec-pin-questions-body');
    const boxLegacy = document.getElementById('rec-pin-legacy-body');
    const btnPista = document.getElementById('btn-pedir-pista-pin');

    if (tienePreguntas) {
        if (boxQuestions) { boxQuestions.classList.remove('oculto'); boxQuestions.style.display = 'block'; }
        if (boxLegacy) { boxLegacy.classList.add('oculto'); boxLegacy.style.display = 'none'; }
        if (btnPista) {
            btnPista.classList.remove('oculto');
            btnPista.style.display = 'flex';
            btnPista.innerText = '💡 No recuerdo / Dame una pista sutil';
        }
        preguntaRecuperacionIdx = Math.floor(Math.random() * pinQuestions.length);
        renderizarPreguntaAleatoriaUI();
    } else {
        if (boxQuestions) { boxQuestions.classList.add('oculto'); boxQuestions.style.display = 'none'; }
        if (boxLegacy) { boxLegacy.classList.remove('oculto'); boxLegacy.style.display = 'flex'; }
        if (btnPista) { btnPista.classList.add('oculto'); btnPista.style.display = 'none'; }
        const inLegacy = document.getElementById('in-rec-legacy-word');
        if (inLegacy) inLegacy.value = '';
    }
    abrirModal('modal-recuperar-pin');
}

function mostrarPistasSutilesPIN() {
    if (!Array.isArray(pinQuestions) || pinQuestions.length === 0) return;
    nivelPistaRecuperacion = Math.min(2, nivelPistaRecuperacion + 1);
    const preguntaActual = pinQuestions[preguntaRecuperacionIdx] || pinQuestions[0];
    const hint = document.getElementById('hint-rec-unica');
    if (hint && preguntaActual) {
        hint.innerText = generarTextoPistaSutil(preguntaActual.a, nivelPistaRecuperacion);
        hint.style.display = 'block';
    }
    const btnPista = document.getElementById('btn-pedir-pista-pin');
    if (btnPista) {
        btnPista.innerText = nivelPistaRecuperacion === 1 ? '💡 Dame una segunda pista más clara' : '✨ Pistas máximas activadas';
    }
}

function mostrarFeedbackRecuperacion(mensaje, esExito = false) {
    const feedback = document.getElementById('rec-pin-feedback');
    const card = document.getElementById('card-rec-unica');

    if (feedback) {
        feedback.innerText = mensaje;
        feedback.style.display = 'block';
        feedback.style.color = esExito ? '#32D74B' : '#FF453A';
        feedback.style.background = esExito ? 'rgba(50, 215, 75, 0.14)' : 'rgba(255, 69, 58, 0.14)';
        feedback.style.border = esExito ? '1px solid rgba(50, 215, 75, 0.35)' : '1px solid rgba(255, 69, 58, 0.35)';
    }
    if (card) {
        card.style.borderColor = esExito ? '#32D74B' : '#FF453A';
        if (!esExito) {
            card.classList.remove('pin-shake');
            void card.offsetWidth;
            card.classList.add('pin-shake');
        }
    }
}

function verificarRecuperacionPIN() {
    const tienePreguntas = Array.isArray(pinQuestions) && pinQuestions.length === 3 && pinQuestions.every(q => q.q && q.a);

    if (!tienePreguntas) {
        const inLegacy = document.getElementById('in-rec-legacy-word');
        const val = (inLegacy ? inLegacy.value : '').trim().toUpperCase();
        if (val === 'RESETEAR') {
            localStorage.removeItem('app_pin');
            appPin = null;
            cerrarModal('modal-recuperar-pin');
            document.getElementById('pin-screen').classList.add('oculto');
            document.getElementById('app-main-container').classList.add('app-unlocked');
            if (usuarioActual) sincronizarHaciaNube().catch(e => console.error(e));
            setTimeout(() => configurarPIN(), 300);
        } else {
            alert('❌ Palabra incorrecta. Escribe RESETEAR para restablecer tu PIN antiguo.');
        }
        return;
    }

    const inputEl = document.getElementById('in-rec-unica');
    const respUser = (inputEl ? inputEl.value : '').trim();
    const preguntaActual = pinQuestions[preguntaRecuperacionIdx] || pinQuestions[0];

    if (!respUser) return mostrarFeedbackRecuperacion('⚠️ Escribe tu respuesta antes de verificar.', false);

    if (esRespuestaSeguridadValida(respUser, preguntaActual.a)) {
        mostrarFeedbackRecuperacion('✅ ¡Respuesta correcta! Desbloqueando para cambiar tu PIN...', true);
        localStorage.removeItem('app_pin');
        appPin = null;
        setTimeout(() => {
            cerrarModal('modal-recuperar-pin');
            document.getElementById('pin-screen').classList.add('oculto');
            document.getElementById('app-main-container').classList.add('app-unlocked');
            configurarPIN();
        }, 500);
    } else {
        mostrarFeedbackRecuperacion('❌ Respuesta incorrecta. No coincide con tu respuesta guardada. Inténtalo de nuevo o pide una pista abajo.', false);
    }
}

// ================= CENSURAR MONTOS =================
let censurado = localStorage.getItem('censurado') === 'true';

function toggleCensura(event) {
    if(event) event.stopPropagation(); 
    censurado = !censurado;
    localStorage.setItem('censurado', censurado);
    actualizarInterfaz();
    if (usuarioActual) sincronizarHaciaNube().catch(e => console.error(e));
}

function formatearMontoCensurado(texto, mantenerFisico = false) {
    if (!censurado) return texto;
    if (mantenerFisico && texto === "Dólares / Físico") return texto; 
    return '********';
}

// ================= VENTANAS MODALES Y BLOQUEO TOTAL DE SCROLL EN iOS =================
const MODALES_IDS = [
    'modal-perfil', 'modal-historial', 'modal-detalle-meta', 'modal-accion-meta',
    'modal-cuentas', 'modal-categorias', 'modal-nueva-meta', 'modal-tutorial',
    'modal-config-pin', 'modal-recuperar-pin', 'modal-nueva-agenda', 'modal-pagar-agenda'
];

let scrollGuardadoModal = 0;

function hayModalAbierto() {
    return MODALES_IDS.some(id => {
        const el = document.getElementById(id);
        return el && !el.classList.contains('oculto');
    });
}

function bloquearScrollFondo() {
    if (!document.body.classList.contains('modal-open')) {
        scrollGuardadoModal = window.scrollY || document.documentElement.scrollTop || 0;
        document.documentElement.classList.add('modal-open');
        document.body.classList.add('modal-open');
    }
}

function desbloquearScrollFondo() {
    if (!hayModalAbierto()) {
        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
        window.scrollTo(0, scrollGuardadoModal);
    }
}

// Interceptor táctil en iOS Safari: permite scroll horizontal en paletas y vertical en contenedores de listas
document.addEventListener('touchmove', function(e) {
    if (document.body.classList.contains('modal-open')) {
        const horizontalPalette = e.target.closest('.palette-container, .cat-palette-row');
        if (horizontalPalette && horizontalPalette.scrollWidth > horizontalPalette.clientWidth) {
            return;
        }
        const scrollableEl = e.target.closest('.modal-list, #lista-transacciones, #lista-historial-meta, .historial-full-list, .tut-slide, .chart-custom-legend');
        if (!scrollableEl) {
            e.preventDefault();
            return;
        }
        if (scrollableEl.scrollHeight <= scrollableEl.clientHeight) {
            e.preventDefault();
        }
        return;
    }

    if (document.body.classList.contains('askbot-tab-open') || document.body.classList.contains('askbot-kb-open')) {
        const askbotScrollable = e.target.closest('.askbot-messages, .askbot-welcome-hero');
        if (!askbotScrollable || askbotScrollable.scrollHeight <= askbotScrollable.clientHeight) {
            e.preventDefault();
        }
    }
}, { passive: false });

function abrirModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    bloquearScrollFondo();
    modal.classList.remove('oculto');

    if (id === 'modal-historial') mostrarHistorialTotalCuenta();
    if (id === 'modal-cuentas' || id === 'modal-categorias') {
        renderizarListasGestion();
        if (id === 'modal-categorias') {
            renderizarPaletaColorNuevaCat();
            cerrarSelectorColorCategoriaExistente();
        }
    }
    if (id === 'modal-perfil') actualizarUIEstadoNube();
}

function cerrarModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('oculto');
    if (id === 'modal-categorias') cerrarSelectorColorCategoriaExistente();
    desbloquearScrollFondo();
}

// ================= COMPORTAMIENTO INTELIGENTE DEL FORMULARIO =================
function toggleCategoriaSelect() {
    const tipo = document.getElementById('val-tipo').value;
    const moneda = document.getElementById('val-moneda').value;
    const selectCategoria = document.getElementById('val-categoria');
    const boxComision = document.getElementById('box-comision-ves');
    const boxTransf = document.getElementById('box-transferencia');
    const boxTasaUsdtVes = document.getElementById('box-tasa-usdt-ves');
    const inputTasaUsdtVes = document.getElementById('input-tasa-usdt-ves');
    const valMonedaSelect = document.getElementById('val-moneda');
    const cuentaActiva = cuentas.find(c => c.id == cuentaActivaId);
    
    if (tipo === 'ingreso' || tipo === 'transferencia') { 
        selectCategoria.classList.add('oculto'); selectCategoria.value = ""; 
    } else {
        selectCategoria.classList.remove('oculto');
    }

    if (boxTransf) {
        if (tipo === 'transferencia') {
            boxTransf.classList.remove('oculto'); boxTransf.style.display = 'flex';
            valMonedaSelect.classList.add('oculto');
            renderizarSelectsTransferencia();
        } else {
            boxTransf.classList.add('oculto'); boxTransf.style.display = 'none';
            valMonedaSelect.classList.remove('oculto');
        }
    }

    if (boxComision) {
        if (tipo === 'gasto' && moneda === 'VES') {
            boxComision.classList.remove('oculto'); boxComision.style.display = 'flex';
        } else {
            boxComision.classList.add('oculto'); boxComision.style.display = 'none';
            document.getElementById('sel-tipo-comision').value = 'tarjeta';
            toggleComisionManual(); 
        }
    }

    if (boxTasaUsdtVes) {
        if (cuentaActiva && cuentaActiva.moneda === 'USDT' && (tipo === 'gasto' || tipo === 'ingreso') && moneda === 'VES') {
            boxTasaUsdtVes.classList.remove('oculto');
            boxTasaUsdtVes.style.display = 'flex';
            if (inputTasaUsdtVes && (!inputTasaUsdtVes.value || parseFloat(inputTasaUsdtVes.value) <= 0)) {
                inputTasaUsdtVes.value = tasaParalelo > 1 ? tasaParalelo.toFixed(2) : '';
            }
            calcularEquivalenteUsdtVes();
        } else {
            boxTasaUsdtVes.classList.add('oculto');
            boxTasaUsdtVes.style.display = 'none';
        }
    }
}

function calcularEquivalenteUsdtVes() {
    const boxTasaUsdtVes = document.getElementById('box-tasa-usdt-ves');
    const lblEquiv = document.getElementById('lbl-usdt-ves-equiv');
    if (!boxTasaUsdtVes || !lblEquiv || boxTasaUsdtVes.classList.contains('oculto')) return;

    const tipo = document.getElementById('val-tipo').value;
    const moneda = document.getElementById('val-moneda').value;
    const monto = parseFloat(document.getElementById('monto').value) || 0;
    const inputTasa = document.getElementById('input-tasa-usdt-ves');
    const tasaUsar = parseFloat(inputTasa && inputTasa.value) || tasaParalelo || 1;

    let montoTotalBs = monto;
    const boxComision = document.getElementById('box-comision-ves');
    if (tipo === 'gasto' && moneda === 'VES' && boxComision && !boxComision.classList.contains('oculto')) {
        const tipoComision = document.getElementById('sel-tipo-comision').value;
        if (tipoComision === 'p2p' && monto > 0) montoTotalBs += Math.max(14.00, monto * 0.003);
        else if (tipoComision === 'p2c' && monto > 0) montoTotalBs += Math.max(14.00, monto * 0.015);
        else if (tipoComision === 'manual') montoTotalBs += parseFloat(document.getElementById('input-comision-manual').value) || 0;
    }

    const equivUsdt = tasaUsar > 0 ? (montoTotalBs / tasaUsar) : 0;
    const signo = tipo === 'ingreso' ? '+' : '-';
    lblEquiv.style.color = tipo === 'ingreso' ? '#32D74B' : '#FF453A';
    lblEquiv.innerText = `${monto > 0 ? signo : ''}${equivUsdt.toFixed(2)} USDT`;
}

function toggleComisionManual() {
    const selTipo = document.getElementById('sel-tipo-comision').value;
    const inputManual = document.getElementById('input-comision-manual');
    if (selTipo === 'manual') {
        inputManual.classList.remove('oculto');
        inputManual.focus();
    } else {
        inputManual.classList.add('oculto');
        inputManual.value = '';
    }
}

function renderizarSelectsTransferencia() {
    const selOrigen = document.getElementById('sel-transf-origen');
    const selDestino = document.getElementById('sel-transf-destino');
    const valO = selOrigen.value, valD = selDestino.value;

    selOrigen.innerHTML = ''; selDestino.innerHTML = '';
    const cuentasValidas = cuentas.filter(c => c.moneda === 'USDT' || c.moneda === 'VES');

    cuentasValidas.forEach(c => {
        selOrigen.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
        selDestino.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
    });

    if (valO && cuentasValidas.find(c => c.id == valO)) selOrigen.value = valO;
    if (valD && cuentasValidas.find(c => c.id == valD)) selDestino.value = valD;
    actualizarUI_Transferencia(false);
}

function actualizarUI_Transferencia(origenCambio = false) {
    const idO = document.getElementById('sel-transf-origen').value;
    const idD = document.getElementById('sel-transf-destino').value;
    if (!idO || !idD) return;

    let cOrigen = cuentas.find(c => c.id == idO);
    let cDestino = cuentas.find(c => c.id == idD);
    const cuentasUSDT = cuentas.filter(c => c.moneda === 'USDT');
    const cuentasVES = cuentas.filter(c => c.moneda === 'VES');

    if (origenCambio && cuentasUSDT.length === 1 && cuentasVES.length === 1) {
        if (cOrigen.moneda === 'USDT') document.getElementById('sel-transf-destino').value = cuentasVES[0].id;
        else if (cOrigen.moneda === 'VES') document.getElementById('sel-transf-destino').value = cuentasUSDT[0].id;
        cDestino = cuentas.find(c => c.id == document.getElementById('sel-transf-destino').value);
    } else if (!origenCambio && cuentasUSDT.length === 1 && cuentasVES.length === 1) {
        if (cDestino.moneda === 'USDT') document.getElementById('sel-transf-origen').value = cuentasVES[0].id;
        else if (cDestino.moneda === 'VES') document.getElementById('sel-transf-origen').value = cuentasUSDT[0].id;
        cOrigen = cuentas.find(c => c.id == document.getElementById('sel-transf-origen').value);
    }

    const boxTasa = document.getElementById('box-transf-tasa');
    const inputTasa = document.getElementById('input-transf-tasa');
    if (cOrigen.moneda !== cDestino.moneda) {
        boxTasa.classList.remove('oculto'); boxTasa.style.display = 'flex';
        if (inputTasa.value === '') inputTasa.value = tasaParalelo.toFixed(2);
    } else {
        boxTasa.classList.add('oculto'); boxTasa.style.display = 'none';
        inputTasa.value = '1';
    }
    calcularMontoTransferencia();
}

function calcularMontoTransferencia() {
    const monto = parseFloat(document.getElementById('monto').value) || 0;
    const cOrigen = cuentas.find(c => c.id == document.getElementById('sel-transf-origen').value);
    const cDestino = cuentas.find(c => c.id == document.getElementById('sel-transf-destino').value);
    let tasa = parseFloat(document.getElementById('input-transf-tasa').value) || 1;
    let montoRecibir = monto;

    if (cOrigen && cDestino && cOrigen.moneda !== cDestino.moneda) {
        if (cOrigen.moneda === 'VES') montoRecibir = monto / tasa;
        else if (cDestino.moneda === 'VES') montoRecibir = monto * tasa;
    }
    document.getElementById('lbl-transf-recibiras').innerText = `${montoRecibir.toFixed(2)}${cDestino ? cDestino.moneda : ''}`;
}

document.getElementById('val-categoria').addEventListener('change', (e) => {
    const catSelec = e.target.value;
    const lastTrans = [...transacciones].reverse().find(t => t.categoria === catSelec && t.tipo === 'gasto');
    if (lastTrans && lastTrans.monedaInputOriginal) {
        const selectMoneda = document.getElementById('val-moneda');
        const cuentaActiva = cuentas.find(c => c.id == cuentaActivaId);
        let monedaBuscada = lastTrans.monedaInputOriginal;

        if (cuentaActiva && cuentaActiva.moneda === 'USDT' && monedaBuscada === 'USD') monedaBuscada = 'USDT';
        else if (cuentaActiva && cuentaActiva.moneda !== 'USDT' && monedaBuscada === 'USDT') monedaBuscada = 'USD';

        const option = Array.from(selectMoneda.options).find(o => o.value === monedaBuscada);
        if (option) selectMoneda.value = monedaBuscada;
        toggleCategoriaSelect();
    }
});

document.getElementById('val-moneda').addEventListener('change', toggleCategoriaSelect);

function actualizarOpcionesMoneda() {
    const cuentaActiva = cuentas.find(c => c.id == cuentaActivaId);
    const selectMoneda = document.getElementById('val-moneda');
    if (!cuentaActiva || !selectMoneda) return;

    const monedaPrevia = selectMoneda.value;
    let permitidas = ['USD', 'VES', 'EUR'];

    if (cuentaActiva.moneda === 'USD') permitidas = ['USD'];
    else if (cuentaActiva.moneda === 'USDT') permitidas = ['USDT', 'VES'];
    else if (cuentaActiva.moneda === 'VES') permitidas = ['USD', 'VES', 'EUR'];

    selectMoneda.innerHTML = permitidas.map(m => `<option value="${m}">${m}</option>`).join('');
    selectMoneda.value = permitidas.includes(monedaPrevia) ? monedaPrevia : permitidas[0];
    toggleCategoriaSelect();
}

// ================= METAS DE AHORRO PREMIUM Y REEMBOLSO AUTOMÁTICO =================
let metaAbonoActualIndex = null;
let metaAccionTipo = 'abonar'; 

function redimensionarImagen(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const maxW = 500, maxH = 500;
            let width = img.width, height = img.height;
            if (width > height) { if (width > maxW) { height *= maxW / width; width = maxW; } }
            else { if (height > maxH) { width *= maxH / height; height = maxH; } }
            canvas.width = width; canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/png')); 
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function guardarNuevaMeta() {
    const nombre = document.getElementById('in-meta-nombre').value;
    const objetivo = parseFloat(document.getElementById('in-meta-obj').value);
    const file = document.getElementById('in-meta-img').files[0];
    if (!nombre || isNaN(objetivo) || objetivo <= 0) return alert("Datos inválidos.");

    const crear = (imgBase64) => {
        metas.push({ id: Date.now(), nombre, acumulado: 0, objetivo, moneda: 'USD', imagen: imgBase64 });
        guardarYActualizarGestion();
        cerrarModal('modal-nueva-meta');
        document.getElementById('in-meta-nombre').value = '';
        document.getElementById('in-meta-obj').value = '';
        document.getElementById('in-meta-img').value = '';
    };
    if (file) redimensionarImagen(file, crear);
    else crear(null);
}

function renderizarMetas() {
    const lista = document.getElementById('lista-metas-principal');
    if(!lista) return;
    lista.innerHTML = '';
    if(metas.length === 0) { 
        lista.innerHTML = '<p style="color:var(--text-secondary); font-size:13px; text-align:center;">No tienes metas activas. ¡Crea una!</p>'; 
        return; 
    }
    
    metas.forEach((m, i) => {
        let pct = (m.acumulado / m.objetivo) * 100;
        if(pct > 100) pct = 100;
        const bgStyle = m.imagen ? `background-image: url(${m.imagen});` : ``;

        lista.innerHTML += `
        <div class="meta-item-card" onclick="abrirDetalleMeta(${i})">
            <div class="meta-card-top">
                <div class="meta-bg-overlay" style="${bgStyle}"></div>
                <div class="meta-top-content">
                    <strong style="font-size:20px; text-shadow: 0 2px 10px rgba(0,0,0,0.9);">${m.nombre}</strong>
                    <span style="font-size:15.5px; font-weight:800; text-shadow: 0 2px 10px rgba(0,0,0,0.9);">${m.moneda} ${formatearMontoCensurado(m.acumulado.toFixed(2))}</span>
                </div>
            </div>
            <div class="meta-card-bottom">
                <div class="progress-bg" style="height: 11px; margin-bottom: 8px;">
                    <div class="progress-fill" style="width: ${pct}%;"></div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <small style="color:var(--text-secondary); font-size:12.5px; font-weight:600;">Progreso</small>
                    <small style="color:var(--text-primary); font-size:13px; font-weight:800;">${pct.toFixed(1)}% de ${m.objetivo.toFixed(2)}</small>
                </div>
            </div>
        </div>`;
    });
}

function abrirDetalleMeta(index) {
    metaAbonoActualIndex = index;
    const m = metas[index];
    let pct = (m.acumulado / m.objetivo) * 100;
    if(pct > 100) pct = 100;

    const bgOverlayDetail = document.getElementById('meta-detail-bg-blur');
    if(m.imagen) {
        bgOverlayDetail.style.backgroundImage = `url(${m.imagen})`;
        bgOverlayDetail.style.display = 'block';
    } else {
        bgOverlayDetail.style.display = 'none';
    }

    document.getElementById('meta-detail-title').innerText = m.nombre;
    document.getElementById('meta-detail-amounts').innerText = `${m.moneda} ${formatearMontoCensurado(m.acumulado.toFixed(2))} / ${m.objetivo.toFixed(2)}`;
    document.getElementById('meta-detail-pct').innerText = `${pct.toFixed(1)}%`;
    document.getElementById('meta-detail-bar').style.width = `${pct}%`;

    renderizarHistorialEspecíficoMeta(m.nombre);
    abrirModal('modal-detalle-meta');
}

function renderizarHistorialEspecíficoMeta(nombreMeta) {
    const lista = document.getElementById('lista-historial-meta');
    lista.innerHTML = '';
    let hMeta = transacciones.filter(t => t.categoria === 'Ahorro' && t.nota && t.nota.includes(nombreMeta)).reverse();

    if (hMeta.length === 0) {
        lista.innerHTML = `<p style="text-align:center; padding: 20px; color: var(--text-secondary); font-size: 13px;">No hay movimientos aún.</p>`;
        return;
    }

    hMeta.forEach((t) => {
        const esAbono = t.tipo === 'gasto'; 
        const claseColor = esAbono ? 'monto-ingreso' : 'monto-gasto';
        const signo = esAbono ? '+' : '-';
        lista.innerHTML += `
            <li class="transaccion-item" style="margin-bottom: 8px;">
                <div class="trans-izq">
                    <strong>${esAbono ? 'Abono' : 'Retiro'}</strong>
                    <small>${t.fechaFormateada}</small>
                </div>
                <div style="display: flex; align-items: center;">
                    <span class="monto-val ${claseColor}">${signo}$${t.montoUSD.toFixed(2)}</span>
                </div>
            </li>
        `;
    });
}

function prepararAccionMeta(tipo) {
    if (cuentas.length === 0) return alert("Debes crear al menos una cuenta primero.");
    metaAccionTipo = tipo;
    const meta = metas[metaAbonoActualIndex];

    document.getElementById('titulo-accion-meta').innerText = tipo === 'abonar' ? `Abonar a "${meta.nombre}"` : `Retirar de "${meta.nombre}"`;
    document.getElementById('desc-accion-meta').innerText = tipo === 'abonar' ? "Descontaremos de la cuenta que selecciones." : "El monto volverá a tu cuenta seleccionada.";
    document.getElementById('monto-accion-meta').value = '';
    document.getElementById('nota-accion-meta').value = '';
    document.getElementById('fecha-accion-meta').value = getLocalYYYYMMDD();
    document.getElementById('moneda-accion-meta').value = 'USD'; 

    const selectCuenta = document.getElementById('sel-cuenta-accion-meta');
    selectCuenta.innerHTML = '';
    cuentas.forEach(c => selectCuenta.innerHTML += `<option value="${c.id}">${c.nombre} (${c.moneda})</option>`);
    abrirModal('modal-accion-meta');
}

document.getElementById('btn-ejecutar-meta').addEventListener('click', () => {
    const monto = parseFloat(document.getElementById('monto-accion-meta').value);
    const monedaAccion = document.getElementById('moneda-accion-meta').value;
    if (isNaN(monto) || monto <= 0) return alert("Monto inválido");

    const cuentaId = document.getElementById('sel-cuenta-accion-meta').value;
    const notaUser = document.getElementById('nota-accion-meta').value.trim();
    if (!cuentaId) return alert("Selecciona una cuenta válida.");

    const meta = metas[metaAbonoActualIndex];
    let montoUSD = monto;
    if (monedaAccion === 'VES') montoUSD = monto / tasaBCV;
    if (metaAccionTipo === 'retirar' && montoUSD > meta.acumulado) return alert("No puedes retirar más de lo ahorrado.");

    const valFecha = document.getElementById('fecha-accion-meta').value; 
    const dateObj = valFecha ? new Date(valFecha + "T00:00:00") : new Date();
    const isoLocal = getLocalYYYYMMDD(dateObj);
    const mesesArr = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const fechaFormateada = `${dateObj.getDate()} ${mesesArr[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

    const tTipo = metaAccionTipo === 'abonar' ? 'gasto' : 'ingreso';
    const baseNota = metaAccionTipo === 'abonar' ? `Abono a meta: ${meta.nombre}` : `Retiro de meta: ${meta.nombre}`;

    const transaccion = {
        id: dateObj.getTime() + Math.random(),
        cuentaId: cuentaId,
        montoUSD: montoUSD,
        tipo: tTipo,
        categoria: 'Ahorro',
        nota: notaUser ? `${baseNota} - ${notaUser}` : baseNota,
        monedaInputOriginal: monedaAccion, 
        fechaFormateada: fechaFormateada,
        fecha: dateObj,
        fechaIsoLocal: isoLocal
    };
    
    transacciones.push(transaccion);
    transacciones.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    
    if (metaAccionTipo === 'abonar') metas[metaAbonoActualIndex].acumulado += montoUSD;
    else metas[metaAbonoActualIndex].acumulado -= montoUSD;

    if (metas[metaAbonoActualIndex].acumulado >= metas[metaAbonoActualIndex].objetivo) {
        alert(`¡Felicidades! 🎉 Has completado tu meta: ${metas[metaAbonoActualIndex].nombre} 🥳\n\nEl objetivo ha sido alcanzado y se eliminará de las metas activas. (El dinero sigue descontado de tu cuenta principal, listo para usarse).`);
        metas.splice(metaAbonoActualIndex, 1);
        guardarYActualizarGestion();
        cerrarModal('modal-accion-meta');
        cerrarModal('modal-detalle-meta');
        actualizarInterfaz();
        return;
    }

    guardarYActualizarGestion();
    cerrarModal('modal-accion-meta');
    abrirDetalleMeta(metaAbonoActualIndex);
});

function eliminarMeta(index) {
    if (index === null || index === undefined || index < 0 || index >= metas.length) return;
    const meta = metas[index];
    const montoAcumulado = Number(meta.acumulado) || 0;

    const mensaje = montoAcumulado > 0
        ? `¿Seguro que deseas eliminar la meta "${meta.nombre}"?\n\n💰 Los $${montoAcumulado.toFixed(2)} ahorrados regresarán automáticamente a tu cuenta y se registrarán en el historial.`
        : `¿Seguro que deseas eliminar la meta "${meta.nombre}"?`;

    if (!confirm(mensaje)) return;

    if (montoAcumulado > 0 && cuentas.length > 0) {
        const ultimoAbono = [...transacciones].reverse().find(t =>
            t.categoria === 'Ahorro' &&
            t.tipo === 'gasto' &&
            t.nota &&
            t.nota.includes(meta.nombre) &&
            cuentas.some(c => c.id == t.cuentaId)
        );

        let cuentaDestinoId = ultimoAbono ? ultimoAbono.cuentaId : null;
        if (!cuentaDestinoId) {
            cuentaDestinoId = (cuentaActivaId && cuentas.some(c => c.id == cuentaActivaId)) ? cuentaActivaId : cuentas[0].id;
        }

        const dateObj = new Date();
        const isoLocal = getLocalYYYYMMDD(dateObj);
        const mesesArr = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const fechaFormateada = `${dateObj.getDate()} ${mesesArr[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

        transacciones.push({
            id: dateObj.getTime() + Math.random(),
            cuentaId: cuentaDestinoId,
            montoUSD: montoAcumulado,
            tipo: 'ingreso',
            categoria: 'Ahorro',
            nota: "Reembolso por cierre de meta: " + meta.nombre,
            monedaInputOriginal: 'USD',
            fechaFormateada: fechaFormateada,
            fecha: dateObj,
            fechaIsoLocal: isoLocal
        });
        transacciones.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    }

    metas.splice(index, 1);
    guardarYActualizarGestion();
    cerrarModal('modal-detalle-meta');
    actualizarInterfaz();
}

// ================= AGENDA DE PAGOS, DEUDAS Y SUSCRIPCIONES =================
let agendaVistaActual = 'pendientes';
let agendaCalAnio = new Date().getFullYear();
let agendaCalMes = new Date().getMonth();
let agendaDiaSeleccionado = null;
let agendaPagoEnCursoId = null;

function convertirMontoAgendaAUSD(monto, moneda) {
    const val = Number(monto) || 0;
    if (val <= 0) return 0;
    if (moneda === 'VES') return val / (tasaBCV || 1);
    if (moneda === 'EUR') return (val * (tasaEUR || 1)) / (tasaBCV || 1);
    return val;
}

function formatearMontoMonedaAgenda(monto, moneda) {
    const val = (Number(monto) || 0).toFixed(2);
    if (moneda === 'VES') return `Bs ${val}`;
    if (moneda === 'USDT') return `USDT ${val}`;
    if (moneda === 'EUR') return `€${val}`;
    return `$${val}`;
}

function calcularDiasRestantesAgenda(fechaIso) {
    const hoyIso = getLocalYYYYMMDD();
    const dHoy = new Date(hoyIso + "T00:00:00");
    const dMeta = new Date((fechaIso || hoyIso) + "T00:00:00");
    if (isNaN(dMeta.getTime())) return 0;
    return Math.round((dMeta.getTime() - dHoy.getTime()) / 86400000);
}

function obtenerInfoEstadoAgenda(item) {
    if (item.estado === 'pagado') return { claseCard: 'pagado', claseBadge: 'pagado', textoBadge: '✅ Pagado', dias: 9999 };
    const dias = calcularDiasRestantesAgenda(item.fecha);
    if (dias < 0) {
        const abs = Math.abs(dias);
        return { claseCard: 'vencido', claseBadge: 'vencido', textoBadge: abs === 1 ? '🚨 Venció ayer' : `🚨 Vencido hace ${abs} días`, dias };
    }
    if (dias === 0) return { claseCard: 'hoy', claseBadge: 'hoy', textoBadge: '⚡ Vence HOY', dias };
    if (dias <= 3) return { claseCard: 'proximo', claseBadge: 'proximo', textoBadge: dias === 1 ? '⏳ Vence mañana' : `⏳ En ${dias} días`, dias };
    return { claseCard: '', claseBadge: 'normal', textoBadge: `🗓️ En ${dias} días`, dias };
}

function avanzarUnMesFechaISO(fechaIso) {
    const partes = (fechaIso || getLocalYYYYMMDD()).split('-');
    let anio = parseInt(partes[0], 10) || new Date().getFullYear();
    let mes = (parseInt(partes[1], 10) || 1) - 1;
    const diaOriginal = parseInt(partes[2], 10) || 1;
    mes += 1;
    if (mes > 11) { mes = 0; anio += 1; }
    const maxDiasMesNuevo = new Date(anio, mes + 1, 0).getDate();
    const diaFinal = Math.min(diaOriginal, maxDiasMesNuevo);
    return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(diaFinal).padStart(2, '0')}`;
}

function poblarSelectCategoriasAgenda(selectEl, valorSeleccionado = '') {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    const listaBase = categorias.length > 0 ? [...categorias] : ['Servicios', 'Suscripciones', 'Deudas', 'Varios'];
    if (valorSeleccionado && !listaBase.includes(valorSeleccionado)) listaBase.push(valorSeleccionado);
    listaBase.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat; opt.innerText = cat;
        selectEl.appendChild(opt);
    });
    if (valorSeleccionado && listaBase.includes(valorSeleccionado)) selectEl.value = valorSeleccionado;
    else if (listaBase.length > 0) selectEl.value = listaBase[0];
}

function abrirModalNuevaAgenda(idEditar = null, fechaPreseleccionada = null) {
    const inputEditId = document.getElementById('in-agenda-edit-id');
    const inputNota = document.getElementById('in-agenda-nota');
    const inputMonto = document.getElementById('in-agenda-monto');
    const selectMoneda = document.getElementById('in-agenda-moneda');
    const inputFecha = document.getElementById('in-agenda-fecha');
    const selectFrec = document.getElementById('in-agenda-frecuencia');
    const selectCat = document.getElementById('in-agenda-categoria');
    const tituloModal = document.getElementById('titulo-modal-agenda');
    const boxRapida = document.getElementById('box-cat-rapida-agenda');

    if (boxRapida) { boxRapida.classList.add('oculto'); boxRapida.style.display = 'none'; }

    if (idEditar !== null && idEditar !== undefined) {
        const comp = agendaPagos.find(a => String(a.id) === String(idEditar));
        if (!comp) return;
        if (tituloModal) tituloModal.innerText = 'Editar Compromiso';
        if (inputEditId) inputEditId.value = String(comp.id);
        if (inputNota) inputNota.value = comp.nota || '';
        if (inputMonto) inputMonto.value = comp.monto || '';
        if (selectMoneda) selectMoneda.value = comp.moneda || 'USD';
        if (inputFecha) inputFecha.value = comp.fecha || getLocalYYYYMMDD();
        if (selectFrec) selectFrec.value = comp.frecuencia || 'unico';
        poblarSelectCategoriasAgenda(selectCat, comp.categoria);
    } else {
        if (tituloModal) tituloModal.innerText = 'Agendar Compromiso';
        if (inputEditId) inputEditId.value = '';
        if (inputNota) inputNota.value = '';
        if (inputMonto) inputMonto.value = '';
        if (selectMoneda) selectMoneda.value = 'USD';
        if (inputFecha) inputFecha.value = fechaPreseleccionada || agendaDiaSeleccionado || getLocalYYYYMMDD();
        if (selectFrec) selectFrec.value = 'unico';
        poblarSelectCategoriasAgenda(selectCat, categorias[0] || '');
    }
    abrirModal('modal-nueva-agenda');
}

function toggleCrearCategoriaRapidaAgenda() {
    const box = document.getElementById('box-cat-rapida-agenda');
    if (!box) return;
    const estaOculto = box.classList.contains('oculto') || box.style.display === 'none';
    if (estaOculto) {
        box.classList.remove('oculto'); box.style.display = 'flex';
        const inColor = document.getElementById('in-cat-rapida-color');
        const inNombre = document.getElementById('in-cat-rapida-nombre');
        if (inColor) inColor.value = PALETA_COLORES_CATEGORIAS[categorias.length % PALETA_COLORES_CATEGORIAS.length];
        if (inNombre) { inNombre.value = ''; setTimeout(() => inNombre.focus(), 50); }
    } else {
        box.classList.add('oculto'); box.style.display = 'none';
    }
}

function guardarCategoriaRapidaAgenda() {
    const inNombre = document.getElementById('in-cat-rapida-nombre');
    const inColor = document.getElementById('in-cat-rapida-color');
    const selectCatAgenda = document.getElementById('in-agenda-categoria');
    const box = document.getElementById('box-cat-rapida-agenda');

    const nuevaCat = inNombre ? inNombre.value.trim() : '';
    if (!nuevaCat) return alert("Escribe un nombre para la nueva categoría.");

    const colorElegido = (inColor && inColor.value) ? inColor.value : PALETA_COLORES_CATEGORIAS[categorias.length % PALETA_COLORES_CATEGORIAS.length];
    if (!categorias.includes(nuevaCat)) categorias.push(nuevaCat);
    categoriasColores[nuevaCat] = colorElegido;

    localStorage.setItem('categorias', JSON.stringify(categorias));
    localStorage.setItem('assist_categorias_colores', JSON.stringify(categoriasColores));

    cargarSelects();
    renderizarListasGestion();
    poblarSelectCategoriasAgenda(selectCatAgenda, nuevaCat);
    if (inNombre) inNombre.value = '';
    if (box) { box.classList.add('oculto'); box.style.display = 'none'; }
    if (usuarioActual) sincronizarHaciaNube().catch(e => console.error(e));
}

function guardarCompromisoAgenda() {
    const editId = document.getElementById('in-agenda-edit-id')?.value || '';
    const nota = (document.getElementById('in-agenda-nota')?.value || '').trim();
    const monto = parseFloat(document.getElementById('in-agenda-monto')?.value);
    const moneda = document.getElementById('in-agenda-moneda')?.value || 'USD';
    const fecha = document.getElementById('in-agenda-fecha')?.value || getLocalYYYYMMDD();
    const frecuencia = document.getElementById('in-agenda-frecuencia')?.value || 'unico';
    const categoria = document.getElementById('in-agenda-categoria')?.value || 'Varios';

    if (!nota) return alert("Por favor, escribe el concepto o nombre del compromiso.");
    if (isNaN(monto) || monto <= 0) return alert("Ingresa un monto válido mayor a 0.");
    if (!fecha) return alert("Selecciona la fecha de pago.");

    if (categoria && !categorias.includes(categoria)) {
        categorias.push(categoria);
        asegurarColoresCategorias();
    }

    if (editId) {
        const idx = agendaPagos.findIndex(a => String(a.id) === String(editId));
        if (idx !== -1) agendaPagos[idx] = { ...agendaPagos[idx], nota, monto, moneda, fecha, frecuencia, categoria };
    } else {
        agendaPagos.push({
            id: Date.now() + Math.floor(Math.random() * 1000),
            nota, monto, moneda, fecha, frecuencia, categoria,
            estado: 'pendiente', ultimaFechaPagada: null, ultimaTransaccionId: null
        });
    }
    guardarYActualizarGestion();
    cerrarModal('modal-nueva-agenda');
}

function eliminarCompromisoAgenda(id) {
    if (!confirm("¿Eliminar este compromiso de la Agenda?")) return;
    agendaPagos = agendaPagos.filter(a => String(a.id) !== String(id));
    guardarYActualizarGestion();
}

function reactivarCompromisoAgenda(id) {
    const comp = agendaPagos.find(a => String(a.id) === String(id));
    if (!comp) return;
    comp.estado = 'pendiente';
    guardarYActualizarGestion();
}

function cambiarVistaAgenda(vista) {
    agendaVistaActual = vista;
    const segPend = document.getElementById('seg-agenda-pendientes');
    const segCal = document.getElementById('seg-agenda-calendario');
    const segPag = document.getElementById('seg-agenda-pagados');
    const calWrapper = document.getElementById('agenda-calendario-wrapper');

    if (segPend) segPend.classList.toggle('activo', vista === 'pendientes');
    if (segCal) segCal.classList.toggle('activo', vista === 'calendario');
    if (segPag) segPag.classList.toggle('activo', vista === 'pagados');

    if (calWrapper) {
        calWrapper.classList.toggle('oculto', vista !== 'calendario');
        calWrapper.style.display = vista === 'calendario' ? 'block' : 'none';
    }
    renderizarAgenda();
}

function cambiarMesCalendarioAgenda(direccion) {
    agendaCalMes += direccion;
    if (agendaCalMes < 0) { agendaCalMes = 11; agendaCalAnio -= 1; }
    else if (agendaCalMes > 11) { agendaCalMes = 0; agendaCalAnio += 1; }
    agendaDiaSeleccionado = null;
    renderizarAgenda();
}

function seleccionarDiaCalendarioAgenda(fechaIso) {
    agendaDiaSeleccionado = (agendaDiaSeleccionado === fechaIso) ? null : fechaIso;
    renderizarAgenda();
}

function limpiarDiaSeleccionadoAgenda() {
    agendaDiaSeleccionado = null;
    renderizarAgenda();
}

function renderizarCalendarioAgenda() {
    const tituloMes = document.getElementById('agenda-cal-mes-titulo');
    const grid = document.getElementById('agenda-cal-grid');
    const filtroBar = document.getElementById('agenda-cal-filtro-bar');
    const diaLabel = document.getElementById('agenda-cal-dia-label');
    if (!grid || !tituloMes) return;

    const mesesNombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    tituloMes.innerText = `${mesesNombres[agendaCalMes]} ${agendaCalAnio}`;

    const primerDiaSemana = new Date(agendaCalAnio, agendaCalMes, 1).getDay();
    const totalDiasMes = new Date(agendaCalAnio, agendaCalMes + 1, 0).getDate();
    const hoyIso = getLocalYYYYMMDD();

    let html = '';
    for (let i = 0; i < primerDiaSemana; i++) html += `<div class="agenda-cal-day vacio"></div>`;

    for (let dia = 1; dia <= totalDiasMes; dia++) {
        const isoDia = `${agendaCalAnio}-${String(agendaCalMes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const esHoy = isoDia === hoyIso;
        const esSeleccionado = isoDia === agendaDiaSeleccionado;
        const itemsDia = agendaPagos.filter(a => a.fecha === isoDia);
        let dotsHtml = '';

        if (itemsDia.length > 0) {
            const dots = itemsDia.slice(0, 3).map(item => {
                let colorDot = obtenerColorCategoria(item.categoria);
                if (item.estado === 'pagado') colorDot = '#32D74B';
                else {
                    const d = calcularDiasRestantesAgenda(item.fecha);
                    if (d < 0) colorDot = '#FF453A';
                    else if (d === 0) colorDot = '#FF9F0A';
                }
                return `<span class="cal-dot-item" style="background:${colorDot};"></span>`;
            }).join('');
            dotsHtml = `<div class="cal-day-dots">${dots}</div>`;
        }
        html += `<div class="agenda-cal-day ${esHoy ? 'hoy' : ''} ${esSeleccionado ? 'seleccionado' : ''}" onclick="seleccionarDiaCalendarioAgenda('${isoDia}')"><span>${dia}</span>${dotsHtml}</div>`;
    }
    grid.innerHTML = html;

    if (filtroBar && diaLabel) {
        if (agendaDiaSeleccionado) {
            filtroBar.classList.remove('oculto'); filtroBar.style.display = 'flex';
            diaLabel.innerText = `📅 ${obtenerEtiquetaDiaCompleta(agendaDiaSeleccionado)}`;
        } else {
            filtroBar.classList.add('oculto'); filtroBar.style.display = 'none';
        }
    }
}

function construirTarjetaItemAgendaHTML(item) {
    const infoEstado = obtenerInfoEstadoAgenda(item);
    const colorCat = obtenerColorCategoria(item.categoria);
    const montoPrincipal = formatearMontoCensurado(formatearMontoMonedaAgenda(item.monto, item.moneda), false);
    const eqUSD = convertirMontoAgendaAUSD(item.monto, item.moneda);
    const textoEq = item.moneda !== 'USD' ? `<span class="agenda-item-eq">≈ ${formatearMontoCensurado('$' + eqUSD.toFixed(2), false)}</span>` : '';
    const etiquetaFrec = item.frecuencia === 'mensual' ? '🔄 Mensual' : '📌 Único';
    const fechaLegible = obtenerEtiquetaDiaCompleta(item.fecha);

    const btnAccionPrincipal = item.estado === 'pagado'
        ? `<button type="button" class="btn-secundario" style="width:auto; padding:6px 12px; font-size:11.5px; border-radius:11px;" onclick="reactivarCompromisoAgenda('${item.id}')">↩️ Reabrir</button>`
        : `<button type="button" class="btn-pagar-agenda-item" onclick="abrirModalPagarAgenda('${item.id}')">💳 Pagar</button>`;

    return `
        <div class="agenda-item-card ${infoEstado.claseCard}">
            <div class="agenda-item-top">
                <div class="agenda-item-info">
                    <div class="agenda-item-title-row">
                        <span class="trans-cat-dot" style="background:${colorCat}; --cat-color:${colorCat};"></span>
                        <span class="agenda-item-title">${item.nota}</span>
                    </div>
                    <div class="agenda-item-meta">
                        <span>${item.categoria}</span><span>•</span><span>${fechaLegible}</span><span>•</span><span>${etiquetaFrec}</span>
                    </div>
                </div>
                <div class="agenda-item-amount-col">
                    <strong class="agenda-item-amount">${montoPrincipal}</strong>
                    ${textoEq}
                </div>
            </div>
            <div class="agenda-item-bottom">
                <span class="agenda-badge-status ${infoEstado.claseBadge}">${infoEstado.textoBadge}</span>
                <div class="agenda-item-actions">
                    <button type="button" class="btn-editar" style="width:30px; height:30px; border-radius:9px;" onclick="abrirModalNuevaAgenda('${item.id}')" title="Editar">✏️</button>
                    <button type="button" class="btn-eliminar" style="width:30px; height:30px; border-radius:9px;" onclick="eliminarCompromisoAgenda('${item.id}')" title="Eliminar">🗑️</button>
                    ${btnAccionPrincipal}
                </div>
            </div>
        </div>
    `;
}

function irAAgendaDesdeBanner() {
    const navAgenda = document.getElementById('nav-item-agenda');
    if (navAgenda) {
        cambiarPestana('tab-agenda', navAgenda);
        cambiarVistaAgenda('pendientes');
    }
}

function actualizarRecordatoriosAgenda() {
    const badgeNav = document.getElementById('nav-agenda-badge');
    const bannerHome = document.getElementById('banner-recordatorio-agenda');
    const pendientes = agendaPagos.filter(a => a.estado !== 'pagado').sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
    const urgentes = pendientes.filter(a => calcularDiasRestantesAgenda(a.fecha) <= 3);

    if (badgeNav) {
        if (urgentes.length > 0) {
            badgeNav.innerText = urgentes.length > 9 ? '9+' : String(urgentes.length);
            badgeNav.classList.remove('oculto'); badgeNav.style.display = 'flex';
        } else {
            badgeNav.classList.add('oculto'); badgeNav.style.display = 'none';
        }
    }

    if (bannerHome) {
        if (urgentes.length === 0) {
            bannerHome.classList.add('oculto'); bannerHome.style.display = 'none'; bannerHome.innerHTML = '';
        } else {
            const primero = urgentes[0];
            const dias = calcularDiasRestantesAgenda(primero.fecha);
            const esCritico = dias <= 0;
            let tagTexto = '⏳ PRÓXIMO PAGO AGENDADO';
            if (dias < 0) tagTexto = '🚨 PAGO VENCIDO EN AGENDA';
            else if (dias === 0) tagTexto = '⚡ PAGO AGENDADO PARA HOY';
            else if (dias === 1) tagTexto = '⏳ VENCE MAÑANA';

            const montoStr = formatearMontoCensurado(formatearMontoMonedaAgenda(primero.monto, primero.moneda), false);
            const extraConteo = urgentes.length > 1 ? ` (+${urgentes.length - 1} más)` : '';

            bannerHome.className = `agenda-home-banner ${esCritico ? 'urgente' : ''}`;
            bannerHome.style.display = 'flex';
            bannerHome.innerHTML = `
                <div class="agenda-banner-info" onclick="irAAgendaDesdeBanner()" style="cursor:pointer;">
                    <span class="agenda-banner-tag">${tagTexto}${extraConteo}</span>
                    <strong class="agenda-banner-title">${primero.nota} · ${montoStr}</strong>
                    <span class="agenda-banner-sub">${primero.categoria} • ${obtenerEtiquetaDiaCompleta(primero.fecha)}</span>
                </div>
                <div class="agenda-banner-actions">
                    <button type="button" class="btn-banner-pay" onclick="abrirModalPagarAgenda('${primero.id}')">Pagar</button>
                    <button type="button" class="btn-banner-ver" onclick="irAAgendaDesdeBanner()">Agenda</button>
                </div>
            `;
        }
    }
}

function renderizarAgenda() {
    actualizarRecordatoriosAgenda();

    const statPendientes = document.getElementById('agenda-stat-pendientes');
    const statMontoUSD = document.getElementById('agenda-stat-monto-usd');
    const statUrgentes = document.getElementById('agenda-stat-urgentes');
    const statProxTexto = document.getElementById('agenda-stat-prox-texto');
    const contenedorLista = document.getElementById('lista-agenda-principal');

    const pendientes = agendaPagos.filter(a => a.estado !== 'pagado').sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
    const pagados = agendaPagos.filter(a => a.estado === 'pagado').sort((a, b) => (b.ultimaFechaPagada || b.fecha || '').localeCompare(a.ultimaFechaPagada || a.fecha || ''));

    const totalPendienteUSD = pendientes.reduce((acc, item) => acc + convertirMontoAgendaAUSD(item.monto, item.moneda), 0);
    const urgentes = pendientes.filter(a => calcularDiasRestantesAgenda(a.fecha) <= 3);
    const vencidosCount = pendientes.filter(a => calcularDiasRestantesAgenda(a.fecha) < 0).length;
    const hoyCount = pendientes.filter(a => calcularDiasRestantesAgenda(a.fecha) === 0).length;

    if (statPendientes) statPendientes.innerText = String(pendientes.length);
    if (statMontoUSD) statMontoUSD.innerText = `≈ ${formatearMontoCensurado('$' + totalPendienteUSD.toFixed(2), false)}`;
    if (statUrgentes) statUrgentes.innerText = String(urgentes.length);

    if (statProxTexto) {
        if (vencidosCount > 0) { statProxTexto.innerText = `${vencidosCount} ${vencidosCount === 1 ? 'vencido' : 'vencidos'}`; statProxTexto.style.color = '#FF453A'; }
        else if (hoyCount > 0) { statProxTexto.innerText = `${hoyCount} ${hoyCount === 1 ? 'vence hoy' : 'vencen hoy'}`; statProxTexto.style.color = '#FF9F0A'; }
        else if (urgentes.length > 0) {
            const dProx = calcularDiasRestantesAgenda(urgentes[0].fecha);
            statProxTexto.innerText = dProx === 1 ? 'Vence mañana' : `En ${dProx} días`;
            statProxTexto.style.color = '#FFD60A';
        } else if (pendientes.length > 0) {
            const dProx = calcularDiasRestantesAgenda(pendientes[0].fecha);
            statProxTexto.innerText = `Próx. en ${dProx} días`;
            statProxTexto.style.color = 'var(--text-secondary)';
        } else {
            statProxTexto.innerText = 'Al día ✨';
            statProxTexto.style.color = '#32D74B';
        }
    }

    if (!contenedorLista) return;

    if (agendaVistaActual === 'calendario') {
        renderizarCalendarioAgenda();
        const claveMesActual = `${agendaCalAnio}-${String(agendaCalMes + 1).padStart(2, '0')}`;
        const itemsFiltradosCal = agendaPagos
            .filter(a => agendaDiaSeleccionado ? a.fecha === agendaDiaSeleccionado : (a.fecha && a.fecha.startsWith(claveMesActual)))
            .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));

        if (itemsFiltradosCal.length === 0) {
            const textoVacioCal = agendaDiaSeleccionado
                ? `No hay pagos agendados para el ${obtenerEtiquetaDiaCompleta(agendaDiaSeleccionado)}.`
                : `No hay compromisos registrados en este mes.`;
            contenedorLista.innerHTML = `
                <div style="text-align:center; padding: 24px 16px; color: var(--text-secondary); font-size: 13.5px;">
                    <p style="margin-bottom: 10px;">${textoVacioCal}</p>
                    <button type="button" class="btn-secundario" style="width:auto; margin:0 auto; padding:8px 16px; font-size:13px;" onclick="abrirModalNuevaAgenda(null, '${agendaDiaSeleccionado || getLocalYYYYMMDD()}')">+ Agendar en esta fecha</button>
                </div>`;
        } else {
            contenedorLista.innerHTML = itemsFiltradosCal.map(item => construirTarjetaItemAgendaHTML(item)).join('');
        }
        return;
    }

    if (agendaVistaActual === 'pagados') {
        contenedorLista.innerHTML = pagados.length === 0
            ? `<p style="text-align:center; padding: 28px 16px; color: var(--text-secondary); font-size: 13.5px;">Aún no tienes compromisos completados.</p>`
            : pagados.map(item => construirTarjetaItemAgendaHTML(item)).join('');
        return;
    }

    if (pendientes.length === 0) {
        contenedorLista.innerHTML = `
            <div style="text-align:center; padding: 30px 16px; color: var(--text-secondary); font-size: 13.5px;">
                <p style="margin-bottom: 12px;">No tienes pagos ni suscripciones pendientes. ¡Todo al día!</p>
                <button type="button" class="btn-secundario" style="width:auto; margin:0 auto; padding:9px 18px; font-size:13px;" onclick="abrirModalNuevaAgenda()">+ Agendar mi primer pago</button>
            </div>`;
        return;
    }

    const grupoVencidos = pendientes.filter(a => calcularDiasRestantesAgenda(a.fecha) < 0);
    const grupoHoy = pendientes.filter(a => calcularDiasRestantesAgenda(a.fecha) === 0);
    const grupoProximos3 = pendientes.filter(a => { const d = calcularDiasRestantesAgenda(a.fecha); return d >= 1 && d <= 3; });
    const grupoFuturos = pendientes.filter(a => calcularDiasRestantesAgenda(a.fecha) > 3);

    let htmlPend = '';
    if (grupoVencidos.length > 0) htmlPend += `<div class="agenda-group-title" style="color:#FF453A;">🚨 Vencidos (${grupoVencidos.length})</div>` + grupoVencidos.map(item => construirTarjetaItemAgendaHTML(item)).join('');
    if (grupoHoy.length > 0) htmlPend += `<div class="agenda-group-title" style="color:#FF9F0A;">⚡ Para Hoy (${grupoHoy.length})</div>` + grupoHoy.map(item => construirTarjetaItemAgendaHTML(item)).join('');
    if (grupoProximos3.length > 0) htmlPend += `<div class="agenda-group-title" style="color:#FFD60A;">⏳ Próximos a Vencer (${grupoProximos3.length})</div>` + grupoProximos3.map(item => construirTarjetaItemAgendaHTML(item)).join('');
    if (grupoFuturos.length > 0) htmlPend += `<div class="agenda-group-title">🗓️ Más Adelante (${grupoFuturos.length})</div>` + grupoFuturos.map(item => construirTarjetaItemAgendaHTML(item)).join('');
    contenedorLista.innerHTML = htmlPend;
}

// ================= EJECUCIÓN DEL PAGO DE AGENDA CONECTADO A CUENTAS E HISTORIAL =================
function abrirModalPagarAgenda(idCompromiso) {
    if (cuentas.length === 0) return alert("Primero debes crear al menos una cuenta en Ajustes > Gestionar Cuentas.");
    const comp = agendaPagos.find(a => String(a.id) === String(idCompromiso));
    if (!comp) return;

    agendaPagoEnCursoId = comp.id;
    const selCuenta = document.getElementById('sel-cuenta-pagar-agenda');
    if (selCuenta) {
        selCuenta.innerHTML = '';
        cuentas.forEach(c => selCuenta.innerHTML += `<option value="${c.id}">${c.nombre} (${c.moneda})</option>`);
        const cuentaMismaMoneda = cuentas.find(c => c.moneda === comp.moneda);
        if (cuentaMismaMoneda) selCuenta.value = cuentaMismaMoneda.id;
        else if (cuentaActivaId && cuentas.find(c => c.id == cuentaActivaId)) selCuenta.value = cuentaActivaId;
        else selCuenta.value = cuentas[0].id;
    }

    const inMonto = document.getElementById('monto-pagar-agenda');
    const selMoneda = document.getElementById('moneda-pagar-agenda');
    const selCat = document.getElementById('cat-pagar-agenda');
    const inFecha = document.getElementById('fecha-pagar-agenda');
    const inNota = document.getElementById('nota-pagar-agenda');
    const selComision = document.getElementById('sel-comision-agenda');
    const inComManual = document.getElementById('input-comision-agenda-manual');
    const inTasaUsdt = document.getElementById('input-tasa-agenda-usdt');
    const descEl = document.getElementById('desc-pagar-agenda');

    if (descEl) descEl.innerHTML = `Vas a registrar el pago de <strong>"${comp.nota}"</strong>. Confirma de qué cuenta se descontará:`;
    if (inMonto) inMonto.value = comp.monto;
    if (selMoneda) selMoneda.value = comp.moneda || 'USD';
    poblarSelectCategoriasAgenda(selCat, comp.categoria);
    if (inFecha) inFecha.value = getLocalYYYYMMDD();
    if (inNota) inNota.value = comp.nota || '';
    if (selComision) selComision.value = 'tarjeta';
    if (inComManual) { inComManual.classList.add('oculto'); inComManual.value = ''; }
    if (inTasaUsdt) inTasaUsdt.value = tasaParalelo > 1 ? tasaParalelo.toFixed(2) : '';

    actualizarUIModalPagarAgenda();
    abrirModal('modal-pagar-agenda');
}

function toggleComisionManualAgenda() {
    const selComision = document.getElementById('sel-comision-agenda');
    const inManual = document.getElementById('input-comision-agenda-manual');
    if (!selComision || !inManual) return;
    if (selComision.value === 'manual') { inManual.classList.remove('oculto'); inManual.focus(); }
    else { inManual.classList.add('oculto'); inManual.value = ''; }
}

function actualizarUIModalPagarAgenda() {
    const idCuenta = document.getElementById('sel-cuenta-pagar-agenda')?.value;
    const cuenta = cuentas.find(c => c.id == idCuenta);
    const monedaPago = document.getElementById('moneda-pagar-agenda')?.value || 'USD';

    const boxComision = document.getElementById('box-comision-agenda-ves');
    const boxTasaUsdt = document.getElementById('box-tasa-agenda-usdt');
    const inTasaUsdt = document.getElementById('input-tasa-agenda-usdt');

    if (boxComision) {
        if (monedaPago === 'VES') {
            boxComision.classList.remove('oculto'); boxComision.style.display = 'flex';
        } else {
            boxComision.classList.add('oculto'); boxComision.style.display = 'none';
            const selCom = document.getElementById('sel-comision-agenda');
            if (selCom) selCom.value = 'tarjeta';
            toggleComisionManualAgenda();
        }
    }

    const requiereTasaUsdt = Boolean(cuenta && ((cuenta.moneda === 'USDT' && monedaPago === 'VES') || (cuenta.moneda === 'VES' && monedaPago === 'USDT')));
    if (boxTasaUsdt) {
        if (requiereTasaUsdt) {
            boxTasaUsdt.classList.remove('oculto'); boxTasaUsdt.style.display = 'flex';
            if (inTasaUsdt && (!inTasaUsdt.value || parseFloat(inTasaUsdt.value) <= 0)) {
                inTasaUsdt.value = tasaParalelo > 1 ? tasaParalelo.toFixed(2) : '';
            }
        } else {
            boxTasaUsdt.classList.add('oculto'); boxTasaUsdt.style.display = 'none';
        }
    }
    calcularPreviewModalPagarAgenda();
}

function calcularDatosConversionPagoAgenda() {
    const idCuenta = document.getElementById('sel-cuenta-pagar-agenda')?.value;
    const cuenta = cuentas.find(c => c.id == idCuenta);
    const montoBase = parseFloat(document.getElementById('monto-pagar-agenda')?.value) || 0;
    const monedaPago = document.getElementById('moneda-pagar-agenda')?.value || 'USD';

    let comisionBs = 0;
    if (monedaPago === 'VES') {
        const tipoCom = document.getElementById('sel-comision-agenda')?.value || 'tarjeta';
        if (tipoCom === 'p2p' && montoBase > 0) comisionBs = Math.max(14.00, montoBase * 0.003);
        else if (tipoCom === 'p2c' && montoBase > 0) comisionBs = Math.max(14.00, montoBase * 0.015);
        else if (tipoCom === 'manual') comisionBs = parseFloat(document.getElementById('input-comision-agenda-manual')?.value) || 0;
    }

    const montoTotalOperacion = montoBase + comisionBs;
    const tasaUsdtInput = parseFloat(document.getElementById('input-tasa-agenda-usdt')?.value) || tasaParalelo || tasaBCV || 1;
    let montoUSD = montoTotalOperacion;
    let detalleTasaUsdt = '';

    if (cuenta && cuenta.moneda === 'USDT') {
        if (monedaPago === 'USDT' || monedaPago === 'USD') montoUSD = montoTotalOperacion;
        else if (monedaPago === 'VES') {
            montoUSD = tasaUsdtInput > 0 ? (montoTotalOperacion / tasaUsdtInput) : 0;
            detalleTasaUsdt = `@ Tasa USDT: Bs ${tasaUsdtInput.toFixed(2)}`;
        } else if (monedaPago === 'EUR') {
            const enBs = montoTotalOperacion * (tasaEUR || 1);
            montoUSD = tasaUsdtInput > 0 ? (enBs / tasaUsdtInput) : 0;
        }
    } else {
        if (monedaPago === 'VES') montoUSD = montoTotalOperacion / (tasaBCV || 1);
        else if (monedaPago === 'EUR') montoUSD = (montoTotalOperacion * (tasaEUR || 1)) / (tasaBCV || 1);
        else if (monedaPago === 'USDT' && cuenta && cuenta.moneda === 'VES') {
            const enBs = montoTotalOperacion * tasaUsdtInput;
            montoUSD = enBs / (tasaBCV || 1);
            detalleTasaUsdt = `@ Tasa USDT: Bs ${tasaUsdtInput.toFixed(2)}`;
        } else montoUSD = montoTotalOperacion;
    }

    return { cuenta, montoBase, monedaPago, comisionBs, montoTotalOperacion, montoUSD, detalleTasaUsdt };
}

function calcularPreviewModalPagarAgenda() {
    const lblPreview = document.getElementById('lbl-descuento-agenda-preview');
    if (!lblPreview) return;
    const datos = calcularDatosConversionPagoAgenda();
    if (!datos.cuenta) { lblPreview.innerText = '$0.00'; return; }

    if (datos.cuenta.moneda === 'VES') {
        const totalBsCuenta = datos.montoUSD * (tasaBCV || 1);
        lblPreview.innerText = `-Bs ${totalBsCuenta.toFixed(2)} ($${datos.montoUSD.toFixed(2)})`;
    } else if (datos.cuenta.moneda === 'USDT') {
        lblPreview.innerText = `-${datos.montoUSD.toFixed(2)} USDT`;
    } else {
        lblPreview.innerText = `-$${datos.montoUSD.toFixed(2)}`;
    }
}

function confirmarPagoAgenda() {
    const comp = agendaPagos.find(a => String(a.id) === String(agendaPagoEnCursoId));
    if (!comp) return alert("No se encontró el compromiso en la agenda.");

    const datos = calcularDatosConversionPagoAgenda();
    if (!datos.cuenta) return alert("Selecciona una cuenta válida.");
    if (isNaN(datos.montoBase) || datos.montoBase <= 0) return alert("Ingresa un monto válido mayor a 0.");

    const categoriaElegida = document.getElementById('cat-pagar-agenda')?.value || comp.categoria || 'Varios';
    const valFecha = document.getElementById('fecha-pagar-agenda')?.value;
    const notaUsuario = (document.getElementById('nota-pagar-agenda')?.value || comp.nota || '').trim();

    if (categoriaElegida && !categorias.includes(categoriaElegida)) {
        categorias.push(categoriaElegida);
        asegurarColoresCategorias();
    }

    const dateObj = valFecha ? new Date(valFecha + "T00:00:00") : new Date();
    const isoLocal = getLocalYYYYMMDD(dateObj);
    const mesesArr = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const fechaFormateada = `${dateObj.getDate()} ${mesesArr[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

    let notaFinal = notaUsuario ? `📅 ${notaUsuario}` : `📅 Pago Agenda: ${comp.nota}`;
    if (datos.comisionBs > 0) notaFinal += ` (Comisión: Bs ${datos.comisionBs.toFixed(2)})`;
    if (datos.detalleTasaUsdt) notaFinal += ` (${datos.detalleTasaUsdt})`;

    const fechaPreviaCompromiso = comp.fecha;
    const nuevoIdTrans = dateObj.getTime() + Math.random();

    transacciones.push({
        id: nuevoIdTrans,
        cuentaId: datos.cuenta.id,
        montoUSD: datos.montoUSD,
        tipo: 'gasto',
        categoria: categoriaElegida,
        nota: notaFinal,
        monedaInputOriginal: datos.monedaPago,
        fechaFormateada: fechaFormateada,
        fecha: dateObj,
        fechaIsoLocal: isoLocal,
        agendaId: comp.id,
        agendaFrecuencia: comp.frecuencia || 'unico',
        agendaFechaPrevia: fechaPreviaCompromiso
    });
    transacciones.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    if (comp.frecuencia === 'mensual') {
        comp.ultimaFechaPagada = fechaPreviaCompromiso;
        comp.fecha = avanzarUnMesFechaISO(comp.fecha);
        comp.estado = 'pendiente';
        comp.ultimaTransaccionId = nuevoIdTrans;
    } else {
        comp.estado = 'pagado';
        comp.ultimaFechaPagada = isoLocal;
        comp.ultimaTransaccionId = nuevoIdTrans;
    }

    cuentaActivaId = datos.cuenta.id;
    agendaPagoEnCursoId = null;
    guardarYActualizarGestion();
    cerrarModal('modal-pagar-agenda');
}

function obtenerRadiografiaFinanciera() {
    const balancesPorCuenta = cuentas.map(c => {
        let balUSD = 0;
        transacciones.forEach(t => {
            if (t.cuentaId == c.id) balUSD += t.tipo === 'ingreso' ? (Number(t.montoUSD) || 0) : -(Number(t.montoUSD) || 0);
        });
        return { ...c, balanceUSD: balUSD };
    });

    const patrimonioTotalUSD = balancesPorCuenta.reduce((acc, c) => acc + c.balanceUSD, 0);
    const compromisosPendientes = agendaPagos
        .filter(a => a.estado !== 'pagado')
        .map(a => ({ ...a, montoEquivalenteUSD: convertirMontoAgendaAUSD(a.monto, a.moneda), diasRestantes: calcularDiasRestantesAgenda(a.fecha) }))
        .sort((a, b) => a.diasRestantes - b.diasRestantes);
    const totalCompromisosPendientesUSD = compromisosPendientes.reduce((acc, a) => acc + a.montoEquivalenteUSD, 0);

    return {
        cuentas: balancesPorCuenta,
        patrimonioTotalUSD,
        metas,
        agendaPendientes: compromisosPendientes,
        totalAgendaPendienteUSD: totalCompromisosPendientesUSD,
        tasas: { BCV: tasaBCV, USDT: tasaParalelo, EUR: tasaEUR }
    };
}

// ================= CALCULADORA, BRECHA ($/USDT), FECHA VALOR Y CALENDARIO HISTÓRICO ("AL CAMBIO") =================
let calcModoTasa = 'BCV'; 
let calcUltimaEdicion = 'USD'; 

function formatFechaCorta(isoString) {
    if(!isoString) return "Actualizando...";
    const d = parsearFechaSeguraLocal(isoString);
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return `${dias[d.getDay()]}, ${d.getDate()}/${d.getMonth()+1}/${String(d.getFullYear()).slice(-2)}`;
}

function esFechaFutura(isoString) {
    if(!isoString) return false;
    const d = parsearFechaSeguraLocal(isoString);
    const today = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() > new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
}

function actualizarBrechaCambiaria() {
    const badgeHome = document.getElementById('badge-brecha-home');
    const badgeCalc = document.getElementById('calc-brecha-box');
    const bcvRef = Number(tasaBCV) || 1;
    const usdtRef = Number(tasaParalelo) || 1;
    const brechaPct = bcvRef > 0 ? ((usdtRef - bcvRef) / bcvRef) * 100 : 0;
    const signo = brechaPct > 0 ? '+' : '';

    if (badgeHome) badgeHome.innerText = `Brecha: ${signo}${brechaPct.toFixed(2)}%`;
    if (badgeCalc) badgeCalc.innerText = `Brecha ($/USDT): ${signo}${brechaPct.toFixed(2)}%`;
}

function obtenerTasaEnFechaHistorica(modo, fechaISO) {
    const serie = tasasHistoricas[modo] || [];
    if (!serie || serie.length === 0) return tasasData[modo] || { valor: 1, previo: 1, fecha: fechaISO };

    let idxElegido = -1;
    for (let i = 0; i < serie.length; i++) {
        if (serie[i].fecha <= fechaISO) idxElegido = i;
        else break;
    }
    if (idxElegido === -1) idxElegido = 0;

    const itemActual = serie[idxElegido];
    let valorPrevio = itemActual.promedio;
    if (idxElegido > 0) {
        valorPrevio = serie[idxElegido - 1].promedio;
        if (Math.abs(itemActual.promedio - valorPrevio) < 0.0001) {
            for (let k = idxElegido - 2; k >= Math.max(0, idxElegido - 5); k--) {
                if (Math.abs(itemActual.promedio - serie[k].promedio) >= 0.0001) {
                    valorPrevio = serie[k].promedio;
                    break;
                }
            }
        }
    }
    return { valor: itemActual.promedio, previo: valorPrevio, fecha: itemActual.fecha };
}

function actualizarInfoCalculadora(modo) {
    const varBox = document.getElementById('calc-variacion-box');
    const badge = document.getElementById('calc-fecha-badge');
    const banner = document.getElementById('banner-fecha-valor');
    const bannerTexto = document.getElementById('banner-fecha-valor-texto');
    const lblEstado = document.getElementById('calc-estado-tasa-lbl');
    const btnSwitchCalc = document.getElementById('btn-calc-switch-fecha');
    const icoSwitchCalc = document.getElementById('ico-calc-switch-fecha');
    const btnSwitchHome = document.getElementById('btn-home-switch-fecha');

    if (modo === 'Custom') {
        if (varBox) varBox.classList.add('oculto');
        if (banner) banner.classList.add('oculto');
        if (badge) { badge.innerText = "Personalizada"; badge.classList.remove('fecha-futura-activa'); }
        if (lblEstado) lblEstado.innerText = "Tasa definida manualmente:";
        if (btnSwitchCalc && !fechaHistoricaCalcSeleccionada && !hayFechaPosteriorBCV) {
            btnSwitchCalc.classList.add('oculto'); btnSwitchCalc.style.display = 'none';
        }
        return;
    }

    if (varBox) varBox.classList.remove('oculto');
    let data = fechaHistoricaCalcSeleccionada ? obtenerTasaEnFechaHistorica(modo, fechaHistoricaCalcSeleccionada) : tasasData[modo];
    if (!data) return;

    const diffAbs = data.valor - data.previo;
    const diffPct = data.previo ? (diffAbs / data.previo) * 100 : 0;

    if (varBox) {
        if (diffAbs > 0.0001) { varBox.innerText = `↑ +${diffAbs.toFixed(2)} Bs (+${diffPct.toFixed(2)}%)`; varBox.className = 'tasa-variacion var-positiva'; }
        else if (diffAbs < -0.0001) { varBox.innerText = `↓ ${diffAbs.toFixed(2)} Bs (-${Math.abs(diffPct).toFixed(2)}%)`; varBox.className = 'tasa-variacion var-negativa'; }
        else { varBox.innerText = `− 0.00 Bs (0.00%)`; varBox.className = 'tasa-variacion var-neutra'; }
    }

    if (fechaHistoricaCalcSeleccionada) {
        const fechaMostrada = formatFechaCorta(fechaHistoricaCalcSeleccionada);
        if (badge) { badge.innerText = `📅 Histórica: ${fechaMostrada}`; badge.classList.add('fecha-futura-activa'); }
        if (lblEstado) lblEstado.innerText = `Variación del ${fechaMostrada}:`;
        if (banner) {
            banner.classList.remove('oculto');
            if (bannerTexto) bannerTexto.innerText = `Consultando tasa histórica (${fechaMostrada}). Toca ↩ para volver a hoy.`;
        }
        if (btnSwitchCalc) {
            btnSwitchCalc.classList.remove('oculto'); btnSwitchCalc.style.display = 'flex';
            btnSwitchCalc.classList.add('destacado-ambar');
        }
        if (icoSwitchCalc) icoSwitchCalc.innerText = '↩';
        return;
    }

    const viendoFutura = (usandoFechaPosterior && hayFechaPosteriorBCV && (modo === 'BCV' || modo === 'EUR')) || esFechaFutura(data.fecha);

    if (badge && data.fecha) {
        const fCorta = formatFechaCorta(data.fecha);
        badge.innerText = viendoFutura ? `⏳ Fecha Valor: ${fCorta}` : fCorta;
        badge.classList.toggle('fecha-futura-activa', Boolean(viendoFutura));
    }
    if (lblEstado) {
        lblEstado.innerText = viendoFutura ? "Variación respecto a la tasa vigente:" : "Variación respecto al cierre previo:";
    }
    if (banner) {
        if (viendoFutura) {
            banner.classList.remove('oculto');
            if (bannerTexto) bannerTexto.innerText = `Viendo tasa con fecha valor futura BCV (${formatFechaCorta(data.fecha)})`;
        } else {
            banner.classList.add('oculto');
        }
    }

    if (hayFechaPosteriorBCV) {
        if (btnSwitchCalc) {
            btnSwitchCalc.classList.remove('oculto'); btnSwitchCalc.style.display = 'flex';
            btnSwitchCalc.classList.toggle('destacado-ambar', Boolean(usandoFechaPosterior));
        }
        if (icoSwitchCalc) icoSwitchCalc.innerText = usandoFechaPosterior ? '↩' : '📅→';
        if (btnSwitchHome) {
            btnSwitchHome.classList.remove('oculto'); btnSwitchHome.style.display = 'inline-flex';
            btnSwitchHome.innerText = usandoFechaPosterior ? '↩ Hoy' : '📅→';
        }
    } else {
        if (btnSwitchCalc) { btnSwitchCalc.classList.add('oculto'); btnSwitchCalc.style.display = 'none'; btnSwitchCalc.classList.remove('destacado-ambar'); }
        if (btnSwitchHome) { btnSwitchHome.classList.add('oculto'); btnSwitchHome.style.display = 'none'; }
    }
}

function setTasaModo(modo) {
    calcModoTasa = modo;
    document.querySelectorAll('#tab-calculadora .segment').forEach(el => el.classList.remove('activo'));
    if(modo === 'BCV') document.getElementById('seg-bcv').classList.add('activo');
    if(modo === 'USDT') document.getElementById('seg-usdt').classList.add('activo');
    if(modo === 'EUR') document.getElementById('seg-eur').classList.add('activo');
    if(modo === 'Custom') document.getElementById('seg-custom').classList.add('activo');

    const inputTasa = document.getElementById('input-tasa-activa');
    const lblDivisa = document.getElementById('lbl-divisa');
    const symDivisa = document.getElementById('sym-divisa');
    const avisoUsdt = document.getElementById('aviso-usdt-calc');

    if (avisoUsdt) {
        avisoUsdt.classList.toggle('oculto', modo !== 'USDT');
        avisoUsdt.style.display = modo === 'USDT' ? 'block' : 'none';
    }

    let valorUsar = tasasData[modo] ? tasasData[modo].valor : 1;
    if (modo !== 'Custom' && fechaHistoricaCalcSeleccionada) {
        const histObj = obtenerTasaEnFechaHistorica(modo, fechaHistoricaCalcSeleccionada);
        if (histObj && histObj.valor > 0) valorUsar = histObj.valor;
    }

    if(modo === 'BCV') { inputTasa.value = valorUsar.toFixed(2); inputTasa.disabled = true; lblDivisa.innerText = '🇺🇸 Dólares (USD)'; symDivisa.innerText = '$'; }
    if(modo === 'USDT') { inputTasa.value = valorUsar.toFixed(2); inputTasa.disabled = true; lblDivisa.innerText = '🪙 Tether (USDT)'; symDivisa.innerText = '₮'; }
    if(modo === 'EUR') { inputTasa.value = valorUsar.toFixed(2); inputTasa.disabled = true; lblDivisa.innerText = '🇪🇺 Euros (EUR)'; symDivisa.innerText = '€'; }
    if(modo === 'Custom') { inputTasa.disabled = false; inputTasa.focus(); if(parseFloat(inputTasa.value) === 0) inputTasa.value = "1.00"; lblDivisa.innerText = '💱 Divisa Base'; symDivisa.innerText = '$'; }
    actualizarInfoCalculadora(modo);
    recalcularDesdeTasa();
}

function alternarFechaValorCalc() {
    if (fechaHistoricaCalcSeleccionada) {
        fechaHistoricaCalcSeleccionada = null;
        const inCal = document.getElementById('input-calc-fecha-hist');
        if (inCal) inCal.value = '';
        aplicarTasasEnInterfaz();
        return;
    }
    if (!hayFechaPosteriorBCV) return;
    usandoFechaPosterior = !usandoFechaPosterior;
    aplicarTasasEnInterfaz();
}

function seleccionarFechaHistoricaCalc(fechaISO) {
    if (!fechaISO) {
        fechaHistoricaCalcSeleccionada = null;
        aplicarTasasEnInterfaz();
        return;
    }
    const hoyIso = getLocalYYYYMMDD();
    if (fechaISO === hoyIso) {
        fechaHistoricaCalcSeleccionada = null;
        usandoFechaPosterior = false;
        aplicarTasasEnInterfaz();
        return;
    }
    if (hayFechaPosteriorBCV && tasasFechaPosterior.BCV && fechaISO === tasasFechaPosterior.BCV.fecha) {
        fechaHistoricaCalcSeleccionada = null;
        usandoFechaPosterior = true;
        aplicarTasasEnInterfaz();
        return;
    }
    fechaHistoricaCalcSeleccionada = fechaISO;
    if (calcModoTasa === 'Custom') calcModoTasa = 'BCV';
    setTasaModo(calcModoTasa);
}

function getTasaActiva() { return parseFloat(document.getElementById('input-tasa-activa').value) || 1; }
function calcularDesde(origen) {
    calcUltimaEdicion = origen;
    const tasa = getTasaActiva();
    const inputUSD = document.getElementById('calc-usd');
    const inputVES = document.getElementById('calc-ves');
    if(origen === 'USD') { let valUSD = parseFloat(inputUSD.value) || 0; if(inputUSD.value === '') inputVES.value = ''; else inputVES.value = (valUSD * tasa).toFixed(2); } 
    else if (origen === 'VES') { let valVES = parseFloat(inputVES.value) || 0; if(inputVES.value === '') inputUSD.value = ''; else inputUSD.value = (valVES / tasa).toFixed(2); }
}
function recalcularDesdeTasa() { calcularDesde(calcUltimaEdicion); }
function limpiarCalc() { document.getElementById('calc-usd').value = ''; document.getElementById('calc-ves').value = ''; }

// ================= NAVEGACIÓN =================
function resetearScrollNativoiOS() {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
}

function cambiarPestana(idPestana, elementoNav) {
    const inputAskbot = document.getElementById('askbot-input');
    if (inputAskbot && idPestana !== 'tab-askbot') inputAskbot.blur();

    document.querySelectorAll('.tab-content, .vista-activa').forEach(el => el.className = 'vista-oculta');
    document.getElementById(idPestana).className = 'vista-activa';
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('activo'));
    elementoNav.classList.add('activo');

    if (idPestana === 'tab-agenda') renderizarAgenda();

    if (idPestana === 'tab-askbot') {
        document.body.classList.add('askbot-tab-open');
        resetearScrollNativoiOS();
        inicializarAskBot();
    } else {
        document.body.classList.remove('askbot-tab-open');
        document.body.classList.remove('askbot-kb-open');
        document.documentElement.style.setProperty('--askbot-vh', '100dvh');
        resetearScrollNativoiOS();
    }
}

// ================= ASKBOT (MODO EN MANTENIMIENTO LIGERO) =================
function ajustarAlturaVisualAskBot() {}
function configurarVisualViewportAskBot() {}

function inicializarAskBot() {
    const hero = document.getElementById('askbot-welcome-hero');
    const box = document.getElementById('askbot-messages');
    const inputBar = document.querySelector('.askbot-input-bar');

    if (box) { box.innerHTML = ''; box.classList.add('oculto-chat'); }
    if (inputBar) { inputBar.style.opacity = '0.45'; inputBar.style.pointerEvents = 'none'; }
    if (hero) {
        hero.classList.remove('oculto-hero');
        hero.innerHTML = `
            <div class="askbot-hero-orb" style="margin-top: auto;">🛠️</div>
            <h2 class="askbot-hero-title">AskBot en Mantenimiento</h2>
            <p class="askbot-hero-sub" style="margin-bottom: auto; max-width: 280px;">
                Estamos rediseñando el motor de inteligencia artificial desde cero para ofrecerte una experiencia superior en la próxima actualización.
            </p>
        `;
    }
}
function limpiarChatAskBot() { inicializarAskBot(); }
function enviarSugerenciaAskBot() { inicializarAskBot(); }
function enviarMensajeAskBot() { inicializarAskBot(); }

// ================= CEREBRO INTELIGENTE DE TASAS + HISTORIAL REAL PERSISTENTE =================
function procesarHistorial(key, currentValor, currentFecha) {
    let history = JSON.parse(localStorage.getItem(`history_${key}`));
    const hoy = new Date().toDateString();
    if (!history) history = { prev: currentValor, last: currentValor, date: hoy };
    if (history.date !== hoy) { history.prev = history.last; history.date = hoy; }
    if (currentValor > 0) history.last = currentValor; 
    localStorage.setItem(`history_${key}`, JSON.stringify(history));
    return { valor: history.last, previo: history.prev, fecha: currentFecha };
}

function normalizarSerieHistorica(listaRaw, valorActual = null, fechaActualRaw = null) {
    const mapa = {};
    if (Array.isArray(listaRaw)) {
        listaRaw.forEach(item => {
            if (!item) return;
            const prom = Number(item.promedio ?? item.valor ?? 0);
            const fStr = String(item.fecha || item.fechaActualizacion || '').slice(0, 10);
            if (prom > 0 && /^\d{4}-\d{2}-\d{2}$/.test(fStr)) {
                mapa[fStr] = { fecha: fStr, promedio: prom };
            }
        });
    }
    if (valorActual && Number(valorActual) > 0 && fechaActualRaw) {
        const fAct = getLocalYYYYMMDD(parsearFechaSeguraLocal(fechaActualRaw));
        mapa[fAct] = { fecha: fAct, promedio: Number(valorActual) };
    }
    return Object.values(mapa).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function extraerVigenteYFuturaDeSerie(serie, valorLive, fechaLiveRaw, keyFallback) {
    const hoyIso = getLocalYYYYMMDD();
    if (!Array.isArray(serie) || serie.length === 0) {
        const fallback = procesarHistorial(keyFallback, valorLive || 1, fechaLiveRaw || hoyIso);
        return { vigente: fallback, futura: null };
    }

    const buscarPrevioDiferente = (idx) => {
        if (idx <= 0) return serie[0].promedio;
        let prev = serie[idx - 1].promedio;
        if (Math.abs(serie[idx].promedio - prev) < 0.0001) {
            for (let k = idx - 2; k >= Math.max(0, idx - 5); k--) {
                if (Math.abs(serie[idx].promedio - serie[k].promedio) >= 0.0001) {
                    prev = serie[k].promedio;
                    break;
                }
            }
        }
        return prev;
    };

    let idxVigente = -1;
    let idxFutura = -1;
    for (let i = 0; i < serie.length; i++) {
        if (serie[i].fecha <= hoyIso) idxVigente = i;
        else if (idxFutura === -1) idxFutura = i;
    }
    if (idxVigente === -1) idxVigente = serie.length - 1;

    const itemVig = serie[idxVigente];
    const vigenteObj = {
        valor: itemVig.promedio,
        previo: buscarPrevioDiferente(idxVigente),
        fecha: itemVig.fecha
    };

    let futuraObj = null;
    if (idxFutura !== -1) {
        const itemFut = serie[idxFutura];
        futuraObj = {
            valor: itemFut.promedio,
            previo: itemVig.promedio,
            fecha: itemFut.fecha
        };
    } else if (fechaLiveRaw) {
        const fLiveIso = getLocalYYYYMMDD(parsearFechaSeguraLocal(fechaLiveRaw));
        if (fLiveIso > hoyIso && Number(valorLive) > 0) {
            futuraObj = {
                valor: Number(valorLive),
                previo: itemVig.promedio,
                fecha: fLiveIso
            };
        }
    }

    if (!futuraObj && Number(valorLive) > 0) {
        vigenteObj.valor = Number(valorLive);
    }

    return { vigente: vigenteObj, futura: futuraObj };
}

function aplicarTasasEnInterfaz() {
    if (usandoFechaPosterior && hayFechaPosteriorBCV && tasasFechaPosterior.BCV) {
        tasasData.BCV = { ...tasasFechaPosterior.BCV };
        tasasData.EUR = tasasFechaPosterior.EUR ? { ...tasasFechaPosterior.EUR } : { ...tasasVigentesHoy.EUR };
    } else {
        tasasData.BCV = { ...tasasVigentesHoy.BCV };
        tasasData.EUR = { ...tasasVigentesHoy.EUR };
    }
    tasasData.USDT = { ...tasasVigentesHoy.USDT };
    tasasData.Custom.fecha = new Date().toISOString();

    tasaBCV = tasasData.BCV.valor || 1;
    tasaEUR = tasasData.EUR.valor || 1;
    tasaParalelo = tasasData.USDT.valor || 1;

    const setVariacionHome = (id, dataObj) => {
        const el = document.getElementById(id);
        if (!el || !dataObj) return;
        const diffAbs = dataObj.valor - dataObj.previo;
        const pct = dataObj.previo ? ((diffAbs / dataObj.previo) * 100).toFixed(2) : "0.00";
        if (diffAbs > 0.0001) { el.innerText = `+${pct}%`; el.className = 'tasa-variacion var-positiva'; }
        else if (diffAbs < -0.0001) { el.innerText = `${pct}%`; el.className = 'tasa-variacion var-negativa'; }
        else { el.innerText = `0.00%`; el.className = 'tasa-variacion var-neutra'; }
    };

    setVariacionHome('var-bcv', tasasData.BCV);
    setVariacionHome('var-eur', tasasData.EUR);
    setVariacionHome('var-usdt', tasasData.USDT);

    const elValBcv = document.getElementById('val-bcv');
    const elValEur = document.getElementById('val-eur');
    const elValUsdt = document.getElementById('val-usdt');
    if (elValBcv) elValBcv.innerText = `Bs ${tasaBCV.toFixed(2)}`;
    if (elValEur) elValEur.innerText = `Bs ${tasaEUR.toFixed(2)}`;
    if (elValUsdt) elValUsdt.innerText = `Bs ${tasaParalelo.toFixed(2)}`;

    const elFechaTasas = document.getElementById('fecha-tasas');
    if (elFechaTasas && tasasData.BCV.fecha) {
        const f = parsearFechaSeguraLocal(tasasData.BCV.fecha);
        const prefijo = (usandoFechaPosterior && hayFechaPosteriorBCV) ? '⏳ Fecha Valor:' : '🗓️ Vigente:';
        elFechaTasas.innerText = `${prefijo} ${f.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short' })}`;
    }

    actualizarBrechaCambiaria();

    const inputTasaUsdtVes = document.getElementById('input-tasa-usdt-ves');
    if (inputTasaUsdtVes && (!inputTasaUsdtVes.value || parseFloat(inputTasaUsdtVes.value) <= 1)) {
        inputTasaUsdtVes.value = tasaParalelo.toFixed(2);
        calcularEquivalenteUsdtVes();
    }

    actualizarInfoCalculadora(calcModoTasa);
    if (calcModoTasa !== 'Custom') {
        const tasaMostrarCalc = fechaHistoricaCalcSeleccionada
            ? obtenerTasaEnFechaHistorica(calcModoTasa, fechaHistoricaCalcSeleccionada).valor
            : tasasData[calcModoTasa].valor;
        const inActiva = document.getElementById('input-tasa-activa');
        if (inActiva) inActiva.value = (Number(tasaMostrarCalc) || 1).toFixed(2);
    }
    recalcularDesdeTasa();
    renderizarSliderCuentas();
    renderizarAgenda();
}

async function obtenerTasas() {
    // 1. Si hay historial en caché local, aplicarlo de inmediato para respuesta instantánea offline
    if (tasasHistoricas.BCV.length > 0 || tasasHistoricas.USDT.length > 0) {
        const infoBCV = extraerVigenteYFuturaDeSerie(tasasHistoricas.BCV, null, null, 'BCV');
        const infoEUR = extraerVigenteYFuturaDeSerie(tasasHistoricas.EUR, null, null, 'EUR');
        const infoUSDT = extraerVigenteYFuturaDeSerie(tasasHistoricas.USDT, null, null, 'USDT');
        tasasVigentesHoy.BCV = infoBCV.vigente;
        tasasVigentesHoy.EUR = infoEUR.vigente;
        tasasVigentesHoy.USDT = infoUSDT.vigente;
        tasasFechaPosterior.BCV = infoBCV.futura;
        tasasFechaPosterior.EUR = infoEUR.futura;
        hayFechaPosteriorBCV = Boolean(infoBCV.futura);
        aplicarTasasEnInterfaz();
    }

    try {
        const [resBCV, resEUR, resParalelo, resHistBCV, resHistEUR, resHistUSDT] = await Promise.all([
            fetch('https://ve.dolarapi.com/v1/dolares/oficial'),
            fetch('https://ve.dolarapi.com/v1/euros/oficial'),
            fetch('https://ve.dolarapi.com/v1/dolares/paralelo'),
            fetch('https://ve.dolarapi.com/v1/historicos/dolares/oficial').catch(() => null),
            fetch('https://ve.dolarapi.com/v1/historicos/euros/oficial').catch(() => null),
            fetch('https://ve.dolarapi.com/v1/historicos/dolares/paralelo').catch(() => null)
        ]);

        const [dataBCV, dataEUR, dataParalelo] = await Promise.all([
            resBCV.json(), resEUR.json(), resParalelo.json()
        ]);

        const rawHistBCV = (resHistBCV && resHistBCV.ok) ? await resHistBCV.json() : tasasHistoricas.BCV;
        const rawHistEUR = (resHistEUR && resHistEUR.ok) ? await resHistEUR.json() : tasasHistoricas.EUR;
        const rawHistUSDT = (resHistUSDT && resHistUSDT.ok) ? await resHistUSDT.json() : tasasHistoricas.USDT;

        tasasHistoricas.BCV = normalizarSerieHistorica(rawHistBCV, dataBCV.promedio, dataBCV.fechaActualizacion);
        tasasHistoricas.EUR = normalizarSerieHistorica(rawHistEUR, dataEUR.promedio, dataEUR.fechaActualizacion);
        tasasHistoricas.USDT = normalizarSerieHistorica(rawHistUSDT, dataParalelo.promedio, dataParalelo.fechaActualizacion);

        localStorage.setItem('assist_hist_serie_BCV', JSON.stringify(tasasHistoricas.BCV.slice(-120)));
        localStorage.setItem('assist_hist_serie_EUR', JSON.stringify(tasasHistoricas.EUR.slice(-120)));
        localStorage.setItem('assist_hist_serie_USDT', JSON.stringify(tasasHistoricas.USDT.slice(-120)));

        const analisisBCV = extraerVigenteYFuturaDeSerie(tasasHistoricas.BCV, dataBCV.promedio, dataBCV.fechaActualizacion, 'BCV');
        const analisisEUR = extraerVigenteYFuturaDeSerie(tasasHistoricas.EUR, dataEUR.promedio, dataEUR.fechaActualizacion, 'EUR');
        const analisisUSDT = extraerVigenteYFuturaDeSerie(tasasHistoricas.USDT, dataParalelo.promedio, dataParalelo.fechaActualizacion, 'USDT');

        tasasVigentesHoy.BCV = analisisBCV.vigente;
        tasasVigentesHoy.EUR = analisisEUR.vigente;
        tasasVigentesHoy.USDT = analisisUSDT.vigente;

        tasasFechaPosterior.BCV = analisisBCV.futura;
        tasasFechaPosterior.EUR = analisisEUR.futura;
        hayFechaPosteriorBCV = Boolean(analisisBCV.futura);
        if (!hayFechaPosteriorBCV) usandoFechaPosterior = false;

        aplicarTasasEnInterfaz();
    } catch (error) {
        console.error("Error de conexión al obtener tasas", error);
        const elFecha = document.getElementById('fecha-tasas');
        if (elFecha && tasasHistoricas.BCV.length === 0) elFecha.innerText = `⚠️ Modo Offline`;
    }
}

async function actualizarTasasManual() {
    const btn = document.getElementById('btn-refresh-tasas');
    btn.classList.add('spin');
    await obtenerTasas();
    actualizarInterfaz();
    setTimeout(() => btn.classList.remove('spin'), 1000); 
}

// ================= DASHBOARD Y SLIDER =================
function renderizarSliderCuentas() {
    const slider = document.getElementById('slider-cuentas');
    const dots = document.getElementById('slider-dots');
    if (!slider || !dots) return;
    slider.innerHTML = ''; dots.innerHTML = '';

    const iconOjo = censurado 
        ? `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>` 
        : `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;

    if (cuentas.length === 0) {
        slider.innerHTML = `<div class="balance-section blur-effect"><h2>Sin Cuenta</h2><h1>$0.00</h1><span class="balance-tipo">--</span></div>`;
        cuentaActivaId = null; actualizarListaTransacciones(); return;
    }

    cuentas.forEach((cuenta, index) => {
        let balanceUSD = 0;
        transacciones.forEach(t => { if (t.cuentaId == cuenta.id) balanceUSD += t.tipo === 'ingreso' ? t.montoUSD : -t.montoUSD; });
        let strBalanceGrande = "", strBalancePequeño = "";

        if (cuenta.moneda === 'VES') { 
            strBalanceGrande = `Bs ${Math.max(0, balanceUSD * tasaBCV).toFixed(2)}`; 
            const eqEUR = (balanceUSD * tasaBCV) / tasaEUR;
            strBalancePequeño = `$${balanceUSD.toFixed(2)} &nbsp;|&nbsp; €${eqEUR.toFixed(2)}`; 
        }
        else if (cuenta.moneda === 'USDT') { strBalanceGrande = `USDT ${balanceUSD.toFixed(2)}`; strBalancePequeño = `≈ Bs ${(balanceUSD * tasaParalelo).toFixed(2)}`; } 
        else if (cuenta.moneda === 'EUR') { strBalanceGrande = `€${(balanceUSD).toFixed(2)}`; strBalancePequeño = `≈ Bs ${(balanceUSD * tasaEUR).toFixed(2)}`; } 
        else { strBalanceGrande = `$${balanceUSD.toFixed(2)}`; strBalancePequeño = "Dólares / Físico"; }

        slider.innerHTML += `<div class="balance-section blur-effect" id="tarjeta-cuenta-${cuenta.id}"><h2>${cuenta.nombre} <button class="btn-ojo" onclick="toggleCensura(event)">${iconOjo}</button></h2><h1>${formatearMontoCensurado(strBalanceGrande, false)}</h1><span class="balance-tipo">${formatearMontoCensurado(strBalancePequeño, true)}</span></div>`;
        dots.innerHTML += `<div class="dot ${index === 0 ? 'activo' : ''}"></div>`;
    });

    if (!cuentaActivaId || !cuentas.find(c => c.id == cuentaActivaId)) cuentaActivaId = cuentas[0].id;
    actualizarOpcionesMoneda();

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const targetId = entry.target.id.replace('tarjeta-cuenta-', '');
                const index = cuentas.findIndex(c => c.id == targetId);
                document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('activo', i === index));
                if (cuentaActivaId != targetId) { cuentaActivaId = targetId; actualizarOpcionesMoneda(); actualizarListaTransacciones(); }
            }
        });
    }, { root: slider, threshold: 0.6 });

    document.querySelectorAll('.balance-section').forEach(section => observer.observe(section));
    const activeIndex = cuentas.findIndex(c => c.id == cuentaActivaId);
    if (activeIndex >= 0) setTimeout(() => { slider.scrollTo({ left: slider.clientWidth * activeIndex, behavior: 'instant' }); }, 10);
}

function actualizarInterfaz() {
    renderizarSliderCuentas();
    renderizarMetas();
    renderizarAgenda();
    actualizarUIPerfil();
    if (!document.getElementById('modal-historial').classList.contains('oculto')) actualizarListaTransacciones();
}

// ================= TRANSACCIONES REGISTRO =================
function agregarTransaccion() {
    if(cuentas.length === 0) return alert("Crea una cuenta en Ajustes primero");
    
    const tipo = document.getElementById('val-tipo').value;
    let categoria = tipo === 'gasto' ? document.getElementById('val-categoria').value : "Ingreso";
    if (tipo === 'gasto' && !categoria) return alert("Por favor, selecciona una categoría.");

    const monto = parseFloat(document.getElementById('monto').value);
    const monedaInput = document.getElementById('val-moneda').value;
    const nota = document.getElementById('val-nota').value.trim();
    if (isNaN(monto) || monto <= 0) return alert("Monto inválido");

    const valFecha = document.getElementById('val-fecha').value; 
    const dateObj = valFecha ? new Date(valFecha + "T00:00:00") : new Date();
    const isoLocal = getLocalYYYYMMDD(dateObj);
    const mesesArr = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const fechaFormateada = `${dateObj.getDate()} ${mesesArr[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

    if (tipo === 'transferencia') {
        const idO = document.getElementById('sel-transf-origen').value;
        const idD = document.getElementById('sel-transf-destino').value;
        if (idO === idD) return alert("La cuenta origen y destino no pueden ser la misma.");

        const cOrigen = cuentas.find(c => c.id == idO);
        const cDestino = cuentas.find(c => c.id == idD);
        const tasaTransf = parseFloat(document.getElementById('input-transf-tasa').value) || 1;
        
        let montoRecibir = monto;
        if (cOrigen.moneda !== cDestino.moneda) {
            if (cOrigen.moneda === 'VES') montoRecibir = monto / tasaTransf;
            else if (cDestino.moneda === 'VES') montoRecibir = monto * tasaTransf;
        }

        let montoUSD_Origen = cOrigen.moneda === 'VES' ? (monto / tasaBCV) : monto;
        const notaOr = nota ? `Hacia ${cDestino.nombre} - ${nota}` : `Transferencia hacia ${cDestino.nombre}`;
        transacciones.push({
            id: dateObj.getTime() + Math.random(), 
            cuentaId: idO, montoUSD: montoUSD_Origen, tipo: 'gasto', categoria: 'Transferencia / P2P',
            nota: cOrigen.moneda !== cDestino.moneda ? `${notaOr} @ Tasa: ${tasaTransf}` : notaOr,
            monedaInputOriginal: cOrigen.moneda, fechaFormateada: fechaFormateada, fecha: dateObj, fechaIsoLocal: isoLocal
        });

        let montoUSD_Destino = cDestino.moneda === 'VES' ? (montoRecibir / tasaBCV) : montoRecibir;
        const notaDes = nota ? `Desde ${cOrigen.nombre} - ${nota}` : `Transferencia desde ${cOrigen.nombre}`;
        transacciones.push({
            id: dateObj.getTime() + Math.random() + 1,
            cuentaId: idD, montoUSD: montoUSD_Destino, tipo: 'ingreso', categoria: 'Transferencia / P2P',
            nota: cOrigen.moneda !== cDestino.moneda ? `${notaDes} @ Tasa: ${tasaTransf}` : notaDes,
            monedaInputOriginal: cDestino.moneda, fechaFormateada: fechaFormateada, fecha: dateObj, fechaIsoLocal: isoLocal
        });

        transacciones.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        guardarYActualizarGestion();
        document.getElementById('monto').value = ''; document.getElementById('val-nota').value = '';
        document.getElementById('val-fecha').value = getLocalYYYYMMDD();
        document.getElementById('input-transf-tasa').value = '';
        document.getElementById('lbl-transf-recibiras').innerText = '0.00';
        return;
    }

    let montoTotalOperacion = monto;
    let montoComisionVES = 0;

    const boxComision = document.getElementById('box-comision-ves');
    if (tipo === 'gasto' && monedaInput === 'VES' && boxComision && !boxComision.classList.contains('oculto')) {
        const tipoComision = document.getElementById('sel-tipo-comision').value;
        if (tipoComision === 'p2p') montoComisionVES = Math.max(14.00, monto * 0.003);
        else if (tipoComision === 'p2c') montoComisionVES = Math.max(14.00, monto * 0.015);
        else if (tipoComision === 'manual') montoComisionVES = parseFloat(document.getElementById('input-comision-manual').value) || 0;
        montoTotalOperacion += montoComisionVES;
    }

    const cuentaActiva = cuentas.find(c => c.id == cuentaActivaId);
    let montoUSD = montoTotalOperacion;
    let detalleTasaUsdt = '';

    if (cuentaActiva && cuentaActiva.moneda === 'USDT') {
        if (monedaInput === 'USDT') montoUSD = montoTotalOperacion;
        else if (monedaInput === 'VES') {
            const inputTasaUsdt = document.getElementById('input-tasa-usdt-ves');
            const tasaUsdtAplicada = parseFloat(inputTasaUsdt && inputTasaUsdt.value) || tasaParalelo || tasaBCV || 1;
            if (tasaUsdtAplicada <= 0) return alert("Ingresa una tasa USDT válida.");
            montoUSD = montoTotalOperacion / tasaUsdtAplicada;
            detalleTasaUsdt = `@ Tasa USDT: Bs ${tasaUsdtAplicada.toFixed(2)}`;
        }
    } else {
        if (monedaInput === 'VES') montoUSD = montoTotalOperacion / tasaBCV;
        else if (monedaInput === 'EUR') montoUSD = (montoTotalOperacion * tasaEUR) / tasaBCV;
    }

    let notaFinal = nota;
    if (montoComisionVES > 0) {
        const detalle = `Comisión: Bs ${montoComisionVES.toFixed(2)}`;
        notaFinal = notaFinal ? `${notaFinal} (${detalle})` : detalle;
    }
    if (detalleTasaUsdt) {
        notaFinal = notaFinal ? `${notaFinal} (${detalleTasaUsdt})` : detalleTasaUsdt;
    }

    transacciones.push({
        id: dateObj.getTime() + Math.random(), 
        cuentaId: cuentaActivaId,
        montoUSD: montoUSD,
        tipo: tipo,
        categoria: categoria,
        nota: notaFinal,
        monedaInputOriginal: monedaInput, 
        fechaFormateada: fechaFormateada,
        fecha: dateObj,
        fechaIsoLocal: isoLocal
    });
    transacciones.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    guardarYActualizarGestion();
    
    document.getElementById('monto').value = ''; document.getElementById('val-categoria').value = ''; document.getElementById('val-nota').value = '';
    document.getElementById('val-fecha').value = getLocalYYYYMMDD();
    
    const selComision = document.getElementById('sel-tipo-comision');
    if(selComision) { selComision.value = 'tarjeta'; toggleComisionManual(); }
    const inputTasaUsdt = document.getElementById('input-tasa-usdt-ves');
    if (inputTasaUsdt) inputTasaUsdt.value = tasaParalelo > 1 ? tasaParalelo.toFixed(2) : '';
    calcularEquivalenteUsdtVes();
}

// Lógica de "Deslizar para Borrar" (Swipe to Delete)
let swipeStartX = 0;
let currentSwipeX = 0;

function handleSwipeStart(e, element) {
    swipeStartX = e.touches[0].clientX;
    currentSwipeX = swipeStartX;
    element.style.transition = 'none';
}
function handleSwipeMove(e, element) {
    currentSwipeX = e.touches[0].clientX;
    let diff = currentSwipeX - swipeStartX;
    if (diff < -80) diff = -80; if (diff > 0) diff = 0; 
    element.style.transform = `translateX(${diff}px)`;
    if (element.parentElement) {
        if (diff < -15) element.parentElement.classList.add('swiped-open');
        else element.parentElement.classList.remove('swiped-open');
    }
}
function handleSwipeEnd(e, element) {
    element.style.transition = 'transform 0.3s var(--ios-spring)';
    let diff = currentSwipeX - swipeStartX;
    if (diff < -40) {
        element.style.transform = `translateX(-80px)`;
        if (element.parentElement) element.parentElement.classList.add('swiped-open');
    } else {
        element.style.transform = `translateX(0px)`;
        if (element.parentElement) element.parentElement.classList.remove('swiped-open');
    }
}

function mostrarHistorialTotalCuenta() {
    const fFecha = document.getElementById('filtro-fecha');
    const fBuscar = document.getElementById('buscar-historial');
    if (fFecha) fFecha.value = '';
    if (fBuscar) fBuscar.value = '';
    actualizarListaTransacciones();
    const lista = document.getElementById('lista-transacciones');
    if (lista) lista.scrollTop = 0;
}

function obtenerEtiquetaMesAnio(isoYYYYMMDD) {
    const mesesNombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const partes = (isoYYYYMMDD || getLocalYYYYMMDD()).split('-');
    const anio = partes[0];
    const mesIdx = Math.max(0, Math.min(11, (parseInt(partes[1], 10) || 1) - 1));
    return `${mesesNombres[mesIdx]} ${anio}`;
}

function obtenerEtiquetaDiaCompleta(isoYYYYMMDD) {
    const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const mesesCortos = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const d = new Date((isoYYYYMMDD || getLocalYYYYMMDD()) + "T00:00:00");
    if (isNaN(d.getTime())) return isoYYYYMMDD;
    return `${diasSemana[d.getDay()]}, ${d.getDate()} de ${mesesCortos[d.getMonth()]}`;
}

function actualizarListaTransacciones() {
    const lista = document.getElementById('lista-transacciones');
    if (!lista) return;
    lista.innerHTML = ''; 
    if(!cuentaActivaId) return;

    const cuentaActiva = cuentas.find(c => c.id == cuentaActivaId);
    const tituloHist = document.getElementById('historial-titulo-cuenta');
    const subHist = document.getElementById('historial-subtitulo-filtro');
    const btnTotal = document.getElementById('btn-hist-total');
    const btnDia = document.getElementById('btn-hist-dia');

    if (tituloHist && cuentaActiva) tituloHist.innerText = `Historial · ${cuentaActiva.nombre}`;

    const query = document.getElementById('buscar-historial') ? document.getElementById('buscar-historial').value.toLowerCase().trim() : "";
    const fechaFiltro = document.getElementById('filtro-fecha') ? document.getElementById('filtro-fecha').value : "";

    if (btnTotal && btnDia) {
        btnTotal.classList.toggle('activo', !fechaFiltro);
        btnDia.classList.toggle('activo', Boolean(fechaFiltro));
    }

    let transCuenta = transacciones.filter(t => t.cuentaId == cuentaActivaId).slice().reverse();
    transCuenta = transCuenta.filter(t => {
        const montoStr = (Number(t.montoUSD) || 0).toFixed(2);
        const matchSearch = !query ||
            (t.categoria && t.categoria.toLowerCase().includes(query)) ||
            (t.nota && t.nota.toLowerCase().includes(query)) ||
            montoStr.includes(query);
        let matchDate = true;
        if(fechaFiltro) {
            const fechaT = t.fecha ? new Date(t.fecha) : new Date(t.id);
            const isoLocal = t.fechaIsoLocal || getLocalYYYYMMDD(fechaT);
            matchDate = (isoLocal === fechaFiltro);
        }
        return matchSearch && matchDate;
    });

    if (subHist) {
        if (fechaFiltro) subHist.innerText = `📅 Día seleccionado: ${obtenerEtiquetaDiaCompleta(fechaFiltro)} (${transCuenta.length})`;
        else if (query) subHist.innerText = `🔍 Resultados encontrados: ${transCuenta.length}`;
        else subHist.innerText = `Total de la cuenta: ${transCuenta.length} movimientos`;
    }

    if (transCuenta.length === 0) {
        lista.innerHTML = `<p style="text-align:center; padding: 24px 16px; color: var(--text-secondary); font-size: 14px;">No se encontraron movimientos en esta vista.</p>`;
    } else {
        const conteoPorMes = {};
        transCuenta.forEach(t => {
            const fObj = t.fecha ? new Date(t.fecha) : new Date(t.id);
            const iso = t.fechaIsoLocal || getLocalYYYYMMDD(fObj);
            const claveMes = iso.slice(0, 7);
            conteoPorMes[claveMes] = (conteoPorMes[claveMes] || 0) + 1;
        });

        let ultimoMesRenderizado = null;
        let ultimoDiaRenderizado = null;
        let htmlAcumulado = '';

        transCuenta.forEach((t, index) => {
            const fObj = t.fecha ? new Date(t.fecha) : new Date(t.id);
            const iso = t.fechaIsoLocal || getLocalYYYYMMDD(fObj);
            const claveMes = iso.slice(0, 7);

            if (!fechaFiltro && claveMes !== ultimoMesRenderizado) {
                ultimoMesRenderizado = claveMes;
                const cantMovsMes = conteoPorMes[claveMes] || 0;
                htmlAcumulado += `
                    <li class="hist-mes-header">
                        <span>🗓️ ${obtenerEtiquetaMesAnio(iso)}</span>
                        <span style="opacity: 0.75; font-size: 10.5px;">${cantMovsMes} ${cantMovsMes === 1 ? 'movimiento' : 'movimientos'}</span>
                    </li>`;
            }

            if (!fechaFiltro && iso !== ultimoDiaRenderizado) {
                ultimoDiaRenderizado = iso;
                htmlAcumulado += `<li class="hist-dia-header">${obtenerEtiquetaDiaCompleta(iso)}</li>`;
            }

            const claseColor = t.tipo === 'ingreso' ? 'monto-ingreso' : 'monto-gasto';
            const signo = t.tipo === 'ingreso' ? '+' : '-';
            const animDelay = Math.min(index * 0.03, 0.35);
            const colorCat = obtenerColorCategoria(t.categoria);
            const montoTexto = formatearMontoCensurado(`${signo}$${(Number(t.montoUSD) || 0).toFixed(2)}`, false);
            const htmlNota = t.nota ? `<div style="font-size: 11px; color: var(--text-secondary); margin-top:3px;">📝 ${t.nota}</div>` : '';
            
            htmlAcumulado += `
                <li class="transaccion-item swipe-container" style="animation: slideInRight 0.3s var(--ios-spring) ${animDelay}s both;">
                    <div class="swipe-content" ontouchstart="handleSwipeStart(event, this)" ontouchmove="handleSwipeMove(event, this)" ontouchend="handleSwipeEnd(event, this)">
                        <div class="trans-izq">
                            <div class="trans-cat-row">
                                <span class="trans-cat-dot" style="background:${colorCat}; --cat-color:${colorCat};"></span>
                                <strong>${t.categoria}</strong>
                            </div>
                            <small>${t.fechaFormateada || iso}</small>
                            ${htmlNota}
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span class="monto-val ${claseColor}">${montoTexto}</span>
                        </div>
                    </div>
                    <div class="swipe-action" onclick="eliminarTransaccion(${t.id})">🗑️</div>
                </li>`;
        });
        lista.innerHTML = htmlAcumulado;
    }
    renderizarGrafico(transCuenta); 
}

function eliminarTransaccion(id) {
    const tIndex = transacciones.findIndex(t => t.id === id);
    if (tIndex === -1) return;
    const t = transacciones[tIndex];

    if (t.categoria === 'Ahorro') {
        metas.forEach(m => {
            if (t.nota && t.nota.includes(m.nombre)) {
                if (t.tipo === 'gasto') {
                    m.acumulado -= t.montoUSD;
                    if (m.acumulado < 0) m.acumulado = 0;
                } else if (t.tipo === 'ingreso') {
                    m.acumulado += t.montoUSD;
                }
            }
        });
    }

    const compAgenda = agendaPagos.find(a =>
        (t.agendaId !== undefined && t.agendaId !== null && String(a.id) === String(t.agendaId)) ||
        (a.ultimaTransaccionId !== undefined && a.ultimaTransaccionId !== null && String(a.ultimaTransaccionId) === String(t.id))
    );
    if (compAgenda) {
        if (compAgenda.frecuencia === 'mensual' && (t.agendaFechaPrevia || compAgenda.ultimaFechaPagada)) {
            compAgenda.fecha = t.agendaFechaPrevia || compAgenda.ultimaFechaPagada || compAgenda.fecha;
        }
        compAgenda.estado = 'pendiente';
        compAgenda.ultimaTransaccionId = null;
    }
    
    transacciones.splice(tIndex, 1);
    guardarYActualizarGestion();
}

// ================= GRÁFICOS (CHART.JS + LEYENDA LATERAL DE COLORES POR CATEGORÍA) =================
function renderizarGrafico(transFiltered) {
    const canvas = document.getElementById('graficoGastos');
    const leyendaBox = document.getElementById('leyenda-grafico-categorias');
    const centroBox = document.getElementById('grafico-total-centro');
    if (!canvas) return;
    
    const gastos = transFiltered.filter(t => t.tipo === 'gasto' && t.categoria !== 'Transferencia / P2P');
    const dataAgrupada = {};
    let totalGastosUSD = 0;

    gastos.forEach(t => {
        const m = Number(t.montoUSD) || 0;
        const cat = t.categoria || 'Varios';
        dataAgrupada[cat] = (dataAgrupada[cat] || 0) + m;
        totalGastosUSD += m;
    });
    
    const entradasOrdenadas = Object.entries(dataAgrupada).sort((a, b) => b[1] - a[1]);
    const labels = entradasOrdenadas.map(e => e[0]);
    const data = entradasOrdenadas.map(e => e[1]);
    const coloresSegmentos = labels.map(cat => obtenerColorCategoria(cat));

    if (centroBox) {
        const textoTotalCentro = formatearMontoCensurado(`$${totalGastosUSD.toFixed(2)}`, false);
        centroBox.innerHTML = `<small>GASTOS</small><strong>${textoTotalCentro}</strong>`;
    }

    if (leyendaBox) {
        if (entradasOrdenadas.length === 0) {
            leyendaBox.innerHTML = `<div style="text-align: center; padding: 14px 6px; color: var(--text-secondary); font-size: 12px;">Sin gastos registrados en este periodo.</div>`;
        } else {
            leyendaBox.innerHTML = entradasOrdenadas.map(([cat, monto]) => {
                const color = obtenerColorCategoria(cat);
                const pct = totalGastosUSD > 0 ? ((monto / totalGastosUSD) * 100).toFixed(1) : '0.0';
                const montoCens = formatearMontoCensurado(`$${monto.toFixed(2)}`, false);
                return `
                    <div class="legend-cat-item">
                        <div class="legend-cat-left">
                            <span class="legend-cat-dot" style="background:${color}; --dot-color:${color};"></span>
                            <span class="legend-cat-name" title="${cat}">${cat}</span>
                        </div>
                        <div class="legend-cat-right">
                            <span class="legend-cat-amount">${montoCens}</span>
                            <span class="legend-cat-pct">${pct}%</span>
                        </div>
                    </div>`;
            }).join('');
        }
    }

    if (chartInstancia) chartInstancia.destroy(); 
    const modoActual = document.documentElement.getAttribute('data-theme') || 'dark';
    const colorVacio = modoActual === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';

    chartInstancia = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels.length > 0 ? labels : ['Sin Gastos'],
            datasets: [{
                data: data.length > 0 ? data : [1],
                backgroundColor: data.length > 0 ? coloresSegmentos : [colorVacio],
                borderWidth: 0, 
                hoverOffset: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: labels.length > 0,
                    callbacks: {
                        label: function(ctx) {
                            const val = Number(ctx.raw) || 0;
                            const pct = totalGastosUSD > 0 ? ((val / totalGastosUSD) * 100).toFixed(1) : '0.0';
                            return ` ${ctx.label}: $${val.toFixed(2)} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ================= GESTIÓN Y LISTAS =================
function cargarSelects() {
    asegurarColoresCategorias();
    const valCategoria = document.getElementById('val-categoria');
    if (valCategoria) {
        const prevVal = valCategoria.value;
        valCategoria.innerHTML = '<option value="" disabled selected>Categoría...</option>'; 
        if (categorias.length > 0) {
            categorias.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat; option.innerText = cat; valCategoria.appendChild(option);
            });
            if (prevVal && categorias.includes(prevVal)) valCategoria.value = prevVal;
        }
    }

    const selAgendaCat = document.getElementById('in-agenda-categoria');
    if (selAgendaCat) poblarSelectCategoriasAgenda(selAgendaCat, selAgendaCat.value);

    const selPagarAgendaCat = document.getElementById('cat-pagar-agenda');
    if (selPagarAgendaCat) poblarSelectCategoriasAgenda(selPagarAgendaCat, selPagarAgendaCat.value);
}

function renderizarListasGestion() {
    asegurarColoresCategorias();
    const lCuentas = document.getElementById('lista-gestion-cuentas');
    const lCat = document.getElementById('lista-gestion-categorias');
    if(lCuentas) {
        lCuentas.innerHTML = '';
        cuentas.forEach((c, i) => {
            lCuentas.innerHTML += `
                <li class="transaccion-item" style="padding: 12px 16px;">
                    <div class="trans-izq"><strong style="color:var(--text-primary);">${c.nombre}</strong><small>${c.moneda}</small></div>
                    <div class="acciones-gestion">
                        <button class="btn-mover" onclick="moverCuenta(${i}, -1)" ${i === 0 ? 'disabled' : ''}>▲</button>
                        <button class="btn-mover" onclick="moverCuenta(${i}, 1)" ${i === cuentas.length - 1 ? 'disabled' : ''}>▼</button>
                        <button class="btn-editar" onclick="editarCuenta(${i})">✏️</button>
                        <button class="btn-eliminar" onclick="eliminarCuenta(${i})">🗑️</button>
                    </div>
                </li>`;
        });
    }
    if(lCat) {
        lCat.innerHTML = '';
        categorias.forEach((cat, i) => {
            const colorCat = obtenerColorCategoria(cat);
            lCat.innerHTML += `
                <li class="transaccion-item" style="padding: 12px 16px;">
                    <div class="trans-izq" style="display:flex; align-items:center; gap:10px;">
                        <button type="button" class="btn-cat-color-item" style="background:${colorCat};" onclick="abrirSelectorColorCategoria(${i})" title="Cambiar color de ${cat}"></button>
                        <strong style="color:var(--text-primary);">${cat}</strong>
                    </div>
                    <div class="acciones-gestion">
                        <button class="btn-editar" onclick="editarCategoria(${i})" title="Cambiar nombre">✏️</button>
                        <button class="btn-eliminar" onclick="eliminarCategoria(${i})" title="Eliminar">🗑️</button>
                    </div>
                </li>`;
        });
    }
}

function moverCuenta(index, direccion) {
    const nuevoIndex = index + direccion;
    if (nuevoIndex < 0 || nuevoIndex >= cuentas.length) return;
    const temp = cuentas[index];
    cuentas[index] = cuentas[nuevoIndex];
    cuentas[nuevoIndex] = temp;
    cuentaActivaId = cuentas[0].id;
    guardarYActualizarGestion();
}

function agregarCuenta() {
    const nombre = document.getElementById('nueva-cuenta-nombre').value;
    const moneda = document.getElementById('sel-nueva-moneda').value; 
    if(nombre.trim() !== "") { cuentas.push({ id: Date.now(), nombre: nombre, moneda: moneda }); document.getElementById('nueva-cuenta-nombre').value = ''; guardarYActualizarGestion(); }
    else { alert("Ingresa un nombre."); }
}
function editarCuenta(i) { const n = prompt("Nuevo nombre:", cuentas[i].nombre); if(n) { cuentas[i].nombre = n; guardarYActualizarGestion(); } }
function eliminarCuenta(i) { if(confirm("¿Eliminar cuenta?")) { if(cuentas[i].id == cuentaActivaId) cuentaActivaId = null; cuentas.splice(i, 1); guardarYActualizarGestion(); } }

function agregarCategoria() {
    const inputCat = document.getElementById('nueva-categoria');
    const nueva = inputCat ? inputCat.value.trim() : '';
    if (nueva) {
        if (!categorias.includes(nueva)) categorias.push(nueva);
        categoriasColores[nueva] = colorNuevaCategoriaSeleccionado || PALETA_COLORES_CATEGORIAS[categorias.length % PALETA_COLORES_CATEGORIAS.length];
        localStorage.setItem('assist_categorias_colores', JSON.stringify(categoriasColores));

        if (inputCat) inputCat.value = '';
        const nextIdx = (PALETA_COLORES_CATEGORIAS.indexOf(colorNuevaCategoriaSeleccionado) + 1) % PALETA_COLORES_CATEGORIAS.length;
        seleccionarColorNuevaCat(PALETA_COLORES_CATEGORIAS[nextIdx]);
        guardarYActualizarGestion();
    }
}

function editarCategoria(i) {
    const nombreViejo = categorias[i];
    const n = prompt("Nuevo nombre:", nombreViejo);
    if (n && n.trim()) {
        const nombreNuevo = n.trim();
        if (categoriasColores[nombreViejo] && !categoriasColores[nombreNuevo]) {
            categoriasColores[nombreNuevo] = categoriasColores[nombreViejo];
        }
        categorias[i] = nombreNuevo;
        transacciones.forEach(t => { if (t.categoria === nombreViejo) t.categoria = nombreNuevo; });
        agendaPagos.forEach(a => { if (a.categoria === nombreViejo) a.categoria = nombreNuevo; });
        localStorage.setItem('assist_categorias_colores', JSON.stringify(categoriasColores));
        guardarYActualizarGestion();
    }
}

function eliminarCategoria(i) {
    if(confirm("¿Eliminar categoría?")) {
        cerrarSelectorColorCategoriaExistente();
        categorias.splice(i, 1);
        guardarYActualizarGestion();
    }
}

function guardarYActualizarGestion() {
    localStorage.setItem('cuentas', JSON.stringify(cuentas));
    localStorage.setItem('categorias', JSON.stringify(categorias));
    localStorage.setItem('assist_categorias_colores', JSON.stringify(categoriasColores));
    localStorage.setItem('transacciones', JSON.stringify(transacciones));
    localStorage.setItem('metas', JSON.stringify(metas));
    localStorage.setItem('assist_agenda_pagos', JSON.stringify(agendaPagos));
    cargarSelects(); renderizarListasGestion(); actualizarInterfaz();
    if (usuarioActual) sincronizarHaciaNube().catch(e => console.error(e));
}

// ================= BACKUPS =================
function exportarDatos() {
    const data = JSON.stringify({
        transacciones,
        categorias,
        categoriasColores,
        cuentas,
        metas,
        agendaPagos,
        userNombre,
        userAvatar,
        pinQuestions,
        tasasHistoricas
    });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ASSIST_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
}

function importarDatos(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            if(data.transacciones && data.cuentas) {
                transacciones = data.transacciones; 
                categorias = data.categorias || []; 
                cuentas = data.cuentas; 
                metas = data.metas || [];
                if (Array.isArray(data.agendaPagos)) agendaPagos = data.agendaPagos;

                if (data.categoriasColores && typeof data.categoriasColores === 'object') {
                    categoriasColores = data.categoriasColores;
                    localStorage.setItem('assist_categorias_colores', JSON.stringify(categoriasColores));
                }
                asegurarColoresCategorias();

                if (data.tasasHistoricas && typeof data.tasasHistoricas === 'object') {
                    if (Array.isArray(data.tasasHistoricas.BCV)) localStorage.setItem('assist_hist_serie_BCV', JSON.stringify(data.tasasHistoricas.BCV));
                    if (Array.isArray(data.tasasHistoricas.EUR)) localStorage.setItem('assist_hist_serie_EUR', JSON.stringify(data.tasasHistoricas.EUR));
                    if (Array.isArray(data.tasasHistoricas.USDT)) localStorage.setItem('assist_hist_serie_USDT', JSON.stringify(data.tasasHistoricas.USDT));
                }

                if (data.userNombre !== undefined) {
                    userNombre = data.userNombre || '';
                    if (userNombre) localStorage.setItem('assist_user_name', userNombre);
                    else localStorage.removeItem('assist_user_name');
                }
                if (data.userAvatar !== undefined) {
                    userAvatar = data.userAvatar || null;
                    if (userAvatar) localStorage.setItem('assist_user_avatar', userAvatar);
                    else localStorage.removeItem('assist_user_avatar');
                }
                if (Array.isArray(data.pinQuestions) && data.pinQuestions.length === 3) {
                    pinQuestions = data.pinQuestions;
                    localStorage.setItem('assist_pin_questions', JSON.stringify(pinQuestions));
                }
                
                transacciones.forEach(t => { 
                    if(!t.fechaIsoLocal) {
                        let d = t.fecha ? new Date(t.fecha) : new Date(t.id);
                        if (isNaN(d.getTime())) d = new Date(); 
                        t.fechaIsoLocal = getLocalYYYYMMDD(d);
                    }
                });
                
                localStorage.setItem('transacciones', JSON.stringify(transacciones));
                localStorage.setItem('metas', JSON.stringify(metas));
                localStorage.setItem('assist_agenda_pagos', JSON.stringify(agendaPagos));
                localStorage.setItem('cuentas', JSON.stringify(cuentas));
                localStorage.setItem('categorias', JSON.stringify(categorias));
                
                if (usuarioActual) {
                    sincronizarHaciaNube().then(() => {
                        alert("¡Datos restaurados y respaldados en la nube correctamente!");
                        window.location.reload();
                    }).catch(() => {
                        alert("¡Datos restaurados localmente! Se sincronizarán con la nube en breve.");
                        window.location.reload();
                    });
                } else {
                    alert("¡Datos restaurados correctamente!");
                    window.location.reload(); 
                }
            } else {
                alert("El archivo no tiene el formato correcto de A$$IST.");
            }
        } catch (err) { 
            console.error("Error al importar:", err);
            alert("Archivo inválido o corrupto."); 
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

// ================= ARRANQUE DE LA APP =================
async function inicializarApp() {
    asegurarColoresCategorias();
    renderizarPaletaColorNuevaCat();
    actualizarHeaderTutorial();
    actualizarUIPerfil();
    inicializarAskBot();
    configurarVisualViewportAskBot();

    if (supabaseClient) {
        try {
            const { data } = await supabaseClient.auth.getSession();
            if (data && data.session && data.session.user) {
                usuarioActual = data.session.user;
                actualizarUIEstadoNube();

                if (navigator.onLine) {
                    if (localStorage.getItem('assist_pending_sync') === 'true') await sincronizarHaciaNube();
                    else await descargarDesdeNube();
                }
            } else {
                actualizarUIEstadoNube();
            }
        } catch (e) {
            console.error("Modo offline activo:", e);
            actualizarUIEstadoNube();
        }
    }

    await obtenerTasas();
    cargarSelects();
    actualizarInterfaz();
    setTasaModo('BCV'); 
    toggleCategoriaSelect();
    setInterval(() => { obtenerTasas().then(() => actualizarInterfaz()); }, 300000); 
}
inicializarApp();