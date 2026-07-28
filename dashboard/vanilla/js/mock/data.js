/* ============================================================
   Datos mock — simulan los endpoints del backend Tlapiani.
   Permiten que la SPA funcione standalone (sin servidor real).
   ============================================================ */

export const COMUNIDADES = [
  { id: 'c-01', nombre: 'San Juan Chamula',   estado: 'Chiapas',   lat: 16.786,  lng: -92.688, score: 92, poblacion: 3400, factores: { acceso: 30, agua: 28, salud: 22, alimentos: 12 } },
  { id: 'c-02', nombre: 'Santa María Tlahuitoltepec', estado: 'Oaxaca', lat: 17.055, lng: -95.998, score: 88, poblacion: 2100, factores: { acceso: 26, agua: 24, salud: 20, alimentos: 18 } },
  { id: 'c-03', nombre: 'Metlatónoc',         estado: 'Guerrero',  lat: 17.192,  lng: -98.404, score: 84, poblacion: 1800, factores: { acceso: 28, agua: 22, salud: 18, alimentos: 16 } },
  { id: 'c-04', nombre: 'Mezquitic',          estado: 'Jalisco',   lat: 22.394,  lng: -103.720, score: 71, poblacion: 2600, factores: { acceso: 20, agua: 18, salud: 17, alimentos: 16 } },
  { id: 'c-05', nombre: 'Batopilas',          estado: 'Chihuahua', lat: 27.024,  lng: -107.735, score: 66, poblacion: 1200, factores: { acceso: 22, agua: 16, salud: 14, alimentos: 14 } },
  { id: 'c-06', nombre: 'Cochoapa el Grande', estado: 'Guerrero',  lat: 17.166,  lng: -98.660, score: 95, poblacion: 1500, factores: { acceso: 32, agua: 26, salud: 22, alimentos: 15 } },
  { id: 'c-07', nombre: 'Del Nayar',          estado: 'Nayarit',   lat: 22.220,  lng: -104.470, score: 58, poblacion: 3100, factores: { acceso: 16, agua: 15, salud: 14, alimentos: 13 } },
  { id: 'c-08', nombre: 'Aldama',             estado: 'Chiapas',   lat: 16.905,  lng: -92.700, score: 44, poblacion: 900,  factores: { acceso: 12, agua: 11, salud: 11, alimentos: 10 } },
  { id: 'c-09', nombre: 'Coicoyán de las Flores', estado: 'Oaxaca', lat: 17.267, lng: -98.283, score: 79, poblacion: 2000, factores: { acceso: 24, agua: 20, salud: 18, alimentos: 17 } },
  { id: 'c-10', nombre: 'Guachochi',          estado: 'Chihuahua', lat: 26.816,  lng: -107.070, score: 38, poblacion: 4200, factores: { acceso: 10, agua: 10, salud: 9,  alimentos: 9 } },
];

export const CENTROS_ACOPIO = [
  'CDMX — Bodega Central',
  'Guadalajara — Nodo Occidente',
  'Oaxaca — Nodo Sur',
  'Monterrey — Nodo Norte',
];

export const TIPOS_BIEN = [
  'Kit de higiene familiar',
  'Despensa básica (maíz/frijol/aceite)',
  'Agua embotellada (garrafón)',
  'Cobija térmica',
  'Kit médico de primeros auxilios',
  'Suero oral / rehidratación',
  'Ropa de abrigo',
  'Kit escolar infantil',
];

export const LOTES = [
  { id: 'TLAP-2026-9981', tipo: 'Kit de higiene familiar', cantidad: 320, unidad: 'kits', comunidad: 'San Juan Chamula', origen: 'CDMX — Bodega Central', estado: 'En Ruta', fecha: '2026-07-07' },
  { id: 'TLAP-2026-9974', tipo: 'Despensa básica (maíz/frijol/aceite)', cantidad: 1800, unidad: 'kg', comunidad: 'Cochoapa el Grande', origen: 'Oaxaca — Nodo Sur', estado: 'Recibido', fecha: '2026-07-05' },
  { id: 'TLAP-2026-9970', tipo: 'Agua embotellada (garrafón)', cantidad: 640, unidad: 'unidades', comunidad: 'Metlatónoc', origen: 'CDMX — Bodega Central', estado: 'Recibido', fecha: '2026-07-04' },
  { id: 'TLAP-2026-9968', tipo: 'Cobija térmica', cantidad: 500, unidad: 'unidades', comunidad: 'Batopilas', origen: 'Monterrey — Nodo Norte', estado: 'Alerta', fecha: '2026-07-03' },
  { id: 'TLAP-2026-9960', tipo: 'Kit médico de primeros auxilios', cantidad: 210, unidad: 'kits', comunidad: 'Santa María Tlahuitoltepec', origen: 'Oaxaca — Nodo Sur', estado: 'Registrado', fecha: '2026-07-02' },
];

/* Historial de custodia por lote (portal de transparencia) */
export const CUSTODIA = {
  'TLAP-2026-9981': [
    { etapa: 'Creado',   estado: 'ok',    fecha: '2026-07-07 08:12', lugar: 'CDMX — Bodega Central', detalle: 'Lote sellado y firmado digitalmente.', hash: 'a3f9c1e8b7d24f0a9c6e5b1d8f7a2c34e9d0b6a1f4c7e2d5b8a1c0f3e6d9b2a4c' },
    { etapa: 'En Ruta',  estado: 'blue',  fecha: '2026-07-07 14:40', lugar: 'Transportista: Rutas del Sur S.A.', detalle: 'Despacho confirmado. Vehículo MX-4471.', hash: '' },
  ],
  'TLAP-2026-9974': [
    { etapa: 'Creado',   estado: 'ok',    fecha: '2026-07-05 07:30', lugar: 'Oaxaca — Nodo Sur', detalle: 'Lote sellado y firmado digitalmente.', hash: 'b1d4a7c2e9f06b3a8d5c1e7f2a9b4c6d3e0f8a1b5c2d9e6f3a0b7c4d1e8f5a2b9' },
    { etapa: 'En Ruta',  estado: 'blue',  fecha: '2026-07-05 12:05', lugar: 'Transportista: Caminos Zapotecos', detalle: 'Despacho confirmado. Vehículo OAX-2210.', hash: '' },
    { etapa: 'Recibido', estado: 'ok',    fecha: '2026-07-06 09:22', lugar: 'Cochoapa el Grande', detalle: 'Validación criptográfica EXITOSA. Firma del receptor verificada.', hash: 'firma-receptor: 7e2a…9c4f ✔' },
  ],
  'TLAP-2026-9968': [
    { etapa: 'Creado',   estado: 'ok',      fecha: '2026-07-03 06:50', lugar: 'Monterrey — Nodo Norte', detalle: 'Lote sellado y firmado digitalmente.', hash: 'c2e5b8a1d4f70c3b9a6d2e8f3b0c5d7e1a4f9b2c6d3e0a7f4b1c8d5e2a9f6b3c0' },
    { etapa: 'En Ruta',  estado: 'blue',    fecha: '2026-07-03 15:10', lugar: 'Transportista: Sierra Tarahumara Log.', detalle: 'Despacho confirmado. Vehículo CHIH-8890.', hash: '' },
    { etapa: 'Recibido', estado: 'alerta',  fecha: '2026-07-04 18:47', lugar: 'Batopilas', detalle: '⚠ ALERTA DE MANIPULACIÓN: el hash escaneado NO coincide con la firma original. Cadena de custodia rota.', hash: 'hash-escaneado: 991a…00ff ✗' },
  ],
};

/* Usuario demo para login */
export const DEMO_USER = { usuario: 'admin', password: 'tlapiani', nombre: 'Coordinación Tlapiani', rol: 'admin' };

/* ============================================================
   Centros de acopio con coordenadas (para "centros cercanos")
   ============================================================ */
export const CENTROS_GEO = [
  { nombre: 'CDMX — Bodega Central',      lat: 19.4326, lng: -99.1332, capacidad: '12 t/día' },
  { nombre: 'Guadalajara — Nodo Occidente', lat: 20.6597, lng: -103.3496, capacidad: '8 t/día' },
  { nombre: 'Oaxaca — Nodo Sur',          lat: 17.0732, lng: -96.7266, capacidad: '6 t/día' },
  { nombre: 'Monterrey — Nodo Norte',     lat: 25.6866, lng: -100.3161, capacidad: '9 t/día' },
  { nombre: 'Tuxtla — Nodo Sureste',      lat: 16.7516, lng: -93.1161, capacidad: '5 t/día' },
  { nombre: 'Chihuahua — Nodo Sierra',    lat: 28.6353, lng: -106.0889, capacidad: '4 t/día' },
];

/* ============================================================
   Galería por comunidad (recursos visuales del punto en el mapa)
   Fotos de demo vía servicio de placeholders (cambiar por reales).
   ============================================================ */
const img = (seed, w = 640, h = 430) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const GALERIA = {
  'c-01': [
    { url: img('chamula1'), caption: 'Entrega de kits de higiene · San Juan Chamula', fecha: '2026-07-06' },
    { url: img('chamula2'), caption: 'Registro de familias beneficiarias', fecha: '2026-07-06' },
    { url: img('chamula3'), caption: 'Almacenamiento temporal en el centro comunitario', fecha: '2026-07-05' },
  ],
  'c-06': [
    { url: img('cochoapa1'), caption: 'Descarga de despensas · Cochoapa el Grande', fecha: '2026-07-06' },
    { url: img('cochoapa2'), caption: 'Validación criptográfica del lote en campo', fecha: '2026-07-06' },
  ],
  'c-03': [
    { url: img('metla1'), caption: 'Distribución de agua embotellada · Metlatónoc', fecha: '2026-07-04' },
    { url: img('metla2'), caption: 'Brigada comunitaria de reparto', fecha: '2026-07-04' },
  ],
  'c-05': [
    { url: img('batopilas1'), caption: 'Ruta de acceso a la sierra · Batopilas', fecha: '2026-07-03' },
  ],
};

/* ============================================================
   Historias reales / casos de éxito
   ============================================================ */
export const HISTORIAS = [
  {
    id: 'h1', titulo: 'Agua limpia para Metlatónoc',
    comunidad: 'Metlatónoc, Guerrero', img: img('historia-agua', 800, 520),
    resumen: 'Tras semanas sin acceso a agua potable, 640 garrafones llegaron y se verificaron uno a uno con su hash. Cero desvíos.',
    impacto: '1,800 personas', cita: '«Por primera vez supimos exactamente qué nos llegó y cuándo.»', autor: 'Comité comunitario',
  },
  {
    id: 'h2', titulo: 'Despensas que sí llegaron completas',
    comunidad: 'Cochoapa el Grande, Guerrero', img: img('historia-despensa', 800, 520),
    resumen: '1.8 toneladas de alimento validadas en la última milla con firma digital del receptor. La cadena de custodia se mantuvo íntegra.',
    impacto: '1,500 personas', cita: '«El pasaporte digital nos dio la confianza para donar de nuevo.»', autor: 'Donante aliado',
  },
  {
    id: 'h3', titulo: 'Una alerta que evitó un desvío',
    comunidad: 'Batopilas, Chihuahua', img: img('historia-alerta', 800, 520),
    resumen: 'El sistema detectó que el hash escaneado no coincidía con el original. Se activó el protocolo y se rastreó el lote a tiempo.',
    impacto: 'Lote recuperado', cita: '«La transparencia no es un lujo, es lo que evita que la ayuda se pierda.»', autor: 'Coordinación Tlapiani',
  },
];

/* ============================================================
   Noticias / alertas (ordenadas por prioridad de la IA)
   ============================================================ */
export const NOTICIAS = [
  {
    id: 'n1', prioridad: 96, nivel: 'crítica', tipo: 'Sismo', zona: 'Costa de Guerrero',
    fecha: '2026-07-12', titulo: 'Sismo de magnitud 6.1 activa protocolo en la Costa Chica',
    resumen: 'CENAPRED reporta daños en viviendas de comunidades rurales. El motor de priorización elevó el score de urgencia de 4 municipios.',
    img: img('news-sismo', 700, 420),
  },
  {
    id: 'n2', prioridad: 88, nivel: 'crítica', tipo: 'Inundación', zona: 'Chiapas',
    fecha: '2026-07-11', titulo: 'Lluvias intensas aíslan comunidades en Los Altos de Chiapas',
    resumen: 'Caminos cortados dificultan el acceso. Se recomienda despacho prioritario de agua y kits de higiene.',
    img: img('news-lluvia', 700, 420),
  },
  {
    id: 'n3', prioridad: 74, nivel: 'alta', tipo: 'Sequía', zona: 'Sierra de Chihuahua',
    fecha: '2026-07-09', titulo: 'Sequía prolongada afecta el abasto en la Sierra Tarahumara',
    resumen: 'La escasez de agua eleva la vulnerabilidad. Centros del norte incrementan reservas de garrafones.',
    img: img('news-sequia', 700, 420),
  },
  {
    id: 'n4', prioridad: 61, nivel: 'media', tipo: 'Frente frío', zona: 'Oaxaca',
    fecha: '2026-07-08', titulo: 'Frente frío número 3 baja temperaturas en la sierra oaxaqueña',
    resumen: 'Se prioriza el envío de cobijas térmicas a comunidades de mayor altitud.',
    img: img('news-frio', 700, 420),
  },
];
