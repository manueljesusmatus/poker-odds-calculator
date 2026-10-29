const RANKS = 'AKQJT98765432';
const POSICIONES = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

const NOTAS = {
    UTG: 'Under the gun · más tight de la mesa',
    HJ: 'Hijack · ligeramente más amplio que UTG',
    CO: 'Cutoff · rango significativamente más amplio',
    BTN: 'Button · posición más ventajosa · rango muy amplio',
    SB: 'Small blind · posición forzada · OOP postflop',
    BB: 'Big blind · no puede abrir · defensa vs RFI',
};

// Letra de RANGOS -> clase CSS, texto de la leyenda, acción en "Info de mano" y descripción.
const ACCIONES = {
    g: { clase: 'abrir', leyenda: 'RFI / Abrir', accion: 'Abrir (RFI)', desc: 'Abrir siempre' },
    r: { clase: 'tres', leyenda: '3-bet', accion: '3-bet', desc: '3-bet siempre' },
    b: { clase: 'call', leyenda: 'Call', accion: 'Call', desc: 'Call siempre' },
    o: { clase: 'mixto', leyenda: 'Mixto (Call o Fold)', accion: 'Mixto', desc: 'Mixto: call o fold' },
    p: { clase: 'cuatro', leyenda: '4-bet', accion: '4-bet', desc: '4-bet siempre' },
    x: { clase: 'abrias', leyenda: 'Fold (abrías)', accion: 'Fold', desc: 'Abrías, pero fold al 3-bet' },
    '.': { clase: 'fold', leyenda: 'Fold', accion: 'Fold', desc: 'Fold siempre' },
};

// Cada vista es un bloque del menú; el orden de las claves es el orden en pantalla.
const VISTAS = {
    rfi: {
        menu: 'Apertura RFI',
        tono: 'verde',
        titulo: pos => `Rango de apertura — ${pos}`,
        leyenda: 'go.',
        mixto: { leyenda: 'Mixto (Raise o Fold)', desc: 'Mixto: raise o fold' },
    },
    vsRfi: {
        menu: 'VS RFI',
        ayuda: 'Tu posición · vs abridor',
        tono: 'azul',
        titulo: (pos, riv) => pos === 'BB' ? `BB defendiendo vs ${riv}` : `${pos} vs apertura de ${riv}`,
        leyenda: 'rbo.',
    },
    vs3bet: {
        menu: 'VS 3-BET',
        ayuda: 'Abriste · vs 3-bettor',
        tono: 'rojo',
        titulo: (pos, riv) => `${pos} vs 3-bet de ${riv}`,
        leyenda: 'bopx.',
    },
};

const $ = id => document.getElementById(id);
const estado = { pos: 'UTG', vista: 'rfi', rival: null };
let resumenTabla = '';

function tablaActual() {
    const { pos, vista, rival } = estado;
    return vista === 'rfi' ? RANGOS.rfi[pos] : RANGOS[vista][pos]?.[rival];
}

function accion(letra) {
    const base = ACCIONES[letra];
    return letra === 'o' && VISTAS[estado.vista].mixto ? { ...base, ...VISTAS[estado.vista].mixto } : base;
}

function mano(fila, col) {
    if (fila === col) return { nombre: RANKS[fila] + RANKS[col], tipo: 'Par', combos: 6 };
    if (fila < col) return { nombre: RANKS[fila] + RANKS[col] + 's', tipo: 'Suited', combos: 4 };
    return { nombre: RANKS[col] + RANKS[fila] + 'o', tipo: 'Offsuit', combos: 12 };
}

function boton(texto, pos, vista, rival) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = texto;
    Object.assign(b.dataset, { pos, vista, rival: rival || '' });
    return b;
}

// Menú con todas las tablas: Apertura (una por posición) y una fila por posición en VS RFI / VS 3-BET.
function construirMenu() {
    const menu = $('menu');
    for (const [vista, conf] of Object.entries(VISTAS)) {
        const grupo = document.createElement('section');
        grupo.className = 'grupo';
        grupo.dataset.tono = conf.tono;
        grupo.innerHTML = `<h2 class="etiqueta">${conf.menu}</h2>` + (conf.ayuda ? `<p class="grupo-ayuda">${conf.ayuda}</p>` : '');

        if (vista === 'rfi') {
            const fila = document.createElement('div');
            fila.className = 'botones apertura';
            fila.append(...Object.keys(RANGOS.rfi).map(pos => boton(pos, pos, vista)));
            grupo.appendChild(fila);
        } else {
            for (const [pos, rivales] of Object.entries(RANGOS[vista])) {
                const fila = document.createElement('div');
                fila.className = 'fila';
                fila.dataset.pos = pos;
                const botones = document.createElement('div');
                botones.className = 'botones';
                botones.append(...Object.keys(rivales).map(riv => boton(riv, pos, vista, riv)));
                fila.innerHTML = `<span class="fila-pos">${pos}</span>`;
                fila.appendChild(botones);
                grupo.appendChild(fila);
            }
        }
        menu.appendChild(grupo);
    }

    menu.addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        Object.assign(estado, { pos: b.dataset.pos, vista: b.dataset.vista, rival: b.dataset.rival || null });
        actualizar();
    });
}

function infoVacia() {
    const tactil = matchMedia('(hover: none)').matches;
    $('info').innerHTML = `<div class="info-raya">—</div><p class="info-hint">${tactil ? 'Tocá una mano' : 'Pasá el mouse'}</p>`;
    $('resumen').textContent = resumenTabla;
}

function mostrarInfo(celda) {
    const a = accion(celda.dataset.letra);
    const { mano, tipo, combos } = celda.dataset;
    $('info').innerHTML = `
        <div class="info-mano">${mano}</div>
        <p class="info-tipo">${tipo}</p>
        <p class="info-accion a-${a.clase}">${a.accion}</p>
        <p class="info-dato">${combos} combinaciones</p>
        <p class="info-dato">${a.desc}</p>`;
    $('resumen').innerHTML = `<b>${mano}</b> · ${tipo} · <span class="info-accion a-${a.clase}">${a.accion}</span> · ${combos} combos`;
    $('grilla').querySelector('.marcada')?.classList.remove('marcada');
    celda.classList.add('marcada');
}

function render() {
    const { pos, vista, rival } = estado;
    const conf = VISTAS[vista];

    $('menu').querySelectorAll('button').forEach(b => {
        const activo = b.dataset.pos === pos && b.dataset.vista === vista && (b.dataset.rival || null) === rival;
        b.classList.toggle('activo', activo);
        b.setAttribute('aria-pressed', activo);
    });

    $('titulo').textContent = conf.titulo(pos, rival);
    $('nota').textContent = NOTAS[pos];

    // Grilla
    const celdas = [];
    let jugados = 0;
    let abiertos = 0;
    tablaActual().forEach((linea, fila) => {
        [...linea].forEach((letra, col) => {
            const m = mano(fila, col);
            const c = document.createElement('div');
            c.className = 'celda a-' + ACCIONES[letra].clase;
            c.textContent = m.nombre;
            Object.assign(c.dataset, { letra, mano: m.nombre, tipo: m.tipo, combos: m.combos });
            celdas.push(c);
            if (letra !== '.') abiertos += m.combos;
            if (letra !== '.' && letra !== 'x') jugados += m.combos;
        });
    });
    $('grilla').replaceChildren(...celdas);

    // Leyenda
    $('leyenda').replaceChildren(...[...conf.leyenda].map(letra => {
        const li = document.createElement('li');
        li.innerHTML = `<i class="muestra a-${ACCIONES[letra].clase}"></i>${accion(letra).leyenda}`;
        return li;
    }));

    // Estadísticas: vs 3-bet se mide sobre el rango con el que abriste.
    const total = vista === 'vs3bet' ? abiertos : 1326;
    const porcentaje = (jugados / total * 100).toFixed(1) + '%';
    $('combos').textContent = jugados;
    $('porcentaje').textContent = porcentaje;
    $('base').textContent = vista === 'vs3bet' ? 'del rango de apertura' : 'de 1326 combos totales';
    resumenTabla = `${jugados} combos · ${porcentaje} ${vista === 'vs3bet' ? 'del rango de apertura' : 'de las manos'}`;

    infoVacia();
}

// Si el estado no apunta a una tabla existente vuelve a UTG apertura; guarda el estado en la URL y dibuja.
function actualizar() {
    if (!VISTAS[estado.vista] || !tablaActual()) Object.assign(estado, { pos: 'UTG', vista: 'rfi', rival: null });
    if (estado.vista === 'rfi') estado.rival = null;
    history.replaceState(null, '', '#' + [estado.pos, estado.vista, estado.rival].filter(Boolean).join('/'));
    render();
}

function leerHash() {
    const [pos, vista, rival] = decodeURIComponent(location.hash.slice(1)).split('/');
    if (POSICIONES.includes(pos)) estado.pos = pos;
    if (VISTAS[vista]) estado.vista = vista;
    // Sin rival en el hash, el primero disponible
    estado.rival = rival || (estado.vista !== 'rfi' && Object.keys(RANGOS[estado.vista][estado.pos] || {})[0]) || null;
}

// Info de mano: hover con mouse, toque en pantallas táctiles.
const grilla = $('grilla');
grilla.addEventListener('pointerover', e => {
    if (e.pointerType === 'mouse' && e.target.classList.contains('celda')) mostrarInfo(e.target);
});
grilla.addEventListener('pointerleave', e => {
    if (e.pointerType !== 'mouse') return;
    grilla.querySelector('.marcada')?.classList.remove('marcada');
    infoVacia();
});
grilla.addEventListener('click', e => {
    if (e.target.classList.contains('celda')) mostrarInfo(e.target);
});

// Contraste: se recuerda por navegador.
const botonContraste = $('contraste');
function aplicarContraste(activo) {
    document.body.classList.toggle('alto-contraste', activo);
    botonContraste.setAttribute('aria-pressed', activo);
    botonContraste.classList.toggle('activo', activo);
}
try { aplicarContraste(localStorage.getItem('evo-contraste') === '1'); } catch (e) { }
botonContraste.addEventListener('click', () => {
    const activo = !document.body.classList.contains('alto-contraste');
    aplicarContraste(activo);
    try { localStorage.setItem('evo-contraste', activo ? '1' : '0'); } catch (e) { }
});

window.addEventListener('hashchange', () => {
    leerHash();
    actualizar();
});

construirMenu();
leerHash();
actualizar();
