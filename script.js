/**
 * ALPHA COLOR SYSTEM - v10.5
 * GENERADOR CMYK DESDE MUESTRA FÍSICA
 * CONVERSIÓN LCH → CMYK REALISTA
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
// GENERADOR DE CMYK BASADO EN LCH (VERSIÓN REALISTA)
// ============================================

function generarCMYKdesdeLCH(L, C, H) {
    // Validar que los valores existan
    if (isNaN(L) || isNaN(C) || isNaN(H)) {
        return { C: 0, M: 0, Y: 0, K: 0 };
    }
    
    // Asegurar rangos
    L = Math.min(100, Math.max(0, L));
    C = Math.max(0, C);
    H = Math.min(360, Math.max(0, H));
    
    // ============================================
    // PASO 1: CALCULAR K (NEGRO) BASADO EN LUMINOSIDAD
    // ============================================
    let K;
    if (L < 20) {
        // Muy oscuro (negros)
        K = 95 - (L * 0.5);
    } else if (L < 50) {
        // Oscuros
        K = 80 - ((L - 20) * 1.2);
    } else {
        // Claros
        K = 50 - ((L - 50) * 1.5);
        K = Math.max(0, K);
    }
    K = Math.min(95, Math.max(0, Math.round(K)));
    
    // ============================================
    // PASO 2: CALCULAR CMY BASADO EN TONO Y CROMA
    // ============================================
    
    // Escalar el croma a porcentajes CMYK realistas
    const factorCroma = Math.min(1, C / 100) * 1.2;
    
    let cian = 0, magenta = 0, amarillo = 0;
    
    // Distribución según tono (H)
    // Rojos (0-60°)
    if (H >= 0 && H < 60) {
        const factor = H / 60;
        magenta = Math.round(90 * factorCroma * (0.9 + 0.1 * Math.sin(factor * Math.PI)));
        amarillo = Math.round(85 * factorCroma * (0.8 + 0.2 * Math.cos(factor * Math.PI)));
        cian = Math.round(20 * factorCroma * (1 - factor * 0.5));
    }
    // Amarillos (60-120°)
    else if (H >= 60 && H < 120) {
        const factor = (H - 60) / 60;
        amarillo = Math.round(90 * factorCroma * (0.9 + 0.1 * Math.sin(factor * Math.PI)));
        magenta = Math.round(40 * factorCroma * (0.8 - factor * 0.3));
        cian = Math.round(30 * factorCroma * (0.5 + factor * 0.3));
    }
    // Verdes (120-180°)
    else if (H >= 120 && H < 180) {
        const factor = (H - 120) / 60;
        cian = Math.round(85 * factorCroma * (0.8 + 0.2 * Math.sin(factor * Math.PI)));
        amarillo = Math.round(80 * factorCroma * (0.7 + 0.3 * Math.cos(factor * Math.PI)));
        magenta = Math.round(30 * factorCroma * (0.7 - factor * 0.4));
    }
    // Cianes (180-240°)
    else if (H >= 180 && H < 240) {
        const factor = (H - 180) / 60;
        cian = Math.round(90 * factorCroma * (0.9 + 0.1 * Math.cos(factor * Math.PI)));
        magenta = Math.round(40 * factorCroma * (0.4 + factor * 0.3));
        amarillo = Math.round(35 * factorCroma * (0.4 + factor * 0.2));
    }
    // Azules (240-300°)
    else if (H >= 240 && H < 300) {
        const factor = (H - 240) / 60;
        cian = Math.round(85 * factorCroma * (0.8 + 0.2 * Math.sin(factor * Math.PI)));
        magenta = Math.round(75 * factorCroma * (0.7 + 0.3 * Math.cos(factor * Math.PI)));
        amarillo = Math.round(25 * factorCroma * (0.5 - factor * 0.2));
    }
    // Magentas (300-360°)
    else {
        const factor = (H - 300) / 60;
        magenta = Math.round(90 * factorCroma * (0.9 + 0.1 * Math.sin(factor * Math.PI)));
        cian = Math.round(45 * factorCroma * (0.5 + factor * 0.3));
        amarillo = Math.round(35 * factorCroma * (0.4 + factor * 0.2));
    }
    
    // ============================================
    // PASO 3: AJUSTAR POR BAJA LUMINOSIDAD (NEGROS RICOS)
    // ============================================
    if (L < 30) {
        // Para colores muy oscuros, aumentar CMY para crear negros ricos
        const factorOscuro = (30 - L) / 30;
        cian = Math.min(100, cian + Math.round(40 * factorOscuro));
        magenta = Math.min(100, magenta + Math.round(30 * factorOscuro));
        amarillo = Math.min(100, amarillo + Math.round(30 * factorOscuro));
    }
    
    // ============================================
    // PASO 4: NORMALIZAR Y GARANTIZAR RANGOS
    // ============================================
    cian = Math.min(100, Math.max(0, Math.round(cian)));
    magenta = Math.min(100, Math.max(0, Math.round(magenta)));
    amarillo = Math.min(100, Math.max(0, Math.round(amarillo)));
    K = Math.min(100, Math.max(0, K));
    
    // ============================================
    // PASO 5: AJUSTE DE CARGA TOTAL (evitar > 320%)
    // ============================================
    let cargaTotal = cian + magenta + amarillo + K;
    if (cargaTotal > 320) {
        const factor = 300 / cargaTotal;
        cian = Math.round(cian * factor);
        magenta = Math.round(magenta * factor);
        amarillo = Math.round(amarillo * factor);
        K = Math.round(K * factor);
    }
    
    return { C: cian, M: magenta, Y: amarillo, K };
}

// ============================================
// GENERAR CMYK CORREGIDO (OBJETIVO VS MUESTRA)
// ============================================

function generarCMYKcorregido(cmykMuestra, dL, da, db) {
    const corregido = { ...cmykMuestra };
    
    // Aplicar correcciones basadas en diferencias LAB
    if (da > 0.5) {
        // Exceso de rojo → reducir magenta
        corregido.M = Math.max(0, corregido.M - 3);
    }
    if (da < -0.5) {
        // Falta rojo → aumentar magenta
        corregido.M = Math.min(100, corregido.M + 3);
    }
    
    if (db > 0.5) {
        // Exceso amarillo → reducir amarillo
        corregido.Y = Math.max(0, corregido.Y - 3);
    }
    if (db < -0.5) {
        // Exceso azul → aumentar amarillo
        corregido.Y = Math.min(100, corregido.Y + 3);
    }
    
    if (dL > 0.5) {
        // Muy claro → aumentar K
        corregido.K = Math.min(100, corregido.K + 3);
    }
    if (dL < -0.5) {
        // Muy oscuro → reducir K
        corregido.K = Math.max(0, corregido.K - 3);
    }
    
    return corregido;
}

// ============================================
// ACTUALIZAR VISTA CMYK
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
        
        // GENERAR CMYK DESDE LA MUESTRA FÍSICA (valores realistas)
        const cmykMuestra = generarCMYKdesdeLCH(mL, mC, mH);
        
        // GENERAR CMYK CORREGIDO (objetivo vs muestra)
        const cmykCorregido = generarCMYKcorregido(cmykMuestra, dL, da, db);
        
        // Actualizar vista con el CMYK de la muestra
        actualizarVistaCMYK(cmykMuestra);
        
        // Determinar tendencia
        const tendencia = determinarTendenciaCMC(da, db, dL);
        
        // Generar rutas con ambos CMYK
        const rutasUI = generarRutas(deltaE_cmc, dL, da, db, cmykMuestra, cmykCorregido);
        
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
// GENERAR RUTAS DE AJUSTE (CON AMBOS CMYK)
// ============================================
function generarRutas(cmc, dL, da, db, cmykMuestra, cmykCorregido) {
    const rutas = [];
    
    rutas.push({ texto: `📊 CMC: ${cmc.toFixed(2)}`, prioridad: 200, chequeado: false });
    
    // Mostrar CMYK de la muestra física
    rutas.push({ 
        texto: `🧪 CMYK MUESTRA: C:${cmykMuestra.C} M:${cmykMuestra.M} Y:${cmykMuestra.Y} K:${cmykMuestra.K}`, 
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
        texto: `🎯 CMYK CORREGIDO: C:${cmykCorregido.C} M:${cmykCorregido.M} Y:${cmykCorregido.Y} K:${cmykCorregido.K}`, 
        prioridad: 170, 
        chequeado: false 
    });
    
    return rutas.sort((a, b) => b.prioridad - a.prioridad).slice(0, 7);
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
            // Generar y mostrar CMYK de la muestra en tiempo real
            const cmykTemp = generarCMYKdesdeLCH(mL, mC, mH);
            actualizarVistaCMYK(cmykTemp);
        }
        
        const rL = getNum('rL');
        const rC = getNum('rC');
        const rH = getNum('rH');
        
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
        badge.innerHTML = '⚡ CMC l:2 c:1 - Generador CMYK desde muestra';
        badge.style.color = 'var(--accent)';
    } else if (formulaActual === 'cielab') {
        badge.innerHTML = '📐 CIELAB ΔE*ab - Generador CMYK desde muestra';
        badge.style.color = '#ffb74d';
    } else {
        badge.innerHTML = '🖨️ CIE94 - Generador CMYK desde muestra';
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
        const cmykCorregido = c.cmykCorregido ? 
            `<br><small class="sugerido">➤ C:${c.cmykCorregido.C} M:${c.cmykCorregido.M} Y:${c.cmykCorregido.Y} K:${c.cmykCorregido.K}</small>` : '';
        
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
