// ================= TUTORIAL GUIADO INTERACTIVO (ONBOARDING V4.0) =================
const PASOS_TUTORIAL = [
    {
        icono: "🚀",
        titulo: "Bienvenido a A$$IST 4.0",
        desc: "Tu centro de control financiero personal multidivisa. Ultrarrápido, <b>100% funcional sin internet</b> en la calle y adaptado milimétricamente a la economía de Venezuela.",
        tip: "✨ <b>Filosofía Local-First + Nube:</b> Todo se guarda al instante en tu teléfono, se sincroniza en segundo plano con la nube y puedes personalizar tu perfil con nombre y foto desde el avatar superior."
    },
    {
        icono: "💳",
        titulo: "1. Cuentas Multidivisa",
        desc: "Registra dónde tienes tu capital: bancos en <b>Bolívares (VES)</b>, efectivo en <b>Dólares (USD)</b> o billeteras cripto en <b>USDT</b> con equivalencias en tiempo real.",
        tip: "💡 Ve a <b>Ajustes > Gestionar Cuentas</b> para crearlas y ordenarlas con las flechas <b>▲ / ▼</b>. En Inicio, desliza tu tarjeta principal hacia los lados para cambiar de cuenta activa."
    },
    {
        icono: "🏷️",
        titulo: "2. Categorías con Color y Memoria",
        desc: "Crea tus categorías con un <b>color representativo</b> desde la paleta o el selector libre para identificarlas visualmente en toda la app.",
        tip: "🧠 <b>Memoria y edición en vivo:</b> A$$IST recuerda con qué moneda pagaste por última vez en cada categoría, y puedes cambiar el color de cualquier categoría existente tocando su círculo sin perder historial."
    },
    {
        icono: "⚡",
        titulo: "3. Registro, Tasa USDT y Comisiones",
        desc: "El formulario adapta las monedas según tu cuenta activa y, si registras un movimiento en <b>Bs desde una cuenta USDT</b>, te permite editar la tasa USDT aplicada.",
        tip: "🇻🇪 <b>Comisiones Bancarias VE:</b> En gastos en VES, elige entre <b>Tarjeta/POS (0 Bs)</b>, <b>Pago Móvil P2P (0,30%)</b>, <b>Comercio P2C (1,50%)</b> o comisión manual."
    },
    {
        icono: "🔄",
        titulo: "4. Transferencias y Comisión P2P",
        desc: "¿Cambiaste USDT a Bolívares o compraste USDT con Bs? Elige <b>Transferir</b> en el panel principal para mover saldo entre cuentas en 1 clic.",
        tip: "📉 <b>Comisión Binance P2P:</b> Al pasar de <b>VES a USDT</b>, puedes indicar la comisión en USDT (ej. <i>0.60 USDT</i>) para que A$$IST abone el neto exacto en tu billetera."
    },
    {
        icono: "🤖",
        titulo: "5. AskBot 4.0: Copiloto en Vivo",
        desc: "Tu asesor financiero interactivo 100% local con <b>Consultas en Vivo</b> de tus finanzas y la guía completa de A$$IST en un menú desplegable.",
        tip: "⚡ <b>Respuestas al instante:</b> Abre el menú inferior para consultar las tasas de hoy y mañana, la radiografía de tu patrimonio, gastos del mes, deudas pendientes y el diagnóstico de liquidez."
    },
    {
        icono: "📅",
        titulo: "6. Agenda de Pagos y Calendario",
        desc: "Controla recibos, deudas y suscripciones con vistas de <b>Pendientes</b>, <b>📅 Calendario mensual interactivo</b> y <b>Pagados</b>.",
        tip: "🔔 Recibe alertas en Inicio cuando un pago vence en <b>≤ 3 días</b>, ejecútalo con <b>💳 Pagar</b> descontando de tu cuenta (si es mensual salta al próximo mes) o usa <b>↩️ Revertir</b> si te equivocas."
    },
    {
        icono: "💱",
        titulo: "7. Calculadora, Brecha y Fecha Valor",
        desc: "Convierte al instante entre <b>BCV, USDT, EUR o Tasa Propia</b> viendo siempre la <b>Brecha Cambiaria ($/USDT)</b> y la variación diaria.",
        tip: "⏳ <b>Fecha Valor y Calendario Histórico:</b> Cuando el BCV publica la tasa de mañana aparece el botón amarillo <b>📅→</b> para adelantar cálculos, o toca el calendario <b>📅</b> para consultar tasas de días pasados."
    },
    {
        icono: "📊",
        titulo: "8. Historial Pro y Metas con Reembolso",
        desc: "El Historial abre en los movimientos del <b>📅 Día de hoy</b> o en vista <b>Total</b> por Mes/Año, con buscador en vivo y <b>Gráfico de Dona</b> por porcentajes.",
        tip: "🛡️ <b>Swipe to Delete y Metas Seguras:</b> Desliza un movimiento a la izquierda para borrarlo. Y si eliminas una <b>Meta de Ahorro</b> a la mitad, tu dinero ahorrado se reembolsa automáticamente a tu cuenta."
    },
    {
        icono: "🔒",
        titulo: "9. PIN 2.0, Modo Pánico, Temas y Nube",
        desc: "Protege tu acceso con el <b>teclado numérico en pantalla</b> y <b>3 preguntas personalizadas</b> con tolerancia inteligente y pistas sutiles.",
        tip: "🕵️‍♂️ Da <b>doble toque rápido</b> al saldo para activar el <b>Modo Pánico</b> (********), elige entre <b>Oscuro, Claro o Liquid Glass</b> con 19 acentos y respalda todo en la <b>Nube o en archivo Backup</b>."
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
    renderizarPasoTutorial(1);
    abrirModal('modal-tutorial');
}

function renderizarPasoTutorial(direccion = 1) {
    const paso = PASOS_TUTORIAL[pasoTutorialActual];
    if (!paso) return;
    const slideBody = document.getElementById('tut-slide-body');
    if (slideBody) {
        slideBody.style.animation = 'none';
        void slideBody.offsetWidth;
        const animName = direccion < 0 ? 'tabEnterFromLeft' : 'tabEnterFromRight';
        slideBody.style.animation = `${animName} 0.34s var(--ios-spring) forwards`;
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
    renderizarPasoTutorial(direccion);
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

// ================= NAVEGACIÓN FLUIDA CON TRANSICIÓN DIRECCIONAL =================
const ORDEN_PESTANAS_NAV = [
    'tab-inicio',
    'tab-askbot',
    'tab-agenda',
    'tab-calculadora',
    'tab-metas',
    'tab-categorias'
];
let pestanaActivaIdActual = 'tab-inicio';

function resetearScrollNativoiOS() {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
}

let _timersReparacionBarra = [];
function repararViewportYBarraInferioriOS(esCierreTeclado = false) {
    _timersReparacionBarra.forEach(t => clearTimeout(t));
    _timersReparacionBarra = [];

    const ejecutarResnapNativo = (forzarPulsoAltura) => {
        if (document.body.classList.contains('modal-open')) return;

        // Si un input sigue activo (el usuario pasó de un input a otro), no forzar cierre
        const activeEl = document.activeElement;
        if (esCierreTeclado && activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT' || activeEl.tagName === 'TEXTAREA') && !activeEl.disabled && activeEl.type !== 'hidden') {
            return;
        }

        // En iOS WebApp Standalone, WKWebView solo re-encaja el viewport (quitando la franja negra inferior)
        // cuando detecta que el scrollHeight supera temporalmente al alto de la pantalla (tal como ocurre al ir a Inicio/Agenda/Ajustes).
        const esPestanaCorta = ['tab-calculadora', 'tab-metas', 'tab-askbot'].includes(pestanaActivaIdActual);
        const yGuardada = window.scrollY || document.documentElement.scrollTop || 0;
        if (forzarPulsoAltura) {
            const prevPad = document.body.style.paddingBottom;
            document.body.style.paddingBottom = '260px';
            void document.body.offsetHeight;
            window.scrollTo(0, yGuardada + 1);
            // Pestañas cortas: volver arriba (re-encaje). Pestañas largas: mantener exactamente donde estaba el usuario.
            window.scrollTo(0, esPestanaCorta ? 0 : yGuardada);
            setTimeout(() => {
                document.body.style.paddingBottom = prevPad || '';
            }, 60);
        } else if (esPestanaCorta) {
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        }

        const nav = document.getElementById('bottom-nav-bar');
        if (nav && !document.body.classList.contains('askbot-kb-open')) {
            nav.style.bottom = '-0.5px';
            void nav.offsetHeight;
            nav.style.bottom = '0px';
            nav.style.transform = 'translate3d(0, 0, 0)';
        }
    };

    if (esCierreTeclado) {
        _timersReparacionBarra.push(setTimeout(() => ejecutarResnapNativo(true), 40));
    } else {
        ejecutarResnapNativo(false);
    }
    if (esCierreTeclado) {
        _timersReparacionBarra.push(setTimeout(() => ejecutarResnapNativo(true), 85));
        _timersReparacionBarra.push(setTimeout(() => ejecutarResnapNativo(true), 240));
        _timersReparacionBarra.push(setTimeout(() => ejecutarResnapNativo(false), 420));
    } else {
        _timersReparacionBarra.push(setTimeout(() => ejecutarResnapNativo(false), 90));
    }
}

function cambiarPestana(idPestana, elementoNav) {
    const tabDestino = document.getElementById(idPestana);
    if (!tabDestino) return;

    // Si hay algún input con foco (ej. tasa o monto en Conversión), cerramos el teclado antes de cambiar de pestaña
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT' || activeEl.tagName === 'TEXTAREA')) {
        activeEl.blur();
    }

    // Si el usuario toca la misma pestaña en la que ya está, hacer micro-rebote suave sin recargar de golpe
    if (pestanaActivaIdActual === idPestana && tabDestino.classList.contains('vista-activa')) {
        if (elementoNav) {
            elementoNav.classList.remove('nav-tap-bounce');
            void elementoNav.offsetWidth;
            elementoNav.classList.add('nav-tap-bounce');
        }
        return;
    }

    const idxAnterior = ORDEN_PESTANAS_NAV.indexOf(pestanaActivaIdActual);
    const idxNuevo = ORDEN_PESTANAS_NAV.indexOf(idPestana);
    const claseDireccion = (idxAnterior !== -1 && idxNuevo !== -1 && idxNuevo < idxAnterior)
        ? 'tab-anim-left'
        : 'tab-anim-right';

    pestanaActivaIdActual = idPestana;

    document.querySelectorAll('.tab-content, .vista-activa').forEach(el => {
        el.className = 'vista-oculta';
    });

    tabDestino.className = `vista-activa ${claseDireccion}`;

    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('activo', 'nav-tap-bounce');
    });
    if (elementoNav) {
        elementoNav.classList.add('activo', 'nav-tap-bounce');
    }

    if (idPestana === 'tab-agenda') renderizarAgenda();

    if (idPestana === 'tab-askbot') {
        document.body.classList.add('askbot-tab-open');
        resetearScrollNativoiOS();
        repararViewportYBarraInferioriOS(false);
        inicializarAskBot();
    } else {
        document.body.classList.remove('askbot-tab-open');
        document.body.classList.remove('askbot-kb-open');
        document.documentElement.style.setProperty('--askbot-vh', '100dvh');
        resetearScrollNativoiOS();
        repararViewportYBarraInferioriOS(false);
    }
}

// ================= COMPATIBILIDAD VISUAL VIEWPORT Y REPARACIÓN DE BARRA EN iOS =================
let _listenerViewportConfigurado = false;
let _tecladoEstabaAbierto = false;
function ajustarAlturaVisualAskBot() {
    repararViewportYBarraInferioriOS(false);
}
function configurarVisualViewportAskBot() {
    if (_listenerViewportConfigurado) return;
    _listenerViewportConfigurado = true;

    document.addEventListener('focusin', (e) => {
        const t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA') && t.type !== 'hidden') {
            _tecladoEstabaAbierto = true;
        }
    });

    document.addEventListener('focusout', (e) => {
        const t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA') && t.type !== 'hidden') {
            _tecladoEstabaAbierto = false;
            repararViewportYBarraInferioriOS(true);
        }
    });

    // Solo actuar en visualViewport.resize cuando se cierra el teclado, JAMÁS durante el scroll normal del usuario
    if (window.visualViewport) {
        let prevVvHeight = window.visualViewport.height;
        window.visualViewport.addEventListener('resize', () => {
            const nuevoAlto = window.visualViewport.height;
            const deltaSubida = nuevoAlto - prevVvHeight;
            prevVvHeight = nuevoAlto;
            // Si la altura visual salta +120px de golpe (cierre físico del teclado en iOS), reparar barra inferior
            if (deltaSubida > 120) {
                repararViewportYBarraInferioriOS(true);
            }
        });
    }
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
    if (lCuentas) {
        let htmlCuentas = '';
        cuentas.forEach((c, i) => {
            htmlCuentas += `
                <li id="item-gest-cuenta-${i}" class="transaccion-item" style="padding: 12px 16px;">
                    <div class="trans-izq"><strong style="color:var(--text-primary);">${c.nombre}</strong><small>${c.moneda}</small></div>
                    <div class="acciones-gestion">
                        <button class="btn-mover" onclick="moverCuenta(${i}, -1)" ${i === 0 ? 'disabled' : ''}>▲</button>
                        <button class="btn-mover" onclick="moverCuenta(${i}, 1)" ${i === cuentas.length - 1 ? 'disabled' : ''}>▼</button>
                        <button class="btn-editar" onclick="editarCuenta(${i})">✏️</button>
                        <button class="btn-eliminar" onclick="eliminarCuenta(${i})">🗑️</button>
                    </div>
                </li>`;
        });
        lCuentas.innerHTML = htmlCuentas;
    }
    if (lCat) {
        let htmlCat = '';
        categorias.forEach((cat, i) => {
            const colorCat = obtenerColorCategoria(cat);
            htmlCat += `
                <li id="item-gest-cat-${i}" class="transaccion-item" style="padding: 12px 16px;">
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
        lCat.innerHTML = htmlCat;
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
function eliminarCuenta(i) {
    if(confirm("¿Eliminar cuenta?")) {
        const elItem = document.getElementById(`item-gest-cuenta-${i}`);
        animarYQuitarElementoDOM(elItem, () => {
            if(cuentas[i] && cuentas[i].id == cuentaActivaId) cuentaActivaId = null;
            cuentas.splice(i, 1);
            guardarYActualizarGestion();
        });
    }
}

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
        const elItem = document.getElementById(`item-gest-cat-${i}`);
        animarYQuitarElementoDOM(elItem, () => {
            categorias.splice(i, 1);
            guardarYActualizarGestion();
        });
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

// ================= ARRANQUE INSTANTÁNEO DE LA APP (LOCAL-FIRST + SYNC EN SEGUNDO PLANO) =================
async function inicializarApp() {
    asegurarColoresCategorias();
    renderizarPaletaColorNuevaCat();
    actualizarHeaderTutorial();
    actualizarUIPerfil();
    inicializarAskBot();
    configurarVisualViewportAskBot();

    // Renderizado inmediato desde caché local en 0ms sin esperar la red
    cargarSelects();
    actualizarInterfaz();
    setTasaModo('BCV'); 
    toggleCategoriaSelect();
    actualizarUIEstadoNube();

    // Actualización de tasas y sincronización en la nube en paralelo sin bloquear el inicio
    const promesaTasas = obtenerTasas().then(() => {
        actualizarInterfaz();
        setTasaModo(typeof calcModoTasa !== 'undefined' ? calcModoTasa : 'BCV');
    }).catch(e => console.error("Error obteniendo tasas en arranque:", e));

    const promesaNube = (async () => {
        if (!supabaseClient) return;
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
    })();

    await Promise.allSettled([promesaTasas, promesaNube]);
    setInterval(() => { obtenerTasas().then(() => actualizarInterfaz()); }, 300000); 
}
inicializarApp();