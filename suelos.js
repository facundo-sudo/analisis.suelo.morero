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
  var estado = { vista: 'general', campo: '', ensSel: null, compPor: 'campania' };

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
  function nombreProblema(n) { return n.tipo === 'menos' ? 'elevado' : n.id === 'ph' ? 'ácido' : 'bajo'; }

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

  function armarVista() {
    var lista = filtrados();
    var f = { general: vistaGeneral, campo: vistaCampo, nutriente: vistaNutriente, comparar: vistaComparar }[estado.vista];
    var r = f(lista);
    if (lista.length) r.puntos.push('<i>Evaluación orientativa según los rangos cargados en «Nutrientes y rangos». Confirmar las decisiones con el asesor agronómico.</i>');
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
    if (!g.cats || !g.cats.length) {
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

    // Barras verticales con líneas de referencia
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
    var barra2 = Math.min(56, pasoX * 0.62);
    g.cats.forEach(function (c, i) {
      var v = g.vals[i], x = izq2 + pasoX * i + (pasoX - barra2) / 2;
      if (v != null) {
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
      ctx.fillStyle = '#5B5B5F'; ctx.font = '11px ' + fuente; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillText(l.t, W - der2 - 2, y - 2 - (i && Math.abs(yDe(g.lineas[0].v) - yDe(l.v)) < 14 ? 12 : 0));
    });
    ctx.setLineDash([]);
    return hits;
  }

  function leyendaHTML(g) {
    if (!g) return '';
    if (g.tipo === 'apilado') return g.series.map(function (s) { return '<span><i style="background:' + s.color + '"></i>' + esc(s.nombre) + '</span>'; }).join('');
    var vistos = {}, items = [];
    g.colores.forEach(function (c, i) { if (!vistos[c]) { vistos[c] = 1; items.push('<span><i style="background:' + c + '"></i>' + esc(g.estados[i]) + '</span>'); } });
    if (g.lineas.length) items.push('<span><i class="linea" style="border-color:#5B5B5F"></i>Límites de interpretación</span>');
    return items.join('');
  }

  var hitsActuales = [], graficoActual = null;
  function pintarGrafico() {
    var cv = $('grafico'), caja = cv.parentNode;
    if (!graficoActual) { caja.hidden = true; return; }
    caja.hidden = false;
    var W = cv.clientWidth || caja.clientWidth || 600, H = cv.clientHeight || 340;
    if (graficoActual.tipo === 'apilado') { H = Math.max(200, 50 + graficoActual.cats.length * 34); cv.style.height = H + 'px'; }
    else cv.style.height = '';
    H = cv.clientHeight || H;
    hitsActuales = dibujar(cv, graficoActual, W, H, window.devicePixelRatio || 1);
  }
  function tip(e) {
    var cv = $('grafico'), r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, t = $('grafico-tip');
    var h = null;
    for (var i = 0; i < hitsActuales.length; i++) { var o = hitsActuales[i]; if (x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h) { h = o; break; } }
    if (!h) { t.hidden = true; return; }
    t.innerHTML = h.html; t.hidden = false;
    var tx = Math.min(x + 12, r.width - t.offsetWidth - 4), ty = y - t.offsetHeight - 10;
    t.style.left = Math.max(0, tx) + 'px'; t.style.top = (ty < 0 ? y + 16 : ty) + 'px';
  }

  // ---------- Pantalla ----------
  function tablaHTML(tb) {
    var num = tb.numeros || [];
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
        return '<td' + (cls.length ? ' class="' + cls.join(' ') + '"' : '') + '>' + esc(c) + '</td>';
      }).join('') + '</tr>';
    });
    return h + '</tbody></table>';
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
    $('eval-texto').innerHTML = r.puntos.length ? '<p class="eval-titulo">' + esc(r.titulo) + '</p><ul>' + r.puntos.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ul>' : '';
    graficoActual = r.grafico || null;
    $('grafico-leyenda').innerHTML = leyendaHTML(graficoActual);
    pintarGrafico();
    $('eval-tabla').innerHTML = r.tablas.map(tablaHTML).join('');
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
  function textoPlano(html) { var d = document.createElement('div'); d.innerHTML = html; return d.textContent; }
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

      // Evaluación
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor.apply(doc, BORDO);
      doc.text('Evaluación', M, y); y += 5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(34, 34, 38);
      r.puntos.forEach(function (p) {
        var lineas = doc.splitTextToSize(textoPlano(p), W - 2 * M - 5);
        if (y + lineas.length * 4.2 > 285) { doc.addPage(); y = 16; }
        doc.text('•', M, y); doc.text(lineas, M + 4, y);
        y += lineas.length * 4.2 + 1.2;
      });
      y += 2;

      // Gráfico
      if (r.grafico && r.grafico.cats && r.grafico.cats.length) {
        var gw = 900, gh = r.grafico.tipo === 'apilado' ? Math.max(260, 60 + r.grafico.cats.length * 32) : 420;
        var cv = document.createElement('canvas');
        dibujar(cv, r.grafico, gw, gh, 2);
        var anchoMM = W - 2 * M, altoMM = anchoMM * gh / gw;
        if (altoMM > 120) { altoMM = 120; anchoMM = altoMM * gw / gh; }
        if (y + altoMM + 10 > 285) { doc.addPage(); y = 16; }
        doc.addImage(cv.toDataURL('image/png'), 'PNG', M, y, anchoMM, altoMM);
        y += altoMM + 3;
        // Leyenda
        doc.setFontSize(8.5); doc.setTextColor.apply(doc, GRIS);
        var items = r.grafico.tipo === 'apilado' ? r.grafico.series.map(function (s) { return { c: s.color, t: s.nombre }; })
          : unico(r.grafico.colores).map(function (c) { return { c: c, t: r.grafico.estados[r.grafico.colores.indexOf(c)] }; }).concat([{ c: null, t: 'Línea punteada: límites de interpretación' }]);
        var x = M;
        items.forEach(function (it) {
          if (it.c) { var rgb = hexRGB(it.c); doc.setFillColor(rgb[0], rgb[1], rgb[2]); doc.rect(x, y - 2.6, 3, 3, 'F'); x += 4.5; }
          doc.text(it.t, x, y); x += doc.getTextWidth(it.t) + 6;
        });
        y += 6;
      }

      // Tablas
      r.tablas.forEach(function (tb) {
        if (y > 260) { doc.addPage(); y = 16; }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor.apply(doc, BORDO);
        doc.text(tb.titulo, M, y); y += 2;
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
        y = doc.lastAutoTable.finalY + 8;
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
    $('vista-opciones').addEventListener('change', function (e) {
      var op = e.target.dataset.op;
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
    var cv = $('grafico');
    cv.addEventListener('mousemove', tip);
    cv.addEventListener('mouseleave', function () { $('grafico-tip').hidden = true; });
    cv.addEventListener('click', tip);
    var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(pintarGrafico, 150); });

    refrescar();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
