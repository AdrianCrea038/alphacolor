/**
 * ALPHA COLOR SYSTEM - v7.0
 * ESPECIALIZADO EN SUBLIMACIÓN TEXTIL
 * AJUSTE AUTOMÁTICO PARA ΔE = 0.5
 * INTERPRETACIÓN UNIVERSAL DE LAB PARA TODOS LOS COLORES
 */

// ============================================
// VARIABLES GLOBALES
// ============================================
let proyecto = { nombre: "", colores: [] };
let editandoId = null;

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

    // Leer LAB
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
    const dE = Math.sqrt(Math.pow(dL, 2) + Math.pow(da, 2) + Math.pow(db, 2));

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
    // DETERMINAR TENDENCIA VISUAL (CORREGIDA)
    // ============================================
    const tendencia = determinarTendenciaUniversal(da, db, dL);

    // ============================================
    // GENERAR RUTAS PARA UI
    // ============================================
    const rutasUI = [];

    // Mostrar ΔE actual y objetivo
    rutasUI.push({
        texto: `📊 ΔE actual: ${dE.toFixed(2)} | Objetivo: 0.5`,
        prioridad: 200,
        chequeado: false
    });

    // Mostrar diagnóstico LAB
    let diagnosticoLAB = [];
    if (da < -0.5) diagnosticoLAB.push(`🔴 Falta ROJO (da = ${da.toFixed(2)})`);
    if (da > 0.5) diagnosticoLAB.push(`🔴 Exceso ROJO (da = ${da.toFixed(2)})`);
    if (db < -0.5) diagnosticoLAB.push(`🔵 Exceso AZUL (db = ${db.toFixed(2)})`);
    if (db > 0.5) diagnosticoLAB.push(`🟡 Exceso AMARILLO (db = ${db.toFixed(2)})`);
    if (dL < -0.3) diagnosticoLAB.push(`⚫ Muy OSCURO (dL = ${dL.toFixed(2)})`);
    if (dL > 0.3) diagnosticoLAB.push(`⚪ Muy CLARO (dL = ${dL.toFixed(2)})`);
    
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
            texto: "✅ COLOR ÓPTIMO - Ya cumple ΔE ≤ 0.5",
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

    // Advertencia si hay canales al límite
    if (ajustePara05.canalesAlLimite && ajustePara05.canalesAlLimite.length > 0) {
        rutasUI.push({
            texto: `⚠️ Canales al límite: ${ajustePara05.canalesAlLimite.join(', ')} - Compensación aplicada`,
            prioridad: 155,
            chequeado: false
        });
    }

    // ============================================
    // GUARDAR REGISTRO
    // ============================================
    const registro = {
        id: editandoId || Date.now(),
        nombre: document.getElementById('mName').value || "Muestra",
        de: dE.toFixed(2),
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
// DETERMINAR TENDENCIA UNIVERSAL BASADA EN LAB
// ============================================
function determinarTendenciaUniversal(da, db, dL) {
    // Interpretación correcta de LAB
    const faltaRojo = da < -0.5;
    const sobraRojo = da > 0.5;
    const faltaAmarillo = db < -0.5; // equivalente a sobra azul
    const sobraAmarillo = db > 0.5;
    const muyOscuro = dL < -0.5;
    const muyClaro = dL > 0.5;
    
    // Determinar la tendencia principal
    if (faltaRojo && faltaAmarillo) {
        return { nombre: 'Azulado/Violeta', clase: 't-azul' };
    } else if (faltaRojo && sobraAmarillo) {
        return { nombre: 'Verdoso', clase: 't-verde' };
    } else if (sobraRojo && faltaAmarillo) {
        return { nombre: 'Rojizo', clase: 't-rojo' };
    } else if (sobraRojo && sobraAmarillo) {
        return { nombre: 'Amarillento', clase: 't-amar' };
    } else if (faltaRojo) {
        return { nombre: 'Verdoso', clase: 't-verde' };
    } else if (sobraRojo) {
        return { nombre: 'Rojizo', clase: 't-rojo' };
    } else if (faltaAmarillo) {
        return { nombre: 'Azulado', clase: 't-azul' };
    } else if (sobraAmarillo) {
        return { nombre: 'Amarillento', clase: 't-amar' };
    } else if (muyOscuro) {
        return { nombre: 'Oscuro', clase: 't-oscuro' };
    } else if (muyClaro) {
        return { nombre: 'Claro', clase: 't-claro' };
    } else {
        return { nombre: 'En Punto', clase: 't-punto' };
    }
}

// ============================================
// CALCULA LOS AJUSTES PARA ALCANZAR ΔE = 0.5
// ============================================
function calcularAjusteParaDelta05(rL, ra, rb, mL, ma, mb, cmykActual) {
    // Calcular diferencias actuales
    const dL = mL - rL;
    const da = ma - ra;
    const db = mb - rb;
    const dEActual = Math.sqrt(dL*dL + da*da + db*db);
    
    // Si ya está en 0.5 o menos, no hacer nada
    if (dEActual <= 0.5) {
        return {
            mensaje: "✓ El color ya está dentro de ΔE 0.5",
            ajustes: [],
            nuevaFormula: cmykActual,
            pasos: ["✓ Color óptimo - No requiere ajustes"],
            dEEstimado: dEActual.toFixed(2),
            canalesAlLimite: [],
            advertencias: []
        };
    }
    
    // Calcular factor de reducción necesario (para llegar a 0.5)
    const factorReduccion = 0.5 / dEActual;
    
    // Las diferencias objetivo después del ajuste
    const dL_objetivo = dL * factorReduccion;
    const da_objetivo = da * factorReduccion;
    const db_objetivo = db * factorReduccion;
    
    // Cuánto debemos reducir cada diferencia
    const reduccionL = dL - dL_objetivo;
    const reduccionA = da - da_objetivo;
    const reduccionB = db - db_objetivo;
    
    // ============================================
    // CONVERTIR REDUCCIONES LAB A AJUSTES CMYK
    // ============================================
    
    // Factores de conversión LAB → CMYK
    const factorL_a_K = 1.2;    // 1 unidad de L ≈ 1.2% de K
    const factorA_a_M = 1.5;    // 1 unidad de a ≈ 1.5% de Magenta
    const factorB_a_Y = 1.5;    // 1 unidad de b ≈ 1.5% de Amarillo
    
    // Calcular ajustes iniciales
    let ajusteC = 0, ajusteM = 0, ajusteY = 0, ajusteK = 0;
    const pasos = [];
    
    // 1. Ajuste por luminosidad (dL)
    if (Math.abs(reduccionL) > 0.05) {
        if (dL > 0) {
            ajusteK += Math.round(Math.abs(reduccionL) * factorL_a_K);
            pasos.push(`➕ Subir K +${ajusteK}% para oscurecer`);
        } else {
            ajusteK -= Math.round(Math.abs(reduccionL) * factorL_a_K * 0.7);
            pasos.push(`➖ Bajar K ${Math.abs(ajusteK)}% para aclarar`);
        }
    }
    
    // 2. Ajuste por eje a (rojo-verde)
    if (Math.abs(reduccionA) > 0.05) {
        if (da > 0) {
            ajusteM -= Math.round(Math.abs(reduccionA) * factorA_a_M);
            pasos.push(`➖ Bajar M ${Math.abs(ajusteM)}% para neutralizar rojo`);
        } else {
            ajusteM += Math.round(Math.abs(reduccionA) * factorA_a_M);
            pasos.push(`➕ Subir M +${ajusteM}% para neutralizar verde`);
        }
    }
    
    // 3. Ajuste por eje b (amarillo-azul)
    if (Math.abs(reduccionB) > 0.05) {
        if (db > 0) {
            ajusteY -= Math.round(Math.abs(reduccionB) * factorB_a_Y);
            pasos.push(`➖ Bajar Y ${Math.abs(ajusteY)}% para neutralizar amarillo`);
        } else {
            ajusteY += Math.round(Math.abs(reduccionB) * factorB_a_Y);
            pasos.push(`➕ Subir Y +${ajusteY}% para neutralizar azul`);
        }
    }
    
    // 4. Ajuste fino combinado
    if (Math.abs(da) > 0.3 && Math.abs(db) > 0.3) {
        if (da < 0 && db < 0) {
            ajusteC += Math.round((Math.abs(da) + Math.abs(db)) * 0.4);
            pasos.push(`➕ Subir C +${ajusteC}% por combinación verde+azul`);
        }
    }
    
    // ============================================
    // APLICAR AJUSTES A LA FÓRMULA ACTUAL
    // ============================================
    
    let nuevaFormula = {
        C: Math.min(100, Math.max(0, Math.round((cmykActual.C || 0) + ajusteC))),
        M: Math.min(100, Math.max(0, Math.round((cmykActual.M || 0) + ajusteM))),
        Y: Math.min(100, Math.max(0, Math.round((cmykActual.Y || 0) + ajusteY))),
        K: Math.min(100, Math.max(0, Math.round((cmykActual.K || 0) + ajusteK)))
    };
    
    // Verificar canales al límite
    const canalesAlLimite = [];
    if (nuevaFormula.C >= 100) canalesAlLimite.push('C');
    if (nuevaFormula.M >= 100) canalesAlLimite.push('M');
    if (nuevaFormula.Y >= 100) canalesAlLimite.push('Y');
    if (nuevaFormula.K >= 100) canalesAlLimite.push('K');
    
    // Si hay canales al límite, aplicar compensación universal
    if (canalesAlLimite.length > 0) {
        return compensarCanalesLimiteUniversal(nuevaFormula, canalesAlLimite, cmykActual, da, db, dL);
    }
    
    return {
        mensaje: `🎯 Ajuste calculado para ΔE objetivo: 0.5`,
        ajustes: { C: ajusteC, M: ajusteM, Y: ajusteY, K: ajusteK },
        nuevaFormula: nuevaFormula,
        pasos: pasos,
        dEEstimado: "0.5",
        canalesAlLimite: [],
        advertencias: []
    };
}

// ============================================
// COMPENSACIÓN UNIVERSAL BASADA EN LAB PARA TODOS LOS COLORES
// ============================================
function compensarCanalesLimiteUniversal(formula, canales, original, da, db, dL) {
    const compensada = { ...original };
    const compensaciones = [];
    const advertencias = [];
    
    // ============================================
    // 1. INTERPRETACIÓN UNIVERSAL DE LAB
    // ============================================
    const faltaRojo = da < -0.5;
    const sobraRojo = da > 0.5;
    const faltaAmarillo = db < -0.5; // equivalente a sobra azul
    const sobraAmarillo = db > 0.5;
    const necesitaAclarar = dL < -0.3 || original.K > 75 || (original.C + original.M + original.Y + original.K) > 260;
    
    // ============================================
    // 2. APLICAR AJUSTES POR CANAL (LÓGICA UNIVERSAL)
    // ============================================
    
    canales.forEach(canal => {
        switch(canal) {
            case 'M': // Magenta
                if (faltaRojo) {
                    // NECESITA MÁS MAGENTA pero está al límite
                    compensada.M = 96; // Mantener alto
                    compensada.C = Math.max(0, Math.round(original.C * 0.55)); // Reducir C 45%
                    compensada.Y = Math.max(0, Math.round(original.Y * 0.65)); // Reducir Y 35%
                    compensaciones.push(`🔴 FALTA ROJO: Mantener M en 96%, reducir C ${original.C}% → ${compensada.C}%, Y ${original.Y}% → ${compensada.Y}%`);
                } 
                else if (sobraRojo) {
                    // SOBRA ROJO - reducir M
                    compensada.M = Math.round(original.M * 0.88);
                    compensaciones.push(`🔴 EXCESO ROJO: Reducir M ${original.M}% → ${compensada.M}%`);
                }
                else {
                    // Neutro - reducción moderada
                    compensada.M = Math.round(original.M * 0.92);
                    compensaciones.push(`🎨 M al límite: Reducir a ${compensada.M}%`);
                }
                break;
                
            case 'C': // Cian
                if (faltaAmarillo) {
                    // SOBRA AZUL - reducir C
                    compensada.C = Math.max(0, Math.round(original.C * 0.6));
                    compensaciones.push(`🔵 EXCESO AZUL: Reducir C ${original.C}% → ${compensada.C}%`);
                } else if (faltaRojo) {
                    // FALTA ROJO - reducir C
                    compensada.C = Math.max(0, Math.round(original.C * 0.55));
                    compensaciones.push(`🌊 Para dar más ROJO: Reducir C ${original.C}% → ${compensada.C}%`);
                } else {
                    compensada.C = Math.max(0, Math.round(original.C * 0.75));
                    compensaciones.push(`🌊 C al límite: Reducir a ${compensada.C}%`);
                }
                break;
                
            case 'Y': // Amarillo
                if (faltaAmarillo) {
                    // FALTA AMARILLO (sobra azul) - mantener Y
                    compensada.Y = 94;
                    compensaciones.push(`🟡 FALTA AMARILLO: Mantener Y en 94%`);
                } else if (sobraAmarillo) {
                    // SOBRA AMARILLO - reducir Y
                    compensada.Y = Math.round(original.Y * 0.75);
                    compensaciones.push(`🟡 EXCESO AMARILLO: Reducir Y ${original.Y}% → ${compensada.Y}%`);
                } else {
                    compensada.Y = Math.round(original.Y * 0.85);
                    compensaciones.push(`🟡 Y al límite: Reducir a ${compensada.Y}%`);
                }
                break;
                
            case 'K': // Negro
                if (necesitaAclarar) {
                    compensada.K = Math.round(original.K * 0.7);
                    compensaciones.push(`⚫ MUY OSCURO: Reducir K ${original.K}% → ${compensada.K}%`);
                } else {
                    compensada.K = Math.round(original.K * 0.85);
                    compensaciones.push(`⬛ K al límite: Reducir a ${compensada.K}%`);
                }
                break;
        }
    });
    
    // ============================================
    // 3. AJUSTES ADICIONALES POR LUMINOSIDAD
    // ============================================
    if (necesitaAclarar) {
        compensada.C = Math.round(compensada.C * 0.9);
        compensada.Y = Math.round(compensada.Y * 0.9);
        compensada.K = Math.round(compensada.K * 0.9);
        compensaciones.push(`✨ ACLARAR: Reducción adicional del 10% en C, Y y K`);
    }
    
    // ============================================
    // 4. VERIFICAR CARGA TOTAL
    // ============================================
    const nuevaCarga = compensada.C + compensada.M + compensada.Y + compensada.K;
    
    if (nuevaCarga > 240) {
        const factor = 230 / nuevaCarga;
        compensada.C = Math.round(compensada.C * factor);
        compensada.M = Math.round(compensada.M * factor);
        compensada.Y = Math.round(compensada.Y * factor);
        compensada.K = Math.round(compensada.K * factor);
        compensaciones.push(`📊 AJUSTE CARGA: Reducción proporcional a 230% (desde ${Math.round(nuevaCarga)}%)`);
    }
    
    // ============================================
    // 5. GARANTIZAR VALORES EN RANGO
    // ============================================
    compensada.C = Math.min(100, Math.max(0, compensada.C));
    compensada.M = Math.min(100, Math.max(0, compensada.M));
    compensada.Y = Math.min(100, Math.max(0, compensada.Y));
    compensada.K = Math.min(100, Math.max(0, compensada.K));
    
    // ============================================
    // 6. DETERMINAR MENSAJE
    // ============================================
    let mensaje = "🎯 Compensación universal aplicada";
    if (faltaRojo) mensaje = "🎯 Compensación: Aumentando presencia de ROJO";
    if (faltaAmarillo) mensaje = "🎯 Compensación: Aumentando presencia de AMARILLO";
    if (sobraRojo) mensaje = "🎯 Compensación: Reduciendo exceso de ROJO";
    if (sobraAmarillo) mensaje = "🎯 Compensación: Reduciendo exceso de AMARILLO";
    
    return {
        mensaje: mensaje,
        nuevaFormula: compensada,
        pasos: compensaciones,
        advertencias: advertencias,
        dEEstimado: "0.6",
        canalesAlLimite: canales,
        compensado: true
    };
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
        
        // Determinar color del ΔE
        let colorDE = '#51cf66';
        if (parseFloat(c.de) > 2.0) colorDE = '#ff6b81';
        else if (parseFloat(c.de) > 1.0) colorDE = '#ffb74d';
        
        return `
        <tr>
            <td><small>${new Date(c.id).toLocaleTimeString()}</small></td>
            <td>
                <strong>${c.nombre}</strong>
                <br><small class="actual">${cmykActual}</small>
                ${cmykSugerido}
            </td>
            <td><b style="color: ${colorDE}">${c.de}</b></td>
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
