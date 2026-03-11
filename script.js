/**
 * ALPHA COLOR SYSTEM - v11.0
 * SISTEMA DE CALIBRACIÓN CON TABLA DE CONVERSIÓN
 * ESPECÍFICO PARA: MS JP4 + K-ONE + Feliz Schoeller 10g + Monti 210°C
 */

// ============================================
// VARIABLES GLOBALES
// ============================================
let proyecto = { nombre: "", colores: [] };
let editandoId = null;
let formulaActual = 'cmc';
let ultimoCMYK = { C: 0, M: 0, Y: 0, K: 0 };

// ============================================
// TABLA DE CALIBRACIÓN LAB → CMYK
// ============================================
// Esta tabla se llena con mediciones reales de tu combo
// Formato: { lab: { L, a, b }, cmyk: { C, M, Y, K } }
let tablaCalibracion = [
    // Ejemplos de puntos de calibración (debes reemplazar con tus mediciones reales)
    { lab: { L: 26.37, a: 19.46, b: 1.34 }, cmyk: { C: 85, M: 56, Y: 34, K: 100 } }, // Deep Maroon real
    { lab: { L: 25.97, a: 14.79, b: -0.23 }, cmyk: { C: 70, M: 45, Y: 30, K: 95 } },  // Variante
    { lab: { L: 30.00, a: 10.00, b: 5.00 }, cmyk: { C: 60, M: 35, Y: 25, K: 85 } },
    { lab: { L: 20.00, a: 5.00, b: 2.00 }, cmyk: { C: 40, M: 30, Y: 25, K: 95 } },
    { lab: { L: 50.00, a: 30.00, b: 10.00 }, cmyk: { C: 20, M: 80, Y: 70, K: 30 } },
    { lab: { L: 40.00, a: -20.00, b: 30.00 }, cmyk: { C: 80, M: 20, Y: 75, K: 25 } },
];

// ============================================
// FUNCIÓN DE INTERPOLACIÓN LAB → CMYK
// ============================================

function distanciaLAB(lab1, lab2) {
    return Math.sqrt(
        Math.pow(lab1.L - lab2.L, 2) +
        Math.pow(lab1.a - lab2.a, 2) +
        Math.pow(lab1.b - lab2.b, 2)
    );
}

function cmykDesdeLABporTabla(L, a, b) {
    if (tablaCalibracion.length === 0) {
        // Si no hay datos de calibración, usar valores por defecto
        return { C: 0, M: 0, Y: 0, K: 85 };
    }
    
    const puntoBuscado = { L, a, b };
    
    // Calcular distancias a todos los puntos de calibración
    const puntosConDistancia = tablaCalibracion.map(p => ({
        ...p,
        distancia: distanciaLAB(puntoBuscado, p.lab)
    }));
    
    // Ordenar por distancia (menor distancia = más cercano)
    puntosConDistancia.sort((a, b) => a.distancia - b.distancia);
    
    // Tomar los 3 puntos más cercanos
    const puntosCercanos = puntosConDistancia.slice(0, 3);
    
    // Si el punto más cercano está muy cerca (ΔE < 2), usarlo directamente
    if (puntosCercanos[0].distancia < 2) {
        return { ...puntosCercanos[0].cmyk };
    }
    
    // Interpolación ponderada por distancia (inverso de la distancia)
    let pesoTotal = 0;
    let cmykInterpolado = { C: 0, M: 0, Y: 0, K: 0 };
    
    puntosCercanos.forEach(p => {
        // Evitar división por cero
        const peso = p.distancia < 0.01 ? 1000 : 1 / p.distancia;
        pesoTotal += peso;
        
        cmykInterpolado.C += p.cmyk.C * peso;
        cmykInterpolado.M += p.cmyk.M * peso;
        cmykInterpolado.Y += p.cmyk.Y * peso;
        cmykInterpolado.K += p.cmyk.K * peso;
    });
    
    // Normalizar
    cmykInterpolado.C = Math.round(cmykInterpolado.C / pesoTotal);
    cmykInterpolado.M = Math.round(cmykInterpolado.M / pesoTotal);
    cmykInterpolado.Y = Math.round(cmykInterpolado.Y / pesoTotal);
    cmykInterpolado.K = Math.round(cmykInterpolado.K / pesoTotal);
    
    return cmykInterpolado;
}

// ============================================
// FUNCIÓN PARA AGREGAR PUNTO DE CALIBRACIÓN
// ============================================

function agregarPuntoCalibracion(L, a, b, C, M, Y, K) {
    // Verificar si ya existe un punto cercano
    const existente = tablaCalibracion.find(p => 
        Math.abs(p.lab.L - L) < 0.5 && 
        Math.abs(p.lab.a - a) < 0.5 && 
        Math.abs(p.lab.b - b) < 0.5
    );
    
    if (existente) {
        // Actualizar el existente (promedio)
        existente.cmyk.C = Math.round((existente.cmyk.C + C) / 2);
        existente.cmyk.M = Math.round((existente.cmyk.M + M) / 2);
        existente.cmyk.Y = Math.round((existente.cmyk.Y + Y) / 2);
        existente.cmyk.K = Math.round((existente.cmyk.K + K) / 2);
        console.log("Punto de calibración actualizado");
    } else {
        // Agregar nuevo punto
        tablaCalibracion.push({
            lab: { L, a, b },
            cmyk: { C, M, Y, K }
        });
        console.log("Nuevo punto de calibración agregado");
    }
}

// ============================================
// FUNCIÓN PRINCIPAL (MODIFICADA)
// ============================================
function procesar() {
    const getNum = (id) => {
        const el = document.getElementById(id);
        if (!el || el.value.trim() === '') return NaN;
        return parseFloat(el.value);
    };

    // Leer LCH de referencia (objetivo)
    const rL = getNum('rL');
    const rC = getNum('rC');
    const rH = getNum('rH');
    
    // Leer LCH de muestra (física)
    const mL = getNum('mL');
    const mC = getNum('mC');
    const mH = getNum('mH');
    
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
        
        // ============================================
        // OBTENER CMYK DESDE TABLA DE CALIBRACIÓN
        // ============================================
        // Primero intentamos con la muestra (para el CMYK actual)
        const cmykMuestra = cmykDesdeLABporTabla(muestra.L, muestra.a, muestra.b);
        
        // Luego con la referencia (para el CMYK objetivo)
        const cmykObjetivo = cmykDesdeLABporTabla(ref.L, ref.a, ref.b);
        
        // Generar CMYK corregido basado en las diferencias
        const cmykCorregido = generarCMYKcorregido(cmykMuestra, dL, da, db);
        
        // Actualizar vista con el CMYK de la muestra
        actualizarVistaCMYK(cmykMuestra);
        
        // Determinar tendencia
        const tendencia = determinarTendenciaCMC(da, db, dL);
        
        // Generar rutas con ambos CMYK
        const rutasUI = generarRutas(deltaE_cmc, dL, da, db, cmykMuestra, cmykObjetivo, cmykCorregido);
        
        // Guardar registro
        const registro = {
            id: editandoId || Date.now(),
            nombre: nombre,
            de: deltaE_cielab.toFixed(2),
            cmc: deltaE_cmc.toFixed(2),
            cie94: deltaE_cie94.toFixed(2),
            tendencia: tendencia.nombre,
            clase: tendencia.clase,
            cmykMuestra: cmykMuestra,
            cmykObjetivo: cmykObjetivo,
            cmykCorregido: cmykCorregido,
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
// GENERAR RUTAS DE AJUSTE (CON TRES CMYK)
// ============================================
function generarRutas(cmc, dL, da, db, cmykMuestra, cmykObjetivo, cmykCorregido) {
    const rutas = [];
    
    rutas.push({ texto: `📊 CMC: ${cmc.toFixed(2)}`, prioridad: 200, chequeado: false });
    
    // Mostrar CMYK de la muestra física (basado en tabla)
    rutas.push({ 
        texto: `🧪 CMYK MUESTRA (tabla): C:${cmykMuestra.C} M:${cmykMuestra.M} Y:${cmykMuestra.Y} K:${cmykMuestra.K}`, 
        prioridad: 196, 
        chequeado: false 
    });
    
    // Mostrar CMYK objetivo (basado en tabla)
    rutas.push({ 
        texto: `🎯 CMYK OBJETIVO (tabla): C:${cmykObjetivo.C} M:${cmykObjetivo.M} Y:${cmykObjetivo.Y} K:${cmykObjetivo.K}`, 
        prioridad: 195, 
        chequeado: false 
    });
    
    // Mostrar correcciones
    if (da > 0.5) {
        const cambio = cmykCorregido.M - cmykMuestra.M;
        rutas.push({ 
            texto: `🔴 Exceso ROJO: ${cambio > 0 ? '+' : ''}${cambio}% M (${cmykMuestra.M}% → ${cmykCorregido.M}%)`, 
            prioridad: 190, 
            chequeado: false 
        });
    }
    if (da < -0.5) {
        const cambio = cmykCorregido.M - cmykMuestra.M;
        rutas.push({ 
            texto: `🔴 Falta ROJO: ${cambio > 0 ? '+' : ''}${cambio}% M (${cmykMuestra.M}% → ${cmykCorregido.M}%)`, 
            prioridad: 190, 
            chequeado: false 
        });
    }
    
    if (db > 0.5) {
        const cambio = cmykCorregido.Y - cmykMuestra.Y;
        rutas.push({ 
            texto: `🟡 Exceso AMARILLO: ${cambio > 0 ? '+' : ''}${cambio}% Y (${cmykMuestra.Y}% → ${cmykCorregido.Y}%)`, 
            prioridad: 185, 
            chequeado: false 
        });
    }
    if (db < -0.5) {
        const cambio = cmykCorregido.Y - cmykMuestra.Y;
        rutas.push({ 
            texto: `🔵 Exceso AZUL: ${cambio > 0 ? '+' : ''}${cambio}% Y (${cmykMuestra.Y}% → ${cmykCorregido.Y}%)`, 
            prioridad: 185, 
            chequeado: false 
        });
    }
    
    if (dL > 0.5) {
        const cambio = cmykCorregido.K - cmykMuestra.K;
        rutas.push({ 
            texto: `⚪ Muy CLARO: ${cambio > 0 ? '+' : ''}${cambio}% K (${cmykMuestra.K}% → ${cmykCorregido.K}%)`, 
            prioridad: 180, 
            chequeado: false 
        });
    }
    if (dL < -0.5) {
        const cambio = cmykCorregido.K - cmykMuestra.K;
        rutas.push({ 
            texto: `⚫ Muy OSCURO: ${cambio > 0 ? '+' : ''}${cambio}% K (${cmykMuestra.K}% → ${cmykCorregido.K}%)`, 
            prioridad: 180, 
            chequeado: false 
        });
    }
    
    // Mostrar CMYK corregido
    rutas.push({ 
        texto: `✨ CMYK CORREGIDO: C:${cmykCorregido.C} M:${cmykCorregido.M} Y:${cmykCorregido.Y} K:${cmykCorregido.K}`, 
        prioridad: 175, 
        chequeado: false 
    });
    
    return rutas.sort((a, b) => b.prioridad - a.prioridad).slice(0, 8);
}

// ============================================
// FUNCIÓN PARA AGREGAR CALIBRACIÓN DESDE RESULTADO
// ============================================
function agregarCalibracionDesdeActual(id) {
    const c = proyecto.colores.find(col => col.id == id);
    if (!c) return;
    
    // Usar el CMYK que SÍ funcionó (el corregido o el que el usuario apruebe)
    const cmykExitoso = c.cmykCorregido || c.cmykObjetivo;
    
    agregarPuntoCalibracion(
        c.lch.muestra.L,
        c.lch.muestra.C,
        c.lch.muestra.H,
        cmykExitoso.C,
        cmykExitoso.M,
        cmykExitoso.Y,
        cmykExitoso.K
    );
    
    alert("✅ Punto de calibración guardado. El sistema aprenderá de este acierto.");
}

// ============================================
// EXPORTAR TABLA DE CALIBRACIÓN
// ============================================
function exportarCalibracion() {
    const blob = new Blob([JSON.stringify(tablaCalibracion, null, 2)], {type: "application/json"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "calibracion_MSJP4_KONE_Feliz10g.json";
    a.click();
}

// ============================================
// IMPORTAR TABLA DE CALIBRACIÓN
// ============================================
function importarCalibracion(e) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            tablaCalibracion = JSON.parse(ev.target.result);
            alert(`✅ Tabla de calibración cargada con ${tablaCalibracion.length} puntos`);
        } catch(err) { 
            alert("❌ Archivo no válido"); 
        }
    };
    reader.readAsText(e.target.files[0]);
}

// ============================================
// FUNCIONES DE CONVERSIÓN LCH ↔ LAB
// ============================================

function LCHaLAB(L, C, H) {
    if (L < 0 || L > 100) throw new Error("L debe estar entre 0 y 100");
    if (C < 0) throw new Error("C no puede ser negativo");
    if (H < 0 || H > 360) throw new Error("H debe estar entre 0° y 360°");
    
    if (C === 0) {
        return { L, a: 0, b: 0 };
    }
    
    const hRad = H * Math.PI / 180;
    const a = C * Math.cos(hRad);
    const b = C * Math.sin(hRad);
    
    return { L, a, b };
}

// ============================================
// GENERAR CMYK CORREGIDO (basado en diferencias)
// ============================================

function generarCMYKcorregido(cmykMuestra, dL, da, db) {
    const corregido = { ...cmykMuestra };
    
    if (da > 0.5) corregido.M = Math.max(0, corregido.M - 3);
    if (da < -0.5) corregido.M = Math.min(100, corregido.M + 3);
    
    if (db > 0.5) corregido.Y = Math.max(0, corregido.Y - 3);
    if (db < -0.5) corregido.Y = Math.min(100, corregido.Y + 3);
    
    if (dL > 0.5) corregido.K = Math.min(100, corregido.K + 3);
    if (dL < -0.5) corregido.K = Math.max(0, corregido.K - 3);
    
    return corregido;
}

// ============================================
// ACTUALIZAR VISTA CMYK
// ============================================
function actualizarVistaCMYK(cmyk) {
    const C = isNaN(cmyk.C) ? 0 : Math.min(100, Math.max(0, Math.round(cmyk.C)));
    const M = isNaN(cmyk.M) ? 0 : Math.min(100, Math.max(0, Math.round(cmyk.M)));
    const Y = isNaN(cmyk.Y) ? 0 : Math.min(100, Math.max(0, Math.round(cmyk.Y)));
    const K = isNaN(cmyk.K) ? 0 : Math.min(100, Math.max(0, Math.round(cmyk.K)));
    
    document.getElementById('barC').style.width = `${C}%`;
    document.getElementById('barM').style.width = `${M}%`;
    document.getElementById('barY').style.width = `${Y}%`;
    document.getElementById('barK').style.width = `${K}%`;
    
    document.getElementById('valC').textContent = C;
    document.getElementById('valM').textContent = M;
    document.getElementById('valY').textContent = Y;
    document.getElementById('valK').textContent = K;
    
    const carga = C + M + Y + K;
    document.getElementById('cargaTotal').textContent = `Carga: ${carga}%`;
    
    ultimoCMYK = { C, M, Y, K };
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

function determinarTendenciaCMC(da, db, dL) {
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
// FUNCIONES DE INTERFAZ
// ============================================
function actualizarComparacion() {
    const getNum = (id) => {
        const el = document.getElementById(id);
        return el && el.value ? parseFloat(el.value) : NaN;
    };
    
    try {
        const mL = getNum('mL');
        const mC = getNum('mC');
        const mH = getNum('mH');
        
        if (!isNaN(mL) && !isNaN(mC) && !isNaN(mH)) {
            const muestraLAB = LCHaLAB(mL, mC, mH);
            const cmykTemp = cmykDesdeLABporTabla(muestraLAB.L, muestraLAB.a, muestraLAB.b);
            actualizarVistaCMYK(cmykTemp);
        }
        
        const rL = getNum('rL');
        const rC = getNum('rC');
        const rH = getNum('rH');
        
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
        badge.innerHTML = '⚡ CMC l:2 c:1 - Con tabla de calibración';
        badge.style.color = 'var(--accent)';
    } else if (formulaActual === 'cielab') {
        badge.innerHTML = '📐 CIELAB ΔE*ab - Con tabla de calibración';
        badge.style.color = '#ffb74d';
    } else {
        badge.innerHTML = '🖨️ CIE94 - Con tabla de calibración';
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
        const cmykMuestra = `C:${c.cmykMuestra.C} M:${c.cmykMuestra.M} Y:${c.cmykMuestra.Y} K:${c.cmykMuestra.K}`;
        const cmykObjetivo = c.cmykObjetivo ? 
            `<br><small>🎯 C:${c.cmykObjetivo.C} M:${c.cmykObjetivo.M} Y:${c.cmykObjetivo.Y} K:${c.cmykObjetivo.K}</small>` : '';
        const cmykCorregido = c.cmykCorregido ? 
            `<br><small class="sugerido">✨ C:${c.cmykCorregido.C} M:${c.cmykCorregido.M} Y:${c.cmykCorregido.Y} K:${c.cmykCorregido.K}</small>` : '';
        
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
                <br><small class="actual">${cmykMuestra}</small>
                ${cmykObjetivo}
                ${cmykCorregido}
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
                <button class="btn btn-aplicar" onclick="aplicarSugerencia(${colorId})">USAR</button>
                <button class="btn btn-cal" onclick="agregarCalibracionDesdeActual(${colorId})">✅ CAL</button>
            </td>
        </tr>`}).join('');
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================
function limpiarCamposNuevo() {
    editandoId = null;
    document.getElementById('btnProcesar').innerText = "CALCULAR";
    const ids = ['rL','rC','rH','mName','mL','mC','mH'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    
    actualizarVistaCMYK({ C: 0, M: 0, Y: 0, K: 0 });
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
    
    actualizarVistaCMYK(c.cmykMuestra);
    document.getElementById('btnProcesar').innerText = "ACTUALIZAR";
    window.scrollTo(0,0);
}

function aplicarSugerencia(id) {
    const c = proyecto.colores.find(col => col.id == id);
    if (!c) return;
    
    document.getElementById('rL').value = c.lch.ref.L;
    document.getElementById('rC').value = c.lch.ref.C;
    document.getElementById('rH').value = c.lch.ref.H;
    document.getElementById('mL').value = c.lch.muestra.L;
    document.getElementById('mC').value = c.lch.muestra.C;
    document.getElementById('mH').value = c.lch.muestra.H;
    document.getElementById('mName').value = c.nombre;
    
    actualizarVistaCMYK(c.cmykMuestra);
    alert("✅ Valores cargados. Puedes recalcular si es necesario.");
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
    proyecto.nombre = document.getElementById('projName').value || "Alpha_Calibrado";
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
            }
            document.getElementById('projName').value = proyecto.nombre || "";
            render();
            alert(`✅ Proyecto cargado con ${tablaCalibracion.length} puntos de calibración`);
        } catch(err) { 
            alert("❌ Archivo no válido"); 
        }
    };
    reader.readAsText(e.target.files[0]);
}

// Hacer funciones globales
window.agregarCalibracionDesdeActual = agregarCalibracionDesdeActual;
window.exportarCalibracion = exportarCalibracion;
window.importarCalibracion = importarCalibracion;
