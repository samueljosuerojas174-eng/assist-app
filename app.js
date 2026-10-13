// Base de Datos Local
let transacciones = JSON.parse(localStorage.getItem('transacciones')) || [];
let categorias = JSON.parse(localStorage.getItem('categorias')) || [];
let cuentas = JSON.parse(localStorage.getItem('cuentas')) || [];
let metas = JSON.parse(localStorage.getItem('metas')) || [];
let appPin = localStorage.getItem('app_pin') || null;

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

// ================= SEGURIDAD, TEMAS Y PANTALLA DE CARGA =================
window.addEventListener('load', () => {
    const savedTheme = localStorage.getItem('app_theme') || '#FFFFFF';
    cambiarTema(savedTheme);

    document.getElementById('val-fecha').valueAsDate = new Date();

    const splash = document.getElementById('splash-screen');
    const pinScreen = document.getElementById('pin-screen');
    
    if (appPin) pinScreen.classList.remove('oculto');
    
    setTimeout(() => {
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.style.display = 'none';
            if (appPin) pinScreen.style.zIndex = '100000';
            validarDiaCeroGastos();
        }, 600); 
    }, 1200); 
});

function cambiarTema(color) {
    document.documentElement.style.setProperty('--accent', color);
    localStorage.setItem('app_theme', color);
}

// Auto-Bloqueo por Inactividad (3 minutos)
let timeoutBloqueo;
function reiniciarInactividad() {
    clearTimeout(timeoutBloqueo);
    if (appPin) {
        timeoutBloqueo = setTimeout(() => {
            document.getElementById('pin-screen').classList.remove('oculto');
        }, 3 * 60 * 1000); 
    }
}
window.addEventListener('touchstart', reiniciarInactividad);
window.addEventListener('click', reiniciarInactividad);
reiniciarInactividad();

// Modo Pánico (Doble Toque para Censurar)
let lastTap = 0;
document.body.addEventListener('touchstart', (e) => {
    if(e.target.tagName.toLowerCase() === 'button' || e.target.tagName.toLowerCase() === 'input') return;
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    if (tapLength < 300 && tapLength > 0) {
        toggleCensura();
        e.preventDefault();
    }
    lastTap = currentTime;
});

function configurarPIN() {
    const nuevo = prompt("Ingresa un nuevo PIN de 4 dígitos (Deja en blanco para desactivar):");
    if (nuevo === null) return;
    if (nuevo === "") {
        localStorage.removeItem('app_pin'); appPin = null; alert("PIN desactivado.");
    } else if (nuevo.length === 4 && !isNaN(nuevo)) {
        localStorage.setItem('app_pin', nuevo); appPin = nuevo; alert("PIN configurado con éxito.");
        reiniciarInactividad();
    } else { 
        alert("Debe ser un número de 4 dígitos."); 
    }
}

function verificarPIN() {
    const input = document.getElementById('input-pin').value;
    if (input === appPin) {
        document.getElementById('pin-screen').classList.add('oculto');
        document.getElementById('input-pin').value = '';
        reiniciarInactividad();
    } else {
        alert("PIN incorrecto");
        document.getElementById('input-pin').value = '';
    }
}

function resetearPIN() {
    const respuesta = prompt('Escribe "RESETEAR" para eliminar el PIN guardado y restaurar el acceso:');
    if (respuesta === "RESETEAR") {
        localStorage.removeItem('app_pin');
        appPin = null;
        document.getElementById('pin-screen').classList.add('oculto');
        alert("PIN eliminado correctamente.");
    } else if (respuesta !== null) {
        alert("Palabra de seguridad incorrecta.");
    }
}

// Lógica Trofeo "Día Cero Gastos"
function validarDiaCeroGastos() {
    if (transacciones.length === 0) return;
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const ayerStr = ayer.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    
    const gastoAyer = transacciones.find(t => t.tipo === 'gasto' && t.fechaFormateada === ayerStr);
    
    if (!gastoAyer) {
        const trophy = document.getElementById('trophy-notification');
        trophy.classList.remove('oculto');
        setTimeout(() => { trophy.classList.add('oculto'); }, 3500);
    }
}

// ================= CENSURAR MONTOS =================
let censurado = localStorage.getItem('censurado') === 'true';

function toggleCensura(event) {
    if(event) event.stopPropagation(); 
    censurado = !censurado;
    localStorage.setItem('censurado', censurado);
    actualizarInterfaz();
}

function formatearMontoCensurado(texto, mantenerFisico = false) {
    if (!censurado) return texto;
    if (mantenerFisico && texto === "Dólares / Físico") return texto; 
    return '********';
}

// ================= VENTANAS MODALES =================
function abrirModal(id) {
    document.getElementById(id).classList.remove('oculto');
    document.body.style.overflow = 'hidden'; 
    if (id === 'modal-historial') actualizarListaTransacciones(); 
}

function cerrarModal(id) {
    document.getElementById(id).classList.add('oculto');
    document.body.style.overflow = ''; 
}

// ================= SELECTS NATIVOS Y RESTRICCIONES =================
function toggleCategoriaSelect() {
    const tipo = document.getElementById('val-tipo').value;
    const selectCategoria = document.getElementById('val-categoria');
    
    if (tipo === 'ingreso') {
        selectCategoria.classList.add('oculto');
        selectCategoria.value = ""; 
    } else {
        selectCategoria.classList.remove('oculto');
    }
}

// Categorías Inteligentes (Memoria de Moneda)
document.getElementById('val-categoria').addEventListener('change', (e) => {
    const catSelec = e.target.value;
    const lastTrans = [...transacciones].reverse().find(t => t.categoria === catSelec && t.tipo === 'gasto');
    if (lastTrans && lastTrans.monedaInputOriginal) {
        const selectMoneda = document.getElementById('val-moneda');
        const option = Array.from(selectMoneda.options).find(o => o.value === lastTrans.monedaInputOriginal);
        if (option && !option.disabled) {
            selectMoneda.value = lastTrans.monedaInputOriginal;
        }
    }
});

function actualizarOpcionesMoneda() {
    const cuentaActiva = cuentas.find(c => c.id == cuentaActivaId);
    const selectMoneda = document.getElementById('val-moneda');
    if(!cuentaActiva) return;
    if(cuentaActiva.moneda === 'USD') {
        selectMoneda.value = 'USD'; 
        Array.from(selectMoneda.options).forEach(opt => { if (opt.value === 'VES') opt.disabled = true; });
    } else {
        Array.from(selectMoneda.options).forEach(opt => opt.disabled = false);
    }
}

// ================= METAS DE AHORRO CON DESCUENTO =================
let metaAbonoActualIndex = null;
let abonoPendienteMonto = 0;

function renderizarMetas() {
    const lista = document.getElementById('lista-metas');
    lista.innerHTML = '';
    
    if(metas.length === 0) {
        lista.innerHTML = '<p style="color:var(--text-secondary); font-size:12px; text-align:center;">No tienes metas activas. ¡Crea una!</p>';
        return;
    }
    
    metas.forEach((m, i) => {
        let pct = (m.acumulado / m.objetivo) * 100;
        if(pct > 100) pct = 100;
        
        lista.innerHTML += `
        <div class="meta-item">
            <div style="display:flex; justify-content:space-between; margin-bottom: 8px;">
                <strong style="font-size:14px;">${m.nombre}</strong>
                <span style="font-size:13px; font-weight:bold;">${m.moneda} ${formatearMontoCensurado(m.acumulado.toFixed(2))} / ${formatearMontoCensurado(m.objetivo.toFixed(2))}</span>
            </div>
            <div class="progress-bg">
                <div class="progress-fill" style="width: ${pct}%;"></div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <small style="color:var(--text-secondary); font-size:11px;">${pct.toFixed(1)}% Completado</small>
                <div>
                    <button onclick="iniciarAbonoMeta(${i})" style="background:var(--accent); color:var(--bg-dark); border:none; border-radius:6px; padding:4px 8px; font-weight:bold; margin-right:5px; cursor:pointer;">Abonar</button>
                    <button onclick="eliminarMeta(${i})" style="background:rgba(255,69,58,0.2); color:#FF453A; border:none; border-radius:6px; padding:4px 8px; font-weight:bold; cursor:pointer;">🗑</button>
                </div>
            </div>
        </div>`;
    });
}

function agregarMeta() {
    const nombre = prompt("¿Para qué estás ahorrando? (Ej: Laptop, Viaje)");
    if (!nombre) return;
    const objetivo = parseFloat(prompt("¿Cuál es el monto objetivo?"));
    if (isNaN(objetivo) || objetivo <= 0) return alert("Monto inválido");
    
    metas.push({ id: Date.now(), nombre, acumulado: 0, objetivo, moneda: 'USD' });
    localStorage.setItem('metas', JSON.stringify(metas));
    renderizarMetas();
}

function iniciarAbonoMeta(index) {
    if (cuentas.length === 0) return alert("Debes crear al menos una cuenta primero.");
    
    const abono = parseFloat(prompt(`¿Cuántos USD quieres abonar a "${metas[index].nombre}"?`));
    if (isNaN(abono) || abono <= 0) return alert("Monto inválido");

    metaAbonoActualIndex = index;
    abonoPendienteMonto = abono;

    const selectCuenta = document.getElementById('sel-cuenta-abono');
    selectCuenta.innerHTML = '';
    cuentas.forEach(c => {
        selectCuenta.innerHTML += `<option value="${c.id}">${c.nombre} (${c.moneda})</option>`;
    });

    abrirModal('modal-seleccionar-cuenta-meta');
}

function procesarAbonoMeta() {
    const cuentaId = document.getElementById('sel-cuenta-abono').value;
    if (!cuentaId) return alert("Selecciona una cuenta válida.");

    const cuenta = cuentas.find(c => c.id == cuentaId);
    const meta = metas[metaAbonoActualIndex];
    
    const timeStamp = Date.now();
    const fechaFormateada = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

    // Registramos el gasto en la cuenta seleccionada
    const transaccionAhorro = {
        id: timeStamp,
        cuentaId: cuentaId,
        montoUSD: abonoPendienteMonto,
        tipo: 'gasto',
        categoria: 'Ahorro',
        nota: `Abono a meta: ${meta.nombre}`,
        monedaInputOriginal: cuenta.moneda, 
        fechaFormateada: fechaFormateada,
        fecha: new Date()
    };
    
    transacciones.push(transaccionAhorro);
    localStorage.setItem('transacciones', JSON.stringify(transacciones));

    // Sumamos a la meta
    metas[metaAbonoActualIndex].acumulado += abonoPendienteMonto;
    localStorage.setItem('metas', JSON.stringify(metas));

    cerrarModal('modal-seleccionar-cuenta-meta');
    actualizarInterfaz();
    alert(`¡Abono exitoso! Se ha descontado de ${cuenta.nombre}.`);
}

function eliminarMeta(index) {
    if(confirm("¿Seguro que deseas eliminar esta meta? (El dinero abonado no se devolverá a tus cuentas automáticamente)")) {
        metas.splice(index, 1);
        localStorage.setItem('metas', JSON.stringify(metas));
        renderizarMetas();
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
    const d = new Date(isoString);
    const today = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() > 
           new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
}

function actualizarInfoCalculadora(modo) {
    const varBox = document.getElementById('calc-variacion-box');
    const badge = document.getElementById('calc-fecha-badge');
    const banner = document.getElementById('banner-fecha-valor');

    if(modo === 'Custom') {
        varBox.classList.add('oculto'); banner.classList.add('oculto'); badge.innerText = "Personalizada"; return;
    }

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
        if(esFechaFutura(data.fecha)) { banner.classList.remove('oculto'); } else { banner.classList.add('oculto'); }
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

function cambiarPestana(idPestana, elementoNav) {
    document.querySelectorAll('.tab-content, .vista-activa').forEach(el => el.className = 'vista-oculta');
    document.getElementById(idPestana).className = 'vista-activa';
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('activo'));
    elementoNav.classList.add('activo');
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
        tasasData.USDT = procesarHistorial('USDT', dataParalelo.promedio, dataParalelo.fechaActualizacion);
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

        if (cuenta.moneda === 'VES') { strBalanceGrande = `Bs ${Math.max(0, balanceUSD * tasaBCV).toFixed(2)}`; strBalancePequeño = `$${balanceUSD.toFixed(2)} USD`; } 
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
    if (activeIndex > 0) setTimeout(() => { slider.scrollTo({ left: slider.clientWidth * activeIndex, behavior: 'instant' }); }, 10);
}

function actualizarInterfaz() {
    renderizarSliderCuentas();
    renderizarMetas();
    if (!document.getElementById('modal-historial').classList.contains('oculto')) actualizarListaTransacciones();
}

// ================= TRANSACCIONES, NOTAS, FILTROS Y SWIPE =================
function agregarTransaccion() {
    if(cuentas.length === 0) return alert("Crea una cuenta en Ajustes primero");
    
    const tipo = document.getElementById('val-tipo').value;
    let categoria = tipo === 'gasto' ? document.getElementById('val-categoria').value : "Ingreso";
    if (tipo === 'gasto' && !categoria) return alert("Por favor, selecciona una categoría.");

    const monto = parseFloat(document.getElementById('monto').value);
    const monedaInput = document.getElementById('val-moneda').value;
    const nota = document.getElementById('val-nota').value.trim();
    
    if (isNaN(monto) || monto <= 0) return alert("Monto inválido");

    let montoUSD = monto;
    if (monedaInput === 'VES') montoUSD = monto / tasaBCV;

    const fechaPersonalizada = document.getElementById('val-fecha').value; 
    let fechaTransaccion = new Date();
    
    if (fechaPersonalizada) {
        const partes = fechaPersonalizada.split('-');
        fechaTransaccion = new Date(partes[0], partes[1] - 1, partes[2], new Date().getHours(), new Date().getMinutes());
    }

    const fechaFormateada = fechaTransaccion.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStamp = fechaTransaccion.getTime(); 

    const transaccion = {
        id: timeStamp, 
        cuentaId: cuentaActivaId,
        montoUSD: montoUSD,
        tipo: tipo,
        categoria: categoria,
        nota: nota,
        monedaInputOriginal: monedaInput, 
        fechaFormateada: fechaFormateada,
        fecha: fechaTransaccion
    };
    
    transacciones.push(transaccion);
    transacciones.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    
    localStorage.setItem('transacciones', JSON.stringify(transacciones));
    
    document.getElementById('monto').value = '';
    document.getElementById('val-categoria').value = '';
    document.getElementById('val-nota').value = '';
    document.getElementById('val-fecha').valueAsDate = new Date(); 
    
    actualizarInterfaz();
}

// Lógica de "Deslizar para Borrar" (Swipe to Delete)
let swipeStartX = 0;
let currentSwipeX = 0;

function handleSwipeStart(e, element) {
    swipeStartX = e.touches[0].clientX;
    element.style.transition = 'none';
}

function handleSwipeMove(e, element) {
    currentSwipeX = e.touches[0].clientX;
    let diff = currentSwipeX - swipeStartX;
    if (diff < -80) diff = -80; 
    if (diff > 0) diff = 0; 
    element.style.transform = `translateX(${diff}px)`;
}

function handleSwipeEnd(e, element) {
    element.style.transition = 'transform 0.3s var(--ios-spring)';
    let diff = currentSwipeX - swipeStartX;
    if (diff < -40) {
        element.style.transform = `translateX(-80px)`; 
    } else {
        element.style.transform = `translateX(0px)`; 
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
        
        if(fechaFiltro && t.fecha) {
            const fechaT = new Date(t.fecha);
            const offset = fechaT.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(fechaT - offset)).toISOString().split('T')[0];
            matchDate = (localISOTime === fechaFiltro);
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
    transacciones = transacciones.filter(t => t.id !== id);
    localStorage.setItem('transacciones', JSON.stringify(transacciones));
    actualizarInterfaz();
}

// ================= GRÁFICOS (CHART.JS) =================
function renderizarGrafico(transFiltered) {
    const canvas = document.getElementById('graficoGastos');
    if (!canvas) return;
    
    const gastos = transFiltered.filter(t => t.tipo === 'gasto');
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
                backgroundColor: data.length > 0 ? ['#FF453A', '#FF9F0A', '#32D74B', '#0A84FF', '#BF5AF2'] : ['#333'],
                borderWidth: 0, 
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { color: '#fff', font: {size: 10} } } }
        }
    });
}

// ================= GESTIÓN Y LISTAS =================
function cargarSelects() {
    const valCategoria = document.getElementById('val-categoria');
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
    
    lCuentas.innerHTML = '';
    cuentas.forEach((c, i) => {
        lCuentas.innerHTML += `
            <li class="transaccion-item" style="padding: 12px 16px;">
                <div class="trans-izq"><strong>${c.nombre}</strong><small>${c.moneda}</small></div>
                <div class="acciones-gestion">
                    <button class="btn-editar" onclick="editarCuenta(${i})">✏️</button>
                    <button class="btn-eliminar" onclick="eliminarCuenta(${i})">🗑️</button>
                </div>
            </li>`;
    });
    
    lCat.innerHTML = '';
    categorias.forEach((cat, i) => {
        lCat.innerHTML += `
            <li class="transaccion-item" style="padding: 12px 16px;">
                <div class="trans-izq"><strong>${cat}</strong></div>
                <div class="acciones-gestion">
                    <button class="btn-editar" onclick="editarCategoria(${i})">✏️</button>
                    <button class="btn-eliminar" onclick="eliminarCategoria(${i})">🗑️</button>
                </div>
            </li>`;
    });
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
    // 💥 AQUI ESTÁ EL BLINDAJE DE GUARDADO SEGURO
    localStorage.setItem('cuentas', JSON.stringify(cuentas));
    localStorage.setItem('categorias', JSON.stringify(categorias));
    localStorage.setItem('transacciones', JSON.stringify(transacciones));
    localStorage.setItem('metas', JSON.stringify(metas));
    cargarSelects(); renderizarListasGestion(); actualizarInterfaz();
}

// ================= BACKUPS (IMPORTAR / EXPORTAR) =================
function exportarDatos() {
    const data = JSON.stringify({ transacciones, categorias, cuentas, metas });
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
                categorias = data.categorias; 
                cuentas = data.cuentas; 
                metas = data.metas || [];
                
                // Fijar a fuego en memoria al importar
                localStorage.setItem('transacciones', JSON.stringify(transacciones));
                localStorage.setItem('metas', JSON.stringify(metas));
                
                guardarYActualizarGestion(); 
                alert("Datos restaurados correctamente!");
            }
        } catch (err) { alert("Archivo inválido o corrupto."); }
    };
    reader.readAsText(file);
}

// ================= ARRANQUE DE LA APP =================
async function inicializarApp() {
    await obtenerTasas();
    cargarSelects();
    actualizarInterfaz();
    setTasaModo('BCV'); 
    
    setInterval(() => { obtenerTasas().then(() => actualizarInterfaz()); }, 300000); 
}
inicializarApp();