// ================= CONFIGURACIÓN DE SUPABASE (NUBE LOCAL-FIRST) =================
const SUPABASE_URL = 'https://gzbjsbhgpqtycsndwkpc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_TrvXyss9fBLXQ4BKRAzMYg_S7yOlAP-';
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

let usuarioActual = null;
let authModoActual = 'login'; // 'login' o 'registro'
let sincronizandoNube = false;

// Base de Datos Local
let transacciones = JSON.parse(localStorage.getItem('transacciones')) || [];
let categorias = JSON.parse(localStorage.getItem('categorias')) || [];
let cuentas = JSON.parse(localStorage.getItem('cuentas')) || [];
let metas = JSON.parse(localStorage.getItem('metas')) || [];
let appPin = localStorage.getItem('app_pin') || null;

// Datos de Perfil de Usuario (Local-First)
let userNombre = localStorage.getItem('assist_user_name') || '';
let userAvatar = localStorage.getItem('assist_user_avatar') || null;

// Variables Globales
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

// Convierte una fecha a YYYY-MM-DD estricto en la zona local
function getLocalYYYYMMDD(d = new Date()) {
    const fechaSegura = (d instanceof Date && !isNaN(d.getTime())) ? d : new Date();
    const tzOffset = fechaSegura.getTimezoneOffset() * 60000;
    return new Date(fechaSegura.getTime() - tzOffset).toISOString().split('T')[0];
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
    if (inNombreSettings && document.activeElement !== inNombreSettings) {
        inNombreSettings.value = userNombre;
    }
    if (inNombreModal && document.activeElement !== inNombreModal) {
        inNombreModal.value = userNombre;
    }

    const subGreeting = document.getElementById('header-greeting-sub');
    if (subGreeting) {
        subGreeting.innerText = userNombre ? `Hola, ${userNombre}` : 'Control de Capital';
    }

    const heroTitle = document.getElementById('askbot-hero-title');
    if (heroTitle) {
        heroTitle.innerText = userNombre ? `Hola, ${userNombre}` : '¿En qué te ayudo hoy?';
    }

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
    const nuevoNombre = (inModal && document.activeElement === inModal)
        ? inModal.value.trim()
        : (inSettings ? inSettings.value.trim() : '');

    userNombre = nuevoNombre;
    if (userNombre) {
        localStorage.setItem('assist_user_name', userNombre);
    } else {
        localStorage.removeItem('assist_user_name');
    }

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

            // Recorte cuadrado centrado (aspect-fill) para que el avatar quede perfecto
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

// ================= TUTORIAL GUIADO INTERACTIVO (ONBOARDING) =================
const PASOS_TUTORIAL = [
    {
        icono: "🚀",
        titulo: "Bienvenido a A$$IST",
        desc: "Tu centro de control financiero personal. Diseñado para ser ultrarrápido, funcionar con o sin internet y adaptarse a la economía real.",
        tip: "✨ <b>Arquitectura Local-First:</b> Todo lo que hagas se guarda al instante en tu teléfono y se respalda silenciosamente en la nube cuando tienes conexión."
    },
    {
        icono: "💳",
        titulo: "1. Crea tus Cuentas",
        desc: "El primer paso es registrar dónde tienes tu dinero: bancos en <b>Bolívares (VES)</b>, efectivo en <b>Dólares (USD)</b> o billeteras cripto en <b>USDT</b>.",
        tip: "💡 Ve a <b>Ajustes > Gestionar Cuentas</b> para crearlas y ordenarlas con las flechas <b>▲ / ▼</b>. En el Inicio, desliza la tarjeta principal hacia los lados para cambiar de cuenta activa."
    },
    {
        icono: "🏷️",
        titulo: "2. Categorías Inteligentes",
        desc: "Organiza en qué se va tu dinero creando tus propias categorías personalizadas (Ej: Comida, Transporte, Suscripciones, Ocio).",
        tip: "🧠 <b>Memoria inteligente:</b> A$$IST recuerda automáticamente en qué moneda pagaste por última vez cada categoría para ahorrarte toques."
    },
    {
        icono: "⚡",
        titulo: "3. Gastos, Ingresos y Comisiones",
        desc: "Registra cualquier movimiento en segundos. La app bloquea monedas incompatibles según la cuenta que tengas activa en pantalla.",
        tip: "🇻🇪 <b>Pagos en Bolívares:</b> Al registrar un gasto en VES, puedes elegir si pagaste con <b>Tarjeta/POS (0 Bs)</b>, <b>Pago Móvil P2P (0,30%)</b>, <b>Comercio P2C (1,50%)</b> o comisión manual."
    },
    {
        icono: "🔄",
        titulo: "4. Transferencias y Cambios P2P",
        desc: "¿Cambiaste USDT a Bolívares en Binance o viceversa? Elige la opción <b>Transferir</b> en el panel de registro.",
        tip: "⚡ En un solo paso, A$$IST descuenta el saldo de la cuenta de origen y suma el monto convertido en la cuenta de destino usando la tasa que indiques."
    },
    {
        icono: "🤖",
        titulo: "5. AskBot: Copiloto IA",
        desc: "En la barra inferior tienes a <b>AskBot</b>, tu asesor financiero con Inteligencia Artificial conectado en vivo a tus datos reales.",
        tip: "✨ <b>Contexto automático:</b> Pregúntale si es viable hacer una compra hoy, en qué categoría estás gastando de más o cómo aprovechar la brecha entre BCV y USDT."
    },
    {
        icono: "💱",
        titulo: "6. Calculadora en Tiempo Real",
        desc: "En la pestaña <b>Conversión</b> tienes las tasas del día (BCV, USDT y Euro) actualizadas automáticamente junto con su variación porcentual.",
        tip: "🧮 Escribe arriba en divisas o abajo en Bolívares para convertir en ambas direcciones al instante, o usa el modo <b>Propia</b> para calcular con una tasa libre."
    },
    {
        icono: "📊",
        titulo: "7. Historial, Filtros y Metas",
        desc: "Toca <b>Ver Historial y Gráficos</b> para analizar tus gastos por categoría, buscar por palabra clave o filtrar los movimientos de un día exacto.",
        tip: "🗑️ <b>Desliza hacia la izquierda (Swipe)</b> cualquier movimiento del historial para eliminarlo. Y en la pestaña <b>Metas</b>, crea ahorros visuales con foto y barra de progreso."
    },
    {
        icono: "🔒",
        titulo: "8. Modo Pánico, PIN y Temas",
        desc: "Tu privacidad y estilo están blindados. Personaliza la app en <b>Ajustes</b> con el modo Oscuro, Claro o <b>Liquid Glass</b> y más de 20 colores de acento.",
        tip: "🕵️‍♂️ <b>Truco Pro:</b> Da <b>doble toque rápido</b> sobre la tarjeta de tu balance (o toca el icono del ojo) para activar el <b>Modo Pánico</b> y ocultar todos tus montos con asteriscos."
    }
];

let pasoTutorialActual = 0;
let tutTouchStartX = 0;

function actualizarHeaderTutorial() {
    const btn = document.getElementById('btn-tutorial-header');
    if (!btn) return;
    const visto = localStorage.getItem('assist_tutorial_visto') === 'true';
    if (!visto) {
        btn.classList.remove('oculto');
        btn.style.display = 'inline-flex';
    } else {
        btn.classList.add('oculto');
        btn.style.display = 'none';
    }
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
    if (btnNext) {
        btnNext.innerText = (pasoTutorialActual === PASOS_TUTORIAL.length - 1) ? "¡Empezar!" : "Siguiente";
    }
}

function moverPasoTutorial(direccion) {
    pasoTutorialActual += direccion;
    if (pasoTutorialActual < 0) {
        pasoTutorialActual = 0;
        return;
    }
    if (pasoTutorialActual >= PASOS_TUTORIAL.length) {
        completarTutorial();
        return;
    }
    renderizarPasoTutorial();
}

function completarTutorial() {
    localStorage.setItem('assist_tutorial_visto', 'true');
    cerrarModal('modal-tutorial');
    actualizarHeaderTutorial();
}

function omitirTutorial() {
    completarTutorial();
}

function tutTouchStart(e) {
    tutTouchStartX = e.changedTouches[0].screenX;
}

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
    if (!appPin && appContainer) {
        appContainer.classList.add('app-unlocked');
    }
    actualizarUIEstadoNube();
    actualizarHeaderTutorial();

    // Si es un usuario nuevo que nunca ha visto el tutorial, lo abre automáticamente
    if (localStorage.getItem('assist_tutorial_visto') !== 'true' && !tieneDatosLocales()) {
        setTimeout(() => iniciarTutorial(), 350);
    }
}

function tieneDatosLocales() {
    return (cuentas.length > 0 || transacciones.length > 0 || metas.length > 0 || categorias.length > 0);
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

            // Si el usuario ya tenía cuentas o transacciones en su navegador, las respalda de inmediato en su cuenta nueva
            if (usuarioActual && tieneDatosLocales()) {
                await sincronizarHaciaNube();
            } else if (usuarioActual) {
                await descargarDesdeNube();
            }
        } else {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            usuarioActual = data.user;

            if (usuarioActual) {
                const descargado = await descargarDesdeNube();
                // Si la cuenta en la nube estaba totalmente vacía pero el teléfono tenía datos locales, los sube
                if (!descargado && tieneDatosLocales()) {
                    await sincronizarHaciaNube();
                }
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

        // Si el usuario acaba de crear su cuenta desde cero y no tiene datos, abrimos el tutorial automáticamente
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

        // 1. Guardar Perfil y Preferencias (Con respaldo seguro de nombre y avatar si las columnas existen en la tabla perfiles)
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
            avatar_url: userAvatar || null
        });

        // Si la tabla perfiles en Supabase aún no tiene las columnas user_name o avatar_url, guarda sin romper nada
        if (errPerfil) {
            const retry = await supabaseClient.from('perfiles').upsert(basePerfil);
            if (retry.error) throw retry.error;
        }

        // 2. Sincronizar Cuentas (respetando orden de las flechitas)
        await supabaseClient.from('cuentas').delete().eq('user_id', uid);
        if (cuentas.length > 0) {
            const filasCuentas = cuentas.map((c, idx) => ({
                user_id: uid,
                id: String(c.id),
                nombre: c.nombre,
                moneda: c.moneda,
                orden: idx,
                updated_at: ahora
            }));
            const { error: errCuentas } = await supabaseClient.from('cuentas').upsert(filasCuentas);
            if (errCuentas) throw errCuentas;
        }

        // 3. Sincronizar Categorías
        await supabaseClient.from('categorias').delete().eq('user_id', uid);
        if (categorias.length > 0) {
            const categoriasUnicas = [...new Set(categorias)];
            const filasCat = categoriasUnicas.map((cat, idx) => ({
                user_id: uid,
                nombre: String(cat),
                orden: idx
            }));
            const { error: errCat } = await supabaseClient.from('categorias').upsert(filasCat);
            if (errCat) throw errCat;
        }

        // 4. Sincronizar Metas
        await supabaseClient.from('metas').delete().eq('user_id', uid);
        if (metas.length > 0) {
            const filasMetas = metas.map((m, idx) => ({
                user_id: uid,
                id: String(m.id),
                nombre: m.nombre,
                acumulado: Number(m.acumulado) || 0,
                objetivo: Number(m.objetivo) || 0,
                moneda: m.moneda || 'USD',
                imagen: m.imagen || null,
                orden: idx,
                updated_at: ahora
            }));
            const { error: errMetas } = await supabaseClient.from('metas').upsert(filasMetas);
            if (errMetas) throw errMetas;
        }

        // 5. Sincronizar Transacciones (Blindado contra fechas antiguas o vacías)
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

        if (!hayDatosEnNube && !resPerfil.data) {
            return false;
        }

        // Candado de seguridad: si la nube tiene 0 transacciones pero el teléfono sí tiene transacciones locales, subimos las del teléfono
        const necesitaSubirTransLocales = (!resTrans.data || resTrans.data.length === 0) && transacciones.length > 0;

        if (resPerfil.data) {
            if (resPerfil.data.theme_color) cambiarColorAcento(resPerfil.data.theme_color, true);
            if (resPerfil.data.theme_mode) cambiarModo(resPerfil.data.theme_mode, true);
            if (resPerfil.data.app_pin !== undefined) {
                appPin = resPerfil.data.app_pin;
                if (appPin) localStorage.setItem('app_pin', appPin);
                else localStorage.removeItem('app_pin');
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
            cuentas = resCuentas.data.map(c => ({
                id: isNaN(Number(c.id)) ? c.id : Number(c.id),
                nombre: c.nombre,
                moneda: c.moneda
            }));
        }

        if (resCat.data && resCat.data.length > 0) {
            categorias = resCat.data.map(c => c.nombre);
        }

        if (resMetas.data && resMetas.data.length > 0) {
            metas = resMetas.data.map(m => ({
                id: isNaN(Number(m.id)) ? m.id : Number(m.id),
                nombre: m.nombre,
                acumulado: Number(m.acumulado) || 0,
                objetivo: Number(m.objetivo) || 0,
                moneda: m.moneda || 'USD',
                imagen: m.imagen || null
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

        if (necesitaSubirTransLocales) {
            await sincronizarHaciaNube();
        } else {
            localStorage.removeItem('assist_pending_sync');
        }

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
    cuentas = [];
    metas = [];
    appPin = null;
    cuentaActivaId = null;

    localStorage.removeItem('transacciones');
    localStorage.removeItem('categorias');
    localStorage.removeItem('cuentas');
    localStorage.removeItem('metas');
    localStorage.removeItem('app_pin');
    localStorage.removeItem('assist_skip_auth');
    localStorage.removeItem('assist_pending_sync');

    cargarSelects();
    renderizarListasGestion();
    actualizarInterfaz();
    actualizarUIEstadoNube();
    abrirPantallaAuth();
}

// Detectar reconexión automática a internet (WiFi / Datos)
window.addEventListener('online', () => {
    actualizarUIEstadoNube();
    if (usuarioActual && localStorage.getItem('assist_pending_sync') === 'true') {
        sincronizarHaciaNube().catch(e => console.error(e));
    }
});
window.addEventListener('offline', () => {
    actualizarUIEstadoNube();
});

// ================= SEGURIDAD, TEMAS Y PANTALLA DE CARGA =================
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
    const pinInput = document.getElementById('input-pin');
    const appContainer = document.getElementById('app-main-container');
    
    if (appPin) {
        pinScreen.style.zIndex = '99998'; 
        pinScreen.classList.remove('oculto');
    }
    
    setTimeout(() => {
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.style.display = 'none';
            
            if (appPin) {
                pinScreen.style.zIndex = '100000'; 
                setTimeout(() => pinInput.focus(), 10); 
            } else {
                // Si es un usuario nuevo sin sesión ni datos locales, mostramos la bienvenida de registro
                const skipAuth = localStorage.getItem('assist_skip_auth') === 'true';
                if (!usuarioActual && !tieneDatosLocales() && !skipAuth) {
                    abrirPantallaAuth();
                } else {
                    appContainer.classList.add('app-unlocked');
                }
            }
        }, 500); 
    }, 1200); 
});

// Forzar autofocus al tocar la pantalla de bloqueo
document.getElementById('pin-screen').addEventListener('click', () => {
    document.getElementById('input-pin').focus();
});

// Temas
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

// Auto-Bloqueo
let timeoutBloqueo;
function reiniciarInactividad() {
    clearTimeout(timeoutBloqueo);
    if (appPin) {
        timeoutBloqueo = setTimeout(() => {
            const screen = document.getElementById('pin-screen');
            screen.classList.remove('oculto');
            document.getElementById('app-main-container').classList.remove('app-unlocked');
            setTimeout(() => document.getElementById('input-pin').focus(), 100);
        }, 3 * 60 * 1000); 
    }
}
window.addEventListener('touchstart', reiniciarInactividad);
window.addEventListener('click', reiniciarInactividad);

// Modo Pánico
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

// Teclado PIN Automático Inmediato
document.getElementById('input-pin').addEventListener('input', function(e) {
    if (this.value.length === 4) verificarPIN();
});

function configurarPIN() {
    const nuevo = prompt("Ingresa un nuevo PIN de 4 dígitos (Deja en blanco para desactivar):");
    if (nuevo === null) return;
    if (nuevo === "") {
        localStorage.removeItem('app_pin'); appPin = null; alert("PIN desactivado.");
        if (usuarioActual) sincronizarHaciaNube().catch(e => console.error(e));
    } else if (nuevo.length === 4 && !isNaN(nuevo)) {
        localStorage.setItem('app_pin', nuevo); appPin = nuevo; alert("PIN configurado con éxito.");
        reiniciarInactividad();
        if (usuarioActual) sincronizarHaciaNube().catch(e => console.error(e));
    } else { alert("Debe ser un número de 4 dígitos."); }
}

function verificarPIN() {
    const input = document.getElementById('input-pin');
    if (input.value === appPin) {
        input.blur(); 
        
        const screen = document.getElementById('pin-screen');
        const container = document.getElementById('app-main-container');
        screen.style.opacity = '0';
        container.classList.add('app-unlocked');
        setTimeout(() => {
            screen.classList.add('oculto');
            screen.style.opacity = '1';
            input.value = '';
        }, 200);
        reiniciarInactividad();
    } else {
        alert("PIN incorrecto");
        input.value = '';
    }
}

function resetearPIN() {
    const respuesta = prompt('Escribe "RESETEAR" para eliminar el PIN guardado y restaurar el acceso:');
    if (respuesta === "RESETEAR") {
        localStorage.removeItem('app_pin'); appPin = null;
        document.getElementById('pin-screen').classList.add('oculto');
        document.getElementById('app-main-container').classList.add('app-unlocked');
        if (usuarioActual) sincronizarHaciaNube().catch(e => console.error(e));
        alert("PIN eliminado correctamente.");
    } else if (respuesta !== null) { alert("Palabra de seguridad incorrecta."); }
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
    'modal-perfil',
    'modal-historial',
    'modal-detalle-meta',
    'modal-accion-meta',
    'modal-cuentas',
    'modal-categorias',
    'modal-nueva-meta',
    'modal-tutorial'
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

// Interceptor táctil en iOS Safari para impedir que deslizar sobre el fondo del modal o de AskBot mueva el body
document.addEventListener('touchmove', function(e) {
    if (document.body.classList.contains('modal-open')) {
        const scrollableEl = e.target.closest('.modal-list, .tut-slide, .palette-container');
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
        if (!askbotScrollable) {
            e.preventDefault();
            return;
        }
        if (askbotScrollable.scrollHeight <= askbotScrollable.clientHeight) {
            e.preventDefault();
        }
    }
}, { passive: false });

function abrirModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;

    bloquearScrollFondo();
    modal.classList.remove('oculto');

    if (id === 'modal-historial') {
        document.getElementById('filtro-fecha').value = ''; 
        actualizarListaTransacciones(); 
    }
    if (id === 'modal-cuentas' || id === 'modal-categorias') {
        renderizarListasGestion();
    }
    if (id === 'modal-perfil') {
        actualizarUIEstadoNube();
    }
}

function cerrarModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('oculto');
    desbloquearScrollFondo();
}

// ================= COMPORTAMIENTO INTELIGENTE DEL FORMULARIO =================
function toggleCategoriaSelect() {
    const tipo = document.getElementById('val-tipo').value;
    const moneda = document.getElementById('val-moneda').value;
    const selectCategoria = document.getElementById('val-categoria');
    const boxComision = document.getElementById('box-comision-ves');
    const boxTransf = document.getElementById('box-transferencia');
    const valMonedaSelect = document.getElementById('val-moneda');
    
    // Ocultar Categoría si no es un gasto
    if (tipo === 'ingreso' || tipo === 'transferencia') { 
        selectCategoria.classList.add('oculto'); selectCategoria.value = ""; 
    } else { selectCategoria.classList.remove('oculto'); }

    // Activar Transferencia
    if (boxTransf) {
        if (tipo === 'transferencia') {
            boxTransf.classList.remove('oculto'); boxTransf.style.display = 'flex';
            valMonedaSelect.classList.add('oculto'); // Oculta el botón de moneda a la derecha del monto
            renderizarSelectsTransferencia();
        } else {
            boxTransf.classList.add('oculto'); boxTransf.style.display = 'none';
            valMonedaSelect.classList.remove('oculto'); // Lo devuelve si quita transferencia
        }
    }

    // Activar Comisiones VES (Solo para Gastos normales)
    if (boxComision) {
        if (tipo === 'gasto' && moneda === 'VES') {
            boxComision.classList.remove('oculto'); boxComision.style.display = 'flex';
        } else {
            boxComision.classList.add('oculto'); boxComision.style.display = 'none';
            document.getElementById('sel-tipo-comision').value = 'tarjeta';
            toggleComisionManual(); 
        }
    }
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
    const valO = selOrigen.value; const valD = selDestino.value;

    selOrigen.innerHTML = ''; selDestino.innerHTML = '';
    
    // Filtra para mostrar SOLAMENTE las cuentas que sean de USDT o VES
    const cuentasValidas = cuentas.filter(c => c.moneda === 'USDT' || c.moneda === 'VES');

    cuentasValidas.forEach(c => {
        // Omite el (USDT) al lado del nombre para que sea más corto y limpio
        selOrigen.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
        selDestino.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
    });

    if (valO && cuentasValidas.find(c=>c.id==valO)) selOrigen.value = valO;
    if (valD && cuentasValidas.find(c=>c.id==valD)) selDestino.value = valD;
    
    actualizarUI_Transferencia(false); // Inicia sin forzar cambio
}

// El parámetro 'origenCambio' le dice a la app quién gatilló la función
function actualizarUI_Transferencia(origenCambio = false) {
    const idO = document.getElementById('sel-transf-origen').value;
    const idD = document.getElementById('sel-transf-destino').value;
    if (!idO || !idD) return;

    let cOrigen = cuentas.find(c => c.id == idO);
    let cDestino = cuentas.find(c => c.id == idD);
    
    // LÓGICA DE EMPAREJAMIENTO AUTOMÁTICO
    const cuentasUSDT = cuentas.filter(c => c.moneda === 'USDT');
    const cuentasVES = cuentas.filter(c => c.moneda === 'VES');

    // Si cambió el origen y solo hay una cuenta de cada tipo, empareja automático el destino
    if (origenCambio && cuentasUSDT.length === 1 && cuentasVES.length === 1) {
        if (cOrigen.moneda === 'USDT') {
            document.getElementById('sel-transf-destino').value = cuentasVES[0].id;
        } else if (cOrigen.moneda === 'VES') {
            document.getElementById('sel-transf-destino').value = cuentasUSDT[0].id;
        }
        // Refresca la variable destino por si la cambiamos
        cDestino = cuentas.find(c => c.id == document.getElementById('sel-transf-destino').value);
    }
    // Si cambió el destino y solo hay una cuenta de cada tipo, empareja automático el origen
    else if (!origenCambio && cuentasUSDT.length === 1 && cuentasVES.length === 1) {
        if (cDestino.moneda === 'USDT') {
            document.getElementById('sel-transf-origen').value = cuentasVES[0].id;
        } else if (cDestino.moneda === 'VES') {
            document.getElementById('sel-transf-origen').value = cuentasUSDT[0].id;
        }
        // Refresca la variable origen por si la cambiamos
        cOrigen = cuentas.find(c => c.id == document.getElementById('sel-transf-origen').value);
    }

    const boxTasa = document.getElementById('box-transf-tasa');
    const inputTasa = document.getElementById('input-transf-tasa');
    
    if (cOrigen.moneda !== cDestino.moneda) {
        boxTasa.classList.remove('oculto'); boxTasa.style.display = 'flex';
        // Auto-sugiere la tasa paralela si interviene USDT
        if (inputTasa.value === '') {
            inputTasa.value = tasaParalelo.toFixed(2);
        }
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

// Categorías Inteligentes y Auto-Actualización de la UI (Respetando opciones válidas de la cuenta activa)
document.getElementById('val-categoria').addEventListener('change', (e) => {
    const catSelec = e.target.value;
    const lastTrans = [...transacciones].reverse().find(t => t.categoria === catSelec && t.tipo === 'gasto');
    if (lastTrans && lastTrans.monedaInputOriginal) {
        const selectMoneda = document.getElementById('val-moneda');
        const option = Array.from(selectMoneda.options).find(o => o.value === lastTrans.monedaInputOriginal);
        if (option) selectMoneda.value = lastTrans.monedaInputOriginal;
        toggleCategoriaSelect();
    }
});

// Evento para cambiar moneda y actualizar los menús de pago
document.getElementById('val-moneda').addEventListener('change', toggleCategoriaSelect);

// Reconstrucción estricta del DOM en #val-moneda para compatibilidad 100% con iOS Safari
function actualizarOpcionesMoneda() {
    const cuentaActiva = cuentas.find(c => c.id == cuentaActivaId);
    const selectMoneda = document.getElementById('val-moneda');
    if (!cuentaActiva || !selectMoneda) return;

    const monedaPrevia = selectMoneda.value;
    let permitidas = ['USD', 'VES', 'EUR'];

    if (cuentaActiva.moneda === 'USD') {
        // Cuenta en Dólares Físicos: Únicamente USD
        permitidas = ['USD'];
    } else if (cuentaActiva.moneda === 'USDT') {
        // Cuenta en USDT: Únicamente USD y VES (sin EUR)
        permitidas = ['USD', 'VES'];
    } else if (cuentaActiva.moneda === 'VES') {
        // Cuenta en Bolívares: Las 3 disponibles (USD, VES y EUR)
        permitidas = ['USD', 'VES', 'EUR'];
    }

    selectMoneda.innerHTML = permitidas
        .map(m => `<option value="${m}">${m}</option>`)
        .join('');

    if (permitidas.includes(monedaPrevia)) {
        selectMoneda.value = monedaPrevia;
    } else {
        selectMoneda.value = permitidas[0];
    }

    toggleCategoriaSelect();
}

// ================= METAS DE AHORRO PREMIUM =================
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
            if (width > height) { 
                if (width > maxW) { height *= maxW / width; width = maxW; } 
            } else { 
                if (height > maxH) { width *= maxH / height; height = maxH; } 
            }
            canvas.width = width; 
            canvas.height = height;
            
            ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/png')); 
        }
        img.src = e.target.result;
    }
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

    if (file) { redimensionarImagen(file, crear); } else { crear(null); }
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
            <!-- Zona Superior: Imagen y Título -->
            <div class="meta-card-top">
                <div class="meta-bg-overlay" style="${bgStyle}"></div>
                <div class="meta-top-content">
                    <strong style="font-size:18px; text-shadow: 0 2px 8px rgba(0,0,0,0.9);">${m.nombre}</strong>
                    <span style="font-size:14px; font-weight:bold; text-shadow: 0 2px 8px rgba(0,0,0,0.9);">${m.moneda} ${formatearMontoCensurado(m.acumulado.toFixed(2))}</span>
                </div>
            </div>
            <!-- Zona Inferior: Espacio limpio solo para la barra y datos -->
            <div class="meta-card-bottom">
                <div class="progress-bg" style="height: 10px; margin-bottom: 6px;">
                    <div class="progress-fill" style="width: ${pct}%;"></div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <small style="color:var(--text-secondary); font-size:12px; font-weight:600;">Progreso</small>
                    <small style="color:var(--text-primary); font-size:12px; font-weight:700;">${pct.toFixed(1)}% de ${m.objetivo.toFixed(2)}</small>
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
    
    let hMeta = transacciones.filter(t => t.categoria === 'Ahorro' && t.nota.includes(nombreMeta)).reverse();

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
    document.getElementById('desc-accion-meta').innerText = tipo === 'abonar' 
        ? "Descontaremos de la cuenta que selecciones." : "El monto volverá a tu cuenta seleccionada.";
    
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

    const cuenta = cuentas.find(c => c.id == cuentaId);
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
    
    if (metaAccionTipo === 'abonar') { metas[metaAbonoActualIndex].acumulado += montoUSD; } 
    else { metas[metaAbonoActualIndex].acumulado -= montoUSD; }

    // MAGIA: Verificar si se completó la meta al 100%
    if (metas[metaAbonoActualIndex].acumulado >= metas[metaAbonoActualIndex].objetivo) {
        alert(`¡Felicidades! 🎉 Has completado tu meta: ${metas[metaAbonoActualIndex].nombre} 🥳\n\nEl objetivo ha sido alcanzado y se eliminará de las metas activas. (El dinero sigue descontado de tu cuenta principal, listo para usarse).`);
        metas.splice(metaAbonoActualIndex, 1); // La elimina del array
        guardarYActualizarGestion();
        cerrarModal('modal-accion-meta');
        cerrarModal('modal-detalle-meta'); // Cierra la pantalla de la meta
        actualizarInterfaz();
        return; // Corta la función para que no intente recargar la meta borrada
    }

    guardarYActualizarGestion();
    cerrarModal('modal-accion-meta');
    abrirDetalleMeta(metaAbonoActualIndex);
});

function eliminarMeta(index) {
    if(confirm("¿Seguro que deseas eliminar esta meta? (El dinero ahorrado NO regresará a tus cuentas automáticamente)")) {
        metas.splice(index, 1); guardarYActualizarGestion();
        cerrarModal('modal-detalle-meta');
        actualizarInterfaz();
    }
}

// ================= CALCULADORA =================
let calcModoTasa = 'BCV'; 
let calcUltimaEdicion = 'USD'; 

function formatFechaCorta(isoString) {
    if(!isoString) return "Actualizando...";
    const d = new Date(isoString);
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return `${dias[d.getDay()]}, ${d.getDate()}/${d.getMonth()+1}/${String(d.getFullYear()).slice(-2)}`;
}

function esFechaFutura(isoString) {
    if(!isoString) return false;
    const d = new Date(isoString); const today = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() > new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
}

function actualizarInfoCalculadora(modo) {
    const varBox = document.getElementById('calc-variacion-box');
    const badge = document.getElementById('calc-fecha-badge');
    const banner = document.getElementById('banner-fecha-valor');

    if(modo === 'Custom') { varBox.classList.add('oculto'); banner.classList.add('oculto'); badge.innerText = "Personalizada"; return; }

    varBox.classList.remove('oculto');
    const data = tasasData[modo];
    if(!data) return;

    const diffAbs = data.valor - data.previo;
    const diffPct = data.previo ? (diffAbs / data.previo) * 100 : 0;

    if(diffAbs > 0) { varBox.innerText = `↑ +${diffAbs.toFixed(2)} Bs (${diffPct.toFixed(2)}%)`; varBox.className = 'tasa-variacion var-positiva'; } 
    else if(diffAbs < 0) { varBox.innerText = `↓ ${diffAbs.toFixed(2)} Bs (${Math.abs(diffPct).toFixed(2)}%)`; varBox.className = 'tasa-variacion var-negativa'; } 
    else { varBox.innerText = `− 0.00 Bs (0.00%)`; varBox.className = 'tasa-variacion var-neutra'; }

    if(data.fecha) {
        badge.innerText = formatFechaCorta(data.fecha);
        if(esFechaFutura(data.fecha)) banner.classList.remove('oculto'); else banner.classList.add('oculto');
    }
}

function setTasaModo(modo) {
    calcModoTasa = modo;
    document.querySelectorAll('.segment').forEach(el => el.classList.remove('activo'));
    if(modo === 'BCV') document.getElementById('seg-bcv').classList.add('activo');
    if(modo === 'USDT') document.getElementById('seg-usdt').classList.add('activo');
    if(modo === 'EUR') document.getElementById('seg-eur').classList.add('activo');
    if(modo === 'Custom') document.getElementById('seg-custom').classList.add('activo');

    const inputTasa = document.getElementById('input-tasa-activa');
    const lblDivisa = document.getElementById('lbl-divisa');
    const symDivisa = document.getElementById('sym-divisa');
    const avisoUsdt = document.getElementById('aviso-usdt-calc');

    if (avisoUsdt) {
        if (modo === 'USDT') {
            avisoUsdt.classList.remove('oculto');
            avisoUsdt.style.display = 'block';
        } else {
            avisoUsdt.classList.add('oculto');
            avisoUsdt.style.display = 'none';
        }
    }

    if(modo === 'BCV') { inputTasa.value = tasasData.BCV.valor.toFixed(2); inputTasa.disabled = true; lblDivisa.innerText = '🇺🇸 Dólares (USD)'; symDivisa.innerText = '$'; }
    if(modo === 'USDT') { inputTasa.value = tasasData.USDT.valor.toFixed(2); inputTasa.disabled = true; lblDivisa.innerText = '🪙 Tether (USDT)'; symDivisa.innerText = '₮'; }
    if(modo === 'EUR') { inputTasa.value = tasasData.EUR.valor.toFixed(2); inputTasa.disabled = true; lblDivisa.innerText = '🇪🇺 Euros (EUR)'; symDivisa.innerText = '€'; }
    if(modo === 'Custom') { inputTasa.disabled = false; inputTasa.focus(); if(parseFloat(inputTasa.value) === 0) inputTasa.value = "1.00"; lblDivisa.innerText = '💱 Divisa Base'; symDivisa.innerText = '$'; }
    actualizarInfoCalculadora(modo); recalcularDesdeTasa();
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

// ================= NAVEGACIÓN (CLÁSICA SIN DESLIZAMIENTO) =================
function resetearScrollNativoiOS() {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
}

function cambiarPestana(idPestana, elementoNav) {
    const inputAskbot = document.getElementById('askbot-input');
    if (inputAskbot && idPestana !== 'tab-askbot') {
        inputAskbot.blur();
    }

    document.querySelectorAll('.tab-content, .vista-activa').forEach(el => el.className = 'vista-oculta');
    document.getElementById(idPestana).className = 'vista-activa';
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('activo'));
    elementoNav.classList.add('activo');

    if (idPestana === 'tab-askbot') {
        document.body.classList.add('askbot-tab-open');
        resetearScrollNativoiOS();
        ajustarAlturaVisualAskBot();
    } else {
        document.body.classList.remove('askbot-tab-open');
        document.body.classList.remove('askbot-kb-open');
        document.documentElement.style.setProperty('--askbot-vh', '100dvh');
        resetearScrollNativoiOS();
    }
}

// ================= ASKBOT ("CEREBRO PANA SUPREMO" 100% LOCAL + FIX TECLADO iOS) =================
let askbotEsperandoRespuesta = false;
let ultimoAltoTecladoAskBot = 0;

// Memoria conversacional de estado para repreguntas en doble burbuja
let askbotMemoria = {
    temaPendiente: null,
    datos: {}
};

function elegirAzar(lista) {
    if (!Array.isArray(lista) || lista.length === 0) return '';
    return lista[Math.floor(Math.random() * lista.length)];
}

function apelativoPana(conNombre = true) {
    if (conNombre && userNombre) {
        return elegirAzar([
            `mi pana **${userNombre}**`,
            `hermano **${userNombre}**`,
            `**${userNombre}**`,
            `mano **${userNombre}**`
        ]);
    }
    return elegirAzar(['mi pana', 'hermano', 'mano', 'mi bro']);
}

function normalizarTextoAskBot(str) {
    if (!str) return '';
    return String(str)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[¿?¡!]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function ajustarAlturaVisualAskBot() {
    const tabAskbot = document.getElementById('tab-askbot');
    if (!tabAskbot || !tabAskbot.classList.contains('vista-activa')) {
        document.body.classList.remove('askbot-tab-open');
        document.body.classList.remove('askbot-kb-open');
        return;
    }

    document.body.classList.add('askbot-tab-open');

    const vv = window.visualViewport;
    const inputAskbot = document.getElementById('askbot-input');
    const tieneFocus = document.activeElement === inputAskbot;

    if (vv) {
        if (window.scrollY !== 0 || vv.offsetTop !== 0) {
            resetearScrollNativoiOS();
        }

        const diffAltura = window.innerHeight - vv.height;
        const tecladoAbierto = diffAltura > 100;

        if (tecladoAbierto) {
            ultimoAltoTecladoAskBot = Math.round(vv.height);
            document.documentElement.style.setProperty('--askbot-vh', `${ultimoAltoTecladoAskBot}px`);
            document.body.classList.add('askbot-kb-open');
        } else if (!tieneFocus) {
            document.body.classList.remove('askbot-kb-open');
            document.documentElement.style.setProperty('--askbot-vh', '100dvh');
            resetearScrollNativoiOS();
        }
    } else {
        resetearScrollNativoiOS();
        document.documentElement.style.setProperty('--askbot-vh', '100dvh');
    }

    const box = document.getElementById('askbot-messages');
    if (box && !box.classList.contains('oculto-chat')) {
        box.scrollTop = box.scrollHeight;
    }
}

function configurarVisualViewportAskBot() {
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', ajustarAlturaVisualAskBot);
        window.visualViewport.addEventListener('scroll', ajustarAlturaVisualAskBot);
    }
    window.addEventListener('resize', ajustarAlturaVisualAskBot);
    window.addEventListener('scroll', () => {
        const tabAskbot = document.getElementById('tab-askbot');
        if (tabAskbot && tabAskbot.classList.contains('vista-activa') && window.scrollY !== 0) {
            resetearScrollNativoiOS();
        }
    }, { passive: true });

    const inputAskbot = document.getElementById('askbot-input');
    if (inputAskbot) {
        // Al tocar el input: sube en el milisegundo 0 junto con el teclado de iOS
        inputAskbot.addEventListener('focus', () => {
            resetearScrollNativoiOS();
            document.body.classList.add('askbot-kb-open');
            const altoEstimado = ultimoAltoTecladoAskBot > 0
                ? ultimoAltoTecladoAskBot
                : Math.round(window.innerHeight * 0.54);
            document.documentElement.style.setProperty('--askbot-vh', `${altoEstimado}px`);

            const box = document.getElementById('askbot-messages');
            if (box && !box.classList.contains('oculto-chat')) {
                setTimeout(() => { box.scrollTop = box.scrollHeight; }, 60);
            }
        });

        // Al tocar "Listo": baja en el milisegundo 0 y limpia el desfase de Safari al terminar la animación
        inputAskbot.addEventListener('blur', () => {
            document.body.classList.remove('askbot-kb-open');
            document.documentElement.style.setProperty('--askbot-vh', '100dvh');
            resetearScrollNativoiOS();
            setTimeout(resetearScrollNativoiOS, 100);
            setTimeout(resetearScrollNativoiOS, 260);
            setTimeout(resetearScrollNativoiOS, 420);
        });
    }
}

function actualizarChipsBienvenidaAskBot() {
    const chipsBox = document.querySelector('#askbot-welcome-hero .askbot-chips');
    if (!chipsBox) return;

    const subEl = document.querySelector('#askbot-welcome-hero .askbot-hero-sub');
    if (subEl) {
        subEl.innerHTML = 'Tu pana financiero <strong>100% ilimitado y offline</strong>. Pregúntame por tus cuentas, compras, tasas, comisiones, metas o cualquier función de <strong>A$$IST</strong>.';
    }

    chipsBox.innerHTML = `
        <button class="askbot-chip" onclick="enviarSugerenciaAskBot('Hazme una radiografía completa de mi plata: cuentas, saldos en Bs/USD/USDT, gastos y comisiones')">
            <span class="chip-icon">📊</span>
            <span class="chip-text">Radiografía de mi Plata</span>
        </button>
        <button class="askbot-chip" onclick="enviarSugerenciaAskBot('Según mi liquidez real y mis metas, ¿cuánto puedo gastar hoy o este fin de semana sin quedar pelando?')">
            <span class="chip-icon">💸</span>
            <span class="chip-text">¿Cuánto puedo gastar hoy?</span>
        </button>
        <button class="askbot-chip" onclick="enviarSugerenciaAskBot('Analiza las tasas de hoy y la brecha entre BCV y USDT con mis cuentas: ¿cómo rindo más mi plata?')">
            <span class="chip-icon">🇻🇪</span>
            <span class="chip-text">Estrategia BCV vs USDT</span>
        </button>
        <button class="askbot-chip" onclick="enviarSugerenciaAskBot('Dime cuántas cuentas, categorías y metas tengo, mis récords del historial y el estado de mi app')">
            <span class="chip-icon">🎯</span>
            <span class="chip-text">Auditoría Total de mi App</span>
        </button>
    `;
}

function inicializarAskBot() {
    const box = document.getElementById('askbot-messages');
    const hero = document.getElementById('askbot-welcome-hero');
    if (!box || !hero) return;

    actualizarChipsBienvenidaAskBot();

    if (box.children.length === 0) {
        hero.classList.remove('oculto-hero');
        box.classList.add('oculto-chat');
    } else {
        hero.classList.add('oculto-hero');
        box.classList.remove('oculto-chat');
    }
    actualizarUIPerfil();
}

function limpiarChatAskBot() {
    const box = document.getElementById('askbot-messages');
    const hero = document.getElementById('askbot-welcome-hero');
    if (!box) return;
    box.innerHTML = '';
    askbotMemoria = { temaPendiente: null, datos: {} };
    if (hero) hero.classList.remove('oculto-hero');
    box.classList.add('oculto-chat');
}

function formatearTextoAskBot(texto) {
    if (!texto) return '';
    let seguro = String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    seguro = seguro.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    seguro = seguro.replace(/\*(.*?)\*/g, '<em>$1</em>');
    seguro = seguro.replace(/^\s*[\*\-]\s+(.*)$/gm, '• $1');
    seguro = seguro.replace(/\n/g, '<br>');
    return seguro;
}

function agregarBurbujaAskBot(texto, rol = 'bot') {
    const box = document.getElementById('askbot-messages');
    const hero = document.getElementById('askbot-welcome-hero');
    if (!box) return null;

    // Al enviar el primer mensaje, ocultamos por completo la bienvenida y mostramos el chat limpio
    if (hero && !hero.classList.contains('oculto-hero')) {
        hero.classList.add('oculto-hero');
    }
    if (box.classList.contains('oculto-chat')) {
        box.classList.remove('oculto-chat');
    }

    const div = document.createElement('div');
    div.className = `askbot-bubble ${rol}`;
    if (rol === 'bot') {
        div.innerHTML = formatearTextoAskBot(texto);
    } else {
        div.innerText = texto;
    }
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    return div;
}

function mostrarIndicadorEscribiendoAskBot() {
    const box = document.getElementById('askbot-messages');
    if (!box) return null;
    if (box.classList.contains('oculto-chat')) {
        box.classList.remove('oculto-chat');
    }
    quitarIndicadorEscribiendoAskBot();
    const div = document.createElement('div');
    div.className = 'askbot-bubble bot askbot-typing';
    div.id = 'askbot-typing-indicator';
    div.innerHTML = '<span></span><span></span><span></span>';
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    return div;
}

function quitarIndicadorEscribiendoAskBot() {
    const el = document.getElementById('askbot-typing-indicator');
    if (el) el.remove();
}

// ================= RADIOGRAFÍA EN TIEMPO REAL DE TODA LA APP =================
function obtenerRadiografiaFinanciera() {
    const hoy = new Date();
    const hoyIso = getLocalYYYYMMDD(hoy);
    const ayerDate = new Date(hoy.getTime() - 86400000);
    const ayerIso = getLocalYYYYMMDD(ayerDate);
    const hace7DiasMs = hoy.getTime() - (7 * 86400000);
    const mesActualPrefix = hoyIso.slice(0, 7);

    const mesPasadoDate = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const mesPasadoPrefix = getLocalYYYYMMDD(mesPasadoDate).slice(0, 7);

    const diasEnMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
    const diaDelMes = Math.max(1, hoy.getDate());
    const diasRestantesMes = Math.max(1, diasEnMes - hoy.getDate() + 1);

    let totalUSD_Global = 0;
    let totalVES_Puro = 0;
    let totalVES_EquivUSD = 0;
    let totalUSD_Fisico = 0;
    let totalUSDT_Puro = 0;

    const cuentasDetalle = cuentas.map(c => {
        let balUSD = 0;
        let cantIngresos = 0;
        let cantGastos = 0;
        let ultimoMov = null;

        transacciones.forEach(t => {
            if (t.cuentaId == c.id) {
                const m = Number(t.montoUSD) || 0;
                if (t.tipo === 'ingreso') {
                    balUSD += m;
                    cantIngresos++;
                } else {
                    balUSD -= m;
                    cantGastos++;
                }
                ultimoMov = t;
            }
        });

        totalUSD_Global += balUSD;
        const balBs = Math.max(0, balUSD * tasaBCV);
        const eqBsParalelo = Math.max(0, balUSD * tasaParalelo);
        const eqEUR = tasaEUR > 0 ? (balUSD * tasaBCV) / tasaEUR : 0;

        if (c.moneda === 'VES') {
            totalVES_Puro += balBs;
            totalVES_EquivUSD += Math.max(0, balUSD);
        } else if (c.moneda === 'USD') {
            totalUSD_Fisico += Math.max(0, balUSD);
        } else if (c.moneda === 'USDT') {
            totalUSDT_Puro += Math.max(0, balUSD);
        }

        return {
            id: c.id,
            nombre: c.nombre,
            moneda: c.moneda,
            balUSD,
            balBs,
            eqBsParalelo,
            eqEUR,
            cantMovs: cantIngresos + cantGastos,
            cantIngresos,
            cantGastos,
            ultimoMov,
            esActiva: c.id == cuentaActivaId
        };
    });

    const cuentaActivaObj = cuentasDetalle.find(c => c.esActiva) || cuentasDetalle[0] || null;

    const cuentasVES = cuentasDetalle.filter(c => c.moneda === 'VES');
    const cuentasUSD = cuentasDetalle.filter(c => c.moneda === 'USD');
    const cuentasUSDT = cuentasDetalle.filter(c => c.moneda === 'USDT');

    const patrimonioPositivo = Math.max(0, totalUSD_Fisico + totalUSDT_Puro + totalVES_EquivUSD);
    const pctMonedaDura = patrimonioPositivo > 0 ? (((totalUSD_Fisico + totalUSDT_Puro) / patrimonioPositivo) * 100) : 0;
    const pctExposicionVES = patrimonioPositivo > 0 ? ((totalVES_EquivUSD / patrimonioPositivo) * 100) : 0;

    // Tasas y Brecha
    const brechaBs = tasaParalelo - tasaBCV;
    const brechaPct = tasaBCV > 0 ? ((brechaBs / tasaBCV) * 100) : 0;
    const varBCV_Bs = tasasData.BCV.valor - tasasData.BCV.previo;
    const varBCV_Pct = tasasData.BCV.previo > 0 ? ((varBCV_Bs / tasasData.BCV.previo) * 100) : 0;
    const varUSDT_Bs = tasasData.USDT.valor - tasasData.USDT.previo;
    const varUSDT_Pct = tasasData.USDT.previo > 0 ? ((varUSDT_Bs / tasasData.USDT.previo) * 100) : 0;
    const varEUR_Bs = tasasData.EUR.valor - tasasData.EUR.previo;
    const varEUR_Pct = tasasData.EUR.previo > 0 ? ((varEUR_Bs / tasasData.EUR.previo) * 100) : 0;
    const hayFechaValorFutura = esFechaFutura(tasasData.BCV.fecha);

    // Auditoría de Transacciones, Tiempos, Comisiones y Récords
    let gastosHoy = 0, ingresosHoy = 0;
    let gastosAyer = 0, ingresosAyer = 0;
    let gastosSemana = 0, ingresosSemana = 0;
    let gastosMes = 0, ingresosMes = 0;
    let gastosMesPasado = 0, ingresosMesPasado = 0;
    let gastosTotales = 0, ingresosTotales = 0;

    let cantGastosReales = 0, cantIngresosReales = 0, cantTransferenciasP2P = 0;
    let comisionesTotalBs = 0, comisionesMesBs = 0, cantComisiones = 0;

    const porCatMes = {};
    const porCatTotal = {};
    const gastosHormigaMes = [];
    const listaGastosReales = [];

    let gastoRecordTotal = null;
    let gastoRecordMes = null;
    let ingresoRecordTotal = null;
    let ultimoMovGlobal = transacciones.length > 0 ? transacciones[transacciones.length - 1] : null;

    transacciones.forEach(t => {
        const m = Number(t.montoUSD) || 0;
        const f = t.fecha ? new Date(t.fecha) : new Date();
        const iso = t.fechaIsoLocal || getLocalYYYYMMDD(f);
        const esP2P = t.categoria === 'Transferencia / P2P';

        if (esP2P) {
            cantTransferenciasP2P++;
            return;
        }

        // Escanear si tiene comisión bancaria en la nota ("Comisión: Bs X")
        if (t.nota && /Comisi[oó]n:\s*Bs\s*([\d.]+)/i.test(t.nota)) {
            const matchCom = t.nota.match(/Comisi[oó]n:\s*Bs\s*([\d.]+)/i);
            const bsCom = parseFloat(matchCom[1]) || 0;
            if (bsCom > 0) {
                comisionesTotalBs += bsCom;
                cantComisiones++;
                if (iso.startsWith(mesActualPrefix)) {
                    comisionesMesBs += bsCom;
                }
            }
        }

        if (t.tipo === 'gasto') {
            cantGastosReales++;
            gastosTotales += m;
            listaGastosReales.push(t);

            const cat = t.categoria || 'Varios';
            porCatTotal[cat] = (porCatTotal[cat] || 0) + m;

            if (!gastoRecordTotal || m > Number(gastoRecordTotal.montoUSD)) {
                gastoRecordTotal = t;
            }

            if (iso === hoyIso) gastosHoy += m;
            if (iso === ayerIso) gastosAyer += m;
            if (f.getTime() >= hace7DiasMs) gastosSemana += m;
            if (iso.startsWith(mesPasadoPrefix)) gastosMesPasado += m;

            if (iso.startsWith(mesActualPrefix)) {
                gastosMes += m;
                porCatMes[cat] = (porCatMes[cat] || 0) + m;
                if (!gastoRecordMes || m > Number(gastoRecordMes.montoUSD)) {
                    gastoRecordMes = t;
                }
                if (m > 0 && m <= 10 && cat !== 'Ahorro') {
                    gastosHormigaMes.push(t);
                }
            }
        } else if (t.tipo === 'ingreso') {
            cantIngresosReales++;
            ingresosTotales += m;

            if (!ingresoRecordTotal || m > Number(ingresoRecordTotal.montoUSD)) {
                ingresoRecordTotal = t;
            }

            if (iso === hoyIso) ingresosHoy += m;
            if (iso === ayerIso) ingresosAyer += m;
            if (f.getTime() >= hace7DiasMs) ingresosSemana += m;
            if (iso.startsWith(mesPasadoPrefix)) ingresosMesPasado += m;
            if (iso.startsWith(mesActualPrefix)) ingresosMes += m;
        }
    });

    const totalHormigaMesUSD = gastosHormigaMes.reduce((acc, el) => acc + (Number(el.montoUSD) || 0), 0);
    const promedioDiarioMes = gastosMes / diaDelMes;
    const proyeccionGastoFinMes = promedioDiarioMes * diasEnMes;

    // Categorías ordenadas y memoria inteligente
    const rankingCatMes = Object.entries(porCatMes).sort((a, b) => b[1] - a[1]);
    const rankingCatTotal = Object.entries(porCatTotal).sort((a, b) => b[1] - a[1]);
    const categoriasSinGastoMes = categorias.filter(cat => !porCatMes[cat]);

    const memoriaMonedaCategorias = categorias.map(cat => {
        const ultima = [...transacciones].reverse().find(t => t.categoria === cat && t.tipo === 'gasto');
        return {
            categoria: cat,
            monedaRecordada: ultima && ultima.monedaInputOriginal ? ultima.monedaInputOriginal : 'Automática (según cuenta)',
            gastoMesUSD: porCatMes[cat] || 0,
            gastoTotalUSD: porCatTotal[cat] || 0
        };
    });

    // Metas de ahorro
    let totalAhorradoMetas = 0;
    let totalObjetivoMetas = 0;
    const metasDetalle = metas.map(m => {
        const acum = Number(m.acumulado) || 0;
        const obj = Number(m.objetivo) || 0;
        const falta = Math.max(0, obj - acum);
        const pct = obj > 0 ? Math.min(100, (acum / obj) * 100) : 0;
        totalAhorradoMetas += acum;
        totalObjetivoMetas += obj;

        const movsMeta = transacciones.filter(t => t.categoria === 'Ahorro' && t.nota && t.nota.includes(m.nombre));
        return {
            ...m,
            acum,
            obj,
            falta,
            pct,
            cantMovs: movsMeta.length,
            tieneFoto: Boolean(m.imagen)
        };
    });
    const faltaGlobalMetas = Math.max(0, totalObjetivoMetas - totalAhorradoMetas);
    const pctGlobalMetas = totalObjetivoMetas > 0 ? Math.min(100, (totalAhorradoMetas / totalObjetivoMetas) * 100) : 0;

    // Gasto en Comida/Mercado este mes (para respuestas de comida)
    let gastoComidaMesUSD = 0;
    Object.entries(porCatMes).forEach(([cat, val]) => {
        if (/comida|mercado|restaurante|almuerzo|cena|delivery|supermercado|antojo/i.test(cat)) {
            gastoComidaMesUSD += val;
        }
    });

    // Estado de la App y Configuración
    const modoVisual = localStorage.getItem('app_theme_mode') || 'dark';
    const colorAcento = localStorage.getItem('app_theme_color') || '#FFFFFF';
    const pendienteSync = localStorage.getItem('assist_pending_sync') === 'true';

    return {
        hoyIso,
        ayerIso,
        mesActualPrefix,
        mesPasadoPrefix,
        diaDelMes,
        diasEnMes,
        diasRestantesMes,
        totalUSD_Global,
        totalBs_BCV: Math.max(0, totalUSD_Global * tasaBCV),
        totalVES_Puro,
        totalVES_EquivUSD,
        totalUSD_Fisico,
        totalUSDT_Puro,
        cuentasDetalle,
        cuentaActivaObj,
        cuentasVES,
        cuentasUSD,
        cuentasUSDT,
        pctMonedaDura,
        pctExposicionVES,
        brechaBs,
        brechaPct,
        varBCV_Bs,
        varBCV_Pct,
        varUSDT_Bs,
        varUSDT_Pct,
        varEUR_Bs,
        varEUR_Pct,
        hayFechaValorFutura,
        gastosHoy,
        ingresosHoy,
        gastosAyer,
        ingresosAyer,
        gastosSemana,
        ingresosSemana,
        gastosMes,
        ingresosMes,
        gastosMesPasado,
        ingresosMesPasado,
        gastosTotales,
        ingresosTotales,
        cantGastosReales,
        cantIngresosReales,
        cantTransferenciasP2P: Math.floor(cantTransferenciasP2P / 2),
        comisionesTotalBs,
        comisionesTotalUSD: tasaBCV > 0 ? (comisionesTotalBs / tasaBCV) : 0,
        comisionesMesBs,
        comisionesMesUSD: tasaBCV > 0 ? (comisionesMesBs / tasaBCV) : 0,
        cantComisiones,
        rankingCatMes,
        rankingCatTotal,
        categoriasSinGastoMes,
        memoriaMonedaCategorias,
        gastosHormigaMes,
        totalHormigaMesUSD,
        promedioDiarioMes,
        proyeccionGastoFinMes,
        listaGastosReales,
        gastoRecordTotal,
        gastoRecordMes,
        ingresoRecordTotal,
        ultimoMovGlobal,
        metasDetalle,
        totalAhorradoMetas,
        totalObjetivoMetas,
        faltaGlobalMetas,
        pctGlobalMetas,
        gastoComidaMesUSD,
        modoVisual,
        colorAcento,
        pendienteSync
    };
}

// ================= EJECUTOR DE SEGUIMIENTO DE MEMORIA CONVERSACIONAL =================
function procesarSeguimientoMemoriaAskBot(txt, snap) {
    if (!askbotMemoria.temaPendiente) return null;

    const esAfirmativo = /^(si|sii+|dale|claro|de una|por favor|porfa|hazlo|a ver|aver|ok|okay|vale|echale|echale bolas|calculalo|muestrame|enseñame|activo|fino|bueno|vamos|dime|si va)\b/.test(txt);
    const esNegativo = /^(no|noo+|nah|mejor no|despues|luego|otro tema|gracias|asi esta bien|deja asi)\b/.test(txt);

    if (!esAfirmativo && !esNegativo) return null;

    const tema = askbotMemoria.temaPendiente;
    const datos = askbotMemoria.datos || {};
    askbotMemoria = { temaPendiente: null, datos: {} };

    if (esNegativo) {
        return {
            b1: elegirAzar([
                `¡Fino ${apelativoPana()}! Cero rollo, dejamos ese cálculo quieto por ahora. 🙌`,
                `¡Tranquilo ${apelativoPana()}! Estamos claros. Aquí sigo activo por si quieres revisar otra cuenta, tasa o movimiento. 🤜🤛`
            ]),
            b2: `¿Quieres consultar alguna otra cosita de tus cuentas o de la app?`
        };
    }

    // Ramas afirmativas de la máquina de estados
    switch (tema) {
        case 'presupuesto_finde': {
            const liquidez = Math.max(0, snap.totalUSD_Global);
            const topeHoy = liquidez * 0.08;
            const topeFinde = liquidez * 0.18;
            const diarioSeguro = liquidez / snap.diasRestantesMes;
            return {
                b1: `🍻 **Plan de Presupuesto para el Fin de Semana (${apelativoPana(false)}):**\n• **Tu liquidez actual:** $${liquidez.toFixed(2)} *(Bs ${(liquidez * tasaBCV).toFixed(2)} BCV)*\n• **Tope sano para salir hoy (8%):** **$${topeHoy.toFixed(2)}** *(≈ Bs ${(topeHoy * tasaBCV).toFixed(2)})*\n• **Presupuesto total Viernes a Domingo (18%):** **$${topeFinde.toFixed(2)}** *(≈ Bs ${(topeFinde * tasaBCV).toFixed(2)})*\n• **Oxígeno diario hasta fin de mes (${snap.diasRestantesMes} días):** $${diarioSeguro.toFixed(2)}/día\n\n💡 *Consejo de pana:* Si pagas en Bolívares usa **Tarjeta de Débito/POS (0 Bs de comisión)** en vez de varios Pagos Móviles para no regalarle Bs 14 por operación al banco.`,
                b2: `¿Quieres que también te muestre cómo aprovechar tus USDT frente al BCV este fin de semana?`,
                tema: 'simular_cambio_usdt'
            };
        }

        case 'simular_cambio_usdt': {
            const baseUSDT = snap.totalUSDT_Puro > 0 ? snap.totalUSDT_Puro : 50;
            const mitadUSDT = baseUSDT / 2;
            const bsRecibidosTotal = baseUSDT * tasaParalelo;
            const poderCompraBCV = tasaBCV > 0 ? (bsRecibidosTotal / tasaBCV) : baseUSDT;
            const gananciaPoderUSD = Math.max(0, poderCompraBCV - baseUSDT);

            return {
                b1: `🪙 **Simulación de Cambio USDT ➔ Bolívares (${snap.totalUSDT_Puro > 0 ? 'Con tu saldo real' : 'Ejemplo práctico con 50 USDT'}):**\n• **Cambiando el 50% (${mitadUSDT.toFixed(2)} USDT):** Recibes **Bs ${(mitadUSDT * tasaParalelo).toFixed(2)}**, que en comercios a tasa BCV rinden como **$${((mitadUSDT * tasaParalelo) / tasaBCV).toFixed(2)}**.\n• **Cambiando el 100% (${baseUSDT.toFixed(2)} USDT):** Recibes **Bs ${bsRecibidosTotal.toFixed(2)}**, que a tasa BCV equivalen a **$${poderCompraBCV.toFixed(2)}**.\n\n🔥 **Ganancia de poder de compra:** Estás ganando **+$${gananciaPoderUSD.toFixed(2)} extra (+${snap.brechaPct.toFixed(2)}%)** solo por cambiar tus USDT a Bs antes de pagar en locales a BCV.`,
                b2: `¿Quieres saber qué porcentaje de toda tu plata está protegida en moneda dura (USD/USDT) vs Bolívares?`,
                tema: 'comparativa_divisas_vs_bs'
            };
        }

        case 'simular_comision_compra': {
            const montoBs = datos.montoBs || (50 * tasaBCV);
            const comP2P = Math.max(14.00, montoBs * 0.003);
            const comP2C = Math.max(14.00, montoBs * 0.015);
            return {
                b1: `🏦 **Cálculo de Comisión Bancaria para Bs ${montoBs.toFixed(2)}:**\n• 💳 **Tarjeta Débito / Punto (POS):** **Bs 0.00** *(Total debitado: Bs ${montoBs.toFixed(2)})*\n• 📱 **Pago Móvil P2P (0,30% - mín Bs 14):** **Bs ${comP2P.toFixed(2)}** *(≈ $${(comP2P / tasaBCV).toFixed(2)} BCV)* ➔ Total: **Bs ${(montoBs + comP2P).toFixed(2)}**\n• 🏪 **Pago Móvil Comercio P2C (1,50% - mín Bs 14):** **Bs ${comP2C.toFixed(2)}** *(≈ $${(comP2C / tasaBCV).toFixed(2)} BCV)* ➔ Total: **Bs ${(montoBs + comP2C).toFixed(2)}**`,
                b2: `¿Quieres que audite cuántos Bolívares y Dólares has perdido en comisiones bancarias en tu historial?`,
                tema: 'auditoria_comisiones'
            };
        }

        case 'auditoria_comisiones': {
            return {
                b1: `🕵️‍♂️ **Auditoría de Comisiones Bancarias en tu Historial:**\n• **Operaciones con comisión registradas:** ${snap.cantComisiones}\n• **Pagado en comisiones este mes:** **Bs ${snap.comisionesMesBs.toFixed(2)}** *(≈ $${snap.comisionesMesUSD.toFixed(2)} BCV)*\n• **Pagado en comisiones histórico:** **Bs ${snap.comisionesTotalBs.toFixed(2)}** *(≈ $${snap.comisionesTotalUSD.toFixed(2)} BCV)*\n\n💡 *Dato clave:* Cada vez que puedas pasar **Tarjeta de Débito (0 Bs)** en lugar de Pago Móvil, esa plata se queda en tu bolsillo.`,
                b2: `¿Quieres que busquemos si tienes "gastos hormiga" este mes que te estén drenando los cobres?`,
                tema: 'detectar_gastos_hormiga'
            };
        }

        case 'plan_cuotas_metas': {
            if (snap.metasDetalle.length === 0) {
                return {
                    b1: `🎯 Ahorita no tienes ninguna meta activa creada ${apelativoPana()}. Si creas una en la pestaña **Metas**, te armo al instante las cuotas diarias y semanales.`,
                    b2: `¿Quieres que te lleve directo a la pestaña de **Metas** para crear la primera?`,
                    tema: 'ir_pestana_metas'
                };
            }
            const lineas = snap.metasDetalle.map(m => {
                const diario30 = m.falta / 30;
                const semanal8 = m.falta / 8;
                const quincenal6 = m.falta / 6;
                return `• **${m.nombre}** *(Faltan $${m.falta.toFixed(2)})*:\n  ↳ En 1 mes: **$${diario30.toFixed(2)}/día** *(Bs ${(diario30 * tasaBCV).toFixed(2)})*\n  ↳ En 2 meses: **$${semanal8.toFixed(2)}/semana**\n  ↳ En 3 meses: **$${quincenal6.toFixed(2)}/quincena**`;
            }).join('\n\n');

            return {
                b1: `📅 **Tu Plan Maestro para Completar tus Metas:**\n\n${lineas}`,
                b2: `¿Quieres que te lleve ahora mismo a la pestaña **Metas** para registrar un abono?`,
                tema: 'ir_pestana_metas'
            };
        }

        case 'top_gastos_caros': {
            if (snap.listaGastosReales.length === 0) {
                return {
                    b1: `📜 Todavía no tienes gastos registrados en tu historial ${apelativoPana()}.`,
                    b2: null
                };
            }
            const top5 = [...snap.listaGastosReales]
                .sort((a, b) => Number(b.montoUSD) - Number(a.montoUSD))
                .slice(0, 5)
                .map((t, idx) => {
                    const c = cuentas.find(cu => cu.id == t.cuentaId);
                    const nomCuenta = c ? c.nombre : 'Cuenta';
                    return `${idx + 1}. **${t.categoria}:** $${Number(t.montoUSD).toFixed(2)} *(Bs ${(Number(t.montoUSD) * tasaBCV).toFixed(2)})* — ${t.fechaFormateada} en *${nomCuenta}*${t.nota ? ` (${t.nota})` : ''}`;
                }).join('\n');

            return {
                b1: `🏆 **Top ${Math.min(5, snap.listaGastosReales.length)} Gastos Más Altos de tu Historial:**\n${top5}`,
                b2: `¿Quieres que abra la ventana de **Historial y Gráficos** para ver el gráfico de dona completo?`,
                tema: 'abrir_modal_historial'
            };
        }

        case 'detectar_gastos_hormiga': {
            if (snap.gastosHormigaMes.length === 0) {
                return {
                    b1: `🐜 **¡Excelente noticia ${apelativoPana()}!** Este mes tienes **0 gastos hormiga** (compras pequeñas menores a $10). Estás cuidando los cobres como un profesional.`,
                    b2: `¿Quieres ver la proyección de cómo vas a cerrar el mes a este ritmo?`,
                    tema: 'proyeccion_fin_de_mes'
                };
            }
            const ultimosHormiga = snap.gastosHormigaMes.slice(-4).map(t => `• **${t.categoria}:** $${Number(t.montoUSD).toFixed(2)} ${t.nota ? `*(${t.nota})*` : ''} — ${t.fechaFormateada}`).join('\n');
            return {
                b1: `🐜 **Detector de Gastos Hormiga del Mes (Compras ≤ $10):**\n• **Cantidad de micro-gastos:** ${snap.gastosHormigaMes.length} movimientos\n• **Fuga acumulada:** **$${snap.totalHormigaMesUSD.toFixed(2)}** *(≈ Bs ${(snap.totalHormigaMesUSD * tasaBCV).toFixed(2)} BCV)*\n\n**Últimos detectados:**\n${ultimosHormiga}\n\n💡 *Pilas con eso:* De poquito en poquito se te han ido **$${snap.totalHormigaMesUSD.toFixed(2)}** que podrían estar metidos en tus metas de ahorro.`,
                b2: `¿Quieres que calcule tu proyección de cierre de fin de mes según tu ritmo de gasto diario?`,
                tema: 'proyeccion_fin_de_mes'
            };
        }

        case 'proyeccion_fin_de_mes': {
            const diasOxigeno = snap.promedioDiarioMes > 0 ? Math.floor(Math.max(0, snap.totalUSD_Global) / snap.promedioDiarioMes) : 999;
            return {
                b1: `🔮 **Proyección Financiera de Cierre de Mes:**\n• **Día actual del mes:** Día ${snap.diaDelMes} de ${snap.diasEnMes} *(quedan ${snap.diasRestantesMes} días)*\n• **Ritmo de gasto diario (*Burn Rate*):** **$${snap.promedioDiarioMes.toFixed(2)}/día** *(Bs ${(snap.promedioDiarioMes * tasaBCV).toFixed(2)}/día)*\n• **Gasto proyectado al cerrar el mes:** **$${snap.proyeccionGastoFinMes.toFixed(2)}**\n• **Días de oxígeno con tu saldo actual:** ${diasOxigeno > 365 ? 'Más de 1 año 🔥' : `**${diasOxigeno} días**`}`,
                b2: `¿Quieres revisar cuáles son tus gastos más altos registrados hasta ahora?`,
                tema: 'top_gastos_caros'
            };
        }

        case 'detalle_memoria_categorias': {
            if (snap.memoriaMonedaCategorias.length === 0) {
                return {
                    b1: `🏷️ Aún no tienes categorías creadas ${apelativoPana()}. Ve a **Ajustes > Gestionar Categorías** para agregarlas.`,
                    b2: null
                };
            }
            const listaMem = snap.memoriaMonedaCategorias.map(c => `• **${c.categoria}:** Recuerda pagar en **${c.monedaRecordada}** *(Gastado este mes: $${c.gastoMesUSD.toFixed(2)})*`).join('\n');
            return {
                b1: `🧠 **Memoria Inteligente de Monedas por Categoría:**\nCada vez que eliges una categoría en el Inicio, A$$IST selecciona sola la última moneda que usaste en ella:\n\n${listaMem}`,
                b2: null
            };
        }

        case 'comparativa_divisas_vs_bs': {
            const consejo = snap.pctExposicionVES > 45
                ? `⚠️ **Alerta de pana:** Tienes el **${snap.pctExposicionVES.toFixed(1)}%** de tu plata en Bolívares. Si no los vas a gastar en los próximos días, considera pasar una parte a **USDT** o **USD** para que la inflación no te coma el capital.`
                : `✅ **Blindaje óptimo:** Tienes el **${snap.pctMonedaDura.toFixed(1)}%** de tu patrimonio resguardado en moneda fuerte (USD/USDT). ¡Estás bien protegido contra la devaluación!`;

            return {
                b1: `🛡️ **Índice de Blindaje contra Devaluación:**\n• 💵 **Dólares Físicos (USD):** $${snap.totalUSD_Fisico.toFixed(2)}\n• 🪙 **Cripto / Tether (USDT):** ${snap.totalUSDT_Puro.toFixed(2)} USDT\n• 🇻🇪 **Bolívares (VES):** Bs ${snap.totalVES_Puro.toFixed(2)} *(≈ $${snap.totalVES_EquivUSD.toFixed(2)} BCV)*\n\n📊 **Proporción actual:**\n• **Protegido en Divisas/USDT:** **${snap.pctMonedaDura.toFixed(1)}%**\n• **Expuesto en Bolívares:** **${snap.pctExposicionVES.toFixed(1)}%**\n\n${consejo}`,
                b2: `¿Quieres que te calcule un presupuesto seguro para gastar este fin de semana?`,
                tema: 'presupuesto_finde'
            };
        }

        case 'estado_seguridad_nube': {
            const estadoNube = usuarioActual
                ? (snap.pendienteSync || !navigator.onLine ? `Pendiente de subir (${usuarioActual.email})` : `Sincronizado en vivo ☁️ (${usuarioActual.email})`)
                : `Modo Solo Local (Sin cuenta conectada)`;
            return {
                b1: `🔒 **Estado de Seguridad, Nube y Apariencia en Vivo:**\n• ☁️ **Nube Supabase:** ${estadoNube}\n• 📡 **Conexión actual:** ${navigator.onLine ? 'Online (Con internet)' : 'Offline (Modo sin señal activo)'}\n• 🔢 **PIN de 4 dígitos:** ${appPin ? 'Activo ✅ (Auto-bloqueo en 3 min)' : 'Desactivado ⚠️ (Configúralo en Ajustes)'}\n• 🕵️‍♂️ **Modo Pánico (`**`):** ${censurado ? 'Encendido 🙈' : 'Apagado 👁️'}\n• 🎨 **Tema actual:** Modo **${snap.modoVisual.toUpperCase()}** con acento **${snap.colorAcento}**`,
                b2: null
            };
        }

        case 'abrir_modal_historial': {
            return {
                b1: `📜 ¡De una ${apelativoPana()}! Abriendo tu **Historial y Gráficos**...`,
                b2: null,
                accion: () => abrirModal('modal-historial')
            };
        }

        case 'abrir_modal_cuentas': {
            return {
                b1: `💳 ¡Claro que sí ${apelativoPana()}! Abriendo el gestor de **Mis Cuentas**...`,
                b2: null,
                accion: () => abrirModal('modal-cuentas')
            };
        }

        case 'ir_pestana_calculadora': {
            return {
                b1: `💱 ¡Listo ${apelativoPana()}! Te llevo directo a la **Calculadora de Conversión**...`,
                b2: null,
                accion: () => {
                    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
                    if (navItems[2]) cambiarPestana('tab-calculadora', navItems[2]);
                }
            };
        }

        case 'ir_pestana_metas': {
            return {
                b1: `🎯 ¡Fino ${apelativoPana()}! Vamos directo a tus **Metas de Ahorro**...`,
                b2: null,
                accion: () => {
                    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
                    if (navItems[3]) cambiarPestana('tab-metas', navItems[3]);
                }
            };
        }

        case 'abrir_tutorial_interactivo': {
            return {
                b1: `🎓 ¡De una ${apelativoPana()}! Abriendo el **Tutorial Interactivo de 9 pasos** de A$$IST...`,
                b2: null,
                accion: () => iniciarTutorial()
            };
        }
    }

    return null;
}

// ================= CEREBRO CONVERSACIONAL SUPREMO (20 MÓDULOS + 15 CATEGORÍAS PANA) =================
function analizarMensajeAskBotPana(mensajeRaw) {
    const txt = normalizarTextoAskBot(mensajeRaw);
    const snap = obtenerRadiografiaFinanciera();
    const pana = apelativoPana();

    // 0. PRIMERO: Verificar si está respondiendo "sí / dale / no" a la última pregunta de AskBot
    const respSeguimiento = procesarSeguimientoMemoriaAskBot(txt, snap);
    if (respSeguimiento) return respSeguimiento;

    // =========================================================================
    // MÓDULO 20: COMANDOS DIRECTOS EN VIVO (EJECUTAR ACCIONES REALES EN LA APP)
    // =========================================================================
    if (/\b(activa|activar|enciende|encender|pon|poner|oculta|ocultar|esconde|esconder)\b.*\b(modo panico|panico|censura|montos|saldos|asteriscos)\b/.test(txt)) {
        return {
            b1: `🕵️‍♂️ ¡Listo ${pana}! Ya activé el **Modo Pánico**. Todos tus montos quedaron ocultos con \`********\` por si tienes gente curiosa alrededor.`,
            b2: `Recuerda que también puedes activarlo o quitarlo dando **doble toque rápido** sobre tu tarjeta de balance. ¿Revisamos algo más?`,
            accion: () => { if (!censurado) toggleCensura(); }
        };
    }

    if (/\b(desactiva|desactivar|apaga|apagar|quita|quitar|muestra|mostrar|ver)\b.*\b(modo panico|panico|censura|montos|saldos|asteriscos)\b/.test(txt)) {
        return {
            b1: `👁️ ¡Hecho ${pana}! Desactivé el **Modo Pánico**, tus montos ya son visibles otra vez en toda la app.`,
            b2: null,
            accion: () => { if (censurado) toggleCensura(); }
        };
    }

    if (/\b(abre|abrir|muestrame|ir a|llevame a)\b.*\b(historial|grafico|graficos)\b/.test(txt)) {
        return {
            b1: `📜 ¡De una ${pana}! Te abro la ventana de **Historial y Gráficos** de tu cuenta activa.`,
            b2: null,
            accion: () => abrirModal('modal-historial')
        };
    }

    if (/\b(abre|abrir|inicia|iniciar|mostrar|ver)\b.*\b(tutorial|guia)\b/.test(txt)) {
        return {
            b1: `🎓 ¡Claro que sí ${pana}! Aquí tienes el **Tutorial Interactivo de 9 pasos** de A$$IST.`,
            b2: null,
            accion: () => iniciarTutorial()
        };
    }

    // =========================================================================
    // CHIP 1 / RADIOGRAFÍA COMPLETA DE MI PLATA
    // =========================================================================
    if (/\b(radiografia|resumen completo|resumen general|estado general|como estoy en general)\b/.test(txt)) {
        const desgloseCuentas = snap.cuentasDetalle.length > 0
            ? snap.cuentasDetalle.map(c => {
                if (c.moneda === 'VES') return `• **${c.nombre} (VES):** Bs ${c.balBs.toFixed(2)} *(≈ $${c.balUSD.toFixed(2)} BCV)*`;
                if (c.moneda === 'USDT') return `• **${c.nombre} (USDT):** ${c.balUSD.toFixed(2)} USDT *(≈ Bs ${c.eqBsParalelo.toFixed(2)})*`;
                return `• **${c.nombre} (${c.moneda}):** $${c.balUSD.toFixed(2)}`;
            }).join('\n')
            : '• Sin cuentas registradas aún.';

        const topCatTxt = snap.rankingCatMes.length > 0
            ? `**${snap.rankingCatMes[0][0]}** ($${snap.rankingCatMes[0][1].toFixed(2)})`
            : 'Sin gastos este mes';

        return {
            b1: `📊 **Radiografía Completa de tu Plata (${pana}):**\n\n💎 **Patrimonio Total Líquido:** **$${snap.totalUSD_Global.toFixed(2)}** *(≈ Bs ${snap.totalBs_BCV.toFixed(2)} a BCV)*\n• 💵 **USD Físico:** $${snap.totalUSD_Fisico.toFixed(2)} | 🪙 **USDT:** ${snap.totalUSDT_Puro.toFixed(2)} USDT | 🇻🇪 **VES:** Bs ${snap.totalVES_Puro.toFixed(2)}\n• 🛡️ **Blindaje en moneda dura:** ${snap.pctMonedaDura.toFixed(1)}%\n\n💳 **Tus ${snap.cuentasDetalle.length} Cuentas:**\n${desgloseCuentas}\n\n📅 **Balance de este Mes (${snap.mesActualPrefix}):**\n• **Ingresos:** +$${snap.ingresosMes.toFixed(2)} | **Gastos:** -$${snap.gastosMes.toFixed(2)}\n• **Categoría #1 de gasto:** ${topCatTxt}\n• **Comisiones bancarias pagadas:** Bs ${snap.comisionesMesBs.toFixed(2)} *(≈ $${snap.comisionesMesUSD.toFixed(2)})*\n• **Ahorrado en ${snap.metasDetalle.length} metas:** $${snap.totalAhorradoMetas.toFixed(2)} / $${snap.totalObjetivoMetas.toFixed(2)}`,
            b2: `¿Quieres que te calcule cuánto puedes gastar hoy y este fin de semana sin descapitalizarte?`,
            tema: 'presupuesto_finde'
        };
    }

    // =========================================================================
    // CHIP 4 / AUDITORÍA TOTAL DE LA APP (CONTEO DE CUENTAS, CATEGORÍAS, METAS, RÉCORDS)
    // =========================================================================
    if (/\b(auditoria total|estado de mi app|cuantas cuentas.*categorias.*metas|todo sobre mi app)\b/.test(txt)) {
        const recGasto = snap.gastoRecordTotal ? `$${Number(snap.gastoRecordTotal.montoUSD).toFixed(2)} en ${snap.gastoRecordTotal.categoria}` : 'Ninguno aún';
        return {
            b1: `🎯 **Auditoría Total de tu A$$IST (${pana}):**\n\n📦 **Inventario de tu App:**\n• 💳 **Cuentas creadas:** **${snap.cuentasDetalle.length}** *(${snap.cuentasVES.length} en Bs, ${snap.cuentasUSD.length} en USD, ${snap.cuentasUSDT.length} en USDT)*\n• 🏷️ **Categorías personalizadas:** **${categorias.length}** *(${snap.categoriasSinGastoMes.length} sin gastos este mes)*\n• 🎯 **Metas de ahorro activas:** **${snap.metasDetalle.length}** *(Progreso global: ${snap.pctGlobalMetas.toFixed(1)}%)*\n• 📜 **Movimientos en historial:** **${transacciones.length}** *(${snap.cantGastosReales} gastos, ${snap.cantIngresosReales} ingresos y ${snap.cantTransferenciasP2P} cambios P2P)*\n\n🏆 **Récords y Comisiones:**\n• **Gasto más alto histórico:** ${recGasto}\n• **Comisiones bancarias acumuladas:** Bs ${snap.comisionesTotalBs.toFixed(2)} en ${snap.cantComisiones} pagos\n\n⚙️ **Sistema y Seguridad:**\n• **Nube:** ${usuarioActual ? `Conectado (${usuarioActual.email})` : 'Modo Solo Local'} | **PIN:** ${appPin ? 'Activo 🔒' : 'Inactivo'} | **Tema:** ${snap.modoVisual.toUpperCase()}`,
            b2: `¿Quieres ver la tabla de qué moneda recuerda la Memoria Inteligente para cada una de tus ${categorias.length} categorías?`,
            tema: 'detalle_memoria_categorias'
        };
    }

    // =========================================================================
    // MÓDULO 5: CALCULADORA Y AUDITORÍA DE COMISIONES BANCARIAS VE
    // =========================================================================
    if (/\b(comision|comisiones|pago movil|p2p|p2c|punto de venta|pos|cuanto quita el banco|cuanto cobra el banco)\b/.test(txt)) {
        const matchNumCom = txt.match(/(\d+(?:[.,]\d+)?)/);
        if (matchNumCom && /\b(bs|bolos|bolivares|ves|de|por|monto)\b/.test(txt)) {
            const montoBs = parseFloat(matchNumCom[1].replace(',', '.'));
            const comP2P = Math.max(14.00, montoBs * 0.003);
            const comP2C = Math.max(14.00, montoBs * 0.015);
            return {
                b1: `🏦 **Simulador de Comisión Bancaria para Bs ${montoBs.toFixed(2)}:**\n• 💳 **Tarjeta / POS:** **Bs 0.00** *(Pagas exacto Bs ${montoBs.toFixed(2)})*\n• 📱 **Pago Móvil P2PPersonas (0,30% - mín Bs 14):** Comisión de **Bs ${comP2P.toFixed(2)}** *(≈ $${(comP2P / tasaBCV).toFixed(2)} BCV)* ➔ Se descuentan **Bs ${(montoBs + comP2P).toFixed(2)}**\n• 🏪 **Pago Móvil Comercio P2C (1,50% - mín Bs 14):** Comisión de **Bs ${comP2C.toFixed(2)}** *(≈ $${(comP2C / tasaBCV).toFixed(2)} BCV)* ➔ Se descuentan **Bs ${(montoBs + comP2C).toFixed(2)}**`,
                b2: `¿Quieres que revise cuánto dinero has gastado en comisiones bancarias en todo tu historial?`,
                tema: 'auditoria_comisiones'
            };
        }

        return {
            b1: `🇻🇪 **Auditoría y Tarifas de Comisiones Bancarias en A$$IST:**\n\n📊 **Tu historial de comisiones:**\n• **Este mes:** **Bs ${snap.comisionesMesBs.toFixed(2)}** *(≈ $${snap.comisionesMesUSD.toFixed(2)} BCV)*\n• **Total histórico:** **Bs ${snap.comisionesTotalBs.toFixed(2)}** *(≈ $${snap.comisionesTotalUSD.toFixed(2)} BCV en ${snap.cantComisiones} operaciones)*\n\n🏦 **Cómo las calcula la app al registrar un gasto en VES:**\n• 💳 **Tarjeta de Débito / POS:** **0 Bs** de comisión.\n• 📱 **Pago Móvil P2P (Personas):** **0,30%** del monto *(mínimo Bs 14.00)*.\n• 🏪 **Pago Móvil Comercio (P2C):** **1,50%** del monto *(mínimo Bs 14.00)*.\n• ✍️ **Comisión Manual:** Tú escribes el monto exacto en Bs.`,
            b2: `¿Quieres que te simule cuánto te cobraría el banco por un monto específico en Bolívares?`,
            tema: 'simular_comision_compra',
            datos: { montoBs: 2500 }
        };
    }

    // =========================================================================
    // MÓDULO 3: SIMULADOR DE COMPRAS ("¿ME PUEDO COMPRAR ESTO?" / "¿ME ALCANZA?")
    // =========================================================================
    const regexIntencionCompra = /\b(me puedo comprar|puedo comprar|quiero comprar|comprarme|me alcanza|alcanza para|alcanzara|es viable comprar|puedo gastar|gastarme|salir con|rumbear con|darme el gusto|vale la pena comprar)\b/;
    const matchMontoCompra = txt.match(/(\d+(?:[.,]\d+)?)\s*(bs|bolos|bolivares|ves|soberanos|usd|dolares|dolar|verdes|lechugas|\$|usdt|tether|eur|euros|euro|€)?/i);

    if (regexIntencionCompra.test(txt) && matchMontoCompra && !/\b(sin quedar pelando|cuanto puedo gastar hoy)\b/.test(txt)) {
        const valorRaw = parseFloat(matchMontoCompra[1].replace(',', '.'));
        const monRaw = (matchMontoCompra[2] || 'usd').toLowerCase();

        if (valorRaw > 0) {
            let costoUSD = valorRaw;
            let costoBs = valorRaw * tasaBCV;
            let etiquetaMoneda = `$${valorRaw.toFixed(2)} USD`;

            if (['bs', 'bolos', 'bolivares', 'ves', 'soberanos'].includes(monRaw)) {
                costoBs = valorRaw;
                costoUSD = tasaBCV > 0 ? (valorRaw / tasaBCV) : valorRaw;
                etiquetaMoneda = `Bs ${valorRaw.toFixed(2)} (≈ $${costoUSD.toFixed(2)} BCV)`;
            } else if (['usdt', 'tether'].includes(monRaw)) {
                costoBs = valorRaw * tasaParalelo;
                costoUSD = valorRaw;
                etiquetaMoneda = `${valorRaw.toFixed(2)} USDT (≈ Bs ${costoBs.toFixed(2)})`;
            } else if (['eur', 'euros', 'euro', '€'].includes(monRaw)) {
                costoBs = valorRaw * tasaEUR;
                costoUSD = tasaBCV > 0 ? (costoBs / tasaBCV) : valorRaw;
                etiquetaMoneda = `€${valorRaw.toFixed(2)} (≈ $${costoUSD.toFixed(2)} BCV)`;
            }

            const liquidezUSD = Math.max(0, snap.totalUSD_Global);
            const pctImpacto = liquidezUSD > 0 ? ((costoUSD / liquidezUSD) * 100) : 999;
            const restanteUSD = liquidezUSD - costoUSD;

            let veredicto = '';
            if (costoUSD > liquidezUSD) {
                const faltaUSD = costoUSD - liquidezUSD;
                veredicto = `🛑 **Veredicto de pana: Ahorita NO te alcanza ${pana}.**\n• **Lo que cuesta:** ${etiquetaMoneda}\n• **Tu saldo total disponible:** $${liquidezUSD.toFixed(2)} *(Bs ${(liquidezUSD * tasaBCV).toFixed(2)})*\n• **Te faltan:** **$${faltaUSD.toFixed(2)}** *(≈ Bs ${(faltaUSD * tasaBCV).toFixed(2)} a BCV)*.\n\n💡 *Consejo:* Aguántalo un pelo a que entre otro ingreso para no endeudarte.`;
            } else if (pctImpacto >= 50) {
                veredicto = `⚠️ **Veredicto de pana: De que te alcanza, te alcanza ${pana}, ¡pero vas a quedar casi limpio!**\n• **Costo del gasto:** ${etiquetaMoneda}\n• **Impacto en tu bolsillo:** Se lleva el **${pctImpacto.toFixed(1)}%** de toda tu plata disponible.\n• **Te quedarían apenas:** **$${restanteUSD.toFixed(2)}** *(≈ Bs ${(restanteUSD * tasaBCV).toFixed(2)} BCV)*.\n\n💡 *Piénsalo dos veces:* Si no es urgente, mejor no descapitalizarte así de golpe.`;
            } else if (pctImpacto >= 20) {
                veredicto = `🟡 **Veredicto de pana: Sí es viable ${pana}, pero con cautela.**\n• **Costo del gasto:** ${etiquetaMoneda}\n• **Impacto en tu liquidez:** Representa el **${pctImpacto.toFixed(1)}%** de tu saldo actual.\n• **Saldo que te quedará después:** **$${restanteUSD.toFixed(2)}** *(≈ Bs ${(restanteUSD * tasaBCV).toFixed(2)} BCV)*.\n\n💡 *Tip:* Si lo compras y el comercio cobra a tasa BCV, paga en Bolívares para aprovechar la brecha del **${snap.brechaPct.toFixed(2)}%**.`;
            } else {
                veredicto = `✅ **Veredicto de pana: ¡Luz verde total ${pana}! Date ese gusto tranquilo.**\n• **Costo del gasto:** ${etiquetaMoneda}\n• **Impacto en tu bolsillo:** Solo toca el **${pctImpacto.toFixed(1)}%** de tu liquidez.\n• **Seguirás teniendo disponibles:** **$${restanteUSD.toFixed(2)}** *(≈ Bs ${(restanteUSD * tasaBCV).toFixed(2)} BCV)*.`;
            }

            return {
                b1: `🛒 **Simulador de Viabilidad de Compra:**\n\n${veredicto}`,
                b2: `¿Quieres que te calcule cuánto te cobraría el banco de comisión si pagas esos **Bs ${costoBs.toFixed(2)}** por Pago Móvil?`,
                tema: 'simular_comision_compra',
                datos: { montoBs: costoBs }
            };
        }
    }

    // =========================================================================
    // MÓDULO 4 / CHIP 2: ¿CUÁNTO PUEDO GASTAR HOY O ESTE FIN DE SEMANA?
    // =========================================================================
    if (/\b(cuanto puedo gastar|con cuanto puedo salir|presupuesto para hoy|presupuesto fin de semana|salir el fin de semana|sin descapitalizarme|sin quedar pelando)\b/.test(txt)) {
        const liquidez = Math.max(0, snap.totalUSD_Global);
        const hoySeguro = liquidez * 0.08;
        const findeSeguro = liquidez * 0.18;
        const diarioMes = liquidez / snap.diasRestantesMes;

        return {
            b1: `💸 **Cálculo de Presupuesto Seguro (${pana}):**\n\n• **Tu liquidez libre actual:** **$${liquidez.toFixed(2)}** *(≈ Bs ${(liquidez * tasaBCV).toFixed(2)} BCV)*\n• **Además tienes resguardado en Metas:** $${snap.totalAhorradoMetas.toFixed(2)} *(¡intocable!)*\n\n🚦 **Límites recomendados para no descapitalizarte:**\n• **Para gastar hoy (8%):** Máximo **$${hoySeguro.toFixed(2)}** *(≈ Bs ${(hoySeguro * tasaBCV).toFixed(2)})*\n• **Para todo el fin de semana (18%):** Máximo **$${findeSeguro.toFixed(2)}** *(≈ Bs ${(findeSeguro * tasaBCV).toFixed(2)})*\n• **Tope diario de aquí a fin de mes (${snap.diasRestantesMes} días):** **$${diarioMes.toFixed(2)}/día**`,
            b2: `¿Quieres que revisemos si tienes "gastos hormiga" este mes que te estén restando liquidez?`,
            tema: 'detectar_gastos_hormiga'
        };
    }

    // =========================================================================
    // MÓDULO 8: CONVERSOR MULTIDIVISA EN LENGUAJE NATURAL
    // =========================================================================
    const matchConversion = txt.match(/(\d+(?:[.,]\d+)?)\s*(bs|bolos|bolivares|bolivar|ves|soberanos|usd|dolares|dolar|verdes|lechugas|\$|usdt|tether|eur|euros|euro|€)/i);
    if (matchConversion && /\b(cuanto|cuantos|convertir|convierte|son|es|a|en|equivale|cambio|pasa|pasar|calcula)\b/.test(txt) && !/\b(tengo|mi cuenta|mis cuentas|meta)\b/.test(txt)) {
        const valor = parseFloat(matchConversion[1].replace(',', '.'));
        const mon = matchConversion[2].toLowerCase();

        if (['bs', 'bolos', 'bolivares', 'bolivar', 'ves', 'soberanos'].includes(mon)) {
            const enBCV = tasaBCV > 0 ? (valor / tasaBCV) : 0;
            const enUSDT = tasaParalelo > 0 ? (valor / tasaParalelo) : 0;
            const enEUR = tasaEUR > 0 ? (valor / tasaEUR) : 0;
            return {
                b1: `💱 **Conversión Exacta de Bs ${valor.toFixed(2)} (${pana}):**\n• 🇻🇪 **A Dólar BCV (Bs ${tasaBCV.toFixed(2)}):** **$${enBCV.toFixed(2)} USD**\n• 🪙 **A Tasa USDT (Bs ${tasaParalelo.toFixed(2)}):** **${enUSDT.toFixed(2)} USDT**\n• 🇪🇺 **A Euro Oficial (Bs ${tasaEUR.toFixed(2)}):** **€${enEUR.toFixed(2)} EUR**\n\n📊 *Diferencia por brecha:* Con esos mismos Bs compras **$${(enBCV - enUSDT).toFixed(2)} más** si el precio está anclado a BCV.`,
                b2: `¿Quieres que te lleve directo a la pestaña de **Conversión** o calculamos la comisión de Pago Móvil para esos Bs ${valor.toFixed(2)}?`,
                tema: 'simular_comision_compra',
                datos: { montoBs: valor }
            };
        } else if (['usdt', 'tether'].includes(mon)) {
            const totalBs = valor * tasaParalelo;
            const poderBCV = tasaBCV > 0 ? (totalBs / tasaBCV) : valor;
            return {
                b1: `🪙 **Conversión Exacta de ${valor.toFixed(2)} USDT (${pana}):**\n• 🇻🇪 **En Bolívares (Tasa USDT Bs ${tasaParalelo.toFixed(2)}):** **Bs ${totalBs.toFixed(2)}**\n• 🛍️ **Poder de compra en locales a BCV:** **$${poderBCV.toFixed(2)} USD** *(ganas +$${(poderBCV - valor).toFixed(2)} de rendimiento por la brecha)*\n• 🇪🇺 **Equivalente en Euros Oficiales:** **€${(totalBs / tasaEUR).toFixed(2)}**`,
                b2: `¿Quieres ver la estrategia completa de cómo aprovechar la brecha cambiaria hoy con tus cuentas?`,
                tema: 'simular_cambio_usdt'
            };
        } else if (['eur', 'euros', 'euro', '€'].includes(mon)) {
            const totalBs = valor * tasaEUR;
            const eqUSD = tasaBCV > 0 ? (totalBs / tasaBCV) : valor;
            const eqUSDT = tasaParalelo > 0 ? (totalBs / tasaParalelo) : valor;
            return {
                b1: `🇪🇺 **Conversión Exacta de €${valor.toFixed(2)} EUR (${pana}):**\n• 🇻🇪 **A Tasa Euro BCV (Bs ${tasaEUR.toFixed(2)}):** **Bs ${totalBs.toFixed(2)}**\n• 🇺🇸 **Equivalente en Dólares BCV:** **$${eqUSD.toFixed(2)} USD**\n• 🪙 **Equivalente en USDT:** **${eqUSDT.toFixed(2)} USDT**`,
                b2: `¿Te abro la **Calculadora de Conversión** por si quieres probar con una tasa personalizada?`,
                tema: 'ir_pestana_calculadora'
            };
        } else {
            const bsBCV = valor * tasaBCV;
            const bsParalelo = valor * tasaParalelo;
            return {
                b1: `🇺🇸 **Conversión Exacta de $${valor.toFixed(2)} USD (${pana}):**\n• 🇻🇪 **A Tasa BCV Oficial (Bs ${tasaBCV.toFixed(2)}):** **Bs ${bsBCV.toFixed(2)}**\n• 🪙 **A Tasa Paralelo/USDT (Bs ${tasaParalelo.toFixed(2)}):** **Bs ${bsParalelo.toFixed(2)}**\n• 📊 **Diferencia en Bolívares:** **Bs ${(bsParalelo - bsBCV).toFixed(2)}** de brecha.`,
                b2: `¿Quieres simular si es viable hacer una compra de **$${valor.toFixed(2)}** con tu saldo disponible hoy?`,
                tema: 'presupuesto_finde'
            };
        }
    }

    // =========================================================================
    // MÓDULOS 6 Y 7 / CHIP 3: TASAS DEL DÍA, VARIACIÓN, FECHA VALOR Y ESTRATEGIA BCV VS USDT
    // =========================================================================
    if (/\b(tasa|tasas|bcv|paralelo|dolar hoy|precio del dolar|a cuanto esta|brecha|diferencial|arbitraje|estrategia bcv|con que me conviene pagar|fecha valor)\b/.test(txt) && !/\b(cuanto tengo|mis cuentas)\b/.test(txt)) {
        const signoBCV = snap.varBCV_Bs >= 0 ? `+${snap.varBCV_Bs.toFixed(2)} Bs (+${snap.varBCV_Pct.toFixed(2)}%)` : `${snap.varBCV_Bs.toFixed(2)} Bs (${snap.varBCV_Pct.toFixed(2)}%)`;
        const signoUSDT = snap.varUSDT_Bs >= 0 ? `+${snap.varUSDT_Bs.toFixed(2)} Bs (+${snap.varUSDT_Pct.toFixed(2)}%)` : `${snap.varUSDT_Bs.toFixed(2)} Bs (${snap.varUSDT_Pct.toFixed(2)}%)`;
        const signoEUR = snap.varEUR_Bs >= 0 ? `+${snap.varEUR_Bs.toFixed(2)} Bs (+${snap.varEUR_Pct.toFixed(2)}%)` : `${snap.varEUR_Bs.toFixed(2)} Bs (${snap.varEUR_Pct.toFixed(2)}%)`;

        const alertaFutura = snap.hayFechaValorFutura
            ? `\n⚠️ **¡Pilas con la Fecha Valor!** La tasa del BCV publicada tiene **fecha valor futura** (${formatFechaCorta(tasasData.BCV.fecha)}).`
            : '';

        const recomendacionPago = snap.brechaPct > 5
            ? `💡 **Estrategia Maestra Hoy:** La brecha está en **${snap.brechaPct.toFixed(2)}%** *(Bs ${snap.brechaBs.toFixed(2)} de diferencia por dólar)*. **NO pagues en dólares físicos** en comercios que cobren a tasa BCV. Te sale mucho mejor cambiar USDT a Bolívares (usando **Transferir** en el Inicio) y pagar en Bs con Tarjeta de Débito: así tu plata rinde un **+${snap.brechaPct.toFixed(2)}% más**.`
            : `💡 **Estrategia Hoy:** La brecha entre BCV y USDT está baja (**${snap.brechaPct.toFixed(2)}%**). Puedes pagar tanto en Bolívares como en divisas sin perder casi diferencial.`;

        return {
            b1: `📈 **Tasas del Día y Estrategia Cambiaria (${pana}):**\n• 🇻🇪 **BCV Oficial:** **Bs ${tasaBCV.toFixed(2)}** *(Variación: ${signoBCV})*\n• 🪙 **USDT / Paralelo:** **Bs ${tasaParalelo.toFixed(2)}** *(Variación: ${signoUSDT})*\n• 🇪🇺 **Euro Oficial:** **Bs ${tasaEUR.toFixed(2)}** *(Variación: ${signoEUR})*\n• 📊 **Brecha BCV vs USDT:** **Bs ${snap.brechaBs.toFixed(2)} (${snap.brechaPct.toFixed(2)}%)**${alertaFutura}\n\n${recomendacionPago}`,
            b2: `¿Quieres que te simule cuántos Bolívares y poder de compra ganarías cambiando tus USDT hoy mismo?`,
            tema: 'simular_cambio_usdt'
        };
    }

    // =========================================================================
    // MÓDULO 2: CONSULTA POR NOMBRE DE CUENTA ESPECÍFICA
    // =========================================================================
    const cuentaNombrada = snap.cuentasDetalle.find(c => {
        const nomNorm = normalizarTextoAskBot(c.nombre);
        return nomNorm.length >= 3 && txt.includes(nomNorm);
    });

    if (cuentaNombrada && /\b(cuanto|saldo|tengo|queda|como esta|movimientos|cuenta|plata|hay)\b/.test(txt)) {
        const ultTxt = cuentaNombrada.ultimoMov
            ? `${cuentaNombrada.ultimoMov.tipo === 'ingreso' ? '+' : '-'}$${Number(cuentaNombrada.ultimoMov.montoUSD).toFixed(2)} en **${cuentaNombrada.ultimoMov.categoria}** (${cuentaNombrada.ultimoMov.fechaFormateada})`
            : 'Sin movimientos registrados todavía';

        let saldoPrincipalTxt = `$${cuentaNombrada.balUSD.toFixed(2)} USD`;
        if (cuentaNombrada.moneda === 'VES') {
            saldoPrincipalTxt = `**Bs ${cuentaNombrada.balBs.toFixed(2)}** *(≈ $${cuentaNombrada.balUSD.toFixed(2)} BCV | €${cuentaNombrada.eqEUR.toFixed(2)} EUR)*`;
        } else if (cuentaNombrada.moneda === 'USDT') {
            saldoPrincipalTxt = `**${cuentaNombrada.balUSD.toFixed(2)} USDT** *(≈ Bs ${cuentaNombrada.eqBsParalelo.toFixed(2)} a tasa USDT)*`;
        } else {
            saldoPrincipalTxt = `**$${cuentaNombrada.balUSD.toFixed(2)} USD Físico** *(≈ Bs ${cuentaNombrada.balBs.toFixed(2)} BCV)*`;
        }

        return {
            b1: `💳 **Detalle en Vivo de tu cuenta "${cuentaNombrada.nombre}" (${cuentaNombrada.moneda}):**\n• **Saldo disponible:** ${saldoPrincipalTxt}\n• **Estado en carrusel:** ${cuentaNombrada.esActiva ? '🟢 Es tu cuenta activa en pantalla ahora mismo' : '⚪ En carrusel (desliza en Inicio para activarla)'}\n• **Movimientos:** ${cuentaNombrada.cantMovs} en total *(${cuentaNombrada.cantIngresos} ingresos / ${cuentaNombrada.cantGastos} gastos)*\n• **Último movimiento:** ${ultTxt}`,
            b2: `¿Quieres abrir el historial gráfico o calcular cuánto puedes gastar este fin de semana?`,
            tema: 'presupuesto_finde'
        };
    }

    // =========================================================================
    // MÓDULO 10: AUDITORÍA PROFUNDA DE METAS DE AHORRO (Y META ESPECÍFICA)
    // =========================================================================
    const metaNombrada = snap.metasDetalle.find(m => {
        const nomMeta = normalizarTextoAskBot(m.nombre);
        return nomMeta.length >= 3 && txt.includes(nomMeta);
    });

    if (metaNombrada) {
        const cuotaMes = metaNombrada.falta / 30;
        const cuotaSem = metaNombrada.falta / 4;
        return {
            b1: `🎯 **Estado de tu Meta "${metaNombrada.nombre}":**\n• **Ahorrado:** **$${metaNombrada.acum.toFixed(2)}** de **$${metaNombrada.obj.toFixed(2)}** (**${metaNombrada.pct.toFixed(1)}%**)\n• **Te falta por reunir:** **$${metaNombrada.falta.toFixed(2)}** *(≈ Bs ${(metaNombrada.falta * tasaBCV).toFixed(2)} BCV)*\n• **Movimientos de ahorro:** ${metaNombrada.cantMovs} abonos/retiros registrados\n• **Plan para terminarla en 30 días:** Abonar **$${cuotaMes.toFixed(2)}/día** o **$${cuotaSem.toFixed(2)}/semana**.\n\n✨ *Recuerda:* Apenas abones lo que falta y llegue al 100%, A$$IST te felicitará y la dará por cumplida automáticamente.`,
            b2: `¿Quieres que te lleve directo a la pestaña de **Metas** para hacerle un abono ahorita?`,
            tema: 'ir_pestana_metas'
        };
    }

    if (/\b(meta|metas|ahorro|ahorros|ahorrado|objetivo|objetivos|cuantas metas)\b/.test(txt)) {
        if (snap.metasDetalle.length === 0) {
            return {
                b1: `🎯 Ahorita tienes **0 metas de ahorro activas** ${pana}. Crear una meta visual con foto en la pestaña **Metas** es la mejor forma de apartar plata sin gastártela por error.`,
                b2: `¿Quieres que te lleve directo a la pestaña **Metas** para crear la primera?`,
                tema: 'ir_pestana_metas'
            };
        }

        const listaMetas = snap.metasDetalle.map((m, i) => {
            return `${i + 1}. **${m.nombre}:** $${m.acum.toFixed(2)} / $${m.obj.toFixed(2)} (**${m.pct.toFixed(1)}%**) — *Faltan $${m.falta.toFixed(2)}*`;
        }).join('\n');

        return {
            b1: `🎯 **Auditoría de tus ${snap.metasDetalle.length} Metas de Ahorro (${pana}):**\n• **Total ahorrado en conjunto:** **$${snap.totalAhorradoMetas.toFixed(2)}** *(≈ Bs ${(snap.totalAhorradoMetas * tasaBCV).toFixed(2)} BCV)*\n• **Meta global sumada:** $${snap.totalObjetivoMetas.toFixed(2)} (**${snap.pctGlobalMetas.toFixed(1)}% completado**)\n• **Total restante para cumplir todas:** **$${snap.faltaGlobalMetas.toFixed(2)}**\n\n**Desglose individual:**\n${listaMetas}`,
            b2: `¿Quieres que te arme un calendario de cuotas diarias y semanales para completar tus metas más rápido?`,
            tema: 'plan_cuotas_metas'
        };
    }

    // =========================================================================
    // MÓDULO 9: CONTEO Y AUDITORÍA DE CATEGORÍAS INTELIGENTES
    // =========================================================================
    if (/\b(categoria|categorias|cuantas categorias|en que gaste mas|en que se me va la plata|memoria inteligente)\b/.test(txt)) {
        if (categorias.length === 0) {
            return {
                b1: `🏷️ Todavía no has creado categorías personalizadas ${pana}. Puedes crearlas en **Ajustes > Gestionar Categorías** (ej. Comida, Transporte, Rumba, Salud).`,
                b2: null
            };
        }

        const rankingTxt = snap.rankingCatMes.length > 0
            ? snap.rankingCatMes.map(([cat, m], idx) => {
                const peso = snap.gastosMes > 0 ? ((m / snap.gastosMes) * 100).toFixed(1) : '0.0';
                return `${idx + 1}. **${cat}:** $${m.toFixed(2)} *(Bs ${(m * tasaBCV).toFixed(2)})* — **${peso}%** del mes`;
            }).join('\n')
            : '• Sin gastos por categoría este mes.';

        const sinGastoTxt = snap.categoriasSinGastoMes.length > 0
            ? snap.categoriasSinGastoMes.join(', ')
            : 'Has usado todas tus categorías este mes';

        return {
            b1: `🏷️ **Auditoría de tus ${categorias.length} Categorías Personalizadas (${pana}):**\n• **Lista completa:** ${categorias.join(', ')}\n\n📊 **Ranking de Gasto de este Mes (${snap.mesActualPrefix}):**\n${rankingTxt}\n\n✨ **Categorías en $0.00 este mes:** ${sinGastoTxt}`,
            b2: `¿Quieres ver qué moneda recuerda automáticamente la **Memoria Inteligente** de A$$IST para cada categoría?`,
            tema: 'detalle_memoria_categorias'
        };
    }

    // =========================================================================
    // MÓDULOS 11, 12 Y 13: HISTORIAL, TIEMPOS (HOY, AYER, SEMANA, MES), RÉCORDS Y HORMIGA
    // =========================================================================
    if (/\b(gastos hormiga|gasto hormiga|microgastos|fugas de plata)\b/.test(txt)) {
        askbotMemoria.temaPendiente = 'detectar_gastos_hormiga';
        return procesarSeguimientoMemoriaAskBot('si', snap);
    }

    if (/\b(gasto mas caro|gasto mas alto|record de gasto|mayor gasto|mayor ingreso|ultimo movimiento|cuantos movimientos)\b/.test(txt)) {
        const gMax = snap.gastoRecordTotal
            ? `**$${Number(snap.gastoRecordTotal.montoUSD).toFixed(2)}** *(Bs ${(Number(snap.gastoRecordTotal.montoUSD) * tasaBCV).toFixed(2)})* en **${snap.gastoRecordTotal.categoria}** el ${snap.gastoRecordTotal.fechaFormateada}`
            : 'Sin gastos aún';
        const iMax = snap.ingresoRecordTotal
            ? `**+$${Number(snap.ingresoRecordTotal.montoUSD).toFixed(2)}** el ${snap.ingresoRecordTotal.fechaFormateada}`
            : 'Sin ingresos aún';
        const ult = snap.ultimoMovGlobal
            ? `${snap.ultimoMovGlobal.tipo === 'ingreso' ? '+' : '-'}$${Number(snap.ultimoMovGlobal.montoUSD).toFixed(2)} en **${snap.ultimoMovGlobal.categoria}** (${snap.ultimoMovGlobal.fechaFormateada})`
            : 'Ninguno';

        return {
            b1: `🏆 **Récords y Estadísticas de tu Historial (${pana}):**\n• **Total de registros:** **${transacciones.length}** movimientos *(${snap.cantGastosReales} gastos, ${snap.cantIngresosReales} ingresos y ${snap.cantTransferenciasP2P} transferencias P2P)*\n• 🔥 **Gasto más caro de todos:** ${gMax}\n• 💰 **Ingreso más grande:** ${iMax}\n• 🕒 **Último movimiento registrado:** ${ult}`,
            b2: `¿Quieres que te muestre el Top 5 de los gastos más altos de tu historial detallados por cuenta?`,
            tema: 'top_gastos_caros'
        };
    }

    if (/\b(gaste hoy|gastos de hoy|hoy|ayer|esta semana|ultimos 7 dias|mes pasado|este mes|gaste|gastado|gastos|ingresos|movimientos)\b/.test(txt) && !/\b(como borro|como elimino|como registro)\b/.test(txt)) {
        const compMesPasado = snap.gastosMesPasado > 0
            ? (snap.gastosMes > snap.gastosMesPasado
                ? `📈 Llevas **+$${(snap.gastosMes - snap.gastosMesPasado).toFixed(2)} más** gastados que el mes pasado ($${snap.gastosMesPasado.toFixed(2)}).`
                : `📉 Llevas **$${(snap.gastosMesPasado - snap.gastosMes).toFixed(2)} menos** gastados que el mes pasado ($${snap.gastosMesPasado.toFixed(2)}). ¡Bien ahí!`)
            : `📊 Primer mes con registros activos.`;

        const top3Mes = snap.rankingCatMes.slice(0, 3).map(([c, m]) => `• **${c}:** $${m.toFixed(2)} *(Bs ${(m * tasaBCV).toFixed(2)})*`).join('\n') || '• Sin gastos este mes.';

        return {
            b1: `📅 **Reporte de Gastos e Ingresos por Tiempo (${pana}):**\n• **Hoy (${snap.hoyIso}):** Gastos **-$${snap.gastosHoy.toFixed(2)}** | Ingresos **+$${snap.ingresosHoy.toFixed(2)}**\n• **Ayer (${snap.ayerIso}):** Gastos **-$${snap.gastosAyer.toFixed(2)}** | Ingresos **+$${snap.ingresosAyer.toFixed(2)}**\n• **Últimos 7 días:** Gastos **-$${snap.gastosSemana.toFixed(2)}** | Ingresos **+$${snap.ingresosSemana.toFixed(2)}**\n• **Este Mes (${snap.mesActualPrefix}):** Gastos **-$${snap.gastosMes.toFixed(2)}** *(Bs ${(snap.gastosMes * tasaBCV).toFixed(2)})* | Ingresos **+$${snap.ingresosMes.toFixed(2)}**\n\n**Top Categorías del Mes:**\n${top3Mes}\n\n${compMesPasado}`,
            b2: `¿Quieres que proyectemos con cuánto vas a cerrar a fin de mes según tu velocidad de gasto diario?`,
            tema: 'proyeccion_fin_de_mes'
        };
    }

    // =========================================================================
    // MÓDULO 1 Y 15: SALDOS, CUENTAS MULTIDIVISA Y BLINDAJE CONTRA DEVALUACIÓN
    // =========================================================================
    if (/\b(cuantas cuentas|mis cuentas|mi cuenta|cuanto tengo|cuantos bs|cuantos bolos|cuantos bolivares|cuantos dolares|cuantos verdes|cuantos usdt|mi saldo|mis saldos|mi plata|mi dinero|patrimonio|capital|liquidez|disponible)\b/.test(txt)) {
        if (snap.cuentasDetalle.length === 0) {
            return {
                b1: `💳 Todavía no tienes cuentas creadas ${pana}. Para empezar a controlar tus cobres, toca **Ajustes > Gestionar Cuentas** y agrega tu banco en Bs, tu efectivo en USD o tu billetera USDT.`,
                b2: `¿Quieres que te abra de una vez la ventana para crear tu primera cuenta?`,
                tema: 'abrir_modal_cuentas'
            };
        }

        const pideSoloVES = /\b(bs|bolos|bolivar|bolivares|ves|banco)\b/.test(txt) && !/\b(usd|dolar|verdes|usdt|todo|total|cuantas)\b/.test(txt);
        const pideSoloUSDT = /\b(usdt|tether|binance|cripto)\b/.test(txt) && !/\b(bs|bolivares|usd|todo|total|cuantas)\b/.test(txt);
        const pideSoloUSD = /\b(usd|dolar|dolares|verdes|lechugas|efectivo|fisico)\b/.test(txt) && !/\b(bs|bolivares|usdt|todo|total|cuantas)\b/.test(txt);

        if (pideSoloVES) {
            if (snap.cuentasVES.length === 0) {
                return {
                    b1: `🇻🇪 No tienes ninguna cuenta en **Bolívares (VES)** creada ahorita ${pana}. Tienes ${snap.cuentasDetalle.length} cuentas en otras monedas.`,
                    b2: `¿Quieres abrir el gestor de cuentas para crear una cuenta en Bolívares?`,
                    tema: 'abrir_modal_cuentas'
                };
            }
            const lista = snap.cuentasVES.map(c => `• **${c.nombre}:** **Bs ${c.balBs.toFixed(2)}** *(≈ $${c.balUSD.toFixed(2)} BCV | €${c.eqEUR.toFixed(2)} EUR)*`).join('\n');
            return {
                b1: `🇻🇪 **Tus Cuentas en Bolívares (${snap.cuentasVES.length}) — ${pana}:**\n${lista}\n\n💰 **Total en Bolívares:** **Bs ${snap.totalVES_Puro.toFixed(2)}** *(≈ $${snap.totalVES_EquivUSD.toFixed(2)} a tasa BCV)*`,
                b2: `¿Quieres saber cuánto puedes gastar este fin de semana sin quedar corto de Bolívares?`,
                tema: 'presupuesto_finde'
            };
        }

        if (pideSoloUSDT) {
            if (snap.cuentasUSDT.length === 0) {
                return {
                    b1: `🪙 No tienes ninguna cuenta en **USDT** registrada ${pana}.`,
                    b2: `¿Quieres abrir el gestor de cuentas para agregar tu billetera USDT/Binance?`,
                    tema: 'abrir_modal_cuentas'
                };
            }
            const lista = snap.cuentasUSDT.map(c => `• **${c.nombre}:** **${c.balUSD.toFixed(2)} USDT** *(≈ Bs ${c.eqBsParalelo.toFixed(2)} a tasa USDT)*`).join('\n');
            return {
                b1: `🪙 **Tus Cuentas en USDT (${snap.cuentasUSDT.length}) — ${pana}:**\n${lista}\n\n💰 **Total en USDT:** **${snap.totalUSDT_Puro.toFixed(2)} USDT** *(≈ Bs ${(snap.totalUSDT_Puro * tasaParalelo).toFixed(2)} | Rinden como $${((snap.totalUSDT_Puro * tasaParalelo) / tasaBCV).toFixed(2)} en locales a BCV)*`,
                b2: `¿Te simulo cuántos Bolívares recibirías si cambias ahorita el 50% o 100% de tus USDT?`,
                tema: 'simular_cambio_usdt'
            };
        }

        if (pideSoloUSD) {
            if (snap.cuentasUSD.length === 0) {
                return {
                    b1: `💵 No tienes cuentas de **Dólares Físicos (USD)** creadas ${pana}.`,
                    b2: `¿Quieres abrir el gestor de cuentas para crear una de Efectivo USD?`,
                    tema: 'abrir_modal_cuentas'
                };
            }
            const lista = snap.cuentasUSD.map(c => `• **${c.nombre}:** **$${c.balUSD.toFixed(2)} USD** *(≈ Bs ${c.balBs.toFixed(2)} BCV)*`).join('\n');
            return {
                b1: `💵 **Tus Cuentas en Dólares Físicos (${snap.cuentasUSD.length}) — ${pana}:**\n${lista}\n\n💰 **Total USD Físico:** **$${snap.totalUSD_Fisico.toFixed(2)}**`,
                b2: `¿Quieres revisar tu índice de blindaje en moneda dura frente a los Bolívares?`,
                tema: 'comparativa_divisas_vs_bs'
            };
        }

        const desglose = snap.cuentasDetalle.map(c => {
            const marcaActiva = c.esActiva ? ' *(Activa en Inicio)*' : '';
            if (c.moneda === 'VES') return `• 🇻🇪 **${c.nombre} (VES):** Bs ${c.balBs.toFixed(2)} *($${c.balUSD.toFixed(2)} BCV)*${marcaActiva}`;
            if (c.moneda === 'USDT') return `• 🪙 **${c.nombre} (USDT):** ${c.balUSD.toFixed(2)} USDT *(Bs ${c.eqBsParalelo.toFixed(2)})*${marcaActiva}`;
            return `• 💵 **${c.nombre} (${c.moneda}):** $${c.balUSD.toFixed(2)}${marcaActiva}`;
        }).join('\n');

        return {
            b1: `💳 **Estado de tus ${snap.cuentasDetalle.length} Cuentas (${pana}):**\n*(Tienes ${snap.cuentasVES.length} en Bs, ${snap.cuentasUSD.length} en USD y ${snap.cuentasUSDT.length} en USDT)*\n\n${desglose}\n\n💎 **Patrimonio Total Líquido:** **$${snap.totalUSD_Global.toFixed(2)}** *(≈ Bs ${snap.totalBs_BCV.toFixed(2)} a BCV)*\n🛡️ **Protegido en USD/USDT:** ${snap.pctMonedaDura.toFixed(1)}%`,
            b2: `¿Quieres que te diga cuánto puedes gastar este fin de semana sin descapitalizarte, o prefieres simular un cambio de USDT a Bs?`,
            tema: 'presupuesto_finde'
        };
    }

    // =========================================================================
    // MÓDULOS 16, 17, 18 Y 19: GUÍA EXPERTA DE TODAS LAS FUNCIONES DE LA APP
    // =========================================================================
    if (/\b(como transfiero|como transferir|transferencia|cambio p2p|pasar de usdt a bs|pasar de binance|emparejamiento)\b/.test(txt)) {
        return {
            b1: `🔄 **Cómo hacer Transferencias y Cambios P2P en 1 Clic (${pana}):**\n1. En la pestaña **A$$IST (Inicio)**, baja a **Registrar Movimiento**.\n2. Donde dice *Gasto*, cámbialo a **Transferir**.\n3. Elige la cuenta **DESDE (Origen)** y **HACIA (Destino)** (A$$IST empareja automáticamente tus cuentas USDT y VES si tienes una de cada una).\n4. Revisa o edita la **Tasa de Cambio** (por defecto te sugiere la paralela de hoy: **Bs ${tasaParalelo.toFixed(2)}**).\n5. Pon el monto, toca **Registrar** y listo: se descuenta del origen y se suma convertido en el destino simultáneamente.`,
            b2: `¿Quieres que simulemos cuántos Bolívares recibirías hoy si cambias tus USDT actuales?`,
            tema: 'simular_cambio_usdt'
        };
    }

    if (/\b(bloquea monedas|no me deja elegir eur|no sale bs|por que solo sale usd|monedas permitidas)\b/.test(txt)) {
        const nomActiva = snap.cuentaActivaObj ? `${snap.cuentaActivaObj.nombre} (${snap.cuentaActivaObj.moneda})` : 'Ninguna';
        return {
            b1: `🧠 **Reglas del Bloqueo Inteligente de Monedas en A$$IST:**\nPara evitar errores contables, el selector de moneda cambia según la tarjeta de cuenta que tengas activa en el carrusel superior:\n• 💵 **Cuenta en USD Físico:** Solo permite registrar en **USD**.\n• 🪙 **Cuenta en USDT:** Permite registrar en **USD** y **VES**.\n• 🇻🇪 **Cuenta en Bolívares (VES):** Permite las 3 monedas (**USD**, **VES** y **EUR**).\n\n📌 *Ahora mismo tienes activa en pantalla:* **${nomActiva}**. Desliza la tarjeta superior hacia los lados para cambiar de cuenta.`,
            b2: null
        };
    }

    if (/\b(como borro|como elimino|borrar un gasto|eliminar movimiento|swipe|me equivoque en un gasto)\b/.test(txt)) {
        return {
            b1: `🗑️ **Cómo Borrar Movimientos o Cuentas (${pana}):**\n• **Para borrar un movimiento del Historial:** Toca **📜 Ver Historial y Gráficos** en el Inicio, busca el movimiento y **deslízalo con el dedo hacia la izquierda (Swipe)** para tocar el icono rojo 🗑️. *(Si era un abono o retiro de una meta, A$$IST revierte el dinero en tu meta automáticamente)*.\n• **Para borrar o reordenar Cuentas/Categorías:** Ve a **Ajustes > Gestionar Cuentas** o **Categorías** y usa las flechas **▲ / ▼** para ordenarlas o el botón 🗑️ para eliminarlas.`,
            b2: `¿Quieres que te abra el **Historial** ahorita mismo por si necesitas revisar o borrar algún movimiento?`,
            tema: 'abrir_modal_historial'
        };
    }

    if (/\b(pin|contraseña|bloqueo|modo panico|ocultar montos|asteriscos|liquid glass|tema|color|acento|apariencia|oscuro|claro)\b/.test(txt)) {
        return {
            b1: `🎨 **Estado de Privacidad y Apariencia de tu A$$IST (${pana}):**\n• 🔒 **PIN de 4 dígitos:** Actualmente está **${appPin ? 'ACTIVO ✅ (se auto-bloquea tras 3 min sin tocar la pantalla)' : 'DESACTIVADO ⚠️'}**. Puedes cambiarlo en **Ajustes > Configurar PIN**.\n• 🕵️‍♂️ **Modo Pánico (\`********\`):** Ahora mismo está **${censurado ? 'ENCENDIDO 🙈' : 'APAGADO 👁️'}**. Actívalo dando **doble toque rápido** en tu tarjeta de balance o tocando el icono del ojo.\n• ✨ **Modo Visual actual:** **${snap.modoVisual.toUpperCase()}** *(puedes elegir entre Oscuro, Claro o Liquid Glass Beta en Ajustes)*.\n• 🎨 **Color de Acento actual:** **${snap.colorAcento}** *(tienes 20 colores deslizables en Ajustes)*.`,
            b2: `¿Quieres que revise también el estado de tu respaldo en la nube de Supabase?`,
            tema: 'estado_seguridad_nube'
        };
    }

    if (/\b(nube|supabase|sincronizar|sincronizado|backup|copia de seguridad|exportar|importar|json|perfil|avatar|foto)\b/.test(txt)) {
        const txtNube = usuarioActual
            ? `Conectado con **${usuarioActual.email}** (${snap.pendienteSync ? 'Con cambios pendientes por subir apenas vuelva la señal' : '100% Sincronizado ☁️'})`
            : `En **Modo Solo Local** (puedes conectar tu correo gratis tocando tu foto de perfil arriba a la derecha o en Ajustes)`;

        return {
            b1: `☁️ **Estado de tu Perfil, Nube y Copias de Seguridad (${pana}):**\n• 👤 **Usuario:** ${userNombre || 'Sin nombre configurado'} ${userAvatar ? '(Con foto de perfil personalizada 📸)' : '(Con logo por defecto)'}\n• 🔄 **Sincronización Nube:** ${txtNube}\n• 📥 **Backups Manuales (.json):** En **Ajustes > Exportar Datos** puedes descargar un archivo \`.json\` con todas tus cuentas, metas, historial y perfil para guardarlo o pasarlo a otro dispositivo.`,
            b2: null
        };
    }

    // =========================================================================
    // CATEGORÍAS DEL SISTEMA ANTI-FUERA DE TEMA CON HUMOR DE PANA VENEZOLANO
    // =========================================================================

    // 1. Saludos, "¿Qué más?", "Qué hubo", "Hablame"
    if (/^(hola|buenas|que mas|q mas|que hubo|epale|hablame|como estas|todo bien|activo|buenos dias|buenas tardes|buenas noches|hey|saludos)\b/.test(txt)) {
        return {
            b1: elegirAzar([
                `¡Qué más ${pana}! 🤜🤛 Todo fino por aquí y cuidando tus cobres. Ahorita mismo tienes un patrimonio total de **$${snap.totalUSD_Global.toFixed(2)}** (unos **Bs ${snap.totalBs_BCV.toFixed(2)}** a BCV) repartidos en **${snap.cuentasDetalle.length} cuentas**, y el BCV hoy está en **Bs ${tasaBCV.toFixed(2)}** (USDT en **Bs ${tasaParalelo.toFixed(2)}**).`,
                `¡Activo ${pana}! 🚀 Aquí ando con la calculadora en la mano. Tienes **$${snap.totalUSD_Global.toFixed(2)}** disponibles en tus cuentas y una brecha cambiaria hoy del **${snap.brechaPct.toFixed(2)}%**.`
            ]),
            b2: `¿Qué hacemos hoy ${apelativoPana(false)}? ¿Calculamos cuánto puedes gastar este fin de semana sin descapitalizarte o revisamos los gastos del mes?`,
            tema: 'presupuesto_finde'
        };
    }

    // 2. Identidad del Bot ("¿Quién eres?", "¿Eres una IA?", "¿Gastas megas?")
    if (/\b(quien eres|que eres|eres una ia|eres chatgpt|eres gemini|como funcionas|gastas internet|gastas megas|quien te creo|eres un robot|tu nombre)\b/.test(txt)) {
        return {
            b1: elegirAzar([
                `Soy **AskBot** 🤖🇻🇪, tu copiloto financiero y pana de confianza dentro de **A$$IST**. Lo mejor de mí es que vivo **100% dentro de tu teléfono**: no gasto tus megas, no tengo límites de uso, respondo en milisegundos hasta en modo avión y conozco al centavo tus **${snap.cuentasDetalle.length} cuentas**, tus **${snap.metasDetalle.length} metas** y tus **${transacciones.length} movimientos**.`,
                `¡Hablando claro ${pana}! Soy el cerebro financiero nativo de **A$$IST**. No cobro suscripción ni dependo de servidores externos lentos: saco todas tus cuentas en tiempo real directamente en tu dispositivo.`
            ]),
            b2: `¿Quieres que te haga una radiografía completa de tu plata o que calculemos tu presupuesto para el fin de semana?`,
            tema: 'presupuesto_finde'
        };
    }

    // 3. Dominar el Mundo / Poder / Política / Illuminati / Filosofía
    if (/\b(dominar el mundo|conquistar el mundo|presidente|politica|gobierno|illuminati|matrix|sentido de la vida|universo|alien|ovnis)\b/.test(txt)) {
        return {
            b1: elegirAzar([
                `Jajaja cálmate Cerebro 🤣🌍. ${pana.charAt(0).toUpperCase() + pana.slice(1)}, pa' dominar el mundo primero tenemos que dominar esos gastos del mes y no quedar pelando a mitad de quincena. Ahorita tienes **$${snap.totalUSD_Global.toFixed(2)}** de capital para empezar tu imperio.`,
                `¡Epa! Te me pusiste filosófico mano 😂. De dominar el mundo no sé, pero de dominar la brecha entre el BCV (**Bs ${tasaBCV.toFixed(2)}**) y el USDT (**Bs ${tasaParalelo.toFixed(2)}**) sí soy experto.`
            ]),
            b2: `¿Revisamos primero cómo aprovechar tus USDT frente al BCV hoy antes de conquistar el planeta?`,
            tema: 'simular_cambio_usdt'
        };
    }

    // 4. Amor / Pareja / Novia / Ex / Citas / Despecho
    if (/\b(amor|novia|novio|pareja|mi ex|me dejo|no me quiere|casarme|cita|enamorado|despecho|corazon|infiel|cuernos)\b/.test(txt)) {
        return {
            b1: elegirAzar([
                `De amores sí te la debo ${pana} 🤣💔. El único corazón que yo cuido es el de tu billetera pa' que no sufra a fin de mes. Eso sí, si vas a salir a invitar hoy, tienes **$${snap.totalUSD_Global.toFixed(2)}** disponibles.`,
                `¡Mano, el amor pasa pero los cobres en USDT se quedan! 😂🪙 No te puedo aconsejar con tu ex, pero sí te puedo decir cuánto puedes gastar en una salida este fin de semana sin tocar tus ahorros.`
            ]),
            b2: `¿Quieres que te saque el presupuesto exacto de cuánto puedes gastar en una salida hoy sin quedar limpio?`,
            tema: 'presupuesto_finde'
        };
    }

    // 5. Comida / Hambre / Arepas / Empanadas / Tequeños / Recetas / Birras
    if (/\b(arepa|arepas|empanada|empanadas|tequeno|tequenos|cachapa|pabellon|hambre|receta|cocinar|hamburguesa|sushi|birra|birras|cerveza|curda|que como hoy)\b/.test(txt)) {
        return {
            b1: elegirAzar([
                `¡Epa! Me diste hambre ${pana} 🫓🧀. Yo no sé amasar arepas, yo amaso presupuestos. Pero hablando de comida: revisé tu historial y este mes llevas **$${snap.gastoComidaMesUSD.toFixed(2)}** *(≈ Bs ${(snap.gastoComidaMesUSD * tasaBCV).toFixed(2)})* gastados en categorías de comida/mercado.`,
                `¡Unas empanaditas con malta o unas birras frías nunca fallan mano! 🥟🍺 Recetas de cocina no tengo en el sistema, pero si vas a pedir delivery o salir hoy, te calculo de una vez cuánto puedes gastar.`
            ]),
            b2: `¿Quieres que te calcule cuánto puedes gastar en comida o salidas este fin de semana sin descuadrarte?`,
            tema: 'presupuesto_finde'
        };
    }

    // 6. Fútbol / Deportes / Messi / Cristiano / Vinotinto / Béisbol (LVBP)
    if (/\b(futbol|messi|cristiano|cr7|madrid|barcelona|barca|champions|vinotinto|mundial|beisbol|leones|magallanes|tiburones|nba)\b/.test(txt)) {
        return {
            b1: elegirAzar([
                `¡Mano, el verdadero golazo de chilena es llevar tus **${snap.metasDetalle.length} metas de ahorro** al 100%! ⚽🏆 De deportes no llevo estadísticas, pero en la liga de tus finanzas tienes **$${snap.totalUSD_Global.toFixed(2)}** en cancha.`,
                `¡Aquí somos más de la Vinotinto y de tener las cuentas en verde ${pana}! 🇻🇪⚾ No te sé el resultado del juego, pero te tengo el marcador en vivo del día: **BCV Bs ${tasaBCV.toFixed(2)}** vs **USDT Bs ${tasaParalelo.toFixed(2)}**.`
            ]),
            b2: `¿Vemos el plan de cuotas para meterle un golazo a tus metas de ahorro?`,
            tema: 'plan_cuotas_metas'
        };
    }

    // 7. Tareas Escolares / Universidad / Programación / Matemáticas Ajenas
    if (/\b(hazme la tarea|tesis|ensayo|examen|universidad|colegio|codigo en python|historia de|quien descubrio|capital de|traduce|ingles|ecuacion|fisica|quimica)\b/.test(txt)) {
        return {
            b1: elegirAzar([
                `¡Epa ${pana}, te estás confundiendo de chat! 🤣📚 Yo no hago tareas de la universidad, yo te hago la tarea de que la plata te rinda en Venezuela. Las únicas matemáticas que saco aquí son las de tus verdes, bolos y USDT.`,
                `Si el examen es sobre cuánto tienes en tus cuentas, cuántas comisiones de Pago Móvil has pagado o cómo está la brecha cambiaria hoy, ahí sí sacamos 20 puntos ${pana} 🎓💸.`
            ]),
            b2: `¿Quieres que revisemos cuántas comisiones bancarias has pagado en tu historial?`,
            tema: 'auditoria_comisiones'
        };
    }

    // 8. Chistes / Memes / "Estoy Aburrido" / Locuras Random
    if (/\b(chiste|cuentame un chiste|hazme reir|aburrido|meme|cuentame un cuento|canta|poema|adivinanza)\b/.test(txt)) {
        return {
            b1: elegirAzar([
                `¿Quieres un chiste corto ${pana}? Pagar en Dólares físicos en un local que cobra a BCV cuando la brecha con el USDT está en **${snap.brechaPct.toFixed(2)}%** 🤣📉. ¡Eso no es chiste, eso da dolor de bolsillo!`,
                `Había una vez una quincena que duró 30 días completos... Fin del chiste ${pana} 😂💸. Pa' que la tuya sí dure, aquí tienes **$${snap.totalUSD_Global.toFixed(2)}** bien controlados en A$$IST.`,
                `El mejor chiste bancario: hacer 10 Pagos Móviles separados de Bs 20 y regalarle Bs 14 de comisión mínima al banco en cada uno 🤣🏦.`
            ]),
            b2: `Hablando de eso, ¿quieres que audite cuánto dinero se te ha ido en comisiones bancarias en tu historial?`,
            tema: 'auditoria_comisiones'
        };
    }

    // 9. Clima / Hora / Horóscopo / Lotería / Hacerse Rico Rápido
    if (/\b(clima|va a llover|frio|calor|que hora es|horoscopo|signo|tauro|leo|escorpio|loteria|kino|animalitos|hacerme rico|millonario)\b/.test(txt)) {
        return {
            b1: elegirAzar([
                `No tengo bola de cristal ni datos de los animalitos ${pana} 🔮🤣, pero leyendo los astros de tu billetera veo que tienes **$${snap.totalUSD_Global.toFixed(2)}** en total y que si cuidas tus gastos hormiga vas a cerrar el mes fino.`,
                `De si va a llover afuera no tengo idea mano 🌦️, pero el pronóstico de tus finanzas dice que hoy el BCV está en **Bs ${tasaBCV.toFixed(2)}** y tienes **${snap.metasDetalle.length} metas** esperando lluvia de abonos.`
            ]),
            b2: `¿Quieres que proyectemos cómo vas a cerrar este mes según tu ritmo de gasto actual?`,
            tema: 'proyeccion_fin_de_mes'
        };
    }

    // 10. Chalaneo Venezolano / Quejas en Broma / Groserías Suaves
    if (/\b(que bolas|eres loco|nojoda|marico|coño|verga|arrecho|maldito|no sirves|tonto|bruto|pajuo|gafo)\b/.test(txt)) {
        return {
            b1: elegirAzar([
                `¡Epa, suave ${pana}, cero violencia con el bot que yo soy el que te cuida los cobres! 🤣🛡️ Respira hondo mano, que aquí estamos es pa' cuadrar tus cuentas y que no te agarre la inflación mal parado.`,
                `¡Jajaja tranquilo ${pana}! 😂 Yo solo soy tu copiloto que saca las cuentas claritas al centavo. Dime qué número quieres que revisemos hoy.`
            ]),
            b2: `¿Revisamos tus gastos hormiga del mes en paz o calculamos tu presupuesto para el fin de semana?`,
            tema: 'detectar_gastos_hormiga'
        };
    }

    // 11. Agradecimientos y Elogios ("Gracias pana", "Fino", "Eres un crack")
    if (/\b(gracias|muchas gracias|fino|brutal|excelente|eres el mejor|crack|calidad|buenisimo|te pasaste|gracias pana|gracias mano)\b/.test(txt)) {
        return {
            b1: elegirAzar([
                `¡Pa' eso estamos ${pana}! 🤜🤛 Activo 24/7 con o sin internet pa' que tengas tus cuentas claritas al centavo.`,
                `¡De nada hermano! Un placer ayudarte a mantener ese capital de **$${snap.totalUSD_Global.toFixed(2)}** bien administrado en **A$$IST** 💪✨.`
            ]),
            b2: `¿Necesitas que revisemos el blindaje de tus divisas vs Bolívares o alguna otra cuenta?`,
            tema: 'comparativa_divisas_vs_bs'
        };
    }

    // 12. Despedidas ("Chao", "Nos vemos", "Me voy a dormir")
    if (/\b(chao|adios|nos vemos|hasta luego|hasta manana|me voy|dormir|descansa|hablamos)\b/.test(txt)) {
        return {
            b1: elegirAzar([
                `¡Hablamos ${pana}! 👋 Cuida esos cobres, recuerda registrar cualquier gasto que hagas en la calle y no olvides el doble toque en tu balance si andas en público pa' activar el **Modo Pánico** 🕵️‍♂️.`,
                `¡Fino hermano, nos vemos! Aquí quedan tus cuentas resguardadas al 100%. ¡Que te rinda la plata hoy! 🚀`
            ]),
            b2: null
        };
    }

    // 13. Miedo a Perder Datos / "¿Se borra si apago el teléfono?" / Seguridad
    if (/\b(se me borra|perder mis datos|si cambio de telefono|es seguro|privacidad|quien ve mis datos|sin internet funciona|modo avion)\b/.test(txt)) {
        const estadoSync = usuarioActual
            ? `Estás conectado con **${usuarioActual.email}**, así que todo se respalda automáticamente en la nube.`
            : `Actualmente estás en **Modo Solo Local**; si quieres respaldo en la nube, conecta tu correo en **Mi Perfil**.`;
        return {
            b1: `¡Cero estrés ${pana}, tus datos están blindados por partida triple! 🔒:\n1. **Memoria Local-First:** Todo se guarda en el acto dentro de tu iPhone aunque estés en modo avión o sin señal.\n2. **Nube Supabase:** ${estadoSync}\n3. **Backup Manual:** En **Ajustes > Exportar Datos** puedes descargar tu archivo \`.json\` cuando quieras.`,
            b2: `¿Quieres que revise el estado exacto de tu sincronización, PIN y Modo Pánico ahora mismo?`,
            tema: 'estado_seguridad_nube'
        };
    }

    // 14. Desahogo Financiero ("Estoy pelando bola", "Ando limpio", "No tengo plata")
    if (/\b(estoy pelando|pelando bola|ando limpio|estoy limpio|no tengo plata|no tengo rial|estoy quebrado|no me alcanza|mamando|sin un bolivar|ando corto)\b/.test(txt)) {
        return {
            b1: elegirAzar([
                `Tranquilo ${pana}, que de peores hemos salido 💪🇻🇪. Vamos a ver los números con cabeza fría: ahorita mismo te quedan **$${snap.totalUSD_Global.toFixed(2)}** en total *(unos **Bs ${snap.totalBs_BCV.toFixed(2)}** a BCV)*. La clave ahorita es cero gastos hormiga, pagar con Tarjeta de Débito en vez de Pago Móvil pa' ahorrar esos Bs 14 de comisión y estirar cada bolívar.`,
                `¡Ánimo hermano! Cuando uno anda corto es cuando más sirve **A$$IST**. Tienes **$${snap.totalUSD_Global.toFixed(2)}** disponibles entre tus cuentas; vamos a administrarlos con pinzas de aquí a fin de mes.`
            ]),
            b2: `¿Quieres que detecte cuáles han sido tus gastos hormiga este mes para cortarlos de raíz?`,
            tema: 'detectar_gastos_hormiga'
        };
    }

    // =========================================================================
    // MÓDULO 14: BUSCADOR CONVERSACIONAL POR PALABRA CLAVE EN HISTORIAL
    // =========================================================================
    const palabrasIgnorar = new Set(['como', 'cuanto', 'cuantos', 'donde', 'cuando', 'quien', 'para', 'este', 'esta', 'tengo', 'gaste', 'gastado', 'historial', 'movimiento', 'plata', 'dinero']);
    const tokens = txt.split(' ').filter(w => w.length >= 4 && !palabrasIgnorar.has(w));
    if (tokens.length > 0 && /\b(gaste|gastado|he gastado|buscar|busca|movimientos de|gastos de|en)\b/.test(txt)) {
        const coincidencias = transacciones.filter(t => {
            if (t.categoria === 'Transferencia / P2P') return false;
            const catN = normalizarTextoAskBot(t.categoria);
            const notaN = normalizarTextoAskBot(t.nota);
            return tokens.some(tok => catN.includes(tok) || notaN.includes(tok));
        });

        if (coincidencias.length > 0) {
            const sumaUSD = coincidencias.reduce((acc, el) => acc + (Number(el.montoUSD) || 0), 0);
            const ultimas3 = coincidencias.slice(-4).reverse().map(t => `• **${t.categoria}:** $${Number(t.montoUSD).toFixed(2)} ${t.nota ? `*(${t.nota})*` : ''} — ${t.fechaFormateada}`).join('\n');
            return {
                b1: `🔍 **Resultados encontrados en tu Historial (${coincidencias.length} movimientos):**\n• **Total acumulado:** **$${sumaUSD.toFixed(2)}** *(≈ Bs ${(sumaUSD * tasaBCV).toFixed(2)} BCV)*\n\n**Últimos registros:**\n${ultimas3}`,
                b2: `¿Quieres que abra el **Historial completo** para filtrarlos en pantalla?`,
                tema: 'abrir_modal_historial'
            };
        }
    }

    // =========================================================================
    // 15. FALLBACK INTELIGENTE UNIVERSAL (PARA CUALQUIER OTRA COSA DEL UNIVERSO)
    // =========================================================================
    return {
        b1: elegirAzar([
            `Jajaja te me fuiste por la tangente ${pana} 🤣. Ese tema no cotiza en el BCV ni sale en **A$$IST**, ¡pero en lo que respecta a tu plata y a la app me las sé todas!\n\nAhorita mismo tienes **$${snap.totalUSD_Global.toFixed(2)}** *(Bs ${snap.totalBs_BCV.toFixed(2)} BCV)* en tus **${snap.cuentasDetalle.length} cuentas** y me puedes preguntar al instante cosas como:\n• 💰 **Saldos:** *«¿Cuántos Bs o USDT tengo?»* o el nombre de una cuenta\n• 🛒 **Compras:** *«¿Me puedo comprar algo de $35?»* o *«¿Con cuánto salgo el finde?»*\n• 🇻🇪 **Tasas y Comisiones:** *«Estrategia BCV vs USDT»* o *«Comisión de 3000 Bs»*\n• 📊 **Auditoría:** *«¿Cuántas cuentas, categorías y metas tengo?»* o *«Gastos hormiga»*`,
            `¡Epa hermano! Creo que te estás confundiendo de tema 😂. Yo soy tu pana financiero exclusivo de **A$$IST**. Con tus **$${snap.totalUSD_Global.toFixed(2)}** disponibles hoy, dime qué sacamos:\n• 📊 *«Radiografía de mi plata»*\n• 💸 *«¿Cuánto puedo gastar hoy?»*\n• 🪙 *«Pasa 50 USDT a Bolívares»*\n• 🎯 *«¿Cómo voy en mis metas de ahorro?»*`
        ]),
        b2: `¿Quieres que empecemos calculando cuánto puedes gastar este fin de semana sin quedar pelando?`,
        tema: 'presupuesto_finde'
    };
}

function enviarSugerenciaAskBot(texto) {
    const input = document.getElementById('askbot-input');
    if (!input) return;
    input.value = texto;
    enviarMensajeAskBot();
}

async function enviarMensajeAskBot() {
    if (askbotEsperandoRespuesta) return;

    const input = document.getElementById('askbot-input');
    const btnSend = document.getElementById('btn-askbot-send');
    if (!input) return;

    const mensaje = input.value.trim();
    if (!mensaje) return;

    input.value = '';
    agregarBurbujaAskBot(mensaje, 'user');

    askbotEsperandoRespuesta = true;
    if (btnSend) btnSend.disabled = true;
    mostrarIndicadorEscribiendoAskBot();

    const resultado = analizarMensajeAskBotPana(mensaje);

    setTimeout(() => {
        quitarIndicadorEscribiendoAskBot();
        agregarBurbujaAskBot(resultado.b1, 'bot');

        if (typeof resultado.accion === 'function') {
            setTimeout(() => {
                try { resultado.accion(); } catch (e) { console.error(e); }
            }, 350);
        }

        if (resultado.tema) {
            askbotMemoria = {
                temaPendiente: resultado.tema,
                datos: resultado.datos || {}
            };
        }

        if (resultado.b2) {
            setTimeout(() => {
                mostrarIndicadorEscribiendoAskBot();
                setTimeout(() => {
                    quitarIndicadorEscribiendoAskBot();
                    agregarBurbujaAskBot(resultado.b2, 'bot');
                    askbotEsperandoRespuesta = false;
                    if (btnSend) btnSend.disabled = false;
                }, 280);
            }, 420);
        } else {
            askbotEsperandoRespuesta = false;
            if (btnSend) btnSend.disabled = false;
        }
    }, 180);
}

// ================= CEREBRO INTELIGENTE DE TASAS =================
function procesarHistorial(key, currentValor, currentFecha) {
    let history = JSON.parse(localStorage.getItem(`history_${key}`));
    const hoy = new Date().toDateString();
    if (!history) history = { prev: currentValor, last: currentValor, date: hoy };
    if (history.date !== hoy) { history.prev = history.last; history.date = hoy; }
    if (currentValor > 0) history.last = currentValor; 
    localStorage.setItem(`history_${key}`, JSON.stringify(history));
    return { valor: history.last, previo: history.prev, fecha: currentFecha };
}

async function obtenerTasas() {
    try {
        const [resBCV, resEUR, resParalelo] = await Promise.all([
            fetch('https://ve.dolarapi.com/v1/dolares/oficial'),
            fetch('https://ve.dolarapi.com/v1/euros/oficial'),
            fetch('https://ve.dolarapi.com/v1/dolares/paralelo')
        ]);
        const [dataBCV, dataEUR, dataParalelo] = await Promise.all([ resBCV.json(), resEUR.json(), resParalelo.json() ]);

        tasasData.BCV = procesarHistorial('BCV', dataBCV.promedio, dataBCV.fechaActualizacion);
        tasasData.EUR = procesarHistorial('EUR', dataEUR.promedio, dataEUR.fechaActualizacion);
        tasasData.USDT = procesarHistorial('USDT', dataParalelo.promedio, dataEUR.fechaActualizacion);
        tasasData.Custom.fecha = new Date().toISOString();

        tasaBCV = tasasData.BCV.valor; tasaEUR = tasasData.EUR.valor; tasaParalelo = tasasData.USDT.valor;

        const setVariacionHome = (id, dataObj) => {
            const el = document.getElementById(id);
            const diffAbs = dataObj.valor - dataObj.previo;
            const pct = dataObj.previo ? ((diffAbs / dataObj.previo) * 100).toFixed(2) : "0.00";
            if (diffAbs > 0) { el.innerText = `+${pct}%`; el.className = 'tasa-variacion var-positiva'; } 
            else if (diffAbs < 0) { el.innerText = `${pct}%`; el.className = 'tasa-variacion var-negativa'; } 
            else { el.innerText = `0.00%`; el.className = 'tasa-variacion var-neutra'; }
        };

        setVariacionHome('var-bcv', tasasData.BCV); setVariacionHome('var-eur', tasasData.EUR); setVariacionHome('var-usdt', tasasData.USDT);
        document.getElementById('val-bcv').innerText = `Bs ${tasaBCV.toFixed(2)}`;
        document.getElementById('val-eur').innerText = `Bs ${tasaEUR.toFixed(2)}`;
        document.getElementById('val-usdt').innerText = `Bs ${tasaParalelo.toFixed(2)}`;
        
        if (dataBCV.fechaActualizacion) {
            const f = new Date(dataBCV.fechaActualizacion);
            document.getElementById('fecha-tasas').innerText = `🗓️ ${f.toLocaleString('es-VE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
        }

        actualizarInfoCalculadora(calcModoTasa);
        if(calcModoTasa !== 'Custom') document.getElementById('input-tasa-activa').value = tasasData[calcModoTasa].valor.toFixed(2);
        recalcularDesdeTasa(); 
    } catch (error) { console.error("Error de conexión al obtener tasas", error); document.getElementById('fecha-tasas').innerText = `⚠️ Error de conexión`; }
}

async function actualizarTasasManual() {
    const btn = document.getElementById('btn-refresh-tasas');
    btn.classList.add('spin'); await obtenerTasas(); actualizarInterfaz();
    setTimeout(() => { btn.classList.remove('spin'); }, 1000); 
}

// ================= DASHBOARD Y SLIDER =================
function renderizarSliderCuentas() {
    const slider = document.getElementById('slider-cuentas');
    const dots = document.getElementById('slider-dots');
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
            const eqEUR = (balanceUSD * tasaBCV) / tasaEUR; // Convierte tus Bs a Euros
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

    // Lógica estricta de fecha local
    const valFecha = document.getElementById('val-fecha').value; 
    const dateObj = valFecha ? new Date(valFecha + "T00:00:00") : new Date();
    const isoLocal = getLocalYYYYMMDD(dateObj);
    const mesesArr = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const fechaFormateada = `${dateObj.getDate()} ${mesesArr[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

    // ==========================================
    // LÓGICA DE TRANSFERENCIA ↔️ P2P EN UN CLIC
    // ==========================================
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

        // 1. Movimiento de Salida (Gasto en el Origen)
        let montoUSD_Origen = monto;
        if (cOrigen.moneda === 'VES') montoUSD_Origen = monto / tasaBCV;
        
        const notaOr = nota ? `Hacia ${cDestino.nombre} - ${nota}` : `Transferencia hacia ${cDestino.nombre}`;
        transacciones.push({
            id: dateObj.getTime() + Math.random(), 
            cuentaId: idO, montoUSD: montoUSD_Origen, tipo: 'gasto', categoria: 'Transferencia / P2P',
            nota: cOrigen.moneda !== cDestino.moneda ? `${notaOr} @ Tasa: ${tasaTransf}` : notaOr,
            monedaInputOriginal: cOrigen.moneda, fechaFormateada: fechaFormateada, fecha: dateObj, fechaIsoLocal: isoLocal
        });

        // 2. Movimiento de Entrada (Ingreso en el Destino)
        let montoUSD_Destino = montoRecibir;
        if (cDestino.moneda === 'VES') montoUSD_Destino = montoRecibir / tasaBCV;

        const notaDes = nota ? `Desde ${cOrigen.nombre} - ${nota}` : `Transferencia desde ${cOrigen.nombre}`;
        transacciones.push({
            id: dateObj.getTime() + Math.random() + 1, // +1 para no chocar IDs
            cuentaId: idD, montoUSD: montoUSD_Destino, tipo: 'ingreso', categoria: 'Transferencia / P2P',
            nota: cOrigen.moneda !== cDestino.moneda ? `${notaDes} @ Tasa: ${tasaTransf}` : notaDes,
            monedaInputOriginal: cDestino.moneda, fechaFormateada: fechaFormateada, fecha: dateObj, fechaIsoLocal: isoLocal
        });

        // Guardar todo, limpiar y salir
        transacciones.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        guardarYActualizarGestion();
        document.getElementById('monto').value = ''; document.getElementById('val-nota').value = '';
        document.getElementById('val-fecha').value = getLocalYYYYMMDD();
        document.getElementById('input-transf-tasa').value = '';
        document.getElementById('lbl-transf-recibiras').innerText = '0.00';
        return; // ¡Corta la función aquí porque ya hicimos todo el trabajo!
    }
    // ==========================================

    let montoTotalOperacion = monto;
    let montoComisionVES = 0;

    // Calcular Comisiones si es gasto en Bolívares
    const boxComision = document.getElementById('box-comision-ves');
    if (tipo === 'gasto' && monedaInput === 'VES' && boxComision && !boxComision.classList.contains('oculto')) {
        const tipoComision = document.getElementById('sel-tipo-comision').value;
        
        if (tipoComision === 'p2p') {
            montoComisionVES = Math.max(14.00, monto * 0.003);
        } else if (tipoComision === 'p2c') {
            montoComisionVES = Math.max(14.00, monto * 0.015);
        } else if (tipoComision === 'manual') {
            montoComisionVES = parseFloat(document.getElementById('input-comision-manual').value) || 0;
        }
        montoTotalOperacion += montoComisionVES;
    }

    let montoUSD = montoTotalOperacion;
    if (monedaInput === 'VES') {
        montoUSD = montoTotalOperacion / tasaBCV;
    } else if (monedaInput === 'EUR') {
        montoUSD = (montoTotalOperacion * tasaEUR) / tasaBCV;
    }

    let notaFinal = nota;
    if (montoComisionVES > 0) {
        const detalle = `Comisión: Bs ${montoComisionVES.toFixed(2)}`;
        notaFinal = notaFinal ? `${notaFinal} (${detalle})` : detalle;
    }

    const transaccion = {
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
    };
    
    transacciones.push(transaccion);
    transacciones.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    guardarYActualizarGestion();
    
    document.getElementById('monto').value = ''; document.getElementById('val-categoria').value = ''; document.getElementById('val-nota').value = '';
    document.getElementById('val-fecha').value = getLocalYYYYMMDD();
    
    // Reiniciar selector de comisiones
    const selComision = document.getElementById('sel-tipo-comision');
    if(selComision) { selComision.value = 'tarjeta'; toggleComisionManual(); }
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

function actualizarListaTransacciones() {
    const lista = document.getElementById('lista-transacciones');
    lista.innerHTML = ''; 
    if(!cuentaActivaId) return;

    const query = document.getElementById('buscar-historial') ? document.getElementById('buscar-historial').value.toLowerCase() : "";
    const fechaFiltro = document.getElementById('filtro-fecha') ? document.getElementById('filtro-fecha').value : "";

    let transCuenta = transacciones.filter(t => t.cuentaId == cuentaActivaId).slice().reverse();
    
    transCuenta = transCuenta.filter(t => {
        const matchSearch = t.categoria.toLowerCase().includes(query) || (t.nota && t.nota.toLowerCase().includes(query));
        let matchDate = true;
        
        if(fechaFiltro) {
            const fechaT = t.fecha ? new Date(t.fecha) : new Date(t.id);
            const isoLocal = t.fechaIsoLocal || getLocalYYYYMMDD(fechaT);
            matchDate = (isoLocal === fechaFiltro);
        }
        return matchSearch && matchDate;
    });

    if (transCuenta.length === 0) {
        lista.innerHTML = `<p style="text-align:center; padding: 20px; color: var(--text-secondary); font-size: 14px;">No se encontraron movimientos.</p>`;
    } else {
        transCuenta.forEach((t, index) => {
            const claseColor = t.tipo === 'ingreso' ? 'monto-ingreso' : 'monto-gasto';
            const signo = t.tipo === 'ingreso' ? '+' : '-';
            const animDelay = index * 0.05; 
            
            const montoTexto = formatearMontoCensurado(`${signo}$${t.montoUSD.toFixed(2)}`, false);
            const htmlNota = t.nota ? `<div style="font-size: 11px; color: var(--text-secondary); margin-top:2px;">📝 ${t.nota}</div>` : '';
            
            lista.innerHTML += `
                <li class="transaccion-item swipe-container" style="animation: slideInRight 0.3s var(--ios-spring) ${animDelay}s both;">
                    <div class="swipe-content" ontouchstart="handleSwipeStart(event, this)" ontouchmove="handleSwipeMove(event, this)" ontouchend="handleSwipeEnd(event, this)">
                        <div class="trans-izq">
                            <strong>${t.categoria}</strong>
                            <small>${t.fechaFormateada}</small>
                            ${htmlNota}
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span class="monto-val ${claseColor}">${montoTexto}</span>
                        </div>
                    </div>
                    <div class="swipe-action" onclick="eliminarTransaccion(${t.id})">
                        🗑️
                    </div>
                </li>
            `;
        });
    }
    
    renderizarGrafico(transCuenta); 
}

function eliminarTransaccion(id) {
    const tIndex = transacciones.findIndex(t => t.id === id);
    if (tIndex === -1) return;
    const t = transacciones[tIndex];

    // Revertir el dinero en la Meta si era un movimiento de Ahorro
    if (t.categoria === 'Ahorro') {
        metas.forEach(m => {
            if (t.nota.includes(m.nombre)) {
                if (t.tipo === 'gasto') { // Fue un abono, se lo restamos a la meta
                    m.acumulado -= t.montoUSD;
                    if (m.acumulado < 0) m.acumulado = 0;
                } else if (t.tipo === 'ingreso') { // Fue un retiro, se lo devolvemos a la meta
                    m.acumulado += t.montoUSD;
                }
            }
        });
    }
    
    transacciones.splice(tIndex, 1);
    guardarYActualizarGestion();
}

// ================= GRÁFICOS (CHART.JS) =================
function renderizarGrafico(transFiltered) {
    const canvas = document.getElementById('graficoGastos');
    if (!canvas) return;
    
    const gastos = transFiltered.filter(t => t.tipo === 'gasto' && t.categoria !== 'Transferencia / P2P');
    const dataAgrupada = {};
    gastos.forEach(t => { dataAgrupada[t.categoria] = (dataAgrupada[t.categoria] || 0) + t.montoUSD; });
    
    const labels = Object.keys(dataAgrupada);
    const data = Object.values(dataAgrupada);

    if (chartInstancia) chartInstancia.destroy(); 

    chartInstancia = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels.length > 0 ? labels : ['Sin Gastos'],
            datasets: [{
                data: data.length > 0 ? data : [1],
                backgroundColor: data.length > 0 ? ['#FF453A', '#FF9F0A', '#32D74B', '#0A84FF', '#BF5AF2'] : ['var(--card-dark)'],
                borderWidth: 0, 
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { color: '#FFFFFF', font: {size: 10} } } }
        }
    });
}

// ================= GESTIÓN Y LISTAS =================
function cargarSelects() {
    const valCategoria = document.getElementById('val-categoria');
    if(!valCategoria) return;
    valCategoria.innerHTML = '<option value="" disabled selected>Categoría...</option>'; 
    if (categorias.length > 0) {
        categorias.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat; option.innerText = cat; valCategoria.appendChild(option);
        });
    }
}

function renderizarListasGestion() {
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
            lCat.innerHTML += `
                <li class="transaccion-item" style="padding: 12px 16px;">
                    <div class="trans-izq"><strong style="color:var(--text-primary);">${cat}</strong></div>
                    <div class="acciones-gestion">
                        <button class="btn-editar" onclick="editarCategoria(${i})">✏️</button>
                        <button class="btn-eliminar" onclick="eliminarCategoria(${i})">🗑️</button>
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
    if(nombre.trim() !== "") { cuentas.push({ id: Date.now(), nombre: nombre, moneda: moneda }); document.getElementById('nueva-cuenta-nombre').value = ''; guardarYActualizarGestion(); } else { alert("Ingresa un nombre."); }
}
function editarCuenta(i) { const n = prompt("Nuevo nombre:", cuentas[i].nombre); if(n) { cuentas[i].nombre = n; guardarYActualizarGestion(); } }
function eliminarCuenta(i) { if(confirm("¿Eliminar cuenta?")) { if(cuentas[i].id == cuentaActivaId) cuentaActivaId = null; cuentas.splice(i, 1); guardarYActualizarGestion(); } }
function agregarCategoria() { const nueva = document.getElementById('nueva-categoria').value; if(nueva.trim()) { categorias.push(nueva); document.getElementById('nueva-categoria').value = ''; guardarYActualizarGestion(); } }
function editarCategoria(i) { const n = prompt("Nuevo nombre:", categorias[i]); if(n) { categorias[i] = n; guardarYActualizarGestion(); } }
function eliminarCategoria(i) { if(confirm("¿Eliminar categoría?")) { categorias.splice(i, 1); guardarYActualizarGestion(); } }

function guardarYActualizarGestion() {
    localStorage.setItem('cuentas', JSON.stringify(cuentas));
    localStorage.setItem('categorias', JSON.stringify(categorias));
    localStorage.setItem('transacciones', JSON.stringify(transacciones));
    localStorage.setItem('metas', JSON.stringify(metas));
    cargarSelects(); renderizarListasGestion(); actualizarInterfaz();
    if (usuarioActual) sincronizarHaciaNube().catch(e => console.error(e));
}

// ================= BACKUPS =================
function exportarDatos() {
    const data = JSON.stringify({
        transacciones,
        categorias,
        cuentas,
        metas,
        userNombre,
        userAvatar
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
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            if(data.transacciones && data.cuentas) {
                transacciones = data.transacciones; 
                categorias = data.categorias || []; 
                cuentas = data.cuentas; 
                metas = data.metas || [];

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
                
                transacciones.forEach(t => { 
                    if(!t.fechaIsoLocal) {
                        let d = t.fecha ? new Date(t.fecha) : new Date(t.id);
                        if (isNaN(d.getTime())) d = new Date(); 
                        t.fechaIsoLocal = getLocalYYYYMMDD(d);
                    }
                });
                
                localStorage.setItem('transacciones', JSON.stringify(transacciones));
                localStorage.setItem('metas', JSON.stringify(metas));
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
    actualizarHeaderTutorial();
    actualizarUIPerfil();
    inicializarAskBot();
    configurarVisualViewportAskBot();

    // 1. Verificar si hay sesión guardada de Supabase
    if (supabaseClient) {
        try {
            const { data } = await supabaseClient.auth.getSession();
            if (data && data.session && data.session.user) {
                usuarioActual = data.session.user;
                actualizarUIEstadoNube();

                if (navigator.onLine) {
                    if (localStorage.getItem('assist_pending_sync') === 'true') {
                        await sincronizarHaciaNube();
                    } else {
                        await descargarDesdeNube();
                    }
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