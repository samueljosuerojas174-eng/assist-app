// ================= SEGURIDAD PIN 2.0 (TECLADO NUMÉRICO EN PANTALLA), PREGUNTAS Y CARGA =================
let nivelPistaRecuperacion = 0;
let preguntaRecuperacionIdx = 0;
let verificandoPinEnCurso = false;

function actualizarAvatarPantallaPIN() {
    const pinAvatar = document.getElementById('pin-user-avatar');
    if (!pinAvatar) return;
    const avatarGuardado = (typeof userAvatar !== 'undefined' && userAvatar) ? userAvatar : localStorage.getItem('assist_user_avatar');
    pinAvatar.src = avatarGuardado || 'logo.jpg';
}

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
    actualizarAvatarPantallaPIN();
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
    let savedThemeColor = localStorage.getItem('app_theme_color') || '#FFFFFF';
    if (savedThemeColor.toUpperCase() === '#000000') savedThemeColor = '#FFFFFF';
    const savedThemeMode = localStorage.getItem('app_theme_mode') || 'dark';
    cambiarColorAcento(savedThemeColor, true);
    cambiarModo(savedThemeMode, true);

    document.getElementById('val-fecha').value = getLocalYYYYMMDD();
    actualizarHeaderTutorial();
    actualizarUIPerfil();
    actualizarAvatarPantallaPIN();

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

// Sincronizar también el avatar del PIN cada vez que se actualice o elimine la foto de perfil
if (typeof actualizarUIPerfil === 'function') {
    const _actualizarUIPerfilOriginal = actualizarUIPerfil;
    actualizarUIPerfil = function() {
        _actualizarUIPerfilOriginal();
        actualizarAvatarPantallaPIN();
    };
}

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
    const colorSeguro = (!color || String(color).toUpperCase() === '#000000') ? '#FFFFFF' : color;
    document.documentElement.style.setProperty('--accent', colorSeguro);
    localStorage.setItem('app_theme_color', colorSeguro);
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
        const horizontalPalette = e.target.closest('.palette-container');
        if (horizontalPalette && horizontalPalette.scrollWidth > horizontalPalette.clientWidth) {
            return;
        }
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

    if (id === 'modal-historial') {
        if (typeof mostrarHistorialDiaActual === 'function') mostrarHistorialDiaActual();
        else mostrarHistorialTotalCuenta();
    }
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