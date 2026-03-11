/**
 * ALPHA COLOR SYSTEM - v10.3
 * GENERADOR CMYK AUTOMÁTICO
 * MUESTRA FÓRMULA BASE Y AJUSTADA
 */

// ============================================
// VARIABLES GLOBALES
// ============================================
let proyecto = { nombre: "", colores: [] };
let editandoId = null;
let formulaActual = 'cmc';
let ultimoCMYK = { C: 0, M: 0, Y: 0, K: 0 };

// ============================================
// FUNCIONES DE CONVERSIÓN LCH ↔ LAB
// ============================================

function LCHaLAB(L, C, H) {
    // Validar rangos
    if (L < 0 || L > 100) throw new Error("L debe estar entre 0 y 100");
    if (C < 0) throw new Error("C no puede ser negativo");
    if (H < 0 || H > 360) throw new Error("H debe estar entre 0° y 360°");
    
    // Si C es 0, el ángulo es irrelevante, a y b son 0
    if (C === 0) {
        return { L, a: 0, b: 0 };
    }
    
    const hRad = H * Math.PI / 180;
    const a = C * Math.cos(hRad);
    const b = C * Math.sin(hRad);
    
    return { L, a, b };
}

function LABaLCH(L, a, b) {
    const C = Math.sqrt(a*a + b*b);
    let H = Math.atan2(b, a) * 180 / Math.PI;
    if (H < 0) H += 360;
    if (C === 0) H = 0; // Para neutros, el tono es 0
    
    return { L, C, H };
}

// ============================================
// GENERADOR DE CMYK BASADO EN LCH (CORREGIDO)
// ============================================

function generarCMYKdesdeLCH(refLCH, muestraLCH) {
    // Validar que los valores existan
    if (!refLCH || !muestraLCH) {
        return { C: 0, M: 0, Y: 0, K: 0 };
    }
    
    // Asegurar que L, C, H sean números
    const rL = isNaN(refLCH.L) ? 50 : Math.min(100, Math.max(0, refLCH.L));
    const rC = isNaN(refLCH.C) ? 0 : Math.max(0, refLCH.C);
    const rH = isNaN(refLCH.H) ? 0 : Math.min(360, Math.max(0, refLCH.H));
    
    const mL = isNaN(muestraLCH.L) ? 50 : Math.min(100, Math.max(0, muestraLCH.L));
    const mC = isNaN(muestraLCH.C) ? 0 : Math.max(0, muestraLCH.C);
    const mH = isNaN(muestraLCH.H) ? 0 : Math.min(360, Math.max(0, muestraLCH.H));
    
    // Convertir a LAB para cálculos
    let ref, muestra;
    try {
        ref = LCHaLAB(rL, rC, rH);
        muestra = LCHaLAB(mL, mC, mH);
    } catch (e) {
        // Si hay error, usar valores por defecto
        ref = { L: rL, a: 0, b: 0 };
        muestra = { L: mL, a: 0, b: 0 };
    }
    
    // Diferencias
    const dL = muestra.L - ref.L;
    const da = muestra.a - ref.a;
    const db = muestra.b - ref.b;
    
    // ============================================
    // CASO ESPECIAL: COLORES NEUTROS (C ≈ 0)
    // ============================================
    const esNeutro = rC < 1.0 || isNaN(rC) || rC === 0;
    
    if (esNeutro) {
        // Es un color neutro (gris o negro)
        let K = Math.round(100 - (rL * 0.9));
        K = Math.min(95, Math.max(0, K));
        
        // Ajustar por diferencia de luminosidad
        if (!isNaN(dL)) {
            if (dL < -2) K = Math.min(95, K + 5);  // Más oscuro
            if (dL > 2) K = Math.max(0, K - 5);    // Más claro
        }
        
        return { 
            C: 0, 
            M: 0, 
            Y: 0, 
            K: K 
        };
    }
    
    // ============================================
    // CASO NORMAL: COLORES CON CROMA > 0
    // ============================================
    
    // 1. Negro base (K) basado en luminosidad
    let K = Math.round(100 - (rL * 0.8));
    K = Math.min(95, Math.max(0, K));
    
    // 2. Croma (saturación) distribuido entre CMY
    const cromaTotal = rC;
    let C = 0, M = 0, Y = 0;
    
    // 3. Distribución según tono (H)
    const H = rH;
    
    // Rojos (0-60°)
    if (H >= 0 && H < 60) {
        const factor = H / 60;
        M = Math.round(cromaTotal * 0.9);
        Y = Math.round(cromaTotal * 0.7 * (1 - factor * 0.3));
        C = Math.round(cromaTotal * 0.1);
    }
    // Amarillos (60-120°)
    else if (H >= 60 && H < 120) {
        const factor = (H - 60) / 60;
        Y = Math.round(cromaTotal * 0.9);
        M = Math.round(cromaTotal * 0.3 * (1 - factor));
        C = Math.round(cromaTotal * 0.2);
    }
    // Verdes (120-180°)
    else if (H >= 120 && H < 180) {
        const factor = (H - 120) / 60;
        C = Math.round(cromaTotal * 0.8);
        Y = Math.round(cromaTotal * 0.7 * (1 - factor * 0.3));
        M = Math.round(cromaTotal * 0.1);
    }
    // Cianes (180-240°)
    else if (H >= 180 && H < 240) {
        const factor = (H - 180) / 60;
        C = Math.round(cromaTotal * 0.9);
        M = Math.round(cromaTotal * 0.2);
        Y = Math.round(cromaTotal * 0.2);
    }
    // Azules (240-300°)
    else if (H >= 240 && H < 300) {
        const factor = (H - 240) / 60;
        C = Math.round(cromaTotal * 0.8);
        M = Math.round(cromaTotal * 0.7);
        Y = Math.round(cromaTotal * 0.1);
    }
    // Magentas (300-360°)
    else {
        const factor = (H - 300) / 60;
        M = Math.round(cromaTotal * 0.9);
        C = Math.round(cromaTotal * 0.4 * (1 - factor * 0.5));
        Y = Math.round(cromaTotal * 0.2);
    }
    
    // 4. Ajuste por diferencias (da, db)
    if (!isNaN(da) && !isNaN(db)) {
        if (da < -2) M = Math.min(100, M + Math.round(Math.abs(da) * 2));
        if (da > 2) M = Math.max(0, M - Math.round(da * 2));
        
        if (db < -2) Y = Math.min(100, Y + Math.round(Math.abs(db) * 2));
        if (db > 2) Y = Math.max(0, Y - Math.round(db * 2));
    }
    
    // 5. Ajuste por luminosidad
    if (!isNaN(dL)) {
        if (dL < -2) K = Math.min(95, K + 5);
        if (dL > 2) K = Math.max(0, K - 5);
    }
    
    // 6. Normalizar y garantizar rangos (protección contra NaN)
    C = isNaN(C) || C < 0 ? 0 : Math.min(100, Math.round(C));
    M = isNaN(M) || M < 0 ? 0 : Math.min(100, Math.round(M));
    Y = isNaN(Y) || Y < 0 ? 0 : Math.min(100, Math.round(Y));
    K = isNaN(K) || K < 0 ? 0 : Math.min(100, Math.round(K));
    
    // 7. Ajuste de carga total (evitar > 280%)
    let cargaTotal = C + M + Y + K;
    if (cargaTotal > 280) {
        const factor = 260 / cargaTotal;
        C = Math.round(C * factor);
        M = Math.round(M * factor);
        Y = Math.round(Y * factor);
        K = Math.round(K * factor);
    }
    
    return { C, M, Y, K };
}

// ============================================
// ACTUALIZAR VISTA CMYK (CON PROTECCIÓN CONTRA NaN)
// ============================================
function actualizarVistaCMYK(cmyk) {
    // Asegurar que todos los valores sean números válidos
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
        
        // GENERAR CMYK AUTOMÁTICAMENTE
        const cmykGenerado = generarCMYKdesdeLCH(
            { L: rL, C: rC, H: rH },
            { L: mL, C: mC, H: mH }
        );
        
        actualizarVistaCMYK(cmykGenerado);
        
        // Determinar tendencia
        const tendencia = determinarTendenciaCMC(da, db, dL);
        
        // Generar rutas con fórmula base y ajustada
        const rutasUI = generarRutas(deltaE_cmc, dL, da, db, cmykGenerado);
        
        // Guardar registro
        const registro = {
            id: editandoId || Date.now(),
            nombre: nombre,
            de: deltaE_cielab.toFixed(2),
            cmc: deltaE_cmc.toFixed(2),
            cie94: deltaE_cie94.toFixed(2),
            tendencia: tendencia.nombre,
            clase: tendencia.clase,
            cmyk: cmykGenerado,
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
// GENERAR RUTAS DE AJUSTE (CON FÓRMULA COMPLETA)
// ============================================
function generarRutas(cmc, dL, da, db, cmyk) {
    const rutas = [];
    
    rutas.push({ texto: `📊 CMC: ${cmc.toFixed(2)}`, prioridad: 200, chequeado: false });
    
    // Copia del CMYK para aplicar ajustes
    const cmykAjustado = { ...cmyk };
    
    // Aplicar ajustes y generar mensajes
    if (da > 0.5) {
        const reduccion = Math.min(3, cmyk.M);
        cmykAjustado.M = Math.max(0, cmyk.M - reduccion);
        rutas.push({ 
            texto: `🔴 Exceso ROJO: Reducir M -${reduccion}% (${cmyk.M}% → ${cmykAjustado.M}%)`, 
            prioridad: 190, 
            chequeado: false 
        });
    }
    if (da < -0.5) {
        const aumento = Math.min(3, 100 - cmyk.M);
        cmykAjustado.M = Math.min(100, cmyk.M + aumento);
        rutas.push({ 
            texto: `🔴 Falta ROJO: Aumentar M +${aumento}% (${cmyk.M}% → ${cmykAjustado.M}%)`, 
            prioridad: 190, 
            chequeado: false 
        });
    }
    
    if (db > 0.5) {
        const reduccion = Math.min(3, cmyk.Y);
        cmykAjustado.Y = Math.max(0, cmyk.Y - reduccion);
        rutas.push({ 
            texto: `🟡 Exceso AMARILLO: Reducir Y -${reduccion}% (${cmyk.Y}% → ${cmykAjustado.Y}%)`, 
            prioridad: 185, 
            chequeado: false 
        });
    }
    if (db < -0.5) {
        const aumento = Math.min(3, 100 - cmyk.Y);
        cmykAjustado.Y = Math.min(100, cmyk.Y + aumento);
        rutas.push({ 
            texto: `🔵 Exceso AZUL: Aumentar Y +${aumento}% (${cmyk.Y}% → ${cmykAjustado.Y}%)`, 
            prioridad: 185, 
            chequeado: false 
        });
    }
    
    if (dL > 0.5) {
        const aumento = Math.min(3, 100 - cmyk.K);
        cmykAjustado.K = Math.min(100, cmyk.K + aumento);
        rutas.push({ 
            texto: `⚪ Muy CLARO: Aumentar K +${aumento}% (${cmyk.K}% → ${cmykAjustado.K}%)`, 
            prioridad: 180, 
            chequeado: false 
        });
    }
    if (dL < -0.5) {
        const reduccion = Math.min(3, cmyk.K);
        cmykAjustado.K = Math.max(0, cmyk.K - reduccion);
        rutas.push({ 
            texto: `⚫ Muy OSCURO: Reducir K -${reduccion}% (${cmyk.K}% → ${cmykAjustado.K}%)`, 
            prioridad: 180, 
            chequeado: false 
        });
    }
    
    // Mostrar fórmula original
    rutas.push({ 
        texto: `📐 CMYK BASE: C:${cmyk.C} M:${cmyk.M} Y:${cmyk.Y} K:${cmyk.K}`, 
        prioridad: 175, 
        chequeado: false 
    });
    
    // Mostrar fórmula ajustada
    rutas.push({ 
        texto: `🎯 CMYK AJUSTADO: C:${cmykAjustado.C} M:${cmykAjustado.M} Y:${cmykAjustado.Y} K:${cmykAjustado.K}`, 
        prioridad: 170, 
        chequeado: false 
    });
    
    return rutas.sort((a, b) => b.prioridad - a.prioridad).slice(0, 6);
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
        const rL = getNum('rL');
        const rC = getNum('rC');
        const rH = getNum('rH');
        const mL = getNum('mL');
        const mC = getNum('mC');
        const mH = getNum('mH');
        
        if (!isNaN(rL) && !isNaN(rC) && !isNaN(rH) && !isNaN(mL) && !isNaN(mC) && !isNaN(mH)) {
            // Validar rangos básicos
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
            
            // Generar y mostrar CMYK en tiempo real
            const cmykTemp = generarCMYKdesdeLCH(
                { L: rL, C: rC, H: rH },
                { L: mL, C: mC, H: mH }
            );
            actualizarVistaCMYK(cmykTemp);
        }
    } catch (e) {
        // Ignorar durante escritura
    }
}

function cambiarFormula() {
    const selector = document.getElementById('formulaSelector');
    if (!selector) return;
    
    formulaActual = selector.value;
    const badge = document.getElementById('formulaBadge');
    
    if (formulaActual === 'cmc') {
        badge.innerHTML = '⚡ CMC l:2 c:1 - Generador CMYK automático';
        badge.style.color = 'var(--accent)';
    } else if (formulaActual === 'cielab') {
        badge.innerHTML = '📐 CIELAB ΔE*ab - Generador CMYK automático';
        badge.style.color = '#ffb74d';
    } else {
        badge.innerHTML = '🖨️ CIE94 - Generador CMYK automático';
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
        const cmykActual = `C:${c.cmyk.C} M:${c.cmyk.M} Y:${c.cmyk.Y} K:${c.cmyk.K}`;
        
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
                <br><small class="actual">${cmykActual}</small>
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
    
    // Resetear barras CMYK
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
    
    actualizarVistaCMYK(c.cmyk);
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
    
    actualizarVistaCMYK(c.cmyk);
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
    proyecto.nombre = document.getElementById('projName').value || "Alpha_Generado";
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
