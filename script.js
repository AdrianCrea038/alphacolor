// VARIABLES GLOBALES (Fundamentales para que no den error)
let proyecto = { nombre: "", colores: [] };
let editandoId = null;

/**
 * Función Principal: Calcula diferencias, tendencia y genera checklist
 */
function procesar() {
    const val = (id) => parseFloat(document.getElementById(id).value) || 0;
    
    // Obtener valores LAB obligatorios
    const r1L = parseFloat(document.getElementById('r1L').value);
    const mL = parseFloat(document.getElementById('mL').value);
    
    if (isNaN(r1L) || isNaN(mL)) {
        return alert("Error: Debes ingresar al menos L1 de Referencia y L de la Muestra.");
    }

    // Promedios de Referencia (Soporta 1 o 2 lecturas)
    const r2L = parseFloat(document.getElementById('r2L').value);
    const fRefL = !isNaN(r2L) ? (r1L + r2L) / 2 : r1L;
    const fRefA = !isNaN(val('r2a')) ? (val('r1a') + val('r2a')) / 2 : val('r1a');
    const fRefB = !isNaN(val('r2b')) ? (val('r1b') + val('r2b')) / 2 : val('r1b');

    // Diferenciales y Delta E
    const ma = val('ma'), mb = val('mb');
    const dE = Math.sqrt(Math.pow(mL - fRefL, 2) + Math.pow(ma - fRefA, 2) + Math.pow(mb - fRefB, 2)).toFixed(2);
    const da = ma - fRefA; 
    const db = mb - fRefB;
    const dL = mL - fRefL;

    const CMYK = { C: val('cC'), M: val('cM'), Y: val('cY'), K: val('cK') };
    let rutas = [];
    
    // Lógica de Ajustes de Color
    if (da > 0.4) { // Sobra Rojo (Falta Cyan)
        if (CMYK.C >= 100) rutas.push("C al 100%: BAJAR Magenta -2.0% y Amarillo -1.0%");
        else rutas.push(`SUBIR Cyan ${dE > 2 ? '+3.0%' : '+1.5%'}`);
    } else if (da < -0.4) { // Sobra Verde (Falta Magenta)
        if (CMYK.M >= 100) rutas.push("M al 100%: BAJAR Cyan -2.0%");
        else rutas.push(`SUBIR Magenta ${dE > 2 ? '+2.5%' : '+1.2%'}`);
    }

    if (db > 0.4) { // Sobra Amarillo
        rutas.push(`BAJAR Amarillo ${dE > 2 ? '-3.0%' : '-1.5%'}`);
    } else if (db < -0.4) { // Sobra Azul (Falta Amarillo)
        if (CMYK.Y >= 100) rutas.push("Y al 100%: BAJAR Cyan -1.0% y Magenta -1.0%");
        else rutas.push(`SUBIR Amarillo ${dE > 2 ? '+3.0%' : '+2.0%'}`);
    }

    if (dL > 0.7) rutas.push(`SUBIR Negro (K) ${dE > 1.5 ? '+1.5%' : '+0.8%'}`);
    else if (dL < -0.7) rutas.push("BAJAR Negro (K) -1.0% o carga CMY");

    // Determinar Tendencia Visual
    let tendencia = "En Punto";
    let clase = "t-verde";
    if (Math.abs(da) > Math.abs(db)) {
        if (da > 0.4) { tendencia = "Rojizo"; clase = "t-rojo"; }
        else if (da < -0.4) { tendencia = "Verdoso"; clase = "t-verde"; }
    } else {
        if (db > 0.4) { tendencia = "Amarillento"; clase = "t-amar"; }
        else if (db < -0.4) { tendencia = "Azulado"; clase = "t-azul"; }
    }
    if (dL < -0.8) tendencia += " Sucio"; else if (dL > 0.8) tendencia += " Pálido";

    // Crear Registro de Color
    const registro = {
        id: editandoId || Date.now(),
        nombre: document.getElementById('mName').value || "Muestra",
        de: dE,
        tendencia: tendencia,
        clase: clase,
        cmyk: CMYK,
        rutas: rutas.map(r => ({ texto: r, chequeado: false })),
        lab: { r1L, r1a: val('r1a'), r1b: val('r1b'), r2L, r2a: val('r2a'), r2b: val('r2b'), mL, ma, mb }
    };

    // Guardar o Actualizar
    if (editandoId) {
        const idx = proyecto.colores.findIndex(c => c.id === editandoId);
        if (idx !== -1) proyecto.colores[idx] = registro;
        editandoId = null;
        document.getElementById('btnProcesar').innerText = "CALCULAR";
    } else {
        proyecto.colores.unshift(registro);
    }

    render();
    limpiar();
}

/**
 * Dibuja la tabla con los datos
 */
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
                            <input type="checkbox" ${r.chequeado ? 'checked' : ''}> ${r.texto}
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

/**
 * Funciones de Utilidad
 */
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
    
    // Cargar datos a los inputs
    document.getElementById('r1L').value = c.lab.r1L;
    document.getElementById('r1a').value = c.lab.r1a;
    document.getElementById('r1b').value = c.lab.r1b;
    document.getElementById('r2L').value = c.lab.r2L || "";
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
    if(confirm("¿Eliminar este registro?")) {
        proyecto.colores = proyecto.colores.filter(c => c.id !== id);
        render();
    }
}

function limpiarCamposNuevo() {
    editandoId = null;
    document.getElementById('btnProcesar').innerText = "CALCULAR";
    ['mName','mL','ma','mb','cC','cM','cY','cK'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = "";
    });
}

function limpiar() { limpiarCamposNuevo(); }

function nuevoProyecto() {
    if(confirm("¿Borrar todo el proyecto actual?")) {
        proyecto = { nombre: "", colores: [] };
        render();
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
