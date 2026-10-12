// Base de Datos Local
let transacciones = JSON.parse(localStorage.getItem('transacciones')) || [];
let categorias = JSON.parse(localStorage.getItem('categorias')) || [];
let cuentas = JSON.parse(localStorage.getItem('cuentas')) || [];

// Variables Globales
let tasaBCV = 1;
let tasaParalelo = 1;
let tasaEUR = 1; 
let cuentaActivaId = cuentas.length > 0 ? cuentas[0].id : null;
let censurado = false;

// ================= CENSURAR MONTOS (OJO BINANCE) =================
function toggleCensura(event) {
    if(event) event.stopPropagation(); 
    censurado = !censurado;
    actualizarInterfaz();
}

function formatearMontoCensurado(texto, mantenerFisico = false) {
    if (!censurado) return texto;
    if (mantenerFisico && texto === "Dólares / Físico") return texto; 
    return '********';
}

// ================= MODAL NATIVO APPLE PARA SELECTS =================
function abrirModalGenerico(tipoSelect) {
    document.activeElement.blur(); 
    
    // FIX: Bloquea el scroll del fondo (iOS safe)
    document.body.classList.add('no-scroll');

    const modal = document.getElementById('modal-generico');
    const lista = document.getElementById('lista-opciones-genericas');
    const titulo = document.getElementById('modal-generico-titulo');
    lista.innerHTML = '';

    if(tipoSelect === 'moneda') {
        titulo.innerText = 'Moneda del Movimiento';
        lista.innerHTML += `<li onclick="seleccionarOpcionGenerica('moneda', 'USD', 'USD')">USD</li>`;
        lista.innerHTML += `<li onclick="seleccionarOpcionGenerica('moneda', 'VES', 'VES')">VES</li>`;
    } 
    else if (tipoSelect === 'tipo') {
        titulo.innerText = 'Tipo de Movimiento';
        lista.innerHTML += `<li onclick="seleccionarOpcionGenerica('tipo', 'gasto', 'Gasto')">Gasto</li>`;
        lista.innerHTML += `<li onclick="seleccionarOpcionGenerica('tipo', 'ingreso', 'Ingreso')">Ingreso</li>`;
    } 
    else if (tipoSelect === 'categoria') {
        titulo.innerText = 'Seleccionar Categoría';
        if (categorias.length === 0) {
            lista.innerHTML = '<li style="color:#8E8E93; cursor:default;">Sin categorías creadas</li>';
        } else {
            categorias.forEach(cat => {
                lista.innerHTML += `<li onclick="seleccionarOpcionGenerica('categoria', '${cat}', '${cat}')">${cat}</li>`;
            });
        }
    } 

    modal.style.display = 'flex';
}

function cerrarModalGenerico() {
    const modal = document.getElementById('modal-generico');
    const contenido = document.getElementById('modal-generico-contenido');
    contenido.classList.add('cerrando');
    
    setTimeout(() => {
        modal.style.display = 'none';
        contenido.classList.remove('cerrando');
        // FIX: Libera el scroll del fondo
        document.body.classList.remove('no-scroll');
    }, 280);
}

function seleccionarOpcionGenerica(tipo, valor, texto) {
    document.getElementById('val-' + tipo).value = valor;
    document.getElementById('text-' + tipo).innerText = texto;
    cerrarModalGenerico();

    if (tipo === 'tipo') {
        const boxCategoria = document.getElementById('box-categoria');
        if (valor === 'ingreso') {
            boxCategoria.classList.add('oculto');
        } else {
            boxCategoria.classList.remove('oculto');
        }
    }
}

// ================= CALCULADORA AL CAMBIO =================
let calcModoTasa = 'BCV'; 
let calcUltimaEdicion = 'USD'; 

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
        inputTasa.value = tasaBCV.toFixed(2); inputTasa.disabled = true; 
        lblDivisa.innerText = '🇺🇸 Dólares (USD)'; symDivisa.innerText = '$';
    }
    if(modo === 'USDT') { 
        inputTasa.value = tasaParalelo.toFixed(2); inputTasa.disabled = true; 
        lblDivisa.innerText = '🪙 Tether (USDT)'; symDivisa.innerText = '₮';
    }
    if(modo === 'EUR') { 
        inputTasa.value = tasaEUR.toFixed(2); inputTasa.disabled = true; 
        lblDivisa.innerText = '🇪🇺 Euros (EUR)'; symDivisa.innerText = '€';
    }
    if(modo === 'Custom') { 
        inputTasa.disabled = false; inputTasa.focus(); 
        lblDivisa.innerText = '💱 Divisa Base'; symDivisa.innerText = '$';
    }

    recalcularDesdeTasa();
}

function getTasaActiva() { return parseFloat(document.getElementById('input-tasa-activa').value) || 1; }

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

function recalcularDesdeTasa() { calcularDesde(calcUltimaEdicion); }
function limpiarCalc() { document.getElementById('calc-usd').value = ''; document.getElementById('calc-ves').value = ''; }

// ================= NAVEGACIÓN Y API =================
function cambiarPestana(idPestana, elementoNav) {
    document.querySelectorAll('.tab-content, .vista-activa').forEach(el => el.className = 'vista-oculta');
    document.getElementById(idPestana).className = 'vista-activa';
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('activo'));
    elementoNav.classList.add('activo');
}

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

async function actualizarTasasManual() {
    const btn = document.getElementById('btn-refresh-tasas');
    btn.classList.add('spin'); 
    await obtenerTasas();
    actualizarInterfaz();
    setTimeout(() => { btn.classList.remove('spin'); }, 1000); 
}

async function obtenerTasas() {
    try {
        const resBCV = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
        const dataBCV = await resBCV.json();
        const resEUR = await fetch('https://ve.dolarapi.com/v1/euros/oficial');
        const dataEUR = await resEUR.json();
        const resParalelo = await fetch('https://ve.dolarapi.com/v1/dolares/paralelo');
        const dataParalelo = await resParalelo.json();

        tasaBCV = dataBCV.promedio;
        tasaParalelo = dataParalelo.promedio;
        tasaEUR = dataEUR.promedio;

        document.getElementById('val-bcv').innerText = `Bs ${tasaBCV.toFixed(2)}`;
        document.getElementById('val-eur').innerText = `Bs ${tasaEUR.toFixed(2)}`;
        document.getElementById('val-usdt').innerText = `Bs ${tasaParalelo.toFixed(2)}`;
        
        if(calcModoTasa === 'BCV') document.getElementById('input-tasa-activa').value = tasaBCV.toFixed(2);
        if(calcModoTasa === 'USDT') document.getElementById('input-tasa-activa').value = tasaParalelo.toFixed(2);
        if(calcModoTasa === 'EUR') document.getElementById('input-tasa-activa').value = tasaEUR.toFixed(2);
        
        recalcularDesdeTasa(); 
    } catch (error) { console.error("Error de conexión", error); }
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

    // FIX: Scroll con snap mejorado y frenado magnético
    slider.addEventListener('scroll', () => {
        const width = slider.clientWidth;
        const index = Math.round(slider.scrollLeft / width);
        
        document.querySelectorAll('.dot').forEach((d, i) => {
            d.classList.toggle('activo', i === index);
        });

        if (cuentas[index] && cuentaActivaId !== cuentas[index].id) {
            cuentaActivaId = cuentas[index].id;
            actualizarListaTransacciones();
        }
    });

    // Mueve el scroll a la cuenta activa al iniciar
    const activeIndex = cuentas.findIndex(c => c.id == cuentaActivaId);
    if (activeIndex > 0) {
        setTimeout(() => {
            slider.scrollTo({ left: slider.clientWidth * activeIndex, behavior: 'instant' });
        }, 10);
    }

    actualizarListaTransacciones();
}

function actualizarInterfaz() {
    renderizarSliderCuentas();
}

function actualizarListaTransacciones() {
    const lista = document.getElementById('lista-transacciones');
    lista.innerHTML = '';
    
    if(!cuentaActivaId) return;

    const transCuenta = transacciones.filter(t => t.cuentaId == cuentaActivaId).slice().reverse();
    
    transCuenta.forEach((t, index) => {
        const claseColor = t.tipo === 'ingreso' ? 'monto-ingreso' : 'monto-gasto';
        const signo = t.tipo === 'ingreso' ? '+' : '-';
        const animDelay = index * 0.08; 
        
        const montoTexto = formatearMontoCensurado(`${signo}$${t.montoUSD.toFixed(2)}`, false);

        lista.innerHTML += `
            <li class="transaccion-item" style="animation: slideInRight 0.4s var(--ios-spring) ${animDelay}s both;">
                <div class="trans-izq">
                    <strong>${t.categoria}</strong>
                    <small>${t.fechaFormateada}</small>
                </div>
                <div style="display: flex; align-items: center;">
                    <span class="monto-val ${claseColor}">${montoTexto}</span>
                    <button class="btn-eliminar-trans" onclick="eliminarTransaccion(${t.id})">×</button>
                </div>
            </li>
        `;
    });
}

// ================= TRANSACCIONES Y GESTIÓN =================
function cargarSelects() {
    const valCategoria = document.getElementById('val-categoria');
    const textCategoria = document.getElementById('text-categoria');
    
    if (categorias.length > 0) {
        if (valCategoria.value === "") {
            valCategoria.value = categorias[0];
            textCategoria.innerText = categorias[0];
        }
    } else {
        valCategoria.value = "";
        textCategoria.innerText = "Sin categorías";
    }
}

function agregarTransaccion() {
    if(cuentas.length === 0) return alert("Crea una cuenta en Ajustes primero");
    
    const tipo = document.getElementById('val-tipo').value;
    let categoria = "";

    if (tipo === 'gasto') {
        if(categorias.length === 0) return alert("Crea una categoría en Ajustes primero");
        categoria = document.getElementById('val-categoria').value;
    } else {
        categoria = "Ingreso";
    }

    const monto = parseFloat(document.getElementById('monto').value);
    const moneda = document.getElementById('val-moneda').value;
    
    if (isNaN(monto) || monto <= 0) return alert("Monto inválido");

    const transaccion = {
        id: Date.now(),
        cuentaId: cuentaActivaId,
        montoUSD: moneda === 'VES' ? monto / tasaBCV : monto,
        tipo: tipo,
        categoria: categoria,
        fechaFormateada: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    };
    
    transacciones.push(transaccion);
    localStorage.setItem('transacciones', JSON.stringify(transacciones));
    document.getElementById('monto').value = '';
    actualizarInterfaz();
}

function eliminarTransaccion(id) {
    transacciones = transacciones.filter(t => t.id !== id);
    localStorage.setItem('transacciones', JSON.stringify(transacciones));
    actualizarInterfaz();
}

function renderizarListasGestion() {
    const lCuentas = document.getElementById('lista-gestion-cuentas');
    const lCat = document.getElementById('lista-gestion-categorias');
    
    lCuentas.innerHTML = '';
    cuentas.forEach((c, i) => {
        const animDelay = i * 0.08;
        lCuentas.innerHTML += `
            <li class="transaccion-item" style="animation: slideInRight 0.4s var(--ios-spring) ${animDelay}s both;">
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
        const animDelay = i * 0.08;
        lCat.innerHTML += `
            <li class="transaccion-item" style="animation: slideInRight 0.4s var(--ios-spring) ${animDelay}s both;">
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

// ARRANQUE
inicializarApp();