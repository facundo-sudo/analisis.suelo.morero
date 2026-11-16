# Análisis de suelo MORERO

Página web para cargar resultados de análisis de suelo por **campo, lote y campaña**, y obtener una evaluación general y por campo o nutriente, con gráficos, comparación entre campañas, campos o ensayos, e informe en PDF con el logo de MORERO.

Es un proyecto aparte: no comparte datos ni archivos con el cotizador ni con otras páginas.

## Publicar en Vercel

Importar este repositorio en Vercel y aceptar. No hay que configurar nada: es una página estática, sin base de datos propia ni claves que cargar.

## Cómo se usa

1. **Cargar análisis**
   - **Importar Excel**: se elige el archivo y la página reconoce las columnas por el título (Fecha, Campo, Lote, Prof., pH, M.O., C, Ca, Mg, K, Na, P, CIC, C.E, N-NO3, Humedad, S, Zn, B, Arena, Limo, Arcilla, Textura, etc.). Se puede corregir qué es cada columna antes de importar; la elección queda recordada. Si el Excel no trae la campaña, se calcula con la fecha de muestreo (julio a junio: 14/10/2022 → 2022/23). Las filas repetidas no se duplican. El Excel se lee en el navegador y **no se sube a ningún servidor**.
   - **Agregar análisis a mano**: formulario con campo, lote, campaña, fecha, ensayo y un casillero por nutriente. «Guardar y cargar otro» deja los datos del campo para seguir con el próximo lote.
   - **Bajar planilla modelo**: Excel vacío con las columnas, para completar.
   - **Nutrientes y rangos**: los límites con los que se interpreta cada valor (bajo / medio / adecuado). Vienen cargados con la hoja «referencias» de MORERO (pH 6 a 7,5; CE < 1,5; Zn < 1 deficiente; S < 6 deficiente, 6–10 moderado; PSI < 7 óptimo, 7–15 ligeramente sódico) y valores orientativos para el resto. Se pueden cambiar o agregar nutrientes. El PSI se calcula solo cuando hay Na y CIC.
   - **Ver umbrales**: muestra la tabla de umbrales con la que se clasifica cada nutriente (problema, intermedio y bien) y de dónde sale cada uno: hoja «referencias» de MORERO, orientativo para la región pampeana o ajustado por el usuario. También está al pie de la evaluación («Ver los umbrales usados») y, con la casilla «Incluir los umbrales en el PDF», sale al final del informe.
2. **Buscar y elegir**: por texto (campo, lote o ensayo), campo, campaña, año, ambiente (loma, media loma o bajo, leído del nombre del lote; las zonas de productividad se toman como relieve: alta = bajo, media = media loma, baja = loma; los lotes sin ambiente de La Sofía (Duhau) se toman como bajo) y nutriente (los lotes cuyo nombre no dice el ambiente aparecen como «Sin identificar ambiente»). Al elegir un nutriente, la evaluación usa solo los análisis que tienen ese dato y lo indica arriba («Análisis en la búsqueda: 987 · con datos de zinc: 445»).
3. **Evaluación** (con lo que se haya buscado):
   - **Panel experto** (se abre primero): diagnóstico automático como lo haría un especialista en suelos, con reglas agronómicas y sin servicios externos.
     - *Indicadores*: muestras, índice de fertilidad (0 a 100, combina P, N, S, Zn, MO, pH, CE, B y PSI), principal limitante, medianas de P y MO, y pH.
     - *Conclusiones clave* ordenadas por prioridad (Crítico, Atención, Dato, Fortaleza): deficiencias generalizadas con sugerencia, acidez/alcalinidad, sales y sodio, tendencia en los campos muestreados más de una vez, variabilidad de P dentro del campo (dosis variable), diferencias por ambiente (loma, media loma, bajo o zonas de productividad, leídas del nombre del lote), relación arena–materia orgánica, relaciones Ca/Mg, Mg/K y saturación de K (según la hoja de referencias), valores atípicos y campos prioritarios.
     - *Gráficos interactivos* (al pasar el mouse o tocar muestran el detalle): ranking de campos por índice, reparto de limitantes, evolución por campaña y comparación por ambiente del nutriente elegido, y relación entre dos variables a elección con su coeficiente r.
     - *Plan de fertilización orientativo* por campo (última campaña): fosfato monoamónico para llevar el P al objetivo, N de nitratos en kg/ha, yeso y zinc. El P objetivo y los kg de P por ppm se pueden cambiar.
   - **Panel comercial**: los análisis son de campos propios y arrendados de MORERO y se usan como evidencia para movilizar a los clientes («si pasa en nuestros campos, puede estar pasando en el tuyo»).
     - *Todos los productos*: lo que medimos en nuestros campos, deficiencias que aparecen juntas (ideas para mezclas tipo), perfiles de campo, calendario de comunicación y conclusiones de marketing: el dato que abre los ojos, la reacción buscada («¿y mi campo cómo está?»), propuesta de valor, desarrollo de producto, vidrieras en campos propios, embudo, «nos pasó a nosotros» y privacidad de los datos.
     - *Estrategia por producto* (zinc con PROCOTE Zn, fósforo, azufre, nitrógeno, encalado): usa solo los análisis con dato de ese nutriente. Se pueden elegir los campos propios a mostrar (por ejemplo, los de la zona de un CREA). Incluye 3 mensajes clave, posicionamiento, desarrollo de producto, piezas de comunicación, embudo, vidrieras, a qué clientes apuntar, calendario, objeciones y el argumento económico para el productor.
     - Zinc: línea Arrancador de MORERO (maíz, girasol y soja) con tres niveles: ZN (mezcla + impregnación PROCOTE Zn, 0,21% Zn), Premium (mezcla química con zinc en el grano, 0,5%) y Plus Zinc (Premium + PROCOTE, 0,71%). PROCOTE Zn a 3 L/t suma 0,21% de Zn (700 g Zn/L). La mezcla base, los litros por tonelada y la dosis son editables.
     - *Mensajes listos para enviar a clientes* (dato del mes, invitación a analizar, la solución, invitación a la vidriera o día de campo), con datos agregados y sin nombres de campos, para copiar o abrir en WhatsApp. También salen en el PDF.
     - Los nombres de campos aparecen solo en listas de uso interno (elegir vidrieras).
   - **General**: resumen por nutriente (promedio, mínimo, máximo, estado y reparto de muestras), gráfico del reparto por nivel y promedio por campo, con sugerencias.
   - **Por campo**: todos los lotes del campo con los valores pintados según su nivel y gráfico por lote.
   - **Separar por ambiente** (en «Por nutriente» y «Por campo»): gráfico con una barra por ambiente en cada campaña, gráfico y tabla con cuántas muestras de cada ambiente quedan debajo del umbral, entre umbrales y por encima (cantidad y %), tabla por ambiente (promedio, mediana, mínimo, máximo), tablas campaña × ambiente (promedio y muestras debajo del umbral) y conclusión sobre la diferencia entre ambientes.
   - **Por nutriente**: promedio por campo (o por lote, si se eligió un campo) y, con muchos campos, la evolución por campaña.
   - **Comparar**: elegir dos o más campañas, campos o ensayos y ver las diferencias en tabla, texto y gráfico.
   - **Descargar PDF**: informe con el logo, la selección, la evaluación, el gráfico y las tablas.
   - **Criterio MORERO cargado en la página** (en `suelos.js`, listas `AMB_POR_CAMPO` y `DESCARTES`): los lotes sin ambiente de La Sofía, La Sofía (Duhau), Bilbao Raúl (La Escondida), Itatí, Zemma y La Guardia se toman como bajo, y los de San Enrique L.18-22 como loma. Se excluyen solos 23 análisis: los ensayos de fertilización de Las Marías Lote 6-7 (2025/26 y los dos de 2020/21 con más de 400 ppm de fósforo) y las muestras únicas o por rangos de Neli Guerra (2024/25), El Destino, Rimoldi y Santín Jorge (2022/23). Se pueden volver a incluir desde la lista.
4. **Análisis cargados**: lista para corregir, borrar o bajar en Excel. **Excluir** deja un análisis guardado, con su motivo (por ejemplo, «Ensayo de fertilización»), pero fuera de todos los promedios, gráficos, conclusiones y PDF; también se puede excluir de una vez todo lo que muestra la búsqueda y volver a incluirlo. La casilla «Incluir los análisis excluidos» de la búsqueda los vuelve a sumar para consultarlos.

## Guardado y copias

- Los datos quedan guardados en el navegador que se usa.
- **Nube (Supabase)**: botón «Nube» abajo a la izquierda; se entra con el correo y la contraseña de MORERO y los datos se copian solos a la nube (también al descargar un PDF), para verlos iguales en la PC y en el celular. Se guardan aparte de las otras páginas (`app: 'suelos'`). La dirección del proyecto está en `nube-config.js`; si se borra, la página funciona solo en el navegador. Para usar otro proyecto de Supabase, crear la tabla con `supabase.sql` y poner su dirección y clave pública en `nube-config.js`.
- **Copia en la PC**: botón «⬇ Bajar copia» descarga un archivo con todos los datos. Para volver a cargarla: «Nube» → «Restaurar copia».

## Archivos

- `index.html`, `styles.css`, `suelos.js`: la página.
- `logo-morero.png`: logo de la página y del PDF.
- `nube.js`, `nube-config.js`, `supabase.sql`: guardado en la nube y copias.
- `vendor/`: librerías para leer Excel (SheetJS) y generar PDF (jsPDF y AutoTable), incluidas para no depender de servicios externos.
