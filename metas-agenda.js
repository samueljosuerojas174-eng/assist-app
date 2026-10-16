// ================= METAS DE AHORRO PREMIUM Y REEMBOLSO AUTOMÁTICO =================
let metaAbonoActualIndex = null;
let metaAccionTipo = 'abonar'; 

function redimensionarImagen(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const maxW = 500, maxH = 500;
            let width = img.width, height = img.height;
            if (width > height) { if (width > maxW) { height *= maxW / width; width = maxW; } }
            else { if (height > maxH) { width *= maxH / height; height = maxH; } }
            canvas.width = width; canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/png')); 
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function guardarNuevaMeta() {
    const nombre = document.getElementById('in-meta-nombre').value;
    const objetivo = parseFloat(document.getElementById('in-meta-obj').value);
    const file = document.getElementById('in-meta-img').files[0];
    if (!nombre || isNaN(objetivo) || objetivo <= 0) return alert("Datos inválidos.");

    const crear = (imgBase64) => {
        metas.push({ id: Date.now(), nombre, acumulado: 0, objetivo, moneda: 'USD', imagen: imgBase64 });
        guardarYActualizarGestion();
        cerrarModal('modal-nueva-meta');
        document.getElementById('in-meta-nombre').value = '';
        document.getElementById('in-meta-obj').value = '';
        document.getElementById('in-meta-img').value = '';
    };
    if (file) redimensionarImagen(file, crear);
    else crear(null);
}

function renderizarMetas() {
    const lista = document.getElementById('lista-metas-principal');
    if(!lista) return;
    lista.innerHTML = '';
    if(metas.length === 0) { 
        lista.innerHTML = '<p style="color:var(--text-secondary); font-size:13px; text-align:center;">No tienes metas activas. ¡Crea una!</p>'; 
        return; 
    }
    
    metas.forEach((m, i) => {
        let pct = (m.acumulado / m.objetivo) * 100;
        if(pct > 100) pct = 100;
        const bgStyle = m.imagen ? `background-image: url(${m.imagen});` : ``;

        lista.innerHTML += `
        <div class="meta-item-card" onclick="abrirDetalleMeta(${i})">
            <div class="meta-card-top">
                <div class="meta-bg-overlay" style="${bgStyle}"></div>
                <div class="meta-top-content">
                    <strong style="font-size:20px; text-shadow: 0 2px 10px rgba(0,0,0,0.9);">${m.nombre}</strong>
                    <span style="font-size:15.5px; font-weight:800; text-shadow: 0 2px 10px rgba(0,0,0,0.9);">${m.moneda} ${formatearMontoCensurado(m.acumulado.toFixed(2))}</span>
                </div>
            </div>
            <div class="meta-card-bottom">
                <div class="progress-bg" style="height: 11px; margin-bottom: 8px;">
                    <div class="progress-fill" style="width: ${pct}%;"></div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <small style="color:var(--text-secondary); font-size:12.5px; font-weight:600;">Progreso</small>
                    <small style="color:var(--text-primary); font-size:13px; font-weight:800;">${pct.toFixed(1)}% de ${m.objetivo.toFixed(2)}</small>
                </div>
            </div>
        </div>`;
    });
}

function abrirDetalleMeta(index) {
    metaAbonoActualIndex = index;
    const m = metas[index];
    let pct = (m.acumulado / m.objetivo) * 100;
    if(pct > 100) pct = 100;

    const bgOverlayDetail = document.getElementById('meta-detail-bg-blur');
    if(m.imagen) {
        bgOverlayDetail.style.backgroundImage = `url(${m.imagen})`;
        bgOverlayDetail.style.display = 'block';
    } else {
        bgOverlayDetail.style.display = 'none';
    }

    document.getElementById('meta-detail-title').innerText = m.nombre;
    document.getElementById('meta-detail-amounts').innerText = `${m.moneda} ${formatearMontoCensurado(m.acumulado.toFixed(2))} / ${m.objetivo.toFixed(2)}`;
    document.getElementById('meta-detail-pct').innerText = `${pct.toFixed(1)}%`;
    document.getElementById('meta-detail-bar').style.width = `${pct}%`;

    renderizarHistorialEspecíficoMeta(m.nombre);
    abrirModal('modal-detalle-meta');
}

function renderizarHistorialEspecíficoMeta(nombreMeta) {
    const lista = document.getElementById('lista-historial-meta');
    lista.innerHTML = '';
    let hMeta = transacciones.filter(t => t.categoria === 'Ahorro' && t.nota && t.nota.includes(nombreMeta)).reverse();

    if (hMeta.length === 0) {
        lista.innerHTML = `<p style="text-align:center; padding: 20px; color: var(--text-secondary); font-size: 13px;">No hay movimientos aún.</p>`;
        return;
    }

    hMeta.forEach((t) => {
        const esAbono = t.tipo === 'gasto'; 
        const claseColor = esAbono ? 'monto-ingreso' : 'monto-gasto';
        const signo = esAbono ? '+' : '-';
        lista.innerHTML += `
            <li class="transaccion-item" style="margin-bottom: 8px;">
                <div class="trans-izq">
                    <strong>${esAbono ? 'Abono' : 'Retiro'}</strong>
                    <small>${t.fechaFormateada}</small>
                </div>
                <div style="display: flex; align-items: center;">
                    <span class="monto-val ${claseColor}">${signo}$${t.montoUSD.toFixed(2)}</span>
                </div>
            </li>
        `;
    });
}

function prepararAccionMeta(tipo) {
    if (cuentas.length === 0) return alert("Debes crear al menos una cuenta primero.");
    metaAccionTipo = tipo;
    const meta = metas[metaAbonoActualIndex];

    document.getElementById('titulo-accion-meta').innerText = tipo === 'abonar' ? `Abonar a "${meta.nombre}"` : `Retirar de "${meta.nombre}"`;
    document.getElementById('desc-accion-meta').innerText = tipo === 'abonar' ? "Descontaremos de la cuenta que selecciones." : "El monto volverá a tu cuenta seleccionada.";
    document.getElementById('monto-accion-meta').value = '';
    document.getElementById('nota-accion-meta').value = '';
    document.getElementById('fecha-accion-meta').value = getLocalYYYYMMDD();
    document.getElementById('moneda-accion-meta').value = 'USD'; 

    const selectCuenta = document.getElementById('sel-cuenta-accion-meta');
    selectCuenta.innerHTML = '';
    cuentas.forEach(c => selectCuenta.innerHTML += `<option value="${c.id}">${c.nombre} (${c.moneda})</option>`);
    abrirModal('modal-accion-meta');
}

document.getElementById('btn-ejecutar-meta').addEventListener('click', () => {
    const monto = parseFloat(document.getElementById('monto-accion-meta').value);
    const monedaAccion = document.getElementById('moneda-accion-meta').value;
    if (isNaN(monto) || monto <= 0) return alert("Monto inválido");

    const cuentaId = document.getElementById('sel-cuenta-accion-meta').value;
    const notaUser = document.getElementById('nota-accion-meta').value.trim();
    if (!cuentaId) return alert("Selecciona una cuenta válida.");

    const meta = metas[metaAbonoActualIndex];
    let montoUSD = monto;
    if (monedaAccion === 'VES') montoUSD = monto / tasaBCV;
    if (metaAccionTipo === 'retirar' && montoUSD > meta.acumulado) return alert("No puedes retirar más de lo ahorrado.");

    const valFecha = document.getElementById('fecha-accion-meta').value; 
    const dateObj = valFecha ? new Date(valFecha + "T00:00:00") : new Date();
    const isoLocal = getLocalYYYYMMDD(dateObj);
    const mesesArr = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const fechaFormateada = `${dateObj.getDate()} ${mesesArr[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

    const tTipo = metaAccionTipo === 'abonar' ? 'gasto' : 'ingreso';
    const baseNota = metaAccionTipo === 'abonar' ? `Abono a meta: ${meta.nombre}` : `Retiro de meta: ${meta.nombre}`;

    const transaccion = {
        id: dateObj.getTime() + Math.random(),
        cuentaId: cuentaId,
        montoUSD: montoUSD,
        tipo: tTipo,
        categoria: 'Ahorro',
        nota: notaUser ? `${baseNota} - ${notaUser}` : baseNota,
        monedaInputOriginal: monedaAccion, 
        fechaFormateada: fechaFormateada,
        fecha: dateObj,
        fechaIsoLocal: isoLocal
    };
    
    transacciones.push(transaccion);
    transacciones.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    
    if (metaAccionTipo === 'abonar') metas[metaAbonoActualIndex].acumulado += montoUSD;
    else metas[metaAbonoActualIndex].acumulado -= montoUSD;

    if (metas[metaAbonoActualIndex].acumulado >= metas[metaAbonoActualIndex].objetivo) {
        alert(`¡Felicidades! 🎉 Has completado tu meta: ${metas[metaAbonoActualIndex].nombre} 🥳\n\nEl objetivo ha sido alcanzado y se eliminará de las metas activas. (El dinero sigue descontado de tu cuenta principal, listo para usarse).`);
        metas.splice(metaAbonoActualIndex, 1);
        guardarYActualizarGestion();
        cerrarModal('modal-accion-meta');
        cerrarModal('modal-detalle-meta');
        actualizarInterfaz();
        return;
    }

    guardarYActualizarGestion();
    cerrarModal('modal-accion-meta');
    abrirDetalleMeta(metaAbonoActualIndex);
});

function eliminarMeta(index) {
    if (index === null || index === undefined || index < 0 || index >= metas.length) return;
    const meta = metas[index];
    const montoAcumulado = Number(meta.acumulado) || 0;

    const mensaje = montoAcumulado > 0
        ? `¿Seguro que deseas eliminar la meta "${meta.nombre}"?\n\n💰 Los $${montoAcumulado.toFixed(2)} ahorrados regresarán automáticamente a tu cuenta y se registrarán en el historial.`
        : `¿Seguro que deseas eliminar la meta "${meta.nombre}"?`;

    if (!confirm(mensaje)) return;

    if (montoAcumulado > 0 && cuentas.length > 0) {
        const ultimoAbono = [...transacciones].reverse().find(t =>
            t.categoria === 'Ahorro' &&
            t.tipo === 'gasto' &&
            t.nota &&
            t.nota.includes(meta.nombre) &&
            cuentas.some(c => c.id == t.cuentaId)
        );

        let cuentaDestinoId = ultimoAbono ? ultimoAbono.cuentaId : null;
        if (!cuentaDestinoId) {
            cuentaDestinoId = (cuentaActivaId && cuentas.some(c => c.id == cuentaActivaId)) ? cuentaActivaId : cuentas[0].id;
        }

        const dateObj = new Date();
        const isoLocal = getLocalYYYYMMDD(dateObj);
        const mesesArr = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const fechaFormateada = `${dateObj.getDate()} ${mesesArr[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

        transacciones.push({
            id: dateObj.getTime() + Math.random(),
            cuentaId: cuentaDestinoId,
            montoUSD: montoAcumulado,
            tipo: 'ingreso',
            categoria: 'Ahorro',
            nota: "Reembolso por cierre de meta: " + meta.nombre,
            monedaInputOriginal: 'USD',
            fechaFormateada: fechaFormateada,
            fecha: dateObj,
            fechaIsoLocal: isoLocal
        });
        transacciones.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    }

    metas.splice(index, 1);
    guardarYActualizarGestion();
    cerrarModal('modal-detalle-meta');
    actualizarInterfaz();
}

// ================= AGENDA DE PAGOS, DEUDAS Y SUSCRIPCIONES =================
let agendaVistaActual = 'pendientes';
let agendaCalAnio = new Date().getFullYear();
let agendaCalMes = new Date().getMonth();
let agendaDiaSeleccionado = null;
let agendaPagoEnCursoId = null;
let timerSyncAgendaNube = null;

// Cola inteligente de sincronización para que pagos inmediatos en Agenda jamás se pierdan si hay un sync en curso
function programarSincronizacionSeguraAgenda() {
    localStorage.setItem('assist_pending_sync', 'true');
    if (!usuarioActual || !navigator.onLine) return;
    if (timerSyncAgendaNube) clearTimeout(timerSyncAgendaNube);

    const intentarSync = () => {
        if (!usuarioActual || !navigator.onLine) return;
        if (sincronizandoNube) {
            timerSyncAgendaNube = setTimeout(intentarSync, 450);
            return;
        }
        sincronizarHaciaNube().catch(e => console.error(e));
    };
    timerSyncAgendaNube = setTimeout(intentarSync, 180);
}

function convertirMontoAgendaAUSD(monto, moneda) {
    const val = Number(monto) || 0;
    if (val <= 0) return 0;
    if (moneda === 'VES') return val / (tasaBCV || 1);
    if (moneda === 'EUR') return (val * (tasaEUR || 1)) / (tasaBCV || 1);
    return val;
}

function formatearMontoMonedaAgenda(monto, moneda) {
    const val = (Number(monto) || 0).toFixed(2);
    if (moneda === 'VES') return `Bs ${val}`;
    if (moneda === 'USDT') return `USDT ${val}`;
    if (moneda === 'EUR') return `€${val}`;
    return `$${val}`;
}

function calcularDiasRestantesAgenda(fechaIso, hoyMsPrecalculado = null) {
    const baseHoyMs = hoyMsPrecalculado !== null
        ? hoyMsPrecalculado
        : new Date(getLocalYYYYMMDD() + "T00:00:00").getTime();
    if (!fechaIso) return 0;
    const dMeta = new Date(fechaIso + "T00:00:00");
    if (isNaN(dMeta.getTime())) return 0;
    return Math.round((dMeta.getTime() - baseHoyMs) / 86400000);
}

function obtenerInfoEstadoAgenda(item, diasPrecalculados = null) {
    if (item.estado === 'pagado') return { claseCard: 'pagado', claseBadge: 'pagado', textoBadge: '✅ Pagado', dias: 9999 };
    const dias = diasPrecalculados !== null ? diasPrecalculados : calcularDiasRestantesAgenda(item.fecha);
    if (dias < 0) {
        const abs = Math.abs(dias);
        return { claseCard: 'vencido', claseBadge: 'vencido', textoBadge: abs === 1 ? '🚨 Venció ayer' : `🚨 Vencido hace ${abs} días`, dias };
    }
    if (dias === 0) return { claseCard: 'hoy', claseBadge: 'hoy', textoBadge: '⚡ Vence HOY', dias };
    if (dias <= 3) return { claseCard: 'proximo', claseBadge: 'proximo', textoBadge: dias === 1 ? '⏳ Vence mañana' : `⏳ En ${dias} días`, dias };
    return { claseCard: '', claseBadge: 'normal', textoBadge: `🗓️ En ${dias} días`, dias };
}

function avanzarUnMesFechaISO(fechaIso) {
    const partes = (fechaIso || getLocalYYYYMMDD()).split('-');
    let anio = parseInt(partes[0], 10) || new Date().getFullYear();
    let mes = (parseInt(partes[1], 10) || 1) - 1;
    const diaOriginal = parseInt(partes[2], 10) || 1;
    mes += 1;
    if (mes > 11) { mes = 0; anio += 1; }
    const maxDiasMesNuevo = new Date(anio, mes + 1, 0).getDate();
    const diaFinal = Math.min(diaOriginal, maxDiasMesNuevo);
    return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(diaFinal).padStart(2, '0')}`;
}

function poblarSelectCategoriasAgenda(selectEl, valorSeleccionado = '') {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    const listaBase = categorias.length > 0 ? [...categorias] : ['Servicios', 'Suscripciones', 'Deudas', 'Varios'];
    if (valorSeleccionado && !listaBase.includes(valorSeleccionado)) listaBase.push(valorSeleccionado);
    listaBase.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat; opt.innerText = cat;
        selectEl.appendChild(opt);
    });
    if (valorSeleccionado && listaBase.includes(valorSeleccionado)) selectEl.value = valorSeleccionado;
    else if (listaBase.length > 0) selectEl.value = listaBase[0];
}

function abrirModalNuevaAgenda(idEditar = null, fechaPreseleccionada = null) {
    const inputEditId = document.getElementById('in-agenda-edit-id');
    const inputNota = document.getElementById('in-agenda-nota');
    const inputMonto = document.getElementById('in-agenda-monto');
    const selectMoneda = document.getElementById('in-agenda-moneda');
    const inputFecha = document.getElementById('in-agenda-fecha');
    const selectFrec = document.getElementById('in-agenda-frecuencia');
    const selectCat = document.getElementById('in-agenda-categoria');
    const tituloModal = document.getElementById('titulo-modal-agenda');
    const boxRapida = document.getElementById('box-cat-rapida-agenda');

    if (boxRapida) { boxRapida.classList.add('oculto'); boxRapida.style.display = 'none'; }

    if (idEditar !== null && idEditar !== undefined) {
        const comp = agendaPagos.find(a => String(a.id) === String(idEditar));
        if (!comp) return;
        if (tituloModal) tituloModal.innerText = 'Editar Compromiso';
        if (inputEditId) inputEditId.value = String(comp.id);
        if (inputNota) inputNota.value = comp.nota || '';
        if (inputMonto) inputMonto.value = comp.monto || '';
        if (selectMoneda) selectMoneda.value = comp.moneda || 'USD';
        if (inputFecha) inputFecha.value = comp.fecha || getLocalYYYYMMDD();
        if (selectFrec) selectFrec.value = comp.frecuencia || 'unico';
        poblarSelectCategoriasAgenda(selectCat, comp.categoria);
    } else {
        if (tituloModal) tituloModal.innerText = 'Agendar Compromiso';
        if (inputEditId) inputEditId.value = '';
        if (inputNota) inputNota.value = '';
        if (inputMonto) inputMonto.value = '';
        if (selectMoneda) selectMoneda.value = 'USD';
        if (inputFecha) inputFecha.value = fechaPreseleccionada || agendaDiaSeleccionado || getLocalYYYYMMDD();
        if (selectFrec) selectFrec.value = 'unico';
        poblarSelectCategoriasAgenda(selectCat, categorias[0] || '');
    }
    abrirModal('modal-nueva-agenda');
}

function toggleCrearCategoriaRapidaAgenda() {
    const box = document.getElementById('box-cat-rapida-agenda');
    if (!box) return;
    const estaOculto = box.classList.contains('oculto') || box.style.display === 'none';
    if (estaOculto) {
        box.classList.remove('oculto'); box.style.display = 'flex';
        const inColor = document.getElementById('in-cat-rapida-color');
        const inNombre = document.getElementById('in-cat-rapida-nombre');
        if (inColor) inColor.value = PALETA_COLORES_CATEGORIAS[categorias.length % PALETA_COLORES_CATEGORIAS.length];
        if (inNombre) { inNombre.value = ''; setTimeout(() => inNombre.focus(), 50); }
    } else {
        box.classList.add('oculto'); box.style.display = 'none';
    }
}

function guardarCategoriaRapidaAgenda() {
    const inNombre = document.getElementById('in-cat-rapida-nombre');
    const inColor = document.getElementById('in-cat-rapida-color');
    const selectCatAgenda = document.getElementById('in-agenda-categoria');
    const box = document.getElementById('box-cat-rapida-agenda');

    const nuevaCat = inNombre ? inNombre.value.trim() : '';
    if (!nuevaCat) return alert("Escribe un nombre para la nueva categoría.");

    const colorElegido = (inColor && inColor.value) ? inColor.value : PALETA_COLORES_CATEGORIAS[categorias.length % PALETA_COLORES_CATEGORIAS.length];
    if (!categorias.includes(nuevaCat)) categorias.push(nuevaCat);
    categoriasColores[nuevaCat] = colorElegido;

    localStorage.setItem('categorias', JSON.stringify(categorias));
    localStorage.setItem('assist_categorias_colores', JSON.stringify(categoriasColores));

    cargarSelects();
    renderizarListasGestion();
    poblarSelectCategoriasAgenda(selectCatAgenda, nuevaCat);
    if (inNombre) inNombre.value = '';
    if (box) { box.classList.add('oculto'); box.style.display = 'none'; }
    programarSincronizacionSeguraAgenda();
}

function guardarCompromisoAgenda() {
    const editId = document.getElementById('in-agenda-edit-id')?.value || '';
    const nota = (document.getElementById('in-agenda-nota')?.value || '').trim();
    const monto = parseFloat(document.getElementById('in-agenda-monto')?.value);
    const moneda = document.getElementById('in-agenda-moneda')?.value || 'USD';
    const fecha = document.getElementById('in-agenda-fecha')?.value || getLocalYYYYMMDD();
    const frecuencia = document.getElementById('in-agenda-frecuencia')?.value || 'unico';
    const categoria = document.getElementById('in-agenda-categoria')?.value || 'Varios';

    if (!nota) return alert("Por favor, escribe el concepto o nombre del compromiso.");
    if (isNaN(monto) || monto <= 0) return alert("Ingresa un monto válido mayor a 0.");
    if (!fecha) return alert("Selecciona la fecha de pago.");

    let catNuevaAgregada = false;
    if (categoria && !categorias.includes(categoria)) {
        categorias.push(categoria);
        asegurarColoresCategorias();
        catNuevaAgregada = true;
    }

    if (editId) {
        const idx = agendaPagos.findIndex(a => String(a.id) === String(editId));
        if (idx !== -1) agendaPagos[idx] = { ...agendaPagos[idx], nota, monto, moneda, fecha, frecuencia, categoria };
    } else {
        agendaPagos.push({
            id: Date.now() + Math.floor(Math.random() * 1000),
            nota, monto, moneda, fecha, frecuencia, categoria,
            estado: 'pendiente', ultimaFechaPagada: null, ultimaTransaccionId: null
        });
    }

    // Cerrar modal primero para respuesta visual instantánea sin lag
    cerrarModal('modal-nueva-agenda');

    localStorage.setItem('assist_agenda_pagos', JSON.stringify(agendaPagos));
    if (catNuevaAgregada) {
        localStorage.setItem('categorias', JSON.stringify(categorias));
        cargarSelects();
    }
    renderizarAgenda();
    programarSincronizacionSeguraAgenda();
}

function eliminarCompromisoAgenda(id) {
    if (!confirm("¿Eliminar este compromiso de la Agenda?")) return;
    agendaPagos = agendaPagos.filter(a => String(a.id) !== String(id));
    localStorage.setItem('assist_agenda_pagos', JSON.stringify(agendaPagos));
    renderizarAgenda();
    programarSincronizacionSeguraAgenda();
}

function reactivarCompromisoAgenda(id) {
    const comp = agendaPagos.find(a => String(a.id) === String(id));
    if (!comp) return;

    // Buscar la transacción asociada al pago de este compromiso para revertirla del historial y devolver el saldo a la cuenta
    let tIndex = -1;
    if (comp.ultimaTransaccionId !== undefined && comp.ultimaTransaccionId !== null) {
        tIndex = transacciones.findIndex(t => String(t.id) === String(comp.ultimaTransaccionId));
    }
    if (tIndex === -1) {
        for (let i = transacciones.length - 1; i >= 0; i--) {
            const t = transacciones[i];
            if (t.agendaId !== undefined && t.agendaId !== null && String(t.agendaId) === String(comp.id)) {
                tIndex = i;
                break;
            }
        }
    }
    if (tIndex === -1) {
        // Respaldo por coincidencia de nota si la transacción vino descargada desde la nube
        for (let i = transacciones.length - 1; i >= 0; i--) {
            const t = transacciones[i];
            if (t.tipo === 'gasto' && t.nota && comp.nota && t.nota.includes(comp.nota)) {
                tIndex = i;
                break;
            }
        }
    }

    if (tIndex !== -1) {
        const transEliminada = transacciones[tIndex];
        if (comp.frecuencia === 'mensual' && (transEliminada.agendaFechaPrevia || comp.ultimaFechaPagada)) {
            comp.fecha = transEliminada.agendaFechaPrevia || comp.ultimaFechaPagada || comp.fecha;
        }
        transacciones.splice(tIndex, 1);
    }

    comp.estado = 'pendiente';
    comp.ultimaTransaccionId = null;

    localStorage.setItem('transacciones', JSON.stringify(transacciones));
    localStorage.setItem('assist_agenda_pagos', JSON.stringify(agendaPagos));
    renderizarSliderCuentas();
    renderizarAgenda();
    if (!document.getElementById('modal-historial').classList.contains('oculto')) {
        actualizarListaTransacciones();
    }
    programarSincronizacionSeguraAgenda();
}

function cambiarVistaAgenda(vista) {
    agendaVistaActual = vista;
    const segPend = document.getElementById('seg-agenda-pendientes');
    const segCal = document.getElementById('seg-agenda-calendario');
    const segPag = document.getElementById('seg-agenda-pagados');
    const calWrapper = document.getElementById('agenda-calendario-wrapper');

    if (segPend) segPend.classList.toggle('activo', vista === 'pendientes');
    if (segCal) segCal.classList.toggle('activo', vista === 'calendario');
    if (segPag) segPag.classList.toggle('activo', vista === 'pagados');

    if (calWrapper) {
        calWrapper.classList.toggle('oculto', vista !== 'calendario');
        calWrapper.style.display = vista === 'calendario' ? 'block' : 'none';
    }
    renderizarAgenda();
}

function cambiarMesCalendarioAgenda(direccion) {
    agendaCalMes += direccion;
    if (agendaCalMes < 0) { agendaCalMes = 11; agendaCalAnio -= 1; }
    else if (agendaCalMes > 11) { agendaCalMes = 0; agendaCalAnio += 1; }
    agendaDiaSeleccionado = null;
    renderizarAgenda();
}

function seleccionarDiaCalendarioAgenda(fechaIso) {
    agendaDiaSeleccionado = (agendaDiaSeleccionado === fechaIso) ? null : fechaIso;
    renderizarAgenda();
}

function limpiarDiaSeleccionadoAgenda() {
    agendaDiaSeleccionado = null;
    renderizarAgenda();
}

function renderizarCalendarioAgenda(hoyMsPrecalculado = null) {
    const tituloMes = document.getElementById('agenda-cal-mes-titulo');
    const grid = document.getElementById('agenda-cal-grid');
    const filtroBar = document.getElementById('agenda-cal-filtro-bar');
    const diaLabel = document.getElementById('agenda-cal-dia-label');
    if (!grid || !tituloMes) return;

    const mesesNombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    tituloMes.innerText = `${mesesNombres[agendaCalMes]} ${agendaCalAnio}`;

    const primerDiaSemana = new Date(agendaCalAnio, agendaCalMes, 1).getDay();
    const totalDiasMes = new Date(agendaCalAnio, agendaCalMes + 1, 0).getDate();
    const hoyIso = getLocalYYYYMMDD();
    const baseHoyMs = hoyMsPrecalculado !== null ? hoyMsPrecalculado : new Date(hoyIso + "T00:00:00").getTime();
    const prefijoMes = `${agendaCalAnio}-${String(agendaCalMes + 1).padStart(2, '0')}-`;

    // Indexar en un solo paso O(N) todos los compromisos de este mes
    const mapaPorDia = {};
    for (let i = 0; i < agendaPagos.length; i++) {
        const item = agendaPagos[i];
        if (item.fecha && item.fecha.startsWith(prefijoMes)) {
            if (!mapaPorDia[item.fecha]) mapaPorDia[item.fecha] = [];
            mapaPorDia[item.fecha].push(item);
        }
    }

    let html = '';
    for (let i = 0; i < primerDiaSemana; i++) html += `<div class="agenda-cal-day vacio"></div>`;

    for (let dia = 1; dia <= totalDiasMes; dia++) {
        const isoDia = `${prefijoMes}${String(dia).padStart(2, '0')}`;
        const esHoy = isoDia === hoyIso;
        const esSeleccionado = isoDia === agendaDiaSeleccionado;
        const itemsDia = mapaPorDia[isoDia];
        let dotsHtml = '';

        if (itemsDia && itemsDia.length > 0) {
            const maxDots = Math.min(3, itemsDia.length);
            let dots = '';
            for (let j = 0; j < maxDots; j++) {
                const item = itemsDia[j];
                let colorDot = obtenerColorCategoria(item.categoria);
                if (item.estado === 'pagado') colorDot = '#32D74B';
                else {
                    const d = calcularDiasRestantesAgenda(item.fecha, baseHoyMs);
                    if (d < 0) colorDot = '#FF453A';
                    else if (d === 0) colorDot = '#FF9F0A';
                }
                dots += `<span class="cal-dot-item" style="background:${colorDot};"></span>`;
            }
            dotsHtml = `<div class="cal-day-dots">${dots}</div>`;
        }
        html += `<div class="agenda-cal-day ${esHoy ? 'hoy' : ''} ${esSeleccionado ? 'seleccionado' : ''}" onclick="seleccionarDiaCalendarioAgenda('${isoDia}')"><span>${dia}</span>${dotsHtml}</div>`;
    }
    grid.innerHTML = html;

    if (filtroBar && diaLabel) {
        if (agendaDiaSeleccionado) {
            filtroBar.classList.remove('oculto'); filtroBar.style.display = 'flex';
            diaLabel.innerText = `📅 ${obtenerEtiquetaDiaCompleta(agendaDiaSeleccionado)}`;
        } else {
            filtroBar.classList.add('oculto'); filtroBar.style.display = 'none';
        }
    }
}

function construirTarjetaItemAgendaHTML(item, diasPrecalculados = null) {
    const infoEstado = obtenerInfoEstadoAgenda(item, diasPrecalculados);
    const colorCat = obtenerColorCategoria(item.categoria);
    const montoPrincipal = formatearMontoCensurado(formatearMontoMonedaAgenda(item.monto, item.moneda), false);
    const eqUSD = convertirMontoAgendaAUSD(item.monto, item.moneda);
    const textoEq = item.moneda !== 'USD' ? `<span class="agenda-item-eq">≈ ${formatearMontoCensurado('$' + eqUSD.toFixed(2), false)}</span>` : '';
    const etiquetaFrec = item.frecuencia === 'mensual' ? '🔄 Mensual' : '📌 Único';
    const fechaLegible = obtenerEtiquetaDiaCompleta(item.fecha);

    const btnAccionPrincipal = item.estado === 'pagado'
        ? `<button type="button" class="btn-secundario" style="width:auto; padding:6px 12px; font-size:11.5px; border-radius:11px;" onclick="reactivarCompromisoAgenda('${item.id}')">↩️ Revertir</button>`
        : `<button type="button" class="btn-pagar-agenda-item" onclick="abrirModalPagarAgenda('${item.id}')">💳 Pagar</button>`;

    return `
        <div class="agenda-item-card ${infoEstado.claseCard}">
            <div class="agenda-item-top">
                <div class="agenda-item-info">
                    <div class="agenda-item-title-row">
                        <span class="trans-cat-dot" style="background:${colorCat}; --cat-color:${colorCat};"></span>
                        <span class="agenda-item-title">${item.nota}</span>
                    </div>
                    <div class="agenda-item-meta">
                        <span>${item.categoria}</span><span>•</span><span>${fechaLegible}</span><span>•</span><span>${etiquetaFrec}</span>
                    </div>
                </div>
                <div class="agenda-item-amount-col">
                    <strong class="agenda-item-amount">${montoPrincipal}</strong>
                    ${textoEq}
                </div>
            </div>
            <div class="agenda-item-bottom">
                <span class="agenda-badge-status ${infoEstado.claseBadge}">${infoEstado.textoBadge}</span>
                <div class="agenda-item-actions">
                    <button type="button" class="btn-editar" style="width:30px; height:30px; border-radius:9px;" onclick="abrirModalNuevaAgenda('${item.id}')" title="Editar">✏️</button>
                    <button type="button" class="btn-eliminar" style="width:30px; height:30px; border-radius:9px;" onclick="eliminarCompromisoAgenda('${item.id}')" title="Eliminar">🗑️</button>
                    ${btnAccionPrincipal}
                </div>
            </div>
        </div>
    `;
}

function irAAgendaDesdeBanner() {
    const navAgenda = document.getElementById('nav-item-agenda');
    if (navAgenda) {
        cambiarPestana('tab-agenda', navAgenda);
        cambiarVistaAgenda('pendientes');
    }
}

function actualizarRecordatoriosAgenda(urgentesPrecalculados = null, hoyMsPrecalculado = null) {
    const badgeNav = document.getElementById('nav-agenda-badge');
    const bannerHome = document.getElementById('banner-recordatorio-agenda');
    const baseHoyMs = hoyMsPrecalculado !== null ? hoyMsPrecalculado : new Date(getLocalYYYYMMDD() + "T00:00:00").getTime();

    let urgentes = urgentesPrecalculados;
    if (!urgentes) {
        urgentes = [];
        for (let i = 0; i < agendaPagos.length; i++) {
            const a = agendaPagos[i];
            if (a.estado !== 'pagado') {
                const d = calcularDiasRestantesAgenda(a.fecha, baseHoyMs);
                if (d <= 3) urgentes.push({ item: a, dias: d });
            }
        }
        urgentes.sort((x, y) => (x.item.fecha || '').localeCompare(y.item.fecha || ''));
    }

    if (badgeNav) {
        if (urgentes.length > 0) {
            badgeNav.innerText = urgentes.length > 9 ? '9+' : String(urgentes.length);
            badgeNav.classList.remove('oculto'); badgeNav.style.display = 'flex';
        } else {
            badgeNav.classList.add('oculto'); badgeNav.style.display = 'none';
        }
    }

    if (bannerHome) {
        if (urgentes.length === 0) {
            bannerHome.classList.add('oculto'); bannerHome.style.display = 'none'; bannerHome.innerHTML = '';
        } else {
            const primeroObj = urgentes[0];
            const primero = primeroObj.item || primeroObj;
            const dias = primeroObj.dias !== undefined ? primeroObj.dias : calcularDiasRestantesAgenda(primero.fecha, baseHoyMs);
            const esCritico = dias <= 0;
            let tagTexto = '⏳ PRÓXIMO PAGO AGENDADO';
            if (dias < 0) tagTexto = '🚨 PAGO VENCIDO EN AGENDA';
            else if (dias === 0) tagTexto = '⚡ PAGO AGENDADO PARA HOY';
            else if (dias === 1) tagTexto = '⏳ VENCE MAÑANA';

            const montoStr = formatearMontoCensurado(formatearMontoMonedaAgenda(primero.monto, primero.moneda), false);
            const extraConteo = urgentes.length > 1 ? ` (+${urgentes.length - 1} más)` : '';

            bannerHome.className = `agenda-home-banner ${esCritico ? 'urgente' : ''}`;
            bannerHome.style.display = 'flex';
            bannerHome.innerHTML = `
                <div class="agenda-banner-info" onclick="irAAgendaDesdeBanner()" style="cursor:pointer;">
                    <span class="agenda-banner-tag">${tagTexto}${extraConteo}</span>
                    <strong class="agenda-banner-title">${primero.nota} · ${montoStr}</strong>
                    <span class="agenda-banner-sub">${primero.categoria} • ${obtenerEtiquetaDiaCompleta(primero.fecha)}</span>
                </div>
                <div class="agenda-banner-actions">
                    <button type="button" class="btn-banner-pay" onclick="abrirModalPagarAgenda('${primero.id}')">Pagar</button>
                    <button type="button" class="btn-banner-ver" onclick="irAAgendaDesdeBanner()">Agenda</button>
                </div>
            `;
        }
    }
}

function renderizarAgenda() {
    const hoyIso = getLocalYYYYMMDD();
    const hoyMs = new Date(hoyIso + "T00:00:00").getTime();

    const pendientesConDias = [];
    const pagados = [];
    let totalPendienteUSD = 0;

    // Clasificación en un solo recorrido O(N) para rendimiento instantáneo con miles de cuotas
    for (let i = 0; i < agendaPagos.length; i++) {
        const item = agendaPagos[i];
        if (item.estado === 'pagado') {
            pagados.push(item);
        } else {
            const dias = calcularDiasRestantesAgenda(item.fecha, hoyMs);
            pendientesConDias.push({ item, dias });
            totalPendienteUSD += convertirMontoAgendaAUSD(item.monto, item.moneda);
        }
    }

    pendientesConDias.sort((a, b) => (a.item.fecha || '').localeCompare(b.item.fecha || ''));
    pagados.sort((a, b) => (b.ultimaFechaPagada || b.fecha || '').localeCompare(a.ultimaFechaPagada || a.fecha || ''));

    const urgentes = [];
    const grupoVencidos = [];
    const grupoHoy = [];
    const grupoProximos3 = [];
    const grupoFuturos = [];

    for (let i = 0; i < pendientesConDias.length; i++) {
        const entry = pendientesConDias[i];
        if (entry.dias <= 3) urgentes.push(entry);
        if (entry.dias < 0) grupoVencidos.push(entry);
        else if (entry.dias === 0) grupoHoy.push(entry);
        else if (entry.dias <= 3) grupoProximos3.push(entry);
        else grupoFuturos.push(entry);
    }

    actualizarRecordatoriosAgenda(urgentes, hoyMs);

    const statPendientes = document.getElementById('agenda-stat-pendientes');
    const statMontoUSD = document.getElementById('agenda-stat-monto-usd');
    const statUrgentes = document.getElementById('agenda-stat-urgentes');
    const statProxTexto = document.getElementById('agenda-stat-prox-texto');
    const contenedorLista = document.getElementById('lista-agenda-principal');

    const vencidosCount = grupoVencidos.length;
    const hoyCount = grupoHoy.length;

    if (statPendientes) statPendientes.innerText = String(pendientesConDias.length);
    if (statMontoUSD) statMontoUSD.innerText = `≈ ${formatearMontoCensurado('$' + totalPendienteUSD.toFixed(2), false)}`;
    if (statUrgentes) statUrgentes.innerText = String(urgentes.length);

    if (statProxTexto) {
        if (vencidosCount > 0) { statProxTexto.innerText = `${vencidosCount} ${vencidosCount === 1 ? 'vencido' : 'vencidos'}`; statProxTexto.style.color = '#FF453A'; }
        else if (hoyCount > 0) { statProxTexto.innerText = `${hoyCount} ${hoyCount === 1 ? 'vence hoy' : 'vencen hoy'}`; statProxTexto.style.color = '#FF9F0A'; }
        else if (urgentes.length > 0) {
            const dProx = urgentes[0].dias;
            statProxTexto.innerText = dProx === 1 ? 'Vence mañana' : `En ${dProx} días`;
            statProxTexto.style.color = '#FFD60A';
        } else if (pendientesConDias.length > 0) {
            const dProx = pendientesConDias[0].dias;
            statProxTexto.innerText = `Próx. en ${dProx} días`;
            statProxTexto.style.color = 'var(--text-secondary)';
        } else {
            statProxTexto.innerText = 'Al día ✨';
            statProxTexto.style.color = '#32D74B';
        }
    }

    if (!contenedorLista) return;

    if (agendaVistaActual === 'calendario') {
        renderizarCalendarioAgenda(hoyMs);
        const claveMesActual = `${agendaCalAnio}-${String(agendaCalMes + 1).padStart(2, '0')}`;
        const itemsFiltradosCal = agendaPagos
            .filter(a => agendaDiaSeleccionado ? a.fecha === agendaDiaSeleccionado : (a.fecha && a.fecha.startsWith(claveMesActual)))
            .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));

        if (itemsFiltradosCal.length === 0) {
            const textoVacioCal = agendaDiaSeleccionado
                ? `No hay pagos agendados para el ${obtenerEtiquetaDiaCompleta(agendaDiaSeleccionado)}.`
                : `No hay compromisos registrados en este mes.`;
            contenedorLista.innerHTML = `
                <div style="text-align:center; padding: 24px 16px; color: var(--text-secondary); font-size: 13.5px;">
                    <p style="margin-bottom: 10px;">${textoVacioCal}</p>
                    <button type="button" class="btn-secundario" style="width:auto; margin:0 auto; padding:8px 16px; font-size:13px;" onclick="abrirModalNuevaAgenda(null, '${agendaDiaSeleccionado || hoyIso}')">+ Agendar en esta fecha</button>
                </div>`;
        } else {
            contenedorLista.innerHTML = itemsFiltradosCal.map(item => construirTarjetaItemAgendaHTML(item, calcularDiasRestantesAgenda(item.fecha, hoyMs))).join('');
        }
        return;
    }

    if (agendaVistaActual === 'pagados') {
        contenedorLista.innerHTML = pagados.length === 0
            ? `<p style="text-align:center; padding: 28px 16px; color: var(--text-secondary); font-size: 13.5px;">Aún no tienes compromisos completados.</p>`
            : pagados.map(item => construirTarjetaItemAgendaHTML(item, 9999)).join('');
        return;
    }

    if (pendientesConDias.length === 0) {
        contenedorLista.innerHTML = `
            <div style="text-align:center; padding: 30px 16px; color: var(--text-secondary); font-size: 13.5px;">
                <p style="margin-bottom: 12px;">No tienes pagos ni suscripciones pendientes. ¡Todo al día!</p>
                <button type="button" class="btn-secundario" style="width:auto; margin:0 auto; padding:9px 18px; font-size:13px;" onclick="abrirModalNuevaAgenda()">+ Agendar mi primer pago</button>
            </div>`;
        return;
    }

    let htmlPend = '';
    if (grupoVencidos.length > 0) htmlPend += `<div class="agenda-group-title" style="color:#FF453A;">🚨 Vencidos (${grupoVencidos.length})</div>` + grupoVencidos.map(e => construirTarjetaItemAgendaHTML(e.item, e.dias)).join('');
    if (grupoHoy.length > 0) htmlPend += `<div class="agenda-group-title" style="color:#FF9F0A;">⚡ Para Hoy (${grupoHoy.length})</div>` + grupoHoy.map(e => construirTarjetaItemAgendaHTML(e.item, e.dias)).join('');
    if (grupoProximos3.length > 0) htmlPend += `<div class="agenda-group-title" style="color:#FFD60A;">⏳ Próximos a Vencer (${grupoProximos3.length})</div>` + grupoProximos3.map(e => construirTarjetaItemAgendaHTML(e.item, e.dias)).join('');
    if (grupoFuturos.length > 0) htmlPend += `<div class="agenda-group-title">🗓️ Más Adelante (${grupoFuturos.length})</div>` + grupoFuturos.map(e => construirTarjetaItemAgendaHTML(e.item, e.dias)).join('');
    contenedorLista.innerHTML = htmlPend;
}

// ================= EJECUCIÓN DEL PAGO DE AGENDA CONECTADO A CUENTAS E HISTORIAL =================
function abrirModalPagarAgenda(idCompromiso) {
    if (cuentas.length === 0) return alert("Primero debes crear al menos una cuenta en Ajustes > Gestionar Cuentas.");
    const comp = agendaPagos.find(a => String(a.id) === String(idCompromiso));
    if (!comp) return;

    agendaPagoEnCursoId = comp.id;
    const selCuenta = document.getElementById('sel-cuenta-pagar-agenda');
    if (selCuenta) {
        selCuenta.innerHTML = '';
        cuentas.forEach(c => selCuenta.innerHTML += `<option value="${c.id}">${c.nombre} (${c.moneda})</option>`);
        const cuentaMismaMoneda = cuentas.find(c => c.moneda === comp.moneda);
        if (cuentaMismaMoneda) selCuenta.value = cuentaMismaMoneda.id;
        else if (cuentaActivaId && cuentas.find(c => c.id == cuentaActivaId)) selCuenta.value = cuentaActivaId;
        else selCuenta.value = cuentas[0].id;
    }

    const inMonto = document.getElementById('monto-pagar-agenda');
    const selMoneda = document.getElementById('moneda-pagar-agenda');
    const selCat = document.getElementById('cat-pagar-agenda');
    const inFecha = document.getElementById('fecha-pagar-agenda');
    const inNota = document.getElementById('nota-pagar-agenda');
    const selComision = document.getElementById('sel-comision-agenda');
    const inComManual = document.getElementById('input-comision-agenda-manual');
    const inTasaUsdt = document.getElementById('input-tasa-agenda-usdt');
    const descEl = document.getElementById('desc-pagar-agenda');

    if (descEl) descEl.innerHTML = `Vas a registrar el pago de <strong>"${comp.nota}"</strong>. Confirma de qué cuenta se descontará:`;
    if (inMonto) inMonto.value = comp.monto;
    if (selMoneda) selMoneda.value = comp.moneda || 'USD';
    poblarSelectCategoriasAgenda(selCat, comp.categoria);
    if (inFecha) inFecha.value = getLocalYYYYMMDD();
    if (inNota) inNota.value = comp.nota || '';
    if (selComision) selComision.value = 'tarjeta';
    if (inComManual) { inComManual.classList.add('oculto'); inComManual.value = ''; }
    if (inTasaUsdt) inTasaUsdt.value = tasaParalelo > 1 ? tasaParalelo.toFixed(2) : '';

    actualizarUIModalPagarAgenda();
    abrirModal('modal-pagar-agenda');
}

function toggleComisionManualAgenda() {
    const selComision = document.getElementById('sel-comision-agenda');
    const inManual = document.getElementById('input-comision-agenda-manual');
    if (!selComision || !inManual) return;
    if (selComision.value === 'manual') { inManual.classList.remove('oculto'); inManual.focus(); }
    else { inManual.classList.add('oculto'); inManual.value = ''; }
}

function actualizarUIModalPagarAgenda() {
    const idCuenta = document.getElementById('sel-cuenta-pagar-agenda')?.value;
    const cuenta = cuentas.find(c => c.id == idCuenta);
    const monedaPago = document.getElementById('moneda-pagar-agenda')?.value || 'USD';

    const boxComision = document.getElementById('box-comision-agenda-ves');
    const boxTasaUsdt = document.getElementById('box-tasa-agenda-usdt');
    const inTasaUsdt = document.getElementById('input-tasa-agenda-usdt');

    if (boxComision) {
        if (monedaPago === 'VES') {
            boxComision.classList.remove('oculto'); boxComision.style.display = 'flex';
        } else {
            boxComision.classList.add('oculto'); boxComision.style.display = 'none';
            const selCom = document.getElementById('sel-comision-agenda');
            if (selCom) selCom.value = 'tarjeta';
            toggleComisionManualAgenda();
        }
    }

    const requiereTasaUsdt = Boolean(cuenta && ((cuenta.moneda === 'USDT' && monedaPago === 'VES') || (cuenta.moneda === 'VES' && monedaPago === 'USDT')));
    if (boxTasaUsdt) {
        if (requiereTasaUsdt) {
            boxTasaUsdt.classList.remove('oculto'); boxTasaUsdt.style.display = 'flex';
            if (inTasaUsdt && (!inTasaUsdt.value || parseFloat(inTasaUsdt.value) <= 0)) {
                inTasaUsdt.value = tasaParalelo > 1 ? tasaParalelo.toFixed(2) : '';
            }
        } else {
            boxTasaUsdt.classList.add('oculto'); boxTasaUsdt.style.display = 'none';
        }
    }
    calcularPreviewModalPagarAgenda();
}

function calcularDatosConversionPagoAgenda() {
    const idCuenta = document.getElementById('sel-cuenta-pagar-agenda')?.value;
    const cuenta = cuentas.find(c => c.id == idCuenta);
    const montoBase = parseFloat(document.getElementById('monto-pagar-agenda')?.value) || 0;
    const monedaPago = document.getElementById('moneda-pagar-agenda')?.value || 'USD';

    let comisionBs = 0;
    if (monedaPago === 'VES') {
        const tipoCom = document.getElementById('sel-comision-agenda')?.value || 'tarjeta';
        if (tipoCom === 'p2p' && montoBase > 0) comisionBs = Math.max(14.00, montoBase * 0.003);
        else if (tipoCom === 'p2c' && montoBase > 0) comisionBs = Math.max(14.00, montoBase * 0.015);
        else if (tipoCom === 'manual') comisionBs = parseFloat(document.getElementById('input-comision-agenda-manual')?.value) || 0;
    }

    const montoTotalOperacion = montoBase + comisionBs;
    const tasaUsdtInput = parseFloat(document.getElementById('input-tasa-agenda-usdt')?.value) || tasaParalelo || tasaBCV || 1;
    let montoUSD = montoTotalOperacion;
    let detalleTasaUsdt = '';

    if (cuenta && cuenta.moneda === 'USDT') {
        if (monedaPago === 'USDT' || monedaPago === 'USD') montoUSD = montoTotalOperacion;
        else if (monedaPago === 'VES') {
            montoUSD = tasaUsdtInput > 0 ? (montoTotalOperacion / tasaUsdtInput) : 0;
            detalleTasaUsdt = `@ Tasa USDT: Bs ${tasaUsdtInput.toFixed(2)}`;
        } else if (monedaPago === 'EUR') {
            const enBs = montoTotalOperacion * (tasaEUR || 1);
            montoUSD = tasaUsdtInput > 0 ? (enBs / tasaUsdtInput) : 0;
        }
    } else {
        if (monedaPago === 'VES') montoUSD = montoTotalOperacion / (tasaBCV || 1);
        else if (monedaPago === 'EUR') montoUSD = (montoTotalOperacion * (tasaEUR || 1)) / (tasaBCV || 1);
        else if (monedaPago === 'USDT' && cuenta && cuenta.moneda === 'VES') {
            const enBs = montoTotalOperacion * tasaUsdtInput;
            montoUSD = enBs / (tasaBCV || 1);
            detalleTasaUsdt = `@ Tasa USDT: Bs ${tasaUsdtInput.toFixed(2)}`;
        } else montoUSD = montoTotalOperacion;
    }

    return { cuenta, montoBase, monedaPago, comisionBs, montoTotalOperacion, montoUSD, detalleTasaUsdt };
}

function calcularPreviewModalPagarAgenda() {
    const lblPreview = document.getElementById('lbl-descuento-agenda-preview');
    if (!lblPreview) return;
    const datos = calcularDatosConversionPagoAgenda();
    if (!datos.cuenta) { lblPreview.innerText = '$0.00'; return; }

    if (datos.cuenta.moneda === 'VES') {
        const totalBsCuenta = datos.montoUSD * (tasaBCV || 1);
        lblPreview.innerText = `-Bs ${totalBsCuenta.toFixed(2)} ($${datos.montoUSD.toFixed(2)})`;
    } else if (datos.cuenta.moneda === 'USDT') {
        lblPreview.innerText = `-${datos.montoUSD.toFixed(2)} USDT`;
    } else {
        lblPreview.innerText = `-$${datos.montoUSD.toFixed(2)}`;
    }
}

function confirmarPagoAgenda() {
    const comp = agendaPagos.find(a => String(a.id) === String(agendaPagoEnCursoId));
    if (!comp) return alert("No se encontró el compromiso en la agenda.");

    const datos = calcularDatosConversionPagoAgenda();
    if (!datos.cuenta) return alert("Selecciona una cuenta válida.");
    if (isNaN(datos.montoBase) || datos.montoBase <= 0) return alert("Ingresa un monto válido mayor a 0.");

    const categoriaElegida = document.getElementById('cat-pagar-agenda')?.value || comp.categoria || 'Varios';
    const valFecha = document.getElementById('fecha-pagar-agenda')?.value;
    const notaUsuario = (document.getElementById('nota-pagar-agenda')?.value || comp.nota || '').trim();

    if (categoriaElegida && !categorias.includes(categoriaElegida)) {
        categorias.push(categoriaElegida);
        asegurarColoresCategorias();
        localStorage.setItem('categorias', JSON.stringify(categorias));
        cargarSelects();
    }

    const dateObj = valFecha ? new Date(valFecha + "T00:00:00") : new Date();
    const isoLocal = getLocalYYYYMMDD(dateObj);
    const mesesArr = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const fechaFormateada = `${dateObj.getDate()} ${mesesArr[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

    let notaFinal = notaUsuario ? `📅 ${notaUsuario}` : `📅 Pago Agenda: ${comp.nota}`;
    if (datos.comisionBs > 0) notaFinal += ` (Comisión: Bs ${datos.comisionBs.toFixed(2)})`;
    if (datos.detalleTasaUsdt) notaFinal += ` (${datos.detalleTasaUsdt})`;

    const fechaPreviaCompromiso = comp.fecha;
    const nuevoIdTrans = dateObj.getTime() + Math.random();

    transacciones.push({
        id: nuevoIdTrans,
        cuentaId: datos.cuenta.id,
        montoUSD: datos.montoUSD,
        tipo: 'gasto',
        categoria: categoriaElegida,
        nota: notaFinal,
        monedaInputOriginal: datos.monedaPago,
        fechaFormateada: fechaFormateada,
        fecha: dateObj,
        fechaIsoLocal: isoLocal,
        agendaId: comp.id,
        agendaFrecuencia: comp.frecuencia || 'unico',
        agendaFechaPrevia: fechaPreviaCompromiso
    });
    transacciones.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    if (comp.frecuencia === 'mensual') {
        comp.ultimaFechaPagada = fechaPreviaCompromiso;
        comp.fecha = avanzarUnMesFechaISO(comp.fecha);
        comp.estado = 'pendiente';
        comp.ultimaTransaccionId = nuevoIdTrans;
    } else {
        comp.estado = 'pagado';
        comp.ultimaFechaPagada = isoLocal;
        comp.ultimaTransaccionId = nuevoIdTrans;
    }

    cuentaActivaId = datos.cuenta.id;
    agendaPagoEnCursoId = null;

    cerrarModal('modal-pagar-agenda');

    localStorage.setItem('transacciones', JSON.stringify(transacciones));
    localStorage.setItem('assist_agenda_pagos', JSON.stringify(agendaPagos));
    renderizarSliderCuentas();
    renderizarAgenda();
    programarSincronizacionSeguraAgenda();
}

function obtenerRadiografiaFinanciera() {
    const balancesPorCuenta = cuentas.map(c => {
        let balUSD = 0;
        transacciones.forEach(t => {
            if (t.cuentaId == c.id) balUSD += t.tipo === 'ingreso' ? (Number(t.montoUSD) || 0) : -(Number(t.montoUSD) || 0);
        });
        return { ...c, balanceUSD: balUSD };
    });

    const patrimonioTotalUSD = balancesPorCuenta.reduce((acc, c) => acc + c.balanceUSD, 0);
    const compromisosPendientes = agendaPagos
        .filter(a => a.estado !== 'pagado')
        .map(a => ({ ...a, montoEquivalenteUSD: convertirMontoAgendaAUSD(a.monto, a.moneda), diasRestantes: calcularDiasRestantesAgenda(a.fecha) }))
        .sort((a, b) => a.diasRestantes - b.diasRestantes);
    const totalCompromisosPendientesUSD = compromisosPendientes.reduce((acc, a) => acc + a.montoEquivalenteUSD, 0);

    return {
        cuentas: balancesPorCuenta,
        patrimonioTotalUSD,
        metas,
        agendaPendientes: compromisosPendientes,
        totalAgendaPendienteUSD: totalCompromisosPendientesUSD,
        tasas: { BCV: tasaBCV, USDT: tasaParalelo, EUR: tasaEUR }
    };
}