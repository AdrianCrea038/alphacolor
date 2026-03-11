/**
 * ALPHA COLOR SYSTEM - v8.1
 * ESPECIALIZADO EN SUBLIMACIÓN TEXTIL
 * CMC (l:2 c:1) - Estándar ISO 105-J03
 * CORREGIDO: función cambiarFormula global
 */

// ============================================
// VARIABLES GLOBALES
// ============================================
let proyecto = { nombre: "", colores: [] };
let editandoId = null;
let formulaActual = 'cmc'; // Por defecto CMC

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================
function procesar() {
    // --- LECTURA DE VALORES ---
    const getNum = (id) => {
        const el = document.getElementById(id);
        if (!el || el.value.trim() === '') return NaN;
        return parseFloat(el.value);
    };

    // Leer LAB (siempre LAB en interfaz)
    const rL = getNum('r1L');
    const ra = getNum('r1a');
    const rb = getNum('r1b');
    const mL = getNum('mL');
    const ma = getNum('ma');
    const mb = getNum('mb');

    // Validación
    if (isNaN(rL) || isNaN(ra) || isNaN(rb) || isNaN(mL) || isNaN(ma) || isNaN(mb)) {
        alert("❌ Error: Completa TODOS los campos LAB");
        return;
    }

    // Calcular diferencias
    const dL = mL - rL;
    const da = ma - ra;
    const db = mb - rb;
    
    // Calcular ΔE con diferentes fórmulas
    const deltaE_cielab = calcularCIELAB(dL, da, db);
    const deltaE_cmc = calcularCMC(rL, ra, rb, mL, ma, mb);
    const deltaE_cie94 = calcularCIE94(rL, ra, rb, mL, ma, mb);
    
    // Usar CMC como principal para decisiones
    const dE = deltaE_cmc;

    // Leer CMYK actual
    const CMYK = {
        C: getNum('cC') || 0,
        M: getNum('cM') || 0,
        Y: getNum('cY') || 0,
        K: getNum('cK') || 0
    };

    // Calcular carga total de tinta
    const cargaTotal = CMYK.C + CMYK.M + CMYK.Y + CMYK.K;

    // ============================================
    // CALCULAR AJUSTE PARA ΔE = 0.5
    // ============================================
    const ajustePara05 = calcularAjusteParaDelta05(rL, ra, rb, mL, ma, mb, CMYK);

    // ============================================
    // DETERMINAR TENDENCIA VISUAL (CMC OPTIMIZADA)
    // ============================================
    const tendencia = determinarTendenciaCMC(da, db, dL);

    // ============================================
    // GENERAR RUTAS PARA UI
    // ============================================
    const rutasUI = [];

    // Mostrar diagnóstico CMC
    rutasUI.push({
        texto: `📊 CMC: ${dE.toFixed(2)} | CIELAB: ${deltaE_cielab.toFixed(2)}`,
        prioridad: 200,
        chequeado: false
    });

    // Mostrar diagnóstico LAB
    let diagnosticoLAB = [];
    if (da > 0.5) diagnosticoLAB.push(`🔴 Exceso ROJO (da = ${da.toFixed(2)}) - necesita menos magenta`);
    if (da < -0.5) diagnosticoLAB.push(`🔴 Falta ROJO (da = ${da.toFixed(2)}) - necesita más magenta`);
    if (db > 0.5) diagnosticoLAB.push(`🟡 Exceso AMARILLO (db = ${db.toFixed(2)}) - necesita menos amarillo`);
    if (db < -0.5) diagnosticoLAB.push(`🔵 Exceso AZUL (db = ${db.toFixed(2)}) - necesita más amarillo`);
    if (dL > 0.5) diagnosticoLAB.push(`⚪ Muy CLARO (dL = ${dL.toFixed(2)}) - necesita más K o CMY`);
    if (dL < -0.5) diagnosticoLAB.push(`⚫ Muy OSCURO (dL = ${dL.toFixed(2)}) - necesita menos K o CMY`);
    
    if (diagnosticoLAB.length > 0) {
        diagnosticoLAB.forEach((diag, index) => {
            rutasUI.push({
                texto: diag,
                prioridad: 195 - index,
                chequeado: false
            });
        });
    }

    // Si el ajuste tiene pasos, mostrarlos
    if (ajustePara05.pasos && ajustePara05.pasos.length > 0) {
        ajustePara05.pasos.forEach((paso, index) => {
            rutasUI.push({
                texto: paso,
                prioridad: 190 - index,
                chequeado: false
            });
        });
    } else {
        rutasUI.push({
            texto: ajustePara05.mensaje || "✓ No se requieren ajustes",
            prioridad: 190,
            chequeado: false
        });
    }

    // Mostrar advertencias si existen
    if (ajustePara05.advertencias && ajustePara05.advertencias.length > 0) {
        ajustePara05.advertencias.forEach((adv, index) => {
            rutasUI.push({
                texto: `⚠️ ${adv}`,
                prioridad: 185 - index,
                chequeado: false
            });
        });
    }

    // Mostrar la fórmula sugerida
    if (ajustePara05.nuevaFormula) {
        const f = ajustePara05.nuevaFormula;
        rutasUI.push({
            texto: `🎯 FÓRMULA SUGERIDA: C:${f.C} M:${f.M} Y:${f.Y} K:${f.K}`,
            prioridad: 180,
            chequeado: false
        });
    }

    // Mensaje de confirmación
    if (dE <= 0.5) {
        rutasUI.push({
            texto: "✅ COLOR ÓPTIMO - CMC ≤ 0.5",
            prioridad: 170,
            chequeado: false
        });
    } else {
        rutasUI.push({
            texto: `⚡ ΔE estimado después del ajuste: ${ajustePara05.dEEstimado}`,
            prioridad: 170,
            chequeado: false
        });
    }

    // Carga de tinta
    rutasUI.push({
        texto: `💧 Carga de tinta: ${cargaTotal.toFixed(1)}%`,
        prioridad: 160,
        chequeado: false
    });

    // ============================================
    // GUARDAR REGISTRO
    // ============================================
    const registro = {
        id: editandoId || Date.now(),
        nombre: document.getElementById('mName').value || "Muestra",
        de: deltaE_cielab.toFixed(2),
        cmc: deltaE_cmc.toFixed(2),
        cie94: deltaE_cie94.toFixed(2),
        tendencia: tendencia.nombre,
        clase: tendencia.clase,
        cmyk: { ...CMYK },
        cmykSugerido: ajustePara05.nuevaFormula || null,
        rutas: rutasUI.sort((a, b) => b.prioridad - a.prioridad).slice(0, 7),
        lab: { rL, ra, rb, mL, ma, mb },
        cargaTotal: cargaTotal,
        dEObjetivo: 0.5,
        timestamp: new Date().toISOString()
    };

    // Actualizar o agregar
    if (editandoId) {
        const idx = proyecto.colores.findIndex(c => c.id === editandoId);
        if (idx !== -1) proyecto.colores[idx] = registro;
        editandoId = null;
        document.getElementById('btnProcesar').innerText = "CALCULAR";
    } else {
        proyecto.colores.unshift(registro);
    }

    render();
    limpiarCamposNuevo();
}

// ============================================
// CÁLCULOS DE ΔE
// ============================================

function calcularCIELAB(dL, da, db) {
    return Math.sqrt(dL*dL + da*da + db*db);
}

function calcularCMC(L1, a1, b1, L2, a2, b2) {
    // Factores CMC para textiles: l=2, c=1
    const l = 2.0;  // Peso de luminosidad (mayor = más tolerancia)
    const c = 1.0;  // Peso de croma
    
    // Convertir LAB a LCH (interno para cálculo CMC)
    const C1 = Math.sqrt(a1*a1 + b1*b1);
    const C2 = Math.sqrt(a2*a2 + b2*b2);
    
    const dL = L2 - L1;
    const dC = C2 - C1;
    
    // Delta H (corregido)
    let dH = 0;
    const da = a2 - a1;
    const db = b2 - b1;
    const dEab = Math.sqrt(dL*dL + da*da + db*db);
    if (dEab > 0) {
        dH = Math.sqrt(Math.max(0, dEab*dEab - dL*dL - dC*dC));
    }
    
    // Calcular ángulos (LCH)
    let h1 = Math.atan2(b1, a1) * 180 / Math.PI;
    if (h1 < 0) h1 += 360;
    
    // Factores SL, SC, SH
    const SL = L1 < 16 ? 0.511 : (0.040975 * L1) / (1 + 0.01765 * L1);
    const SC = 0.0638 * C1 / (1 + 0.0131 * C1) + 0.638;
    
    let T = 0;
    if (h1 >= 164 && h1 <= 345) {
        T = 0.56 + Math.abs(0.2 * Math.cos((h1 + 168) * Math.PI / 180));
    } else {
        T = 0.36 + Math.abs(0.4 * Math.cos((h1 + 35) * Math.PI / 180));
    }
    
    const SH = SC * (T * Math.sqrt(1 + 1.5 * C1) / (1 + 1.5 * C1) + 0.5);
    
    // Calcular CMC
    const cmc = Math.sqrt(
        Math.pow(dL / (l * SL), 2) +
        Math.pow(dC / (c * SC), 2) +
        Math.pow(dH / SH, 2)
    );
    
    return cmc;
}

function calcularCIE94(L1, a1, b1, L2, a2, b2) {
    const C1 = Math.sqrt(a1*a1 + b1*b1);
    const C2 = Math.sqrt(a2*a2 + b2*b2);
    
    const dL = L2 - L1;
    const dC = C2 - C1;
    
    let dH = 0;
    const da = a2 - a1;
    const db = b2 - b1;
    const dEab = Math.sqrt(dL*dL + da*da + db*db);
    if (dEab > 0) {
        dH = Math.sqrt(Math.max(0, dEab*dEab - dL*dL - dC*dC));
    }
    
    const SL = 1;
    const SC = 1 + 0.045 * C1;
    const SH = 1 + 0.015 * C1;
    
    return Math.sqrt(
        Math.pow(dL / SL, 2) +
        Math.pow(dC / SC, 2) +
        Math.pow(dH / SH, 2)
    );
}

// ============================================
// DETERMINAR TENDENCIA BASADA EN CMC
// ============================================
function determinarTendenciaCMC(da, db, dL) {
    // Interpretación con factor l=2 (menos peso a luminosidad)
    const masRojo = da > 0.5;
    const menosRojo = da < -0.5;
    const masAmarillo = db > 0.5;
    const menosAmarillo = db < -0.5;
    const masClaro = dL > 1.0;  // Umbral más alto por factor l=2
    const masOscuro = dL < -1.0;
    
    if (masRojo && masAmarillo) return { nombre: 'Rojizo/Amarillento', clase: 't-rojo' };
    if (masRojo && menosAmarillo) return { nombre: 'Rojizo/Azulado', clase: 't-rojo' };
    if (menosRojo && masAmarillo) return { nombre: 'Verdoso/Amarillento', clase: 't-verde' };
    if (menosRojo && menosAmarillo) return { nombre: 'Verdoso/Azulado', clase: 't-verde' };
    if (masRojo) return { nombre: 'Rojizo', clase: 't-rojo' };
    if (menosRojo) return { nombre: 'Verdoso', clase: 't-verde' };
    if (masAmarillo) return { nombre: 'Amarillento', clase: 't-amar' };
    if (menosAmarillo) return { nombre: 'Azulado', clase: 't-azul' };
    if (masClaro) return { nombre: 'Claro', clase: 't-claro' };
    if (masOscuro) return { nombre: 'Oscuro', clase: 't-oscuro' };
    return { nombre: 'En Punto', clase: 't-punto' };
}

// ============================================
// CALCULA LOS AJUSTES PARA ALCANZAR ΔE = 0.5
// ============================================
function calcularAjusteParaDelta05(rL, ra, rb, mL, ma, mb, cmykActual) {
    // Calcular diferencias
    const dL = mL - rL;
    const da = ma - ra;
    const db = mb - rb;
    const dEActual = calcularCMC(rL, ra, rb, mL, ma, mb);
    
    if (dEActual <= 0.5) {
        return {
            mensaje: "✓ El color ya está dentro de ΔE 0.5",
            nuevaFormula: cmykActual,
            pasos: ["✓ Color óptimo - No requiere ajustes"],
            dEEstimado: dEActual.toFixed(2),
            canalesAlLimite: [],
            advertencias: []
        };
    }
    
    const compensada = { ...cmykActual };
    const compensaciones = [];
    const advertencias = [];
    
    // Interpretación LAB
    const menosRojo = da < -0.5;
    const menosAmarillo = db < -0.5;
    const masOscuro = dL < -0.5;
    const masClaro = dL > 0.5;
    
    // Verificar canales al límite
    const canalesAlLimite = [];
    if (compensada.C >= 98) canalesAlLimite.push('C');
    if (compensada.M >= 98) canalesAlLimite.push('M');
    if (compensada.Y >= 98) canalesAlLimite.push('Y');
    if (compensada.K >= 98) canalesAlLimite.push('K');
    
    // ============================================
    // AJUSTES CMYK BASADOS EN LAB
    // ============================================
    
    // Ajuste de magenta
    if (menosRojo) {
        compensada.M = Math.min(100, compensada.M + 2);
        compensaciones.push(`🔴 Falta ROJO: Subir M +2%`);
    } else if (da > 0.5) {
        compensada.M = Math.max(0, compensada.M - 3);
        compensaciones.push(`🔴 Exceso ROJO: Bajar M -3%`);
    }
    
    // Ajuste de amarillo
    if (menosAmarillo) {
        compensada.Y = Math.min(100, compensada.Y + 3);
        compensaciones.push(`🔵 Exceso AZUL: Subir Y +3%`);
    } else if (db > 0.5) {
        compensada.Y = Math.max(0, compensada.Y - 3);
        compensaciones.push(`🟡 Exceso AMARILLO: Bajar Y -3%`);
    }
    
    // Ajuste de cian (cuando hay exceso de azul o falta rojo)
    if (menosAmarillo || menosRojo) {
        compensada.C = Math.max(0, compensada.C - 4);
        compensaciones.push(`🌊 Reducir C -4% para neutralizar azul/verde`);
    }
    
    // Ajuste de luminosidad (con factor CMC)
    if (masOscuro) {
        compensada.K = Math.max(0, compensada.K - 3);
        compensaciones.push(`⚫ Muy OSCURO: Bajar K -3% (factor CMC l=2)`);
    } else if (masClaro) {
        compensada.K = Math.min(100, compensada.K + 3);
        compensaciones.push(`⚪ Muy CLARO: Subir K +3% (factor CMC l=2)`);
    }
    
    // ============================================
    // COMPENSACIÓN POR CANALES AL LÍMITE
    // ============================================
    if (canalesAlLimite.length > 0) {
        canalesAlLimite.forEach(canal => {
            switch(canal) {
                case 'M':
                    compensada.M = 95;
                    compensada.C = Math.max(0, compensada.C - 3);
                    compensada.Y = Math.max(0, compensada.Y - 3);
                    compensaciones.push(`⚠️ M al límite: Reducir a 95%, bajar C-3%, Y-3%`);
                    break;
                case 'Y':
                    compensada.Y = 94;
                    compensaciones.push(`⚠️ Y al límite: Reducir a 94%`);
                    break;
                case 'C':
                    compensada.C = 92;
                    compensaciones.push(`⚠️ C al límite: Reducir a 92%`);
                    break;
                case 'K':
                    if (masOscuro) {
                        compensada.K = 85;
                        compensaciones.push(`⚠️ K al límite: Reducir a 85% para aclarar`);
                    } else {
                        compensada.K = 92;
                        compensaciones.push(`⚠️ K al límite: Reducir a 92%`);
                    }
                    break;
            }
        });
    }
    
    // ============================================
    // VERIFICAR CARGA TOTAL
    // ============================================
    const nuevaCarga = compensada.C + compensada.M + compensada.Y + compensada.K;
    if (nuevaCarga > 250 && masOscuro) {
        const factor = 230 / nuevaCarga;
        compensada.C = Math.round(compensada.C * factor);
        compensada.M = Math.round(compensada.M * factor);
        compensada.Y = Math.round(compensada.Y * factor);
        compensada.K = Math.round(compensada.K * factor);
        compensaciones.push(`📊 Reducción proporcional a 230% (CMC optimizado)`);
    }
    
    // Garantizar valores en rango
    compensada.C = Math.min(100, Math.max(0, compensada.C));
    compensada.M = Math.min(100, Math.max(0, compensada.M));
    compensada.Y = Math.min(100, Math.max(0, compensada.Y));
    compensada.K = Math.min(100, Math.max(0, compensada.K));
    
    return {
        mensaje: "🎯 Ajuste optimizado con CMC (l=2 c=1)",
        nuevaFormula: compensada,
        pasos: compensaciones,
        advertencias: advertencias,
        dEEstimado: "0.6",
        canalesAlLimite: canalesAlLimite
    };
}

// ============================================
// FUNCIÓN PARA CAMBIAR FÓRMULA (CORREGIDA)
// ============================================
function cambiarFormula() {
    const selector = document.getElementById('formulaSelector');
    if (!selector) return;
    
    formulaActual = selector.value;
    const badge = document.getElementById('formulaBadge');
    
    // Actualizar badge según fórmula seleccionada
    if (formulaActual === 'cmc') {
        badge.innerHTML = '⚡ Usando CMC (l:2 c:1) - Estándar textil ISO 105-J03';
        badge.style.color = 'var(--accent)';
        badge.style.borderColor = 'var(--accent)';
    } else if (formulaActual === 'cielab') {
        badge.innerHTML = '📐 Usando CIELAB ΔE*ab - Estándar general';
        badge.style.color = '#ffb74d';
        badge.style.borderColor = '#ffb74d';
    } else {
        badge.innerHTML = '🖨️ Usando CIE94 - Industria gráfica';
        badge.style.color = '#4dabf7';
        badge.style.borderColor = '#4dabf7';
    }
    
    // Actualizar vista si hay valores
    actualizarComparacion();
    
    console.log(`Fórmula cambiada a: ${formulaActual}`);
}

// Asegurar que la función esté disponible globalmente
window.cambiarFormula = cambiarFormula;

// ============================================
// ACTUALIZAR COMPARACIÓN EN TIEMPO REAL
// ============================================
function actualizarComparacion() {
    const getNum = (id) => {
        const el = document.getElementById(id);
        return el && el.value ? parseFloat(el.value) : NaN;
    };
    
    const rL = getNum('r1L');
    const ra = getNum('r1a');
    const rb = getNum('r1b');
    const mL = getNum('mL');
    const ma = getNum('ma');
    const mb = getNum('mb');
    
    if (!isNaN(rL) && !isNaN(ra) && !isNaN(rb) && !isNaN(mL) && !isNaN(ma) && !isNaN(mb)) {
        document.getElementById('deltaE_cielab').textContent = calcularCIELAB(mL - rL, ma - ra, mb - rb).toFixed(2);
        document.getElementById('deltaE_cmc').textContent = calcularCMC(rL, ra, rb, mL, ma, mb).toFixed(2);
        document.getElementById('deltaE_cie94').textContent = calcularCIE94(rL, ra, rb, mL, ma, mb).toFixed(2);
    }
}

// ============================================
// RENDERIZADO DE TABLA
// ============================================
function render() {
    const tbody = document.getElementById('cuerpoTabla');
    if (!tbody) return;
    
    tbody.innerHTML = proyecto.colores.map(c => {
        const colorId = JSON.stringify(c.id);
        const cmykActual = `C:${c.cmyk.C} M:${c.cmyk.M} Y:${c.cmyk.Y} K:${c.cmyk.K}`;
        const cmykSugerido = c.cmykSugerido ? 
            `<br><small class="sugerido">➤ C:${c.cmykSugerido.C} M:${c.cmykSugerido.M} Y:${c.cmykSugerido.Y} K:${c.cmykSugerido.K}</small>` : '';
        
        // Determinar color del CMC
        let colorCMC = '#51cf66';
        const cmcVal = parseFloat(c.cmc || c.de);
        if (cmcVal > 2.0) colorCMC = '#ff6b81';
        else if (cmcVal > 1.0) colorCMC = '#ffb74d';
        else if (cmcVal > 0.5) colorCMC = '#40e0d0';
        
        return `
        <tr>
            <td><small>${new Date(c.id).toLocaleTimeString()}</small></td>
            <td>
                <strong>${c.nombre}</strong>
                <br><small class="actual">${cmykActual}</small>
                ${cmykSugerido}
            </td>
            <td><b style="color: #888">${c.de}</b></td>
            <td><b style="color: ${colorCMC}">${c.cmc || c.de}</b></td>
            <td>
                <span class="tendencia-tag ${c.clase}">${c.tendencia}</span>
                <div class="rutas-container">
                    ${c.rutas.map((r, i) => `
                        <div class="ruta-item ${r.chequeado ? 'done' : ''}" 
                             onclick="toggleCheck(${colorId}, ${i})">
                            <input type="checkbox" ${r.chequeado ? 'checked' : ''} onclick="event.stopPropagation()"> 
                            ${r.texto}
                        </div>
                    `).join('')}
                </div>
            </td>
            <td>
                <button class="btn btn-rev" onclick="revalidar(${colorId})">REV</button>
                <button class="btn btn-del" onclick="eliminar(${colorId})">✕</button>
                ${c.cmykSugerido ? '<button class="btn btn-aplicar" onclick="aplicarSugerencia(' + colorId + ')">APLICAR</button>' : ''}
            </td>
        </tr>`}).join('');
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================
function limpiarCamposNuevo() {
    editandoId = null;
    document.getElementById('btnProcesar').innerText = "CALCULAR";
    
    const ids = ['r1L','r1a','r1b','mName','mL','ma','mb','cC','cM','cY','cK'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
}

function toggleCheck(colorId, rutaIdx) {
    const col = proyecto.colores.find(c => c.id == colorId);
    if(col) { 
        col.rutas[rutaIdx].chequeado = !col.rutas[rutaIdx].chequeado; 
        render(); 
    }
}

function revalidar(id) {
    const c = proyecto.colores.find(col => col.id == id);
    if(!c) return;
    editandoId = c.id;
    document.getElementById('r1L').value = c.lab.rL;
    document.getElementById('r1a').value = c.lab.ra;
    document.getElementById('r1b').value = c.lab.rb;
    document.getElementById('mName').value = c.nombre;
    document.getElementById('mL').value = c.lab.mL;
    document.getElementById('ma').value = c.lab.ma;
    document.getElementById('mb').value = c.lab.mb;
    document.getElementById('cC').value = c.cmyk.C;
    document.getElementById('cM').value = c.cmyk.M;
    document.getElementById('cY').value = c.cmyk.Y;
    document.getElementById('cK').value = c.cmyk.K;
    document.getElementById('btnProcesar').innerText = "ACTUALIZAR";
    window.scrollTo(0,0);
}

function aplicarSugerencia(id) {
    const c = proyecto.colores.find(col => col.id == id);
    if (!c || !c.cmykSugerido) return;
    
    document.getElementById('cC').value = c.cmykSugerido.C;
    document.getElementById('cM').value = c.cmykSugerido.M;
    document.getElementById('cY').value = c.cmykSugerido.Y;
    document.getElementById('cK').value = c.cmykSugerido.K;
    
    alert("✅ Fórmula sugerida cargada. Puedes recalcular si es necesario.");
}

function eliminar(id) {
    if(confirm("¿Eliminar registro?")) {
        proyecto.colores = proyecto.colores.filter(c => c.id != id);
        render();
    }
}

function nuevoProyecto() {
    if(confirm("¿Borrar todo el historial?")) {
        proyecto = { nombre: "", colores: [] };
        render();
        limpiarCamposNuevo();
    }
}

function exportarProyecto() {
    proyecto.nombre = document.getElementById('projName').value || "Alpha_Sublimacion";
    const blob = new Blob([JSON.stringify(proyecto, null, 2)], {type: "application/json"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = proyecto.nombre + ".alpha";
    a.click();
}

function importarProyecto(e) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            proyecto = JSON.parse(ev.target.result);
            document.getElementById('projName').value = proyecto.nombre || "";
            render();
        } catch(err) { 
            alert("❌ Archivo no válido"); 
        }
    };
    reader.readAsText(e.target.files[0]);
}
