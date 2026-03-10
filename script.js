// ... (Mantén las variables iniciales y la función val igual)

function procesar() {
    const val = (id) => parseFloat(document.getElementById(id).value) || 0;
    
    const r1L = parseFloat(document.getElementById('r1L').value);
    const mL = parseFloat(document.getElementById('mL').value);
    if (isNaN(r1L) || isNaN(mL)) return alert("Faltan valores LAB");

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

    // --- CÁLCULO DE RUTAS CON PORCENTAJES ESPECÍFICOS ---
    let rutas = [];
    
    // 1. Eje Rojo/Verde (Delta a)
    if (da > 0.4) { // Sobra Rojo / Falta Cyan
        if (CMYK.C >= 100) {
            rutas.push("C al 100%: BAJAR Magenta -2.0% y Amarillo -1.0%");
        } else {
            let ajuste = dE > 2.0 ? "+3.0%" : "+1.5%";
            rutas.push(`SUBIR Cyan ${ajuste}`);
        }
    } else if (da < -0.4) { // Sobra Verde / Falta Magenta
        if (CMYK.M >= 100) {
            rutas.push("M al 100%: BAJAR Cyan -2.0% y Amarillo -1.0%");
        } else {
            let ajuste = dE > 2.0 ? "+2.5%" : "+1.2%";
            rutas.push(`SUBIR Magenta ${ajuste}`);
        }
    }

    // 2. Eje Amarillo/Azul (Delta b)
    if (db > 0.4) { // Sobra Amarillo
        let ajuste = dE > 2.0 ? "-3.0%" : "-1.5%";
        rutas.push(`BAJAR Amarillo ${ajuste}`);
    } else if (db < -0.4) { // Sobra Azul / Falta Amarillo
        if (CMYK.Y >= 100) {
            rutas.push("Y al 100%: BAJAR Cyan -1.0% y Magenta -1.0%");
        } else {
            let ajuste = dE > 2.0 ? "+3.0%" : "+2.0%";
            rutas.push(`SUBIR Amarillo ${ajuste}`);
        }
    }

    // 3. Luminosidad (Delta L)
    if (dL > 0.7) { // Muy Claro
        if (CMYK.K >= 100) {
            rutas.push("K al 100%: SUBIR C, M, Y (+1.5%) para densificar");
        } else {
            let ajuste = dE > 1.5 ? "+1.5%" : "+0.8%";
            rutas.push(`SUBIR Negro (K) ${ajuste}`);
        }
    } else if (dL < -0.7) { // Muy Oscuro
        rutas.push("BAJAR Negro (K) -1.0% o reducir CMY general");
    }

    // --- TENDENCIA VISUAL ---
    let tendencia = "Color en Punto";
    let clase = "t-verde";
    if (Math.abs(da) > Math.abs(db)) {
        if (da > 0.4) { tendencia = "Rojizo"; clase = "t-rojo"; }
        else if (da < -0.4) { tendencia = "Verdoso"; clase = "t-verde"; }
    } else {
        if (db > 0.4) { tendencia = "Amarillento"; clase = "t-amar"; }
        else if (db < -0.4) { tendencia = "Azulado"; clase = "t-azul"; }
    }
    if (dL < -0.8) tendencia += " Sucio";
    if (dL > 0.8) tendencia += " Pálido";

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
// ... (Mantén las funciones render, revalidar, eliminar y toggleCheck que ya tienes)
