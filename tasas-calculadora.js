// ================= CALCULADORA, BRECHA ($/USDT), FECHA VALOR Y CALENDARIO HISTÓRICO ("AL CAMBIO") =================
let calcModoTasa = 'BCV'; 
let calcUltimaEdicion = 'USD'; 

function formatFechaCorta(isoString) {
    if(!isoString) return "Actualizando...";
    const d = parsearFechaSeguraLocal(isoString);
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return `${dias[d.getDay()]}, ${d.getDate()}/${d.getMonth()+1}/${String(d.getFullYear()).slice(-2)}`;
}

function esFechaFutura(isoString) {
    if(!isoString) return false;
    const d = parsearFechaSeguraLocal(isoString);
    const today = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() > new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
}

function obtenerFechaMaximaPermitidaCalculadora() {
    const hoyIso = getLocalYYYYMMDD();
    if (hayFechaPosteriorBCV && tasasFechaPosterior.BCV && tasasFechaPosterior.BCV.fecha && tasasFechaPosterior.BCV.fecha > hoyIso) {
        return tasasFechaPosterior.BCV.fecha;
    }
    return hoyIso;
}

function actualizarLimiteCalendarioCalculadora() {
    const inputCal = document.getElementById('input-calc-fecha-hist');
    if (!inputCal) return;
    const maxFecha = obtenerFechaMaximaPermitidaCalculadora();
    inputCal.max = maxFecha;
    if (fechaHistoricaCalcSeleccionada && fechaHistoricaCalcSeleccionada > maxFecha) {
        fechaHistoricaCalcSeleccionada = null;
        inputCal.value = '';
    }
}

function actualizarBrechaCambiaria() {
    const badgeHome = document.getElementById('badge-brecha-home');
    const badgeCalc = document.getElementById('calc-brecha-box');
    const bcvRef = Number(tasaBCV) || 1;
    const usdtRef = Number(tasaParalelo) || 1;
    const brechaPct = bcvRef > 0 ? ((usdtRef - bcvRef) / bcvRef) * 100 : 0;
    const signo = brechaPct > 0 ? '+' : '';

    if (badgeHome) badgeHome.innerText = `Brecha: ${signo}${brechaPct.toFixed(2)}%`;
    if (badgeCalc) badgeCalc.innerText = `Brecha ($/USDT): ${signo}${brechaPct.toFixed(2)}%`;
}

function obtenerTasaEnFechaHistorica(modo, fechaISO) {
    const serie = tasasHistoricas[modo] || [];
    if (!serie || serie.length === 0) return tasasData[modo] || { valor: 1, previo: 1, fecha: fechaISO };

    let idxElegido = -1;
    for (let i = 0; i < serie.length; i++) {
        if (serie[i].fecha <= fechaISO) idxElegido = i;
        else break;
    }
    if (idxElegido === -1) idxElegido = 0;

    const itemActual = serie[idxElegido];
    let valorPrevio = itemActual.promedio;
    if (idxElegido > 0) {
        valorPrevio = serie[idxElegido - 1].promedio;
        if (Math.abs(itemActual.promedio - valorPrevio) < 0.0001) {
            for (let k = idxElegido - 2; k >= Math.max(0, idxElegido - 5); k--) {
                if (Math.abs(itemActual.promedio - serie[k].promedio) >= 0.0001) {
                    valorPrevio = serie[k].promedio;
                    break;
                }
            }
        }
    }
    return { valor: itemActual.promedio, previo: valorPrevio, fecha: itemActual.fecha };
}

function actualizarInfoCalculadora(modo) {
    actualizarLimiteCalendarioCalculadora();

    const varBox = document.getElementById('calc-variacion-box');
    const badge = document.getElementById('calc-fecha-badge');
    const banner = document.getElementById('banner-fecha-valor');
    const bannerTexto = document.getElementById('banner-fecha-valor-texto');
    const lblEstado = document.getElementById('calc-estado-tasa-lbl');
    const btnSwitchCalc = document.getElementById('btn-calc-switch-fecha');
    const icoSwitchCalc = document.getElementById('ico-calc-switch-fecha');
    const btnSwitchHome = document.getElementById('btn-home-switch-fecha');

    if (modo === 'Custom') {
        if (varBox) varBox.classList.add('oculto');
        if (banner) banner.classList.add('oculto');
        if (badge) { badge.innerText = "Personalizada"; badge.classList.remove('fecha-futura-activa'); }
        if (lblEstado) lblEstado.innerText = "Tasa definida manualmente:";
        if (btnSwitchCalc && !fechaHistoricaCalcSeleccionada && !hayFechaPosteriorBCV) {
            btnSwitchCalc.classList.add('oculto'); btnSwitchCalc.style.display = 'none';
        }
        return;
    }

    if (varBox) varBox.classList.remove('oculto');
    let data = fechaHistoricaCalcSeleccionada ? obtenerTasaEnFechaHistorica(modo, fechaHistoricaCalcSeleccionada) : tasasData[modo];
    if (!data) return;

    const diffAbs = data.valor - data.previo;
    const diffPct = data.previo ? (diffAbs / data.previo) * 100 : 0;

    if (varBox) {
        if (diffAbs > 0.0001) { varBox.innerText = `↑ +${diffAbs.toFixed(2)} Bs (+${diffPct.toFixed(2)}%)`; varBox.className = 'tasa-variacion var-positiva'; }
        else if (diffAbs < -0.0001) { varBox.innerText = `↓ ${diffAbs.toFixed(2)} Bs (-${Math.abs(diffPct).toFixed(2)}%)`; varBox.className = 'tasa-variacion var-negativa'; }
        else { varBox.innerText = `− 0.00 Bs (0.00%)`; varBox.className = 'tasa-variacion var-neutra'; }
    }

    if (fechaHistoricaCalcSeleccionada) {
        const fechaMostrada = formatFechaCorta(fechaHistoricaCalcSeleccionada);
        if (badge) { badge.innerText = `📅 Histórica: ${fechaMostrada}`; badge.classList.add('fecha-futura-activa'); }
        if (lblEstado) lblEstado.innerText = `Variación del ${fechaMostrada}:`;
        if (banner) {
            banner.classList.remove('oculto');
            if (bannerTexto) bannerTexto.innerText = `Consultando tasa histórica (${fechaMostrada}). Toca ↩ para volver a hoy.`;
        }
        if (btnSwitchCalc) {
            btnSwitchCalc.classList.remove('oculto'); btnSwitchCalc.style.display = 'flex';
            btnSwitchCalc.classList.add('destacado-ambar');
        }
        if (icoSwitchCalc) icoSwitchCalc.innerText = '↩';
        return;
    }

    const viendoFutura = (usandoFechaPosterior && hayFechaPosteriorBCV && (modo === 'BCV' || modo === 'EUR')) || esFechaFutura(data.fecha);

    if (badge) {
        const fRef = data.fecha || getLocalYYYYMMDD();
        const fCorta = formatFechaCorta(fRef);
        badge.innerText = viendoFutura ? `⏳ Fecha Valor: ${fCorta}` : fCorta;
        badge.classList.toggle('fecha-futura-activa', Boolean(viendoFutura));
    }
    if (lblEstado) {
        lblEstado.innerText = viendoFutura ? "Variación respecto a la tasa vigente:" : "Variación respecto al cierre previo:";
    }
    if (banner) {
        if (viendoFutura) {
            banner.classList.remove('oculto');
            if (bannerTexto) bannerTexto.innerText = `Viendo tasa con fecha valor futura BCV (${formatFechaCorta(data.fecha)})`;
        } else {
            banner.classList.add('oculto');
        }
    }

    if (hayFechaPosteriorBCV) {
        if (btnSwitchCalc) {
            btnSwitchCalc.classList.remove('oculto'); btnSwitchCalc.style.display = 'flex';
            btnSwitchCalc.classList.toggle('destacado-ambar', Boolean(usandoFechaPosterior));
        }
        if (icoSwitchCalc) icoSwitchCalc.innerText = usandoFechaPosterior ? '↩' : '📅→';
        if (btnSwitchHome) {
            btnSwitchHome.classList.remove('oculto'); btnSwitchHome.style.display = 'inline-flex';
            btnSwitchHome.innerText = usandoFechaPosterior ? '↩ Hoy' : '📅→';
        }
    } else {
        if (btnSwitchCalc) { btnSwitchCalc.classList.add('oculto'); btnSwitchCalc.style.display = 'none'; btnSwitchCalc.classList.remove('destacado-ambar'); }
        if (btnSwitchHome) { btnSwitchHome.classList.add('oculto'); btnSwitchHome.style.display = 'none'; }
    }
}

function animarPulsoCalculadora() {
    ['input-tasa-activa', 'calc-fecha-badge', 'lbl-divisa'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('calc-mode-pulse');
            void el.offsetWidth;
            el.classList.add('calc-mode-pulse');
        }
    });
}

function setTasaModo(modo) {
    const cambioReal = calcModoTasa !== modo;
    calcModoTasa = modo;
    document.querySelectorAll('#tab-calculadora .segment').forEach(el => el.classList.remove('activo'));
    if(modo === 'BCV') document.getElementById('seg-bcv').classList.add('activo');
    if(modo === 'USDT') document.getElementById('seg-usdt').classList.add('activo');
    if(modo === 'EUR') document.getElementById('seg-eur').classList.add('activo');
    if(modo === 'Custom') document.getElementById('seg-custom').classList.add('activo');

    const inputTasa = document.getElementById('input-tasa-activa');
    const lblDivisa = document.getElementById('lbl-divisa');
    const symDivisa = document.getElementById('sym-divisa');
    const avisoUsdt = document.getElementById('aviso-usdt-calc');
    const boxP2PUsdt = document.getElementById('box-usdt-p2p-calc');

    if (avisoUsdt) {
        avisoUsdt.classList.toggle('oculto', modo !== 'USDT');
        avisoUsdt.style.display = modo === 'USDT' ? 'block' : 'none';
    }
    if (boxP2PUsdt) {
        const mostrarP2P = modo === 'USDT' && !fechaHistoricaCalcSeleccionada;
        boxP2PUsdt.classList.toggle('oculto', !mostrarP2P);
        boxP2PUsdt.style.display = mostrarP2P ? 'block' : 'none';
    }

    let valorUsar = tasasData[modo] ? tasasData[modo].valor : 1;
    if (modo === 'USDT' && !fechaHistoricaCalcSeleccionada) {
        const p2pVal = usdtP2PData.modoPrecio === 'sell' ? Number(usdtP2PData.sell) : Number(usdtP2PData.buy);
        if (p2pVal > 0) valorUsar = p2pVal;
    } else if (modo !== 'Custom' && fechaHistoricaCalcSeleccionada) {
        const histObj = obtenerTasaEnFechaHistorica(modo, fechaHistoricaCalcSeleccionada);
        if (histObj && histObj.valor > 0) valorUsar = histObj.valor;
    }

    if(modo === 'BCV') { inputTasa.value = valorUsar.toFixed(2); inputTasa.disabled = true; lblDivisa.innerText = '🇺🇸 Dólares (USD)'; symDivisa.innerText = '$'; }
    if(modo === 'USDT') {
        const etqModo = usdtP2PData.modoPrecio === 'sell' ? 'Venta P2P' : 'Compra P2P';
        inputTasa.value = valorUsar.toFixed(2);
        inputTasa.disabled = true;
        lblDivisa.innerText = `🪙 Tether (USDT · ${etqModo})`;
        symDivisa.innerText = '₮';
        actualizarPanelUsdtP2PUI();
    }
    if(modo === 'EUR') { inputTasa.value = valorUsar.toFixed(2); inputTasa.disabled = true; lblDivisa.innerText = '🇪🇺 Euros (EUR)'; symDivisa.innerText = '€'; }
    if(modo === 'Custom') { inputTasa.disabled = false; inputTasa.focus(); if(parseFloat(inputTasa.value) === 0) inputTasa.value = "1.00"; lblDivisa.innerText = '💱 Divisa Base'; symDivisa.innerText = '$'; }
    actualizarInfoCalculadora(modo);
    recalcularDesdeTasa();
    if (cambioReal) animarPulsoCalculadora();
}

function alternarFechaValorCalc() {
    if (fechaHistoricaCalcSeleccionada) {
        fechaHistoricaCalcSeleccionada = null;
        const inCal = document.getElementById('input-calc-fecha-hist');
        if (inCal) inCal.value = '';
        aplicarTasasEnInterfaz();
        animarPulsoCalculadora();
        return;
    }
    if (!hayFechaPosteriorBCV) return;
    usandoFechaPosterior = !usandoFechaPosterior;
    aplicarTasasEnInterfaz();
    animarPulsoCalculadora();
}

function seleccionarFechaHistoricaCalc(fechaISO) {
    const inCal = document.getElementById('input-calc-fecha-hist');
    if (!fechaISO) {
        fechaHistoricaCalcSeleccionada = null;
        aplicarTasasEnInterfaz();
        return;
    }

    const hoyIso = getLocalYYYYMMDD();
    const maxFechaPermitida = obtenerFechaMaximaPermitidaCalculadora();

    // Impedir estrictamente que seleccionen una fecha futura no publicada por el BCV
    if (fechaISO > maxFechaPermitida) {
        if (hayFechaPosteriorBCV && tasasFechaPosterior.BCV && tasasFechaPosterior.BCV.fecha === maxFechaPermitida) {
            alert(`⚠️ Solo puedes adelantar hasta el ${formatFechaCorta(maxFechaPermitida)}, que es la Fecha Valor publicada por el BCV.`);
            if (inCal) inCal.value = maxFechaPermitida;
            fechaHistoricaCalcSeleccionada = null;
            usandoFechaPosterior = true;
        } else {
            alert("⚠️ El BCV aún no ha publicado tasa para una fecha posterior. Solo puedes consultar hasta el día de hoy.");
            if (inCal) inCal.value = hoyIso;
            fechaHistoricaCalcSeleccionada = null;
            usandoFechaPosterior = false;
        }
        aplicarTasasEnInterfaz();
        return;
    }

    if (fechaISO === hoyIso) {
        fechaHistoricaCalcSeleccionada = null;
        usandoFechaPosterior = false;
        aplicarTasasEnInterfaz();
        return;
    }
    if (hayFechaPosteriorBCV && tasasFechaPosterior.BCV && fechaISO === tasasFechaPosterior.BCV.fecha) {
        fechaHistoricaCalcSeleccionada = null;
        usandoFechaPosterior = true;
        aplicarTasasEnInterfaz();
        return;
    }
    fechaHistoricaCalcSeleccionada = fechaISO;
    if (calcModoTasa === 'Custom') calcModoTasa = 'BCV';
    setTasaModo(calcModoTasa);
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
function limpiarCalc() {
    const inUsd = document.getElementById('calc-usd');
    const inVes = document.getElementById('calc-ves');
    if (inUsd) inUsd.value = '';
    if (inVes) inVes.value = '';
    document.querySelectorAll('#tab-calculadora .calc-row').forEach(row => {
        row.classList.remove('calc-clear-bounce');
        void row.offsetWidth;
        row.classList.add('calc-clear-bounce');
    });
}

// ================= CEREBRO INTELIGENTE DE TASAS + HISTORIAL REAL PERSISTENTE =================
function procesarHistorial(key, currentValor, currentFecha) {
    let history = JSON.parse(localStorage.getItem(`history_${key}`));
    const hoy = new Date().toDateString();
    if (!history) history = { prev: currentValor, last: currentValor, date: hoy };
    if (history.date !== hoy) { history.prev = history.last; history.date = hoy; }
    if (currentValor > 0) history.last = currentValor; 
    localStorage.setItem(`history_${key}`, JSON.stringify(history));
    return { valor: history.last, previo: history.prev, fecha: currentFecha };
}

function normalizarSerieHistorica(listaRaw, valorActual = null, fechaActualRaw = null) {
    const mapa = {};
    if (Array.isArray(listaRaw)) {
        listaRaw.forEach(item => {
            if (!item) return;
            const prom = Number(item.promedio ?? item.valor ?? 0);
            const fStr = String(item.fecha || item.fechaActualizacion || '').slice(0, 10);
            if (prom > 0 && /^\d{4}-\d{2}-\d{2}$/.test(fStr)) {
                mapa[fStr] = { fecha: fStr, promedio: prom };
            }
        });
    }
    if (valorActual && Number(valorActual) > 0 && fechaActualRaw) {
        const fAct = getLocalYYYYMMDD(parsearFechaSeguraLocal(fechaActualRaw));
        mapa[fAct] = { fecha: fAct, promedio: Number(valorActual) };
    }
    return Object.values(mapa).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function extraerVigenteYFuturaDeSerie(serie, valorLive, fechaLiveRaw, keyFallback) {
    const hoyIso = getLocalYYYYMMDD();
    if (!Array.isArray(serie) || serie.length === 0) {
        const fallback = procesarHistorial(keyFallback, valorLive || 1, fechaLiveRaw || hoyIso);
        return { vigente: fallback, futura: null };
    }

    const buscarPrevioDiferente = (idx) => {
        if (idx <= 0) return serie[0].promedio;
        let prev = serie[idx - 1].promedio;
        if (Math.abs(serie[idx].promedio - prev) < 0.0001) {
            for (let k = idx - 2; k >= Math.max(0, idx - 5); k--) {
                if (Math.abs(serie[idx].promedio - serie[k].promedio) >= 0.0001) {
                    prev = serie[k].promedio;
                    break;
                }
            }
        }
        return prev;
    };

    let idxVigente = -1;
    let idxFutura = -1;
    for (let i = 0; i < serie.length; i++) {
        if (serie[i].fecha <= hoyIso) idxVigente = i;
        else if (idxFutura === -1) idxFutura = i;
    }
    if (idxVigente === -1) idxVigente = serie.length - 1;

    const itemVig = serie[idxVigente];
    const vigenteObj = {
        valor: itemVig.promedio,
        previo: buscarPrevioDiferente(idxVigente),
        fecha: itemVig.fecha
    };

    let futuraObj = null;
    if (idxFutura !== -1) {
        const itemFut = serie[idxFutura];
        futuraObj = {
            valor: itemFut.promedio,
            previo: itemVig.promedio,
            fecha: itemFut.fecha
        };
    } else if (fechaLiveRaw) {
        const fLiveIso = getLocalYYYYMMDD(parsearFechaSeguraLocal(fechaLiveRaw));
        if (fLiveIso > hoyIso && Number(valorLive) > 0) {
            futuraObj = {
                valor: Number(valorLive),
                previo: itemVig.promedio,
                fecha: fLiveIso
            };
        }
    }

    if (!futuraObj && Number(valorLive) > 0) {
        vigenteObj.valor = Number(valorLive);
    }

    return { vigente: vigenteObj, futura: futuraObj };
}

function actualizarPanelUsdtP2PUI() {
    const buyVal = Number(usdtP2PData?.buy) || Number(tasasData?.USDT?.valor) || 0;
    const sellVal = Number(usdtP2PData?.sell) || buyVal || 0;
    const spreadVal = Number(usdtP2PData?.spread) || (sellVal > 0 ? Math.abs(((buyVal - sellVal) / sellVal) * 100) : 0);
    const bybitBuy = Number(usdtP2PData?.bybitBuy) || 0;
    const bybitSell = Number(usdtP2PData?.bybitSell) || 0;
    const modoPrecio = usdtP2PData?.modoPrecio === 'sell' ? 'sell' : 'buy';

    const elBuy = document.getElementById('val-usdt-p2p-buy');
    const elSell = document.getElementById('val-usdt-p2p-sell');
    const elSpread = document.getElementById('usdt-p2p-spread-lbl');
    const btnBuy = document.getElementById('btn-usdt-p2p-buy');
    const btnSell = document.getElementById('btn-usdt-p2p-sell');
    const elBybit = document.getElementById('lbl-usdt-bybit-ref');
    const elBrechaP2P = document.getElementById('lbl-usdt-brecha-ref');

    if (elBuy && buyVal > 0) elBuy.innerText = `Bs ${buyVal.toFixed(2)}`;
    if (elSell && sellVal > 0) elSell.innerText = `Bs ${sellVal.toFixed(2)}`;
    if (elSpread) elSpread.innerText = `Spread: ${spreadVal.toFixed(2)}%`;
    if (btnBuy) btnBuy.classList.toggle('activo', modoPrecio === 'buy');
    if (btnSell) btnSell.classList.toggle('activo', modoPrecio === 'sell');

    if (elBybit) {
        if (bybitBuy > 0 && bybitSell > 0) {
            elBybit.innerText = `Bybit P2P: C ${bybitBuy.toFixed(2)} · V ${bybitSell.toFixed(2)}`;
        } else {
            elBybit.innerText = `Fuente P2P verificada en vivo`;
        }
    }
    if (elBrechaP2P) {
        const bcvRef = Number(tasaBCV) || 1;
        const refUsdt = modoPrecio === 'sell' ? sellVal : buyVal;
        const brechaCalc = bcvRef > 0 && refUsdt > 0 ? ((refUsdt - bcvRef) / bcvRef) * 100 : (Number(usdtP2PData?.brechaPct) || 0);
        const signo = brechaCalc > 0 ? '+' : '';
        elBrechaP2P.innerText = `Brecha vs BCV: ${signo}${brechaCalc.toFixed(2)}%`;
    }

    // Indicadores de Compra / Venta en el Widget de Inicio (#tab-inicio)
    const badgeHomeModo = document.getElementById('badge-modo-usdt-home');
    if (badgeHomeModo) {
        badgeHomeModo.innerText = modoPrecio === 'sell' ? '(VENTA)' : '(COMPRA)';
    }
    const subHomeCV = document.getElementById('sub-usdt-cv-home');
    if (subHomeCV) {
        if (buyVal > 0 && sellVal > 0) {
            subHomeCV.classList.remove('oculto');
            subHomeCV.innerText = `C: ${buyVal.toFixed(2)} · V: ${sellVal.toFixed(2)}`;
        } else {
            subHomeCV.classList.add('oculto');
        }
    }
}

function seleccionarPrecioUsdtP2P(modoPrecio) {
    const nuevoModo = modoPrecio === 'sell' ? 'sell' : 'buy';
    usdtP2PData.modoPrecio = nuevoModo;
    localStorage.setItem('assist_usdt_modo_precio', nuevoModo);
    localStorage.setItem('assist_usdt_p2p_data', JSON.stringify(usdtP2PData));

    const valorElegido = nuevoModo === 'sell' ? Number(usdtP2PData.sell) : Number(usdtP2PData.buy);
    if (valorElegido > 0) {
        tasasVigentesHoy.USDT.valor = valorElegido;
        tasasData.USDT.valor = valorElegido;
        tasaParalelo = valorElegido;
    }

    aplicarTasasEnInterfaz();
    if (calcModoTasa === 'USDT') {
        setTasaModo('USDT');
        animarPulsoCalculadora();
    }
}

function alternarModoPrecioUsdtHome() {
    const siguiente = usdtP2PData.modoPrecio === 'sell' ? 'buy' : 'sell';
    seleccionarPrecioUsdtP2P(siguiente);
}

function aplicarTasasEnInterfaz() {
    if (usandoFechaPosterior && hayFechaPosteriorBCV && tasasFechaPosterior.BCV) {
        tasasData.BCV = { ...tasasFechaPosterior.BCV };
        tasasData.EUR = tasasFechaPosterior.EUR ? { ...tasasFechaPosterior.EUR } : { ...tasasVigentesHoy.EUR };
    } else {
        tasasData.BCV = { ...tasasVigentesHoy.BCV };
        tasasData.EUR = { ...tasasVigentesHoy.EUR };
    }

    // Asegurar que USDT refleje siempre el modo P2P activo (Compra o Venta de usdt.com.ve) y jamás caiga a BCV
    const p2pElegido = usdtP2PData.modoPrecio === 'sell' ? Number(usdtP2PData.sell) : Number(usdtP2PData.buy);
    if (p2pElegido > 0) {
        tasasVigentesHoy.USDT.valor = p2pElegido;
    }
    tasasData.USDT = { ...tasasVigentesHoy.USDT };
    tasasData.Custom.fecha = new Date().toISOString();

    tasaBCV = tasasData.BCV.valor || 1;
    tasaEUR = tasasData.EUR.valor || 1;
    tasaParalelo = tasasData.USDT.valor || p2pElegido || 1;

    actualizarLimiteCalendarioCalculadora();

    const setVariacionHome = (id, dataObj) => {
        const el = document.getElementById(id);
        if (!el || !dataObj) return;
        const diffAbs = dataObj.valor - dataObj.previo;
        const pct = dataObj.previo ? ((diffAbs / dataObj.previo) * 100).toFixed(2) : "0.00";
        if (diffAbs > 0.0001) { el.innerText = `+${pct}%`; el.className = 'tasa-variacion var-positiva'; }
        else if (diffAbs < -0.0001) { el.innerText = `${pct}%`; el.className = 'tasa-variacion var-negativa'; }
        else { el.innerText = `0.00%`; el.className = 'tasa-variacion var-neutra'; }
    };

    setVariacionHome('var-bcv', tasasData.BCV);
    setVariacionHome('var-eur', tasasData.EUR);
    setVariacionHome('var-usdt', tasasData.USDT);

    const elValBcv = document.getElementById('val-bcv');
    const elValEur = document.getElementById('val-eur');
    const elValUsdt = document.getElementById('val-usdt');
    if (elValBcv) elValBcv.innerText = `Bs ${tasaBCV.toFixed(2)}`;
    if (elValEur) elValEur.innerText = `Bs ${tasaEUR.toFixed(2)}`;
    if (elValUsdt) elValUsdt.innerText = `Bs ${tasaParalelo.toFixed(2)}`;

    const elFechaTasas = document.getElementById('fecha-tasas');
    if (elFechaTasas) {
        const fechaRef = tasasData.BCV.fecha || getLocalYYYYMMDD();
        const f = parsearFechaSeguraLocal(fechaRef);
        const prefijo = (usandoFechaPosterior && hayFechaPosteriorBCV) ? '⏳ Fecha Valor:' : '🗓️ Vigente:';
        elFechaTasas.innerText = `${prefijo} ${f.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short' })}`;
    }

    actualizarBrechaCambiaria();
    actualizarPanelUsdtP2PUI();

    const inputTasaUsdtVes = document.getElementById('input-tasa-usdt-ves');
    if (inputTasaUsdtVes && (!inputTasaUsdtVes.value || parseFloat(inputTasaUsdtVes.value) <= 1)) {
        inputTasaUsdtVes.value = tasaParalelo.toFixed(2);
        if (typeof calcularEquivalenteUsdtVes === 'function') calcularEquivalenteUsdtVes();
    }

    actualizarInfoCalculadora(calcModoTasa);
    if (calcModoTasa !== 'Custom') {
        let tasaMostrarCalc = fechaHistoricaCalcSeleccionada
            ? obtenerTasaEnFechaHistorica(calcModoTasa, fechaHistoricaCalcSeleccionada).valor
            : tasasData[calcModoTasa].valor;
        if (calcModoTasa === 'USDT' && !fechaHistoricaCalcSeleccionada && p2pElegido > 0) {
            tasaMostrarCalc = p2pElegido;
        }
        const inActiva = document.getElementById('input-tasa-activa');
        if (inActiva) inActiva.value = (Number(tasaMostrarCalc) || 1).toFixed(2);
    }
    recalcularDesdeTasa();
    if (typeof renderizarSliderCuentas === 'function') renderizarSliderCuentas();
    if (typeof renderizarAgenda === 'function') renderizarAgenda();
}

async function fetchJsonConTimeout(url, timeoutMs = 6500) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

function cargarTasasCacheLocalInmediato() {
    const hoyIso = getLocalYYYYMMDD();
    const p2pCached = usdtP2PData.modoPrecio === 'sell' ? Number(usdtP2PData.sell) : Number(usdtP2PData.buy);

    if (tasasHistoricas.BCV.length > 0 || tasasHistoricas.USDT.length > 0 || p2pCached > 0) {
        const infoBCV = extraerVigenteYFuturaDeSerie(tasasHistoricas.BCV, null, null, 'BCV');
        const infoEUR = extraerVigenteYFuturaDeSerie(tasasHistoricas.EUR, null, null, 'EUR');
        const infoUSDT = extraerVigenteYFuturaDeSerie(tasasHistoricas.USDT, p2pCached > 0 ? p2pCached : null, null, 'USDT');
        tasasVigentesHoy.BCV = infoBCV.vigente;
        tasasVigentesHoy.EUR = infoEUR.vigente;
        tasasVigentesHoy.USDT = infoUSDT.vigente;
        if (p2pCached > 0) tasasVigentesHoy.USDT.valor = p2pCached;
        tasasFechaPosterior.BCV = infoBCV.futura;
        tasasFechaPosterior.EUR = infoEUR.futura;
        hayFechaPosteriorBCV = Boolean(infoBCV.futura);
        aplicarTasasEnInterfaz();
        return true;
    }

    const hBCV = JSON.parse(localStorage.getItem('history_BCV') || 'null');
    const hEUR = JSON.parse(localStorage.getItem('history_EUR') || 'null');
    const hUSDT = JSON.parse(localStorage.getItem('history_USDT') || 'null');
    if ((hBCV && Number(hBCV.last) > 1) || (hUSDT && Number(hUSDT.last) > 1)) {
        if (hBCV && Number(hBCV.last) > 1) {
            tasasVigentesHoy.BCV = { valor: Number(hBCV.last), previo: Number(hBCV.prev) || Number(hBCV.last), fecha: hoyIso };
            tasasVigentesHoy.EUR = { valor: Number(hEUR?.last) || Number(hBCV.last), previo: Number(hEUR?.prev) || Number(hEUR?.last) || 1, fecha: hoyIso };
        }
        // JAMÁS usar BCV como fallback para USDT
        const usdtInitVal = p2pCached > 0 ? p2pCached : (Number(hUSDT?.last) > 1 ? Number(hUSDT.last) : 1);
        tasasVigentesHoy.USDT = { valor: usdtInitVal, previo: Number(hUSDT?.prev) || usdtInitVal, fecha: hoyIso };
        aplicarTasasEnInterfaz();
        return true;
    }
    return false;
}

async function obtenerTasas() {
    // 1. Mostrar de inmediato cualquier historial en caché para no dejar "Conectando..."
    cargarTasasCacheLocalInmediato();

    try {
        // Prioridad absoluta para USDT (Compra/Venta P2P) y verificación BCV en vivo desde usdt.com.ve
        const [resUsdtVe, dataBCV, dataEUR, dataParalelo, rawHistBCV, rawHistEUR, rawHistUSDT] = await Promise.all([
            fetchJsonConTimeout('https://www.usdt.com.ve/api/v1/rates/current', 6000),
            fetchJsonConTimeout('https://ve.dolarapi.com/v1/dolares/oficial', 6500),
            fetchJsonConTimeout('https://ve.dolarapi.com/v1/euros/oficial', 6500),
            fetchJsonConTimeout('https://ve.dolarapi.com/v1/dolares/paralelo', 6500),
            fetchJsonConTimeout('https://ve.dolarapi.com/v1/historicos/dolares/oficial', 7500),
            fetchJsonConTimeout('https://ve.dolarapi.com/v1/historicos/euros/oficial', 7500),
            fetchJsonConTimeout('https://ve.dolarapi.com/v1/historicos/dolares/paralelo', 7500)
        ]);

        const liveUsdtVe = resUsdtVe?.data || null;
        let usdtBuy = Number(liveUsdtVe?.binance?.buy_rate || liveUsdtVe?.best?.buy_rate || 0);
        let usdtSell = Number(liveUsdtVe?.binance?.sell_rate || 0);
        let usdtSpread = Number(liveUsdtVe?.binance?.spread || 0);
        let bybitBuy = Number(liveUsdtVe?.bybit?.buy_rate || 0);
        let bybitSell = Number(liveUsdtVe?.bybit?.sell_rate || 0);
        let bcvFromUsdtVe = Number(liveUsdtVe?.bcv?.rate || 0);
        let brechaFromUsdtVe = Number(liveUsdtVe?.brecha_pct || 0);
        let fechaUsdtVe = liveUsdtVe?.captured_at || null;

        if (usdtBuy > 0) {
            if (usdtSell <= 0) usdtSell = Number((usdtBuy * 0.995).toFixed(2));
            usdtP2PData = {
                ...usdtP2PData,
                buy: usdtBuy,
                sell: usdtSell,
                spread: usdtSpread,
                bybitBuy: bybitBuy,
                bybitSell: bybitSell,
                brechaPct: brechaFromUsdtVe,
                capturedAt: fechaUsdtVe || new Date().toISOString(),
                modoPrecio: usdtP2PData.modoPrecio === 'sell' ? 'sell' : 'buy'
            };
            localStorage.setItem('assist_usdt_p2p_data', JSON.stringify(usdtP2PData));
        } else if (Number(dataParalelo?.promedio || dataParalelo?.valor) > 0) {
            // Fallback secundario P2P (nunca BCV) solo si usdt.com.ve no respondió y no había P2P previo
            const refPar = Number(dataParalelo.promedio || dataParalelo.valor);
            if (!usdtP2PData.buy || usdtP2PData.buy <= 1) {
                usdtP2PData.buy = refPar;
                usdtP2PData.sell = Number((refPar * 0.995).toFixed(2));
                localStorage.setItem('assist_usdt_p2p_data', JSON.stringify(usdtP2PData));
            }
        }

        // Tasa USDT activa según el modo elegido (Compra o Venta P2P de usdt.com.ve), jamás BCV
        const usdtActivoP2P = usdtP2PData.modoPrecio === 'sell' ? Number(usdtP2PData.sell) : Number(usdtP2PData.buy);
        let usdtPromedio = usdtActivoP2P > 0 ? usdtActivoP2P : (Number(dataParalelo?.promedio || dataParalelo?.valor) || null);
        let usdtFecha = fechaUsdtVe || dataParalelo?.fechaActualizacion || dataParalelo?.fecha || getLocalYYYYMMDD();

        // BCV: priorizar Fecha Valor oficial de dolarapi o tasa en vivo de usdt.com.ve
        let bcvPromedio = dataBCV?.promedio || dataBCV?.valor || (bcvFromUsdtVe > 0 ? bcvFromUsdtVe : null);
        let bcvFecha = dataBCV?.fechaActualizacion || dataBCV?.fecha || fechaUsdtVe || null;
        let eurPromedio = dataEUR?.promedio || dataEUR?.valor || null;
        let eurFecha = dataEUR?.fechaActualizacion || dataEUR?.fecha || null;

        if (!bcvPromedio) {
            const listaDolares = await fetchJsonConTimeout('https://ve.dolarapi.com/v1/dolares', 5000);
            if (Array.isArray(listaDolares)) {
                const ofi = listaDolares.find(d => d.fuente === 'oficial');
                if (ofi?.promedio) { bcvPromedio = ofi.promedio; bcvFecha = ofi.fechaActualizacion; }
            }
        }

        if (!bcvPromedio && !eurPromedio && !usdtPromedio && !rawHistBCV) {
            throw new Error("Sin respuesta de los servidores de tasas");
        }

        if (bcvPromedio) procesarHistorial('BCV', Number(bcvPromedio), bcvFecha || getLocalYYYYMMDD());
        if (eurPromedio) procesarHistorial('EUR', Number(eurPromedio), eurFecha || getLocalYYYYMMDD());
        if (usdtPromedio) procesarHistorial('USDT', Number(usdtPromedio), usdtFecha || getLocalYYYYMMDD());

        tasasHistoricas.BCV = normalizarSerieHistorica(Array.isArray(rawHistBCV) ? rawHistBCV : tasasHistoricas.BCV, bcvPromedio, bcvFecha);
        tasasHistoricas.EUR = normalizarSerieHistorica(Array.isArray(rawHistEUR) ? rawHistEUR : tasasHistoricas.EUR, eurPromedio, eurFecha);
        tasasHistoricas.USDT = normalizarSerieHistorica(Array.isArray(rawHistUSDT) ? rawHistUSDT : tasasHistoricas.USDT, usdtPromedio, usdtFecha);

        if (tasasHistoricas.BCV.length > 0) localStorage.setItem('assist_hist_serie_BCV', JSON.stringify(tasasHistoricas.BCV.slice(-120)));
        if (tasasHistoricas.EUR.length > 0) localStorage.setItem('assist_hist_serie_EUR', JSON.stringify(tasasHistoricas.EUR.slice(-120)));
        if (tasasHistoricas.USDT.length > 0) localStorage.setItem('assist_hist_serie_USDT', JSON.stringify(tasasHistoricas.USDT.slice(-120)));

        const analisisBCV = extraerVigenteYFuturaDeSerie(tasasHistoricas.BCV, bcvPromedio, bcvFecha, 'BCV');
        const analisisEUR = extraerVigenteYFuturaDeSerie(tasasHistoricas.EUR, eurPromedio, eurFecha, 'EUR');
        const analisisUSDT = extraerVigenteYFuturaDeSerie(tasasHistoricas.USDT, usdtPromedio, usdtFecha, 'USDT');

        tasasVigentesHoy.BCV = analisisBCV.vigente;
        tasasVigentesHoy.EUR = analisisEUR.vigente;
        tasasVigentesHoy.USDT = analisisUSDT.vigente;
        if (usdtPromedio > 0) {
            tasasVigentesHoy.USDT.valor = Number(usdtPromedio);
        }

        tasasFechaPosterior.BCV = analisisBCV.futura;
        tasasFechaPosterior.EUR = analisisEUR.futura;
        hayFechaPosteriorBCV = Boolean(analisisBCV.futura);
        if (!hayFechaPosteriorBCV) usandoFechaPosterior = false;

        aplicarTasasEnInterfaz();
    } catch (error) {
        console.error("Error de conexión al obtener tasas", error);
        const teniaCache = cargarTasasCacheLocalInmediato();
        const elFecha = document.getElementById('fecha-tasas');
        const badgeCalc = document.getElementById('calc-fecha-badge');
        if (!teniaCache) {
            if (elFecha) elFecha.innerText = `⚠️ Sin conexión (Modo Offline)`;
            if (badgeCalc) badgeCalc.innerText = `⚠️ Modo Offline`;
        }
    }
}

async function actualizarTasasManual() {
    const btn = document.getElementById('btn-refresh-tasas');
    if (btn) btn.classList.add('spin');
    await obtenerTasas();
    if (typeof actualizarInterfaz === 'function') actualizarInterfaz();
    if (btn) setTimeout(() => btn.classList.remove('spin'), 1000); 
}

// Disparo temprano en paralelo para que las tasas carguen de inmediato sin esperar a Supabase
setTimeout(() => {
    actualizarLimiteCalendarioCalculadora();
    cargarTasasCacheLocalInmediato();
}, 0);