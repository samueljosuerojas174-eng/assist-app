// ================= ASKBOT 4.0 — COPILOTO FINANCIERO Y ASESOR INTERACTIVO LOCAL =================
// Motor 100% Local-First basado en Tarjetas Interactivas (Consultas en Vivo + Enciclopedia de la App)

let askbotCategoriaActiva = null;
let askbotInicializado = false;
let askbotRespondiendo = false;

// ================= 1. GENERADORES DE CONSULTAS DINÁMICAS EN VIVO =================

function askbotFormatearDinero(montoTexto) {
    if (typeof formatearMontoCensurado === 'function') {
        return formatearMontoCensurado(montoTexto, false);
    }
    return montoTexto;
}

function askbotConsultaTasasHoy() {
    const bcv = Number(tasaBCV) || 1;
    const eur = Number(tasaEUR) || 1;
    const usdt = Number(tasaParalelo) || 1;
    const brechaPct = bcv > 0 ? (((usdt - bcv) / bcv) * 100) : 0;
    const signoBrecha = brechaPct > 0 ? '+' : '';

    const dataBcv = (typeof tasasVigentesHoy !== 'undefined' && tasasVigentesHoy.BCV) ? tasasVigentesHoy.BCV : (tasasData ? tasasData.BCV : null);
    const dataEur = (typeof tasasVigentesHoy !== 'undefined' && tasasVigentesHoy.EUR) ? tasasVigentesHoy.EUR : (tasasData ? tasasData.EUR : null);
    const dataUsdt = (typeof tasasVigentesHoy !== 'undefined' && tasasVigentesHoy.USDT) ? tasasVigentesHoy.USDT : (tasasData ? tasasData.USDT : null);

    const fmtVar = (obj) => {
        if (!obj || !obj.previo) return '0.00%';
        const diff = obj.valor - obj.previo;
        const pct = ((diff / obj.previo) * 100).toFixed(2);
        if (diff > 0.0001) return `📈 +${pct}%`;
        if (diff < -0.0001) return `📉 ${pct}%`;
        return `➖ 0.00%`;
    };

    const fechaStr = (dataBcv && dataBcv.fecha && typeof formatFechaCorta === 'function')
        ? formatFechaCorta(dataBcv.fecha)
        : 'Vigente hoy';

    return `
        <b>💱 Tasas Oficiales y P2P en Vivo (${fechaStr}):</b><br><br>
        🇻🇪 <b>Dólar BCV:</b> Bs ${bcv.toFixed(2)} <small>(${fmtVar(dataBcv)})</small><br>
        🇪🇺 <b>Euro BCV:</b> Bs ${eur.toFixed(2)} <small>(${fmtVar(dataEur)})</small><br>
        🪙 <b>USDT (P2P):</b> Bs ${usdt.toFixed(2)} <small>(${fmtVar(dataUsdt)})</small><br><br>
        📊 <b>Brecha Cambiaria ($/USDT):</b> <b>${signoBrecha}${brechaPct.toFixed(2)}%</b><br>
        <small style="opacity:0.8;">💡 Por cada $100 a tasa USDT recibes Bs ${(100 * usdt).toFixed(2)}, equivalentes a <b>$${bcv > 0 ? ((100 * usdt) / bcv).toFixed(2) : '0.00'} BCV</b>.</small>
    `;
}

function askbotConsultaTasaManana() {
    const bcvHoy = (typeof tasasVigentesHoy !== 'undefined' && tasasVigentesHoy.BCV) ? tasasVigentesHoy.BCV.valor : (Number(tasaBCV) || 1);

    if (typeof hayFechaPosteriorBCV !== 'undefined' && hayFechaPosteriorBCV && tasasFechaPosterior && tasasFechaPosterior.BCV) {
        const futBcv = tasasFechaPosterior.BCV;
        const futEur = tasasFechaPosterior.EUR;
        const diffBcv = futBcv.valor - bcvHoy;
        const pctBcv = bcvHoy > 0 ? ((diffBcv / bcvHoy) * 100).toFixed(2) : '0.00';
        const signo = diffBcv >= 0 ? '+' : '';
        const fCorta = typeof formatFechaCorta === 'function' ? formatFechaCorta(futBcv.fecha) : futBcv.fecha;

        return `
            <b>⏳ ¡Sí! Ya está disponible la Fecha Valor BCV (${fCorta}):</b><br><br>
            🇻🇪 <b>Nuevo Dólar BCV:</b> Bs ${futBcv.valor.toFixed(2)}<br>
            📈 <b>Variación vs Hoy:</b> ${signo}${diffBcv.toFixed(2)} Bs (${signo}${pctBcv}%)<br>
            ${futEur ? `🇪🇺 <b>Nuevo Euro BCV:</b> Bs ${futEur.valor.toFixed(2)}<br>` : ''}<br>
            <small style="opacity:0.85;">💡 Puedes tocar el botón amarillo <b>📅→</b> en Inicio o en la Calculadora para hacer tus cuentas de una vez con esta tasa.</small>
        `;
    }

    return `
        <b>🗓️ Aún no hay Fecha Valor posterior publicada:</b><br><br>
        En este momento el BCV no ha publicado una tasa para una fecha futura (normalmente se actualiza en la tarde de los días hábiles).<br><br>
        📌 <b>Tasa BCV vigente actual:</b> Bs ${Number(bcvHoy).toFixed(2)}<br>
        <small style="opacity:0.8;">Apenas el BCV publique la tasa del siguiente día hábil, verás aparecer automáticamente el botón amarillo <b>📅→</b> en Inicio y en Conversión.</small>
    `;
}

function askbotConsultaPatrimonio() {
    if (!Array.isArray(cuentas) || cuentas.length === 0) {
        return `
            <b>💳 Aún no tienes cuentas registradas:</b><br><br>
            Ve a la pestaña <b>Ajustes > 💳 Gestionar Cuentas</b> para crear tus cuentas en Bolívares (VES), Dólares (USD) o Cripto (USDT) y empezar a llevar tu control de capital.
        `;
    }

    let patrimonioTotalUSD = 0;
    let desgloseHTML = '';

    cuentas.forEach(c => {
        let balUSD = 0;
        transacciones.forEach(t => {
            if (t.cuentaId == c.id) {
                balUSD += t.tipo === 'ingreso' ? (Number(t.montoUSD) || 0) : -(Number(t.montoUSD) || 0);
            }
        });
        patrimonioTotalUSD += balUSD;

        let textoSaldoCuenta = '';
        if (c.moneda === 'VES') {
            const bs = Math.max(0, balUSD * (tasaBCV || 1));
            textoSaldoCuenta = `${askbotFormatearDinero('Bs ' + bs.toFixed(2))} <small>(${askbotFormatearDinero('$' + balUSD.toFixed(2))})</small>`;
        } else if (c.moneda === 'USDT') {
            textoSaldoCuenta = `${askbotFormatearDinero('USDT ' + balUSD.toFixed(2))} <small>(≈ ${askbotFormatearDinero('Bs ' + (balUSD * (tasaParalelo || 1)).toFixed(2))})</small>`;
        } else {
            textoSaldoCuenta = askbotFormatearDinero('$' + balUSD.toFixed(2));
        }

        desgloseHTML += `• <b>${c.nombre}:</b> ${textoSaldoCuenta}<br>`;
    });

    const totalBsEquiv = patrimonioTotalUSD * (tasaBCV || 1);

    return `
        <b>💰 Radiografía de tu Capital Actual:</b><br><br>
        ${desgloseHTML}<br>
        🏆 <b>Patrimonio Total Consolidado:</b> <b>${askbotFormatearDinero('$' + patrimonioTotalUSD.toFixed(2))}</b><br>
        🇻🇪 <b>Equivalente BCV:</b> ${askbotFormatearDinero('Bs ' + totalBsEquiv.toFixed(2))}
    `;
}

function askbotConsultaGastosMes() {
    const hoyIso = typeof getLocalYYYYMMDD === 'function' ? getLocalYYYYMMDD() : new Date().toISOString().slice(0, 10);
    const claveMes = hoyIso.slice(0, 7);

    let gastosHoyUSD = 0;
    let gastosMesUSD = 0;
    let ingresosMesUSD = 0;
    const porCategoria = {};

    transacciones.forEach(t => {
        if (t.categoria === 'Transferencia / P2P') return;
        const fObj = t.fecha ? new Date(t.fecha) : new Date(t.id);
        const iso = t.fechaIsoLocal || (typeof getLocalYYYYMMDD === 'function' ? getLocalYYYYMMDD(fObj) : '');
        const monto = Number(t.montoUSD) || 0;

        if (iso === hoyIso && t.tipo === 'gasto') {
            gastosHoyUSD += monto;
        }
        if (iso.startsWith(claveMes)) {
            if (t.tipo === 'gasto') {
                gastosMesUSD += monto;
                const cat = t.categoria || 'Varios';
                porCategoria[cat] = (porCategoria[cat] || 0) + monto;
            } else if (t.tipo === 'ingreso') {
                ingresosMesUSD += monto;
            }
        }
    });

    const catsOrdenadas = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]);
    const topCatTexto = catsOrdenadas.length > 0
        ? `🔥 <b>Mayor gasto del mes:</b> ${catsOrdenadas[0][0]} (${askbotFormatearDinero('$' + catsOrdenadas[0][1].toFixed(2))} · ${((catsOrdenadas[0][1] / gastosMesUSD) * 100).toFixed(1)}%)`
        : `✨ <b>Aún no registras gastos en este mes.</b>`;

    const balanceMes = ingresosMesUSD - gastosMesUSD;
    const signoBal = balanceMes >= 0 ? '+' : '-';

    return `
        <b>📊 Balance de Gastos e Ingresos:</b><br><br>
        📅 <b>Gastado Hoy:</b> ${askbotFormatearDinero('$' + gastosHoyUSD.toFixed(2))}<br>
        📉 <b>Gastos del Mes:</b> ${askbotFormatearDinero('$' + gastosMesUSD.toFixed(2))}<br>
        📈 <b>Ingresos del Mes:</b> ${askbotFormatearDinero('$' + ingresosMesUSD.toFixed(2))}<br>
        ⚖️ <b>Flujo Neto Mensual:</b> ${askbotFormatearDinero(signoBal + '$' + Math.abs(balanceMes).toFixed(2))}<br><br>
        ${topCatTexto}
    `;
}

function askbotConsultaAgendaPendientes() {
    if (!Array.isArray(agendaPagos) || agendaPagos.length === 0) {
        return `
            <b>📅 Tu Agenda está vacía:</b><br><br>
            No tienes pagos, deudas ni suscripciones registradas. Ve a la pestaña <b>Agenda</b> y toca el botón <b>+</b> para agendar tus compromisos.
        `;
    }

    const pendientes = agendaPagos.filter(a => a.estado !== 'pagado');
    if (pendientes.length === 0) {
        return `
            <b>🎉 ¡Estás 100% al día!</b><br><br>
            Todos los compromisos de tu Agenda figuran como <b>Pagados</b>. No tienes ninguna deuda pendiente por ahora.
        `;
    }

    let totalUSD = 0;
    const vencidos = [];
    const paraHoy = [];
    const proximos = [];

    pendientes.forEach(a => {
        const eqUSD = typeof convertirMontoAgendaAUSD === 'function' ? convertirMontoAgendaAUSD(a.monto, a.moneda) : (Number(a.monto) || 0);
        totalUSD += eqUSD;
        const dias = typeof calcularDiasRestantesAgenda === 'function' ? calcularDiasRestantesAgenda(a.fecha) : 5;
        if (dias < 0) vencidos.push(a);
        else if (dias === 0) paraHoy.push(a);
        else if (dias <= 3) proximos.push(a);
    });

    let alertasHTML = '';
    if (vencidos.length > 0) {
        alertasHTML += `🚨 <b>Vencidos (${vencidos.length}):</b> ${vencidos.map(v => v.nota).join(', ')}<br>`;
    }
    if (paraHoy.length > 0) {
        alertasHTML += `⚡ <b>Vencen HOY (${paraHoy.length}):</b> ${paraHoy.map(h => h.nota).join(', ')}<br>`;
    }
    if (proximos.length > 0) {
        alertasHTML += `⏳ <b>Próximos 3 días (${proximos.length}):</b> ${proximos.map(p => p.nota).join(', ')}<br>`;
    }
    if (!alertasHTML) {
        alertasHTML = `✅ Ningún pago vence en los próximos 3 días.<br>`;
    }

    return `
        <b>📅 Estado de tu Agenda de Pagos:</b><br><br>
        📌 <b>Compromisos pendientes:</b> ${pendientes.length}<br>
        💵 <b>Monto total estimado:</b> ≈ ${askbotFormatearDinero('$' + totalUSD.toFixed(2))}<br><br>
        ${alertasHTML}
    `;
}

function askbotConsultaMetasEstado() {
    if (!Array.isArray(metas) || metas.length === 0) {
        return `
            <b>🎯 No tienes Metas de Ahorro activas:</b><br><br>
            Ve a la pestaña <b>Metas</b> y toca el botón <b>+</b> para crear tu primer objetivo visual con foto y barra de progreso.
        `;
    }

    let totalAhorrado = 0;
    let totalObjetivo = 0;
    let listaHTML = '';

    metas.forEach(m => {
        const acum = Number(m.acumulado) || 0;
        const obj = Number(m.objetivo) || 1;
        const pct = Math.min(100, (acum / obj) * 100);
        totalAhorrado += acum;
        totalObjetivo += obj;
        listaHTML += `• <b>${m.nombre}:</b> ${askbotFormatearDinero('$' + acum.toFixed(2))} / $${obj.toFixed(2)} <b>(${pct.toFixed(1)}%)</b><br>`;
    });

    const pctGlobal = totalObjetivo > 0 ? ((totalAhorrado / totalObjetivo) * 100).toFixed(1) : '0.0';

    return `
        <b>🎯 Progreso de tus Metas de Ahorro:</b><br><br>
        ${listaHTML}<br>
        💰 <b>Total ahorrado en Metas:</b> ${askbotFormatearDinero('$' + totalAhorrado.toFixed(2))} (${pctGlobal}% del total)<br>
        🏁 <b>Te falta por reunir:</b> ${askbotFormatearDinero('$' + Math.max(0, totalObjetivo - totalAhorrado).toFixed(2))}
    `;
}

function askbotConsultaSaludFinanciera() {
    let patrimonioUSD = 0;
    cuentas.forEach(c => {
        transacciones.forEach(t => {
            if (t.cuentaId == c.id) patrimonioUSD += t.tipo === 'ingreso' ? (Number(t.montoUSD) || 0) : -(Number(t.montoUSD) || 0);
        });
    });

    const pendientes = (agendaPagos || []).filter(a => a.estado !== 'pagado');
    const deudasUSD = pendientes.reduce((acc, a) => {
        const eq = typeof convertirMontoAgendaAUSD === 'function' ? convertirMontoAgendaAUSD(a.monto, a.moneda) : (Number(a.monto) || 0);
        return acc + eq;
    }, 0);

    const libreUSD = patrimonioUSD - deudasUSD;
    const diagnóstico = libreUSD >= 0
        ? `✅ <b>Diagnóstico Positivo:</b> Con tu saldo actual cubres el 100% de tus pagos agendados y te quedan libres <b>${askbotFormatearDinero('$' + libreUSD.toFixed(2))}</b>.`
        : `⚠️ <b>Atención Financiera:</b> Tus pagos pendientes en Agenda superan tu saldo disponible actual por <b>${askbotFormatearDinero('$' + Math.abs(libreUSD).toFixed(2))}</b>.`;

    return `
        <b>🩺 Diagnóstico de Liquidez vs Deudas:</b><br><br>
        💳 <b>Saldo disponible en Cuentas:</b> ${askbotFormatearDinero('$' + patrimonioUSD.toFixed(2))}<br>
        📅 <b>Deudas pendientes en Agenda:</b> ${askbotFormatearDinero('$' + deudasUSD.toFixed(2))}<br><br>
        ${diagnóstico}
    `;
}

function askbotConsultaEstadoSistema() {
    const tienePin = Boolean(appPin);
    const tienePreguntas = Array.isArray(pinQuestions) && pinQuestions.length === 3;
    const nubeActiva = Boolean(usuarioActual);
    const pendienteSync = localStorage.getItem('assist_pending_sync') === 'true';

    let estadoNubeTxt = '📱 Solo Local (Sin cuenta conectada)';
    if (nubeActiva) {
        estadoNubeTxt = (!navigator.onLine || pendienteSync)
            ? `🟡 Conectado (${usuarioActual.email}) — Sincronización pendiente`
            : `🟢 Sincronizado en la Nube (${usuarioActual.email})`;
    }

    return `
        <b>🛡️ Estado de Seguridad y Almacenamiento:</b><br><br>
        ☁️ <b>Nube Supabase:</b> ${estadoNubeTxt}<br>
        🔒 <b>Bloqueo por PIN:</b> ${tienePin ? 'Activo (4 dígitos)' : 'Inactivo'}<br>
        🧠 <b>Preguntas de Recuperación:</b> ${tienePreguntas ? '3 configuradas' : 'No configuradas'}<br>
        🕵️‍♂️ <b>Modo Pánico:</b> ${censurado ? 'Activado (Montos ocultos)' : 'Desactivado (Montos visibles)'}<br>
        📦 <b>Registros locales:</b> ${cuentas.length} cuentas, ${transacciones.length} movimientos, ${agendaPagos.length} en agenda y ${metas.length} metas.
    `;
}

// ================= 2. DICCIONARIO COMPLETO DE CATEGORÍAS Y 40 TARJETAS =================

const ASKBOT_CATALOGO = [
    {
        id: 'cat_vivo',
        icono: '⚡',
        titulo: 'Consultas en Vivo',
        subtitulo: 'Tasas hoy/mañana, tu saldo, gastos y deudas',
        tarjetas: [
            {
                id: 'live_tasas_hoy',
                icono: '💱',
                pregunta: '¿A cómo están las tasas hoy y la brecha?',
                generarRespuesta: askbotConsultaTasasHoy
            },
            {
                id: 'live_tasa_manana',
                icono: '⏳',
                pregunta: '¿Ya salió la tasa BCV de mañana (Fecha Valor)?',
                generarRespuesta: askbotConsultaTasaManana
            },
            {
                id: 'live_patrimonio',
                icono: '💰',
                pregunta: 'Resumen de mi Capital y Cuentas',
                generarRespuesta: askbotConsultaPatrimonio
            },
            {
                id: 'live_gastos_mes',
                icono: '📊',
                pregunta: '¿Cuánto he gastado hoy y en este mes?',
                generarRespuesta: askbotConsultaGastosMes
            },
            {
                id: 'live_agenda_pendientes',
                icono: '📅',
                pregunta: '¿Qué pagos o deudas tengo pendientes?',
                generarRespuesta: askbotConsultaAgendaPendientes
            },
            {
                id: 'live_metas_estado',
                icono: '🎯',
                pregunta: '¿Cómo van mis Metas de Ahorro?',
                generarRespuesta: askbotConsultaMetasEstado
            },
            {
                id: 'live_salud_financiera',
                icono: '🩺',
                pregunta: 'Diagnóstico: ¿Mi saldo cubre mi Agenda?',
                generarRespuesta: askbotConsultaSaludFinanciera
            },
            {
                id: 'live_estado_seguridad_nube',
                icono: '🛡️',
                pregunta: 'Estado de mi Nube, PIN y Almacenamiento',
                generarRespuesta: askbotConsultaEstadoSistema
            }
        ]
    },
    {
        id: 'cat_cuentas',
        icono: '💳',
        titulo: 'Cuentas y Categorías',
        subtitulo: 'Crear cuentas, ordenar, colores y memoria',
        tarjetas: [
            {
                id: 'guia_crear_cuenta',
                icono: '➕',
                pregunta: '¿Cómo creo, edito o elimino una cuenta?',
                respuesta: `
                    <b>💳 Gestión de Cuentas Multidivisa:</b><br><br>
                    1. Ve a la pestaña <b>Ajustes</b> (abajo a la derecha) y toca <b>💳 Gestionar Cuentas</b>.<br>
                    2. Escribe el nombre (ej. <i>Mercantil</i>, <i>Efectivo</i>, <i>Binance</i>) y elige su moneda base: <b>Bs (VES)</b>, <b>USD</b> o <b>USDT</b>.<br>
                    3. Toca <b>+ Agregar Cuenta</b>.<br><br>
                    ✏️ Para renombrar una cuenta toca el botón azul <b>✏️</b>, o toca <b>🗑️</b> para eliminarla. En <b>Inicio</b>, desliza la tarjeta superior hacia los lados para cambiar de cuenta activa.
                `
            },
            {
                id: 'guia_ordenar_cuentas',
                icono: '↕️',
                pregunta: '¿Cómo cambio el orden de mis cuentas?',
                respuesta: `
                    <b>↕️ Ordenar tus Cuentas en el Slider:</b><br><br>
                    1. Entra en <b>Ajustes > 💳 Gestionar Cuentas</b>.<br>
                    2. Junto a cada cuenta verás las flechas <b>▲</b> (subir) y <b>▼</b> (bajar).<br>
                    3. La cuenta que coloques de <b>primera arriba</b> será tu cuenta principal predeterminada al abrir A$$IST.
                `
            },
            {
                id: 'guia_bloqueo_monedas',
                icono: '🔒',
                pregunta: '¿Por qué no me salen todas las monedas al registrar?',
                respuesta: `
                    <b>🧠 Bloqueo Inteligente de Monedas por Cuenta:</b><br><br>
                    Para evitar errores contables, A$$IST adapta el selector de monedas según la cuenta que tengas activa en el slider:<br><br>
                    • <b>Cuenta en USD (Efectivo):</b> Solo permite registrar en <b>USD</b>.<br>
                    • <b>Cuenta en USDT (Cripto):</b> Permite <b>USDT</b> y <b>VES</b> (pidiéndote la tasa USDT exacta).<br>
                    • <b>Cuenta en VES (Banco):</b> Permite <b>VES</b>, <b>USD</b> (calculado a BCV) y <b>EUR</b> (calculado a Euro BCV).
                `
            },
            {
                id: 'guia_crear_categoria',
                icono: '🏷️',
                pregunta: '¿Cómo creo categorías y cómo funciona su memoria?',
                respuesta: `
                    <b>🏷️ Categorías con Memoria Inteligente:</b><br><br>
                    • Ve a <b>Ajustes > 🏷️ Gestionar Categorías</b>.<br>
                    • Elige un color de la paleta o toca el cuadro de color para abrir el selector libre, escribe el nombre (ej. <i>Comida</i>, <i>Moto</i>) y toca <b>+ Agregar Categoría</b>.<br><br>
                    🧠 <b>Memoria automática:</b> Cuando selecciones una categoría en Inicio, la app recordará automáticamente con qué moneda pagaste la última vez en esa categoría y la seleccionará por ti.
                `
            },
            {
                id: 'guia_color_categoria',
                icono: '🎨',
                pregunta: '¿Cómo cambio el color de una categoría ya creada?',
                respuesta: `
                    <b>🎨 Cambiar Color en Vivo sin perder Historial:</b><br><br>
                    1. Ve a <b>Ajustes > 🏷️ Gestionar Categorías</b>.<br>
                    2. Toca directamente el <b>círculo de color</b> que está a la izquierda del nombre de cualquier categoría existente.<br>
                    3. Se abrirá un panel superior para elegir otro color de la paleta o un color libre.<br><br>
                    ✨ El nuevo color se actualizará al instante en todo tu Historial, en el Gráfico de Dona y en tu Agenda.
                `
            }
        ]
    },
    {
        id: 'cat_movimientos',
        icono: '💸',
        titulo: 'Movimientos, Comisiones y P2P',
        subtitulo: 'Gastos, Pago Móvil, Tasa USDT y Binance P2P',
        tarjetas: [
            {
                id: 'guia_comisiones_ves',
                icono: '🇻🇪',
                pregunta: '¿Cómo funcionan las comisiones bancarias en Bs?',
                respuesta: `
                    <b>🇻🇪 Comisiones Bancarias de Venezuela:</b><br><br>
                    Cuando registras un <b>Gasto</b> en moneda <b>VES</b>, se despliega automáticamente el selector de <b>Método de Pago</b>:<br><br>
                    • <b>💳 Tarjeta / POS:</b> 0 Bs de comisión.<br>
                    • <b>📱 Pago Móvil P2P:</b> Calcula el <b>0,30%</b> (con mínimo legal de Bs 14,00).<br>
                    • <b>🏪 Pago Móvil Comercio (P2C):</b> Calcula el <b>1,50%</b> (mínimo Bs 14,00).<br>
                    • <b>✍️ Comisión Manual:</b> Te permite escribir el monto exacto en Bs que te cobró el banco.<br><br>
                    La comisión se suma automáticamente al descuento de tu cuenta y queda detallada en la nota del movimiento.
                `
            },
            {
                id: 'guia_tasa_usdt_ves',
                icono: '🪙',
                pregunta: '¿Cómo registro un gasto en Bs desde mi cuenta USDT?',
                respuesta: `
                    <b>🪙 Operar en Bolívares desde una Cuenta USDT:</b><br><br>
                    Si estás parado sobre tu cuenta <b>USDT</b> y cambias la moneda del movimiento a <b>VES</b>:<br><br>
                    1. Aparecerá la caja <b>"Tasa USDT aplicada (Bs)"</b> precargada con la tasa paralela del día.<br>
                    2. Puedes editar esa tasa si vendiste tus USDT a un precio distinto.<br>
                    3. Abajo verás en vivo cuántos <b>USDT exactos</b> se descontarán o sumarán en tu billetera (incluyendo comisión de Pago Móvil si aplica).
                `
            },
            {
                id: 'guia_transferencia_p2p',
                icono: '🔄',
                pregunta: '¿Cómo hago una transferencia o cambio P2P entre cuentas?',
                respuesta: `
                    <b>🔄 Transferencias y Cambios P2P en 1 Clic:</b><br><br>
                    1. En el panel de Inicio, cambia <b>Gasto</b> por <b>Transferir</b>.<br>
                    2. Elige la cuenta <b>DESDE (Origen)</b> y la cuenta <b>HACIA (Destino)</b>.<br>
                    3. Escribe el monto arriba en la moneda de la cuenta origen.<br>
                    4. Si las cuentas tienen monedas distintas (ej. de USDT a Bs o viceversa), pon la <b>Tasa de Cambio</b>.<br><br>
                    ⚡ Al tocar <b>Registrar</b>, A$$IST descuenta el saldo de la cuenta origen y abona el monto convertido en la cuenta destino en un solo paso.
                `
            },
            {
                id: 'guia_comision_binance_usdt',
                icono: '📉',
                pregunta: '¿Cómo resto la comisión de Binance al pasar de Bs a USDT?',
                respuesta: `
                    <b>📉 Comisión P2P en USDT (Compra de USDT con Bs):</b><br><br>
                    Cuando transfieres desde una cuenta en <b>Bolívares (VES)</b> hacia una cuenta en <b>USDT</b>:<br><br>
                    1. Pon arriba el monto en Bolívares que enviaste (ej. <i>70000</i>).<br>
                    2. Pon la <b>Tasa de Cambio</b> a la que compraste (ej. <i>1004.9</i>).<br>
                    3. Debajo aparecerá el campo <b>"Comisión P2P (USDT)"</b>. Escribe ahí lo que te quitó Binance (ej. <i>0.60</i>).<br><br>
                    ✅ La app dividirá tus Bs entre la tasa, le restará los <b>0.60 USDT</b> de comisión y sumará el neto exacto en tu cuenta USDT.
                `
            },
            {
                id: 'guia_borrar_movimiento',
                icono: '🗑️',
                pregunta: '¿Cómo elimino un movimiento si me equivoqué?',
                respuesta: `
                    <b>🗑️ Deslizar para Borrar (Swipe to Delete):</b><br><br>
                    1. En Inicio, toca <b>📜 Ver Historial y Gráficos</b>.<br>
                    2. Busca el movimiento y <b>deslízalo con el dedo hacia la izquierda</b>.<br>
                    3. Toca el botón rojo de la papelera <b>🗑️</b>.<br><br>
                    💡 Al borrarlo, el dinero se devuelve (o descuenta) automáticamente del saldo de tu cuenta.
                `
            },
            {
                id: 'guia_modo_panico',
                icono: '🕵️‍♂️',
                pregunta: '¿Cómo oculto mi dinero en la calle (Modo Pánico)?',
                respuesta: `
                    <b>🕵️‍♂️ Modo Pánico / Censura Rápida:</b><br><br>
                    Tienes dos formas instantáneas de ocultar todos los montos de la app (<b>********</b>):<br><br>
                    1. <b>Doble toque rápido:</b> Da dos toques seguidos sobre cualquier parte de la tarjeta grande de tu balance en Inicio.<br>
                    2. <b>Icono del Ojo:</b> Toca el icono del ojo 👁️ al lado del nombre de tu cuenta.
                `
            }
        ]
    },
    {
        id: 'cat_historial',
        icono: '📊',
        titulo: 'Historial y Gráficos',
        subtitulo: 'Vista de hoy, total por meses, buscador y dona',
        tarjetas: [
            {
                id: 'guia_historial_hoy_total',
                icono: '📅',
                pregunta: '¿Cómo alterno entre los movimientos de HOY y el TOTAL?',
                respuesta: `
                    <b>📅 Vista del Día vs Historial Total:</b><br><br>
                    • Al tocar <b>📜 Ver Historial y Gráficos</b>, la app entra directamente filtrando los movimientos del <b>día de hoy (📅 Día)</b> para que veas rápido lo que hiciste hoy.<br>
                    • Si deseas ver toda la historia de la cuenta agrupada por <b>Mes/Año y Día</b>, solo toca el botón <b>Total</b> arriba a la derecha.
                `
            },
            {
                id: 'guia_historial_calendario_buscar',
                icono: '🔍',
                pregunta: '¿Cómo busco un gasto o filtro por una fecha específica?',
                respuesta: `
                    <b>🔍 Buscador en Vivo y Selector de Día:</b><br><br>
                    • <b>Por Fecha:</b> Dentro del Historial, toca el botón <b>📅 Día</b> para abrir el calendario nativo y elegir cualquier fecha pasada.<br>
                    • <b>Por Texto o Monto:</b> Escribe en la barra <i>"🔍 Buscar categoría, monto o nota..."</i> (ej. escribe <i>"Pizza"</i>, <i>"Comida"</i> o <i>"15.00"</i>) y tanto la lista como el gráfico se filtrarán en tiempo real.
                `
            },
            {
                id: 'guia_grafico_dona',
                icono: '🍩',
                pregunta: '¿Cómo funciona el Gráfico de Dona y los porcentajes?',
                respuesta: `
                    <b>🍩 Gráfico Interactivo por Categorías:</b><br><br>
                    • El círculo muestra en el centro el <b>total de gastos en USD</b> del periodo o filtro que tengas activo.<br>
                    • A la derecha tienes una <b>leyenda deslizable</b> ordenada de mayor a menor gasto, con el punto de color de cada categoría, su monto en USD y el <b>porcentaje (%)</b> que representa.<br>
                    • Las transferencias P2P entre tus propias cuentas no se suman como gasto en el gráfico para no distorsionar tus estadísticas.
                `
            },
            {
                id: 'guia_borrado_inteligente_hist',
                icono: '🔄',
                pregunta: '¿Qué pasa si borro del historial un pago de Agenda o Meta?',
                respuesta: `
                    <b>🔄 Reversión Inteligente desde el Historial:</b><br><br>
                    • Si borras del historial un movimiento que vino de un <b>Pago de Agenda</b>, el dinero regresa a tu cuenta y ese compromiso vuelve automáticamente a estado <b>Pendiente</b> en tu Agenda.<br>
                    • Si borras un abono o retiro de una <b>Meta de Ahorro</b>, el saldo acumulado de tu meta también se ajusta automáticamente.
                `
            }
        ]
    },
    {
        id: 'cat_agenda',
        icono: '📅',
        titulo: 'Agenda de Pagos y Deudas',
        subtitulo: 'Suscripciones, calendario, pagar y revertir',
        tarjetas: [
            {
                id: 'guia_agendar_pago',
                icono: '➕',
                pregunta: '¿Cómo agendo una deuda, recibo o suscripción mensual?',
                respuesta: `
                    <b>📅 Agendar un Compromiso:</b><br><br>
                    1. Entra en la pestaña <b>Agenda</b> y toca el botón circular <b>+</b> arriba a la derecha.<br>
                    2. Escribe el concepto (ej. <i>Netflix</i>, <i>Internet</i>, <i>Cuota Moto</i>).<br>
                    3. Indica el monto y su moneda (<b>USD, USDT, VES o EUR</b>).<br>
                    4. Elige la <b>Fecha de Pago</b> y si es <b>Pago Único</b> o <b>Mensual (Repetir)</b>.<br>
                    5. Selecciona la categoría (o créala ahí mismo con <i>"+ Crear categoría rápida"</i>) y guarda.
                `
            },
            {
                id: 'guia_vistas_agenda',
                icono: '🗓️',
                pregunta: '¿Cómo uso las vistas Pendientes, Calendario y Pagados?',
                respuesta: `
                    <b>🗓️ Las 3 Vistas de tu Agenda:</b><br><br>
                    • <b>Pendientes:</b> Separa automáticamente tus cobros por urgencia: <i>🚨 Vencidos</i>, <i>⚡ Para Hoy</i>, <i>⏳ Próximos a Vencer (1-3 días)</i> y <i>🗓️ Más Adelante</i>.<br>
                    • <b>📅 Calendario:</b> Muestra el mes con puntos de colores en los días con pagos. Toca cualquier día para filtrar sus compromisos o agendar directo en esa fecha.<br>
                    • <b>Pagados:</b> Guarda el registro de los pagos únicos que ya completaste.
                `
            },
            {
                id: 'guia_pagar_agenda',
                icono: '💳',
                pregunta: '¿Qué pasa cuando le doy a "Pagar" en la Agenda?',
                respuesta: `
                    <b>✅ Ejecutar un Pago de la Agenda:</b><br><br>
                    1. Al tocar <b>💳 Pagar</b> en un compromiso, se abre el modal de confirmación.<br>
                    2. Eliges de qué <b>Cuenta</b> saldrá el dinero (puedes ajustar el monto, añadir comisión de Pago Móvil si es en Bs o tasa USDT).<br>
                    3. Al confirmar, A$$IST <b>descuenta el saldo real de tu cuenta</b> y crea el registro en el <b>Historial</b>.<br>
                    4. Si el compromiso era <b>Único</b> pasa a <i>Pagados</i>; si era <b>Mensual</b>, salta automáticamente al mismo día del próximo mes.
                `
            },
            {
                id: 'guia_revertir_agenda',
                icono: '↩️',
                pregunta: 'Pagué una cuota por error, ¿cómo la revierto y recupero mi plata?',
                respuesta: `
                    <b>↩️ Revertir un Pago Completado:</b><br><br>
                    1. En la pestaña <b>Agenda</b>, entra en la vista <b>Pagados</b>.<br>
                    2. Ubica el pago y toca el botón <b>↩️ Revertir</b>.<br><br>
                    💰 Al instante, A$$IST elimina ese cobro del Historial, <b>te devuelve el dinero intacto al saldo de tu cuenta</b> y regresa el compromiso a la lista de <b>Pendientes</b>.
                `
            },
            {
                id: 'guia_avisos_agenda',
                icono: '🔔',
                pregunta: '¿Cómo funcionan las alertas en Inicio y el punto rojo?',
                respuesta: `
                    <b>🔔 Sistema de Alertas No Invasivas:</b><br><br>
                    Cuando un compromiso pendiente en tu Agenda está vencido, vence hoy o faltan <b>3 días o menos</b>:<br><br>
                    1. Se enciende un <b>badge rojo con el número</b> sobre el icono de Agenda en la barra inferior.<br>
                    2. Aparece un <b>banner compacto en Inicio</b> debajo de tu saldo desde donde puedes darle a <b>Pagar</b> directamente sin siquiera cambiar de pestaña.
                `
            }
        ]
    },
    {
        id: 'cat_metas',
        icono: '🎯',
        titulo: 'Metas de Ahorro',
        subtitulo: 'Objetivos con foto, abonos y reembolso automático',
        tarjetas: [
            {
                id: 'guia_crear_meta',
                icono: '📸',
                pregunta: '¿Cómo creo una Meta con fotografía?',
                respuesta: `
                    <b>🎯 Crear una Meta Visual:</b><br><br>
                    1. Ve a la pestaña <b>Metas</b> y toca el botón <b>+</b>.<br>
                    2. Escribe el nombre de tu objetivo y la meta en <b>USD</b>.<br>
                    3. Opcionalmente elige una foto de tu galería (A$$IST la redimensiona y optimiza localmente para que cargue al instante sin ocupar espacio).<br>
                    4. Toca <b>Guardar Meta</b>.
                `
            },
            {
                id: 'guia_abonar_retirar_meta',
                icono: '💵',
                pregunta: '¿Cómo abono o retiro dinero de mi Meta?',
                respuesta: `
                    <b>💵 Abonar y Retirar de una Meta:</b><br><br>
                    1. Toca la tarjeta de tu meta para abrir su vista a pantalla completa.<br>
                    2. Toca <b>+ Abonar</b> para apartar dinero desde cualquiera de tus cuentas (puedes abonar en USD o en Bs a tasa BCV). El monto se descontará del saldo libre de tu cuenta y subirá la barra de tu meta.<br>
                    3. Si necesitas usar parte de ese ahorro, toca <b>- Retirar</b> y el dinero regresará como ingreso a la cuenta que elijas.
                `
            },
            {
                id: 'guia_eliminar_meta_reembolso',
                icono: '🛡️',
                pregunta: '¿Qué pasa con mi dinero si elimino una Meta a la mitad?',
                respuesta: `
                    <b>🛡️ Reembolso Automático Garantizado:</b><br><br>
                    Si decides eliminar una meta que ya tenía dinero ahorrado (tocando el botón rojo <b>🗑️</b> arriba a la izquierda dentro de la meta), <b>tu dinero jamás se pierde</b>:<br><br>
                    A$$IST genera automáticamente una transacción de ingreso por el total acumulado y <b>reembolsa todo el dinero de vuelta a tu cuenta</b> dejando constancia en el historial.
                `
            },
            {
                id: 'guia_completar_meta_100',
                icono: '🥳',
                pregunta: '¿Qué ocurre cuando mi Meta llega al 100%?',
                respuesta: `
                    <b>🥳 ¡Meta Completada al 100%!</b><br><br>
                    Cuando haces el abono con el que alcanzas el 100% del monto objetivo:<br><br>
                    • La app te felicita con un aviso especial.<br>
                    • La meta se cierra de la lista de metas activas.<br>
                    • El dinero queda ya descontado de tu cuenta principal, listo para que hagas la compra de tu objetivo sin afectar tu saldo libre.
                `
            }
        ]
    },
    {
        id: 'cat_calculadora',
        icono: '💱',
        titulo: 'Calculadora y Tasas',
        subtitulo: 'Conversión, Fecha Valor BCV y Calendario Histórico',
        tarjetas: [
            {
                id: 'guia_calc_bidireccional',
                icono: '🧮',
                pregunta: '¿Cómo uso la Calculadora Bidireccional y la Tasa Propia?',
                respuesta: `
                    <b>🧮 Conversión en Tiempo Real:</b><br><br>
                    En la pestaña <b>Conversión</b> puedes elegir arriba entre <b>BCV</b>, <b>USDT</b>, <b>EUR</b> o <b>Propia</b>:<br><br>
                    • Si escribes en la casilla de <b>Dólares/Euros/USDT</b>, calcula los <b>Bolívares</b> al instante.<br>
                    • Si escribes en la casilla de <b>Bolívares</b>, divide y te da las divisas al instante.<br>
                    • En el modo <b>Propia</b> puedes escribir manualmente cualquier tasa personalizada.
                `
            },
            {
                id: 'guia_fecha_valor_bcv',
                icono: '⏳',
                pregunta: '¿Qué es el botón de Fecha Valor BCV (📅→)?',
                respuesta: `
                    <b>⏳ Fecha Valor BCV (Tasa del Día Siguiente):</b><br><br>
                    Cuando el BCV publica en la tarde la tasa oficial que regirá el siguiente día hábil, A$$IST lo detecta automáticamente y muestra el botón <b>📅→</b> tanto en Inicio como en la Calculadora.<br><br>
                    Al tocarlo, toda la app y la calculadora pasan a mostrarte la tasa futura para que puedas adelantar tus cálculos. Toca <b>↩</b> para volver a la tasa vigente de hoy.
                `
            },
            {
                id: 'guia_calendario_historico_calc',
                icono: '🗓️',
                pregunta: '¿Cómo consulto la tasa que hubo en una fecha pasada?',
                respuesta: `
                    <b>🗓️ Calendario Histórico de Tasas:</b><br><br>
                    1. En la pestaña <b>Conversión</b>, toca el icono del <b>calendario 📅</b> que está a la derecha de la fecha.<br>
                    2. Selecciona cualquier día pasado.<br>
                    3. La calculadora cargará la tasa exacta (BCV, USDT o EUR) que estuvo vigente ese día y su variación.<br><br>
                    🔒 <b>Límite inteligente:</b> El calendario bloquea fechas futuras que aún no existen; solo te deja avanzar hasta mañana si el BCV ya publicó tasa oficial.
                `
            },
            {
                id: 'guia_brecha_cambiaria',
                icono: '📈',
                pregunta: '¿Qué es la Brecha Cambiaria ($/USDT) y cómo se calcula?',
                respuesta: `
                    <b>📈 Píldora de Brecha Cambiaria:</b><br><br>
                    Visible en <b>Inicio</b> y en <b>Conversión</b>, mide la diferencia porcentual exacta entre el Dólar Oficial BCV y el USDT en el mercado P2P:<br><br>
                    <code>Brecha % = ((Tasa USDT - Tasa BCV) / Tasa BCV) × 100</code><br><br>
                    Te ayuda a saber de un vistazo qué tan separado está el paralelo del oficial antes de cambiar o pagar.
                `
            }
        ]
    },
    {
        id: 'cat_seguridad',
        icono: '🔒',
        titulo: 'Seguridad, PIN, Temas y Nube',
        subtitulo: 'PIN 2.0, pistas sutiles, Liquid Glass y Backups',
        tarjetas: [
            {
                id: 'guia_configurar_pin',
                icono: '🔢',
                pregunta: '¿Cómo activo o desactivo el PIN de 4 dígitos?',
                respuesta: `
                    <b>🔒 Configurar PIN 2.0 con Teclado en Pantalla:</b><br><br>
                    1. Ve a <b>Ajustes > 🔒 Configurar PIN de Acceso</b>.<br>
                    2. Escribe tu código numérico de <b>4 dígitos</b>.<br>
                    3. Rellena tus <b>3 preguntas de seguridad personalizadas</b> con respuestas cortas y guarda.<br><br>
                    ✨ Al abrir la app (o tras 3 minutos de inactividad), aparecerá la pantalla de bloqueo con tu foto de perfil y teclado numérico integrado.
                `
            },
            {
                id: 'guia_recuperar_pin_pistas',
                icono: '💡',
                pregunta: 'Olvidé mi PIN, ¿cómo lo recupero con pistas sutiles?',
                respuesta: `
                    <b>💡 Recuperación Inteligente con Tolerancia:</b><br><br>
                    1. En la pantalla de bloqueo toca <b>¿Olvidaste?</b> (abajo a la izquierda del teclado).<br>
                    2. La app elegirá <b>1 de tus 3 preguntas al azar</b> (puedes cambiarla con <i>"🎲 Otra pregunta"</i>).<br>
                    3. No importa si escribes con mayúsculas, sin acentos o con un pequeño error de letra: el motor inteligente lo reconocerá.<br>
                    4. Si no recuerdas, toca <b>"💡 Dame una pista sutil"</b> y te revelará la cantidad de letras, la inicial y luego las vocales.
                `
            },
            {
                id: 'guia_temas_colores',
                icono: '✨',
                pregunta: '¿Cómo cambio entre Oscuro, Claro, Liquid Glass y colores?',
                respuesta: `
                    <b>✨ Personalización Visual Estilo iOS:</b><br><br>
                    En la pestaña <b>Ajustes</b> puedes elegir:<br><br>
                    • <b>Modo de Visualización:</b> <i>Oscuro</i> (OLED puro), <i>Liquid Glass</i> (cristal translúcido iluminado por tu acento) o <i>Claro</i>.<br>
                    • <b>Color de Acento:</b> Desliza la paleta horizontal de 19 colores para cambiar al instante el color de botones, barras, puntos y brillos de toda la app.
                `
            },
            {
                id: 'guia_nube_backups',
                icono: '☁️',
                pregunta: '¿Cómo respaldo mis datos en la Nube o en un archivo Backup?',
                respuesta: `
                    <b>☁️ Doble Blindaje: Nube + Backup Local:</b><br><br>
                    1. <b>Sincronización en la Nube:</b> Toca tu avatar arriba a la derecha (o ve a Ajustes) y dale a <b>☁️ Conectar Cuenta</b>. Todo lo que hagas se guardará en tu teléfono al instante y se subirá en segundo plano cuando tengas señal.<br>
                    2. <b>Archivo JSON Manual:</b> En <b>Ajustes > Copias de Seguridad</b> toca <b>📥 Exportar Datos (Backup)</b> para descargar un archivo con todas tus cuentas, historial, metas, agenda y perfil, el cual puedes restaurar en cualquier momento con <b>📤 Importar Datos</b>.
                `
            }
        ]
    }
];

// ================= 3. RENDERIZADO MINIMALISTA Y MENÚ EMERGENTE ULTRALIGERO =================

let askbotModoFiltroMenu = 'todo';
let askbotCatFiltroModal = null;
let askbotCategoriasExpandidas = {};
let askbotMenuDOMConstruido = false;

function asegurarEstructuraDOMAskBot() {
    const container = document.getElementById('askbot-container');
    if (!container) return false;

    const topSubbarVieja = document.getElementById('askbot-top-Subbar');
    if (topSubbarVieja) topSubbarVieja.remove();
    const dockViejo = document.getElementById('askbot-interactive-dock');
    if (dockViejo) dockViejo.remove();
    const heroViejo = document.getElementById('askbot-welcome-hero');
    if (heroViejo) heroViejo.remove();

    if (!document.getElementById('askbot-messages') || !document.getElementById('askbot-bottom-launcher')) {
        container.innerHTML = `
            <div id="askbot-messages" class="askbot-messages"></div>
            <div id="askbot-bottom-launcher" class="askbot-bottom-launcher">
                <button type="button" class="askbot-launcher-btn" onclick="abrirMenuAskBot()">
                    <div class="askbot-launcher-left">
                        <span class="askbot-launcher-icon">✨</span>
                        <div class="askbot-launcher-texts">
                            <strong id="askbot-launcher-title">Explorar Consultas y Temas</strong>
                            <small id="askbot-launcher-sub">Tasas en vivo, patrimonio, agenda y guía</small>
                        </div>
                    </div>
                    <div class="askbot-launcher-pill">
                        <span>Menú</span>
                        <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                    </div>
                </button>
            </div>
        `;
    }
    return true;
}

function agregarBurbujaAskBot(htmlTexto, tipo = 'bot', esBienvenida = false) {
    const box = document.getElementById('askbot-messages');
    if (!box) return;
    box.classList.remove('oculto-chat');

    const bubble = document.createElement('div');
    bubble.className = `askbot-bubble ${tipo}${esBienvenida ? ' askbot-welcome-bubble' : ''}`;
    if (esBienvenida) bubble.id = 'askbot-welcome-bubble';
    bubble.innerHTML = htmlTexto;
    box.appendChild(bubble);

    requestAnimationFrame(() => {
        box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
    });
}

function esfumarBurbujaBienvenidaAskBot(inmediato = false) {
    const welcomeBubble = document.getElementById('askbot-welcome-bubble');
    if (!welcomeBubble) return;
    if (inmediato) {
        welcomeBubble.remove();
        return;
    }
    if (welcomeBubble.classList.contains('esfumando')) return;
    welcomeBubble.classList.add('esfumando');
    welcomeBubble.style.maxHeight = welcomeBubble.offsetHeight + 'px';
    welcomeBubble.style.overflow = 'hidden';
    welcomeBubble.style.transition = 'opacity 0.22s cubic-bezier(0.22, 1, 0.36, 1), transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), max-height 0.24s cubic-bezier(0.22, 1, 0.36, 1), margin 0.22s ease, padding 0.22s ease, border-width 0.22s ease';
    void welcomeBubble.offsetWidth;
    welcomeBubble.style.opacity = '0';
    welcomeBubble.style.transform = 'translateY(-8px) scale(0.96)';
    welcomeBubble.style.maxHeight = '0px';
    welcomeBubble.style.marginTop = '0px';
    welcomeBubble.style.marginBottom = '0px';
    welcomeBubble.style.paddingTop = '0px';
    welcomeBubble.style.paddingBottom = '0px';
    welcomeBubble.style.borderWidth = '0px';
    setTimeout(() => {
        if (welcomeBubble && welcomeBubble.parentNode) welcomeBubble.remove();
    }, 230);
}

function mostrarSaludoInicialAskBot() {
    const box = document.getElementById('askbot-messages');
    if (!box) return;
    box.innerHTML = '';

    const saludoNombre = (typeof userNombre !== 'undefined' && userNombre) ? `, <b>${userNombre}</b>` : '';
    agregarBurbujaAskBot(`
        👋 ¡Hola${saludoNombre}! Soy <b>AskBot</b>, tu copiloto financiero de <b>A$$IST 4.0</b>.<br><br>
        Toca la barra <b>Explorar Consultas y Temas</b> de abajo para revisar tus tasas, saldos y deudas en tiempo real o consultar cualquier función de la app. 👇
    `, 'bot', true);
}

function normalizarBusquedaAskBot(str) {
    return (str || '')
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function generarHTMLItemsCategoriaAskBot(cat, tarjetasLista) {
    const esVivo = cat.id === 'cat_consultas_vivo';
    const items = (tarjetasLista || cat.tarjetas).map(t => `
        <button type="button" class="askbot-menu-item ${esVivo ? 'item-vivo' : ''}" onclick="seleccionarConsultaDesdeMenuAskBot('${t.id}')">
            <div class="askbot-menu-item-left">
                <span class="askbot-menu-item-icon">${t.icono}</span>
                <span class="askbot-menu-item-text">${t.pregunta}</span>
            </div>
            <span class="askbot-menu-item-arrow">›</span>
        </button>
    `).join('');
    return `<div class="askbot-menu-items-wrap">${items}</div>`;
}

// Construye únicamente los 8 encabezados ultraligeros; las preguntas se inyectan bajo demanda al tocar
function construirBaseMenuLigeroAskBot() {
    const listEl = document.getElementById('askbot-menu-list');
    if (!listEl) return;

    let html = '';
    for (let i = 0; i < ASKBOT_CATALOGO.length; i++) {
        const cat = ASKBOT_CATALOGO[i];
        const esVivo = cat.id === 'cat_consultas_vivo';
        const estaAbierta = Boolean(askbotCategoriasExpandidas[cat.id]);
        html += `
            <div id="askbot-cat-group-${cat.id}" class="askbot-menu-cat-group ${estaAbierta ? 'expandida' : ''} ${esVivo ? 'grupo-vivo' : ''}">
                <button type="button" class="askbot-menu-cat-header" onclick="toggleAcordeonCategoriaAskBot('${cat.id}')">
                    <div class="askbot-menu-cat-info">
                        <span class="askbot-cat-icon-box">${cat.icono}</span>
                        <div class="askbot-cat-titles">
                            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                <strong>${cat.titulo}</strong>
                                ${esVivo ? '<span class="askbot-live-badge">● EN VIVO</span>' : ''}
                            </div>
                            <small>${cat.subtitulo}</small>
                        </div>
                    </div>
                    <span class="askbot-cat-chevron">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </span>
                </button>
                <div id="askbot-cat-body-${cat.id}" class="askbot-menu-cat-body ${estaAbierta ? 'abierto' : ''}">${estaAbierta ? generarHTMLItemsCategoriaAskBot(cat) : ''}</div>
            </div>
        `;
    }
    listEl.innerHTML = html;
    askbotMenuDOMConstruido = true;
}

// Alterna una categoría en 0.1ms sin reconstruir el DOM completo del modal
function toggleAcordeonCategoriaAskBot(catId) {
    const groupEl = document.getElementById(`askbot-cat-group-${catId}`);
    const bodyEl = document.getElementById(`askbot-cat-body-${catId}`);
    if (!groupEl || !bodyEl) {
        renderizarMenuModalAskBot();
        return;
    }

    const estabaAbierta = groupEl.classList.contains('expandida');

    // Cerrar cualquier otra categoría abierta para mantener la lista compacta y fluida
    const abiertos = document.querySelectorAll('#askbot-menu-list .askbot-menu-cat-group.expandida');
    abiertos.forEach(el => {
        if (el.id !== `askbot-cat-group-${catId}`) {
            el.classList.remove('expandida');
            const b = el.querySelector('.askbot-menu-cat-body');
            if (b) b.classList.remove('abierto');
        }
    });
    askbotCategoriasExpandidas = {};

    if (estabaAbierta) {
        groupEl.classList.remove('expandida');
        bodyEl.classList.remove('abierto');
    } else {
        const cat = ASKBOT_CATALOGO.find(c => c.id === catId);
        if (cat && bodyEl.children.length === 0) {
            bodyEl.innerHTML = generarHTMLItemsCategoriaAskBot(cat);
        }
        askbotCategoriasExpandidas[catId] = true;
        groupEl.classList.add('expandida');
        bodyEl.classList.add('abierto');
    }
}

function filtrarMenuAskBotEnVivo() {
    const inputBuscar = document.getElementById('buscar-askbot-menu');
    const subEl = document.getElementById('askbot-menu-subtitulo');
    const listEl = document.getElementById('askbot-menu-list');
    if (!listEl) return;

    const query = normalizarBusquedaAskBot(inputBuscar ? inputBuscar.value : '');

    if (!query) {
        if (subEl) subEl.innerText = 'Toca una categoría para desplegar sus consultas';
        construirBaseMenuLigeroAskBot();
        return;
    }

    if (subEl) subEl.innerText = `Resultados para "${inputBuscar.value.trim()}"`;
    askbotMenuDOMConstruido = false;

    let htmlLista = '';
    let totalCoincidencias = 0;

    for (let i = 0; i < ASKBOT_CATALOGO.length; i++) {
        const cat = ASKBOT_CATALOGO[i];
        const tarjetasFiltradas = cat.tarjetas.filter(t => {
            const texto = normalizarBusquedaAskBot(`${cat.titulo} ${cat.subtitulo} ${t.pregunta}`);
            return texto.includes(query);
        });
        if (tarjetasFiltradas.length === 0) continue;
        totalCoincidencias += tarjetasFiltradas.length;

        const esVivo = cat.id === 'cat_consultas_vivo';
        htmlLista += `
            <div id="askbot-cat-group-${cat.id}" class="askbot-menu-cat-group expandida ${esVivo ? 'grupo-vivo' : ''}">
                <div class="askbot-menu-cat-header" style="cursor: default;">
                    <div class="askbot-menu-cat-info">
                        <span class="askbot-cat-icon-box">${cat.icono}</span>
                        <div class="askbot-cat-titles">
                            <strong>${cat.titulo}</strong>
                        </div>
                    </div>
                </div>
                <div id="askbot-cat-body-${cat.id}" class="askbot-menu-cat-body abierto">
                    ${generarHTMLItemsCategoriaAskBot(cat, tarjetasFiltradas)}
                </div>
            </div>
        `;
    }

    if (totalCoincidencias === 0) {
        htmlLista = `
            <div class="askbot-menu-empty">
                <span style="font-size: 28px; display: block; margin-bottom: 8px;">🔍</span>
                <strong>No encontramos esa consulta</strong>
                <small>Prueba con palabras como "tasa", "agenda", "USDT", "meta" o "PIN".</small>
            </div>
        `;
    }

    listEl.innerHTML = htmlLista;
}

function renderizarMenuModalAskBot() {
    const inputBuscar = document.getElementById('buscar-askbot-menu');
    const query = normalizarBusquedaAskBot(inputBuscar ? inputBuscar.value : '');
    if (query) {
        filtrarMenuAskBotEnVivo();
        return;
    }
    const listEl = document.getElementById('askbot-menu-list');
    if (!askbotMenuDOMConstruido || !listEl || listEl.children.length === 0) {
        construirBaseMenuLigeroAskBot();
    }
}

function abrirMenuAskBot() {
    renderizarMenuModalAskBot();
    if (typeof abrirModal === 'function') {
        abrirModal('modal-askbot-menu');
    } else {
        const modal = document.getElementById('modal-askbot-menu');
        if (modal) modal.classList.remove('oculto');
    }
}

function cambiarFiltroModoAskBot(modo) {
    askbotModoFiltroMenu = modo;
    renderizarMenuModalAskBot();
}

function seleccionarPildoraCategoriaAskBot(catId) {
    if (catId) toggleAcordeonCategoriaAskBot(catId);
}

function encontrarCategoriaDeTarjetaAskBot(tarjetaId) {
    for (let i = 0; i < ASKBOT_CATALOGO.length; i++) {
        const cat = ASKBOT_CATALOGO[i];
        if (cat.tarjetas.some(t => t.id === tarjetaId)) return cat;
    }
    return null;
}

function seleccionarConsultaDesdeMenuAskBot(tarjetaId) {
    if (typeof cerrarModal === 'function') {
        cerrarModal('modal-askbot-menu');
    } else {
        const modal = document.getElementById('modal-askbot-menu');
        if (modal) modal.classList.add('oculto');
    }

    const cat = encontrarCategoriaDeTarjetaAskBot(tarjetaId);
    if (cat) {
        askbotCategoriaActiva = cat.id;
        const subLauncher = document.getElementById('askbot-launcher-sub');
        if (subLauncher) {
            subLauncher.innerText = `${cat.icono} ${cat.titulo} · Toca para cambiar`;
        }
    }

    ejecutarTarjetaAskBot(tarjetaId);
}

function renderizarDockTarjetasAskBot() {
    renderizarMenuModalAskBot();
}

function abrirCategoriaAskBot(catId) {
    askbotCategoriaActiva = catId;
    abrirMenuAskBot();
    if (!askbotCategoriasExpandidas[catId]) {
        toggleAcordeonCategoriaAskBot(catId);
    }
}

function volverCategoriasAskBot() {
    askbotCategoriaActiva = null;
}

function buscarTarjetaPorIdAskBot(tarjetaId) {
    for (let i = 0; i < ASKBOT_CATALOGO.length; i++) {
        const encontrada = ASKBOT_CATALOGO[i].tarjetas.find(t => t.id === tarjetaId);
        if (encontrada) return encontrada;
    }
    return null;
}

function ejecutarTarjetaAskBot(tarjetaId) {
    if (askbotRespondiendo) return;
    const tarjeta = buscarTarjetaPorIdAskBot(tarjetaId);
    if (!tarjeta) return;

    esfumarBurbujaBienvenidaAskBot(false);

    askbotRespondiendo = true;
    agregarBurbujaAskBot(`${tarjeta.icono} ${tarjeta.pregunta}`, 'user');

    const box = document.getElementById('askbot-messages');
    const typingEl = document.createElement('div');
    typingEl.className = 'askbot-bubble bot askbot-typing';
    typingEl.innerHTML = '<span></span><span></span><span></span>';
    if (box) {
        box.appendChild(typingEl);
        requestAnimationFrame(() => {
            box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
        });
    }

    setTimeout(() => {
        if (typingEl && typingEl.parentNode) typingEl.remove();
        const respuestaFinal = typeof tarjeta.generarRespuesta === 'function'
            ? tarjeta.generarRespuesta()
            : tarjeta.respuesta;
        agregarBurbujaAskBot(respuestaFinal, 'bot');
        askbotRespondiendo = false;
    }, 220);
}

// ================= 4. CONEXIÓN GLOBAL CON EL ARRANQUE Y PESTAÑA DE LA APP =================

function inicializarAskBot() {
    if (!asegurarEstructuraDOMAskBot()) return;

    if (!askbotInicializado) {
        mostrarSaludoInicialAskBot();
        askbotInicializado = true;
    }
    renderizarMenuModalAskBot();
}

function limpiarChatAskBot() {
    askbotCategoriaActiva = null;
    askbotCatFiltroModal = null;
    askbotModoFiltroMenu = 'todo';
    askbotCategoriasExpandidas = {};
    askbotMenuDOMConstruido = false;
    askbotRespondiendo = false;
    if (!asegurarEstructuraDOMAskBot()) return;
    const inputBuscar = document.getElementById('buscar-askbot-menu');
    if (inputBuscar) inputBuscar.value = '';
    const subLauncher = document.getElementById('askbot-launcher-sub');
    if (subLauncher) {
        subLauncher.innerText = 'Tasas en vivo, patrimonio, agenda y guía';
    }
    mostrarSaludoInicialAskBot();
    construirBaseMenuLigeroAskBot();
}

function enviarSugerenciaAskBot(idTarjeta) {
    seleccionarConsultaDesdeMenuAskBot(idTarjeta);
}

function enviarMensajeAskBot() {
    // Mantenido por compatibilidad con llamadas globales previas
}