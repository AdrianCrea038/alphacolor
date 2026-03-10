let proyecto = { nombre: "", colores: [] };
let editandoId = null;

function procesar() {
    const val = (id) => parseFloat(document.getElementById(id).value) || 0;
    
    const r1L = parseFloat(document.getElementById('r1L').value);
    const mL = parseFloat(document.getElementById('mL').value);
    if (isNaN(r1L) || isNaN(mL)) return alert("Faltan valores LAB de Referencia o Muestra");

    const r2L = parseFloat(document.getElementById('r2L').value);
    const fRefL = !isNaN(r2L) ? (r1L + r2L) / 2 : r1L;
    const fRefA = !isNaN(val('r2a')) ? (val('r1a') + val('r2a')) / 2 : val('r1a');
    const fRefB = !isNaN(val('r2b')) ? (val('r1b') + val('r2b')) / 2 : val('r1b');

    const ma = val('ma'), mb = val('mb');
    const dE = Math.sqrt(Math.pow(mL - fRefL, 2) + Math.pow(ma - fRefA, 2) + Math.pow(mb - fRefB, 2)).toFixed(2);
    const da = ma - fRefA; 
    const db = mb - fRefB;
    const dL = mL - fRefL;

    const CMYK = { C: val('cC'), M: val('cM'), Y: val('cY'), K: val('cK') };

    // --- LÓGICA DE RUTAS Y COMPENSACIÓN AL 100% ---
    let rutas = [];
    
    // Tendencia Visual
    let tendencia = "Color OK";
    let clase = "t-verde";
    if (Math.abs(da) > Math.abs(db)) {
        if (da > 0.4) { tendencia = "Rojizo"; clase = "t-rojo"; }
        else if (da < -0.4) { tendencia = "Verdoso"; clase = "t-verde"; }
    } else {
        if (db > 0.4) { tendencia = "Amarillento"; clase = "t-amar"; }
        else if (db < -0.4) { tendencia = "Azulado"; clase = "t-azul"; }
    }

    // Generar Rutas basadas en límites
    if (da > 0.4) { // Sobra Rojo (Falta Cyan)
        if (CMYK.C >= 100) {
            rutas.push("C al 100%: COMPENSAR Bajando Magenta -2% y Amarillo -1%");
        } else {
            rutas.push("Subir Cyan +1.5%");
        }
    } else if (da < -0.4) { // Sobra Verde (Falta Magenta)
        if (CMYK.M >= 100) {
            rutas.push("M al 100%: COMPENSAR Bajando Cyan -2%");
        } else {
            rutas.push("Subir Magenta +1.5%");
        }
    }

    if (db > 0.4) { // Sobra Amarillo (Bajar Amarillo)
        rutas.push("Bajar Amarillo -1.5%");
    } else if (db < -0.4) { // Sobra Azul (Falta Amarillo)
        if (CMYK.Y >= 100) {
            rutas.push("Y al 100%: COMPENSAR Bajando Magenta -1% y Cyan -1%");
        } else {
            rutas.push("Subir Amarillo +2.0%");
        }
    }

    if (dL > 0.8) { // Muy Claro
        if (CMYK.K >= 100) {
            rutas.push("K al 100%: Subir C, M, Y (+1%) para ganar densidad");
        } else {
            rutas.push("Subir Negro (K) +1.0%");
        }
    }

    const registro = {
        id: editandoId || Date.now(),
        nombre: document.getElementById('mName').value || "Color",
        de: dE,
        tendencia: tendencia + (dL < -0.8 ? " Sucio" : (dL > 0.8 ? " Pálido" : "")),
        clase: clase,
        cmyk: CMYK,
        rutas: rutas.map(r => ({ texto: r, chequeado: false })),
        lab: { r1L, r1a: val('r1a'), r1b: val('r1b'), r2L, r2a: val('r2a'), r2b: val('r2b'), mL, ma, mb }
    };

    if (editandoId) {
        const idx = proyecto.colores.findIndex(c => c.id === editandoId);
        proyecto.colores[idx] = registro;
        editandoId = null;
        document.getElementById('btnProcesar').innerText = "CALCULAR TENDENCIA";
    } else {
        proyecto.colores.unshift(registro);
    }

    render();
    limpiar();
}

function render() {
    const tbody = document.getElementById('cuerpoTabla');
    tbody.innerHTML = proyecto.colores.map(c => `
        <tr>
            <td><small>${new Date(c.id).toLocaleTimeString()}</small></td>
            <td><strong>${c.nombre}</strong><br><small>C:${c.cmyk.C} M:${c.cmyk.M} Y:${c.cmyk.Y} K:${c.cmyk.K}</small></td>
            <td><b style="color:${c.de > 1.0 ? 'var(--coral)' : 'var(--success)'}">${c.de}</b></td>
            <td>
                <span class="tendencia-tag ${c.clase}">${c.tendencia}</span>
                <div class="rutas-container">
                    ${c.rutas.map((r, i) => `
                        <label class="ruta-item ${r.chequeado ? 'done' : ''}">
                            <input type="checkbox" ${r.chequeado ? 'checked' : ''} 
                                   onchange="toggleCheck(${c.id}, ${i})"> 
                            ${r.texto}
                        </label>
                    `).join('')}
                </div>
            </td>
            <td>
                <button class="btn btn-rev" onclick="revalidar(${c.id})">REV</button>
                <button class="btn btn-del" onclick="eliminar(${c.id})">✕</button>
            </td>
        </tr>`).join('');
}

function toggleCheck(colorId, rutaIdx) {
    const col = proyecto.colores.find(c => c.id === colorId);
    if(col) {
        col.rutas[rutaIdx].chequeado = !col.rutas[rutaIdx].chequeado;
        render();
    }
}

function revalidar(id) {
    const c = proyecto.colores.find(col => col.id === id);
    if(!c) return;
    editandoId = id;
    const lb = c.lab;
    const ck = c.cmyk;
    document.getElementById('r1L').value = lb.r1L; document.getElementById('r1a').value = lb.r1a; document.getElementById('r1b').value = lb.r1b;
    document.getElementById('r2L').value = lb.r2L || "";
    document.getElementById('mName').value = c.nombre;
    document.getElementById('mL').value = lb.mL; document.getElementById('ma').value = lb.ma; document.getElementById('mb').value = lb.mb;
    document.getElementById('cC').value = ck.C; document.getElementById('cM').value = ck.M;
    document.getElementById('cY').value = ck.Y; document.getElementById('cK').value = ck.K;
    document.getElementById('btnProcesar').innerText = "ACTUALIZAR REGISTRO";
    window.scrollTo(0,0);
}

function eliminar(id) {
    if(confirm("¿Eliminar este color?")) {
        proyecto.colores = proyecto.colores.filter(c => c.id !== id);
        render();
    }
}

function limpiar() {
    ['mName','mL','ma','mb','cC','cM','cY','cK'].forEach(id => document.getElementById(id).value = "");
}
// Las funciones de exportar/importar/nuevo se mantienen igual...
