// ================= COMPORTAMIENTO INTELIGENTE DEL FORMULARIO =================
function toggleCategoriaSelect() {
    const tipo = document.getElementById('val-tipo').value;
    const moneda = document.getElementById('val-moneda').value;
    const selectCategoria = document.getElementById('val-categoria');
    const boxComision = document.getElementById('box-comision-ves');
    const boxTransf = document.getElementById('box-transferencia');
    const boxTasaUsdtVes = document.getElementById('box-tasa-usdt-ves');
    const inputTasaUsdtVes = document.getElementById('input-tasa-usdt-ves');
    const valMonedaSelect = document.getElementById('val-moneda');
    const cuentaActiva = cuentas.find(c => c.id == cuentaActivaId);
    
    if (tipo === 'ingreso' || tipo === 'transferencia') { 
        selectCategoria.classList.add('oculto'); selectCategoria.value = ""; 
    } else {
        selectCategoria.classList.remove('oculto');
    }

    if (boxTransf) {
        if (tipo === 'transferencia') {
            boxTransf.classList.remove('oculto'); boxTransf.style.display = 'flex';
            valMonedaSelect.classList.add('oculto');
            renderizarSelectsTransferencia();
        } else {
            boxTransf.classList.add('oculto'); boxTransf.style.display = 'none';
            valMonedaSelect.classList.remove('oculto');
        }
    }

    if (boxComision) {
        if (tipo === 'gasto' && moneda === 'VES') {
            boxComision.classList.remove('oculto'); boxComision.style.display = 'flex';
        } else {
            boxComision.classList.add('oculto'); boxComision.style.display = 'none';
            document.getElementById('sel-tipo-comision').value = 'tarjeta';
            toggleComisionManual(); 
        }
    }

    if (boxTasaUsdtVes) {
        if (cuentaActiva && cuentaActiva.moneda === 'USDT' && (tipo === 'gasto' || tipo === 'ingreso') && moneda === 'VES') {
            boxTasaUsdtVes.classList.remove('oculto');
            boxTasaUsdtVes.style.display = 'flex';
            if (inputTasaUsdtVes && (!inputTasaUsdtVes.value || parseFloat(inputTasaUsdtVes.value) <= 0)) {
                inputTasaUsdtVes.value = tasaParalelo > 1 ? tasaParalelo.toFixed(2) : '';
            }
            calcularEquivalenteUsdtVes();
        } else {
            boxTasaUsdtVes.classList.add('oculto');
            boxTasaUsdtVes.style.display = 'none';
        }
    }
}

function calcularEquivalenteUsdtVes() {
    const boxTasaUsdtVes = document.getElementById('box-tasa-usdt-ves');
    const lblEquiv = document.getElementById('lbl-usdt-ves-equiv');
    if (!boxTasaUsdtVes || !lblEquiv || boxTasaUsdtVes.classList.contains('oculto')) return;

    const tipo = document.getElementById('val-tipo').value;
    const moneda = document.getElementById('val-moneda').value;
    const monto = parseFloat(document.getElementById('monto').value) || 0;
    const inputTasa = document.getElementById('input-tasa-usdt-ves');
    const tasaUsar = parseFloat(inputTasa && inputTasa.value) || tasaParalelo || 1;

    let montoTotalBs = monto;
    const boxComision = document.getElementById('box-comision-ves');
    if (tipo === 'gasto' && moneda === 'VES' && boxComision && !boxComision.classList.contains('oculto')) {
        const tipoComision = document.getElementById('sel-tipo-comision').value;
        if (tipoComision === 'p2p' && monto > 0) montoTotalBs += Math.max(14.00, monto * 0.003);
        else if (tipoComision === 'p2c' && monto > 0) montoTotalBs += Math.max(14.00, monto * 0.015);
        else if (tipoComision === 'manual') montoTotalBs += parseFloat(document.getElementById('input-comision-manual').value) || 0;
    }

    const equivUsdt = tasaUsar > 0 ? (montoTotalBs / tasaUsar) : 0;
    const signo = tipo === 'ingreso' ? '+' : '-';
    lblEquiv.style.color = tipo === 'ingreso' ? '#32D74B' : '#FF453A';
    lblEquiv.innerText = `${monto > 0 ? signo : ''}${equivUsdt.toFixed(2)} USDT`;
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
    const valO = selOrigen.value, valD = selDestino.value;

    selOrigen.innerHTML = ''; selDestino.innerHTML = '';
    const cuentasValidas = cuentas.filter(c => c.moneda === 'USDT' || c.moneda === 'VES');

    cuentasValidas.forEach(c => {
        selOrigen.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
        selDestino.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
    });

    if (valO && cuentasValidas.find(c => c.id == valO)) selOrigen.value = valO;
    if (valD && cuentasValidas.find(c => c.id == valD)) selDestino.value = valD;
    actualizarUI_Transferencia(false);
}

function actualizarUI_Transferencia(origenCambio = false) {
    const idO = document.getElementById('sel-transf-origen').value;
    const idD = document.getElementById('sel-transf-destino').value;
    if (!idO || !idD) return;

    let cOrigen = cuentas.find(c => c.id == idO);
    let cDestino = cuentas.find(c => c.id == idD);
    const cuentasUSDT = cuentas.filter(c => c.moneda === 'USDT');
    const cuentasVES = cuentas.filter(c => c.moneda === 'VES');

    if (origenCambio && cuentasUSDT.length === 1 && cuentasVES.length === 1) {
        if (cOrigen.moneda === 'USDT') document.getElementById('sel-transf-destino').value = cuentasVES[0].id;
        else if (cOrigen.moneda === 'VES') document.getElementById('sel-transf-destino').value = cuentasUSDT[0].id;
        cDestino = cuentas.find(c => c.id == document.getElementById('sel-transf-destino').value);
    } else if (!origenCambio && cuentasUSDT.length === 1 && cuentasVES.length === 1) {
        if (cDestino.moneda === 'USDT') document.getElementById('sel-transf-origen').value = cuentasVES[0].id;
        else if (cDestino.moneda === 'VES') document.getElementById('sel-transf-origen').value = cuentasUSDT[0].id;
        cOrigen = cuentas.find(c => c.id == document.getElementById('sel-transf-origen').value);
    }

    const boxTasa = document.getElementById('box-transf-tasa');
    const inputTasa = document.getElementById('input-transf-tasa');
    const boxComisionUsdt = document.getElementById('box-transf-comision-usdt');
    const inputComisionUsdt = document.getElementById('input-transf-comision-usdt');

    if (cOrigen && cDestino && cOrigen.moneda !== cDestino.moneda) {
        boxTasa.classList.remove('oculto'); boxTasa.style.display = 'flex';
        if (inputTasa.value === '' || inputTasa.value === '1') inputTasa.value = tasaParalelo.toFixed(2);
    } else {
        boxTasa.classList.add('oculto'); boxTasa.style.display = 'none';
        inputTasa.value = '1';
    }

    if (boxComisionUsdt) {
        if (cOrigen && cDestino && cOrigen.moneda === 'VES' && cDestino.moneda === 'USDT') {
            boxComisionUsdt.classList.remove('oculto');
            boxComisionUsdt.style.display = 'flex';
        } else {
            boxComisionUsdt.classList.add('oculto');
            boxComisionUsdt.style.display = 'none';
            if (inputComisionUsdt) inputComisionUsdt.value = '';
        }
    }

    calcularMontoTransferencia();
}

function calcularMontoTransferencia() {
    const monto = parseFloat(document.getElementById('monto').value) || 0;
    const cOrigen = cuentas.find(c => c.id == document.getElementById('sel-transf-origen').value);
    const cDestino = cuentas.find(c => c.id == document.getElementById('sel-transf-destino').value);
    let tasa = parseFloat(document.getElementById('input-transf-tasa').value) || 1;
    const inputComUsdt = document.getElementById('input-transf-comision-usdt');
    const comisionUsdt = (cOrigen && cDestino && cOrigen.moneda === 'VES' && cDestino.moneda === 'USDT' && inputComUsdt)
        ? (parseFloat(inputComUsdt.value) || 0)
        : 0;
    let montoRecibir = monto;

    if (cOrigen && cDestino && cOrigen.moneda !== cDestino.moneda) {
        if (cOrigen.moneda === 'VES') {
            const brutoUsdt = tasa > 0 ? (monto / tasa) : 0;
            montoRecibir = Math.max(0, brutoUsdt - comisionUsdt);
        } else if (cDestino.moneda === 'VES') {
            montoRecibir = monto * tasa;
        }
    }
    document.getElementById('lbl-transf-recibiras').innerText = `${montoRecibir.toFixed(2)} ${cDestino ? cDestino.moneda : ''}`;
}

document.getElementById('val-categoria').addEventListener('change', (e) => {
    const catSelec = e.target.value;
    const lastTrans = [...transacciones].reverse().find(t => t.categoria === catSelec && t.tipo === 'gasto');
    if (lastTrans && lastTrans.monedaInputOriginal) {
        const selectMoneda = document.getElementById('val-moneda');
        const cuentaActiva = cuentas.find(c => c.id == cuentaActivaId);
        let monedaBuscada = lastTrans.monedaInputOriginal;

        if (cuentaActiva && cuentaActiva.moneda === 'USDT' && monedaBuscada === 'USD') monedaBuscada = 'USDT';
        else if (cuentaActiva && cuentaActiva.moneda !== 'USDT' && monedaBuscada === 'USDT') monedaBuscada = 'USD';

        const option = Array.from(selectMoneda.options).find(o => o.value === monedaBuscada);
        if (option) selectMoneda.value = monedaBuscada;
        toggleCategoriaSelect();
    }
});

document.getElementById('val-moneda').addEventListener('change', toggleCategoriaSelect);

function actualizarOpcionesMoneda() {
    const cuentaActiva = cuentas.find(c => c.id == cuentaActivaId);
    const selectMoneda = document.getElementById('val-moneda');
    if (!cuentaActiva || !selectMoneda) return;

    const monedaPrevia = selectMoneda.value;
    let permitidas = ['USD', 'VES', 'EUR'];

    if (cuentaActiva.moneda === 'USD') permitidas = ['USD'];
    else if (cuentaActiva.moneda === 'USDT') permitidas = ['USDT', 'VES'];
    else if (cuentaActiva.moneda === 'VES') permitidas = ['USD', 'VES', 'EUR'];

    selectMoneda.innerHTML = permitidas.map(m => `<option value="${m}">${m}</option>`).join('');
    selectMoneda.value = permitidas.includes(monedaPrevia) ? monedaPrevia : permitidas[0];
    toggleCategoriaSelect();
}

// ================= DASHBOARD Y SLIDER =================
let sliderObserverInstancia = null;

function obtenerTasaBCVVigenteFija() {
    if (typeof tasasVigentesHoy !== 'undefined' && tasasVigentesHoy.BCV && Number(tasasVigentesHoy.BCV.valor) > 1) {
        return Number(tasasVigentesHoy.BCV.valor);
    }
    if (typeof tasasData !== 'undefined' && tasasData.BCV && Number(tasasData.BCV.valor) > 1) {
        return Number(tasasData.BCV.valor);
    }
    const cacheLocal = parseFloat(localStorage.getItem('tasaBCV'));
    if (!isNaN(cacheLocal) && cacheLocal > 1) return cacheLocal;
    return Number(tasaBCV) || 1;
}

function obtenerMontoVESTransaccion(t) {
    if (!t) return 0;
    if (t.montoVES !== undefined && t.montoVES !== null && !isNaN(Number(t.montoVES)) && Number(t.montoVES) > 0) {
        return Number(t.montoVES);
    }
    const mUsd = Number(t.montoUSD) || 0;
    if (mUsd <= 0) return 0;
    const tasaFija = obtenerTasaBCVVigenteFija();
    const calculadoBs = Number((mUsd * tasaFija).toFixed(2));
    if (tasaFija > 1) {
        t.montoVES = calculadoBs;
    }
    return calculadoBs;
}

function calcularSaldoCuenta(cuenta) {
    if (!cuenta) return { balanceUSD: 0, balanceVES: 0, balanceEUR: 0 };
    if (cuenta.moneda === 'VES') {
        let sumaVES = 0;
        transacciones.forEach(t => {
            if (t.cuentaId == cuenta.id) {
                const mVes = obtenerMontoVESTransaccion(t);
                sumaVES += t.tipo === 'ingreso' ? mVes : -mVes;
            }
        });
        const bsReal = Math.max(0, sumaVES);
        const eqUSD = (tasaBCV > 0) ? (bsReal / tasaBCV) : 0;
        const eqEUR = (tasaEUR > 0) ? (bsReal / tasaEUR) : 0;
        return { balanceUSD: eqUSD, balanceVES: bsReal, balanceEUR: eqEUR };
    }

    let balanceUSD = 0;
    transacciones.forEach(t => {
        if (t.cuentaId == cuenta.id) {
            const m = Number(t.montoUSD) || 0;
            balanceUSD += t.tipo === 'ingreso' ? m : -m;
        }
    });
    return {
        balanceUSD,
        balanceVES: balanceUSD * (cuenta.moneda === 'USDT' ? (tasaParalelo || 1) : (tasaBCV || 1)),
        balanceEUR: (tasaEUR > 0) ? ((balanceUSD * (tasaBCV || 1)) / tasaEUR) : 0
    };
}

function renderizarSliderCuentas() {
    const slider = document.getElementById('slider-cuentas');
    const dots = document.getElementById('slider-dots');
    if (!slider || !dots) return;
    if (sliderObserverInstancia) {
        sliderObserverInstancia.disconnect();
        sliderObserverInstancia = null;
    }
    slider.innerHTML = ''; dots.innerHTML = '';

    const iconOjo = censurado 
        ? `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>` 
        : `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;

    if (cuentas.length === 0) {
        slider.innerHTML = `<div class="balance-section blur-effect"><h2>Sin Cuenta</h2><h1>$0.00</h1><span class="balance-tipo">--</span></div>`;
        cuentaActivaId = null;
        const mHist = document.getElementById('modal-historial');
        if (mHist && !mHist.classList.contains('oculto')) actualizarListaTransacciones();
        return;
    }

    let htmlSlider = '';
    let htmlDots = '';
    cuentas.forEach((cuenta, index) => {
        const saldos = calcularSaldoCuenta(cuenta);
        const balanceUSD = saldos.balanceUSD;
        let strBalanceGrande = "", strBalancePequeño = "";

        if (cuenta.moneda === 'VES') { 
            strBalanceGrande = `Bs ${saldos.balanceVES.toFixed(2)}`; 
            strBalancePequeño = `$${saldos.balanceUSD.toFixed(2)} &nbsp;|&nbsp; €${saldos.balanceEUR.toFixed(2)}`; 
        }
        else if (cuenta.moneda === 'USDT') { strBalanceGrande = `USDT ${balanceUSD.toFixed(2)}`; strBalancePequeño = `≈ Bs ${(balanceUSD * tasaParalelo).toFixed(2)}`; } 
        else if (cuenta.moneda === 'EUR') { strBalanceGrande = `€${(balanceUSD).toFixed(2)}`; strBalancePequeño = `≈ Bs ${(balanceUSD * tasaEUR).toFixed(2)}`; } 
        else { strBalanceGrande = `$${balanceUSD.toFixed(2)}`; strBalancePequeño = "Dólares / Físico"; }

        htmlSlider += `<div class="balance-section blur-effect" id="tarjeta-cuenta-${cuenta.id}"><h2>${cuenta.nombre} <button class="btn-ojo" onclick="toggleCensura(event)">${iconOjo}</button></h2><h1>${formatearMontoCensurado(strBalanceGrande, false)}</h1><span class="balance-tipo">${formatearMontoCensurado(strBalancePequeño, true)}</span></div>`;
        htmlDots += `<div class="dot ${index === 0 ? 'activo' : ''}"></div>`;
    });
    slider.innerHTML = htmlSlider;
    dots.innerHTML = htmlDots;

    if (!cuentaActivaId || !cuentas.find(c => c.id == cuentaActivaId)) cuentaActivaId = cuentas[0].id;
    actualizarOpcionesMoneda();

    sliderObserverInstancia = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const targetId = entry.target.id.replace('tarjeta-cuenta-', '');
                const index = cuentas.findIndex(c => c.id == targetId);
                document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('activo', i === index));
                if (cuentaActivaId != targetId) {
                    cuentaActivaId = targetId;
                    actualizarOpcionesMoneda();
                    const mHist = document.getElementById('modal-historial');
                    if (mHist && !mHist.classList.contains('oculto')) actualizarListaTransacciones();
                }
            }
        });
    }, { root: slider, threshold: 0.6 });

    document.querySelectorAll('.balance-section').forEach(section => sliderObserverInstancia.observe(section));
    const activeIndex = cuentas.findIndex(c => c.id == cuentaActivaId);
    if (activeIndex >= 0) setTimeout(() => { slider.scrollTo({ left: slider.clientWidth * activeIndex, behavior: 'instant' }); }, 10);
}

function actualizarInterfaz() {
    renderizarSliderCuentas();
    renderizarMetas();
    renderizarAgenda();
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

    const valFecha = document.getElementById('val-fecha').value; 
    const dateObj = valFecha ? new Date(valFecha + "T00:00:00") : new Date();
    const isoLocal = getLocalYYYYMMDD(dateObj);
    const mesesArr = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const fechaFormateada = `${dateObj.getDate()} ${mesesArr[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

    if (tipo === 'transferencia') {
        const idO = document.getElementById('sel-transf-origen').value;
        const idD = document.getElementById('sel-transf-destino').value;
        if (idO === idD) return alert("La cuenta origen y destino no pueden ser la misma.");

        const cOrigen = cuentas.find(c => c.id == idO);
        const cDestino = cuentas.find(c => c.id == idD);
        const tasaTransf = parseFloat(document.getElementById('input-transf-tasa').value) || 1;
        const inputComUsdt = document.getElementById('input-transf-comision-usdt');
        const comisionUsdt = (cOrigen.moneda === 'VES' && cDestino.moneda === 'USDT' && inputComUsdt)
            ? (parseFloat(inputComUsdt.value) || 0)
            : 0;
        
        let montoRecibir = monto;
        if (cOrigen.moneda !== cDestino.moneda) {
            if (cOrigen.moneda === 'VES') {
                const brutoUsdt = tasaTransf > 0 ? (monto / tasaTransf) : 0;
                if (comisionUsdt >= brutoUsdt && brutoUsdt > 0) {
                    return alert("La comisión en USDT no puede ser mayor o igual al monto total comprado.");
                }
                montoRecibir = Math.max(0, brutoUsdt - comisionUsdt);
            } else if (cDestino.moneda === 'VES') {
                montoRecibir = monto * tasaTransf;
            }
        }

        const txtComisionP2P = comisionUsdt > 0 ? ` | Comisión P2P: -${comisionUsdt.toFixed(2)} USDT` : '';
        let montoUSD_Origen = cOrigen.moneda === 'VES' ? (monto / tasaBCV) : monto;
        const montoVES_Origen = cOrigen.moneda === 'VES' ? Number(monto.toFixed(2)) : Number((montoUSD_Origen * (tasaBCV || 1)).toFixed(2));
        const notaOr = nota ? `Hacia ${cDestino.nombre} - ${nota}` : `Transferencia hacia ${cDestino.nombre}`;
        transacciones.push({
            id: dateObj.getTime() + Math.random(), 
            cuentaId: idO, montoUSD: montoUSD_Origen, montoVES: montoVES_Origen, tipo: 'gasto', categoria: 'Transferencia / P2P',
            nota: cOrigen.moneda !== cDestino.moneda ? `${notaOr} @ Tasa: ${tasaTransf}${txtComisionP2P}` : notaOr,
            monedaInputOriginal: cOrigen.moneda, fechaFormateada: fechaFormateada, fecha: dateObj, fechaIsoLocal: isoLocal
        });

        let montoUSD_Destino = cDestino.moneda === 'VES' ? (montoRecibir / tasaBCV) : montoRecibir;
        const montoVES_Destino = cDestino.moneda === 'VES' ? Number(montoRecibir.toFixed(2)) : Number((montoUSD_Destino * (tasaBCV || 1)).toFixed(2));
        const notaDes = nota ? `Desde ${cOrigen.nombre} - ${nota}` : `Transferencia desde ${cOrigen.nombre}`;
        transacciones.push({
            id: dateObj.getTime() + Math.random() + 1,
            cuentaId: idD, montoUSD: montoUSD_Destino, montoVES: montoVES_Destino, tipo: 'ingreso', categoria: 'Transferencia / P2P',
            nota: cOrigen.moneda !== cDestino.moneda ? `${notaDes} @ Tasa: ${tasaTransf}${txtComisionP2P}` : notaDes,
            monedaInputOriginal: cDestino.moneda, fechaFormateada: fechaFormateada, fecha: dateObj, fechaIsoLocal: isoLocal
        });

        transacciones.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        guardarYActualizarGestion();
        document.getElementById('monto').value = ''; document.getElementById('val-nota').value = '';
        document.getElementById('val-fecha').value = getLocalYYYYMMDD();
        document.getElementById('input-transf-tasa').value = '';
        if (inputComUsdt) inputComUsdt.value = '';
        document.getElementById('lbl-transf-recibiras').innerText = '0.00';
        return;
    }

    let montoTotalOperacion = monto;
    let montoComisionVES = 0;

    const boxComision = document.getElementById('box-comision-ves');
    if (tipo === 'gasto' && monedaInput === 'VES' && boxComision && !boxComision.classList.contains('oculto')) {
        const tipoComision = document.getElementById('sel-tipo-comision').value;
        if (tipoComision === 'p2p') montoComisionVES = Math.max(14.00, monto * 0.003);
        else if (tipoComision === 'p2c') montoComisionVES = Math.max(14.00, monto * 0.015);
        else if (tipoComision === 'manual') montoComisionVES = parseFloat(document.getElementById('input-comision-manual').value) || 0;
        montoTotalOperacion += montoComisionVES;
    }

    const cuentaActiva = cuentas.find(c => c.id == cuentaActivaId);
    let montoUSD = montoTotalOperacion;
    let montoVES = 0;
    let detalleTasaUsdt = '';

    if (cuentaActiva && cuentaActiva.moneda === 'USDT') {
        if (monedaInput === 'USDT') {
            montoUSD = montoTotalOperacion;
            montoVES = Number((montoTotalOperacion * (tasaParalelo || tasaBCV || 1)).toFixed(2));
        } else if (monedaInput === 'VES') {
            const inputTasaUsdt = document.getElementById('input-tasa-usdt-ves');
            const tasaUsdtAplicada = parseFloat(inputTasaUsdt && inputTasaUsdt.value) || tasaParalelo || tasaBCV || 1;
            if (tasaUsdtAplicada <= 0) return alert("Ingresa una tasa USDT válida.");
            montoUSD = montoTotalOperacion / tasaUsdtAplicada;
            montoVES = Number(montoTotalOperacion.toFixed(2));
            detalleTasaUsdt = `@ Tasa USDT: Bs ${tasaUsdtAplicada.toFixed(2)}`;
        }
    } else {
        if (monedaInput === 'VES') {
            montoUSD = montoTotalOperacion / tasaBCV;
            montoVES = Number(montoTotalOperacion.toFixed(2));
        } else if (monedaInput === 'EUR') {
            montoVES = Number((montoTotalOperacion * tasaEUR).toFixed(2));
            montoUSD = (montoTotalOperacion * tasaEUR) / tasaBCV;
        } else {
            montoUSD = montoTotalOperacion;
            montoVES = Number((montoTotalOperacion * tasaBCV).toFixed(2));
        }
    }

    let notaFinal = nota;
    if (montoComisionVES > 0) {
        const detalle = `Comisión: Bs ${montoComisionVES.toFixed(2)}`;
        notaFinal = notaFinal ? `${notaFinal} (${detalle})` : detalle;
    }
    if (detalleTasaUsdt) {
        notaFinal = notaFinal ? `${notaFinal} (${detalleTasaUsdt})` : detalleTasaUsdt;
    }

    transacciones.push({
        id: dateObj.getTime() + Math.random(), 
        cuentaId: cuentaActivaId,
        montoUSD: montoUSD,
        montoVES: montoVES,
        tipo: tipo,
        categoria: categoria,
        nota: notaFinal,
        monedaInputOriginal: monedaInput, 
        fechaFormateada: fechaFormateada,
        fecha: dateObj,
        fechaIsoLocal: isoLocal
    });
    transacciones.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    guardarYActualizarGestion();
    
    document.getElementById('monto').value = ''; document.getElementById('val-categoria').value = ''; document.getElementById('val-nota').value = '';
    document.getElementById('val-fecha').value = getLocalYYYYMMDD();
    
    const selComision = document.getElementById('sel-tipo-comision');
    if(selComision) { selComision.value = 'tarjeta'; toggleComisionManual(); }
    const inputTasaUsdt = document.getElementById('input-tasa-usdt-ves');
    if (inputTasaUsdt) inputTasaUsdt.value = tasaParalelo > 1 ? tasaParalelo.toFixed(2) : '';
    calcularEquivalenteUsdtVes();
}

// Lógica de "Deslizar para Borrar" (Swipe to Delete)
let swipeStartX = 0;
let currentSwipeX = 0;
let swipeStartY = 0;
let swipeEje = null; // 'x' | 'y' | null (bloqueo de dirección para no pelear con el scroll vertical)

function handleSwipeStart(e, element) {
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
    currentSwipeX = swipeStartX;
    swipeEje = null;
    element.style.transition = 'none';
}
function handleSwipeMove(e, element) {
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    if (swipeEje === null) {
        const dx = Math.abs(x - swipeStartX);
        const dy = Math.abs(y - swipeStartY);
        if (dx < 8 && dy < 8) return;
        swipeEje = dx > dy * 1.2 ? 'x' : 'y';
    }
    if (swipeEje === 'y') return; // El usuario está haciendo scroll vertical: no mover la fila
    currentSwipeX = x;
    let diff = currentSwipeX - swipeStartX;
    if (diff < -80) diff = -80; if (diff > 0) diff = 0; 
    element.style.transform = `translateX(${diff}px)`;
    if (element.parentElement) {
        if (diff < -15) element.parentElement.classList.add('swiped-open');
        else element.parentElement.classList.remove('swiped-open');
    }
}
function handleSwipeEnd(e, element) {
    element.style.transition = 'transform 0.34s cubic-bezier(0.34, 1.56, 0.64, 1)';
    if (swipeEje !== 'x') { swipeEje = null; return; }
    swipeEje = null;
    let diff = currentSwipeX - swipeStartX;
    if (diff < -40) {
        element.style.transform = `translateX(-80px)`;
        if (element.parentElement) element.parentElement.classList.add('swiped-open');
    } else {
        element.style.transform = `translateX(0px)`;
        if (element.parentElement) element.parentElement.classList.remove('swiped-open');
    }
}

function mostrarHistorialDiaActual() {
    const fFecha = document.getElementById('filtro-fecha');
    const fBuscar = document.getElementById('buscar-historial');
    if (fFecha) fFecha.value = getLocalYYYYMMDD();
    if (fBuscar) fBuscar.value = '';
    actualizarListaTransacciones();
    const lista = document.getElementById('lista-transacciones');
    if (lista) lista.scrollTop = 0;
}

function mostrarHistorialTotalCuenta() {
    const fFecha = document.getElementById('filtro-fecha');
    const fBuscar = document.getElementById('buscar-historial');
    if (fFecha) fFecha.value = '';
    if (fBuscar) fBuscar.value = '';
    actualizarListaTransacciones();
    const lista = document.getElementById('lista-transacciones');
    if (lista) lista.scrollTop = 0;
}

function obtenerEtiquetaMesAnio(isoYYYYMMDD) {
    const mesesNombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const partes = (isoYYYYMMDD || getLocalYYYYMMDD()).split('-');
    const anio = partes[0];
    const mesIdx = Math.max(0, Math.min(11, (parseInt(partes[1], 10) || 1) - 1));
    return `${mesesNombres[mesIdx]} ${anio}`;
}

function obtenerEtiquetaDiaCompleta(isoYYYYMMDD) {
    const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const mesesCortos = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const d = new Date((isoYYYYMMDD || getLocalYYYYMMDD()) + "T00:00:00");
    if (isNaN(d.getTime())) return isoYYYYMMDD;
    return `${diasSemana[d.getDay()]}, ${d.getDate()} de ${mesesCortos[d.getMonth()]}`;
}

function actualizarListaTransacciones() {
    const lista = document.getElementById('lista-transacciones');
    if (!lista) return;
    lista.innerHTML = ''; 
    if(!cuentaActivaId) return;

    const cuentaActiva = cuentas.find(c => c.id == cuentaActivaId);
    const tituloHist = document.getElementById('historial-titulo-cuenta');
    const subHist = document.getElementById('historial-subtitulo-filtro');
    const btnTotal = document.getElementById('btn-hist-total');
    const btnDia = document.getElementById('btn-hist-dia');

    if (tituloHist && cuentaActiva) tituloHist.innerText = `Historial · ${cuentaActiva.nombre}`;

    const query = document.getElementById('buscar-historial') ? document.getElementById('buscar-historial').value.toLowerCase().trim() : "";
    const fechaFiltro = document.getElementById('filtro-fecha') ? document.getElementById('filtro-fecha').value : "";

    if (btnTotal && btnDia) {
        btnTotal.classList.toggle('activo', !fechaFiltro);
        btnDia.classList.toggle('activo', Boolean(fechaFiltro));
    }

    let transCuenta = transacciones.filter(t => t.cuentaId == cuentaActivaId).slice().reverse();
    transCuenta = transCuenta.filter(t => {
        const montoStr = (Number(t.montoUSD) || 0).toFixed(2);
        const matchSearch = !query ||
            (t.categoria && t.categoria.toLowerCase().includes(query)) ||
            (t.nota && t.nota.toLowerCase().includes(query)) ||
            montoStr.includes(query);
        let matchDate = true;
        if(fechaFiltro) {
            const fechaT = t.fecha ? new Date(t.fecha) : new Date(t.id);
            const isoLocal = t.fechaIsoLocal || getLocalYYYYMMDD(fechaT);
            matchDate = (isoLocal === fechaFiltro);
        }
        return matchSearch && matchDate;
    });

    if (subHist) {
        if (fechaFiltro) subHist.innerText = `Día seleccionado: ${obtenerEtiquetaDiaCompleta(fechaFiltro)} (${transCuenta.length})`;
        else if (query) subHist.innerText = `Resultados encontrados: ${transCuenta.length}`;
        else subHist.innerText = `Total de la cuenta: ${transCuenta.length} movimientos`;
    }

    if (transCuenta.length === 0) {
        lista.innerHTML = `<p style="text-align:center; padding: 24px 16px; color: var(--text-secondary); font-size: 14px;">No se encontraron movimientos en esta vista.</p>`;
    } else {
        const conteoPorMes = {};
        transCuenta.forEach(t => {
            const fObj = t.fecha ? new Date(t.fecha) : new Date(t.id);
            const iso = t.fechaIsoLocal || getLocalYYYYMMDD(fObj);
            const claveMes = iso.slice(0, 7);
            conteoPorMes[claveMes] = (conteoPorMes[claveMes] || 0) + 1;
        });

        let ultimoMesRenderizado = null;
        let ultimoDiaRenderizado = null;
        let htmlAcumulado = '';

        transCuenta.forEach((t, index) => {
            const fObj = t.fecha ? new Date(t.fecha) : new Date(t.id);
            const iso = t.fechaIsoLocal || getLocalYYYYMMDD(fObj);
            const claveMes = iso.slice(0, 7);

            if (!fechaFiltro && claveMes !== ultimoMesRenderizado) {
                ultimoMesRenderizado = claveMes;
                const cantMovsMes = conteoPorMes[claveMes] || 0;
                htmlAcumulado += `
                    <li class="hist-mes-header">
                        <span>${obtenerEtiquetaMesAnio(iso)}</span>
                        <span style="opacity: 0.75; font-size: 10.5px;">${cantMovsMes} ${cantMovsMes === 1 ? 'movimiento' : 'movimientos'}</span>
                    </li>`;
            }

            if (!fechaFiltro && iso !== ultimoDiaRenderizado) {
                ultimoDiaRenderizado = iso;
                htmlAcumulado += `<li class="hist-dia-header">${obtenerEtiquetaDiaCompleta(iso)}</li>`;
            }

            const claseColor = t.tipo === 'ingreso' ? 'monto-ingreso' : 'monto-gasto';
            const signo = t.tipo === 'ingreso' ? '+' : '-';
            const animDelay = Math.min(index * 0.03, 0.35);
            const colorCat = obtenerColorCategoria(t.categoria);
            const montoTexto = formatearMontoCensurado(`${signo}$${(Number(t.montoUSD) || 0).toFixed(2)}`, false);
            const htmlNota = t.nota ? `<div style="font-size: 11px; color: var(--text-secondary); margin-top:3px;">${t.nota}</div>` : '';
            
            htmlAcumulado += `
                <li class="transaccion-item swipe-container" style="animation: slideInRight 0.3s var(--ios-spring) ${animDelay}s both;">
                    <div class="swipe-content" ontouchstart="handleSwipeStart(event, this)" ontouchmove="handleSwipeMove(event, this)" ontouchend="handleSwipeEnd(event, this)">
                        <div class="trans-izq">
                            <div class="trans-cat-row">
                                <span class="trans-cat-dot" style="background:${colorCat}; --cat-color:${colorCat};"></span>
                                <strong>${t.categoria}</strong>
                            </div>
                            <small>${t.fechaFormateada || iso}</small>
                            ${htmlNota}
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span class="monto-val ${claseColor}">${montoTexto}</span>
                        </div>
                    </div>
                    <div class="swipe-action" onclick="animarYQuitarElementoDOM(this.closest('li'), () => eliminarTransaccion(${t.id}))"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></div>
                </li>`;
        });
        lista.innerHTML = htmlAcumulado;
    }
    renderizarGrafico(transCuenta); 
}

function eliminarTransaccion(id) {
    const tIndex = transacciones.findIndex(t => String(t.id) === String(id));
    if (tIndex === -1) return;
    const t = transacciones[tIndex];

    if (t.categoria === 'Ahorro') {
        metas.forEach(m => {
            if (t.nota && t.nota.includes(m.nombre)) {
                if (t.tipo === 'gasto') {
                    m.acumulado -= t.montoUSD;
                    if (m.acumulado < 0) m.acumulado = 0;
                } else if (t.tipo === 'ingreso') {
                    m.acumulado += t.montoUSD;
                }
            }
        });
    }

    const compAgenda = agendaPagos.find(a =>
        (t.agendaId !== undefined && t.agendaId !== null && String(a.id) === String(t.agendaId)) ||
        (a.ultimaTransaccionId !== undefined && a.ultimaTransaccionId !== null && String(a.ultimaTransaccionId) === String(t.id)) ||
        (a.estado === 'pagado' && t.tipo === 'gasto' && t.nota && a.nota && t.nota.includes(a.nota))
    );
    if (compAgenda) {
        if (compAgenda.frecuencia === 'mensual' && (t.agendaFechaPrevia || compAgenda.ultimaFechaPagada)) {
            compAgenda.fecha = t.agendaFechaPrevia || compAgenda.ultimaFechaPagada || compAgenda.fecha;
        }
        compAgenda.estado = 'pendiente';
        compAgenda.ultimaTransaccionId = null;
    }
    
    transacciones.splice(tIndex, 1);
    guardarYActualizarGestion();
}

// ================= GRÁFICOS (CHART.JS + LEYENDA LATERAL DE COLORES POR CATEGORÍA) =================
function renderizarGrafico(transFiltered) {
    const canvas = document.getElementById('graficoGastos');
    const leyendaBox = document.getElementById('leyenda-grafico-categorias');
    const centroBox = document.getElementById('grafico-total-centro');
    if (!canvas) return;
    
    const gastos = transFiltered.filter(t => t.tipo === 'gasto' && t.categoria !== 'Transferencia / P2P');
    const dataAgrupada = {};
    let totalGastosUSD = 0;

    gastos.forEach(t => {
        const m = Number(t.montoUSD) || 0;
        const cat = t.categoria || 'Varios';
        dataAgrupada[cat] = (dataAgrupada[cat] || 0) + m;
        totalGastosUSD += m;
    });
    
    const entradasOrdenadas = Object.entries(dataAgrupada).sort((a, b) => b[1] - a[1]);
    const labels = entradasOrdenadas.map(e => e[0]);
    const data = entradasOrdenadas.map(e => e[1]);
    const coloresSegmentos = labels.map(cat => obtenerColorCategoria(cat));

    if (centroBox) {
        const textoTotalCentro = formatearMontoCensurado(`$${totalGastosUSD.toFixed(2)}`, false);
        centroBox.innerHTML = `<small>GASTOS</small><strong>${textoTotalCentro}</strong>`;
    }

    if (leyendaBox) {
        if (entradasOrdenadas.length === 0) {
            leyendaBox.innerHTML = `<div style="text-align: center; padding: 14px 6px; color: var(--text-secondary); font-size: 12px;">Sin gastos registrados en este periodo.</div>`;
        } else {
            leyendaBox.innerHTML = entradasOrdenadas.map(([cat, monto]) => {
                const color = obtenerColorCategoria(cat);
                const pct = totalGastosUSD > 0 ? ((monto / totalGastosUSD) * 100).toFixed(1) : '0.0';
                const montoCens = formatearMontoCensurado(`$${monto.toFixed(2)}`, false);
                return `
                    <div class="legend-cat-item">
                        <div class="legend-cat-left">
                            <span class="legend-cat-dot" style="background:${color}; --dot-color:${color};"></span>
                            <span class="legend-cat-name" title="${cat}">${cat}</span>
                        </div>
                        <div class="legend-cat-right">
                            <span class="legend-cat-amount">${montoCens}</span>
                            <span class="legend-cat-pct">${pct}%</span>
                        </div>
                    </div>`;
            }).join('');
        }
    }

    if (chartInstancia) chartInstancia.destroy(); 
    if (typeof Chart === 'undefined') return;
    const modoActual = document.documentElement.getAttribute('data-theme') || 'dark';
    const colorVacio = modoActual === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';

    chartInstancia = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels.length > 0 ? labels : ['Sin Gastos'],
            datasets: [{
                data: data.length > 0 ? data : [1],
                backgroundColor: data.length > 0 ? coloresSegmentos : [colorVacio],
                borderWidth: 0, 
                hoverOffset: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: labels.length > 0,
                    callbacks: {
                        label: function(ctx) {
                            const val = Number(ctx.raw) || 0;
                            const pct = totalGastosUSD > 0 ? ((val / totalGastosUSD) * 100).toFixed(1) : '0.0';
                            return ` ${ctx.label}: $${val.toFixed(2)} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}