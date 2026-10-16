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

let usdtP2PData = JSON.parse(localStorage.getItem('assist_usdt_p2p_data')) || {
    buy: 0,
    sell: 0,
    spread: 0,
    bybitBuy: 0,
    bybitSell: 0,
    brechaPct: 0,
    capturedAt: null,
    modoPrecio: localStorage.getItem('assist_usdt_modo_precio') || 'buy'
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