// Base de Datos Local
let transacciones = JSON.parse(localStorage.getItem('transacciones')) || [];
let categorias = JSON.parse(localStorage.getItem('categorias')) || [];
let cuentas = JSON.parse(localStorage.getItem('cuentas')) || [{ id: 1, nombre: 'Principal USD', moneda: 'USD' }];

// Variables Globales
let tasaBCV = 1;
let tasaParalelo = 1;
let tasaEUR = 1; 
let cuentaActivaId = cuentas.length > 0 ? cuentas[0].id : null;

// ================= MODAL NATIVO APPLE PARA SELECTS (NUEVO Y BLINDADO) =================
function abrirModalGenerico(tipoSelect) {
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
    else if (tipoSelect === 'nueva-moneda') {
        titulo.innerText = 'Moneda de la Cuenta';
        lista.innerHTML += `<li onclick="seleccionarOpcionGenerica('nueva-moneda', 'VES', 'Bs')">Bs</li>`;
        lista.innerHTML += `<li onclick="seleccionarOpcionGenerica('nueva-moneda', 'USD', 'USD')">USD</li>`;
        lista.innerHTML += `<li onclick="seleccionarOpcionGenerica('nueva-moneda', 'USDT', 'USDT')">USDT</li>`;
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
    }, 280);
}

function seleccionarOpcionGenerica(tipo, valor, texto) {
    document.getElementById('val-' + tipo).value = valor;
    document.getElementById('text-' + tipo).innerText = texto;
    cerrarModalGenerico();

    // Lógica dinámica: Ocultar categoría si es Ingreso
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
    actualizarInterfaz();
    renderizarListasGestion();
    setTasaModo('BCV'); 
    
    // Auto Refresh 5 minutos
    setInterval(() => {
        obtenerTasas().then(() => actualizarInterfaz());
    }, 300000);
}

// Botón de Recarga Manual con animación
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

// ================= DASHBOARD Y CUENTAS =================
function abrirSelectorCuentas() {
    const modal = document.getElementById('modal-cuentas');
    const lista = document.getElementById('lista-seleccion-cuentas');
    lista.innerHTML = '';
    
    if (cuentas.length === 0) lista.innerHTML = '<li style="color:#8E8E93; cursor:default;">Ve a Ajustes para crear cuentas</li>';
    else cuentas.forEach(c => { lista.innerHTML += `<li onclick="seleccionarCuenta(${c.id})">${c.nombre} (${c.moneda})</li>`; });
    
    modal.style.display = 'flex';
}
function cerrarSelectorCuentas() {
    const modal = document.getElementById('modal-cuentas');
    const contenido = document.getElementById('modal-cuentas-contenido');
    contenido.classList.add('cerrando');
    setTimeout(() => {
        modal.style.display = 'none';
        contenido.classList.remove('cerrando'); 
    }, 280);
}

function seleccionarCuenta(id) { cuentaActivaId = id; cerrarSelectorCuentas(); actualizarInterfaz(); }

function actualizarInterfaz() {
    if(!cuentaActivaId && cuentas.length > 0) cuentaActivaId = cuentas[0].id;
    const cuentaActiva = cuentas.find(c => c.id == cuentaActivaId);
    
    if (!cuentaActiva) {
        document.getElementById('titulo-cuenta').innerHTML = `Sin cuenta <span style="font-size: 10px;">▼</span>`;
        document.getElementById('balance-cuenta').innerText = "$0.00";
        document.getElementById('subtitulo-cuenta').innerText = "--";
    } else {
        document.getElementById('titulo-cuenta').innerHTML = `${cuentaActiva.nombre} <span style="font-size: 10px;">▼</span>`;
        
        let balanceUSD = 0;
        transacciones.forEach(t => {
            if (t.cuentaId == cuentaActiva.id) {
                balanceUSD += t.tipo === 'ingreso' ? t.montoUSD : -t.montoUSD;
            }
        });

        // REGLA CUMPLIDA: USDT GRANDE A LA IZQUIERDA
        if (cuentaActiva.moneda === 'VES') {
            let balanceVES = balanceUSD * tasaBCV;
            document.getElementById('balance-cuenta').innerText = `Bs ${balanceVES.toFixed(2)}`;
            document.getElementById('subtitulo-cuenta').innerText = `$${balanceUSD.toFixed(2)} USD`;
        } else if (cuentaActiva.moneda === 'USDT') {
            document.getElementById('balance-cuenta').innerText = `USDT ${balanceUSD.toFixed(2)}`;
            let balanceVES_USDT = balanceUSD * tasaParalelo;
            document.getElementById('subtitulo-cuenta').innerText = `≈ Bs ${balanceVES_USDT.toFixed(2)}`;
        } else {
            document.getElementById('balance-cuenta').innerText = `$${balanceUSD.toFixed(2)}`;
            document.getElementById('subtitulo-cuenta').innerText = "Dólares / Físico";
        }
    }

    const lista = document.getElementById('lista-transacciones');
    lista.innerHTML = '';
    const transCuenta = transacciones.filter(t => t.cuentaId == cuentaActivaId).slice().reverse();
    
    transCuenta.forEach((t, index) => {
        const claseColor = t.tipo === 'ingreso' ? 'monto-ingreso' : 'monto-gasto';
        const signo = t.tipo === 'ingreso' ? '+' : '-';
        const animDelay = index * 0.08; // Retraso en cascada
        
        lista.innerHTML += `
            <li class="transaccion-item" style="animation: slideInRight 0.4s var(--ios-spring) ${animDelay}s both;">
                <div class="trans-izq">
                    <strong>${t.categoria}</strong>
                    <small>${t.fechaFormateada}</small>
                </div>
                <div style="display: flex; align-items: center;">
                    <span class="monto-val ${claseColor}">${signo}$${t.montoUSD.toFixed(2)}</span>
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
    if(cuentas.length === 0) return alert("Crea una cuenta en Ajustes");
    
    const tipo = document.getElementById('val-tipo').value;
    let categoria = "";

    // Lógica para exigir categoría solo si es Gasto
    if (tipo === 'gasto') {
        if(categorias.length === 0) return alert("Crea una categoría en Ajustes");
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
    const moneda = document.getElementById('val-nueva-moneda').value;
    if(nombre.trim()) {
        cuentas.push({ id: Date.now(), nombre: nombre, moneda: moneda });
        document.getElementById('nueva-cuenta-nombre').value = '';
        guardarYActualizarGestion();
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