// Base de Datos Local
let transacciones = JSON.parse(localStorage.getItem('transacciones')) || [];
let categorias = JSON.parse(localStorage.getItem('categorias')) || [];
let cuentas = JSON.parse(localStorage.getItem('cuentas')) || [];
let appPin = localStorage.getItem('app_pin') || null;

// Variables Globales
let tasaBCV = 1;
let tasaParalelo = 1; 
let tasaEUR = 1; 
let cuentaActivaId = cuentas.length > 0 ? cuentas[0].id : null;
let chartInstancia = null; // Instancia del gráfico Chart.js

// Objeto Maestro para Calculadora Inteligente
let tasasData = {
    BCV: { valor: 1, previo: 1, fecha: null },
    USDT: { valor: 1, previo: 1, fecha: null },
    EUR: { valor: 1, previo: 1, fecha: null },
    Custom: { valor: 1, previo: 1, fecha: new Date().toISOString() }
};

// ================= SEGURIDAD Y PANTALLA DE CARGA =================
window.addEventListener('load', () => {
    const splash = document.getElementById('splash-screen');
    const pinScreen = document.getElementById('pin-screen');
    
    // Si hay PIN configurado, preparamos la pantalla negra INMEDIATAMENTE
    // Al tener z-index 99998, se posicionará mágicamente "debajo" del splash screen (99999)
    if (appPin) {
        pinScreen.classList.remove('oculto');
    }
    
    setTimeout(() => {
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.style.display = 'none';
            // Una vez que el splash se va por completo, si hay PIN lo subimos a 100000 por seguridad máxima
            if (appPin) {
                pinScreen.style.zIndex = '100000';
            }
        }, 600); 
    }, 1200); 
});

function configurarPIN() {
    const nuevo = prompt("Ingresa un nuevo PIN de 4 dígitos (Deja en blanco para desactivar):");
    
    if (nuevo === null) return;
    
    if (nuevo === "") {
        localStorage.removeItem('app_pin'); 
        appPin = null; 
        alert("PIN desactivado.");
    } else if (nuevo.length === 4 && !isNaN(nuevo)) {
        localStorage.setItem('app_pin', nuevo); 
        appPin = nuevo; 
        alert("PIN configurado con éxito.");
    } else { 
        alert("Debe ser un número de 4 dígitos."); 
    }
}

function verificarPIN() {
    const input = document.getElementById('input-pin').value;
    
    if (input === appPin) {
        document.getElementById('pin-screen').classList.add('oculto');
    } else {
        alert("PIN incorrecto");
        document.getElementById('input-pin').value = '';
    }
}

// Nueva función de reseteo de seguridad
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

// ================= CENSURAR MONTOS (OJO BINANCE) =================
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
    document.body.style.overflow = 'hidden'; // Evita scrollear el fondo
    
    if (id === 'modal-historial') {
        actualizarListaTransacciones(); // Refrescar gráfica y filtros al abrir
    }
}

function cerrarModal(id) {
    document.getElementById(id).classList.add('oculto');
    document.body.style.overflow = ''; // Regresa la normalidad
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

function actualizarOpcionesMoneda() {
    const cuentaActiva = cuentas.find(c => c.id == cuentaActivaId);
    const selectMoneda = document.getElementById('val-moneda');
    
    if(!cuentaActiva) return;

    if(cuentaActiva.moneda === 'USD') {
        selectMoneda.value = 'USD'; 
        Array.from(selectMoneda.options).forEach(opt => {
            if (opt.value === 'VES') opt.disabled = true; 
        });
    } else {
        Array.from(selectMoneda.options).forEach(opt => opt.disabled = false);
    }
}

// ================= CALCULADORA AL CAMBIO (LÓGICA) =================
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
        varBox.classList.add('oculto');
        banner.classList.add('oculto');
        badge.innerText = "Personalizada";
        return;
    }

    varBox.classList.remove('oculto');
    const data = tasasData[modo];
    if(!data) return;

    const diffAbs = data.valor - data.previo;
    const diffPct = data.previo ? (diffAbs / data.previo) * 100 : 0;

    if(diffAbs > 0) {
        varBox.innerText = `↑ +${diffAbs.toFixed(2)} Bs (${diffPct.toFixed(2)}%)`;
        varBox.className = 'tasa-variacion var-positiva';
    } else if(diffAbs < 0) {
        varBox.innerText = `↓ ${diffAbs.toFixed(2)} Bs (${Math.abs(diffPct).toFixed(2)}%)`;
        varBox.className = 'tasa-variacion var-negativa';
    } else {
        varBox.innerText = `− 0.00 Bs (0.00%)`;
        varBox.className = 'tasa-variacion var-neutra';
    }

    if(data.fecha) {
        badge.innerText = formatFechaCorta(data.fecha);
        if(esFechaFutura(data.fecha)) {
            banner.classList.remove('oculto');
        } else {
            banner.classList.add('oculto');
        }
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

    if(modo === 'BCV') { 
        inputTasa.value = tasasData.BCV.valor.toFixed(2); inputTasa.disabled = true; 
        lblDivisa.innerText = '🇺🇸 Dólares (USD)'; symDivisa.innerText = '$';
    }
    if(modo === 'USDT') { 
        inputTasa.value = tasasData.USDT.valor.toFixed(2); inputTasa.disabled = true; 
        lblDivisa.innerText = '🪙 Tether (USDT)'; symDivisa.innerText = '₮';
    }
    if(modo === 'EUR') { 
        inputTasa.value = tasasData.EUR.valor.toFixed(2); inputTasa.disabled = true; 
        lblDivisa.innerText = '🇪🇺 Euros (EUR)'; symDivisa.innerText = '€';
    }
    if(modo === 'Custom') { 
        inputTasa.disabled = false; inputTasa.focus(); 
        if(parseFloat(inputTasa.value) === 0) inputTasa.value = "1.00";
        lblDivisa.innerText = '💱 Divisa Base'; symDivisa.innerText = '$';
    }

    actualizarInfoCalculadora(modo);
    recalcularDesdeTasa();
}

function getTasaActiva() { 
    return parseFloat(document.getElementById('input-tasa-activa').value) || 1; 
}

function calcularDesde(origen) {
    calcUltimaEdicion = origen;
    const tasa = getTasaActiva();
    const inputUSD = document.getElementById('calc-usd');
    const inputVES = document.getElementById('calc-ves');

    if(origen === 'USD') {
        let valUSD = parseFloat(inputUSD.value) || 0;
        if(inputUSD.value === '') inputVES.value = '';
        else inputVES.value = (valUSD * tasa).toFixed(2);
    } else if (origen === 'VES') {
        let valVES = parseFloat(inputVES.value) || 0;
        if(inputVES.value === '') inputUSD.value = '';
        else inputUSD.value = (valVES / tasa).toFixed(2);
    }
}

function recalcularDesdeTasa() { 
    calcularDesde(calcUltimaEdicion); 
}

function limpiarCalc() { 
    document.getElementById('calc-usd').value = ''; 
    document.getElementById('calc-ves').value = ''; 
}

// ================= NAVEGACIÓN Y API =================
function cambiarPestana(idPestana, elementoNav) {
    document.querySelectorAll('.tab-content, .vista-activa').forEach(el => el.className = 'vista-oculta');
    document.getElementById(idPestana).className = 'vista-activa';
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('activo'));
    elementoNav.classList.add('activo');
}

// CEREBRO INTELIGENTE DE VARIACIONES DIARIAS
function procesarHistorial(key, currentValor, currentFecha) {
    let history = JSON.parse(localStorage.getItem(`history_${key}`));
    const hoy = new Date().toDateString();

    if (!history) {
        history = { prev: currentValor, last: currentValor, date: hoy };
    }

    if (history.date !== hoy) {
        history.prev = history.last; 
        history.date = hoy;
    }

    if (currentValor > 0) { 
        history.last = currentValor; 
    }
    
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

        const [dataBCV, dataEUR, dataParalelo] = await Promise.all([
            resBCV.json(), resEUR.json(), resParalelo.json()
        ]);

        tasasData.BCV = procesarHistorial('BCV', dataBCV.promedio, dataBCV.fechaActualizacion);
        tasasData.EUR = procesarHistorial('EUR', dataEUR.promedio, dataEUR.fechaActualizacion);
        tasasData.USDT = procesarHistorial('USDT', dataParalelo.promedio, dataParalelo.fechaActualizacion);
        tasasData.Custom.fecha = new Date().toISOString();

        tasaBCV = tasasData.BCV.valor;
        tasaEUR = tasasData.EUR.valor;
        tasaParalelo = tasasData.USDT.valor;

        const setVariacionHome = (id, dataObj) => {
            const el = document.getElementById(id);
            const diffAbs = dataObj.valor - dataObj.previo;
            const pct = dataObj.previo ? ((diffAbs / dataObj.previo) * 100).toFixed(2) : "0.00";
            
            if (diffAbs > 0) {
                el.innerText = `+${pct}%`; el.className = 'tasa-variacion var-positiva';
            } else if (diffAbs < 0) {
                el.innerText = `${pct}%`; el.className = 'tasa-variacion var-negativa';
            } else {
                el.innerText = `0.00%`; el.className = 'tasa-variacion var-neutra';
            }
        };

        setVariacionHome('var-bcv', tasasData.BCV);
        setVariacionHome('var-eur', tasasData.EUR);
        setVariacionHome('var-usdt', tasasData.USDT);

        document.getElementById('val-bcv').innerText = `Bs ${tasaBCV.toFixed(2)}`;
        document.getElementById('val-eur').innerText = `Bs ${tasaEUR.toFixed(2)}`;
        document.getElementById('val-usdt').innerText = `Bs ${tasaParalelo.toFixed(2)}`;
        
        if (dataBCV.fechaActualizacion) {
            const f = new Date(dataBCV.fechaActualizacion);
            document.getElementById('fecha-tasas').innerText = `🗓️ ${f.toLocaleString('es-VE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
        }

        actualizarInfoCalculadora(calcModoTasa);
        if(calcModoTasa !== 'Custom') {
            document.getElementById('input-tasa-activa').value = tasasData[calcModoTasa].valor.toFixed(2);
        }
        recalcularDesdeTasa(); 

    } catch (error) { 
        console.error("Error de conexión al obtener tasas", error); 
        document.getElementById('fecha-tasas').innerText = `⚠️ Error de conexión`;
    }
}

async function actualizarTasasManual() {
    const btn = document.getElementById('btn-refresh-tasas');
    btn.classList.add('spin'); 
    await obtenerTasas();
    actualizarInterfaz();
    setTimeout(() => { btn.classList.remove('spin'); }, 1000); 
}

// ================= DASHBOARD Y SLIDER CUENTAS =================
function renderizarSliderCuentas() {
    const slider = document.getElementById('slider-cuentas');
    const dots = document.getElementById('slider-dots');
    
    slider.innerHTML = '';
    dots.innerHTML = '';

    const iconOjo = censurado 
        ? `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>` 
        : `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;

    if (cuentas.length === 0) {
        slider.innerHTML = `
            <div class="balance-section blur-effect">
                <h2>Sin Cuenta</h2>
                <h1>$0.00</h1>
                <span class="balance-tipo">--</span>
            </div>
        `;
        cuentaActivaId = null;
        actualizarListaTransacciones();
        return;
    }

    cuentas.forEach((cuenta, index) => {
        let balanceUSD = 0;
        
        transacciones.forEach(t => {
            if (t.cuentaId == cuenta.id) {
                balanceUSD += t.tipo === 'ingreso' ? t.montoUSD : -t.montoUSD;
            }
        });

        let strBalanceGrande = "";
        let strBalancePequeño = "";

        if (cuenta.moneda === 'VES') {
            let balanceVES = balanceUSD * tasaBCV;
            strBalanceGrande = `Bs ${balanceVES.toFixed(2)}`;
            strBalancePequeño = `$${balanceUSD.toFixed(2)} USD`;
        } else if (cuenta.moneda === 'USDT') {
            strBalanceGrande = `USDT ${balanceUSD.toFixed(2)}`;
            let balanceVES_USDT = balanceUSD * tasaParalelo;
            strBalancePequeño = `≈ Bs ${balanceVES_USDT.toFixed(2)}`;
        } else if (cuenta.moneda === 'EUR') {
            strBalanceGrande = `€${(balanceUSD).toFixed(2)}`;
            let balanceVES_EUR = balanceUSD * tasaEUR;
            strBalancePequeño = `≈ Bs ${balanceVES_EUR.toFixed(2)}`;
        } else {
            strBalanceGrande = `$${balanceUSD.toFixed(2)}`;
            strBalancePequeño = "Dólares / Físico";
        }

        slider.innerHTML += `
            <div class="balance-section blur-effect" id="tarjeta-cuenta-${cuenta.id}">
                <h2>${cuenta.nombre} <button class="btn-ojo" onclick="toggleCensura(event)">${iconOjo}</button></h2>
                <h1>${formatearMontoCensurado(strBalanceGrande, false)}</h1>
                <span class="balance-tipo">${formatearMontoCensurado(strBalancePequeño, true)}</span>
            </div>
        `;
        dots.innerHTML += `<div class="dot ${index === 0 ? 'activo' : ''}"></div>`;
    });

    if (!cuentaActivaId || !cuentas.find(c => c.id == cuentaActivaId)) {
        cuentaActivaId = cuentas[0].id;
    }

    actualizarOpcionesMoneda();

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const targetId = entry.target.id.replace('tarjeta-cuenta-', '');
                const index = cuentas.findIndex(c => c.id == targetId);
                
                document.querySelectorAll('.dot').forEach((d, i) => {
                    d.classList.toggle('activo', i === index);
                });

                if (cuentaActivaId != targetId) {
                    cuentaActivaId = targetId;
                    actualizarOpcionesMoneda(); 
                    actualizarListaTransacciones();
                }
            }
        });
    }, { root: slider, threshold: 0.6 });

    document.querySelectorAll('.balance-section').forEach(section => observer.observe(section));

    const activeIndex = cuentas.findIndex(c => c.id == cuentaActivaId);
    if (activeIndex > 0) {
        setTimeout(() => {
            slider.scrollTo({ left: slider.clientWidth * activeIndex, behavior: 'instant' });
        }, 10);
    }
}

function actualizarInterfaz() {
    renderizarSliderCuentas();
    
    // Si el modal de historial está abierto, refrescarlo también
    if (!document.getElementById('modal-historial').classList.contains('oculto')) {
        actualizarListaTransacciones();
    }
}

// ================= TRANSACCIONES, NOTAS Y FILTROS =================
function agregarTransaccion() {
    if(cuentas.length === 0) return alert("Crea una cuenta en Ajustes primero");
    
    const tipo = document.getElementById('val-tipo').value;
    let categoria = "";

    if (tipo === 'gasto') {
        if(categorias.length === 0) return alert("Crea una categoría en Ajustes primero");
        categoria = document.getElementById('val-categoria').value;
        if(!categoria) return alert("Por favor, selecciona una categoría.");
    } else {
        categoria = "Ingreso";
    }

    const monto = parseFloat(document.getElementById('monto').value);
    const moneda = document.getElementById('val-moneda').value;
    const nota = document.getElementById('val-nota').value.trim();
    
    if (isNaN(monto) || monto <= 0) return alert("Monto inválido");

    const fechaFormateada = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStamp = Date.now();

    const transaccion = {
        id: timeStamp,
        cuentaId: cuentaActivaId,
        montoUSD: moneda === 'VES' ? monto / tasaBCV : monto,
        tipo: tipo,
        categoria: categoria,
        nota: nota,
        fechaFormateada: fechaFormateada,
        fecha: new Date()
    };
    
    transacciones.push(transaccion);
    localStorage.setItem('transacciones', JSON.stringify(transacciones));
    
    document.getElementById('monto').value = '';
    document.getElementById('val-categoria').value = '';
    document.getElementById('val-nota').value = '';
    
    actualizarInterfaz();
}

function actualizarListaTransacciones() {
    const lista = document.getElementById('lista-transacciones');
    lista.innerHTML = ''; 
    
    if(!cuentaActivaId) return;

    const query = document.getElementById('buscar-historial') ? document.getElementById('buscar-historial').value.toLowerCase() : "";
    const mesFiltro = document.getElementById('filtro-mes') ? document.getElementById('filtro-mes').value : "todos";
    const mesActual = new Date().getMonth();

    let transCuenta = transacciones.filter(t => t.cuentaId == cuentaActivaId).slice().reverse();
    
    // Aplicar Filtros (Búsqueda y Fecha)
    transCuenta = transCuenta.filter(t => {
        const matchSearch = t.categoria.toLowerCase().includes(query) || (t.nota && t.nota.toLowerCase().includes(query));
        
        let matchDate = true;
        if(mesFiltro === 'mes' && t.fecha) {
            matchDate = new Date(t.fecha).getMonth() === mesActual;
        }
        
        return matchSearch && matchDate;
    });

    // Renderizar lista filtrada
    transCuenta.forEach((t, index) => {
        const claseColor = t.tipo === 'ingreso' ? 'monto-ingreso' : 'monto-gasto';
        const signo = t.tipo === 'ingreso' ? '+' : '-';
        const animDelay = index * 0.05; 
        
        const montoTexto = formatearMontoCensurado(`${signo}$${t.montoUSD.toFixed(2)}`, false);
        const htmlNota = t.nota ? `<div style="font-size: 11px; color: var(--text-secondary); margin-top:2px;">📝 ${t.nota}</div>` : '';
        
        lista.innerHTML += `
            <li class="transaccion-item" style="animation: slideInRight 0.3s var(--ios-spring) ${animDelay}s both;">
                <div class="trans-izq">
                    <strong>${t.categoria}</strong>
                    <small>${t.fechaFormateada}</small>
                    ${htmlNota}
                </div>
                <div style="display: flex; align-items: center;">
                    <span class="monto-val ${claseColor}">${montoTexto}</span>
                    <button class="btn-eliminar-trans" onclick="eliminarTransaccion(${t.id})">×</button>
                </div>
            </li>
        `;
    });
    
    // Actualizar gráfico con la data filtrada
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
    
    // Extraer solo gastos para la gráfica
    const gastos = transFiltered.filter(t => t.tipo === 'gasto');
    
    // Agrupar por categoría
    const dataAgrupada = {};
    gastos.forEach(t => { 
        dataAgrupada[t.categoria] = (dataAgrupada[t.categoria] || 0) + t.montoUSD; 
    });
    
    const labels = Object.keys(dataAgrupada);
    const data = Object.values(dataAgrupada);

    // Destruir gráfico previo si existe para evitar superposiciones
    if (chartInstancia) {
        chartInstancia.destroy(); 
    }

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
            responsive: true, 
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'right', 
                    labels: { color: '#fff', font: {size: 10} } 
                }
            }
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
            option.value = cat;
            option.innerText = cat;
            valCategoria.appendChild(option);
        });
    }
}

function renderizarListasGestion() {
    const lCuentas = document.getElementById('lista-gestion-cuentas');
    const lCat = document.getElementById('lista-gestion-categorias');
    
    lCuentas.innerHTML = '';
    cuentas.forEach((c, i) => {
        const animDelay = i * 0.05;
        lCuentas.innerHTML += `
            <li class="transaccion-item" style="animation: slideInRight 0.3s var(--ios-spring) ${animDelay}s both;">
                <div class="trans-izq">
                    <strong>${c.nombre}</strong><small>${c.moneda}</small>
                </div>
                <div class="acciones-gestion">
                    <button class="btn-editar" onclick="editarCuenta(${i})">✏️</button>
                    <button class="btn-eliminar" onclick="eliminarCuenta(${i})">🗑️</button>
                </div>
            </li>`;
    });
    
    lCat.innerHTML = '';
    categorias.forEach((cat, i) => {
        const animDelay = i * 0.05;
        lCat.innerHTML += `
            <li class="transaccion-item" style="animation: slideInRight 0.3s var(--ios-spring) ${animDelay}s both;">
                <div class="trans-izq">
                    <strong>${cat}</strong>
                </div>
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
    
    if(nombre.trim() !== "") {
        cuentas.push({ id: Date.now(), nombre: nombre, moneda: moneda });
        document.getElementById('nueva-cuenta-nombre').value = '';
        guardarYActualizarGestion();
    } else {
        alert("Por favor, ingresa un nombre para la cuenta.");
    }
}

function editarCuenta(i) {
    const n = prompt("Nuevo nombre:", cuentas[i].nombre);
    if(n) { cuentas[i].nombre = n; guardarYActualizarGestion(); }
}

function eliminarCuenta(i) {
    if(confirm("¿Eliminar cuenta?")) {
        if(cuentas[i].id == cuentaActivaId) cuentaActivaId = null;
        cuentas.splice(i, 1); guardarYActualizarGestion();
    }
}

function agregarCategoria() {
    const nueva = document.getElementById('nueva-categoria').value;
    if(nueva.trim()) { 
        categorias.push(nueva); 
        document.getElementById('nueva-categoria').value = ''; 
        guardarYActualizarGestion(); 
    }
}

function editarCategoria(i) {
    const n = prompt("Nuevo nombre:", categorias[i]);
    if(n) { categorias[i] = n; guardarYActualizarGestion(); }
}

function eliminarCategoria(i) {
    if(confirm("¿Eliminar categoría?")) { 
        categorias.splice(i, 1); 
        guardarYActualizarGestion(); 
    }
}

function guardarYActualizarGestion() {
    localStorage.setItem('cuentas', JSON.stringify(cuentas));
    localStorage.setItem('categorias', JSON.stringify(categorias));
    cargarSelects(); 
    renderizarListasGestion(); 
    actualizarInterfaz();
}

// ================= BACKUPS (IMPORTAR / EXPORTAR) =================
function exportarDatos() {
    const data = JSON.stringify({ transacciones, categorias, cuentas });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url; 
    a.download = `ASSIST_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click(); 
    
    URL.revokeObjectURL(url);
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
                
                guardarYActualizarGestion(); 
                alert("Datos restaurados correctamente!");
            }
        } catch (err) { 
            alert("Archivo inválido o corrupto."); 
        }
    };
    reader.readAsText(file);
}

// ================= ARRANQUE DE LA APP =================
async function inicializarApp() {
    await obtenerTasas();
    cargarSelects();
    renderizarSliderCuentas();
    renderizarListasGestion();
    setTasaModo('BCV'); 
    
    setInterval(() => {
        obtenerTasas().then(() => actualizarInterfaz());
    }, 300000); 
}

inicializarApp();