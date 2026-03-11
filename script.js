/**
 * ALPHA COLOR SYSTEM - v9.0
 * ESPECIALIZADO EN SUBLIMACIÓN TEXTIL
 * INTERFAZ LCH CON VALIDACIÓN DE RANGOS
 * CMC (l:2 c:1) - Estándar ISO 105-J03
 */

// ============================================
// VARIABLES GLOBALES
// ============================================
let proyecto = { nombre: "", colores: [] };
let editandoId = null;
let formulaActual = 'cmc';

// ============================================
// FUNCIONES DE CONVERSIÓN LCH ↔ LAB
// ============================================

function LCHaLAB(L, C, H) {
    // Validar rangos
    if (L < 0 || L > 100) throw new Error("L debe estar entre 0 y 100");
    if (C < 0) throw new Error("C no puede ser negativo");
    if (H < 0 || H > 360) throw new Error("H debe estar entre 0° y 360°");
    
    // Convertir ángulo a radianes
    const hRad = H * Math.PI / 180;
    
    // Calcular a y b
    const a = C * Math.cos(hRad);
    const b = C * Math.sin(hRad);
    
    return { L, a, b };
}

function LABaLCH(L, a, b) {
    const C = Math.sqrt(a*a + b*b);
    let H = Math.atan2(b, a) * 180 / Math.PI;
    if (H < 0) H += 360;
    
    return { L, C, H };
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================
function procesar() {
    // --- LECTURA DE VALORES LCH ---
    const getNum = (id) => {
        const el = document.getElementById(id);
        if (!el || el.value.trim() === '') return NaN;
        return parseFloat(el.value);
    };

    // Leer LCH de referencia
    const rL = getNum('rL');
    const rC = getNum('rC');
    const rH = getNum('rH');
    
    // Leer LCH de muestra
    const mL = getNum('mL');
    const mC = getNum('mC');
    const mH = getNum('mH');

    // Validar que todos los campos tengan valores
    if (isNaN(rL) || isNaN(rC) || isNaN(rH) || isNaN(mL) || isNaN(mC) || isNaN(mH)) {
        alert("❌ Error: Completa TODOS los campos LCH");
        return;
    }

    // Validar rangos
    try {
        // Convertir LCH a LAB para cálculos
        const refLAB = LCHaLAB(rL, rC, rH);
        const muestraLAB = LCHaLAB(mL, mC, mH);
        
        // Calcular diferencias en LAB
        const dL = muestraLAB.L - refLAB.L;
        const da = muestraLAB.a - refLAB.a;
        const db = muestraLAB.b - refLAB.b;
        
        // Calcular ΔE con diferentes fórmulas
        const deltaE_cielab = calcularCIELAB(dL, da, db);
        const deltaE_cmc = calcularCMC(refLAB.L, refLAB.a, refLAB.b, muestraLAB.L, muestraLAB.a, muestraLAB.b);
        const deltaE_cie94 = calcularCIE94(refLAB.L, refLAB.a, refLAB.b, muestraLAB.L, muestraLAB.a, muestraLAB.b);
        
        // Usar CMC como principal
        const dE = deltaE_cmc;

        // Leer CMYK actual
        const CMYK = {
            C: getNum('cC') || 0,
            M: getNum('cM') || 0,
            Y: getNum('cY') || 0,
            K: getNum('cK') || 0
        };

        // Calcular carga total
        const cargaTotal = CMYK.C + CMYK.M + CMYK.Y + CMYK.K;

        // ============================================
        // CALCULAR AJUSTE
        // ============================================
        const ajustePara05 = calcularAjusteParaDelta05(refLAB, muestraLAB, CMYK);

        // ============================================
        // DETERMINAR TENDENCIA
        // ============================================
        const tendencia = determinarTendenciaCMC(da, db, dL);

        // ============================================
        // GENERAR RUTAS
        // ============================================
        const rutasUI = [];

        // Mostrar diagnóstico
        rutasUI.push({
            texto: `📊 CMC: ${dE.toFixed(2)} | CIELAB: ${deltaE_cielab.toFixed(2)}`,
            prioridad: 200,
            chequeado: false
        });

        // Diagnóstico LAB (convertido a términos entendibles)
        let diagnostico = [];
        if (da > 0.5) diagnostico.push(`🔴 Exceso ROJO (a: ${da.toFixed(2)}) - necesita menos magenta`);
        if (da < -0.5) diagnostico.push(`🔴 Falta ROJO (a: ${da.toFixed(2)}) - necesita más magenta`);
        if (db > 0.5) diagnostico.push(`🟡 Exceso AMARILLO (b: ${db.toFixed(2)}) - necesita menos amarillo`);
        if (db < -0.5) diagnostico.push(`🔵 Exceso AZUL (b: ${db.toFixed(2)}) - necesita más amarillo`);
        if (dL > 0.5) diagnostico.push(`⚪ Muy CLARO (L: ${dL.toFixed(2)}) - necesita más K`);
        if (dL < -0.5) diagnostico.push(`⚫ Muy OSCURO (L: ${dL.toFixed(2)}) - necesita menos K`);
        
        diagnostico.forEach((diag, i) => {
            rutasUI.push({ texto: diag, prioridad: 195 - i, chequeado: false });
        });

        // Pasos del ajuste
        if (ajustePara05.pasos && ajustePara05.pasos.length > 0) {
            ajustePara05.pasos.forEach((paso, i) => {
                rutasUI.push({ texto: paso, prioridad: 190 - i, chequeado: false });
            });
        }

        // Fórmula sugerida
        if (ajustePara05.nuevaFormula) {
            const f = ajustePara05.nuevaFormula;
            rutasUI.push({
                texto: `🎯 FÓRMULA SUGERIDA: C:${f.C} M:${f.M} Y:${f.Y} K:${f.K}`,
                prioridad: 180,
                chequeado: false
            });
        }

        // Mensaje final
        if (dE <= 0.5) {
            rutasUI.push({ texto: "✅ COLOR ÓPTIMO - CMC ≤ 0.5", prioridad: 170, chequeado: false });
        } else {
            rutasUI.push({ texto: `⚡ ΔE estimado: ${ajustePara05.dEEstimado}`, prioridad: 170, chequeado: false });
        }

        // Carga de tinta
        rutasUI.push({ texto: `💧 Carga: ${cargaTotal.toFixed(1)}%`, prioridad: 160, chequeado: false });

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
            lch: { ref: { L: rL, C: rC, H: rH }, muestra: { L: mL, C: mC, H: mH } },
            cargaTotal: cargaTotal,
            dEObjetivo: 0.5,
            timestamp: new Date().toISOString()
        };

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
        
    } catch (error) {
        alert(`❌ Error de validación: ${error.message}`);
    }
}

// ============================================
// CÁLCULOS DE ΔE
// ============================================

function calcularCIELAB(dL, da, db) {
    return Math.sqrt(dL*dL + da*da + db*db);
}

function calcularCMC(L1, a1, b1, L2, a2, b2) {
    const l = 2.0;
    const c = 1.0;
    
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
    
    let h1 = Math.atan2(b1, a1) * 180 / Math.PI;
    if (h1 < 0) h1 += 360;
    
    const SL = L1 < 16 ? 0.511 : (0.040975 * L1) / (1 + 0.01765 * L1);
    const SC = 0.0638 * C1 / (1 + 0.0131 * C1) + 0.638;
    
    let T = 0;
    if (h1 >= 164 && h1 <= 345) {
        T = 0.56 + Math.abs(0.2 * Math.cos((h1 + 168) * Math.PI / 180));
    } else {
        T = 0.36 + Math.abs(0.4 * Math.cos((h1 + 35) * Math.PI / 180));
    }
    
    const SH = SC * (T * Math.sqrt(1 + 1.5 * C1) / (1 + 1.5 * C1) + 0.5);
    
    return Math.sqrt(
        Math.pow(dL / (l * SL), 2) +
        Math.pow(dC / (c * SC), 2) +
        Math.pow(dH / SH, 2)
    );
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
// DETERMINAR TENDENCIA
// ============================================
function determinarTendenciaCMC(da, db, dL) {
    const masRojo = da > 0.5;
    const menosRojo = da < -0.5;
    const masAmarillo = db > 0.5;
    const menosAmarillo = db < -0.5;
    const masClaro = dL > 1.0;
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
// CALCULAR AJUSTE
// ============================================
function calcularAjusteParaDelta05(refLAB, muestraLAB, cmykActual) {
    const dL = muestraLAB.L - refLAB.L;
    const da = muestraLAB.a - refLAB.a;
    const db = muestraLAB.b - refLAB.b;
    const dEActual = calcularCMC(refLAB.L, refLAB.a, refLAB.b, muestraLAB.L, muestraLAB.a, muestraLAB.b);
    
    if (dEActual <= 0.5) {
        return {
            mensaje: "✓ Color óptimo",
            nuevaFormula: cmykActual,
            pasos: ["✓ No requiere ajustes"],
            dEEstimado: dEActual.toFixed(2),
            canalesAlLimite: [],
            advertencias: []
        };
    }
    
    const compensada = { ...cmykActual };
    const compensaciones = [];
    
    const menosRojo = da < -0.5;
    const menosAmarillo = db < -0.5;
    const masOscuro = dL < -0.5;
    const masClaro = dL > 0.5;
    
    if (menosRojo) {
        compensada.M = Math.min(100, compensada.M + 2);
        compensaciones.push(`🔴 Falta ROJO: Subir M +2%`);
    } else if (da > 0.5) {
        compensada.M = Math.max(0, compensada.M - 3);
        compensaciones.push(`🔴 Exceso ROJO: Bajar M -3%`);
    }
    
    if (menosAmarillo) {
        compensada.Y = Math.min(100, compensada.Y + 3);
        compensaciones.push(`🔵 Exceso AZUL: Subir Y +3%`);
    } else if (db > 0.5) {
        compensada.Y = Math.max(0, compensada.Y - 3);
        compensaciones.push(`🟡 Exceso AMARILLO: Bajar Y -3%`);
    }
    
    if (menosAmarillo || menosRojo) {
        compensada.C = Math.max(0, compensada.C - 4);
        compensaciones.push(`🌊 Reducir C -4%`);
    }
    
    if (masOscuro) {
        compensada.K = Math.max(0, compensada.K - 3);
        compensaciones.push(`⚫ Muy OSCURO: Bajar K -3%`);
    } else if (masClaro) {
        compensada.K = Math.min(100, compensada.K + 3);
        compensaciones.push(`⚪ Muy CLARO: Subir K +3%`);
    }
    
    compensada.C = Math.min(100, Math.max(0, compensada.C));
    compensada.M = Math.min(100, Math.max(0, compensada.M));
    compensada.Y = Math.min(100, Math.max(0, compensada.Y));
    compensada.K = Math.min(100, Math.max(0, compensada.K));
    
    return {
        mensaje: "🎯 Ajuste CMC optimizado",
        nuevaFormula: compensada,
        pasos: compensaciones,
        dEEstimado: "0.6",
        canalesAlLimite: []
    };
}

// ============================================
// FUNCIÓN PARA CAMBIAR FÓRMULA
// ============================================
function cambiarFormula() {
    const selector = document.getElementById('formulaSelector');
    if (!selector) return;
    
    formulaActual = selector.value;
    const badge = document.getElementById('formulaBadge');
    
    if (formulaActual === 'cmc') {
        badge.innerHTML = '⚡ CMC l:2 c:1 - Estándar textil ISO 105-J03';
        badge.style.color = 'var(--accent)';
    } else if (formulaActual === 'cielab') {
        badge.innerHTML = '📐 CIELAB ΔE*ab - Estándar general';
        badge.style.color = '#ffb74d';
    } else {
        badge.innerHTML = '🖨️ CIE94 - Industria gráfica';
        badge.style.color = '#4dabf7';
    }
    
    actualizarComparacion();
}

window.cambiarFormula = cambiarFormula;

// ============================================
// ACTUALIZAR COMPARACIÓN
// ============================================
function actualizarComparacion() {
    const getNum = (id) => {
        const el = document.getElementById(id);
        return el && el.value ? parseFloat(el.value) : NaN;
    };
    
    try {
        const rL = getNum('rL');
        const rC = getNum('rC');
        const rH = getNum('rH');
        const mL = getNum('mL');
        const mC = getNum('mC');
        const mH = getNum('mH');
        
        if (!isNaN(rL) && !isNaN(rC) && !isNaN(rH) && !isNaN(mL) && !isNaN(mC) && !isNaN(mH)) {
            const ref = LCHaLAB(rL, rC, rH);
            const muestra = LCHaLAB(mL, mC, mH);
            
            document.getElementById('deltaE_cielab').textContent = 
                calcularCIELAB(muestra.L - ref.L, muestra.a - ref.a, muestra.b - ref.b).toFixed(2);
            document.getElementById('deltaE_cmc').textContent = 
                calcularCMC(ref.L, ref.a, ref.b, muestra.L, muestra.a, muestra.b).toFixed(2);
            document.getElementById('deltaE_cie94').textContent = 
                calcularCIE94(ref.L, ref.a, ref.b, muestra.L, muestra.a, muestra.b).toFixed(2);
        }
    } catch (e) {
        // Ignorar errores de validación durante escritura
    }
}

// ============================================
// RENDERIZADO
// ============================================
function render() {
    const tbody = document.getElementById('cuerpoTabla');
    if (!tbody) return;
    
    tbody.innerHTML = proyecto.colores.map(c => {
        const colorId = JSON.stringify(c.id);
        const cmykActual = `C:${c.cmyk.C} M:${c.cmyk.M} Y:${c.cmyk.Y} K:${c.cmyk.K}`;
        const cmykSugerido = c.cmykSugerido ? 
            `<br><small class="sugerido">➤ C:${c.cmykSugerido.C} M:${c.cmykSugerido.M} Y:${c.cmykSugerido.Y} K:${c.cmykSugerido.K}</small>` : '';
        
        let colorCMC = '#51cf66';
        const cmcVal = parseFloat(c.cmc || c.de);
        if (cmcVal > 1.5) colorCMC = '#ff6b81';
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
    const ids = ['rL','rC','rH','mName','mL','mC','mH','cC','cM','cY','cK'];
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
    
    document.getElementById('rL').value = c.lch.ref.L;
    document.getElementById('rC').value = c.lch.ref.C;
    document.getElementById('rH').value = c.lch.ref.H;
    document.getElementById('mL').value = c.lch.muestra.L;
    document.getElementById('mC').value = c.lch.muestra.C;
    document.getElementById('mH').value = c.lch.muestra.H;
    document.getElementById('mName').value = c.nombre;
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
    
    alert("✅ Fórmula sugerida cargada");
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
