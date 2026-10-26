const RANKS = 'AKQJT98765432';
const POSICIONES = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

const NOTAS = {
    UTG: 'Under the gun · más tight de la mesa',
    HJ: 'Hijack · ligeramente más amplio que UTG',
    CO: 'Cutoff · rango significativamente más amplio',
    BTN: 'Button · posición más ventajosa · rango muy amplio',
    SB: 'Small blind · posición forzada · OOP postflop',
    BB: 'Big blind · no puede abrir · el tab muestra rango de defensa vs RFI',
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

const VISTAS = {
    rfi: {
        boton: () => 'Apertura RFI',
        titulo: pos => `Rango de apertura — ${pos}`,
        leyenda: 'go.',
        mixto: { leyenda: 'Mixto (Raise o Fold)', desc: 'Mixto: raise o fold' },
    },
    vsRfi: {
        boton: pos => pos === 'BB' ? 'Defensa vs RFI' : 'VS RFI',
        titulo: (pos, riv) => pos === 'BB' ? `BB defendiendo vs ${riv}` : `Respuesta vs apertura — ${pos}`,
        sub: 'Abridor',
        leyenda: 'rbo.',
    },
    vs3bet: {
        boton: () => 'VS 3-BET',
        titulo: (pos, riv) => `${pos} vs 3-bet de ${riv}`,
        sub: '3-Bettor',
        leyenda: 'bopx.',
    },
};

const $ = id => document.getElementById(id);
const estado = { pos: 'UTG', vista: 'rfi', rival: null };

function vistasDe(pos) {
    return Object.keys(VISTAS).filter(v => RANGOS[v][pos]);
}

function rivalesDe(pos, vista) {
    return vista === 'rfi' ? [] : Object.keys(RANGOS[vista][pos]);
}

function tablaActual() {
    const { pos, vista, rival } = estado;
    return vista === 'rfi' ? RANGOS.rfi[pos] : RANGOS[vista][pos][rival];
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

function botones(contenedor, items, activo, alElegir) {
    contenedor.replaceChildren(...items.map(([valor, texto]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = texto;
        b.classList.toggle('activo', valor === activo);
        b.addEventListener('click', () => alElegir(valor));
        return b;
    }));
}

function infoVacia() {
    const tactil = matchMedia('(hover: none)').matches;
    $('info').innerHTML = `<div class="info-raya">—</div><p class="info-hint">${tactil ? 'Tocá una mano' : 'Pasá el mouse'}</p>`;
}

function mostrarInfo(celda) {
    const a = accion(celda.dataset.letra);
    $('info').innerHTML = `
        <div class="info-mano">${celda.dataset.mano}</div>
        <p class="info-tipo">${celda.dataset.tipo}</p>
        <p class="info-accion a-${a.clase}">${a.accion}</p>
        <p class="info-dato">${celda.dataset.combos} combinaciones</p>
        <p class="info-dato">${a.desc}</p>`;
    $('grilla').querySelector('.marcada')?.classList.remove('marcada');
    celda.classList.add('marcada');
}

function render() {
    const { pos, vista } = estado;
    const conf = VISTAS[vista];

    botones($('posiciones'), POSICIONES.map(p => [p, p]), pos, elegirPosicion);
    botones($('vistas'), vistasDe(pos).map(v => [v, VISTAS[v].boton(pos)]), vista, v => {
        estado.vista = v;
        estado.rival = null;
        actualizar();
    });

    const rivales = rivalesDe(pos, vista);
    $('subbarra').hidden = !rivales.length;
    $('subbarra').dataset.tono = vista === 'vs3bet' ? 'rojo' : pos === 'BB' ? 'verde' : 'azul';
    $('sub-etiqueta').textContent = conf.sub || '';
    botones($('rivales'), rivales.map(r => [r, 'VS ' + r]), estado.rival, r => {
        estado.rival = r;
        actualizar();
    });

    $('titulo').textContent = conf.titulo(pos, estado.rival);
    $('nota').textContent = NOTAS[pos];

    // Grilla
    const tabla = tablaActual();
    const celdas = [];
    let jugados = 0;
    let abiertos = 0;
    tabla.forEach((linea, fila) => {
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
    $('combos').textContent = jugados;
    $('porcentaje').textContent = (jugados / total * 100).toFixed(1) + '%';
    $('base').textContent = vista === 'vs3bet' ? 'del rango de apertura' : 'de 1326 combos totales';

    infoVacia();
}

function elegirPosicion(pos) {
    estado.pos = pos;
    actualizar();
}

// Ajusta vista/rival a lo que existe para la posición, guarda el estado en la URL y dibuja.
function actualizar() {
    const vistas = vistasDe(estado.pos);
    if (!vistas.includes(estado.vista)) estado.vista = vistas[0];
    const rivales = rivalesDe(estado.pos, estado.vista);
    if (!rivales.includes(estado.rival)) estado.rival = rivales[0] || null;
    history.replaceState(null, '', '#' + [estado.pos, estado.vista, estado.rival].filter(Boolean).join('/'));
    render();
}

function leerHash() {
    const [pos, vista, rival] = decodeURIComponent(location.hash.slice(1)).split('/');
    if (POSICIONES.includes(pos)) estado.pos = pos;
    if (VISTAS[vista]) estado.vista = vista;
    if (rival) estado.rival = rival;
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

leerHash();
actualizar();
