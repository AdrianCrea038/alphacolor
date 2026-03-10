let proyecto = { nombre: "", colores: [] };
let editandoId = null;

function procesar() {
    const val = (id) => parseFloat(document.getElementById(id).value) || 0;
    
    // 1. Obtener LAB
    const r1L = parseFloat(document.getElementById('r1L').value);
    const mL = parseFloat(document.getElementById('mL').value);
    if (isNaN(r1L) || isNaN(mL)) return alert("Faltan valores LAB de Referencia o Muestra");

    // 2. Calcular promedios de Referencia
    const r2L = parseFloat(document.getElementById('r2L').value);
    const fRefL = !isNaN(r2L) ? (r1L + r2L) / 2 : r1L;
    const fRefA = !isNaN(val('r2a')) ? (val('r1a') + val('r2a')) / 2 : val('r1a');
    const fRefB = !isNaN(val('r2b')) ? (val('r1b') + val('r2b')) / 2 : val('r1b');

    // 3. Diferenciales y ΔE
    const ma = val('ma'), mb = val('mb');
    const dE = Math.sqrt(Math.pow(mL - fRefL, 2) + Math.pow(ma - fRefA, 2) + Math.pow(mb - fRefB, 2)).toFixed(2);
    const da = ma - fRefA; 
    const db = mb - fRefB;
    const dL = mL - fRefL;

    // 4. Lógica de Tendencia Visual
    let tendencia = "Color OK";
    let clase = "t-verde";
    let suciedad = dL < -0.8 ? " Sucio" : (dL > 0.8 ? " Pálido" : "");

    if (Math.abs(da) > Math.abs(db)) {
        if (da > 0.4) { tendencia = "Rojizo" + suciedad; clase = "t-rojo"; }
        else if (da < -0.4) { tendencia = "Verdoso" + suciedad; clase = "t-verde"; }
    } else {
        if (db > 0.4) { tendencia = "Amarillento" + suciedad; clase = "t-amar"; }
        else if (db < -0.4) { tendencia = "Azulado" + suciedad; clase = "t-azul"; }
    }

    // 5. Crear objeto
    const registro = {
        id: editandoId || Date.now(),
        nombre: document.getElementById('mName').value || "Color",
        de: dE,
        tendencia: tendencia,
        clase: clase,
        cmyk: { C: val('cC'), M: val('cM'), Y: val('cY'), K: val('cK') },
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
    tbody.innerHTML = proyecto.colores.map(c => {
        const ck = c.cmyk || {C:0, M:0, Y:0, K:0};
        return `
        <tr>
            <td><small>${new Date(c.id).toLocaleTimeString()}</small></td>
            <td><strong>${c.nombre}</strong><br><small>C:${ck.C} M:${ck.M} Y:${ck.Y} K:${ck.K}</small></td>
            <td><b style="color:${c.de > 1.0 ? 'var(--coral)' : 'var(--success)'}">${c.de}</b></td>
            <td><span class="tendencia-tag ${c.clase}">${c.tendencia}</span></td>
            <td>
                <button class="btn btn-rev" onclick="revalidar(${c.id})">REV</button>
                <button class="btn btn-del" onclick="eliminar(${c.id})">✕</button>
            </td>
        </tr>`;
    }).join('');
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

function nuevoProyecto() {
    if(confirm("¿Borrar todo y empezar nuevo?")) {
        proyecto = { nombre: "", colores: [] };
        render();
    }
}

function exportarProyecto() {
    proyecto.nombre = document.getElementById('projName').value || "Sin_Nombre";
    const blob = new Blob([JSON.stringify(proyecto)], {type: "application/json"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = proyecto.nombre + ".alpha";
    a.click();
}

function importarProyecto(e) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        proyecto = JSON.parse(ev.target.result);
        document.getElementById('projName').value = proyecto.nombre;
        render();
    };
    reader.readAsText(e.target.files[0]);
}
