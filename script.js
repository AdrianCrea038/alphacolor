/**
 * ALPHA COLOR SYSTEM - v12.0
 * MODO MANUAL CON CALIBRACIÓN
 * Tú pones el CMYK que funciona, el sistema aprende
 */

// ============================================
// VARIABLES GLOBALES
// ============================================
let proyecto = { nombre: "", colores: [] };
let editandoId = null;
let formulaActual = 'cmc';

// ============================================
// TABLA DE CALIBRACIÓN
// ============================================
let tablaCalibracion = [];

// ============================================
// FUNCIONES DE CONVERSIÓN LCH ↔ LAB
// ============================================

function LCHaLAB(L, C, H) {
    if (L < 0 || L > 100) throw new Error("L debe estar entre 0 y 100");
    if (C < 0) throw new Error("C no puede ser negativo");
    if (H < 0 || H > 360) throw new Error("H debe estar entre 0° y 360°");
    
    if (C === 0) return { L, a: 0, b: 0 };
    
    const hRad = H * Math.PI / 180;
    return {
        L,
        a: C * Math.cos(hRad),
        b: C * Math.sin(hRad)
    };
}

// ============================================
// GUARDAR PUNTO DE CALIBRACIÓN MANUAL
// ============================================
function guardarCalibracionManual() {
    const getNum = (id) => {
        const el = document.getElementById(id);
        return el && el.value ? parseFloat(el.value) : NaN;
    };

    const mL = getNum('mL');
    const mC = getNum('mC');
    const mH = getNum('mH');
    const cC = getNum('cC');
    const cM = getNum('cM');
    const cY = getNum('cY');
    const cK = getNum('cK');

    if (isNaN(mL) || isNaN(mC) || isNaN(mH)) {
        alert("❌ Primero ingresa los valores LCH de la muestra");
        return;
    }

    if (isNaN(cC) || isNaN(cM) || isNaN(cY) || isNaN(cK)) {
        alert("❌ Ingresa los valores CMYK que SÍ funcionaron");
        return;
    }

    // Verificar si ya existe un punto cercano
    const existente = tablaCalibracion.find(p => 
        Math.abs(p.lab.L - mL) < 1 && 
        Math.abs(p.lab.C - mC) < 2 && 
        Math.abs(p.lab.H - mH) < 5
    );

    if (existente) {
        if (confirm("Ya existe un punto cercano. ¿Actualizar con este nuevo valor?")) {
            existente.cmyk.C = cC;
            existente.cmyk.M = cM;
            existente.cmyk.Y = cY;
            existente.cmyk.K = cK;
        }
    } else {
        tablaCalibracion.push({
            lab: { L: mL, C: mC, H: mH },
            cmyk: { C: cC, M: cM, Y: cY, K: cK }
        });
    }

    document.getElementById('puntosCalibracion').textContent = tablaCalibracion.length;
    alert(`✅ Punto guardado. Total: ${tablaCalibracion.length} puntos`);
}

// ============================================
// BUSCAR CMYK EN TABLA DE CALIBRACIÓN
// ============================================
function buscarCMYKenTabla(L, C, H) {
    if (tablaCalibracion.length === 0) return null;

    // Calcular distancia a cada punto
    const puntos = tablaCalibracion.map(p => {
        const dist = Math.sqrt(
            Math.pow(p.lab.L - L, 2) +
            Math.pow(p.lab.C - C, 2) +
            Math.pow(p.lab.H - H, 2)
        );
        return { ...p, distancia: dist };
    });

    // Ordenar por distancia
    puntos.sort((a, b) => a.distancia - b.distancia);

    // Si el más cercano está muy cerca, usarlo
    if (puntos[0].distancia < 5) {
        return puntos[0].cmyk;
    }

    return null;
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================
function procesar() {
    const getNum = (id) => {
        const el = document.getElementById(id);
        if (!el || el.value.trim() === '') return NaN;
        return parseFloat(el.value);
    };

    // Leer LCH
    const rL = getNum('rL');
    const rC = getNum('rC');
    const rH = getNum('rH');
    const mL = getNum('mL');
    const mC = getNum('mC');
    const mH = getNum('mH');
    
    // Leer CMYK manual
    const cC = getNum('cC') || 0;
    const cM = getNum('cM') || 0;
    const cY = getNum('cY') || 0;
    const cK = getNum('cK') || 0;
    
    const nombre = document.getElementById('mName')?.value || "Muestra";

    if (isNaN(rL) || isNaN(rC) || isNaN(rH) || isNaN(mL) || isNaN(mC) || isNaN(mH)) {
        alert("❌ Completa TODOS los campos LCH");
        return;
    }

    try {
        // Validar rangos
        if (rL < 0 || rL > 100) throw new Error("L de referencia debe estar entre 0 y 100");
        if (mL < 0 || mL > 100) throw new Error("L de muestra debe estar entre 0 y 100");
        if (rC < 0) throw new Error("C de referencia no puede ser negativo");
        if (mC < 0) throw new Error("C de muestra no puede ser negativo");
        if (rH < 0 || rH > 360) throw new Error("H de referencia debe estar entre 0° y 360°");
        if (mH < 0 || mH > 360) throw new Error("H de muestra debe estar entre 0° y 360°");
        
        // Convertir a LAB
        const ref = LCHaLAB(rL, rC, rH);
        const muestra = LCHaLAB(mL, mC, mH);
        
        // Diferencias
        const dL = muestra.L - ref.L;
        const da = muestra.a - ref.a;
        const db = muestra.b - ref.b;
        
        // Calcular ΔE
        const deltaE_cielab = Math.sqrt(dL*dL + da*da + db*db);
        const deltaE_cmc = calcularCMC(ref.L, ref.a, ref.b, muestra.L, muestra.a, muestra.b);
        const deltaE_cie94 = calcularCIE94(ref.L, ref.a, ref.b, muestra.L, muestra.a, muestra.b);
        
        // CMYK manual (el que el usuario ingresó)
        const cmykManual = { C: cC, M: cM, Y: cY, K: cK };
        
        // Buscar en tabla de calibración
        const cmykCalibracion = buscarCMYKenTabla(mL, mC, mH);
        
        // Generar rutas
        const rutasUI = generarRutas(deltaE_cmc, dL, da, db, cmykManual, cmykCalibracion);
        
        // Guardar registro
        const registro = {
            id: editandoId || Date.now(),
            nombre: nombre,
            de: deltaE_cielab.toFixed(2),
            cmc: deltaE_cmc.toFixed(2),
            cie94: deltaE_cie94.toFixed(2),
            tendencia: determinarTendencia(da, db, dL).nombre,
            clase: determinarTendencia(da, db, dL).clase,
            cmykManual: cmykManual,
            cmykCalibracion: cmykCalibracion,
            rutas: rutasUI,
            lch: { ref: { L: rL, C: rC, H: rH }, muestra: { L: mL, C: mC, H: mH } },
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
        alert(`❌ ${error.message}`);
    }
}

// ============================================
// GENERAR RUTAS
// ============================================
function generarRutas(cmc, dL, da, db, cmykManual, cmykCalibracion) {
    const rutas = [];
    
    rutas.push({ texto: `📊 CMC: ${cmc.toFixed(2)}`, prioridad: 200, chequeado: false });
    
    // Mostrar CMYK manual
    rutas.push({ 
        texto: `✏️ CMYK MANUAL: C:${cmykManual.C} M:${cmykManual.M} Y:${cmykManual.Y} K:${cmykManual.K}`, 
        prioridad: 190, 
        chequeado: false 
    });
    
    // Mostrar calibración si existe
    if (cmykCalibracion) {
        rutas.push({ 
            texto: `📚 CMYK CALIBRADO: C:${cmykCalibracion.C} M:${cmykCalibracion.M} Y:${cmykCalibracion.Y} K:${cmykCalibracion.K}`, 
            prioridad: 185, 
            chequeado: false 
        });
    }
    
    // Mostrar correcciones
    if (da > 0.5) rutas.push({ texto: `🔴 Exceso ROJO: Reducir M -3%`, prioridad: 180, chequeado: false });
    if (da < -0.5) rutas.push({ texto: `🔴 Falta ROJO: Aumentar M +3%`, prioridad: 180, chequeado: false });
    
    if (db > 0.5) rutas.push({ texto: `🟡 Exceso AMARILLO: Reducir Y -3%`, prioridad: 175, chequeado: false });
    if (db < -0.5) rutas.push({ texto: `🔵 Exceso AZUL: Aumentar Y +3%`, prioridad: 175, chequeado: false });
    
    if (dL > 0.5) rutas.push({ texto: `⚪ Muy CLARO: Aumentar K +3%`, prioridad: 170, chequeado: false });
    if (dL < -0.5) rutas.push({ texto: `⚫ Muy OSCURO: Reducir K -3%`, prioridad: 170, chequeado: false });
    
    return rutas.sort((a, b) => b.prioridad - a.prioridad).slice(0, 6);
}

// ============================================
// DETERMINAR TENDENCIA
// ============================================
function determinarTendencia(da, db, dL) {
    if (da > 0.5 && db > 0.5) return { nombre: 'Rojizo/Amarillento', clase: 't-rojo' };
    if (da > 0.5 && db < -0.5) return { nombre: 'Rojizo/Azulado', clase: 't-rojo' };
    if (da < -0.5 && db > 0.5) return { nombre: 'Verdoso/Amarillento', clase: 't-verde' };
    if (da < -0.5 && db < -0.5) return { nombre: 'Verdoso/Azulado', clase: 't-verde' };
    if (da > 0.5) return { nombre: 'Rojizo', clase: 't-rojo' };
    if (da < -0.5) return { nombre: 'Verdoso', clase: 't-verde' };
    if (db > 0.5) return { nombre: 'Amarillento', clase: 't-amar' };
    if (db < -0.5) return { nombre: 'Azulado', clase: 't-azul' };
    if (dL > 1.0) return { nombre: 'Claro', clase: 't-claro' };
    if (dL < -1.0) return { nombre: 'Oscuro', clase: 't-oscuro' };
    return { nombre: 'En Punto', clase: 't-punto' };
}

// ============================================
// CÁLCULOS DE ΔE
// ============================================
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
    if (C1 === 0) h1 = 0;
    
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
// FUNCIONES DE INTERFAZ
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
            if (rL < 0 || rL > 100 || mL < 0 || mL > 100) return;
            if (rC < 0 || mC < 0) return;
            if (rH < 0 || rH > 360 || mH < 0 || mH > 360) return;
            
            const ref = LCHaLAB(rL, rC, rH);
            const muestra = LCHaLAB(mL, mC, mH);
            
            document.getElementById('deltaE_cielab').textContent = 
                Math.sqrt(Math.pow(muestra.L - ref.L, 2) + 
                         Math.pow(muestra.a - ref.a, 2) + 
                         Math.pow(muestra.b - ref.b, 2)).toFixed(2);
            document.getElementById('deltaE_cmc').textContent = 
                calcularCMC(ref.L, ref.a, ref.b, muestra.L, muestra.a, muestra.b).toFixed(2);
            document.getElementById('deltaE_cie94').textContent = 
                calcularCIE94(ref.L, ref.a, ref.b, muestra.L, muestra.a, muestra.b).toFixed(2);
        }
    } catch (e) {}
}

function cambiarFormula() {
    const selector = document.getElementById('formulaSelector');
    if (!selector) return;
    
    formulaActual = selector.value;
    const badge = document.getElementById('formulaBadge');
    
    if (formulaActual === 'cmc') {
        badge.innerHTML = '⚡ CMC l:2 c:1 - Modo Manual + Calibración';
        badge.style.color = 'var(--accent)';
    } else if (formulaActual === 'cielab') {
        badge.innerHTML = '📐 CIELAB ΔE*ab - Modo Manual + Calibración';
        badge.style.color = '#ffb74d';
    } else {
        badge.innerHTML = '🖨️ CIE94 - Modo Manual + Calibración';
        badge.style.color = '#4dabf7';
    }
    
    actualizarComparacion();
}

window.cambiarFormula = cambiarFormula;

// ============================================
// RENDERIZADO DE TABLA
// ============================================
function render() {
    const tbody = document.getElementById('cuerpoTabla');
    if (!tbody) return;
    
    tbody.innerHTML = proyecto.colores.map(c => {
        const colorId = JSON.stringify(c.id);
        const cmykManual = `C:${c.cmykManual.C} M:${c.cmykManual.M} Y:${c.cmykManual.Y} K:${c.cmykManual.K}`;
        const cmykCalibracion = c.cmykCalibracion ? 
            `<br><small class="calibrado">📚 C:${c.cmykCalibracion.C} M:${c.cmykCalibracion.M} Y:${c.cmykCalibracion.Y} K:${c.cmykCalibracion.K}</small>` : '';
        
        let colorCMC = '#51cf66';
        const cmcVal = parseFloat(c.cmc);
        if (cmcVal > 1.5) colorCMC = '#ff6b81';
        else if (cmcVal > 1.0) colorCMC = '#ffb74d';
        else if (cmcVal > 0.5) colorCMC = '#40e0d0';
        
        return `
        <tr>
            <td><small>${new Date(c.id).toLocaleTimeString()}</small></td>
            <td>
                <strong>${c.nombre}</strong>
                <br><small class="actual">✏️ ${cmykManual}</small>
                ${cmykCalibracion}
            </td>
            <td><b style="color: #888">${c.de}</b></td>
            <td><b style="color: ${colorCMC}">${c.cmc}</b></td>
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
                <button class="btn btn-cal" onclick="usarComoReferencia(${colorId})">📚 REF</button>
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
    document.getElementById('cC').value = c.cmykManual.C;
    document.getElementById('cM').value = c.cmykManual.M;
    document.getElementById('cY').value = c.cmykManual.Y;
    document.getElementById('cK').value = c.cmykManual.K;
    
    document.getElementById('btnProcesar').innerText = "ACTUALIZAR";
    window.scrollTo(0,0);
}

function usarComoReferencia(id) {
    const c = proyecto.colores.find(col => col.id == id);
    if (!c || !c.cmykManual) return;
    
    if (confirm("¿Guardar este CMYK como punto de calibración?")) {
        tablaCalibracion.push({
            lab: { L: c.lch.muestra.L, C: c.lch.muestra.C, H: c.lch.muestra.H },
            cmyk: { ...c.cmykManual }
        });
        document.getElementById('puntosCalibracion').textContent = tablaCalibracion.length;
        alert(`✅ Punto guardado. Total: ${tablaCalibracion.length}`);
    }
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

function exportarCalibracion() {
    const blob = new Blob([JSON.stringify(tablaCalibracion, null, 2)], {type: "application/json"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "calibracion_MSJP4_KONE.json";
    a.click();
}

function importarCalibracion(e) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            tablaCalibracion = JSON.parse(ev.target.result);
            document.getElementById('puntosCalibracion').textContent = tablaCalibracion.length;
            alert(`✅ Calibración cargada: ${tablaCalibracion.length} puntos`);
        } catch(err) { 
            alert("❌ Archivo no válido"); 
        }
    };
    reader.readAsText(e.target.files[0]);
}

function exportarProyecto() {
    proyecto.nombre = document.getElementById('projName').value || "Alpha_Proyecto";
    const proyectoCompleto = {
        ...proyecto,
        tablaCalibracion: tablaCalibracion
    };
    const blob = new Blob([JSON.stringify(proyectoCompleto, null, 2)], {type: "application/json"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = proyecto.nombre + ".alpha";
    a.click();
}

function importarProyecto(e) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            proyecto = { nombre: data.nombre || "", colores: data.colores || [] };
            if (data.tablaCalibracion) {
                tablaCalibracion = data.tablaCalibracion;
                document.getElementById('puntosCalibracion').textContent = tablaCalibracion.length;
            }
            document.getElementById('projName').value = proyecto.nombre || "";
            render();
        } catch(err) { 
            alert("❌ Archivo no válido"); 
        }
    };
    reader.readAsText(e.target.files[0]);
}

// Hacer funciones globales
window.guardarCalibracionManual = guardarCalibracionManual;
window.exportarCalibracion = exportarCalibracion;
window.importarCalibracion = importarCalibracion;
window.usarComoReferencia = usarComoReferencia;
