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

// ================= ASKBOT (ASISTENTE FINANCIERO CON IA + MOTOR HÍBRIDO + FIX TECLADO iOS) =================
let askbotEsperandoRespuesta = false;
let ultimoAltoTecladoAskBot = 0;

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

function inicializarAskBot() {
    const box = document.getElementById('askbot-messages');
    const hero = document.getElementById('askbot-welcome-hero');
    if (!box || !hero) return;

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

// Motor Local Instantáneo (0.15s) para preguntas directas y cálculos rápidos
function responderLocalmenteAskBot(mensajeRaw) {
    const txt = mensajeRaw
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

    // Si es una consulta compleja de asesoría/presupuesto y hay internet, dejamos que Gemini analice
    const palabrasComplejas = /\b(viable|viabilidad|presupuesto|mercado|lista|estrategia|recomienda|consejo|conviene|ajustar|ajustarme|acelerar|plan|puedo gastar hoy|deberia|opinas)\b/;
    if (palabrasComplejas.test(txt) && navigator.onLine) {
        return null;
    }

    // Calcular saldos en vivo de todas las cuentas
    let totalUSD_Global = 0;
    let totalVES_Puro = 0;
    let totalUSD_Fisico = 0;
    let totalUSDT_Puro = 0;

    const saldosCuentas = cuentas.map(c => {
        let balUSD = 0;
        transacciones.forEach(t => {
            if (t.cuentaId == c.id) {
                balUSD += (t.tipo === 'ingreso' ? Number(t.montoUSD) : -Number(t.montoUSD));
            }
        });
        totalUSD_Global += balUSD;
        const balBs = Math.max(0, balUSD * tasaBCV);
        if (c.moneda === 'VES') totalVES_Puro += balBs;
        if (c.moneda === 'USD') totalUSD_Fisico += balUSD;
        if (c.moneda === 'USDT') totalUSDT_Puro += balUSD;

        return { nombre: c.nombre, moneda: c.moneda, balUSD, balBs };
    });

    const brechaPct = tasaBCV > 0 ? (((tasaParalelo - tasaBCV) / tasaBCV) * 100).toFixed(2) : "0.00";

    // 1. Detector de CONVERSIÓN RÁPIDA (ej: "cuanto son 50 usd en bs", "1500 bs a usdt")
    const matchMonto = txt.match(/(\d+(?:[.,]\d+)?)\s*(bs|bolivares|ves|usd|dolares|dolar|\$|usdt|eur|euros|euro)/i);
    if (matchMonto && /\b(cuanto|convertir|convierte|son|es| a | en |equivale|cambio)\b/.test(txt)) {
        const valor = parseFloat(matchMonto[1].replace(',', '.'));
        const mon = matchMonto[2].toLowerCase();

        if (['bs', 'bolivares', 'ves'].includes(mon)) {
            return `💱 **Conversión rápida de Bs ${valor.toFixed(2)}:**\n• A tasa BCV (Bs ${tasaBCV.toFixed(2)}): **$${(valor / tasaBCV).toFixed(2)}**\n• A tasa USDT (Bs ${tasaParalelo.toFixed(2)}): **${(valor / tasaParalelo).toFixed(2)} USDT**\n• A tasa Euro (Bs ${tasaEUR.toFixed(2)}): **€${(valor / tasaEUR).toFixed(2)}**`;
        } else if (mon === 'usdt') {
            return `🪙 **Conversión rápida de ${valor.toFixed(2)} USDT:**\n• En Bolívares (Tasa USDT): **Bs ${(valor * tasaParalelo).toFixed(2)}**\n• Poder de compra a tasa BCV: **$${((valor * tasaParalelo) / tasaBCV).toFixed(2)}**`;
        } else if (['eur', 'euros', 'euro'].includes(mon)) {
            return `🇪🇺 **Conversión rápida de €${valor.toFixed(2)}:**\n• En Bolívares (Tasa EUR): **Bs ${(valor * tasaEUR).toFixed(2)}**\n• Equivalente USD (BCV): **$${((valor * tasaEUR) / tasaBCV).toFixed(2)}**`;
        } else {
            return `🇺🇸 **Conversión rápida de $${valor.toFixed(2)}:**\n• A tasa BCV: **Bs ${(valor * tasaBCV).toFixed(2)}**\n• A tasa Paralelo/USDT: **Bs ${(valor * tasaParalelo).toFixed(2)}**`;
        }
    }

    // 2. Detector de TASAS DEL DÍA Y BRECHA
    if (/\b(tasa|tasas|bcv|paralelo|dolar hoy|precio del dolar|a cuanto esta|brecha|diferencial|euro)\b/.test(txt) && !/\b(tengo|saldo|cuenta|mis)\b/.test(txt)) {
        return `📈 **Tasas del Día en Vivo:**\n• 🇻🇪 **BCV Oficial:** Bs ${tasaBCV.toFixed(2)}\n• 🪙 **USDT / Paralelo:** Bs ${tasaParalelo.toFixed(2)}\n• 🇪🇺 **Euro Oficial:** Bs ${tasaEUR.toFixed(2)}\n\n📊 **Brecha cambiaria:** **${brechaPct}%** de diferencia entre BCV y USDT.`;
    }

    // 3. Detector de SALDOS Y CUENTAS ("cuantos bs tengo", "cuanto tengo", "mi saldo", etc.)
    if (/\b(cuanto|cuantos|saldo|saldos|balance|tengo|mis cuentas|mi cuenta|plata|dinero|disponible|bs|bolivares|ves|usd|dolares|usdt)\b/.test(txt) && !/\b(gaste|gastado|gastos|meta|metas|ahorro)\b/.test(txt)) {
        if (cuentas.length === 0) {
            return "💳 Aún no tienes cuentas registradas. Ve a **Ajustes > Gestionar Cuentas** para crear la primera.";
        }

        const pideSoloVES = /\b(bs|bolivar|bolivares|ves)\b/.test(txt) && !/\b(usd|dolar|usdt|todo|total)\b/.test(txt);
        const pideSoloUSDT = /\b(usdt|binance|cripto)\b/.test(txt) && !/\b(bs|bolivares|usd|todo|total)\b/.test(txt);
        const pideSoloUSD = /\b(usd|dolar|dolares|efectivo|fisico)\b/.test(txt) && !/\b(bs|bolivares|usdt|todo|total)\b/.test(txt);

        if (pideSoloVES) {
            const cVES = saldosCuentas.filter(c => c.moneda === 'VES');
            if (cVES.length === 0) return "🇻🇪 No tienes cuentas en **Bolívares (VES)** creadas actualmente.";
            const lista = cVES.map(c => `• **${c.nombre}:** Bs ${c.balBs.toFixed(2)} *(≈ $${c.balUSD.toFixed(2)} BCV)*`).join('\n');
            return `🇻🇪 **Tus Bolívares disponibles:**\n${lista}\n\n💰 **Total en Bolívares:** **Bs ${totalVES_Puro.toFixed(2)}** *(≈ $${(totalVES_Puro / tasaBCV).toFixed(2)} a BCV)*`;
        }

        if (pideSoloUSDT) {
            const cUSDT = saldosCuentas.filter(c => c.moneda === 'USDT');
            if (cUSDT.length === 0) return "🪙 No tienes cuentas en **USDT** registradas.";
            const lista = cUSDT.map(c => `• **${c.nombre}:** ${c.balUSD.toFixed(2)} USDT *(≈ Bs ${(c.balUSD * tasaParalelo).toFixed(2)})*`).join('\n');
            return `🪙 **Tu saldo en USDT:**\n${lista}\n\n💰 **Total USDT:** **${totalUSDT_Puro.toFixed(2)} USDT** *(≈ Bs ${(totalUSDT_Puro * tasaParalelo).toFixed(2)} a tasa USDT)*`;
        }

        if (pideSoloUSD) {
            const cUSD = saldosCuentas.filter(c => c.moneda === 'USD');
            if (cUSD.length === 0) return "💵 No tienes cuentas en **Dólares físicos (USD)** registradas.";
            const lista = cUSD.map(c => `• **${c.nombre}:** $${c.balUSD.toFixed(2)}`).join('\n');
            return `💵 **Tu saldo en Dólares (USD):**\n${lista}\n\n💰 **Total USD Físico:** **$${totalUSD_Fisico.toFixed(2)}**`;
        }

        // Resumen completo de todas las cuentas
        const desglose = saldosCuentas.map(c => {
            if (c.moneda === 'VES') return `• **${c.nombre} (VES):** Bs ${c.balBs.toFixed(2)} *($${c.balUSD.toFixed(2)} BCV)*`;
            if (c.moneda === 'USDT') return `• **${c.nombre} (USDT):** ${c.balUSD.toFixed(2)} USDT *(Bs ${(c.balUSD * tasaParalelo).toFixed(2)})*`;
            return `• **${c.nombre} (${c.moneda}):** $${c.balUSD.toFixed(2)}`;
        }).join('\n');

        return `💳 **Estado actual de tus cuentas:**\n${desglose}\n\n💎 **Patrimonio Total Estimado:** **$${totalUSD_Global.toFixed(2)}** *(≈ Bs ${(totalUSD_Global * tasaBCV).toFixed(2)} a BCV)*`;
    }

    // 4. Detector de GASTOS E INGRESOS DEL MES
    if (/\b(gaste|gastado|gastos|gasto|categoria|categorias|ingresos|ingreso|movimientos|mes)\b/.test(txt)) {
        const hoy = new Date();
        const mesPrefix = getLocalYYYYMMDD(hoy).slice(0, 7);
        let gastosMes = 0;
        let ingresosMes = 0;
        const porCat = {};

        transacciones.forEach(t => {
            const f = t.fecha ? new Date(t.fecha) : new Date();
            const iso = t.fechaIsoLocal || getLocalYYYYMMDD(f);
            if (iso.startsWith(mesPrefix) && t.categoria !== 'Transferencia / P2P') {
                if (t.tipo === 'gasto') {
                    gastosMes += Number(t.montoUSD) || 0;
                    const c = t.categoria || 'Varios';
                    porCat[c] = (porCat[c] || 0) + (Number(t.montoUSD) || 0);
                } else if (t.tipo === 'ingreso') {
                    ingresosMes += Number(t.montoUSD) || 0;
                }
            }
        });

        const topCats = Object.entries(porCat)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, m]) => `• **${cat}:** $${m.toFixed(2)} *(Bs ${(m * tasaBCV).toFixed(2)})*`)
            .join('\n') || '• Sin gastos registrados este mes.';

        return `📊 **Resumen del mes actual (${mesPrefix}):**\n• **Ingresos:** $${ingresosMes.toFixed(2)}\n• **Gastos totales:** $${gastosMes.toFixed(2)} *(Bs ${(gastosMes * tasaBCV).toFixed(2)})*\n\n🏷️ **Desglose por categoría:**\n${topCats}`;
    }

    // 5. Detector de METAS DE AHORRO
    if (/\b(meta|metas|ahorro|ahorros|ahorrado|objetivo|objetivos)\b/.test(txt)) {
        if (metas.length === 0) {
            return "🎯 No tienes metas de ahorro activas en este momento. Puedes crear una en la pestaña **Metas**.";
        }
        const listaMetas = metas.map(m => {
            const pct = m.objetivo > 0 ? ((m.acumulado / m.objetivo) * 100).toFixed(1) : "0.0";
            const falta = Math.max(0, m.objetivo - m.acumulado).toFixed(2);
            return `• **${m.nombre}:** $${Number(m.acumulado).toFixed(2)} / $${Number(m.objetivo).toFixed(2)} (**${pct}%**) — *Faltan $${falta}*`;
        }).join('\n');
        return `🎯 **Progreso de tus Metas de Ahorro:**\n${listaMetas}`;
    }

    // 6. Detector de SALUDOS
    if (/^(hola|buenas|hey|saludos|buenos dias|buenas tardes|buenas noches|que tal|como estas)\b/.test(txt)) {
        const saludoNombre = userNombre ? `¡Hola, **${userNombre}**!` : `¡Hola!`;
        return `👋 ${saludoNombre} Actualmente tienes un balance total estimado de **$${totalUSD_Global.toFixed(2)}** en tus cuentas y la tasa BCV está en **Bs ${tasaBCV.toFixed(2)}** (USDT en **Bs ${tasaParalelo.toFixed(2)}**).\n\n¿Qué quieres consultar o analizar?`;
    }

    return null;
}

function generarContextoFinancieroIA() {
    const hoy = new Date();
    const mesActualPrefix = getLocalYYYYMMDD(hoy).slice(0, 7);

    const brechaPct = tasaBCV > 0 ? (((tasaParalelo - tasaBCV) / tasaBCV) * 100).toFixed(2) : "0.00";
    let resumenTasas = `Tasa BCV Oficial: Bs ${tasaBCV.toFixed(2)} | Tasa USDT (Paralelo): Bs ${tasaParalelo.toFixed(2)} | Tasa EUR Oficial: Bs ${tasaEUR.toFixed(2)} | Brecha BCV vs USDT: ${brechaPct}%`;

    let totalPatrimonioUSD = 0;
    let detalleCuentas = [];
    if (cuentas.length === 0) {
        detalleCuentas.push("Sin cuentas creadas todavía.");
    } else {
        cuentas.forEach(c => {
            let balUSD = 0;
            transacciones.forEach(t => {
                if (t.cuentaId == c.id) {
                    balUSD += (t.tipo === 'ingreso' ? Number(t.montoUSD) : -Number(t.montoUSD));
                }
            });
            totalPatrimonioUSD += balUSD;

            if (c.moneda === 'VES') {
                const balBs = Math.max(0, balUSD * tasaBCV);
                detalleCuentas.push(`- ${c.nombre} (VES): Bs ${balBs.toFixed(2)} (equiv. $${balUSD.toFixed(2)} a BCV)`);
            } else if (c.moneda === 'USDT') {
                const eqBs = balUSD * tasaParalelo;
                detalleCuentas.push(`- ${c.nombre} (USDT): ${balUSD.toFixed(2)} USDT (equiv. Bs ${eqBs.toFixed(2)} a tasa USDT)`);
            } else {
                detalleCuentas.push(`- ${c.nombre} (${c.moneda}): $${balUSD.toFixed(2)}`);
            }
        });
    }

    let totalGastosMesUSD = 0;
    let totalIngresosMesUSD = 0;
    const gastosPorCategoria = {};

    transacciones.forEach(t => {
        const fechaT = t.fecha ? new Date(t.fecha) : new Date();
        const iso = t.fechaIsoLocal || getLocalYYYYMMDD(fechaT);
        if (iso.startsWith(mesActualPrefix) && t.categoria !== 'Transferencia / P2P') {
            if (t.tipo === 'gasto') {
                totalGastosMesUSD += Number(t.montoUSD) || 0;
                const cat = t.categoria || 'Varios';
                gastosPorCategoria[cat] = (gastosPorCategoria[cat] || 0) + (Number(t.montoUSD) || 0);
            } else if (t.tipo === 'ingreso') {
                totalIngresosMesUSD += Number(t.montoUSD) || 0;
            }
        }
    });

    const listaCategoriasMes = Object.entries(gastosPorCategoria)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, monto]) => `${cat}: $${monto.toFixed(2)}`)
        .join(', ') || 'Sin gastos registrados este mes';

    const detalleMetas = metas.length > 0
        ? metas.map(m => {
            const pct = m.objetivo > 0 ? ((m.acumulado / m.objetivo) * 100).toFixed(1) : "0.0";
            return `- ${m.nombre}: $${Number(m.acumulado).toFixed(2)} ahorrados de $${Number(m.objetivo).toFixed(2)} (${pct}%)`;
        }).join('\n')
        : 'Sin metas de ahorro activas.';

    return [
        userNombre ? `USUARIO: ${userNombre}` : '',
        `FECHA LOCAL: ${getLocalYYYYMMDD(hoy)}`,
        `TASAS DEL DÍA: ${resumenTasas}`,
        `BALANCE TOTAL ESTIMADO (USD): $${totalPatrimonioUSD.toFixed(2)}`,
        `CUENTAS DEL USUARIO:\n${detalleCuentas.join('\n')}`,
        `RESUMEN DEL MES ACTUAL (${mesActualPrefix}): Ingresos: $${totalIngresosMesUSD.toFixed(2)} | Gastos: $${totalGastosMesUSD.toFixed(2)}`,
        `DESGLOSE DE GASTOS DEL MES POR CATEGORÍA: ${listaCategoriasMes}`,
        `METAS DE AHORRO ACTIVAS:\n${detalleMetas}`
    ].filter(Boolean).join('\n\n');
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

    // 1. Intento de respuesta instantánea local (0.15s) para preguntas sencillas o directas
    const respuestaLocal = responderLocalmenteAskBot(mensaje);
    if (respuestaLocal) {
        mostrarIndicadorEscribiendoAskBot();
        setTimeout(() => {
            quitarIndicadorEscribiendoAskBot();
            agregarBurbujaAskBot(respuestaLocal, 'bot');
        }, 150);
        return;
    }

    // 2. Si es una pregunta compleja de análisis y no hay internet, avisa al instante
    if (!navigator.onLine) {
        agregarBurbujaAskBot(
            "📡 **Sin conexión a internet.**\nPara análisis complejos necesito conexión, pero puedes preguntarme tus saldos en Bs/USD/USDT, tasas, gastos del mes o metas y te responderé al instante offline.",
            "bot"
        );
        return;
    }

    // 3. Consulta a la IA en la nube para análisis, presupuestos o estrategias
    askbotEsperandoRespuesta = true;
    if (btnSend) btnSend.disabled = true;
    mostrarIndicadorEscribiendoAskBot();

    try {
        const contexto = generarContextoFinancieroIA();

        const res = await fetch(`${SUPABASE_URL}/functions/v1/asistente-ia`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY
            },
            body: JSON.stringify({ mensaje, contexto })
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data?.error || `Error del servidor (${res.status})`);
        }

        const respuestaTexto = data?.respuesta || "No pude generar una respuesta en este momento.";
        quitarIndicadorEscribiendoAskBot();
        agregarBurbujaAskBot(respuestaTexto, 'bot');
    } catch (err) {
        console.error("Error al consultar AskBot:", err);
        quitarIndicadorEscribiendoAskBot();
        agregarBurbujaAskBot(
            `⚠️ **Detalle de conexión con AskBot:** ${err.message || "Verifica tu conexión a internet e intenta nuevamente."}`,
            "bot"
        );
    } finally {
        askbotEsperandoRespuesta = false;
        if (btnSend) btnSend.disabled = false;
    }
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