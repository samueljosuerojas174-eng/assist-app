// ================= TUTORIAL GUIADO INTERACTIVO (ONBOARDING V3.0) =================
const PASOS_TUTORIAL = [
    {
        icono: "🚀",
        titulo: "Bienvenido a A$$IST 3.0", desc: "Tu centro de control financiero personal. Diseñado para ser ultrarrápido, funcionar 100\% offline en la calle y adaptarse a la economía real.", tip: "✨ <b>Filosofía Local-First + Nube:</b> Todo se guarda al instante en tu teléfono, se sincroniza silenciosamente en la nube y puedes personalizar tu perfil con nombre y foto desde el avatar superior." }, { icono: "💳", titulo: "1. Cuentas Multidivisa", desc: "Registra dónde tienes tu dinero: bancos en <b>Bolívares (VES)</b>, efectivo en <b>Dólares (USD)</b> o billeteras cripto en <b>USDT</b>.", tip: "💡 Ve a <b>Ajustes > Gestionar Cuentas</b> para crearlas y ordenarlas con las flechas <b>▲ / ▼</b>. En Inicio, desliza la tarjeta principal hacia los lados para cambiar de cuenta activa." }, { icono: "🏷️", titulo: "2. Categorías con Color y Memoria", desc: "Crea tus categorías personalizadas y asígnales un <b>color propio</b> desde la paleta o el selector libre para identificarlas al instante.", tip: "🧠 <b>Memoria inteligente:</b> A$$IST recuerda automáticamente con qué moneda pagaste por última vez cada categoría y puedes cambiar el color de cualquier categoría existente tocando su círculo."
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
        tip: "⚡ En un solo paso, A$$IST descuenta el saldo de la cuenta de origen y suma el monto convertido en la cuenta destino usando la tasa que indiques." }, { icono: "📅", titulo: "5. Nueva Agenda de Pagos", desc: "Organiza tus deudas, recibos y suscripciones en la pestaña <b>Agenda</b> con vistas de <b>Pendientes</b>, <b>📅 Calendario mensual</b> y <b>Pagados</b>.", tip: "🔔 Recibe avisos no invasivos en Inicio cuando un pago vence en <b>≤ 3 días</b>, págalo en 1 clic descontando de tu cuenta (si es mensual avanza al próximo mes) o reviértelo si lo borras del historial." }, { icono: "📊", titulo: "6. Historial Pro y Metas Visuales", desc: "Analiza tus gastos con el nuevo <b>gráfico de dona interactivo</b> con leyenda lateral de colores y porcentajes, o filtra con el botón <b>Total</b> (por Mes/Año) y <b>📅 Día</b>.", tip: "🗑️ <b>Swipe to Delete y Reembolso:</b> Desliza hacia la izquierda cualquier movimiento para borrarlo. Y si eliminas una <b>Meta</b> con dinero ahorrado, se reembolsa automáticamente a tu cuenta." }, { icono: "🔒", titulo: "7. PIN 2.0, Modo Pánico y Temas", desc: "Protege tu app con el nuevo <b>teclado numérico integrado en pantalla</b> y <b>3 preguntas de seguridad personalizadas</b> con tolerancia inteligente y pistas sutiles.", tip: "🕵️‍♂️ Da <b>doble toque rápido</b> en tu balance para activar el <b>Modo Pánico</b> (********) y personaliza A$$IST con los temas <b>Oscuro</b>, <b>Claro</b> o <b>Liquid Glass</b> y 20 colores de acento."
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