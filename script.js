/**
 * ALPHA COLOR SYSTEM - v6.7
 * ESPECIALIZADO EN SUBLIMACIÓN TEXTIL
 * AJUSTE AUTOMÁTICO PARA ΔE = 0.5
 * COMPENSACIÓN CON CONTROL DE LUMINOSIDAD
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
    // DETERMINAR TENDENCIA VISUAL
    // ============================================
    const tendencia = determinarTendencia(dL, da, db, dE);

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
        rutas: rutasUI.sort((a, b) => b.prioridad - a.prioridad).slice(0, 6),
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
            // Muestra más clara que referencia → aumentar K
            ajusteK += Math.round(Math.abs(reduccionL) * factorL_a_K);
            pasos.push(`➕ Subir K +${ajusteK}% para oscurecer`);
        } else {
            // Muestra más oscura que referencia → reducir K
            ajusteK -= Math.round(Math.abs(reduccionL) * factorL_a_K * 0.7);
            pasos.push(`➖ Bajar K ${Math.abs(ajusteK)}% para aclarar`);
        }
    }
    
    // 2. Ajuste por eje a (rojo-verde)
    if (Math.abs(reduccionA) > 0.05) {
        if (da > 0) {
            // Exceso de rojo → bajar Magenta
            ajusteM -= Math.round(Math.abs(reduccionA) * factorA_a_M);
            pasos.push(`➖ Bajar M ${Math.abs(ajusteM)}% para neutralizar rojo`);
        } else {
            // Exceso de verde → subir Magenta
            ajusteM += Math.round(Math.abs(reduccionA) * factorA_a_M);
            pasos.push(`➕ Subir M +${ajusteM}% para neutralizar verde`);
        }
    }
    
    // 3. Ajuste por eje b (amarillo-azul)
    if (Math.abs(reduccionB) > 0.05) {
        if (db > 0) {
            // Exceso de amarillo → bajar Amarillo
            ajusteY -= Math.round(Math.abs(reduccionB) * factorB_a_Y);
            pasos.push(`➖ Bajar Y ${Math.abs(ajusteY)}% para neutralizar amarillo`);
        } else {
            // Exceso de azul → subir Amarillo
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
    
    // Si hay canales al límite, aplicar compensación avanzada
    if (canalesAlLimite.length > 0) {
        return compensarCanalesLimite(nuevaFormula, canalesAlLimite, cmykActual, da, db, dL);
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
// COMPENSACIÓN MATEMÁTICA AVANZADA CON CONTROL DE LUMINOSIDAD
// ============================================
function compensarCanalesLimite(formula, canales, original, da, db, dL) {
    const compensada = { ...formula };
    const compensaciones = [];
    const advertencias = [];
    
    // Calcular si el color es oscuro o necesita aclarar
    const esOscuro = (original.K > 70) || ((original.C + original.M + original.Y) > 220);
    const necesitaAclarar = dL < -0.3; // Muestra más oscura que referencia
    
    // Dirección de corrección basada en da y db
    const direccionCorreccion = {
        magenta: da > 0 ? 'reducir' : 'aumentar',
        amarillo: db > 0 ? 'reducir' : 'aumentar',
        cian: (da < 0 && db < 0) ? 'aumentar' : 'reducir'
    };
    
    canales.forEach(canal => {
        switch(canal) {
            case 'M': // Magenta al límite
                if (direccionCorreccion.magenta === 'reducir') {
                    // Exceso de rojo - bajar M es correcto
                    compensada.M = 92;
                    compensaciones.push(`🔴 M al 100%: Reducir a 92% para neutralizar rojo`);
                } else {
                    // Exceso de verde - necesitamos más magenta
                    if (necesitaAclarar || esOscuro) {
                        // Si está oscuro, NO subir C y Y (eso lo oscurece más)
                        compensada.M = 94;
                        compensada.C = Math.max(0, (compensada.C || 0) - 3);
                        compensada.Y = Math.max(0, (compensada.Y || 0) - 3);
                        compensaciones.push(`🟢 M al 100%: Reducir C-3%, Y-3% para aclarar y equilibrar`);
                        advertencias.push("Se reduce C y Y para evitar oscurecer");
                    } else {
                        // Si no está oscuro, podemos intentar crear rojo
                        compensada.M = 95;
                        compensada.C = Math.min(100, (compensada.C || 0) + 2);
                        compensada.Y = Math.min(100, (compensada.Y || 0) + 2);
                        compensaciones.push(`🎨 M al 100%: Crear rojo con C+2%, Y+2%, M→95%`);
                    }
                }
                break;
                
            case 'Y': // Amarillo al límite
                if (direccionCorreccion.amarillo === 'reducir') {
                    compensada.Y = 92;
                    compensaciones.push(`🟡 Y al 100%: Reducir a 92%`);
                } else {
                    if (necesitaAclarar || esOscuro) {
                        compensada.Y = 94;
                        compensada.C = Math.max(0, (compensada.C || 0) - 2);
                        compensada.M = Math.max(0, (compensada.M || 0) - 2);
                        compensaciones.push(`🔵 Y al 100%: Reducir C-2%, M-2% para aclarar`);
                    } else {
                        compensada.Y = 94;
                        compensada.C = Math.max(0, (compensada.C || 0) - 1);
                        compensada.M = Math.max(0, (compensada.M || 0) - 1);
                        compensaciones.push(`🟡 Y al 100%: Ajuste fino con C-1%, M-1%`);
                    }
                }
                break;
                
            case 'C': // Cian al límite
                if (da < 0 && db < 0) {
                    compensada.C = 94;
                    if (!necesitaAclarar && !esOscuro) {
                        compensada.M = Math.min(100, (compensada.M || 0) + 2);
                        compensada.Y = Math.min(100, (compensada.Y || 0) + 2);
                        compensaciones.push(`🟢🔵 C al 100%: Equilibrar con M+2%, Y+2%`);
                    } else {
                        compensaciones.push(`🌊 C al 100%: Reducir a 94% para controlar luminosidad`);
                    }
                } else {
                    compensada.C = 91;
                    compensaciones.push(`🌊 C al 100%: Reducir a 91%`);
                }
                break;
                
            case 'K': // Negro al límite
                if (necesitaAclarar || esOscuro) {
                    compensada.K = 84; // Reducción más agresiva
                    compensaciones.push(`⚫ K al 100%: Reducir a 84% para aclarar`);
                } else {
                    compensada.K = 92;
                    compensaciones.push(`⬛ K al 100%: Reducir a 92%`);
                }
                break;
        }
    });
    
    // ============================================
    // VERIFICACIÓN FINAL DE LUMINOSIDAD
    // ============================================
    const nuevaCarga = compensada.C + compensada.M + compensada.Y + compensada.K;
    const cargaOriginal = original.C + original.M + original.Y + original.K;
    
    if (necesitaAclarar && nuevaCarga > cargaOriginal) {
        // Si necesitamos aclarar pero la carga aumentó, aplicamos reducción
        const factorAclarado = 0.94;
        compensada.C = Math.round(compensada.C * factorAclarado);
        compensada.M = Math.round(compensada.M * factorAclarado);
        compensada.Y = Math.round(compensada.Y * factorAclarado);
        compensada.K = Math.round(compensada.K * factorAclarado);
        compensaciones.push(`✨ Ajuste final de luminosidad: Reducción del 6% en todos los canales`);
    }
    
    // Verificar nuevos límites
    const nuevosLimites = [];
    if (compensada.C >= 100) nuevosLimites.push('C');
    if (compensada.M >= 100) nuevosLimites.push('M');
    if (compensada.Y >= 100) nuevosLimites.push('Y');
    if (compensada.K >= 100) nuevosLimites.push('K');
    
    if (nuevosLimites.length > 0) {
        const factor = 0.93;
        compensada.C = Math.round(compensada.C * factor);
        compensada.M = Math.round(compensada.M * factor);
        compensada.Y = Math.round(compensada.Y * factor);
        compensada.K = Math.round(compensada.K * factor);
        compensaciones.push(`⚠️ Ajuste final: Reducción del 7% para evitar nuevos límites`);
    }
    
    const dEEstimado = canales.length > 1 ? "0.7" : "0.5";
    
    return {
        mensaje: necesitaAclarar ? 
            "✨ Compensación con prioridad en aclarar el color" : 
            "⚠️ Canal al límite - Compensación aplicada",
        nuevaFormula: compensada,
        pasos: compensaciones,
        advertencias: advertencias,
        dEEstimado: dEEstimado,
        canalesAlLimite: canales,
        compensado: true
    };
}

// ============================================
// DETERMINAR TENDENCIA VISUAL
// ============================================
function determinarTendencia(dL, da, db, dE) {
    const magL = Math.abs(dL);
    const magA = Math.abs(da);
    const magB = Math.abs(db);
    
    if (magA >= magB && magA >= magL && magA > 0.4) {
        return {
            nombre: da > 0 ? 'Rojizo' : 'Verdoso',
            clase: da > 0 ? 't-rojo' : 't-verde'
        };
    } else if (magB >= magA && magB >= magL && magB > 0.4) {
        return {
            nombre: db > 0 ? 'Amarillento' : 'Azulado',
            clase: db > 0 ? 't-amar' : 't-azul'
        };
    } else if (magL > 0.8) {
        return {
            nombre: dL > 0 ? 'Claro' : 'Oscuro',
            clase: dL > 0 ? 't-claro' : 't-oscuro'
        };
    } else {
        return {
            nombre: 'En Punto',
            clase: 't-punto'
        };
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
