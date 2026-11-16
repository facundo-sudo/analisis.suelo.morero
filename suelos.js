/* Análisis de suelo MORERO.
 * Todo se guarda en el navegador (localStorage). El Excel se lee acá mismo y no se sube a ningún lado.
 * nube.js copia los datos a Supabase si se inició sesión, y permite bajar una copia a la PC.
 */
(function () {
  'use strict';

  // ---------- Claves y datos base ----------
  var CLAVES = { analisis: 'suelos.analisis', nutrientes: 'suelos.nutrientes', mapeo: 'suelos.mapeo' };

  // tipo: 'mas' = más es mejor; 'rango' = óptimo entre los límites (pH); 'menos' = menos es mejor (sales, sodio).
  // Rangos tomados de la hoja «referencias» de MORERO cuando los hay; el resto, orientativos de la región pampeana.
  // 'info' = se guarda y se grafica, pero sin interpretación (humedad, granulometría, etc.).
  var NUTRIENTES_INICIALES = [
    { id: 'ph', nombre: 'pH', corto: 'pH', unidad: '', tipo: 'rango', bajo: 6, alto: 7.5, alias: ['ph', 'ph actual', 'ph agua', 'ph 1 2 5', 'ph en agua'] },
    { id: 'mo', nombre: 'Materia orgánica', corto: 'MO', unidad: '%', tipo: 'mas', bajo: 2, alto: 3, alias: ['mo', 'm o', 'materia organica', 'mat organica'] },
    { id: 'ct', nombre: 'Carbono orgánico', corto: 'C', unidad: '%', tipo: 'mas', bajo: 1.2, alto: 1.7, alias: ['c t', 'ct', 'co', 'c o', 'carbono', 'carbono organico', 'carbono total', 'c org', 'c oxidable'] },
    { id: 'nt', nombre: 'Nitrógeno total', corto: 'Nt', unidad: '%', tipo: 'mas', bajo: 0.1, alto: 0.15, alias: ['nt', 'n total', 'nitrogeno total'] },
    { id: 'n', nombre: 'Nitrógeno de nitratos', corto: 'N-NO3', unidad: 'ppm', tipo: 'mas', bajo: 10, alto: 20, alias: ['n no3', 'nitratos', 'nitrato', 'n nitratos', 'no3', 'n de nitratos'] },
    { id: 'p', nombre: 'Fósforo extractable', corto: 'P', unidad: 'ppm', tipo: 'mas', bajo: 12, alto: 20, alias: ['p', 'fosforo', 'p bray', 'p bray 1', 'p extractable', 'fosforo extractable', 'fosforo bray', 'pe'] },
    { id: 's', nombre: 'Azufre de sulfatos', corto: 'S', unidad: 'ppm', tipo: 'mas', bajo: 6, alto: 10, alias: ['s', 'azufre', 's so4', 'sulfatos', 'so4', 'sulfato', 'azufre de sulfatos'] },
    { id: 'k', nombre: 'Potasio', corto: 'K', unidad: 'meq/100g', tipo: 'mas', bajo: 0.5, alto: 1, alias: ['k', 'potasio', 'k intercambiable'] },
    { id: 'ca', nombre: 'Calcio', corto: 'Ca', unidad: 'meq/100g', tipo: 'mas', bajo: 3.5, alto: 5, alias: ['ca', 'calcio'] },
    { id: 'mg', nombre: 'Magnesio', corto: 'Mg', unidad: 'meq/100g', tipo: 'mas', bajo: 0.8, alto: 1.2, alias: ['mg', 'magnesio'] },
    { id: 'na', nombre: 'Sodio', corto: 'Na', unidad: 'meq/100g', tipo: 'info', bajo: 0, alto: 0, alias: ['na', 'sodio'] },
    { id: 'zn', nombre: 'Zinc', corto: 'Zn', unidad: 'ppm', tipo: 'mas', bajo: 1, alto: 1, alias: ['zn', 'zinc', 'cinc'] },
    { id: 'b', nombre: 'Boro', corto: 'B', unidad: 'ppm', tipo: 'mas', bajo: 0.5, alto: 1, alias: ['b', 'boro'] },
    { id: 'cu', nombre: 'Cobre', corto: 'Cu', unidad: 'ppm', tipo: 'mas', bajo: 0.3, alto: 0.6, alias: ['cu', 'cobre'] },
    { id: 'cic', nombre: 'Capacidad de intercambio catiónico', corto: 'CIC', unidad: 'meq/100g', tipo: 'mas', bajo: 8, alto: 12, alias: ['cic', 'c i c', 'capacidad de intercambio cationico'] },
    { id: 'ce', nombre: 'Conductividad eléctrica', corto: 'CE', unidad: 'dS/m', tipo: 'menos', bajo: 1.5, alto: 3, alias: ['ce', 'c e', 'conductividad', 'conductividad electrica'] },
    { id: 'psi', nombre: 'Sodio intercambiable', corto: 'PSI', unidad: '%', tipo: 'menos', bajo: 7, alto: 15, alias: ['psi', 'sodio intercambiable', 'porcentaje de sodio intercambiable'] },
    { id: 'hum', nombre: 'Humedad', corto: 'Hum.', unidad: '%', tipo: 'info', bajo: 0, alto: 0, alias: ['hum', 'humedad', 'humedad gravimetrica'] },
    { id: 'arena', nombre: 'Arena', corto: 'Arena', unidad: '%', tipo: 'info', bajo: 0, alto: 0, alias: ['are', 'arena'] },
    { id: 'limo', nombre: 'Limo', corto: 'Limo', unidad: '%', tipo: 'info', bajo: 0, alto: 0, alias: ['limo'] },
    { id: 'arcilla', nombre: 'Arcilla', corto: 'Arcilla', unidad: '%', tipo: 'info', bajo: 0, alto: 0, alias: ['arc', 'arcilla'] }
  ];

  var RECOMENDACION = {
    p: 'considerar fertilización fosforada (dosis de reposición o de construcción según el cultivo).',
    n: 'ajustar la dosis de nitrógeno según el cultivo y el rendimiento objetivo.',
    nt: 'bajo aporte de nitrógeno del suelo; ajustar la fertilización nitrogenada.',
    s: 'probable respuesta a azufre, sobre todo en soja, trigo y maíz.',
    mo: 'menor aporte de nitrógeno por mineralización; conviene favorecer rotaciones con gramíneas y cultivos de servicio.',
    zn: 'considerar el agregado de zinc en maíz (en semilla o con el fertilizante).',
    b: 'considerar boro en girasol y alfalfa.',
    k: 'evaluar fertilización potásica en cultivos exigentes.',
    cu: 'evaluar micronutrientes en cultivos sensibles.',
    ca: 'evaluar enmiendas cálcicas.',
    mg: 'evaluar enmiendas con magnesio (dolomita).',
    cic: 'suelo de baja capacidad de retención; fraccionar las fertilizaciones.'
  };

  var COLORES = { bajo: '#8F131C', medio: '#D39B2A', bien: '#2E8B57', alto: '#2D5F9A' };
  var NOMBRE_ESTADO = { bajo: 'Bajo / problema', medio: 'Medio', bien: 'Adecuado', alto: 'Alcalino' };
  var VISTAS = { general: 'Evaluación general', campo: 'Evaluación por campo', nutriente: 'Evaluación por nutriente', comparar: 'Comparación' };

  // ---------- Utilidades ----------
  function $(id) { return document.getElementById(id); }
  function leer(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function guardar(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch (e) { alert('No se pudo guardar en este navegador (¿memoria llena?). Bajá una copia con «⬇ Bajar copia».'); return false; }
  }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function norm(t) {
    return String(t == null ? '' : t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').replace(/[^a-z0-9%]+/g, ' ').trim();
  }
  function nuevoId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function fmt(v, dec) {
    if (v == null || isNaN(v)) return '–';
    if (dec == null) dec = Math.abs(v) < 10 ? 2 : Math.abs(v) < 100 ? 1 : 0;
    return Number(v).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: dec });
  }
  function pct(a, b) { return b ? Math.round(a * 100 / b) : 0; }
  function promedio(arr) { return arr.length ? arr.reduce(function (a, b) { return a + b; }, 0) / arr.length : null; }
  function numero(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var t = String(v).trim().replace(/\s/g, '');
    if (!t || /^(s\/?d|nd|n\/?d|-+|na)$/i.test(t)) return null;
    t = t.replace(/^[<>≤≥~]=?/, '');
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '');   // 1.234,5
    t = t.replace(',', '.');
    var n = parseFloat(t);
    return isFinite(n) ? n : null;
  }
  function unico(arr) { var v = {}; return arr.filter(function (x) { if (x === '' || x == null || v[x]) return false; v[x] = 1; return true; }); }
  function ordenarTexto(a, b) { return String(a).localeCompare(String(b), 'es', { numeric: true }); }
  function hoyISO() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fechaTxt(iso) { if (!iso) return ''; var p = String(iso).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso; }
  function toast(t) {
    var el = $('toast'); el.textContent = t; el.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(function () { el.hidden = true; }, 3500);
  }

  // ---------- Datos ----------
  var datos = leer(CLAVES.analisis, []) || [];
  var nutrientes = leer(CLAVES.nutrientes, null) || JSON.parse(JSON.stringify(NUTRIENTES_INICIALES));

  function guardarDatos() { guardar(CLAVES.analisis, datos); }
  function nutPorId(id) { for (var i = 0; i < nutrientes.length; i++) if (nutrientes[i].id === id) return nutrientes[i]; return null; }
  function etiquetaNut(n) { return n.corto + (n.unidad ? ' (' + n.unidad + ')' : ''); }
  function ensayoDe(r) { return r.ensayo || (r.campo + ' · ' + (r.campania || 'sin campaña')); }
  function anioDe(r) {
    if (r.fecha) return String(r.fecha).slice(0, 4);
    var m = String(r.campania || '').match(/(19|20)\d{2}/);
    if (m) return m[0];
    m = String(r.campania || '').match(/^(\d{2})\s*[\/-]/);
    return m ? '20' + m[1] : '';
  }
  // Campaña agrícola a partir de la fecha de muestreo (julio a junio): 14/10/2022 → 2022/23.
  function campaniaDeFecha(iso) {
    if (!iso) return '';
    var y = Number(String(iso).slice(0, 4)), m = Number(String(iso).slice(5, 7));
    if (!y) return '';
    var ini = m >= 7 ? y : y - 1;
    return ini + '/' + String(ini + 1).slice(2);
  }
  // Completa valores que se pueden calcular: PSI = Na / CIC × 100.
  function completarCalculados(r) {
    if (r.v.psi == null && r.v.na != null && r.v.cic) r.v.psi = Math.round(r.v.na * 1000 / r.v.cic) / 10;
  }
  function nutsConDatos(lista) {
    return nutrientes.filter(function (n) { return lista.some(function (r) { return r.v && r.v[n.id] != null; }); });
  }

  // Clasifica un valor: k = bajo (problema), medio, bien, alto (alcalino); txt = texto que se muestra.
  function clasificar(n, v) {
    if (v == null || isNaN(v) || n.tipo === 'info') return null;
    var b = Number(n.bajo), a = Number(n.alto);
    if (n.tipo === 'rango') {
      if (v < b) return { k: 'bajo', txt: n.id === 'ph' ? 'Ácido' : 'Bajo' };
      if (v > a) return { k: 'alto', txt: n.id === 'ph' ? 'Alcalino' : 'Alto' };
      return { k: 'bien', txt: 'Óptimo' };
    }
    if (n.tipo === 'menos') {
      if (v < b) return { k: 'bien', txt: 'Normal' };
      if (v < a) return { k: 'medio', txt: 'Moderado' };
      return { k: 'bajo', txt: 'Elevado' };
    }
    if (v < b) return { k: 'bajo', txt: 'Bajo' };
    if (v < a) return { k: 'medio', txt: 'Medio' };
    return { k: 'bien', txt: 'Adecuado' };
  }
  function textoRango(n) {
    var u = n.unidad ? ' ' + n.unidad : '';
    if (n.tipo === 'info') return 'sin interpretación';
    if (n.tipo === 'rango') return 'óptimo entre ' + fmt(n.bajo) + ' y ' + fmt(n.alto) + u;
    if (n.tipo === 'menos') return 'normal menos de ' + fmt(n.bajo) + u + ', elevado desde ' + fmt(n.alto) + u;
    return 'bajo menos de ' + fmt(n.bajo) + u + ', adecuado desde ' + fmt(n.alto) + u;
  }

  // Estadística de un nutriente sobre una lista de análisis.
  function estad(n, lista) {
    var vals = [], cuenta = { bajo: 0, medio: 0, bien: 0, alto: 0 };
    lista.forEach(function (r) {
      var v = r.v ? r.v[n.id] : null;
      if (v == null) return;
      vals.push(v);
      var c = clasificar(n, v);
      if (c) cuenta[c.k]++;
    });
    var prom = promedio(vals);
    return {
      n: vals.length, prom: prom,
      min: vals.length ? Math.min.apply(null, vals) : null,
      max: vals.length ? Math.max.apply(null, vals) : null,
      cuenta: cuenta, estado: clasificar(n, prom)
    };
  }

  // ---------- Filtros ----------
  var estado = { vista: 'panel', campo: '', ensSel: null, compPor: 'campania' };

  function filtrados() {
    var t = norm($('f-texto').value), c = $('f-campo').value, ca = $('f-campania').value, an = $('f-anio').value;
    return datos.filter(function (r) {
      if (c && r.campo !== c) return false;
      if (ca && r.campania !== ca) return false;
      if (an && anioDe(r) !== an) return false;
      if (t && norm([r.campo, r.lote, r.ensayo, r.campania, r.obs, r.prof].join(' ')).indexOf(t) < 0) return false;
      return true;
    });
  }
  function nutFiltro() { return $('f-nutriente').value; }

  function llenarSelect(sel, opciones, todos) {
    var actual = sel.value;
    sel.innerHTML = '<option value="">' + esc(todos) + '</option>' + opciones.map(function (o) {
      var v = typeof o === 'object' ? o.v : o, t = typeof o === 'object' ? o.t : o;
      return '<option value="' + esc(v) + '">' + esc(t) + '</option>';
    }).join('');
    sel.value = opciones.some(function (o) { return (typeof o === 'object' ? o.v : o) === actual; }) ? actual : '';
  }

  function actualizarFiltros() {
    llenarSelect($('f-campo'), unico(datos.map(function (r) { return r.campo; })).sort(ordenarTexto), 'Todos los campos');
    llenarSelect($('f-campania'), unico(datos.map(function (r) { return r.campania; })).sort(ordenarTexto).reverse(), 'Todas las campañas');
    llenarSelect($('f-anio'), unico(datos.map(anioDe)).sort().reverse(), 'Todos los años');
    var conDatos = nutsConDatos(datos);
    llenarSelect($('f-nutriente'), (conDatos.length ? conDatos : nutrientes).map(function (n) { return { v: n.id, t: n.nombre + (n.corto !== n.nombre ? ' (' + n.corto + ')' : '') }; }), 'Todos los nutrientes');
    $('lista-campos').innerHTML = unico(datos.map(function (r) { return r.campo; })).sort(ordenarTexto).map(function (x) { return '<option value="' + esc(x) + '">'; }).join('');
    $('lista-campanias').innerHTML = unico(datos.map(function (r) { return r.campania; })).sort(ordenarTexto).map(function (x) { return '<option value="' + esc(x) + '">'; }).join('');
    $('lista-ensayos').innerHTML = unico(datos.map(function (r) { return r.ensayo; })).sort(ordenarTexto).map(function (x) { return '<option value="' + esc(x) + '">'; }).join('');
  }

  // ---------- Armado de cada evaluación ----------
  // Cada vista devuelve: { titulo, opciones (html), puntos [texto], grafico, leyenda, tablas [{titulo, head, body, estados}] }
  function celdaValor(n, v) { var c = clasificar(n, v); return { t: fmt(v), k: c ? c.k : null }; }
  function textoReparto(s) {
    var p = [];
    ['bajo', 'medio', 'bien', 'alto'].forEach(function (k) { if (s.cuenta[k]) p.push(pct(s.cuenta[k], s.n) + '% ' + NOMBRE_ESTADO[k].toLowerCase()); });
    return p.join(' · ');
  }
  function femenino(n) { return /^(materia|capacidad|conductividad|saturaci|relaci|arena|arcilla|humedad)/i.test(norm(n.nombre)); }
  function nombreProblema(n) { var f = femenino(n); return n.tipo === 'menos' ? (f ? 'elevada' : 'elevado') : n.id === 'ph' ? 'ácido' : (f ? 'baja' : 'bajo'); }

  function puntosDeConjunto(lista, nuts) {
    var puntos = [], bien = [];
    nuts.forEach(function (n) {
      var s = estad(n, lista);
      if (!s.n || n.tipo === 'info') return;
      var u = n.unidad ? ' ' + n.unidad : '';
      var pb = pct(s.cuenta.bajo, s.n), pa = pct(s.cuenta.alto, s.n);
      if (pb >= 25) {
        var rec = n.id === 'ph' ? 'evaluar encalado.' : n.tipo === 'menos' ? 'elegir cultivos tolerantes y cuidar el manejo del agua.' : (RECOMENDACION[n.id] || 'evaluar su corrección.');
        puntos.push('<b>' + esc(n.nombre) + '</b>: ' + pb + '% de las muestras en nivel ' + nombreProblema(n) + ' (promedio ' + fmt(s.prom) + u + '; ' + textoRango(n) + '). Sugerencia: ' + rec);
      } else if (pa >= 25) {
        puntos.push('<b>' + esc(n.nombre) + '</b>: ' + pa + '% de las muestras alcalinas (promedio ' + fmt(s.prom) + u + '). Menor disponibilidad de fósforo, zinc y boro.');
      } else if (s.cuenta.medio && pct(s.cuenta.medio, s.n) >= 40) {
        puntos.push('<b>' + esc(n.nombre) + '</b>: mayormente en nivel medio (promedio ' + fmt(s.prom) + u + '); conviene seguirlo de cerca.');
      } else bien.push(n.corto);
    });
    if (bien.length) puntos.push('Niveles mayormente adecuados en: <b>' + esc(bien.join(', ')) + '</b>.');
    return puntos;
  }

  function resumenLista(lista) {
    var campos = unico(lista.map(function (r) { return r.campo; })), lotes = unico(lista.map(function (r) { return r.campo + '|' + r.lote; }));
    var camps = unico(lista.map(function (r) { return r.campania; })).sort(ordenarTexto);
    return lista.length + (lista.length === 1 ? ' muestra' : ' muestras') + ' de ' + campos.length + (campos.length === 1 ? ' campo' : ' campos') +
      ' y ' + lotes.length + (lotes.length === 1 ? ' lote' : ' lotes') + (camps.length ? ' (campaña ' + camps.join(', ') + ')' : '') + '.';
  }

  function vistaGeneral(lista) {
    var nf = nutFiltro(), nuts = nutsConDatos(lista).filter(function (n) { return !nf || n.id === nf; });
    var r = { titulo: VISTAS.general, puntos: [], tablas: [] };
    if (!lista.length) { r.puntos.push('No hay análisis que coincidan con la búsqueda.'); return r; }
    r.puntos.push('Se evaluaron ' + resumenLista(lista));
    r.puntos = r.puntos.concat(puntosDeConjunto(lista, nuts));

    var filas = [], est = [], cats = [], partes = { bajo: [], medio: [], bien: [], alto: [] }, info = [];
    nuts.forEach(function (n) {
      var s = estad(n, lista);
      filas.push([n.nombre + (n.corto !== n.nombre ? ' (' + n.corto + ')' : ''), n.unidad, String(s.n), fmt(s.prom), fmt(s.min), fmt(s.max), s.estado ? s.estado.txt : '–', textoReparto(s)]);
      est.push([null, null, null, s.estado && s.estado.k, null, null, s.estado && s.estado.k, null]);
      if (n.tipo === 'info') return;
      cats.push(n.corto);
      ['bajo', 'medio', 'bien', 'alto'].forEach(function (k) { partes[k].push(s.n ? s.cuenta[k] * 100 / s.n : 0); });
      info.push(s);
    });
    r.tablas.push({ titulo: 'Resumen por nutriente', head: ['Nutriente', 'Unidad', 'Muestras', 'Promedio', 'Mínimo', 'Máximo', 'Estado del promedio', 'Reparto de las muestras'], body: filas, estados: est, numeros: [2, 3, 4, 5] });

    var hayAlc = partes.alto.some(function (x) { return x > 0; });
    r.grafico = {
      tipo: 'apilado', titulo: 'Reparto de las muestras por nivel (%)', cats: cats,
      series: ['bajo', 'medio', 'bien', 'alto'].filter(function (k) { return k !== 'alto' || hayAlc; }).map(function (k) {
        return { nombre: NOMBRE_ESTADO[k], color: COLORES[k], vals: partes[k], cuentas: info.map(function (s) { return s.cuenta[k]; }) };
      })
    };

    // Promedio por campo
    var campos = unico(lista.map(function (x) { return x.campo; })).sort(ordenarTexto);
    if (campos.length > 1) {
      var body = [], e2 = [];
      campos.forEach(function (c) {
        var sub = lista.filter(function (x) { return x.campo === c; }), fila = [c, String(sub.length)], ef = [null, null];
        nuts.forEach(function (n) { var s = estad(n, sub); fila.push(fmt(s.prom)); ef.push(s.estado && s.estado.k); });
        body.push(fila); e2.push(ef);
      });
      r.tablas.push({ titulo: 'Promedio por campo', head: ['Campo', 'Muestras'].concat(nuts.map(etiquetaNut)), body: body, estados: e2, numeros: nuts.map(function (_, i) { return i + 2; }).concat([1]) });
    }
    return r;
  }

  function nutDeVista(lista) {
    var nf = nutFiltro();
    if (nf && nutPorId(nf)) return nutPorId(nf);
    var conDatos = nutsConDatos(lista);
    var pref = ['p', 'n', 'mo', 'ph', 's'];
    for (var i = 0; i < pref.length; i++) { var n = nutPorId(pref[i]); if (n && conDatos.indexOf(n) >= 0) return n; }
    return conDatos.filter(function (x) { return x.tipo !== 'info'; })[0] || conDatos[0] || null;
  }
  function selectNutrienteHTML(lista, actual) {
    var conDatos = nutsConDatos(lista);
    return '<label>Nutriente del gráfico <select data-op="nut">' + conDatos.map(function (n) {
      return '<option value="' + esc(n.id) + '"' + (actual && actual.id === n.id ? ' selected' : '') + '>' + esc(n.nombre + (n.corto !== n.nombre ? ' (' + n.corto + ')' : '')) + '</option>';
    }).join('') + '</select></label>';
  }
  function graficoBarras(n, etiquetas, valores, titulo, detalles) {
    var lineas = [];
    if (n.tipo === 'info') { /* sin límites */ }
    else if (n.tipo === 'rango') { lineas.push({ v: Number(n.bajo), t: 'mín. óptimo ' + fmt(n.bajo) }); lineas.push({ v: Number(n.alto), t: 'máx. óptimo ' + fmt(n.alto) }); }
    else if (n.tipo === 'menos') { lineas.push({ v: Number(n.bajo), t: 'normal hasta ' + fmt(n.bajo) }); lineas.push({ v: Number(n.alto), t: 'elevado desde ' + fmt(n.alto) }); }
    else { lineas.push({ v: Number(n.bajo), t: 'bajo menos de ' + fmt(n.bajo) }); lineas.push({ v: Number(n.alto), t: 'adecuado desde ' + fmt(n.alto) }); }
    return {
      tipo: 'barras', titulo: titulo, cats: etiquetas, vals: valores, unidad: n.unidad, detalles: detalles || [],
      colores: valores.map(function (v) { var c = clasificar(n, v); return c ? COLORES[c.k] : '#5B5B5F'; }),
      estados: valores.map(function (v) { var c = clasificar(n, v); return c ? c.txt : 'Sin interpretación'; }),
      lineas: lineas
    };
  }

  function vistaCampo(lista) {
    var campos = unico(lista.map(function (x) { return x.campo; })).sort(ordenarTexto);
    var r = { titulo: VISTAS.campo, puntos: [], tablas: [] };
    if (!campos.length) { r.puntos.push('No hay análisis que coincidan con la búsqueda.'); return r; }
    if (campos.indexOf(estado.campo) < 0) estado.campo = $('f-campo').value || campos[0];
    var sub = lista.filter(function (x) { return x.campo === estado.campo; });
    var n = nutDeVista(sub);
    r.opciones = '<label>Campo <select data-op="campo">' + campos.map(function (c) { return '<option' + (c === estado.campo ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select></label>' + selectNutrienteHTML(sub, n);
    r.titulo = VISTAS.campo + ': ' + estado.campo;
    r.puntos.push('Campo <b>' + esc(estado.campo) + '</b>: ' + resumenLista(sub));
    var nf = nutFiltro(), nuts = nutsConDatos(sub).filter(function (x) { return !nf || x.id === nf; });
    r.puntos = r.puntos.concat(puntosDeConjunto(sub, nuts));

    var orden = sub.slice().sort(function (a, b) { return ordenarTexto(a.campania, b.campania) || ordenarTexto(a.lote, b.lote); });
    var variasCamp = unico(orden.map(function (x) { return x.campania; })).length > 1;
    var body = [], est = [];
    orden.forEach(function (x) {
      var fila = [x.lote || '–', x.campania || '', fechaTxt(x.fecha), x.ensayo || ''], ef = [null, null, null, null];
      nuts.forEach(function (m) { var c = celdaValor(m, x.v[m.id]); fila.push(c.t); ef.push(c.k); });
      body.push(fila); est.push(ef);
    });
    var prom = ['Promedio', '', '', ''], ep = [null, null, null, null];
    nuts.forEach(function (m) { var s = estad(m, sub); prom.push(fmt(s.prom)); ep.push(s.estado && s.estado.k); });
    body.push(prom); est.push(ep);
    r.tablas.push({ titulo: 'Lotes de ' + estado.campo, head: ['Lote', 'Campaña', 'Fecha', 'Ensayo'].concat(nuts.map(etiquetaNut)), body: body, estados: est, ultimaPromedio: true, numeros: nuts.map(function (_, i) { return i + 4; }) });

    if (n) {
      var conValor = orden.filter(function (x) { return x.v[n.id] != null; });
      r.grafico = graficoBarras(n, conValor.map(function (x) { return (x.lote || 's/lote') + (variasCamp ? ' · ' + x.campania : ''); }),
        conValor.map(function (x) { return x.v[n.id]; }), n.nombre + ' por lote' + (n.unidad ? ' (' + n.unidad + ')' : ''),
        conValor.map(function (x) { return x.campania + (x.ensayo ? ' · ' + x.ensayo : ''); }));
    }
    return r;
  }

  function vistaNutriente(lista) {
    var r = { titulo: VISTAS.nutriente, puntos: [], tablas: [] };
    var n = nutDeVista(lista);
    if (!n) { r.puntos.push('No hay análisis que coincidan con la búsqueda.'); return r; }
    r.opciones = selectNutrienteHTML(lista, n);
    r.titulo = VISTAS.nutriente + ': ' + n.nombre;
    var conValor = lista.filter(function (x) { return x.v[n.id] != null; });
    var s = estad(n, conValor), u = n.unidad ? ' ' + n.unidad : '';
    r.puntos.push('<b>' + esc(n.nombre) + '</b> en ' + s.n + ' muestras: promedio ' + fmt(s.prom) + u + ' (de ' + fmt(s.min) + ' a ' + fmt(s.max) + u + '), estado del promedio: <b>' + (s.estado ? s.estado.txt.toLowerCase() : '–') + '</b>.');
    r.puntos.push('Reparto: ' + textoReparto(s) + '. Criterio: ' + textoRango(n) + '.');
    var pb = pct(s.cuenta.bajo, s.n);
    if (pb >= 25) r.puntos.push('Sugerencia: ' + (n.id === 'ph' ? 'evaluar encalado en los lotes ácidos.' : n.tipo === 'menos' ? 'elegir cultivos tolerantes en los lotes con valores elevados.' : (RECOMENDACION[n.id] || 'evaluar su corrección.')));

    var campos = unico(conValor.map(function (x) { return x.campo; })).sort(ordenarTexto);
    var porLote = campos.length === 1;
    var grupos = porLote ? conValor.map(function (x) { return { t: (x.lote || 's/lote') + ' · ' + x.campania, l: [x], det: x.campo + (x.ensayo ? ' · ' + x.ensayo : '') }; })
      : campos.map(function (c) { var l = conValor.filter(function (x) { return x.campo === c; }); return { t: c, l: l, det: l.length + ' muestras' }; });
    var stats = grupos.map(function (g) { return estad(n, g.l); });
    if (!porLote && campos.length > 1) {
      var iMax = 0, iMin = 0;
      stats.forEach(function (st, i) { if (st.prom > stats[iMax].prom) iMax = i; if (st.prom < stats[iMin].prom) iMin = i; });
      r.puntos.push('Mayor promedio: <b>' + esc(grupos[iMax].t) + '</b> (' + fmt(stats[iMax].prom) + u + '). Menor promedio: <b>' + esc(grupos[iMin].t) + '</b> (' + fmt(stats[iMin].prom) + u + ').');
    }
    if (!porLote && campos.length > 15) {
      // Muchos campos: el gráfico muestra la evolución por campaña; la tabla sigue por campo.
      var camps = unico(conValor.map(function (x) { return x.campania; })).sort(ordenarTexto);
      var stc = camps.map(function (c) { return estad(n, conValor.filter(function (x) { return x.campania === c; })); });
      r.grafico = graficoBarras(n, camps, stc.map(function (st) { return st.prom; }), n.nombre + ' promedio por campaña' + (n.unidad ? ' (' + n.unidad + ')' : ''),
        stc.map(function (st) { return st.n + ' muestras · ' + textoReparto(st); }));
      if (camps.length > 1) r.puntos.push('Evolución: ' + camps.map(function (c, i) { return c + ' ' + fmt(stc[i].prom); }).join(' → ') + (n.unidad ? ' ' + n.unidad : '') + '. Elegí un campo en la búsqueda para ver sus lotes.');
    } else {
      r.grafico = graficoBarras(n, grupos.map(function (g) { return g.t; }), stats.map(function (st) { return st.prom; }),
        n.nombre + (porLote ? ' por lote' : ' promedio por campo') + (n.unidad ? ' (' + n.unidad + ')' : ''), grupos.map(function (g) { return g.det; }));
    }

    var body = [], est = [];
    grupos.forEach(function (g, i) {
      var st = stats[i];
      body.push([g.t, String(st.n), fmt(st.prom), fmt(st.min), fmt(st.max), st.estado ? st.estado.txt : '–', textoReparto(st)]);
      est.push([null, null, st.estado && st.estado.k, null, null, st.estado && st.estado.k, null]);
    });
    r.tablas.push({ titulo: n.nombre + (porLote ? ' por lote' : ' por campo') + (n.unidad ? ' (' + n.unidad + ')' : ''), head: [porLote ? 'Lote' : 'Campo', 'Muestras', 'Promedio', 'Mínimo', 'Máximo', 'Estado', 'Reparto'], body: body, estados: est, numeros: [1, 2, 3, 4] });
    return r;
  }

  function vistaComparar(lista) {
    var r = { titulo: VISTAS.comparar, puntos: [], tablas: [] };
    var por = estado.compPor;
    var claveDe = por === 'campania' ? function (x) { return x.campania || 'sin campaña'; } : por === 'campo' ? function (x) { return x.campo; } : ensayoDe;
    var nombrePor = { ensayo: 'ensayos', campania: 'campañas', campo: 'campos' }[por];
    var ensayos = unico(lista.map(claveDe)).sort(ordenarTexto);
    var selPor = '<label>Comparar <select data-op="por">' + [['campania', 'Campañas'], ['campo', 'Campos'], ['ensayo', 'Ensayos']].map(function (o) {
      return '<option value="' + o[0] + '"' + (por === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>';
    if (!ensayos.length) { r.opciones = selPor; r.puntos.push('No hay análisis que coincidan con la búsqueda.'); return r; }
    if (!estado.ensSel || !estado.ensSel.some(function (e) { return ensayos.indexOf(e) >= 0; })) estado.ensSel = por === 'campania' ? ensayos.slice(-2) : ensayos.slice(0, 2);
    var sel = estado.ensSel.filter(function (e) { return ensayos.indexOf(e) >= 0; });
    r.opciones = selPor + '<div class="multi-caja"><label>' + (por === 'ensayo' ? 'Ensayos' : por === 'campo' ? 'Campos' : 'Campañas') + ' a comparar ' +
      '<small>' + (por === 'ensayo' ? '(nombre de la columna «Ensayo»; si no tiene, se agrupa por campo y campaña)' : '') + (ensayos.length > 20 ? ' Para acortar la lista, usá la búsqueda de arriba.' : '') + '</small></label><div class="multi">' +
      ensayos.map(function (e) { return '<label><input type="checkbox" data-op="ens" value="' + esc(e) + '"' + (sel.indexOf(e) >= 0 ? ' checked' : '') + '> ' + esc(e) + '</label>'; }).join('') + '</div></div>';
    if (sel.length < 2) { r.puntos.push('Marcá al menos dos ' + nombrePor + ' para compararlos.'); return r; }
    var grupos = sel.map(function (e) { return lista.filter(function (x) { return claveDe(x) === e; }); });
    var todos = [].concat.apply([], grupos);
    var nf = nutFiltro(), nuts = nutsConDatos(todos).filter(function (n) { return !nf || n.id === nf; });
    var n = nutDeVista(todos);
    r.opciones += selectNutrienteHTML(todos, n);
    r.titulo = 'Comparación de ' + nombrePor;
    r.puntos.push('Se comparan ' + sel.length + ' ' + nombrePor + ': ' + sel.map(function (e, i) { return '<b>' + esc(e) + '</b> (' + grupos[i].length + ' muestras)'; }).join(', ') + '.');

    var head = ['Nutriente'].concat(sel), body = [], est = [];
    if (sel.length === 2) head.push('Diferencia');
    nuts.forEach(function (m) {
      var st = grupos.map(function (g) { return estad(m, g); });
      var fila = [m.corto + (m.unidad ? ' (' + m.unidad + ')' : '')], ef = [null];
      st.forEach(function (s) { fila.push(s.n ? fmt(s.prom) + (s.estado ? ' · ' + s.estado.txt : '') : '–'); ef.push(s.estado && s.estado.k); });
      var conProm = st.map(function (s, i) { return { s: s, e: sel[i] }; }).filter(function (o) { return o.s.n; });
      if (sel.length === 2) {
        if (st[0].n && st[1].n) {
          var dif = st[1].prom - st[0].prom, dp = st[0].prom ? dif * 100 / Math.abs(st[0].prom) : null;
          fila.push((dif > 0 ? '+' : '') + fmt(dif) + (dp != null ? ' (' + (dp > 0 ? '+' : '') + Math.round(dp) + '%)' : ''));
        } else fila.push('–');
        ef.push(null);
      }
      body.push(fila); est.push(ef);
      if (conProm.length >= 2) {
        conProm.sort(function (a, b) { return b.s.prom - a.s.prom; });
        var mayor = conProm[0], menor = conProm[conProm.length - 1];
        var rel = menor.s.prom ? (mayor.s.prom - menor.s.prom) * 100 / Math.abs(menor.s.prom) : 100;
        var cambia = !!(mayor.s.estado && menor.s.estado && mayor.s.estado.k !== menor.s.estado.k);
        if (rel >= 15 || cambia) {
          r.puntos.push('<b>' + esc(m.nombre) + '</b>: ' + esc(mayor.e) + ' ' + fmt(mayor.s.prom) + ' vs ' + esc(menor.e) + ' ' + fmt(menor.s.prom) + (m.unidad ? ' ' + m.unidad : '') +
            ' (' + Math.round(rel) + '% más' + (cambia ? '; ' + esc(mayor.e) + ' ' + mayor.s.estado.txt.toLowerCase() + ', ' + esc(menor.e) + ' ' + menor.s.estado.txt.toLowerCase() : '') + ').');
        }
      }
    });
    if (r.puntos.length === 1) r.puntos.push('Tienen valores parecidos en todos los nutrientes (diferencias menores al 15%).');
    r.tablas.push({ titulo: 'Promedio por ' + { ensayo: 'ensayo', campania: 'campaña', campo: 'campo' }[por], head: head, body: body, estados: est, numeros: [] });
    if (n) {
      var stn = grupos.map(function (g) { return estad(n, g); });
      r.grafico = graficoBarras(n, sel, stn.map(function (s) { return s.prom; }), n.nombre + ' promedio por ' + { ensayo: 'ensayo', campania: 'campaña', campo: 'campo' }[por] + (n.unidad ? ' (' + n.unidad + ')' : ''),
        stn.map(function (s) { return s.n + ' muestras'; }));
    }
    return r;
  }

  // =====================================================================
  // ---------- Panel experto: diagnóstico agronómico automático ----------
  // Reglas de interpretación de suelos (sin servicios externos). Todo es orientativo.
  // =====================================================================
  var CLAVE_PANEL = 'suelos.panel';
  var panelCfg = Object.assign({ pObj: null, factorP: 3, xDisp: '', yDisp: '', ranking: 'bajos' }, leer(CLAVE_PANEL, {}) || {});
  function guardarPanel() { guardar(CLAVE_PANEL, panelCfg); }

  var NIVELES = {
    critico: { t: 'Crítico', icono: '!', orden: 0 },
    atencion: { t: 'Atención', icono: '▲', orden: 1 },
    info: { t: 'Dato', icono: 'i', orden: 2 },
    bien: { t: 'Fortaleza', icono: '✓', orden: 3 },
    oportunidad: { t: 'Oportunidad', icono: '$', orden: 0 },
    accion: { t: 'Acción', icono: '›', orden: 1 },
    riesgo: { t: 'Riesgo', icono: '!', orden: 2 },
    objecion: { t: 'Objeciones', icono: '?', orden: 2 }
  };
  var PUNTAJE = { bien: 100, medio: 60, alto: 60, bajo: 20 };
  var CLAVE_INDICE = ['p', 'n', 's', 'zn', 'mo', 'ph', 'ce', 'b', 'psi'];

  // Ambiente a partir del nombre del lote (LOMA, M.LOMA, BAJO, ALTA P, etc.)
  function ambienteDe(r) {
    var t = ' ' + norm(r.lote) + ' ';
    if (/ (m loma|media loma|medialoma|mloma|ml) /.test(t)) return 'Media loma';
    if (/ (bajo|bajos|bajo alto|tendido) /.test(t)) return 'Bajo';
    if (/ (loma|lomas) /.test(t)) return 'Loma';
    if (/ alta( p| prod| productividad)? /.test(t)) return 'Alta productividad';
    if (/ media( p| prod| productividad) /.test(t)) return 'Media productividad';
    if (/ baja( p| prod| productividad)? /.test(t)) return 'Baja productividad';
    return '';
  }
  var ORDEN_AMB = ['Loma', 'Media loma', 'Bajo', 'Alta productividad', 'Media productividad', 'Baja productividad'];
  var FAMILIAS_AMB = [['Loma', 'Media loma', 'Bajo'], ['Alta productividad', 'Media productividad', 'Baja productividad']];
  // Devuelve la familia de ambientes con datos suficientes (primero relieve, después productividad).
  function familiaAmbientes(lista, minimo) {
    for (var i = 0; i < FAMILIAS_AMB.length; i++) {
      var f = FAMILIAS_AMB[i].filter(function (a) { return lista.filter(function (x) { return ambienteDe(x) === a; }).length >= minimo; });
      if (f.length >= 2) return f;
    }
    return [];
  }

  function indiceMuestra(r) {
    var pts = [];
    CLAVE_INDICE.forEach(function (id) {
      var n = nutPorId(id);
      if (!n || n.tipo === 'info' || r.v[id] == null) return;
      var c = clasificar(n, r.v[id]);
      if (c) pts.push(PUNTAJE[c.k]);
    });
    return pts.length >= 2 ? promedio(pts) : null;
  }
  function nivelIndice(v) { return v == null ? null : v < 50 ? 'bajo' : v < 75 ? 'medio' : 'bien'; }
  function textoIndice(v) { return v == null ? '–' : v < 50 ? 'Bajo' : v < 75 ? 'Medio' : 'Bueno'; }

  function pearson(xs, ys) {
    var n = xs.length; if (n < 3) return null;
    var mx = promedio(xs), my = promedio(ys), sxy = 0, sxx = 0, syy = 0;
    for (var i = 0; i < n; i++) { var dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
    if (!sxx || !syy) return null;
    return { r: sxy / Math.sqrt(sxx * syy), b: sxy / sxx, a: my - (sxy / sxx) * mx };
  }
  function cuantil(arr, q) { var s = arr.slice().sort(function (a, b) { return a - b; }); var p = (s.length - 1) * q, i = Math.floor(p); return s[i] + (s[Math.min(i + 1, s.length - 1)] - s[i]) * (p - i); }
  function desvio(arr) { var m = promedio(arr); return Math.sqrt(promedio(arr.map(function (x) { return (x - m) * (x - m); }))); }
  function valoresDe(lista, id) { return lista.map(function (r) { return r.v[id]; }).filter(function (v) { return v != null; }); }
  function listarCorto(arr, max) { max = max || 4; return arr.slice(0, max).join(', ') + (arr.length > max ? ' y ' + (arr.length - max) + ' más' : ''); }
  // Para cada campo, sus muestras de la campaña más reciente (dentro de la búsqueda).
  function ultimaCampaniaPorCampo(lista) {
    var porCampo = {};
    lista.forEach(function (r) { (porCampo[r.campo] = porCampo[r.campo] || []).push(r); });
    return Object.keys(porCampo).sort(ordenarTexto).map(function (c) {
      var l = porCampo[c], camps = unico(l.map(function (x) { return x.campania; })).sort(ordenarTexto), ult = camps[camps.length - 1];
      return { campo: c, campania: ult, muestras: l.filter(function (x) { return x.campania === ult; }), todas: l, campanias: camps };
    });
  }

  function vistaPanel(lista) {
    var r = { titulo: 'Panel experto: diagnóstico de suelos', puntos: [], tablas: [], graficos: [], kpis: [], conclusiones: [] };
    if (!lista.length) { r.puntos.push('No hay análisis que coincidan con la búsqueda. Cargá datos o cambiá los filtros.'); return r; }
    var C = r.conclusiones;
    function concluir(nivel, titulo, texto, accion) { C.push({ nivel: nivel, titulo: titulo, texto: texto, accion: accion || '' }); }
    var nP = nutPorId('p'), pObj = panelCfg.pObj != null ? panelCfg.pObj : (nP ? Number(nP.alto) : 20);
    var evaluables = nutsConDatos(lista).filter(function (n) { return n.tipo !== 'info'; });
    var campos = unico(lista.map(function (x) { return x.campo; })), camps = unico(lista.map(function (x) { return x.campania; })).sort(ordenarTexto);

    // ----- Indicadores -----
    var indices = lista.map(indiceMuestra).filter(function (v) { return v != null; });
    var indProm = promedio(indices);
    r.kpis.push({ t: 'Muestras analizadas', v: String(lista.length), sub: campos.length + ' campos · ' + camps.length + ' campañas' });
    r.kpis.push({ t: 'Índice de fertilidad', v: indProm == null ? '–' : String(Math.round(indProm)), sub: indProm == null ? 'Faltan datos' : textoIndice(indProm) + ' (0 a 100)', k: nivelIndice(indProm) });
    var limitantes = evaluables.map(function (n) { var s = estad(n, lista); return { n: n, s: s, pb: s.n ? s.cuenta.bajo / s.n : 0 }; })
      .filter(function (o) { return o.s.n >= 3; }).sort(function (a, b) { return b.pb - a.pb; });
    if (limitantes.length && limitantes[0].pb > 0) {
      var L = limitantes[0];
      r.kpis.push({ t: 'Principal limitante', v: L.n.corto, sub: Math.round(L.pb * 100) + '% de las muestras en nivel ' + nombreProblema(L.n), k: L.pb >= 0.5 ? 'bajo' : 'medio' });
    }
    ['p', 'mo'].forEach(function (id) {
      var n = nutPorId(id); if (!n) return;
      var s = estad(n, lista); if (!s.n) return;
      var med = cuantil(valoresDe(lista, id), 0.5), cm = clasificar(n, med);
      r.kpis.push({ t: n.nombre + ' (mediana)', v: fmt(med) + (n.unidad ? ' ' + n.unidad : ''), sub: pct(s.cuenta.bajo, s.n) + '% ' + nombreProblema(n) + ' · promedio ' + fmt(s.prom), k: cm && cm.k });
    });
    var nPh = nutPorId('ph');
    if (nPh) { var sph = estad(nPh, lista); if (sph.n) r.kpis.push({ t: 'pH', v: fmt(sph.prom, 1), sub: pct(sph.cuenta.bien, sph.n) + '% en rango óptimo', k: sph.estado && sph.estado.k }); }

    // ----- 1. Deficiencias -----
    limitantes.forEach(function (o) {
      var n = o.n, s = o.s, u = n.unidad ? ' ' + n.unidad : '', p100 = Math.round(o.pb * 100);
      if (n.id === 'ph' || n.tipo === 'menos') return;
      if (o.pb < 0.25) return;
      if (n.id === 'ct' && valoresDe(lista, 'mo').length) return;   // el carbono es la MO / 1,724: no repetir
      var camposAf = campos.filter(function (c) { var st = estad(n, lista.filter(function (x) { return x.campo === c; })); return st.estado && st.estado.k === 'bajo'; });
      var accion = RECOMENDACION[n.id] ? 'Sugerencia: ' + RECOMENDACION[n.id] : 'Evaluar su corrección.';
      if (n.id === 'p') {
        var bajos = valoresDe(lista, 'p').filter(function (v) { return v < pObj; });
        var dosis = bajos.length ? (pObj - promedio(bajos)) * panelCfg.factorP / 0.227 : 0;
        accion = 'Sugerencia: fertilización fosforada. En las muestras debajo de ' + fmt(pObj) + ' ppm, llevar el P al objetivo requiere en promedio ~' + Math.round(dosis / 5) * 5 + ' kg/ha de fosfato monoamónico (construcción), más la reposición de lo que extrae el cultivo. Ver «Plan de fertilización».';
      }
      if (n.id === 'n') accion = 'Sugerencia: el N disponible (0–20 cm) promedio es ~' + Math.round(s.prom * 2.6) + ' kg N/ha; ajustar la dosis de N según cultivo y rendimiento objetivo (en maíz, muestrear también 20–60 cm).';
      if (n.id === 's') accion = 'Sugerencia: aplicar 10–15 kg S/ha (≈ 60–80 kg/ha de yeso agrícola); el yeso además aporta calcio.';
      if (n.id === 'mo') accion += ' Con MO baja también baja la estabilidad de los agregados y la retención de agua.';
      concluir(o.pb >= 0.5 ? 'critico' : 'atencion', n.nombre + ' ' + nombreProblema(n) + ' en el ' + p100 + '% de las muestras',
        'Promedio ' + fmt(s.prom) + u + ' (' + textoRango(n) + '). ' + (camposAf.length ? camposAf.length + ' campos con promedio bajo: ' + esc(listarCorto(camposAf)) + '.' : ''), accion);
    });

    // ----- 2. pH, sales y sodio -----
    if (nPh) {
      var s2 = estad(nPh, lista);
      if (s2.n) {
        var pa = pct(s2.cuenta.bajo, s2.n), pal = pct(s2.cuenta.alto, s2.n);
        if (pa >= 15) concluir(pa >= 40 ? 'critico' : 'atencion', 'Acidez: ' + pa + '% de las muestras con pH menor a ' + fmt(nPh.bajo),
          'Con pH bajo baja la disponibilidad de P, Ca y Mg y se afecta la nodulación de leguminosas.', 'Sugerencia: evaluar encalado (dolomita si además el Mg es bajo) en esos lotes.');
        if (pal >= 15) concluir('atencion', 'Alcalinidad: ' + pal + '% de las muestras con pH mayor a ' + fmt(nPh.alto),
          'Con pH alto disminuye la disponibilidad de P, Zn, B y Fe.', 'Sugerencia: priorizar fuentes de P localizadas y micronutrientes (Zn, B); el yeso ayuda si hay sodio.');
        if (pa < 15 && pal < 15 && pct(s2.cuenta.bien, s2.n) >= 70) concluir('bien', 'pH en rango óptimo en el ' + pct(s2.cuenta.bien, s2.n) + '% de las muestras', 'Promedio ' + fmt(s2.prom, 1) + '.');
      }
    }
    ['ce', 'psi'].forEach(function (id) {
      var n = nutPorId(id); if (!n) return;
      var s = estad(n, lista); if (!s.n) return;
      var malos = lista.filter(function (x) { var c = clasificar(n, x.v[id]); return c && c.k !== 'bien'; });
      var pm = pct(malos.length, s.n);
      if (pm >= 5) {
        var cs = unico(malos.map(function (x) { return x.campo; }));
        concluir(pm >= 20 ? 'critico' : 'atencion', (id === 'ce' ? 'Salinidad' : 'Sodicidad') + ': ' + pm + '% de las muestras con ' + n.corto + ' sobre ' + fmt(n.bajo) + (n.unidad ? ' ' + n.unidad : ''),
          'Campos: ' + esc(listarCorto(cs)) + '.', id === 'ce' ? 'Sugerencia: elegir cultivos tolerantes (girasol y cebada toleran más que soja y maíz) y mantener cobertura.' : 'Sugerencia: aplicar yeso para desplazar el sodio y cuidar la estructura del suelo.');
      }
    });

    // ----- 3. Tendencia en campos con muestreos repetidos -----
    var porCampo = ultimaCampaniaPorCampo(lista);
    ['p', 'mo', 'ph'].forEach(function (id) {
      var n = nutPorId(id); if (!n) return;
      var cambios = [];
      porCampo.forEach(function (pc) {
        var cs = pc.campanias.filter(function (c) { return pc.todas.some(function (x) { return x.campania === c && x.v[id] != null; }); });
        if (cs.length < 2) return;
        var a = promedio(valoresDe(pc.todas.filter(function (x) { return x.campania === cs[0]; }), id));
        var b = promedio(valoresDe(pc.todas.filter(function (x) { return x.campania === cs[cs.length - 1]; }), id));
        cambios.push({ campo: pc.campo, a: a, b: b, d: a ? (b - a) / Math.abs(a) : 0 });
      });
      if (cambios.length < 3) return;
      var bajan = cambios.filter(function (c) { return c.d <= -0.1; }), suben = cambios.filter(function (c) { return c.d >= 0.1; });
      var ma = promedio(cambios.map(function (c) { return c.a; })), mb = promedio(cambios.map(function (c) { return c.b; }));
      var u = n.unidad ? ' ' + n.unidad : '';
      var texto = 'En ' + cambios.length + ' campos con más de una campaña muestreada, comparando la primera y la última: bajó en ' + bajan.length + ', subió en ' + suben.length + ' y se mantuvo en ' + (cambios.length - bajan.length - suben.length) + ' (promedio de ' + fmt(ma) + ' a ' + fmt(mb) + u + ').';
      if (id === 'ph') { if (bajan.length > suben.length * 2 && bajan.length >= 3) concluir('atencion', 'El pH tiende a bajar', texto, 'Sugerencia: seguir la acidificación (uso de fertilizantes amoniacales); evaluar encalado de mantenimiento.'); return; }
      if (bajan.length >= Math.max(3, suben.length * 1.5)) {
        concluir('atencion', n.nombre + ': tendencia a la baja', texto + (bajan.length ? ' Bajaron más: ' + esc(listarCorto(bajan.sort(function (x, y) { return x.d - y.d; }).map(function (c) { return c.campo + ' (' + Math.round(c.d * 100) + '%)'; }), 3)) + '.' : ''),
          id === 'p' ? 'Sugerencia: el balance de P es negativo; ajustar la reposición a lo que extraen los cultivos.' : 'Sugerencia: aumentar el aporte de rastrojos (gramíneas, cultivos de servicio) y reducir labranzas.');
      } else if (suben.length >= Math.max(3, bajan.length * 1.5)) {
        concluir('bien', n.nombre + ': tendencia a mejorar', texto);
      } else concluir('info', n.nombre + ': evolución en campos re-muestreados', texto);
    });

    // ----- 4. Variabilidad dentro del campo (dosis variable) -----
    if (nP) {
      var variables = [];
      porCampo.forEach(function (pc) {
        var vs = valoresDe(pc.muestras, 'p');
        if (vs.length < 4) return;
        var cv = desvio(vs) / promedio(vs);
        if (cv >= 0.5) variables.push(pc.campo + ' (' + fmt(Math.min.apply(null, vs)) + '–' + fmt(Math.max.apply(null, vs)) + ' ppm)');
      });
      if (variables.length) concluir('info', 'Alta variabilidad de fósforo dentro de ' + variables.length + (variables.length === 1 ? ' campo' : ' campos'),
        'En la última campaña muestreada, el P varía mucho entre lotes o ambientes: ' + esc(listarCorto(variables, 3)) + '.', 'Sugerencia: fertilizar por ambiente o con dosis variable en lugar de una dosis única por campo.');
    }

    // ----- 5. Ambientes -----
    var conAmb = lista.filter(function (x) { return ambienteDe(x); });
    var ambs = familiaAmbientes(conAmb, 5);
    if (ambs.length >= 2) {
      ['mo', 'p'].forEach(function (id) {
        var n = nutPorId(id); if (!n) return;
        var pr = ambs.map(function (a) { var vs = valoresDe(conAmb.filter(function (x) { return ambienteDe(x) === a; }), id); return { a: a, m: vs.length ? cuantil(vs, 0.5) : null }; }).filter(function (o) { return o.m != null; });
        if (pr.length < 2) return;
        pr.sort(function (x, y) { return y.m - x.m; });
        var dif = (pr[0].m - pr[pr.length - 1].m) / pr[pr.length - 1].m;
        if (dif >= 0.15) concluir('info', n.nombre + ' según el ambiente (' + (ambs[0] === 'Loma' || ambs[0] === 'Media loma' || ambs[0] === 'Bajo' ? 'relieve' : 'productividad') + ')',
          'Medianas: ' + pr.map(function (o) { return o.a + ' ' + fmt(o.m) + (n.unidad ? ' ' + n.unidad : ''); }).join(' · ') + ' (' + Math.round(dif * 100) + '% más en ' + pr[0].a.toLowerCase() + ' que en ' + pr[pr.length - 1].a.toLowerCase() + ').',
          id === 'mo' ? 'Las lomas suelen ser más arenosas y con menos MO: priorizarlas en cobertura y aporte de carbono.' : 'Conviene diferenciar la dosis de P por ambiente.');
      });
    }

    // ----- 6. Textura -----
    var nAr = nutPorId('arena'), nMo = nutPorId('mo');
    if (nAr && nMo) {
      var par = lista.filter(function (x) { return x.v.arena != null && x.v.mo != null; });
      var pe = pearson(par.map(function (x) { return x.v.arena; }), par.map(function (x) { return x.v.mo; }));
      if (pe && par.length >= 10 && pe.r <= -0.4) concluir('info', 'A más arena, menos materia orgánica (r = ' + fmt(pe.r, 2) + ')',
        'En ' + par.length + ' muestras con granulometría, cada 10 puntos más de arena la MO baja ~' + fmt(Math.abs(pe.b * 10), 2) + ' %.', 'Los suelos arenosos retienen menos agua y nutrientes: fraccionar N y priorizar cobertura.');
      var arenosos = valoresDe(lista, 'arena').filter(function (v) { return v >= 70; }).length, nAre = valoresDe(lista, 'arena').length;
      if (nAre >= 5 && arenosos / nAre >= 0.4) concluir('info', 'Predominan suelos arenosos', pct(arenosos, nAre) + '% de las muestras con granulometría tienen 70% de arena o más (texturas arenoso franca / franco arenosa).', 'Menor capacidad de retención: preferir fertilizaciones fraccionadas y fuentes de baja pérdida.');
    }

    // ----- 7. Relaciones catiónicas (hoja de referencias) -----
    var kEnExceso = false;
    var cat = lista.filter(function (x) { return x.v.ca != null && x.v.mg != null; });
    if (cat.length >= 5) {
      var camg = cat.map(function (x) { return x.v.ca / x.v.mg; }).filter(isFinite);
      var fuera = camg.filter(function (v) { return v < 2 || v > 5; }).length;
      if (fuera / camg.length >= 0.25) concluir('atencion', 'Relación Ca/Mg fuera de 2 a 5 en el ' + pct(fuera, camg.length) + '% de las muestras', 'Promedio Ca/Mg ' + fmt(promedio(camg), 1) + '. Fuera de ese rango se bloquea la absorción de uno u otro.', promedio(camg) < 2 ? 'Sugerencia: aportar calcio (yeso o calcita).' : 'Sugerencia: aportar magnesio (dolomita).');
      else concluir('bien', 'Relación Ca/Mg equilibrada', 'Promedio ' + fmt(promedio(camg), 1) + ' (ideal 2 a 5) en ' + camg.length + ' muestras.');
    }
    var conK = lista.filter(function (x) { return x.v.k != null && x.v.cic; });
    if (conK.length >= 5) {
      var satK = conK.map(function (x) { return x.v.k * 100 / x.v.cic; });
      var altos = satK.filter(function (v) { return v > 5; }).length;
      var conMg = conK.filter(function (x) { return x.v.mg != null; }), mgk = conMg.map(function (x) { return x.v.mg / x.v.k; });
      var mgkF = mgk.filter(function (v) { return v < 2 || v > 4; }).length;
      var txtMgK = mgk.length >= 5 ? ' La relación Mg/K está fuera de 2 a 4 en el ' + pct(mgkF, mgk.length) + '% (promedio ' + fmt(promedio(mgk), 1) + ').' : '';
      if (altos / satK.length >= 0.3) {
        kEnExceso = true;
        concluir('atencion', 'Potasio en exceso relativo en el ' + pct(altos, satK.length) + '% de las muestras', 'Saturación de K promedio ' + fmt(promedio(satK), 1) + '% de la CIC (ideal 2–5%). El exceso de K compite con la absorción de Ca y Mg.' + txtMgK, 'Sugerencia: evitar fuentes potásicas y priorizar yeso (aporta Ca y S).');
      } else if (mgk.length >= 5 && mgkF / mgk.length >= 0.4) concluir('info', 'Relación Mg/K fuera de 2 a 4 en el ' + pct(mgkF, mgk.length) + '% de las muestras', 'Promedio Mg/K ' + fmt(promedio(mgk), 1) + '. Son antagonistas fuera de esa relación.');
    }

    // ----- 8. Valores atípicos -----
    if (nP) {
      var vp = valoresDe(lista, 'p');
      if (vp.length >= 10) {
        var q3 = cuantil(vp, 0.75), lim = Math.max(60, q3 + 3 * (q3 - cuantil(vp, 0.25)));
        var at = lista.filter(function (x) { return x.v.p != null && x.v.p > lim; });
        if (at.length) concluir('info', at.length + (at.length === 1 ? ' valor' : ' valores') + ' de fósforo muy altos (más de ' + fmt(lim) + ' ppm); la mediana es ' + fmt(cuantil(vp, 0.5)) + ' ppm',
          esc(listarCorto(at.sort(function (a, b) { return b.v.p - a.v.p; }).map(function (x) { return x.campo + ' ' + x.lote + ' (' + fmt(x.v.p) + ')'; }), 3)) + '.', 'Revisar: puede ser una muestra tomada sobre la línea de fertilización o un error de carga. Pesan mucho en los promedios.');
      }
    }

    // ----- 9. Cobertura de los análisis -----
    var poco = ['s', 'zn', 'b', 'n'].map(nutPorId).filter(function (n) { return n; }).map(function (n) { return { n: n, c: valoresDe(lista, n.id).length / lista.length }; })
      .filter(function (o) { return o.c < 0.4; });
    if (poco.length) concluir('info', 'Ampliar el análisis', poco.map(function (o) { return o.n.corto + ' solo en el ' + Math.round(o.c * 100) + '% de las muestras'; }).join(' · ') + '.', 'Incluir azufre, zinc, boro y nitratos en los próximos muestreos mejora el diagnóstico.');

    // ----- 10. Fortalezas -----
    var fuertes = evaluables.filter(function (n) { if (n.id === 'ph' || n.tipo === 'menos' || (n.id === 'k' && kEnExceso)) return false; var s = estad(n, lista); return s.n >= 5 && s.cuenta.bien / s.n >= 0.7; });
    if (fuertes.length) concluir('bien', 'Niveles adecuados en ' + fuertes.map(function (n) { return n.corto; }).join(', '), 'Más del 70% de las muestras en nivel adecuado.');

    // ----- Campos prioritarios -----
    var idxCampo = porCampo.map(function (pc) {
      var iv = pc.muestras.map(indiceMuestra).filter(function (v) { return v != null; });
      return { campo: pc.campo, campania: pc.campania, ind: promedio(iv), n: pc.muestras.length, pc: pc };
    }).filter(function (o) { return o.ind != null; });
    if (idxCampo.length >= 3) {
      var peores = idxCampo.slice().sort(function (a, b) { return a.ind - b.ind; }).slice(0, 5).filter(function (o) { return o.ind < 60; });
      if (peores.length) concluir('atencion', 'Campos prioritarios', 'Menor índice de fertilidad en su última campaña: ' + peores.map(function (o) { return esc(o.campo) + ' (' + Math.round(o.ind) + ')'; }).join(', ') + '.', 'Empezar por estos campos el plan de fertilización y enmiendas.');
    }
    C.sort(function (a, b) { return NIVELES[a.nivel].orden - NIVELES[b.nivel].orden; });

    // ----- Opciones del panel -----
    var nG = nutDeVista(lista);
    r.opciones = selectNutrienteHTML(lista, nG);

    // ----- Gráficos -----
    if (idxCampo.length) {
      var orden = idxCampo.slice().sort(function (a, b) { return panelCfg.ranking === 'altos' ? b.ind - a.ind : a.ind - b.ind; }).slice(0, 12);
      r.graficos.push({
        tipo: 'ranking', ancho: 'medio', titulo: 'Índice de fertilidad por campo (' + (panelCfg.ranking === 'altos' ? 'los más altos' : 'los más bajos') + ')',
        opciones: '<label>Mostrar <select data-op="ranking"><option value="bajos"' + (panelCfg.ranking !== 'altos' ? ' selected' : '') + '>Los 12 más bajos (prioridad)</option><option value="altos"' + (panelCfg.ranking === 'altos' ? ' selected' : '') + '>Los 12 más altos</option></select></label>',
        cats: orden.map(function (o) { return o.campo; }), vals: orden.map(function (o) { return o.ind; }), max: 100,
        colores: orden.map(function (o) { return COLORES[nivelIndice(o.ind)]; }), estados: orden.map(function (o) { return textoIndice(o.ind); }),
        detalles: orden.map(function (o) { return 'Campaña ' + o.campania + ' · ' + o.n + ' muestras'; }),
        leyenda: [{ c: COLORES.bajo, t: 'Bajo (menos de 50)' }, { c: COLORES.medio, t: 'Medio (50 a 75)' }, { c: COLORES.bien, t: 'Bueno (75 o más)' }]
      });
    }
    var vg = vistaGeneral(lista);
    if (vg.grafico) { vg.grafico.ancho = 'medio'; vg.grafico.titulo = 'Limitantes: reparto de las muestras por nivel (%)'; r.graficos.push(vg.grafico); }

    if (nG) {
      var u = nG.unidad ? ' (' + nG.unidad + ')' : '';
      var conV = lista.filter(function (x) { return x.v[nG.id] != null; });
      var cs2 = unico(conV.map(function (x) { return x.campania; })).sort(ordenarTexto);
      if (cs2.length >= 2) {
        var gru = cs2.map(function (c) { return conV.filter(function (x) { return x.campania === c; }); });
        var st = gru.map(function (l) { return estad(nG, l); });
        var gl = graficoBarras(nG, cs2, gru.map(function (l) { return cuantil(valoresDe(l, nG.id), 0.5); }), nG.nombre + ': evolución por campaña (mediana' + (nG.unidad ? ', ' + nG.unidad : '') + ')',
          st.map(function (s) { return s.n + ' muestras · promedio ' + fmt(s.prom) + ' · ' + textoReparto(s); }));
        gl.tipo = 'linea'; gl.ancho = 'medio';
        r.graficos.push(gl);
      }
      var amb2 = familiaAmbientes(conV, 1);
      if (amb2.length >= 2) {
        var gra = amb2.map(function (a) { return conV.filter(function (x) { return ambienteDe(x) === a; }); });
        var sta = gra.map(function (l) { return estad(nG, l); });
        var ga = graficoBarras(nG, amb2, gra.map(function (l) { return cuantil(valoresDe(l, nG.id), 0.5); }), nG.nombre + ' por ambiente (mediana' + (nG.unidad ? ', ' + nG.unidad : '') + ')',
          sta.map(function (s) { return s.n + ' muestras · promedio ' + fmt(s.prom) + ' · ' + textoReparto(s); }));
        ga.ancho = 'medio';
        r.graficos.push(ga);
      }
    }
    // Dispersión entre dos variables
    var conDatos = nutsConDatos(lista).filter(function (n) { return valoresDe(lista, n.id).length >= 5; });
    if (conDatos.length >= 2) {
      var xId = panelCfg.xDisp && nutPorId(panelCfg.xDisp) && conDatos.indexOf(nutPorId(panelCfg.xDisp)) >= 0 ? panelCfg.xDisp : (nutPorId('arena') && conDatos.indexOf(nutPorId('arena')) >= 0 ? 'arena' : conDatos[0].id);
      var yId = panelCfg.yDisp && nutPorId(panelCfg.yDisp) && conDatos.indexOf(nutPorId(panelCfg.yDisp)) >= 0 ? panelCfg.yDisp : (nutPorId('mo') && conDatos.indexOf(nutPorId('mo')) >= 0 && xId !== 'mo' ? 'mo' : conDatos[1].id);
      var nx = nutPorId(xId), ny = nutPorId(yId);
      var pts = lista.filter(function (x) { return x.v[xId] != null && x.v[yId] != null; });
      var pe2 = pearson(pts.map(function (x) { return x.v[xId]; }), pts.map(function (x) { return x.v[yId]; }));
      var opt = function (sel, op) { return '<select data-op="' + op + '">' + conDatos.map(function (n) { return '<option value="' + esc(n.id) + '"' + (n.id === sel ? ' selected' : '') + '>' + esc(n.corto + (n.unidad ? ' (' + n.unidad + ')' : '')) + '</option>'; }).join('') + '</select>'; };
      var fuerza = !pe2 ? '' : Math.abs(pe2.r) >= 0.7 ? 'fuerte' : Math.abs(pe2.r) >= 0.4 ? 'moderada' : Math.abs(pe2.r) >= 0.2 ? 'débil' : 'casi nula';
      r.graficos.push({
        tipo: 'dispersion', ancho: 'completo',
        titulo: 'Relación entre ' + nx.corto + ' y ' + ny.corto + (pe2 ? ' · r = ' + fmt(pe2.r, 2) + ' (' + fuerza + ', ' + pts.length + ' muestras)' : ''),
        opciones: '<label>Eje horizontal ' + opt(xId, 'xdisp') + '</label><label>Eje vertical ' + opt(yId, 'ydisp') + '</label>',
        puntos: pts.map(function (x) { return { x: x.v[xId], y: x.v[yId], t: x.campo + ' · ' + x.lote + ' · ' + x.campania }; }),
        xl: etiquetaNut(nx), yl: etiquetaNut(ny), recta: pe2 && pts.length >= 5 ? pe2 : null,
        leyenda: [{ c: '#8F131C', t: 'Cada punto es una muestra' }].concat(pe2 ? [{ c: null, t: 'Línea punteada: tendencia' }] : [])
      });
    }

    // ----- Plan de fertilización orientativo -----
    var body = [], est = [];
    idxCampo.slice().sort(function (a, b) { return a.ind - b.ind; }).forEach(function (o) {
      var m = o.pc.muestras, P = promedio(valoresDe(m, 'p')), N = promedio(valoresDe(m, 'n')), S = promedio(valoresDe(m, 's')), Z = promedio(valoresDe(m, 'zn'));
      var nS = nutPorId('s'), nZ = nutPorId('zn');
      var map = P != null && P < pObj ? Math.round((pObj - P) * panelCfg.factorP / 0.227 / 5) * 5 : (P != null ? 0 : null);
      var yeso = S == null || !nS ? '–' : S < Number(nS.bajo) ? '110' : S < Number(nS.alto) ? '80' : '0';
      body.push([o.campo, o.campania, String(Math.round(o.ind)), P == null ? '–' : fmt(P), map == null ? '–' : String(map), N == null ? '–' : String(Math.round(N * 2.6)), yeso, Z == null || !nZ ? '–' : Z < Number(nZ.bajo) ? 'Sí' : 'No']);
      est.push([null, null, nivelIndice(o.ind), P != null && nP ? clasificar(nP, P).k : null, null, null, yeso !== '–' && yeso !== '0' ? 'medio' : null, Z != null && nZ && Z < Number(nZ.bajo) ? 'bajo' : null]);
    });
    if (body.length) r.tablas.push({
      titulo: 'Plan de fertilización orientativo por campo (última campaña muestreada; P objetivo ' + fmt(pObj) + ' ppm, ' + fmt(panelCfg.factorP) + ' kg P/ha por ppm)',
      head: ['Campo', 'Campaña', 'Índice', 'P (ppm)', 'MAP construcción (kg/ha)', 'N-NO3 0-20 cm (kg N/ha)', 'Yeso (kg/ha)', 'Zn'], body: body, estados: est, numeros: [2, 3, 4, 5, 6], maxFilas: 15,
      nota: 'MAP = fosfato monoamónico 11-52-0 (22,7% P), solo para subir el P al objetivo; sumar la reposición de lo que extrae el cultivo. N-NO3: ppm × 2,6 (densidad 1,3). Yeso: 18% S. Zn «Sí»: 1–2 kg Zn/ha o semilla tratada. Valores orientativos: confirmar con el asesor.'
    });
    r.planOpciones = '<label>P objetivo (ppm) <input type="text" inputmode="decimal" data-op="pobj" value="' + esc(String(pObj).replace('.', ',')) + '"></label>' +
      '<label>Kg de P por ppm a subir <input type="text" inputmode="decimal" data-op="factorp" value="' + esc(String(panelCfg.factorP).replace('.', ',')) + '"></label>';
    r.puntos.push('<i>Diagnóstico automático según los rangos de «Nutrientes y rangos» y reglas agronómicas generales. Es orientativo: confirmar las decisiones con el asesor agronómico.</i>');
    return r;
  }

  // =====================================================================
  // ---------- Panel comercial: estrategias de venta a partir de los análisis ----------
  // Convierte el diagnóstico de cada campo en necesidad de producto, volumen y monto estimado.
  // =====================================================================
  var CLAVE_COM = 'suelos.comercial';
  var PRODUCTOS = [
    { id: 'map', nombre: 'Fosfato monoamónico (MAP)', corto: 'MAP', unidad: 't', precio: 800 },
    { id: 'urea', nombre: 'Urea', corto: 'Urea', unidad: 't', precio: 600 },
    { id: 'yeso', nombre: 'Yeso agrícola', corto: 'Yeso', unidad: 't', precio: 120 },
    { id: 'cal', nombre: 'Dolomita / cal agrícola', corto: 'Dolomita', unidad: 't', precio: 100 },
    { id: 'zn', nombre: 'Zinc (tratamiento o fertilizante)', corto: 'Zinc', unidad: 'ha', precio: 8 }
  ];
  var comCfg = Object.assign({ haDef: 300, ha: {}, precios: {}, reposicion: 60, nObj: 120, segmento: '', producto: '' }, leer(CLAVE_COM, {}) || {});
  PRODUCTOS.forEach(function (pr) { if (comCfg.precios[pr.id] == null) comCfg.precios[pr.id] = pr.precio; });
  function guardarCom() { guardar(CLAVE_COM, comCfg); }
  function haDe(campo) { return comCfg.ha[campo] != null ? comCfg.ha[campo] : comCfg.haDef; }
  function plata(v) { return 'US$ ' + fmt(Math.round(v), 0); }
  function plataCorta(v) { return v >= 1e6 ? 'US$ ' + fmt(v / 1e6, 1) + ' M' : v >= 1e4 ? 'US$ ' + fmt(v / 1e3, 0) + ' mil' : plata(v); }

  var SEGMENTOS = [
    { id: 'recuperacion', t: 'Recuperación integral', color: '#8F131C', accion: 'Visita técnica y plan integral de 2–3 campañas (construcción de P + azufre + zinc).' },
    { id: 'fosforo', t: 'Construcción de fósforo', color: '#D39B2A', accion: 'Propuesta de MAP con dosis de construcción y financiación a cosecha.' },
    { id: 'enmiendas', t: 'Enmiendas (yeso / cal)', color: '#7A4F9A', accion: 'Ofrecer enmienda con asesoramiento técnico: venta de valor, poco competida.' },
    { id: 'azufre', t: 'Azufre y micronutrientes', color: '#2D5F9A', accion: 'Venta rápida: yeso + zinc de bajo costo por hectárea como producto de entrada.' },
    { id: 'mantenimiento', t: 'Mantenimiento', color: '#2E8B57', accion: 'Fidelizar: reposición anual, beneficios por volumen y re-muestreo.' }
  ];
  function segPorId(id) { for (var i = 0; i < SEGMENTOS.length; i++) if (SEGMENTOS[i].id === id) return SEGMENTOS[i]; return SEGMENTOS[SEGMENTOS.length - 1]; }

  // Necesidad de productos de un campo (muestras de su última campaña).
  function necesidadCampo(pc) {
    var m = pc.muestras, nP = nutPorId('p'), nS = nutPorId('s'), nZ = nutPorId('zn'), nPh = nutPorId('ph');
    var pObj = panelCfg.pObj != null ? panelCfg.pObj : (nP ? Number(nP.alto) : 20);
    var P = promedio(valoresDe(m, 'p')), N = promedio(valoresDe(m, 'n')), S = promedio(valoresDe(m, 's')), Z = promedio(valoresDe(m, 'zn'));
    var ph = promedio(valoresDe(m, 'ph')), psi = promedio(valoresDe(m, 'psi')), ind = promedio(m.map(indiceMuestra).filter(function (v) { return v != null; }));
    var kg = { map: 0, urea: 0, yeso: 0, cal: 0, zn: 0 }, hallazgos = [];
    if (P != null) {
      kg.map = comCfg.reposicion + (P < pObj ? Math.round((pObj - P) * panelCfg.factorP / 0.227 / 5) * 5 : 0);
      if (nP && P < Number(nP.alto)) hallazgos.push('Fósforo: ' + fmt(P) + ' ppm (' + clasificar(nP, P).txt.toLowerCase() + ')');
    }
    if (N != null) {
      var falta = comCfg.nObj - N * 2.6;
      if (falta > 0) kg.urea = Math.round(falta / 0.46 / 5) * 5;
      if (N < 10) hallazgos.push('Nitratos: ' + fmt(N) + ' ppm (~' + Math.round(N * 2.6) + ' kg N/ha disponibles)');
    }
    if (S != null && nS) {
      kg.yeso = S < Number(nS.bajo) ? 110 : S < Number(nS.alto) ? 80 : 0;
      if (S < Number(nS.alto)) hallazgos.push('Azufre: ' + fmt(S) + ' ppm (' + clasificar(nS, S).txt.toLowerCase() + ')');
    }
    if (psi != null && psi > 7) { kg.yeso += 1000; hallazgos.push('Sodio intercambiable: ' + fmt(psi) + '% (enmienda con yeso)'); }
    if (ph != null && nPh && ph < Number(nPh.bajo)) { kg.cal = 1000; hallazgos.push('pH ' + fmt(ph, 1) + ' (ácido)'); }
    if (Z != null && nZ && Z < Number(nZ.bajo)) { kg.zn = 1; hallazgos.push('Zinc: ' + fmt(Z) + ' ppm (bajo)'); }
    var ha = haDe(pc.campo), monto = {}, total = 0;
    PRODUCTOS.forEach(function (pr) {
      var v = pr.unidad === 'ha' ? kg[pr.id] * ha * comCfg.precios[pr.id] : kg[pr.id] * ha / 1000 * comCfg.precios[pr.id];
      monto[pr.id] = v; total += v;
    });
    var seg = ind != null && ind < 50 ? 'recuperacion' : P != null && nP && P < Number(nP.bajo) ? 'fosforo'
      : (psi != null && psi > 7) || (ph != null && nPh && ph < Number(nPh.bajo)) ? 'enmiendas'
      : (S != null && nS && S < Number(nS.alto)) || (Z != null && nZ && Z < Number(nZ.bajo)) ? 'azufre' : 'mantenimiento';
    var productos = PRODUCTOS.filter(function (pr) { return kg[pr.id] > 0; });
    return { campo: pc.campo, campania: pc.campania, pc: pc, ha: ha, kg: kg, monto: monto, total: total, seg: seg, ind: ind, P: P, hallazgos: hallazgos, productos: productos };
  }

  function mensajeWhatsApp(o) {
    var lineas = ['Hola, ¿cómo estás? Te escribo de MORERO Semillas y Cereales.', '',
      'Revisamos el análisis de suelo de ' + o.campo + ' (campaña ' + o.campania + ') y encontramos:'];
    (o.hallazgos.length ? o.hallazgos : ['Niveles en general adecuados']).forEach(function (h) { lineas.push('• ' + h); });
    lineas.push('');
    var prop = o.productos.map(function (pr) {
      return pr.unidad === 'ha' ? pr.corto : pr.corto + ' ' + fmt(o.kg[pr.id], 0) + ' kg/ha';
    });
    if (prop.length) {
      lineas.push('Para tus ' + fmt(o.ha, 0) + ' ha te proponemos: ' + prop.join(', ') + '.');
      if (prop.length >= 2) lineas.push('Lo armamos como mezcla a medida en nuestra planta, para aplicar todo en una sola pasada.');
    } else lineas.push('Para mantener estos niveles te proponemos la reposición de lo que extrae el cultivo.');
    lineas.push('', '¿Te paso la cotización o coordinamos una visita para verlo juntos?');
    return lineas.join('\n');
  }

  var ultimasNecesidades = {};
  function vistaComercial(lista) {
    var r = { titulo: 'Panel comercial: estrategias de venta', puntos: [], tablas: [], graficos: [], kpis: [], conclusiones: [] };
    if (!lista.length) { r.puntos.push('No hay análisis que coincidan con la búsqueda. Cargá datos o cambiá los filtros.'); return r; }
    var C = r.conclusiones;
    function concluir(nivel, titulo, texto, accion) { C.push({ nivel: nivel, titulo: titulo, texto: texto, accion: accion || '' }); }

    var todos = ultimaCampaniaPorCampo(lista).map(necesidadCampo);
    ultimosMensajes = {};
    ultimasNecesidades = {};
    todos.forEach(function (o) { ultimasNecesidades[o.campo] = o; });
    var nec = comCfg.segmento ? todos.filter(function (o) { return o.seg === comCfg.segmento; }) : todos;

    // Opciones
    r.opciones = '<label>Segmento <select data-op="cseg"><option value="">Todos los segmentos</option>' + SEGMENTOS.map(function (s) {
      var n = todos.filter(function (o) { return o.seg === s.id; }).length;
      return '<option value="' + s.id + '"' + (comCfg.segmento === s.id ? ' selected' : '') + '>' + esc(s.t) + ' (' + n + ')</option>';
    }).join('') + '</select></label>';
    if (!nec.length) { r.puntos.push('Ningún campo en este segmento.'); return r; }

    var prod = comCfg.producto;
    function valor(o) { return prod ? o.monto[prod] : o.total; }
    var total = nec.reduce(function (a, o) { return a + valor(o); }, 0);
    var haTot = nec.reduce(function (a, o) { return a + o.ha; }, 0);
    var porProd = PRODUCTOS.map(function (pr) {
      var m = nec.reduce(function (a, o) { return a + o.monto[pr.id]; }, 0);
      var vol = nec.reduce(function (a, o) { return a + (pr.unidad === 'ha' ? (o.kg[pr.id] ? o.ha : 0) : o.kg[pr.id] * o.ha / 1000); }, 0);
      return { pr: pr, m: m, vol: vol, campos: nec.filter(function (o) { return o.kg[pr.id] > 0; }).length };
    }).filter(function (x) { return x.m > 0; }).sort(function (a, b) { return b.m - a.m; });
    var orden = nec.slice().sort(function (a, b) { return valor(b) - valor(a); });

    // ----- Indicadores -----
    r.kpis.push({ t: 'Potencial de venta estimado', v: plataCorta(total), sub: (prod ? PRODUCTOS.filter(function (p) { return p.id === prod; })[0].corto + ' · ' : '') + fmt(haTot, 0) + ' ha supuestas', k: 'bien' });
    r.kpis.push({ t: 'Campos con oportunidad', v: String(nec.filter(function (o) { return valor(o) > 0; }).length), sub: 'de ' + nec.length + ' campos analizados' });
    r.kpis.push({ t: 'Ticket promedio por campo', v: plataCorta(total / nec.length), sub: plata(haTot ? total / haTot : 0) + ' por ha' });
    if (porProd.length) r.kpis.push({ t: 'Producto con más potencial', v: porProd[0].pr.corto, sub: pct(porProd[0].m, porProd.reduce(function (a, x) { return a + x.m; }, 0)) + '% del potencial · ' + porProd[0].campos + ' campos' });
    var n20 = Math.max(1, Math.round(orden.length * 0.2)), top20 = orden.slice(0, n20).reduce(function (a, o) { return a + valor(o); }, 0);
    r.kpis.push({ t: 'Concentración (Pareto)', v: pct(top20, total) + '%', sub: 'del potencial en el 20% de los campos (' + n20 + ')' });
    var maxAnio = Math.max.apply(null, lista.map(function (x) { return Number(String(x.campania).slice(0, 4)) || 0; }));
    var viejos = nec.filter(function (o) { return (Number(String(o.campania).slice(0, 4)) || 0) <= maxAnio - 2; });
    r.kpis.push({ t: 'Para re-muestrear', v: String(viejos.length), sub: 'campos sin análisis en las últimas 2 campañas', k: viejos.length ? 'medio' : 'bien' });

    // ----- Conclusiones del experto en marketing -----
    if (porProd.length) {
      concluir('oportunidad', 'Potencial estimado de ' + plataCorta(total) + ' en ' + nec.length + ' campos',
        'Por producto: ' + porProd.map(function (x) { return x.pr.corto + ' ' + plataCorta(x.m) + (x.pr.unidad === 't' ? ' (' + fmt(x.vol, 0) + ' t)' : ' (' + fmt(x.vol, 0) + ' ha)'); }).join(' · ') + '.',
        'El número sale de los propios análisis: es el mejor argumento de venta, porque el cliente ve su dato y la solución.');
    }
    var multi = nec.filter(function (o) { return o.productos.length >= 3; });
    if (multi.length) concluir('oportunidad', 'Mezcla a medida: ' + pct(multi.length, nec.length) + '% de los campos necesitan 3 productos o más',
      multi.length + ' campos combinan necesidades (por ejemplo, P + azufre + zinc).', 'Estrategia: vender una mezcla física armada en planta para cada campo, en una sola pasada. Diferencia a MORERO frente a quien vende productos sueltos y sube el ticket por cliente.');
    var top5 = orden.slice(0, 5).filter(function (o) { return valor(o) > 0; });
    if (top5.length) concluir('accion', 'Visitar primero a los ' + top5.length + ' campos de mayor potencial',
      top5.map(function (o) { return esc(o.campo) + ' (' + plataCorta(valor(o)) + ')'; }).join(', ') + '. El 20% de los campos concentra el ' + pct(top20, total) + '% del potencial.',
      'Estrategia de cuentas clave: visita personal con el análisis impreso (PDF), propuesta escrita y seguimiento a los 7 días.');
    var nS = nutPorId('s'), nZ = nutPorId('zn');
    var rapidos = nec.filter(function (o) { return o.kg.yeso > 0 || o.kg.zn > 0; });
    if (rapidos.length && nS) {
      var costoHa = (110 / 1000) * comCfg.precios.yeso + comCfg.precios.zn;
      concluir('accion', 'Producto de entrada: azufre y zinc en ' + rapidos.length + ' campos',
        'Corregir azufre (yeso) y zinc cuesta cerca de ' + plata(costoHa) + ' por ha: es una decisión fácil para el productor y la respuesta se ve en el cultivo.',
        'Estrategia: usarlo para abrir clientes nuevos o que hoy compran poco; después sumar fósforo y semilla.');
    }
    if (viejos.length) concluir('accion', viejos.length + ' campos sin análisis recientes',
      'Su último análisis es de la campaña ' + esc(listarCorto(unico(viejos.map(function (o) { return o.campania; })).sort(ordenarTexto), 3)) + ' o anterior: ' + esc(listarCorto(viejos.map(function (o) { return o.campo; }), 4)) + '.',
      'Estrategia: ofrecer el muestreo de suelo sin cargo como motivo de visita. Cada análisis nuevo genera la siguiente propuesta de venta.');

    // Campos que perdieron fósforo: argumento de pérdida
    var perdidas = [];
    nec.forEach(function (o) {
      var cs = o.pc.campanias.filter(function (c) { return o.pc.todas.some(function (x) { return x.campania === c && x.v.p != null; }); });
      if (cs.length < 2) return;
      var a = promedio(valoresDe(o.pc.todas.filter(function (x) { return x.campania === cs[0]; }), 'p')), b = promedio(valoresDe(o.pc.todas.filter(function (x) { return x.campania === cs[cs.length - 1]; }), 'p'));
      if (a && (b - a) / a <= -0.2) perdidas.push(o.campo + ' (' + Math.round((b - a) * 100 / a) + '% desde ' + cs[0] + ')');
    });
    if (perdidas.length) concluir('riesgo', perdidas.length + ' campos perdieron más del 20% de su fósforo',
      esc(listarCorto(perdidas, 4)) + '.', 'Mensaje de venta: «su campo está perdiendo fertilidad: estamos sacando más de lo que reponemos». Comparar las dos campañas en el PDF (pestaña Comparar).');
    var enm = nec.filter(function (o) { return o.seg === 'enmiendas' || o.kg.cal > 0 || o.kg.yeso >= 1000; });
    if (enm.length) concluir('oportunidad', 'Enmiendas: ' + enm.length + ' campos con sodio o acidez',
      esc(listarCorto(enm.map(function (o) { return o.campo; }), 4)) + '.', 'Venta de valor con asesoramiento técnico: pocos competidores la ofrecen y fideliza al cliente por varias campañas.');

    // Calendario: ¿cuándo se toman las muestras?
    var meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'], porMes = meses.map(function () { return 0; });
    lista.forEach(function (x) { if (x.fecha) porMes[Number(String(x.fecha).slice(5, 7)) - 1]++; });
    var totMes = porMes.reduce(function (a, b) { return a + b; }, 0);
    if (totMes) {
      var top2 = porMes.map(function (n, i) { return { i: i, n: n }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 2);
      concluir('accion', 'Calendario: el ' + pct(top2[0].n + top2[1].n, totMes) + '% de los muestreos se hace en ' + meses[top2[0].i] + ' y ' + meses[top2[1].i],
        'Es el momento en que el productor tiene el análisis en la mano y está decidiendo la fertilización.',
        'Estrategia: tener la propuesta lista y el stock asegurado antes de esos meses, y contactar dentro de los 15 días de cada análisis. Trigo: junio–julio; maíz: septiembre–diciembre; soja: noviembre–diciembre.');
    }
    var mant = nec.filter(function (o) { return o.seg === 'mantenimiento'; });
    if (mant.length) concluir('info', mant.length + ' campos en mantenimiento', 'Tienen niveles buenos: el riesgo es que compren por precio a otro proveedor.', 'Estrategia: fidelizar con beneficios por volumen, prioridad de entrega y re-muestreo sin cargo.');
    concluir('info', 'Supuestos de la estimación', fmt(comCfg.haDef, 0) + ' ha por campo (se puede cambiar en cada campo), reposición de ' + fmt(comCfg.reposicion, 0) + ' kg/ha de MAP, N objetivo ' + fmt(comCfg.nObj, 0) + ' kg/ha y precios de referencia editables abajo.', 'Ajustá hectáreas y precios para que el potencial se acerque a la realidad de cada cliente.');
    var ordNiv = { oportunidad: 0, riesgo: 1, accion: 2, info: 3 };
    C.sort(function (a, b) { return ordNiv[a.nivel] - ordNiv[b.nivel]; });

    // ----- Gráficos -----
    if (porProd.length) r.graficos.push({
      tipo: 'ranking', ancho: 'medio', titulo: 'Potencial de venta por producto (US$)', moneda: true,
      cats: porProd.map(function (x) { return x.pr.corto; }), vals: porProd.map(function (x) { return x.m; }),
      colores: porProd.map(function () { return '#8F131C'; }), estados: porProd.map(function (x) { return x.campos + ' campos'; }),
      detalles: porProd.map(function (x) { return x.pr.unidad === 't' ? fmt(x.vol, 0) + ' t a ' + plata(comCfg.precios[x.pr.id]) + '/t' : fmt(x.vol, 0) + ' ha a ' + plata(comCfg.precios[x.pr.id]) + '/ha'; }),
      leyenda: [{ c: '#8F131C', t: 'Monto estimado en US$' }]
    });
    var segCuenta = SEGMENTOS.map(function (s) { var l = nec.filter(function (o) { return o.seg === s.id; }); return { s: s, n: l.length, m: l.reduce(function (a, o) { return a + valor(o); }, 0) }; }).filter(function (x) { return x.n; });
    r.graficos.push({
      tipo: 'ranking', ancho: 'medio', titulo: 'Segmentos de clientes (cantidad de campos)', sufijo: ' campos',
      cats: segCuenta.map(function (x) { return x.s.t; }), vals: segCuenta.map(function (x) { return x.n; }),
      colores: segCuenta.map(function (x) { return x.s.color; }), estados: segCuenta.map(function (x) { return plataCorta(x.m) + ' de potencial'; }),
      detalles: segCuenta.map(function (x) { return x.s.accion; }),
      leyenda: segCuenta.map(function (x) { return { c: x.s.color, t: x.s.t }; })
    });
    var top15 = orden.slice(0, 15).filter(function (o) { return valor(o) > 0; });
    if (top15.length) r.graficos.push({
      tipo: 'ranking', ancho: 'completo', titulo: 'Los ' + top15.length + ' campos con más potencial (US$' + (prod ? ', ' + PRODUCTOS.filter(function (p) { return p.id === prod; })[0].corto : '') + ')', moneda: true,
      cats: top15.map(function (o) { return o.campo; }), vals: top15.map(valor),
      colores: top15.map(function (o) { return segPorId(o.seg).color; }), estados: top15.map(function (o) { return segPorId(o.seg).t; }),
      detalles: top15.map(function (o) { return fmt(o.ha, 0) + ' ha · campaña ' + o.campania + ' · ' + o.productos.map(function (p) { return p.corto; }).join(' + '); }),
      leyenda: unico(top15.map(function (o) { return o.seg; })).map(function (id) { var s = segPorId(id); return { c: s.color, t: s.t }; })
    });
    if (totMes) r.graficos.push({
      tipo: 'barras', ancho: 'completo', titulo: 'Calendario comercial: muestras de suelo por mes (cuándo contactar)', cats: meses, vals: porMes, unidad: 'muestras',
      colores: porMes.map(function (n) { return n >= top2[1].n && n > 0 ? '#8F131C' : '#5B5B5F'; }), estados: porMes.map(function (n) { return pct(n, totMes) + '% del año'; }),
      detalles: meses.map(function () { return ''; }), lineas: [],
      leyenda: [{ c: '#8F131C', t: 'Meses de mayor actividad' }, { c: '#5B5B5F', t: 'Resto del año' }]
    });

    // ----- Tabla de oportunidades -----
    var body = [], est = [];
    orden.forEach(function (o) {
      var s = segPorId(o.seg);
      body.push([o.campo, s.t, o.campania,
        { t: fmt(o.ha, 0), html: '<input type="text" inputmode="decimal" class="input-ha" data-op="ha" data-campo="' + esc(o.campo) + '" value="' + esc(fmt(o.ha, 0)) + '" aria-label="Hectáreas de ' + esc(o.campo) + '">' },
        o.productos.map(function (p) { return p.unidad === 'ha' ? p.corto : p.corto + ' ' + fmt(o.kg[p.id], 0); }).join(' · ') || '–',
        plata(valor(o)), s.accion,
        { t: '', html: '<button type="button" class="boton-texto" data-msg="' + esc(o.campo) + '">Copiar</button> <a class="boton-texto" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(ultimosMensajes[o.campo] = mensajeWhatsApp(o)) + '">WhatsApp</a>' }]);
      est.push([null, null, null, null, null, null, null, null]);
    });
    r.tablas.push({
      titulo: 'Oportunidades por campo (de mayor a menor potencial)',
      head: ['Campo', 'Segmento', 'Últ. análisis', 'Ha', 'Necesita (kg/ha)', 'Potencial', 'Acción sugerida', 'Mensaje'], body: body, estados: est, numeros: [3, 5], maxFilas: 20, soloPantalla: [7],
      nota: 'Potencial = kg/ha × hectáreas × precio. MAP = reposición + construcción de P hasta el objetivo del Panel experto; urea = N objetivo menos N de nitratos (0–20 cm); yeso según azufre y sodio; dolomita si el pH es ácido; zinc por ha si es bajo. Estimaciones orientativas para planificar la venta, no reemplazan la recomendación del asesor.'
    });
    r.planTitulo = 'Supuestos (hectáreas y precios de referencia en US$)';
    r.planOpciones = '<label>Ha por campo (si no se indica) <input type="text" inputmode="decimal" data-op="hadef" value="' + esc(fmt(comCfg.haDef, 0)) + '"></label>' +
      '<label>Reposición MAP (kg/ha) <input type="text" inputmode="decimal" data-op="repo" value="' + esc(fmt(comCfg.reposicion, 0)) + '"></label>' +
      '<label>N objetivo (kg N/ha) <input type="text" inputmode="decimal" data-op="nobj" value="' + esc(fmt(comCfg.nObj, 0)) + '"></label>' +
      PRODUCTOS.map(function (p) { return '<label>' + esc(p.corto) + ' (US$/' + p.unidad + ') <input type="text" inputmode="decimal" data-op="precio" data-prod="' + p.id + '" value="' + esc(String(comCfg.precios[p.id]).replace('.', ',')) + '"></label>'; }).join('');
    r.puntos.push('<i>Estrategias sugeridas a partir de los análisis de suelo, con hectáreas y precios supuestos. Son estimaciones para planificar la venta; la recomendación agronómica final la da el asesor.</i>');
    return r;
  }

  // =====================================================================
  // ---------- Estrategia por producto (zinc, fósforo, azufre, nitrógeno, encalado) ----------
  // Datos del nutriente para presentar (por ejemplo, a un grupo CREA) + estrategia de marketing y ventas.
  // =====================================================================
  var CULTIVOS = { maiz: 'maíz', soja: 'soja', trigo: 'trigo' };
  var ESTRATEGIAS = [
    {
      id: 'zn', nut: 'zn', titulo: 'Mezclas con zinc (PROCOTE Zn)', producto: 'mezcla con PROCOTE Zn', cultivo: 'maiz', precio: 180, rinde: 8, costo: 8, conLitros: true,
      lema: 'Cada gránulo con zinc',
      posicion: 'PROCOTE Zn (YaraVita) es una suspensión concentrada de zinc (aprox. 700 g Zn/L) que se pulveriza sobre el fertilizante en la mezcladora y recubre cada gránulo. Así el zinc llega parejo a toda la línea de siembra, a diferencia de mezclar un fertilizante granulado de zinc, que aporta pocos gránulos por metro y puede separarse en la mezcla.',
      propuesta: 'Tu mezcla de siembra (MAP o NPS) recubierta con PROCOTE Zn en la planta de MORERO, a medida de tu análisis. Una sola pasada, sin labor extra.',
      objeciones: '«Ya trato la semilla con zinc»: la semilla lleva poca cantidad; la mezcla aporta zinc al suelo que explora la raíz y se complementan. «Es caro»: se paga con pocos kilos de grano (ver economía). «No vi respuesta»: medirlo con franjas en su propio campo.',
      apuntar: 'Maíz y trigo en lotes con zinc deficiente, sobre todo con pH alto, poca materia orgánica o suelos arenosos (lomas).',
      calendario: 'Reunión y propuesta antes de la compra de insumos de maíz (junio–agosto); entrega de mezclas para maíz (septiembre–diciembre) y trigo (mayo–julio); resultados de ensayos en la cosecha (marzo–abril).',
      notas: { ph: 'Con pH alto el zinc está menos disponible.', mo: 'La materia orgánica es la principal reserva de zinc del suelo.', arena: 'Los suelos arenosos tienen menos zinc.', p: 'Mucho fósforo puede inducir deficiencia de zinc (interacción P–Zn).' },
      mensaje: 'Te proponemos tu mezcla de siembra con PROCOTE Zn de Yara: el zinc va recubriendo cada gránulo, así llega parejo a todo el lote y se aplica en la misma pasada.'
    },
    {
      id: 'p', nut: 'p', titulo: 'Fósforo: MAP y mezclas fosforadas', producto: 'mezcla fosforada (MAP)', cultivo: 'maiz', precio: 180, rinde: 8, costo: 80,
      lema: 'El fósforo es capital del campo',
      posicion: 'El fósforo se acumula en el suelo: lo que se aplica de más queda para las campañas siguientes. Construir el nivel y después reponer lo que se lleva cada cosecha protege el rinde y el valor de la tierra.',
      propuesta: 'Mezcla fosforada a medida de cada ambiente (más dosis donde el análisis da bajo), con financiación a cosecha y posibilidad de sumar azufre y zinc en la misma mezcla.',
      objeciones: '«El fósforo está caro»: es una inversión que queda en el suelo, no un gasto de una sola campaña. «Mi campo tiene buen fósforo»: si no se repone, baja (mirar la evolución por campaña). «Le pongo a la soja con lo que queda»: la soja también extrae fósforo.',
      apuntar: 'Lotes con fósforo bajo o en baja entre campañas, arrendamientos largos y campos propios donde se valora construir fertilidad.',
      calendario: 'Propuesta y cierre de precio en invierno (junio–agosto) para maíz y soja; trigo en mayo–junio. Seguimiento con re-muestreo cada 2–3 campañas.',
      notas: { ph: 'Con pH alto o muy ácido el fósforo está menos disponible.', mo: '', arena: 'En suelos arenosos conviene fraccionar y localizar el fósforo.', zn: '' },
      mensaje: 'Te proponemos una mezcla fosforada a medida de cada ambiente, para construir el nivel donde da bajo y reponer lo que se lleva la cosecha.'
    },
    {
      id: 's', nut: 's', titulo: 'Azufre: yeso y mezclas azufradas', producto: 'yeso o mezcla NPS', cultivo: 'soja', precio: 300, rinde: 3, costo: 15,
      lema: 'Azufre: barato y con respuesta frecuente',
      posicion: 'Con materia orgánica baja el suelo aporta poco azufre. Es una corrección de bajo costo por hectárea, con respuesta frecuente en soja, trigo y maíz; el yeso además aporta calcio.',
      propuesta: 'Yeso agrícola o mezcla NPS en la misma pasada de la fertilización, ajustada al análisis de cada lote.',
      objeciones: '«Nunca puse azufre»: los análisis muestran que falta en la mayoría de los lotes. «Es otro gasto»: cuesta pocos kilos de grano por hectárea. «No sé si responde»: ensayo de franjas en el propio campo.',
      apuntar: 'Soja de primera, trigo y maíz en lotes con azufre bajo y materia orgánica baja; buen producto de entrada para clientes nuevos.',
      calendario: 'Trigo: mayo–julio. Maíz y soja: septiembre–diciembre. Ofrecerlo junto con la propuesta de fósforo.',
      notas: { mo: 'La materia orgánica es la principal fuente de azufre del suelo.', arena: 'En suelos arenosos el sulfato se lava más fácil.', ph: '', p: '' },
      mensaje: 'Te proponemos sumar azufre (yeso o mezcla NPS) en la misma pasada: es una corrección de bajo costo por hectárea.'
    },
    {
      id: 'n', nut: 'n', titulo: 'Nitrógeno: urea y fuentes nitrogenadas', producto: 'urea / fuente nitrogenada', cultivo: 'maiz', precio: 180, rinde: 8, costo: 90,
      lema: 'La dosis justa según el análisis',
      posicion: 'El nitrato del análisis dice cuánto nitrógeno ya hay en el suelo. Con ese dato la dosis se ajusta: ni de más (plata tirada) ni de menos (rinde perdido).',
      propuesta: 'Plan de nitrógeno por lote según nitratos, cultivo y rendimiento objetivo, con fraccionamiento en suelos arenosos.',
      objeciones: '«Siempre pongo la misma dosis»: con el análisis se ajusta y se ahorra o se gana rinde. «Llueve poco»: fraccionar y ajustar al pronóstico. «Es caro»: se calcula el retorno por kilo de N.',
      apuntar: 'Maíz y trigo, especialmente en lotes con nitratos bajos y suelos arenosos.',
      calendario: 'Trigo: siembra y macollaje (junio–agosto). Maíz: siembra y V6 (septiembre–diciembre). Muestreo de nitratos antes de cada siembra.',
      notas: { mo: 'Más materia orgánica, más nitrógeno que aporta el suelo.', arena: 'En suelos arenosos el nitrato se pierde más fácil.', ph: '', p: '' },
      mensaje: 'Te proponemos ajustar la dosis de nitrógeno a lo que ya tiene el suelo, para no poner de más ni de menos.'
    },
    {
      id: 'ph', nut: 'ph', titulo: 'Encalado: dolomita y calcita', producto: 'dolomita o calcita', cultivo: 'soja', precio: 300, rinde: 3, costo: 100,
      lema: 'Corregir la acidez libera los nutrientes',
      posicion: 'Con pH ácido bajan la disponibilidad de fósforo, calcio y magnesio y la nodulación de la soja. El encalado corrige por varias campañas y hace rendir mejor el resto de los fertilizantes.',
      propuesta: 'Plan de encalado por lote con dolomita (si además falta magnesio) o calcita, con seguimiento de pH en las campañas siguientes.',
      objeciones: '«No veo el problema»: el análisis lo muestra antes que el cultivo. «Es mucha plata de una vez»: dura varias campañas; se puede hacer por etapas. «No sé cuánto poner»: se calcula con el análisis.',
      apuntar: 'Lotes con pH menor al rango óptimo, sobre todo con soja y alfalfa.',
      calendario: 'Aplicar en otoño–invierno, con tiempo antes de la siembra.',
      notas: { mo: '', arena: 'Los suelos arenosos se acidifican más rápido.', p: '', zn: '' },
      mensaje: 'Te proponemos un plan de encalado: corrige la acidez por varias campañas y hace rendir mejor el resto de los fertilizantes.'
    }
  ];
  function estPorId(id) { for (var i = 0; i < ESTRATEGIAS.length; i++) if (ESTRATEGIAS[i].id === id) return ESTRATEGIAS[i]; return null; }
  var CLAVE_EST = 'suelos.estrategias';
  var estCfg = Object.assign({ grupo: [], prod: {} }, leer(CLAVE_EST, {}) || {});
  function cfgDe(E) {
    var c = estCfg.prod[E.id] = Object.assign({ costo: E.costo, precio: E.precio, rinde: E.rinde, cultivo: E.cultivo, dosis: 100, litros: E.conLitros ? 3 : null, znBase: 0.5, xDisp: '' }, estCfg.prod[E.id] || {});
    return c;
  }
  function guardarEst() { guardar(CLAVE_EST, estCfg); }
  var ultimosMensajes = {};

  function vistaProducto(lista, E) {
    var cfg = cfgDe(E), n = nutPorId(E.nut);
    var r = { titulo: 'Estrategia: ' + E.titulo, puntos: [], tablas: [], graficos: [], kpis: [], conclusiones: [] };
    var camposTodos = unico(lista.filter(function (x) { return x.v[E.nut] != null; }).map(function (x) { return x.campo; })).sort(ordenarTexto);
    var grupo = (estCfg.grupo || []).filter(function (c) { return camposTodos.indexOf(c) >= 0; });
    r.opciones = '<div class="multi-caja"><label>Campos del grupo (por ejemplo, un CREA) <small>Opcional: marcá los campos del grupo; si no marcás ninguno se usan todos.</small></label><div class="multi">' +
      camposTodos.map(function (c) { return '<label><input type="checkbox" data-op="egrupo" value="' + esc(c) + '"' + (grupo.indexOf(c) >= 0 ? ' checked' : '') + '> ' + esc(c) + '</label>'; }).join('') + '</div></div>';
    if (!n || !camposTodos.length) { r.puntos.push('No hay análisis con ' + (n ? n.nombre.toLowerCase() : 'este nutriente') + ' en la búsqueda.'); return r; }
    var L = lista.filter(function (x) { return x.v[E.nut] != null && (!grupo.length || grupo.indexOf(x.campo) >= 0); });
    var C = r.conclusiones;
    function concluir(nivel, titulo, texto, accion) { C.push({ nivel: nivel, titulo: titulo, texto: texto, accion: accion || '' }); }
    var u = n.unidad ? ' ' + n.unidad : '', vz = valoresDe(L, E.nut);
    var esProblema = function (v) { var c = clasificar(n, v); return c && c.k === 'bajo'; };
    var problema = nombreProblema(n), umbral = n.tipo === 'menos' ? Number(n.alto) : Number(n.bajo);
    var def = vz.filter(esProblema).length, pctDef = pct(def, vz.length), med = cuantil(vz, 0.5), cMed = clasificar(n, med);
    var porCampo = ultimaCampaniaPorCampo(L).map(function (pc) {
      var z = cuantil(valoresDe(pc.muestras, E.nut), 0.5), c = clasificar(n, z);
      var pv = valoresDe(pc.muestras, 'p');
      return { campo: pc.campo, campania: pc.campania, n: pc.muestras.length, val: z, estado: c ? c.txt : '', k: c ? c.k : null,
        ph: promedio(valoresDe(pc.muestras, 'ph')), mo: promedio(valoresDe(pc.muestras, 'mo')), p: pv.length ? cuantil(pv, 0.5) : null, pc: pc };
    });
    var camposDef = porCampo.filter(function (o) { return o.k === 'bajo'; });
    var cultivo = CULTIVOS[cfg.cultivo] || 'maíz';
    var kgGrano = cfg.precio ? cfg.costo / cfg.precio * 1000 : null;
    var equilibrio = cfg.rinde && kgGrano != null ? kgGrano / (cfg.rinde * 1000) * 100 : null;
    // PROCOTE Zn: 700 g Zn/L → cada litro por tonelada suma 0,07% de Zn a la mezcla (3 L/t = 0,21%).
    var pctProcote = E.conLitros && cfg.litros ? cfg.litros * 0.07 : null;
    var pctConZn = pctProcote != null ? (cfg.znBase || 0) + pctProcote : null;
    var kgZn1 = pctProcote != null ? cfg.dosis * pctProcote / 100 : null, kgZn2 = pctConZn != null ? cfg.dosis * pctConZn / 100 : null;
    var ha = porCampo.reduce(function (a, o) { return a + (o.k === 'bajo' ? haDe(o.campo) : 0); }, 0);

    // ----- Indicadores -----
    r.kpis.push({ t: 'Muestras con ' + n.corto, v: String(vz.length), sub: porCampo.length + ' campos' + (grupo.length ? ' del grupo' : '') });
    r.kpis.push({ t: 'Muestras con nivel ' + problema, v: pctDef + '%', sub: (n.tipo === 'menos' ? 'más de ' : 'menos de ') + fmt(umbral) + u, k: pctDef >= 50 ? 'bajo' : pctDef >= 25 ? 'medio' : 'bien' });
    r.kpis.push({ t: n.nombre + ' (mediana)', v: fmt(med) + u, sub: 'rango ' + fmt(Math.min.apply(null, vz)) + ' a ' + fmt(Math.max.apply(null, vz)) + u, k: cMed && cMed.k });
    r.kpis.push({ t: 'Campos con nivel ' + problema, v: camposDef.length + ' de ' + porCampo.length, sub: fmt(ha, 0) + ' ha estimadas', k: camposDef.length / porCampo.length >= 0.5 ? 'bajo' : 'medio' });
    if (kgGrano != null) r.kpis.push({ t: 'Se paga con', v: fmt(kgGrano, 0) + ' kg de ' + cultivo + '/ha', sub: equilibrio != null ? fmt(equilibrio, 1) + '% de un rinde de ' + fmt(cfg.rinde) + ' t/ha' : '', k: 'bien' });
    if (pctProcote != null) {
      r.kpis.push({ t: 'Mezcla + PROCOTE Zn', v: fmt(pctProcote, 2) + '% Zn', sub: fmt(cfg.litros) + ' L/t · ' + fmt(kgZn1, 2) + ' kg Zn/ha con ' + fmt(cfg.dosis, 0) + ' kg/ha' });
      if (cfg.znBase) r.kpis.push({ t: 'Mezcla con Zn + PROCOTE', v: fmt(pctConZn, 2) + '% Zn', sub: fmt(cfg.znBase, 2) + '% + ' + fmt(pctProcote, 2) + '% · ' + fmt(kgZn2, 2) + ' kg Zn/ha con ' + fmt(cfg.dosis, 0) + ' kg/ha' });
    }
    if (ha) r.kpis.push({ t: 'Potencial (lotes con problema)', v: plataCorta(ha * cfg.costo), sub: fmt(ha, 0) + ' ha × ' + plata(cfg.costo) + '/ha', k: 'bien' });

    // ----- Los datos (para presentar) -----
    concluir(pctDef >= 50 ? 'critico' : pctDef >= 25 ? 'atencion' : 'info', n.nombre + ': ' + pctDef + '% de las muestras con nivel ' + problema,
      'Mediana ' + fmt(med) + u + ' en ' + vz.length + ' muestras de ' + porCampo.length + ' campos (' + textoRango(n) + '). ' + camposDef.length + ' campos tienen su mediana en nivel ' + problema + '.',
      pctDef >= 50 ? 'Mensaje para el grupo: no es un problema de un lote, es un problema de la zona.' : 'Mensaje: hay lotes puntuales para corregir; el análisis dice cuáles.');
    var camps = unico(L.map(function (x) { return x.campania; })).sort(ordenarTexto).filter(function (c) { return L.filter(function (x) { return x.campania === c; }).length >= 5; });
    var meds = camps.map(function (c) { return cuantil(valoresDe(L.filter(function (x) { return x.campania === c; }), E.nut), 0.5); });
    if (camps.length >= 2) {
      var mejora = n.tipo === 'menos' ? meds[meds.length - 1] < meds[0] : meds[meds.length - 1] > meds[0];
      concluir('info', 'Evolución por campaña (mediana)', camps.map(function (c, i) { return c + ' ' + fmt(meds[i]); }).join(' > ') + u + '.',
        mejora ? 'Mejoró en el período; conviene sostener la reposición.' : 'No mejora con el tiempo: lo que se aplica no alcanza a reponer lo que se lleva la cosecha.');
    }
    var fam = familiaAmbientes(L, 4);
    if (fam.length >= 2) {
      var ma = fam.map(function (a) { var l = L.filter(function (x) { return ambienteDe(x) === a; }); return { a: a, m: cuantil(valoresDe(l, E.nut), 0.5), d: pct(l.filter(function (x) { return esProblema(x.v[E.nut]); }).length, l.length) }; });
      concluir('info', n.nombre + ' según el ambiente', ma.map(function (o) { return o.a + ': mediana ' + fmt(o.m) + u + ', ' + o.d + '% ' + problema; }).join(' · ') + '.', 'Muestra dónde concentrar la propuesta y la dosis.');
    }
    ['ph', 'mo', 'arena', 'p', 'zn'].forEach(function (x) {
      if (x === E.nut || E.notas[x] == null) return;
      var pts = L.filter(function (m) { return m.v[x] != null; });
      if (pts.length < 15) return;
      var pe = pearson(pts.map(function (m) { return m.v[x]; }), pts.map(function (m) { return m.v[E.nut]; }));
      if (!pe || Math.abs(pe.r) < 0.2) return;
      var nx = nutPorId(x);
      concluir('info', 'Relación con ' + nx.nombre.toLowerCase() + ': r = ' + fmt(pe.r, 2) + ' (' + pts.length + ' muestras)', (E.notas[x] ? E.notas[x] + ' ' : '') + 'En estos datos, a más ' + nx.nombre.toLowerCase() + ', ' + (pe.r > 0 ? 'más' : 'menos') + ' ' + n.nombre.toLowerCase() + '.', '');
    });
    if (E.id === 'zn') {
      var pAlto = L.filter(function (x) { return x.v.p != null && x.v.p >= 30 && esProblema(x.v.zn); }).length;
      if (pAlto >= 5) concluir('info', pAlto + ' muestras con fósforo alto (30 ppm o más) y zinc deficiente', 'Aun con buen fósforo, el zinc limita.', 'Argumento: fertilizar solo con fósforo no alcanza; la mezcla tiene que llevar zinc.');
    }
    var conBase = lista.filter(function (x) { return x.v.p != null || x.v.ph != null; });
    var sinDato = conBase.filter(function (x) { return x.v[E.nut] == null; }).length;
    if (sinDato && conBase.length && sinDato / conBase.length >= 0.2) concluir('accion', 'Falta ' + n.nombre.toLowerCase() + ' en el ' + pct(sinDato, conBase.length) + '% de los análisis', 'Muchos análisis no lo incluyen.', 'Acción: ofrecer ese análisis sin cargo en el próximo muestreo. Suma datos y genera la próxima venta.');

    // ----- Estrategia de marketing y ventas -----
    concluir('oportunidad', 'Posicionamiento: «' + E.lema + '»', E.posicion, 'Propuesta MORERO: ' + E.propuesta);
    if (pctProcote != null) concluir('oportunidad', 'Dos niveles de oferta según el análisis',
      'Mezcla + PROCOTE Zn (' + fmt(cfg.litros) + ' L/t): ' + fmt(pctProcote, 2) + '% de Zn, ' + fmt(kgZn1, 2) + ' kg Zn/ha con ' + fmt(cfg.dosis, 0) + ' kg/ha de mezcla.' +
      (cfg.znBase ? ' Mezcla con zinc (' + fmt(cfg.znBase, 2) + '%) + PROCOTE Zn: ' + fmt(pctConZn, 2) + '% de Zn, ' + fmt(kgZn2, 2) + ' kg Zn/ha.' : ''),
      'Estrategia: la versión con PROCOTE como estándar para lotes con zinc suficiente o moderado, y la mezcla con zinc + PROCOTE para los lotes deficientes (' + camposDef.length + ' campos). Ofrecer las dos opciones ayuda al productor a decidir y sube el ticket. ' +
      'Ojo técnico: es un aporte localizado en la línea de siembra, distribuido en cada gránulo; en lotes muy deficientes (menos de ' + fmt(bajo / 2) + ' ppm) el asesor puede indicar una dosis mayor de zinc. Conviene decirlo en el CREA antes de que lo pregunten.');
    if (kgGrano != null) concluir('oportunidad', 'Economía: con ' + fmt(kgGrano, 0) + ' kg de ' + cultivo + ' por hectárea se paga',
      'Costo ' + plata(cfg.costo) + '/ha y ' + cultivo + ' a ' + plata(cfg.precio) + '/t' + (equilibrio != null ? ': alcanza con ' + fmt(equilibrio, 1) + '% más de rinde sobre ' + fmt(cfg.rinde) + ' t/ha.' : '.'),
      'Mostrar el punto de equilibrio y pedir que lo validen en su propio campo. Ajustá costo, precio y rinde abajo.');
    var candidatos = porCampo.filter(function (o) { return o.k === 'bajo'; }).sort(function (a, b) { return n.tipo === 'menos' ? b.val - a.val : a.val - b.val; }).slice(0, 6);
    if (candidatos.length) concluir('accion', 'Ensayo en franjas en los campos del grupo',
      'Franjas con y sin ' + E.producto + ', en el mismo ambiente, con al menos 3 repeticiones y cosecha con monitor de rendimiento. Candidatos: ' + esc(candidatos.map(function (o) { return o.campo + ' (' + fmt(o.val) + ')'; }).join(', ')) + '.',
      'Presentar los resultados en la reunión de cosecha y hacer un día de campo. El dato propio del grupo vende más que cualquier folleto.');
    concluir('accion', 'A quién apuntar primero', E.apuntar + ' ' + camposDef.length + ' campos de la base tienen nivel ' + problema + '.', 'Usar la tabla de abajo: cada campo tiene su mensaje de WhatsApp armado con su propio dato.');
    concluir('accion', 'Calendario comercial', E.calendario, 'Asegurar stock y turnos de planta antes del pico de pedidos.');
    concluir('objecion', 'Objeciones esperables y respuestas', E.objeciones + (kgGrano != null ? ' Punto de equilibrio: ' + fmt(kgGrano, 0) + ' kg de ' + cultivo + '/ha.' : ''), 'Llevar a la reunión el gráfico de distribución del grupo y el cálculo de equilibrio.');
    var ordNiv = { critico: 0, atencion: 1, oportunidad: 2, accion: 3, info: 4, objecion: 5 };
    C.sort(function (a, b) { return ordNiv[a.nivel] - ordNiv[b.nivel]; });

    // ----- Gráficos -----
    var bajo = Number(n.bajo), alto = Number(n.alto), cortes, etiq, cols;
    if (n.tipo === 'rango') { cortes = [-Infinity, bajo - 0.5, bajo, alto, alto + 0.5, Infinity]; }
    else if (n.tipo === 'menos') { cortes = [-Infinity, bajo / 2, bajo, alto, alto * 1.5, Infinity]; }
    else { cortes = [-Infinity, bajo / 2, bajo, (bajo + alto) / 2 > bajo ? (bajo + alto) / 2 : bajo * 1.25, Math.max(alto, bajo * 1.5), Infinity]; }
    etiq = cortes.slice(0, -1).map(function (c, i) {
      var h = cortes[i + 1];
      return c === -Infinity ? 'menos de ' + fmt(h) : h === Infinity ? fmt(c) + ' o más' : fmt(c) + '–' + fmt(h);
    });
    var cnt = etiq.map(function (_, i) { return vz.filter(function (v) { return v >= cortes[i] && v < cortes[i + 1]; }).length; });
    cols = etiq.map(function (_, i) { var mid = cortes[i] === -Infinity ? cortes[i + 1] - 0.01 : cortes[i]; var c = clasificar(n, mid); return c ? COLORES[c.k] : '#5B5B5F'; });
    r.graficos.push({
      tipo: 'barras', ancho: 'medio', titulo: 'Distribución de las muestras por nivel de ' + n.corto + (n.unidad ? ' (' + n.unidad + ')' : ''), cats: etiq, vals: cnt.map(function (k) { return k * 100 / vz.length; }), unidad: '% de las muestras',
      colores: cols, estados: cnt.map(function (k) { return k + ' muestras'; }), detalles: etiq.map(function () { return ''; }), lineas: [],
      leyenda: unico(cols).map(function (c) { var k = Object.keys(COLORES).filter(function (x) { return COLORES[x] === c; })[0]; return { c: c, t: k === 'bajo' ? 'Nivel ' + problema : NOMBRE_ESTADO[k] || '' }; })
    });
    if (camps.length >= 2) {
      var gl = graficoBarras(n, camps, meds, n.nombre + ' por campaña (mediana' + (n.unidad ? ', ' + n.unidad : '') + ')', camps.map(function (c) { var l = valoresDe(L.filter(function (x) { return x.campania === c; }), E.nut); return l.length + ' muestras · ' + pct(l.filter(esProblema).length, l.length) + '% ' + problema; }));
      gl.tipo = 'linea'; gl.ancho = 'medio'; r.graficos.push(gl);
    }
    if (fam.length >= 2) {
      var ga = graficoBarras(n, fam, fam.map(function (a) { return cuantil(valoresDe(L.filter(function (x) { return ambienteDe(x) === a; }), E.nut), 0.5); }), n.nombre + ' por ambiente (mediana' + (n.unidad ? ', ' + n.unidad : '') + ')',
        fam.map(function (a) { return L.filter(function (x) { return ambienteDe(x) === a; }).length + ' muestras'; }));
      ga.ancho = 'medio'; r.graficos.push(ga);
    }
    var ranking = porCampo.slice().sort(function (a, b) { return n.tipo === 'menos' ? b.val - a.val : a.val - b.val; }).slice(0, 15);
    r.graficos.push({
      tipo: 'ranking', ancho: 'medio', titulo: 'Campos con nivel más ' + problema + ' (candidatos a ensayo)', sufijo: u, decimales: 2,
      cats: ranking.map(function (o) { return o.campo; }), vals: ranking.map(function (o) { return o.val; }), colores: ranking.map(function (o) { return o.k ? COLORES[o.k] : '#5B5B5F'; }),
      estados: ranking.map(function (o) { return o.estado; }), detalles: ranking.map(function (o) { return 'Campaña ' + o.campania + ' · ' + o.n + ' muestras'; }),
      leyenda: unico(ranking.map(function (o) { return o.k; })).filter(Boolean).map(function (k) { return { c: COLORES[k], t: NOMBRE_ESTADO[k] }; })
    });
    var opX = ['ph', 'mo', 'arena', 'p', 'zn', 's', 'n'].filter(function (x) { return x !== E.nut && nutPorId(x) && L.filter(function (m) { return m.v[x] != null; }).length >= 5; });
    if (opX.length) {
      var xId = opX.indexOf(cfg.xDisp) >= 0 ? cfg.xDisp : opX[0], nx = nutPorId(xId);
      var pts = L.filter(function (m) { return m.v[xId] != null; });
      var pe2 = pearson(pts.map(function (m) { return m.v[xId]; }), pts.map(function (m) { return m.v[E.nut]; }));
      r.graficos.push({
        tipo: 'dispersion', ancho: 'completo', titulo: n.nombre + ' según ' + nx.corto + (pe2 ? ' · r = ' + fmt(pe2.r, 2) + ' (' + pts.length + ' muestras)' : ''),
        opciones: '<label>Comparar con <select data-op="ex">' + opX.map(function (x) { return '<option value="' + x + '"' + (x === xId ? ' selected' : '') + '>' + esc(nutPorId(x).nombre) + '</option>'; }).join('') + '</select></label>',
        puntos: pts.map(function (m) { return { x: m.v[xId], y: m.v[E.nut], t: m.campo + ' · ' + m.lote + ' · ' + m.campania }; }), xl: etiquetaNut(nx), yl: etiquetaNut(n), recta: pe2,
        lineaY: { v: umbral, t: (n.tipo === 'menos' ? 'elevado desde ' : 'umbral ') + fmt(umbral) + u },
        leyenda: [{ c: '#8F131C', t: 'Cada punto es una muestra' }, { c: null, t: 'Líneas punteadas: tendencia y umbral' }]
      });
    }

    // ----- Tabla: campos y mensaje -----
    ultimosMensajes = {};
    var body = [], est = [];
    porCampo.slice().sort(function (a, b) { return n.tipo === 'menos' ? b.val - a.val : a.val - b.val; }).forEach(function (o) {
      var msg = ['Hola, ¿cómo estás? Te escribo de MORERO Semillas y Cereales.', '',
        'Revisamos el análisis de suelo de ' + o.campo + ' (campaña ' + o.campania + '). ' + n.nombre + ': ' + fmt(o.val) + u + (o.estado ? ' (' + o.estado.toLowerCase() + ')' : '') + '.',
        pctDef >= 25 ? 'En la zona el ' + pctDef + '% de las muestras está en nivel ' + problema + '.' : '', '',
        E.mensaje + (pctProcote != null ? ' Con ' + fmt(cfg.litros) + ' L/t la mezcla lleva ' + fmt(pctProcote, 2) + '% de zinc' + (cfg.znBase && o.k === 'bajo' ? ', o ' + fmt(pctConZn, 2) + '% si partimos de una mezcla con zinc' : '') + '.' : ''), kgGrano != null ? 'Con unos ' + fmt(kgGrano, 0) + ' kg de ' + cultivo + ' por hectárea se paga.' : '', '',
        '¿Te paso la cotización o armamos una franja de prueba en tu campo?'].filter(function (l, i, a) { return l !== '' || (a[i - 1] !== '' && i > 0); }).join('\n');
      ultimosMensajes[o.campo] = msg;
      body.push([o.campo, o.campania, String(o.n), fmt(o.val), o.estado, o.ph == null ? '–' : fmt(o.ph, 1), o.mo == null ? '–' : fmt(o.mo), o.p == null ? '–' : fmt(o.p),
        o.k === 'bajo' ? 'Ofrecer ' + E.producto + ' + franja de ensayo' : 'Mantener: reposición',
        { t: '', html: '<button type="button" class="boton-texto" data-msg="' + esc(o.campo) + '">Copiar</button> <a class="boton-texto" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(msg) + '">WhatsApp</a>' }]);
      est.push([null, null, null, o.k, o.k, null, null, null, null, null]);
    });
    r.tablas.push({ titulo: 'Campos ordenados por ' + n.nombre.toLowerCase() + ' (mediana de la última campaña)', head: ['Campo', 'Campaña', 'Muestras', n.corto + (n.unidad ? ' (' + n.unidad + ')' : ''), 'Estado', 'pH', 'MO (%)', 'P (ppm)', 'Propuesta', 'Mensaje'], body: body, estados: est, numeros: [2, 3, 5, 6, 7], maxFilas: 20, soloPantalla: [9],
      nota: (E.conLitros ? 'PROCOTE Zn (YaraVita): suspensión concentrada de zinc (aprox. 700 g Zn/L) que se pulveriza sobre el fertilizante en la mezcladora; cada litro por tonelada suma 0,07% de Zn (3 L/t = 0,21%). ' : '') + 'Costo por hectárea, precio y rinde son supuestos editables; las hectáreas son las del Panel comercial general.' });
    r.planTitulo = 'Supuestos para la presentación';
    r.planOpciones = '<label>Cultivo <select data-op="ecultivo">' + Object.keys(CULTIVOS).map(function (k) { return '<option value="' + k + '"' + (cfg.cultivo === k ? ' selected' : '') + '>' + CULTIVOS[k] + '</option>'; }).join('') + '</select></label>' +
      '<label>Costo del producto (US$/ha) <input type="text" inputmode="decimal" data-op="ecosto" value="' + esc(String(cfg.costo).replace('.', ',')) + '"></label>' +
      '<label>Precio del grano (US$/t) <input type="text" inputmode="decimal" data-op="eprecio" value="' + esc(fmt(cfg.precio, 0)) + '"></label>' +
      '<label>Rinde esperado (t/ha) <input type="text" inputmode="decimal" data-op="erinde" value="' + esc(String(cfg.rinde).replace('.', ',')) + '"></label>' +
      (E.conLitros ? '<label>Dosis de mezcla (kg/ha) <input type="text" inputmode="decimal" data-op="edosis" value="' + esc(fmt(cfg.dosis, 0)) + '"></label>' +
        '<label>L de PROCOTE Zn por t <input type="text" inputmode="decimal" data-op="elitros" placeholder="Completar" value="' + (cfg.litros == null ? '' : esc(String(cfg.litros).replace('.', ','))) + '"></label>' +
        '<label>Zn propio de la mezcla (%) <input type="text" inputmode="decimal" data-op="ezbase" value="' + esc(String(cfg.znBase || 0).replace('.', ',')) + '"></label>' : '');
    r.puntos.push('<i>Datos de los análisis cargados y estrategia sugerida. Costo, precio, rinde y dosis son supuestos: ajustalos antes de presentar. La recomendación agronómica final la da el asesor.</i>');
    return r;
  }

  function vistaComercialGeneral(lista) {
    var E = estPorId(comCfg.estrategia);
    var r = E ? vistaProducto(lista, E) : vistaComercial(lista);
    r.opciones = '<label>Estrategia por producto <select data-op="cest"><option value="">Todos los productos (panorama general)</option>' +
      ESTRATEGIAS.map(function (x) { return '<option value="' + x.id + '"' + (E && E.id === x.id ? ' selected' : '') + '>' + esc(x.titulo) + '</option>'; }).join('') + '</select></label>' + (r.opciones || '');
    return r;
  }
  function armarVista() {
    var lista = filtrados();
    var f = { comercial: vistaComercialGeneral, panel: vistaPanel, general: vistaGeneral, campo: vistaCampo, nutriente: vistaNutriente, comparar: vistaComparar }[estado.vista];
    var r = f(lista);
    if (lista.length && estado.vista !== 'panel' && estado.vista !== 'comercial') r.puntos.push('<i>Evaluación orientativa según los rangos cargados en «Nutrientes y rangos». Confirmar las decisiones con el asesor agronómico.</i>');
    if (!r.graficos) r.graficos = r.grafico ? [r.grafico] : [];
    return r;
  }

  // ---------- Gráficos (canvas, sin librerías) ----------
  function dibujar(canvas, g, W, H, escala) {
    var ctx = canvas.getContext('2d');
    canvas.width = Math.round(W * escala); canvas.height = Math.round(H * escala);
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    var hits = [];
    var fuente = '"Segoe UI", Roboto, Arial, sans-serif';
    ctx.fillStyle = '#5B5B5F'; ctx.font = '600 14px ' + fuente; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    var tit = g.titulo || '';
    while (tit.length > 8 && ctx.measureText(tit).width > W - 8) tit = tit.slice(0, -2);
    if (tit !== (g.titulo || '')) tit = tit.slice(0, -1) + '…';
    ctx.fillText(tit, 4, 4);
    if (g.tipo !== 'dispersion' && (!g.cats || !g.cats.length)) {
      ctx.font = '14px ' + fuente; ctx.fillText('Sin datos para graficar.', 4, 40); return hits;
    }

    if (g.tipo === 'apilado') {
      var izq = Math.min(110, Math.max(50, Math.max.apply(null, g.cats.map(function (c) { ctx.font = '13px ' + fuente; return ctx.measureText(c).width; })) + 14));
      var arriba = 32, der = 12, abajo = 24, alto = H - arriba - abajo;
      var paso = alto / g.cats.length, barra = Math.min(26, paso * 0.7), ancho = W - izq - der;
      ctx.strokeStyle = '#e4e4e7'; ctx.lineWidth = 1; ctx.font = '11px ' + fuente; ctx.fillStyle = '#6b6b70'; ctx.textAlign = 'center';
      [0, 25, 50, 75, 100].forEach(function (p) {
        var x = izq + ancho * p / 100;
        ctx.beginPath(); ctx.moveTo(x + .5, arriba); ctx.lineTo(x + .5, arriba + alto); ctx.stroke();
        ctx.fillText(p + '%', x, arriba + alto + 6);
      });
      g.cats.forEach(function (c, i) {
        var y = arriba + paso * i + (paso - barra) / 2, x = izq;
        ctx.fillStyle = '#222226'; ctx.font = '13px ' + fuente; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(c, izq - 8, y + barra / 2);
        g.series.forEach(function (s) {
          var w = ancho * s.vals[i] / 100;
          if (w <= 0) return;
          ctx.fillStyle = s.color;
          ctx.fillRect(x, y, Math.max(0, w - 2), barra);
          if (w > 34) { ctx.fillStyle = '#fff'; ctx.font = '600 11px ' + fuente; ctx.textAlign = 'center'; ctx.fillText(Math.round(s.vals[i]) + '%', x + w / 2 - 1, y + barra / 2); }
          hits.push({ x: x, y: y, w: w, h: barra, html: '<b>' + esc(c) + '</b><br>' + esc(s.nombre) + ': ' + Math.round(s.vals[i]) + '% (' + s.cuentas[i] + ' muestras)' });
          x += w;
        });
      });
      return hits;
    }

    if (g.tipo === 'ranking') return dibujarRanking(ctx, g, W, H, fuente, hits);
    if (g.tipo === 'dispersion') return dibujarDispersion(ctx, g, W, H, fuente, hits);

    // Barras verticales (o línea) con líneas de referencia
    var vals = g.vals.map(function (v) { return v == null ? 0 : v; });
    var maxV = Math.max.apply(null, vals.concat(g.lineas.map(function (l) { return l.v; }))) * 1.15 || 1;
    var paso2 = Math.pow(10, Math.floor(Math.log10(maxV / 4))), ticks = [];
    var m = [1, 2, 2.5, 5, 10].map(function (f) { return f * paso2; }).filter(function (s) { return maxV / s <= 6; })[0] || paso2 * 10;
    for (var t = 0; t <= maxV + 1e-9; t += m) ticks.push(t);
    maxV = ticks[ticks.length - 1] < maxV ? ticks[ticks.length - 1] + m : ticks[ticks.length - 1];
    if (ticks[ticks.length - 1] < maxV) ticks.push(maxV);
    ctx.font = '11px ' + fuente;
    var izq2 = Math.max.apply(null, ticks.map(function (x) { return ctx.measureText(fmt(x)).width; })) + 14;
    ctx.font = '12px ' + fuente;
    var anchoTxt = Math.max.apply(null, g.cats.map(function (c) { return ctx.measureText(c).width; }));
    var arriba2 = 34, der2 = 10, ancho2 = W - izq2 - der2;
    var pasoX = ancho2 / g.cats.length, girar = anchoTxt > pasoX - 6;
    var largoGirado = Math.min(anchoTxt, ctx.measureText('MMMMMMMMMMMMMMMMMMMMMM').width * 0.62);
    var abajo2 = girar ? Math.min(110, largoGirado * 0.72 + 16) : 26;
    if (girar) {   // que la primera etiqueta girada no se salga por la izquierda
      var primera = ctx.measureText(g.cats[0].length > 22 ? g.cats[0].slice(0, 21) + '…' : g.cats[0]).width * 0.72;
      var falta = primera - (izq2 + pasoX / 2) + 4;
      if (falta > 0) { izq2 += falta; ancho2 = W - izq2 - der2; pasoX = ancho2 / g.cats.length; }
    }
    var alto2 = H - arriba2 - abajo2;
    function yDe(v) { return arriba2 + alto2 - alto2 * v / maxV; }
    ctx.strokeStyle = '#ececed'; ctx.lineWidth = 1; ctx.fillStyle = '#6b6b70'; ctx.font = '11px ' + fuente; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ticks.forEach(function (tv) { var y = Math.round(yDe(tv)) + .5; ctx.beginPath(); ctx.moveTo(izq2, y); ctx.lineTo(W - der2, y); ctx.stroke(); ctx.fillText(fmt(tv), izq2 - 6, y); });
    var barra2 = Math.min(56, pasoX * 0.62), puntosLinea = [];
    g.cats.forEach(function (c, i) {
      var v = g.vals[i], x = izq2 + pasoX * i + (pasoX - barra2) / 2;
      if (v != null && g.tipo === 'linea') {
        puntosLinea.push({ x: izq2 + pasoX * i + pasoX / 2, y: yDe(v), c: g.colores[i], v: v });
        hits.push({ x: izq2 + pasoX * i, y: arriba2, w: pasoX, h: alto2, html: '<b>' + esc(c) + '</b><br>' + fmt(v) + (g.unidad ? ' ' + esc(g.unidad) : '') + ' · ' + esc(g.estados[i]) + (g.detalles[i] ? '<br><small>' + esc(g.detalles[i]) + '</small>' : '') });
      } else if (v != null) {
        var y = yDe(v), h = arriba2 + alto2 - y, r = Math.min(4, barra2 / 2, h);
        ctx.fillStyle = g.colores[i];
        ctx.beginPath();
        ctx.moveTo(x, arriba2 + alto2); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.lineTo(x + barra2 - r, y); ctx.quadraticCurveTo(x + barra2, y, x + barra2, y + r); ctx.lineTo(x + barra2, arriba2 + alto2); ctx.closePath(); ctx.fill();
        if (g.cats.length <= 16) { ctx.fillStyle = '#222226'; ctx.font = '600 11px ' + fuente; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(fmt(v), x + barra2 / 2, y - 3); }
        hits.push({ x: izq2 + pasoX * i, y: arriba2, w: pasoX, h: alto2, html: '<b>' + esc(c) + '</b><br>' + fmt(v) + (g.unidad ? ' ' + esc(g.unidad) : '') + ' · ' + esc(g.estados[i]) + (g.detalles[i] ? '<br><small>' + esc(g.detalles[i]) + '</small>' : '') });
      }
      ctx.fillStyle = '#222226'; ctx.font = '12px ' + fuente;
      var cx = izq2 + pasoX * i + pasoX / 2;
      if (girar) {
        ctx.save(); ctx.translate(cx, arriba2 + alto2 + 8); ctx.rotate(-Math.PI / 4);
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        var tx = c.length > 22 ? c.slice(0, 21) + '…' : c;
        ctx.fillText(tx, 0, 0); ctx.restore();
      } else { ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(c, cx, arriba2 + alto2 + 6); }
    });
    ctx.strokeStyle = '#5B5B5F'; ctx.beginPath(); ctx.moveTo(izq2, arriba2 + alto2 + .5); ctx.lineTo(W - der2, arriba2 + alto2 + .5); ctx.stroke();
    // Líneas de referencia
    ctx.setLineDash([6, 4]); ctx.lineWidth = 1.5;
    g.lineas.forEach(function (l, i) {
      var y = Math.round(yDe(l.v)) + .5;
      ctx.strokeStyle = '#5B5B5F'; ctx.beginPath(); ctx.moveTo(izq2, y); ctx.lineTo(W - der2, y); ctx.stroke();
      ctx.font = '11px ' + fuente; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      var ly = y - 2 - (i && Math.abs(yDe(g.lineas[0].v) - yDe(l.v)) < 14 ? 12 : 0), lw = ctx.measureText(l.t).width;
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(W - der2 - lw - 5, ly - 12, lw + 5, 12);
      ctx.fillStyle = '#5B5B5F'; ctx.fillText(l.t, W - der2 - 2, ly);
    });
    ctx.setLineDash([]);
    if (puntosLinea.length) {
      ctx.strokeStyle = '#5B5B5F'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
      ctx.beginPath();
      puntosLinea.forEach(function (pt, i) { if (i) ctx.lineTo(pt.x, pt.y); else ctx.moveTo(pt.x, pt.y); });
      ctx.stroke();
      puntosLinea.forEach(function (pt) {
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2); ctx.fillStyle = pt.c; ctx.fill();
        if (puntosLinea.length <= 12) { ctx.fillStyle = '#222226'; ctx.font = '600 11px ' + fuente; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(fmt(pt.v), pt.x, pt.y - 8); }
      });
    }
    return hits;
  }

  // Escala "linda" para un eje: devuelve mínimo, máximo y marcas.
  function escalaEje(min, max, partes) {
    if (min === max) { min = min - 1; max = max + 1; }
    var paso = Math.pow(10, Math.floor(Math.log10((max - min) / partes)));
    paso = [1, 2, 2.5, 5, 10].map(function (f) { return f * paso; }).filter(function (x) { return (max - min) / x <= partes + 1; })[0] || paso * 10;
    var lo = Math.floor(min / paso) * paso, hi = Math.ceil(max / paso) * paso, t = [];
    for (var v = lo; v <= hi + paso / 1000; v += paso) t.push(Math.round(v * 1e6) / 1e6);
    return { min: lo, max: hi, ticks: t };
  }

  function dibujarRanking(ctx, g, W, H, fuente, hits) {
    ctx.font = '12px ' + fuente;
    var izq = Math.min(W * 0.42, Math.max.apply(null, g.cats.map(function (c) { return ctx.measureText(c).width; })) + 12);
    var arriba = 32, abajo = 22, der = g.moneda ? 78 : 50, ancho = W - izq - der, alto = H - arriba - abajo;
    var paso = alto / g.cats.length, barra = Math.min(22, paso * 0.7), max = g.max || Math.max.apply(null, g.vals) || 1;
    ctx.strokeStyle = '#ececed'; ctx.lineWidth = 1; ctx.fillStyle = '#6b6b70'; ctx.font = '11px ' + fuente; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    function eje(v) { return g.moneda ? (v >= 1e6 ? fmt(v / 1e6, 1) + ' M' : v >= 1e3 ? fmt(v / 1e3, 0) + ' mil' : fmt(v, 0)) : fmt(v); }
    function valorTxt(v) { return g.moneda ? plataCorta(v) : g.sufijo != null || g.decimales != null ? fmt(v, g.decimales != null ? g.decimales : 0) + (g.sufijo || '') : fmt(v, 0); }
    [0, 0.25, 0.5, 0.75, 1].forEach(function (f) { var x = Math.round(izq + ancho * f) + .5; ctx.beginPath(); ctx.moveTo(x, arriba); ctx.lineTo(x, arriba + alto); ctx.stroke(); ctx.fillText(eje(max * f), x, arriba + alto + 6); });
    g.cats.forEach(function (c, i) {
      var y = arriba + paso * i + (paso - barra) / 2, w = Math.max(2, ancho * g.vals[i] / max), r = Math.min(4, barra / 2, w);
      ctx.fillStyle = '#222226'; ctx.font = '12px ' + fuente; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      var t = c; while (t.length > 4 && ctx.measureText(t).width > izq - 12) t = t.slice(0, -2);
      ctx.fillText(t === c ? c : t + '…', izq - 8, y + barra / 2);
      ctx.fillStyle = g.colores[i];
      ctx.beginPath(); ctx.moveTo(izq, y); ctx.lineTo(izq + w - r, y); ctx.quadraticCurveTo(izq + w, y, izq + w, y + r);
      ctx.lineTo(izq + w, y + barra - r); ctx.quadraticCurveTo(izq + w, y + barra, izq + w - r, y + barra); ctx.lineTo(izq, y + barra); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#222226'; ctx.font = '600 11px ' + fuente; ctx.textAlign = 'left';
      ctx.fillText(valorTxt(g.vals[i]), izq + w + 5, y + barra / 2);
      hits.push({ x: 0, y: arriba + paso * i, w: W, h: paso, html: '<b>' + esc(c) + '</b><br>' + (g.moneda || g.sufijo != null || g.decimales != null ? '' : 'Índice ') + esc(valorTxt(g.vals[i])) + ' · ' + esc(g.estados[i]) + (g.detalles[i] ? '<br><small>' + esc(g.detalles[i]) + '</small>' : '') });
    });
    return hits;
  }

  function dibujarDispersion(ctx, g, W, H, fuente, hits) {
    if (!g.puntos.length) { ctx.font = '14px ' + fuente; ctx.fillText('Sin muestras con los dos datos.', 4, 40); return hits; }
    var xs = g.puntos.map(function (p) { return p.x; }), ys = g.puntos.map(function (p) { return p.y; }).concat(g.lineaY ? [g.lineaY.v] : []);
    var ex = escalaEje(Math.min.apply(null, xs), Math.max.apply(null, xs), W < 500 ? 4 : 6), ey = escalaEje(Math.min.apply(null, ys), Math.max.apply(null, ys), 5);
    ctx.font = '11px ' + fuente;
    var izq = Math.max.apply(null, ey.ticks.map(function (t) { return ctx.measureText(fmt(t)).width; })) + 30, arriba = 34, abajo = 44, der = 14;
    var ancho = W - izq - der, alto = H - arriba - abajo;
    function X(v) { return izq + ancho * (v - ex.min) / (ex.max - ex.min); }
    function Y(v) { return arriba + alto - alto * (v - ey.min) / (ey.max - ey.min); }
    ctx.strokeStyle = '#ececed'; ctx.lineWidth = 1; ctx.fillStyle = '#6b6b70';
    ey.ticks.forEach(function (t) { var y = Math.round(Y(t)) + .5; ctx.beginPath(); ctx.moveTo(izq, y); ctx.lineTo(W - der, y); ctx.stroke(); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(fmt(t), izq - 6, y); });
    ex.ticks.forEach(function (t) { var x = Math.round(X(t)) + .5; ctx.beginPath(); ctx.moveTo(x, arriba); ctx.lineTo(x, arriba + alto); ctx.stroke(); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(fmt(t), x, arriba + alto + 5); });
    ctx.fillStyle = '#5B5B5F'; ctx.font = '600 12px ' + fuente; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(g.xl, izq + ancho / 2, H - 4);
    ctx.save(); ctx.translate(12, arriba + alto / 2); ctx.rotate(-Math.PI / 2); ctx.textBaseline = 'middle'; ctx.fillText(g.yl, 0, 0); ctx.restore();
    g.puntos.forEach(function (p) {
      var x = X(p.x), y = Y(p.y);
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = 'rgba(143,19,28,0.5)'; ctx.fill();
      hits.push({ cx: x, cy: y, html: '<b>' + esc(p.t) + '</b><br>' + esc(g.xl) + ': ' + fmt(p.x) + '<br>' + esc(g.yl) + ': ' + fmt(p.y) });
    });
    if (g.lineaY) {
      var yl = Math.round(Y(g.lineaY.v)) + .5;
      ctx.setLineDash([3, 3]); ctx.strokeStyle = '#8F131C'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(izq, yl); ctx.lineTo(W - der, yl); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = '11px ' + fuente; var tw = ctx.measureText(g.lineaY.t).width;
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(W - der - tw - 6, yl - 14, tw + 6, 12);
      ctx.fillStyle = '#8F131C'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText(g.lineaY.t, W - der - 2, yl - 2);
    }
    if (g.recta) {
      ctx.save(); ctx.beginPath(); ctx.rect(izq, arriba, ancho, alto); ctx.clip();
      ctx.setLineDash([6, 4]); ctx.strokeStyle = '#5B5B5F'; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(X(ex.min), Y(g.recta.a + g.recta.b * ex.min)); ctx.lineTo(X(ex.max), Y(g.recta.a + g.recta.b * ex.max)); ctx.stroke();
      ctx.restore(); ctx.setLineDash([]);
    }
    return hits;
  }

  function leyendaItems(g) {
    if (!g) return [];
    if (g.leyenda) return g.leyenda;
    if (g.tipo === 'apilado') return g.series.map(function (s) { return { c: s.color, t: s.nombre }; });
    var vistos = {}, items = [];
    g.colores.forEach(function (c, i) { if (!vistos[c]) { vistos[c] = 1; items.push({ c: c, t: g.estados[i] }); } });
    if (g.lineas && g.lineas.length) items.push({ c: null, t: 'Línea punteada: límites de interpretación' });
    return items;
  }
  function leyendaHTML(g) {
    return leyendaItems(g).map(function (it) {
      return '<span>' + (it.c ? '<i style="background:' + it.c + '"></i>' : '<i class="linea" style="border-color:#5B5B5F"></i>') + esc(it.t) + '</span>';
    }).join('');
  }

  var graficosActuales = [];
  function alturaGrafico(g, W) {
    if (g.tipo === 'apilado') return Math.max(200, 50 + g.cats.length * 34);
    if (g.tipo === 'ranking') return Math.max(180, 56 + g.cats.length * 30);
    return W < 500 ? 300 : 340;
  }
  function pintarGraficos() {
    document.querySelectorAll('#graficos canvas').forEach(function (cv) {
      var g = graficosActuales[cv.dataset.i];
      if (!g) return;
      var W = cv.clientWidth || cv.parentNode.clientWidth || 600, H = alturaGrafico(g, W);
      cv.style.height = H + 'px';
      cv._hits = dibujar(cv, g, W, H, window.devicePixelRatio || 1);
    });
  }
  function tip(e) {
    var cv = e.target.closest ? e.target.closest('canvas') : null;
    if (!cv || !cv._hits) return;
    var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, t = cv.nextElementSibling;
    var h = null, mejor = 100;
    cv._hits.forEach(function (o) {
      if (o.cx != null) { var d = Math.hypot(o.cx - x, o.cy - y); if (d < 9 && d < mejor) { mejor = d; h = o; } }
      else if (!h && x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h) h = o;
    });
    if (!h) { t.hidden = true; return; }
    t.innerHTML = h.html; t.hidden = false;
    var tx = Math.min(x + 12, r.width - t.offsetWidth - 4), ty = y - t.offsetHeight - 10;
    t.style.left = Math.max(0, tx) + 'px'; t.style.top = (ty < 0 ? y + 16 : ty) + 'px';
  }
  function graficoHTML(g, i) {
    return '<div class="graf-card' + (g.ancho === 'medio' ? ' medio' : '') + '">' + (g.opciones ? '<div class="graf-op">' + g.opciones + '</div>' : '') +
      '<div class="grafico-caja"><canvas data-i="' + i + '" role="img" aria-label="' + esc(g.titulo) + '"></canvas><div class="grafico-tip" hidden></div></div>' +
      '<div class="leyenda">' + leyendaHTML(g) + '</div></div>';
  }
  function kpiHTML(k) {
    return '<div class="kpi' + (k.k ? ' kpi-' + k.k : '') + '"><span class="kpi-t">' + esc(k.t) + '</span><strong>' + esc(k.v) + '</strong><span class="kpi-sub">' + esc(k.sub || '') + '</span></div>';
  }
  function conclusionHTML(c) {
    var n = NIVELES[c.nivel];
    return '<div class="concl concl-' + c.nivel + '"><span class="concl-ic" aria-hidden="true">' + n.icono + '</span><div>' +
      '<p class="concl-tit"><span class="concl-niv">' + n.t + '</span> ' + c.titulo + '</p>' + (c.texto ? '<p>' + c.texto + '</p>' : '') +
      (c.accion ? '<p class="concl-acc">' + c.accion + '</p>' : '') + '</div></div>';
  }

  // ---------- Pantalla ----------
  function tablaHTML(tb) {
    var num = tb.numeros || [];
    if (tb.maxFilas && tb.body.length > tb.maxFilas && !estado.verPlan) {
      var corta = Object.assign({}, tb, { body: tb.body.slice(0, tb.maxFilas), estados: (tb.estados || []).slice(0, tb.maxFilas), maxFilas: 0 });
      return tablaHTML(corta) + '<button type="button" class="boton boton-chico" data-ver="plan">Ver los ' + tb.body.length + ' campos</button>';
    }
    var h = '<p class="subtitulo">' + esc(tb.titulo) + '</p><table class="tabla"><thead><tr>' + tb.head.map(function (x, i) {
      return '<th' + (num.indexOf(i) >= 0 ? ' class="n"' : '') + '>' + esc(x) + '</th>';
    }).join('') + '</tr></thead><tbody>';
    tb.body.forEach(function (fila, f) {
      var esProm = tb.ultimaPromedio && f === tb.body.length - 1;
      h += '<tr' + (esProm ? ' class="prom"' : '') + '>' + fila.map(function (c, i) {
        var k = tb.estados && tb.estados[f] && tb.estados[f][i];
        var cls = [];
        if (num.indexOf(i) >= 0) cls.push('n');
        if (k) cls.push('c-' + k);
        return '<td' + (cls.length ? ' class="' + cls.join(' ') + '"' : '') + '>' + (c && typeof c === 'object' ? c.html : esc(c)) + '</td>';
      }).join('') + '</tr>';
    });
    return h + '</tbody></table>' + (tb.nota ? '<p class="ayuda">' + esc(tb.nota) + '</p>' : '');
  }

  var reporteActual = null;
  function refrescar() {
    actualizarFiltros();
    var lista = filtrados();
    $('carga-estado').innerHTML = datos.length
      ? 'Hay <strong>' + datos.length + '</strong> análisis cargados de <strong>' + unico(datos.map(function (r) { return r.campo; })).length + '</strong> campos.'
      : 'Todavía no hay análisis cargados. Empezá importando un Excel o agregando uno a mano.';
    $('f-resumen').textContent = datos.length ? 'Coinciden ' + lista.length + ' de ' + datos.length + ' análisis.' : '';
    document.querySelectorAll('.pestana').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.vista === estado.vista ? 'true' : 'false'); });

    var r = armarVista();
    reporteActual = r;
    $('vista-opciones').innerHTML = r.opciones || '';
    $('panel-kpis').innerHTML = (r.kpis || []).map(kpiHTML).join('');
    var CMAX = 6, nc = r.conclusiones ? r.conclusiones.length : 0;
    $('panel-conclusiones').innerHTML = nc ? '<p class="eval-titulo">Conclusiones clave <small>(' + nc + ', de mayor a menor prioridad)</small></p>' +
      r.conclusiones.map(function (c, i) { return i < CMAX || estado.verTodas ? conclusionHTML(c) : ''; }).join('') +
      (nc > CMAX ? '<button type="button" class="boton boton-chico" data-ver="concl">' + (estado.verTodas ? 'Ver solo las principales' : 'Ver las ' + nc + ' conclusiones') + '</button>' : '') : '';
    $('eval-texto').innerHTML = r.puntos.length ? (r.kpis ? '' : '<p class="eval-titulo">' + esc(r.titulo) + '</p>') + '<ul>' + r.puntos.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ul>' : '';
    graficosActuales = r.graficos;
    $('graficos').innerHTML = r.graficos.map(graficoHTML).join('');
    pintarGraficos();
    $('eval-tabla').innerHTML = (r.planOpciones ? '<p class="subtitulo">' + esc(r.planTitulo || 'Plan de fertilización') + '</p><div class="grilla plan-op">' + r.planOpciones + '</div>' : '') + r.tablas.map(tablaHTML).join('');
    $('btn-pdf').disabled = !lista.length;
    tablaDatos(lista);
  }

  function tablaDatos(lista) {
    $('datos-cuenta').textContent = datos.length;
    if (!lista.length) { $('datos-tabla').innerHTML = '<p class="vacio">No hay análisis para mostrar.</p>'; return; }
    var nuts = nutsConDatos(lista), MAX = 300;
    var orden = lista.slice().sort(function (a, b) { return ordenarTexto(a.campo, b.campo) || ordenarTexto(b.campania, a.campania) || ordenarTexto(a.lote, b.lote); });
    var h = '<table class="tabla"><thead><tr><th>Campo</th><th>Lote</th><th>Campaña</th><th>Fecha</th><th>Ensayo</th>' +
      nuts.map(function (n) { return '<th class="n">' + esc(etiquetaNut(n)) + '</th>'; }).join('') + '<th></th></tr></thead><tbody>';
    orden.slice(0, MAX).forEach(function (r) {
      h += '<tr><td>' + esc(r.campo) + '</td><td>' + esc(r.lote) + '</td><td>' + esc(r.campania) + '</td><td>' + esc(fechaTxt(r.fecha)) + '</td><td>' + esc(r.ensayo) + '</td>' +
        nuts.map(function (n) { var c = celdaValor(n, r.v[n.id]); return '<td class="n' + (c.k ? ' c-' + c.k : '') + '">' + (r.v[n.id] != null ? esc(c.t) : '') + '</td>'; }).join('') +
        '<td class="acc"><button type="button" class="boton-texto" data-editar="' + r.id + '">Editar</button> <button type="button" class="boton-texto" data-borrar="' + r.id + '">Borrar</button></td></tr>';
    });
    h += '</tbody></table>';
    if (orden.length > MAX) h += '<p class="ayuda">Se muestran los primeros ' + MAX + '. Usá la búsqueda para ver los demás.</p>';
    $('datos-tabla').innerHTML = h;
  }

  // ---------- Carga a mano ----------
  var editando = null, ultimoBoton = null;
  function abrirAnalisis(r) {
    editando = r ? r.id : null;
    $('an-titulo').textContent = r ? 'Corregir análisis' : 'Agregar análisis';
    $('an-otro').hidden = !!r;
    var base = r || { campo: $('f-campo').value, campania: $('f-campania').value, fecha: hoyISO(), v: {} };
    $('an-campo').value = base.campo || ''; $('an-lote').value = base.lote || ''; $('an-campania').value = base.campania || '';
    $('an-fecha').value = base.fecha || ''; $('an-ensayo').value = base.ensayo || ''; $('an-prof').value = base.prof || '0-20 cm'; $('an-obs').value = base.obs || '';
    $('an-valores').innerHTML = nutrientes.map(function (n) {
      var v = base.v && base.v[n.id] != null ? base.v[n.id] : '';
      return '<label>' + esc(etiquetaNut(n)) + '<input type="text" inputmode="decimal" data-nut="' + esc(n.id) + '" value="' + esc(v === '' ? '' : String(v).replace('.', ',')) + '" autocomplete="off"></label>';
    }).join('');
    $('dlg-analisis').showModal();
  }
  function guardarAnalisis(seguir) {
    var campo = $('an-campo').value.trim(), campania = $('an-campania').value.trim() || campaniaDeFecha($('an-fecha').value);
    if (!campo || !campania) { alert('Completá el campo y la campaña (o la fecha de muestreo).'); return; }
    var v = {}, malos = [];
    $('an-valores').querySelectorAll('input').forEach(function (inp) {
      if (inp.value.trim() === '') return;
      var x = numero(inp.value);
      if (x == null) malos.push(inp.parentNode.firstChild.textContent); else v[inp.dataset.nut] = x;
    });
    if (malos.length) { alert('Revisá estos valores (tienen que ser números): ' + malos.join(', ')); return; }
    if (!Object.keys(v).length) { alert('Cargá al menos un resultado.'); return; }
    var previo = editando ? datos.filter(function (x) { return x.id === editando; })[0] : null;
    var r = { id: editando || nuevoId(), campo: campo, lote: $('an-lote').value.trim(), campania: campania, fecha: $('an-fecha').value, ensayo: $('an-ensayo').value.trim(), prof: $('an-prof').value.trim(), textura: previo ? previo.textura || '' : '', obs: $('an-obs').value.trim(), v: v };
    completarCalculados(r);
    if (editando) datos = datos.map(function (x) { return x.id === editando ? r : x; }); else datos.push(r);
    guardarDatos();
    toast(editando ? 'Análisis corregido.' : 'Análisis guardado.');
    if (seguir) { $('an-lote').value = ''; $('an-obs').value = ''; $('an-valores').querySelectorAll('input').forEach(function (i) { i.value = ''; }); $('an-lote').focus(); editando = null; }
    else $('dlg-analisis').close();
    refrescar();
  }

  // ---------- Importar Excel ----------
  var META = [
    { v: 'campo', t: 'Campo', alias: ['campo', 'establecimiento', 'estancia', 'campo establecimiento', 'nombre campo'] },
    { v: 'lote', t: 'Lote', alias: ['lote', 'potrero', 'lote potrero', 'lote n', 'nro lote', 'n lote', 'muestra', 'identificacion', 'id muestra'] },
    { v: 'campania', t: 'Campaña', alias: ['campana', 'camp', 'campana agricola', 'ciclo'] },
    { v: 'fecha', t: 'Fecha', alias: ['fecha', 'fecha muestreo', 'fecha de muestreo', 'fecha muestra', 'fecha extraccion'] },
    { v: 'ensayo', t: 'Ensayo', alias: ['ensayo', 'tratamiento', 'protocolo', 'informe', 'n informe', 'nro informe', 'analisis'] },
    { v: 'prof', t: 'Profundidad', alias: ['profundidad', 'prof', 'estrato', 'profundidad cm'] },
    { v: 'textura', t: 'Textura', alias: ['tex', 'textura', 'clase textural'] },
    { v: 'obs', t: 'Observaciones', alias: ['observaciones', 'obs', 'comentarios', 'notas'] }
  ];
  var imp = null;

  function normTitulo(t) { return norm(t).replace(/ (ppm|%|cm|mg kg|ds m|cmol kg|meq 100 ?g|mmhos cm)$/, '').trim(); }
  function adivinar(titulo, mapeo) {
    var t = normTitulo(titulo);
    if (!t) return '';
    if (mapeo[t] != null && (mapeo[t].indexOf('n:') !== 0 || nutPorId(mapeo[t].slice(2)))) return mapeo[t];
    var i, j;
    for (i = 0; i < META.length; i++) if (META[i].alias.indexOf(t) >= 0) return META[i].v;
    for (i = 0; i < nutrientes.length; i++) {
      var n = nutrientes[i], al = (n.alias || []).concat([norm(n.corto), norm(n.nombre)]);
      for (j = 0; j < al.length; j++) if (norm(al[j]) === t) return 'n:' + n.id;
    }
    // Coincidencia por la primera palabra (ej.: «Fósforo Bray I ppm», «Zn DTPA»)
    var primera = t.split(' ')[0];
    for (i = 0; i < nutrientes.length; i++) {
      var n2 = nutrientes[i], al2 = (n2.alias || []).concat([norm(n2.corto), norm(n2.nombre)]).map(norm);
      if (primera.length >= 2 && al2.indexOf(primera) >= 0) return 'n:' + n2.id;
      for (j = 0; j < al2.length; j++) if (al2[j].length >= 4 && t.indexOf(al2[j]) === 0) return 'n:' + n2.id;
    }
    for (i = 0; i < META.length; i++) for (j = 0; j < META[i].alias.length; j++) if (META[i].alias[j].length >= 4 && t.indexOf(META[i].alias[j]) === 0) return META[i].v;
    return '';
  }

  function leerExcel(archivo) {
    var lector = new FileReader();
    lector.onload = function () {
      try {
        var libro = XLSX.read(new Uint8Array(lector.result), { type: 'array', cellDates: true });
        imp = { nombre: archivo.name, libro: libro, hoja: libro.SheetNames[0] };
        var hojas = libro.SheetNames;
        $('imp-caja-hoja').hidden = hojas.length < 2;
        $('imp-hoja').innerHTML = hojas.map(function (h) { return '<option>' + esc(h) + '</option>'; }).join('');
        // Elegir la hoja con más columnas reconocidas
        var mejor = hojas[0], puntos = -1;
        hojas.forEach(function (h) { var p = prepararHoja(h, true); if (p > puntos) { puntos = p; mejor = h; } });
        $('imp-hoja').value = mejor;
        prepararHoja(mejor);
        $('imp-archivo').innerHTML = 'Archivo: <strong>' + esc(archivo.name) + '</strong>';
        $('imp-campo').value = ''; $('imp-campania').value = ''; $('imp-ensayo').value = '';
        $('dlg-importar').showModal();
      } catch (e) {
        alert('No se pudo leer el archivo. ¿Es un Excel (.xlsx, .xls) o .csv?\n\n' + e.message);
      }
    };
    lector.readAsArrayBuffer(archivo);
  }

  // Algunas planillas declaran un rango enorme (hasta la fila 1.048.576). Se recorta a las celdas con datos.
  function ajustarRango(ws) {
    if (!ws || ws._ajustado) return;
    var maxR = -1, maxC = -1;
    Object.keys(ws).forEach(function (k) {
      if (k[0] === '!' || k[0] === '_') return;
      var c = ws[k];
      if (!c || c.v == null || c.v === '') return;
      var d = XLSX.utils.decode_cell(k);
      if (d.r > maxR) maxR = d.r;
      if (d.c > maxC) maxC = d.c;
    });
    ws['!ref'] = maxR < 0 ? 'A1:A1' : XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } });
    ws._ajustado = true;
  }
  function prepararHoja(hoja, soloPuntaje) {
    var ws = imp.libro.Sheets[hoja];
    ajustarRango(ws);
    var filas = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
    var mapeo = leer(CLAVES.mapeo, {}) || {};
    var iTit = 0, mejor = -1;
    for (var i = 0; i < Math.min(filas.length, 20); i++) {
      var p = filas[i].filter(function (c) { return adivinar(c, mapeo); }).length;
      if (p > mejor) { mejor = p; iTit = i; }
    }
    if (soloPuntaje) return mejor;
    var titulos = (filas[iTit] || []).map(function (c) { return String(c).trim(); });
    var cuerpo = filas.slice(iTit + 1).filter(function (f) { return f.some(function (c) { return String(c).trim() !== ''; }); });
    imp.hoja = hoja; imp.titulos = titulos; imp.filas = cuerpo;
    var opciones = '<option value="">No usar</option><optgroup label="Datos">' + META.map(function (m) { return '<option value="' + m.v + '">' + m.t + '</option>'; }).join('') +
      '</optgroup><optgroup label="Nutrientes">' + nutrientes.map(function (n) { return '<option value="n:' + esc(n.id) + '">' + esc(n.nombre + (n.corto !== n.nombre ? ' (' + n.corto + ')' : '') + (n.unidad ? ' – ' + n.unidad : '')) + '</option>'; }).join('') +
      '</optgroup><option value="nuevo">Otro nutriente (usar el título)</option>';
    var usados = {};
    $('imp-columnas').innerHTML = titulos.map(function (t, i) {
      if (!t && !cuerpo.some(function (f) { return String(f[i] || '').trim(); })) return '';
      var ej = cuerpo.slice(0, 3).map(function (f) { var v = f[i]; return v instanceof Date ? v.toLocaleDateString('es-AR') : String(v); }).filter(Boolean).join(' · ');
      var g = adivinar(t, mapeo);
      if (g && usados[g]) g = ''; if (g) usados[g] = 1;
      return '<div class="imp-col"><div class="imp-nombre">' + esc(t || 'Columna ' + (i + 1)) + '<span class="imp-ej">' + esc(ej || '(vacía)') + '</span></div>' +
        '<select data-col="' + i + '">' + opciones.replace('value="' + g + '"', 'value="' + g + '" selected') + '</select></div>';
    }).join('');
    resumenImport();
    return mejor;
  }

  function leerMapeoPantalla() {
    var m = {};
    $('imp-columnas').querySelectorAll('select').forEach(function (s) { if (s.value) m[s.dataset.col] = s.value; });
    return m;
  }
  function resumenImport() {
    var m = leerMapeoPantalla(), vals = Object.keys(m).map(function (k) { return m[k]; });
    var nNut = vals.filter(function (v) { return v.indexOf('n:') === 0 || v === 'nuevo'; }).length;
    var falta = [];
    if (vals.indexOf('campo') < 0 && !$('imp-campo').value.trim()) falta.push('el campo');
    if (vals.indexOf('campania') < 0 && vals.indexOf('fecha') < 0 && !$('imp-campania').value.trim()) falta.push('la campaña (o la fecha)');
    $('imp-resumen').innerHTML = imp.filas.length + ' filas con datos · ' + nNut + ' nutrientes reconocidos' +
      (falta.length ? '<br><span class="error">Falta indicar ' + falta.join(' y ') + ' (elegí la columna o escribilo abajo).</span>' : '');
    $('imp-ok').disabled = !!falta.length || !nNut;
  }

  function fechaISO(v) {
    if (v == null || v === '') return '';
    if (v instanceof Date && !isNaN(v)) return v.getFullYear() + '-' + String(v.getMonth() + 1).padStart(2, '0') + '-' + String(v.getDate()).padStart(2, '0');
    if (typeof v === 'number' && v > 20000 && v < 80000) { var d = XLSX.SSF.parse_date_code(v); return d.y + '-' + String(d.m).padStart(2, '0') + '-' + String(d.d).padStart(2, '0'); }
    var s = String(v).trim(), m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
    if (m) { var y = m[3].length === 2 ? '20' + m[3] : m[3]; return y + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0'); }
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return '';
  }
  function textoCelda(v) { return v instanceof Date ? fechaISO(v) : String(v == null ? '' : v).trim(); }

  function importar() {
    var m = leerMapeoPantalla(), mapeo = leer(CLAVES.mapeo, {}) || {};
    // Nutrientes nuevos a partir del título
    Object.keys(m).forEach(function (col) {
      if (m[col] !== 'nuevo') return;
      var tit = imp.titulos[col] || ('Columna ' + (Number(col) + 1));
      var unidad = (tit.match(/\(([^)]*)\)/) || [])[1] || '';
      var nombre = tit.replace(/\([^)]*\)/g, '').trim() || tit;
      var id = 'x' + norm(nombre).replace(/ /g, '_').slice(0, 20) || nuevoId();
      if (!nutPorId(id)) nutrientes.push({ id: id, nombre: nombre, corto: nombre.length > 10 ? nombre.slice(0, 10) : nombre, unidad: unidad, tipo: 'mas', bajo: 0, alto: 0, alias: [norm(tit)] });
      m[col] = 'n:' + id;
    });
    guardar(CLAVES.nutrientes, nutrientes);
    Object.keys(m).forEach(function (col) { var t = normTitulo(imp.titulos[col]); if (t) mapeo[t] = m[col]; });
    guardar(CLAVES.mapeo, mapeo);

    var defCampo = $('imp-campo').value.trim(), defCamp = $('imp-campania').value.trim(), defEns = $('imp-ensayo').value.trim();
    var existentes = {};
    datos.forEach(function (r) { existentes[firma(r)] = 1; });
    var nuevos = [], repetidos = 0, sinDatos = 0;
    imp.filas.forEach(function (f) {
      var r = { id: nuevoId(), campo: defCampo, lote: '', campania: defCamp, fecha: '', ensayo: defEns, prof: '', textura: '', obs: '', v: {} };
      Object.keys(m).forEach(function (col) {
        var dest = m[col], val = f[col];
        if (dest.indexOf('n:') === 0) { var x = numero(val); if (x != null) r.v[dest.slice(2)] = x; }
        else if (dest === 'fecha') r.fecha = fechaISO(val);
        else { var t = textoCelda(val); if (t) r[dest] = t; }
      });
      if (!r.campania && r.fecha) r.campania = campaniaDeFecha(r.fecha);
      completarCalculados(r);
      if (!r.campo || !Object.keys(r.v).length) { sinDatos++; return; }
      var fi = firma(r);
      if (existentes[fi]) { repetidos++; return; }
      existentes[fi] = 1; nuevos.push(r);
    });
    datos = datos.concat(nuevos);
    guardarDatos();
    $('dlg-importar').close();
    refrescar();
    alert('Se importaron ' + nuevos.length + ' análisis.' + (repetidos ? '\n' + repetidos + ' ya estaban cargados y no se duplicaron.' : '') +
      (sinDatos ? '\n' + sinDatos + ' filas se saltearon (sin campo o sin valores, por ejemplo filas de totales o títulos).' : ''));
  }
  function firma(r) {
    return [norm(r.campo), norm(r.lote), norm(r.campania), norm(r.ensayo), norm(r.prof), r.fecha || '', Object.keys(r.v).sort().map(function (k) { return k + '=' + r.v[k]; }).join(',')].join('|');
  }

  // ---------- Excel de salida ----------
  function bajarExcel(lista, nombre) {
    var nuts = lista.length ? nutsConDatos(lista) : nutrientes;
    var head = ['Campo', 'Lote', 'Campaña', 'Fecha', 'Ensayo', 'Profundidad'].concat(nuts.map(etiquetaNut)).concat(['Textura', 'Observaciones']);
    var filas = [head].concat(lista.map(function (r) {
      return [r.campo, r.lote, r.campania, fechaTxt(r.fecha), r.ensayo, r.prof].concat(nuts.map(function (n) { return r.v[n.id] != null ? r.v[n.id] : ''; })).concat([r.textura || '', r.obs || '']);
    }));
    var libro = XLSX.utils.book_new();
    var hoja = XLSX.utils.aoa_to_sheet(filas);
    hoja['!cols'] = head.map(function (h) { return { wch: Math.max(10, h.length + 2) }; });
    XLSX.utils.book_append_sheet(libro, hoja, 'Análisis');
    if (!lista.length) {
      var ayuda = [['Cómo completar la planilla'], ['Una fila por muestra. El Campo es obligatorio. Si no se pone la Campaña, se calcula con la fecha (julio a junio).'],
        ['Fecha: día/mes/año. Los valores con coma o punto decimal. Las celdas vacías se toman como «no analizado».'],
        ['Se pueden borrar las columnas de nutrientes que no se usen o agregar otras.']];
      XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(ayuda), 'Ayuda');
    }
    XLSX.writeFile(libro, nombre);
  }

  // ---------- Nutrientes y rangos ----------
  function filaNutHTML(n) {
    return '<div class="nut-fila" data-id="' + esc(n.id) + '">' +
      '<label class="nut-nombre">Nombre <input data-c="nombre" value="' + esc(n.nombre) + '" required></label>' +
      '<label>Abreviatura <input data-c="corto" value="' + esc(n.corto) + '" required></label>' +
      '<label>Tipo <select data-c="tipo">' +
      [['mas', 'Más es mejor'], ['rango', 'Rango óptimo (pH)'], ['menos', 'Menos es mejor (sales)'], ['info', 'Sin interpretación (solo dato)']].map(function (o) { return '<option value="' + o[0] + '"' + (n.tipo === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') +
      '</select></label>' +
      '<label>Límite inferior <input data-c="bajo" inputmode="decimal" value="' + esc(String(n.bajo).replace('.', ',')) + '"></label>' +
      '<label>Límite superior <input data-c="alto" inputmode="decimal" value="' + esc(String(n.alto).replace('.', ',')) + '"></label>' +
      '<label>Unidad <input data-c="unidad" value="' + esc(n.unidad) + '"></label>' +
      '<button type="button" class="boton-texto" data-quitar-nut>Quitar</button></div>';
  }
  function abrirNutrientes() { $('nut-lista').innerHTML = nutrientes.map(filaNutHTML).join(''); $('dlg-nutrientes').showModal(); }
  function guardarNutrientes() {
    var nuevos = [], error = '';
    $('nut-lista').querySelectorAll('.nut-fila').forEach(function (f) {
      var g = function (c) { return f.querySelector('[data-c="' + c + '"]').value.trim(); };
      var previo = nutPorId(f.dataset.id) || {};
      var n = { id: f.dataset.id, nombre: g('nombre'), corto: g('corto'), unidad: g('unidad'), tipo: g('tipo'), bajo: numero(g('bajo')), alto: numero(g('alto')), alias: previo.alias || [norm(g('nombre')), norm(g('corto'))] };
      if (n.tipo === 'info') { n.bajo = n.bajo || 0; n.alto = n.alto || 0; }
      else if (n.bajo == null || n.alto == null) error = 'Completá los dos límites de ' + n.nombre + '.';
      else if (n.bajo > n.alto) error = 'En ' + n.nombre + ' el límite inferior es mayor que el superior.';
      nuevos.push(n);
    });
    if (error) { alert(error); return false; }
    nutrientes = nuevos;
    guardar(CLAVES.nutrientes, nutrientes);
    toast('Rangos guardados.');
    refrescar();
    return true;
  }

  // ---------- PDF ----------
  var logoCache = null;
  function cargarLogo() {
    if (logoCache) return Promise.resolve(logoCache);
    return new Promise(function (ok) {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        try { logoCache = { url: c.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight }; } catch (e) { logoCache = null; }
        ok(logoCache);
      };
      img.onerror = function () { ok(null); };
      img.src = 'logo-morero.png';
    });
  }
  // Texto para el PDF: sin HTML y sin símbolos que las fuentes del PDF no tienen.
  function textoPlano(html) { var d = document.createElement('div'); d.innerHTML = html; return d.textContent.replace(/≈\s?/g, 'aprox. ').replace(/→/g, '>').replace(/[▲✓]/g, ''); }
  function descripcionFiltros() {
    var p = [];
    if ($('f-campo').value) p.push('Campo: ' + $('f-campo').value);
    if ($('f-campania').value) p.push('Campaña: ' + $('f-campania').value);
    if ($('f-anio').value) p.push('Año: ' + $('f-anio').value);
    if ($('f-nutriente').value) p.push('Nutriente: ' + nutPorId($('f-nutriente').value).nombre);
    if ($('f-texto').value.trim()) p.push('Búsqueda: «' + $('f-texto').value.trim() + '»');
    return p.length ? p.join(' · ') : 'Todos los análisis cargados';
  }

  function descargarPDF() {
    var r = reporteActual;
    if (!r) return;
    var boton = $('btn-pdf'); boton.disabled = true;
    cargarLogo().then(function (logo) {
      var jsPDF = window.jspdf.jsPDF;
      var doc = new jsPDF({ unit: 'mm', format: 'a4' });
      var W = 210, M = 14, y = 12;
      var BORDO = [143, 19, 28], GRIS = [91, 91, 95];
      if (logo) { var lh = 22, lw = lh * logo.w / logo.h; doc.addImage(logo.url, 'PNG', M, y, lw, lh); }
      doc.setTextColor.apply(doc, BORDO); doc.setFont('helvetica', 'bold'); doc.setFontSize(17);
      doc.text('Análisis de suelo', W - M, y + 8, { align: 'right' });
      doc.setFontSize(11); doc.setTextColor.apply(doc, GRIS); doc.setFont('helvetica', 'normal');
      doc.text(r.titulo, W - M, y + 14, { align: 'right', maxWidth: 120 });
      doc.setFontSize(9);
      doc.text('Fecha del informe: ' + new Date().toLocaleDateString('es-AR'), W - M, y + 20, { align: 'right' });
      y += 26;
      doc.setDrawColor.apply(doc, BORDO); doc.setLineWidth(0.8); doc.line(M, y, W - M, y);
      y += 6;
      doc.setFontSize(9); doc.setTextColor.apply(doc, GRIS);
      var lf = doc.splitTextToSize('Selección: ' + descripcionFiltros(), W - 2 * M);
      doc.text(lf, M, y); y += lf.length * 4 + 3;

      // Indicadores
      if (r.kpis && r.kpis.length) {
        var porFila = 3, gap = 3, kw = (W - 2 * M - gap * (porFila - 1)) / porFila, kh = 17;
        r.kpis.forEach(function (k, i) {
          var col = i % porFila, kx = M + col * (kw + gap);
          if (i && !col) y += kh + gap;
          doc.setFillColor(245, 245, 246); doc.rect(kx, y, kw, kh, 'F');
          var kc = hexRGB(k.k ? COLORES[k.k] : '#5B5B5F'); doc.setFillColor(kc[0], kc[1], kc[2]); doc.rect(kx, y, 1.2, kh, 'F');
          doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor.apply(doc, GRIS); doc.text(k.t, kx + 3.5, y + 4.5);
          doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(34, 34, 38); doc.text(k.v, kx + 3.5, y + 10.5);
          doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor.apply(doc, GRIS); doc.text(doc.splitTextToSize(k.sub || '', kw - 5)[0] || '', kx + 3.5, y + 14.8);
        });
        y += kh + 7;
      }
      // Conclusiones clave
      if (r.conclusiones && r.conclusiones.length) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor.apply(doc, BORDO);
        doc.text('Conclusiones clave', M, y); y += 5;
        var colNivel = { critico: COLORES.bajo, atencion: COLORES.medio, info: '#5B5B5F', bien: COLORES.bien, oportunidad: COLORES.bien, accion: COLORES.medio, riesgo: COLORES.bajo, objecion: COLORES.alto };
        r.conclusiones.forEach(function (c) {
          var tit = doc.splitTextToSize(NIVELES[c.nivel].t.toUpperCase() + ' · ' + textoPlano(c.titulo), W - 2 * M - 6);
          var cuerpo = doc.splitTextToSize(textoPlano(c.texto + (c.accion ? ' ' + c.accion : '')), W - 2 * M - 6);
          var alto = tit.length * 4.2 + cuerpo.length * 3.9 + 2;
          if (y + alto > 284) { doc.addPage(); y = 16; }
          var cc = hexRGB(colNivel[c.nivel]); doc.setFillColor(cc[0], cc[1], cc[2]); doc.rect(M, y - 3.2, 1.6, alto - 0.5, 'F');
          doc.setFont('helvetica', 'bold'); doc.setFontSize(9.2); doc.setTextColor(34, 34, 38); doc.text(tit, M + 4, y);
          y += tit.length * 4.2;
          doc.setFont('helvetica', 'normal'); doc.setFontSize(8.6); doc.setTextColor(60, 60, 64); doc.text(cuerpo, M + 4, y);
          y += cuerpo.length * 3.9 + 2.5;
        });
        y += 2;
      }

      // Evaluación
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor.apply(doc, BORDO);
      doc.text(r.kpis ? 'Nota' : 'Evaluación', M, y); y += 5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(34, 34, 38);
      r.puntos.forEach(function (p) {
        var lineas = doc.splitTextToSize(textoPlano(p), W - 2 * M - 5);
        if (y + lineas.length * 4.2 > 285) { doc.addPage(); y = 16; }
        doc.text('•', M, y); doc.text(lineas, M + 4, y);
        y += lineas.length * 4.2 + 1.2;
      });
      y += 2;

      // Gráficos
      (r.graficos || []).forEach(function (g) {
        if (g.tipo !== 'dispersion' && !(g.cats && g.cats.length)) return;
        var gw = 900, gh = g.tipo === 'apilado' ? Math.max(260, 60 + g.cats.length * 32) : g.tipo === 'ranking' ? Math.max(220, 60 + g.cats.length * 30) : 400;
        var cv = document.createElement('canvas');
        dibujar(cv, g, gw, gh, 2);
        var anchoMM = W - 2 * M, altoMM = anchoMM * gh / gw;
        if (altoMM > 100) { altoMM = 100; anchoMM = altoMM * gw / gh; }
        if (y + altoMM + 10 > 285) { doc.addPage(); y = 16; }
        doc.addImage(cv.toDataURL('image/png'), 'PNG', M, y, anchoMM, altoMM);
        y += altoMM + 3;
        doc.setFontSize(8.5); doc.setTextColor.apply(doc, GRIS); doc.setFont('helvetica', 'normal');
        var x = M;
        leyendaItems(g).forEach(function (it) {
          var tw = doc.getTextWidth(it.t) + (it.c ? 4.5 : 0) + 6;
          if (x + tw > W - M) { x = M; y += 4.5; }
          if (it.c) { var rgb = hexRGB(it.c); doc.setFillColor(rgb[0], rgb[1], rgb[2]); doc.rect(x, y - 2.6, 3, 3, 'F'); x += 4.5; }
          doc.text(it.t, x, y); x += doc.getTextWidth(it.t) + 6;
        });
        y += 8;
      });

      // Tablas
      r.tablas.forEach(function (tb) {
        if (y > 260) { doc.addPage(); y = 16; }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor.apply(doc, BORDO);
        doc.text(tb.titulo, M, y); y += 2;
        var quitar = tb.soloPantalla || [], keep = tb.head.map(function (_, i) { return i; }).filter(function (i) { return quitar.indexOf(i) < 0; });
        var tb0 = tb;
        tb = Object.assign({}, tb, {
          head: keep.map(function (i) { return tb0.head[i]; }),
          body: tb0.body.map(function (f) { return keep.map(function (i) { var c = f[i]; return c && typeof c === 'object' ? c.t : c; }); }),
          estados: (tb0.estados || []).map(function (f) { return keep.map(function (i) { return f[i]; }); }),
          numeros: (tb0.numeros || []).map(function (i) { return keep.indexOf(i); }).filter(function (i) { return i >= 0; })
        });
        var muchas = tb.head.length > 9;
        doc.autoTable({
          startY: y, head: [tb.head], body: tb.body, margin: { left: M, right: M },
          styles: { fontSize: muchas ? 7 : 8.5, cellPadding: 1.6, textColor: [34, 34, 38], lineColor: [220, 220, 222], lineWidth: 0.1 },
          headStyles: { fillColor: BORDO, textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [250, 250, 250] },
          didParseCell: function (d) {
            if (d.section !== 'body') return;
            var k = tb.estados && tb.estados[d.row.index] && tb.estados[d.row.index][d.column.index];
            if (k) d.cell.styles.fillColor = { bajo: [247, 227, 228], medio: [255, 242, 214], bien: [226, 243, 232], alto: [227, 237, 248] }[k];
            if ((tb.numeros || []).indexOf(d.column.index) >= 0) d.cell.styles.halign = 'right';
            if (tb.ultimaPromedio && d.row.index === tb.body.length - 1) d.cell.styles.fontStyle = 'bold';
          }
        });
        y = doc.lastAutoTable.finalY + 4;
        if (tb.nota) {
          var ln = doc.splitTextToSize(tb.nota, W - 2 * M);
          if (y + ln.length * 3.5 > 285) { doc.addPage(); y = 16; }
          doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor.apply(doc, GRIS); doc.text(ln, M, y + 2); y += ln.length * 3.5 + 2;
        }
        y += 4;
      });

      // Pie
      var paginas = doc.getNumberOfPages();
      for (var i = 1; i <= paginas; i++) {
        doc.setPage(i);
        doc.setDrawColor.apply(doc, GRIS); doc.setLineWidth(0.2); doc.line(M, 288, W - M, 288);
        doc.setFontSize(8); doc.setTextColor.apply(doc, GRIS); doc.setFont('helvetica', 'normal');
        doc.text('MORERO Semillas y Cereales S.A. · Informe de análisis de suelo', M, 292);
        doc.text('Página ' + i + ' de ' + paginas, W - M, 292, { align: 'right' });
      }
      var d = new Date(), f = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      doc.save('Analisis de suelo MORERO - ' + r.titulo.replace(/[\\/:*?"<>|]/g, '-') + ' - ' + f + '.pdf');
      // Copia en la nube al bajar el informe
      if (window.NUBE && window.NUBE.conectado()) window.NUBE.guardarAhora();
      else toast('PDF descargado. Para guardar también en la nube, tocá «Nube: entrar» (abajo a la izquierda).');
    }).catch(function (e) { alert('No se pudo armar el PDF: ' + e.message); })
      .then(function () { boton.disabled = false; });
  }
  function hexRGB(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }

  // ---------- Eventos ----------
  function iniciar() {
    $('archivo-excel').addEventListener('change', function (e) { var a = e.target.files[0]; if (a) leerExcel(a); e.target.value = ''; });
    $('imp-hoja').addEventListener('change', function (e) { prepararHoja(e.target.value); });
    $('imp-columnas').addEventListener('change', resumenImport);
    ['imp-campo', 'imp-campania'].forEach(function (id) { $(id).addEventListener('input', resumenImport); });
    $('form-importar').addEventListener('submit', function (e) { e.preventDefault(); importar(); });

    $('btn-agregar').addEventListener('click', function () { abrirAnalisis(null); });
    $('btn-modelo').addEventListener('click', function () { bajarExcel([], 'Planilla modelo analisis de suelo MORERO.xlsx'); });
    $('btn-nutrientes').addEventListener('click', abrirNutrientes);
    $('btn-exportar').addEventListener('click', function () { var l = filtrados(); if (!l.length) { toast('No hay análisis para bajar.'); return; } bajarExcel(l, 'Analisis de suelo MORERO ' + hoyISO() + '.xlsx'); });
    $('btn-borrar-filtrados').addEventListener('click', function () {
      var l = filtrados();
      if (!l.length) return;
      if (!confirm('¿Borrar los ' + l.length + ' análisis que se ven en la lista? No se puede deshacer (salvo con una copia).')) return;
      var ids = {}; l.forEach(function (r) { ids[r.id] = 1; });
      datos = datos.filter(function (r) { return !ids[r.id]; });
      guardarDatos(); refrescar(); toast('Análisis borrados.');
    });

    $('form-analisis').addEventListener('submit', function (e) { e.preventDefault(); guardarAnalisis(ultimoBoton === 'an-otro'); });
    ['an-otro', 'an-guardar'].forEach(function (id) { $(id).addEventListener('click', function () { ultimoBoton = id; }); });

    $('form-nutrientes').addEventListener('submit', function (e) { e.preventDefault(); if (guardarNutrientes()) $('dlg-nutrientes').close(); });
    $('nut-lista').addEventListener('click', function (e) {
      if (!e.target.matches('[data-quitar-nut]')) return;
      var f = e.target.closest('.nut-fila'), n = nutPorId(f.dataset.id);
      var usados = n ? datos.filter(function (r) { return r.v[n.id] != null; }).length : 0;
      if (usados && !confirm(n.nombre + ' tiene ' + usados + ' valores cargados. Si lo quitás, dejan de verse (los datos no se borran). ¿Quitar?')) return;
      f.remove();
    });
    $('nut-agregar').addEventListener('click', function () {
      var div = document.createElement('div');
      div.innerHTML = filaNutHTML({ id: 'x' + nuevoId(), nombre: '', corto: '', unidad: 'ppm', tipo: 'mas', bajo: '', alto: '' });
      $('nut-lista').appendChild(div.firstChild);
      $('nut-lista').lastChild.querySelector('input').focus();
    });
    $('nut-originales').addEventListener('click', function () {
      if (!confirm('¿Volver a los nutrientes y rangos originales? Se pierden los cambios en los límites.')) return;
      var extra = nutrientes.filter(function (n) { return !NUTRIENTES_INICIALES.some(function (o) { return o.id === n.id; }); });
      $('nut-lista').innerHTML = NUTRIENTES_INICIALES.concat(extra).map(filaNutHTML).join('');
    });

    document.querySelectorAll('[data-cerrar]').forEach(function (b) { b.addEventListener('click', function () { b.closest('dialog').close(); }); });

    ['f-texto', 'f-campo', 'f-campania', 'f-anio', 'f-nutriente'].forEach(function (id) {
      $(id).addEventListener(id === 'f-texto' ? 'input' : 'change', function () { if (id === 'f-campo' && $('f-campo').value) estado.campo = $('f-campo').value; refrescar(); });
    });
    $('btn-limpiar').addEventListener('click', function () { ['f-texto', 'f-campo', 'f-campania', 'f-anio', 'f-nutriente'].forEach(function (id) { $(id).value = ''; }); refrescar(); });

    document.querySelectorAll('.pestana').forEach(function (b) { b.addEventListener('click', function () { estado.vista = b.dataset.vista; refrescar(); }); });
    $('sec-eval').addEventListener('change', function (e) {
      var op = e.target.dataset.op;
      if (!op) return;
      if (op === 'ranking') { panelCfg.ranking = e.target.value; guardarPanel(); }
      var val = e.target.value, nv = numero(val);
      if (op === 'cest') { comCfg.estrategia = val; guardarCom(); }
      if (op === 'cseg') { comCfg.segmento = val; guardarCom(); }
      if (op === 'ha') { var cpo = e.target.dataset.campo; if (val.trim() === '') delete comCfg.ha[cpo]; else if (nv != null && nv >= 0) comCfg.ha[cpo] = nv; guardarCom(); }
      if (op === 'hadef' && nv != null && nv >= 0) { comCfg.haDef = nv; guardarCom(); }
      if (op === 'repo' && nv != null && nv >= 0) { comCfg.reposicion = nv; guardarCom(); }
      if (op === 'nobj' && nv != null && nv >= 0) { comCfg.nObj = nv; guardarCom(); }
      if (op === 'precio' && nv != null && nv >= 0) { comCfg.precios[e.target.dataset.prod] = nv; guardarCom(); }
      if (op === 'egrupo') {
        var g = estCfg.grupo || [], i = g.indexOf(val);
        if (e.target.checked && i < 0) g.push(val); if (!e.target.checked && i >= 0) g.splice(i, 1);
        estCfg.grupo = g; guardarEst();
      }
      var E = estPorId(comCfg.estrategia);
      if (E) {
        var cf = cfgDe(E);
        if (op === 'ex') cf.xDisp = val;
        if (op === 'ecultivo') { cf.cultivo = val; cf.precio = { maiz: 180, soja: 300, trigo: 200 }[val] || cf.precio; cf.rinde = { maiz: 8, soja: 3, trigo: 4 }[val] || cf.rinde; }
        if (op === 'ecosto' && nv != null && nv >= 0) cf.costo = nv;
        if (op === 'eprecio' && nv != null && nv > 0) cf.precio = nv;
        if (op === 'erinde' && nv != null && nv > 0) cf.rinde = nv;
        if (op === 'edosis' && nv != null && nv > 0) cf.dosis = nv;
        if (op === 'elitros') cf.litros = val.trim() === '' ? null : nv;
        if (op === 'ezbase' && nv != null && nv >= 0) cf.znBase = nv;
        guardarEst();
      }
      if (op === 'xdisp') { panelCfg.xDisp = e.target.value; guardarPanel(); }
      if (op === 'ydisp') { panelCfg.yDisp = e.target.value; guardarPanel(); }
      if (op === 'pobj') { panelCfg.pObj = e.target.value.trim() === '' ? null : numero(e.target.value); guardarPanel(); }
      if (op === 'factorp') { var fp = numero(e.target.value); if (fp != null && fp > 0) { panelCfg.factorP = fp; guardarPanel(); } }
      if (op === 'campo') estado.campo = e.target.value;
      if (op === 'nut') $('f-nutriente').value = e.target.value;
      if (op === 'por') { estado.compPor = e.target.value; estado.ensSel = null; }
      if (op === 'ens') estado.ensSel = Array.prototype.map.call($('vista-opciones').querySelectorAll('[data-op="ens"]:checked'), function (c) { return c.value; });
      refrescar();
    });

    $('datos-tabla').addEventListener('click', function (e) {
      var id = e.target.dataset.editar || e.target.dataset.borrar;
      if (!id) return;
      var r = datos.filter(function (x) { return x.id === id; })[0];
      if (!r) return;
      if (e.target.dataset.editar) abrirAnalisis(r);
      else if (confirm('¿Borrar el análisis de ' + r.campo + (r.lote ? ' – ' + r.lote : '') + ' (' + r.campania + ')?')) {
        datos = datos.filter(function (x) { return x.id !== id; }); guardarDatos(); refrescar();
      }
    });

    $('btn-pdf').addEventListener('click', descargarPDF);
    $('sec-eval').addEventListener('click', function (e) {
      var msgCampo = e.target.dataset && e.target.dataset.msg;
      if (msgCampo != null) {
        var txt = ultimosMensajes[msgCampo] || '';
        var ok = function () { toast('Mensaje copiado. Pegalo en WhatsApp o en un correo.'); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, function () { window.prompt('Copiá el mensaje:', txt); });
        else window.prompt('Copiá el mensaje:', txt);
        return;
      }
      var v = e.target.dataset && e.target.dataset.ver;
      if (v === 'concl') estado.verTodas = !estado.verTodas;
      if (v === 'plan') estado.verPlan = true;
      if (v) refrescar();
    });
    var gs = $('graficos');
    gs.addEventListener('mousemove', tip);
    gs.addEventListener('click', tip);
    gs.addEventListener('mouseout', function (e) { if (e.target.tagName === 'CANVAS') e.target.nextElementSibling.hidden = true; });
    var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(pintarGraficos, 150); });

    refrescar();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
