/**
 * ALPHA COLOR SYSTEM - v4.7
 * Lógica: Referencia Única + 2 Rutas Prioritarias.
 */

// VARIABLES GLOBALES
let proyecto = { nombre: "", colores: [] };
let editandoId = null;

/**
 * Función Principal de Cálculo
 */
function procesar() {
    const val = (id) => {
        const el = document.getElementById(id);
        return el ? parseFloat(el.value) || 0 : 0;
    };
    
    // 1. Referencia Única (Solo L1, a1, b1)
    const rL = parseFloat(document.getElementById('r1L').value);
    const ra = val('r1a');
    const rb = val('r1b');
    
    // 2. Muestra
    const mL = parseFloat(document.getElementById('mL').value);
    const ma = val('ma');
    const mb = val('mb');
    
    if (isNaN(rL) || isNaN(mL)) {
        alert("Error: Ingresa los valores 'L' de Referencia y Muestra.");
        return;
    }

    // Cálculos Diferenciales
    const dL = mL - rL;
    const da = ma - ra; 
    const db = mb - rb;
    const dE = Math.sqrt(Math.pow(dL, 2) + Math.pow(da, 2) + Math.pow(db, 2)).toFixed(2);

    const CMYK = { C: val('cC'), M: val('cM'), Y: val('cY'), K: val('cK') };
    let todasLasRutas = [];

    // --- GENERACIÓN DE RUTAS ---
    
    // Eje Rojo/Verde (da)
    if (da > 0.4) { 
        todasLasRutas.push({ prioridad: Math.abs(da), texto: CMYK.C >= 98 ? "C al límite: Bajar Magenta -2.0%" : `Subir Cyan ${dE > 3 ? '+3.0%' : '+1.5%'}` });
    } else if (da < -0.4) {
        todasLasRutas.push({ prioridad: Math.abs(da), texto: CMYK.M >= 98 ? "M al límite: Bajar Cyan -2.0%" : `Subir Magenta ${dE > 3 ? '+3.5%' : '+1.8%'}` });
    }

    // Eje Amarillo/Azul (db)
    if (db > 0.4) {
        todasLasRutas.push({ prioridad: Math.abs(db), texto: `Bajar Amarillo ${dE > 3 ? '-3.5%' : '-1.5%'}` });
    } else if (db < -0.4) {
        todasLasRutas.push({ prioridad: Math.abs(db), texto: CMYK.Y >= 98 ? "Y al límite: Bajar Cyan -1.0% y Mag -1.0%" : `Subir Amarillo ${dE > 3 ? '+3.0%' : '+1.8%'}` });
    }

    // Luminosidad (dL)
    if (dL > 0.6) {
        todasLasRutas.push({ prioridad: Math.abs(dL), texto: `Subir Negro (K) +1.5%` });
    } else if (dL < -0.6) {
        todasLasRutas.push({ prioridad: Math.abs(dL), texto: `Bajar Negro (K) -2.0%` });
    }

    // --- FILTRAR LAS 2 RUTAS MÁS CRÍTICAS ---
    let rutasFinales = todasLasRutas
        .sort((a, b) => b.prioridad - a.prioridad)
        .slice(0, 2)
        .map(r => ({ texto: r.texto, chequeado: false }));

    // Alerta de Precisión
    if (dE < 1.0) {
        rutasFinales.unshift({ texto: "✨ PRECISIÓN ALTA (ΔE < 1.0)", chequeado: false });
    }

    // Tendencia Visual Principal
    let tendencia = "En Punto";
    let clase = "t-verde";
    if (Math.abs(da) > Math.abs(db)) {
        if (da > 0.4) { tendencia = "Rojizo"; clase = "t-rojo"; }
        else if (da < -0.4) { tendencia = "Verdoso"; clase = "t-verde"; }
    } else {
        if (db > 0.4) { tendencia = "Amarillento"; clase = "t-amar"; }
        else if (db < -0.4) { tendencia = "Azulado"; clase = "t-azul"; }
    }

    // Guardado
    const registro = {
        id: editandoId || Date.now(),
        nombre: document.getElementById('mName').value || "Muestra",
        de: dE, tendencia, clase, cmyk: CMYK,
        rutas: rutasFinales,
        lab: { rL, ra, rb, mL, ma, mb }
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
}

/**
 * Función que limpia TODOS los campos de la pantalla
 */
function limpiarCamposNuevo() {
    editandoId = null;
    const btn = document.getElementById('btnProcesar');
    if (btn) btn.innerText = "CALCULAR";

    // IDs unificados para limpieza total
    const ids = [
        'r1L', 'r1a', 'r1b', 
        'mName', 'mL', 'ma', 'mb', 
        'cC', 'cM', 'cY', 'cK'
    ];

    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
}

function render() {
    const tbody = document.getElementById('cuerpoTabla');
    if (!tbody) return;
    tbody.innerHTML = proyecto.colores.map(c => `
        <tr>
            <td><small>${new Date(c.id).toLocaleTimeString()}</small></td>
            <td><strong>${c.nombre}</strong><br><small>C:${c.cmyk.C} M:${c.cmyk.M} Y:${c.cmyk.Y} K:${c.cmyk.K}</small></td>
            <td><b style="color:${c.de > 1.0 ? 'var(--coral)' : 'var(--success)'}">${c.de}</b></td>
            <td>
                <span class="tendencia-tag ${c.clase}">${c.tendencia}</span>
                <div class="rutas-container">
                    ${c.rutas.map((r, i) => `
                        <div class="ruta-item ${r.chequeado ? 'done' : ''}" onclick="toggleCheck(${c.id}, ${i})">
                            <input type="checkbox" ${r.chequeado ? 'checked' : ''} onclick="event.stopPropagation()"> ${r.texto}
                        </div>
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
    if(col) { col.rutas[rutaIdx].chequeado = !col.rutas[rutaIdx].chequeado; render(); }
}

function revalidar(id) {
    const c = proyecto.colores.find(col => col.id === id);
    if(!c) return;
    editandoId = id;
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

function eliminar(id) {
    if(confirm("¿Eliminar registro?")) {
        proyecto.colores = proyecto.colores.filter(c => c.id !== id);
        render();
    }
}

function nuevoProyecto() {
    if(confirm("¿Borrar todo el historial y empezar de cero?")) {
        proyecto = { nombre: "", colores: [] };
        render();
        limpiarCamposNuevo();
    }
}

function exportarProyecto() {
    proyecto.nombre = document.getElementById('projName').value || "Alpha_Project";
    const blob = new Blob([JSON.stringify(proyecto)], {type: "application/json"});
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
        } catch(err) { alert("Archivo no válido"); }
    };
    reader.readAsText(e.target.files[0]);
}
