# Tlapiani - Dashboard Web Administrativo

Este directorio contiene el frontend del **Dashboard Web Administrativo** de Tlapiani, el cual sirve como la interfaz centralizada para la gestión de inventarios, asignación y despacho de lotes de ayuda, visualización del mapa de prioridades y el portal público de transparencia.

## Sistema de Diseño y Estética (Premium Dark Mode)

Para lograr una experiencia visual premium, el dashboard debe implementar las siguientes especificaciones de diseño en su hoja de estilos central:

### 1. Paleta de Colores (Variables CSS HSL)
```css
:root {
  --bg-primary: hsl(220, 15%, 8%);       /* Fondo general ultra-oscuro */
  --bg-secondary: hsl(220, 12%, 14%);    /* Fondo de tarjetas y barra lateral */
  --bg-tertiary: hsl(220, 12%, 20%);     /* Elementos interactivos/hover */
  
  --text-main: hsl(210, 20%, 98%);       /* Texto principal */
  --text-muted: hsl(210, 10%, 65%);      /* Texto secundario / leyendas */
  
  --accent-emerald: hsl(145, 63%, 42%);  /* Éxito / Custodia / Suministro Seguro */
  --accent-amber: hsl(35, 92%, 50%);     /* Advertencia / Prioridad Alta */
  --accent-crimson: hsl(355, 78%, 56%);   /* Alerta / Prioridad Crítica / Manipulación */
  --accent-blue: hsl(205, 85%, 55%);      /* Información / En ruta */
  
  --glass-border: hsla(210, 20%, 100%, 0.06);
  --glass-bg: hsla(220, 12%, 14%, 0.6);
  --glow-shadow: 0 0 20px hsla(145, 63%, 42%, 0.15);
}
```
Para el tema claro:
[data-theme="light"] {
  --bg-primary: hsl(220, 20%, 96%);       /* Fondo general grisáceo claro */
  --bg-secondary: hsl(0, 0%, 100%);       /* Tarjetas y lateral en blanco puro */
  --bg-tertiary: hsl(220, 15%, 88%);      /* Hover y elementos interactivos oscurecidos */
  
  --text-main: hsl(220, 25%, 12%);        /* Texto principal casi negro */
  --text-muted: hsl(220, 12%, 45%);       /* Leyendas y texto secundario gris medio */
  
  /* Ajustes de contraste para los acentos sobre fondo claro */
  --accent-emerald: hsl(145, 65%, 36%);  /* Éxito / Suministro Seguro (más profundo) */
  --accent-amber: hsl(35, 85%, 40%);     /* Advertencia / Prioridad Alta (más oscuro) */
  --accent-crimson: hsl(355, 75%, 45%);   /* Alerta / Prioridad Crítica (más nítido) */
  --accent-blue: hsl(205, 85%, 45%);      /* Información / En ruta */
  
  /* Adaptación del efecto Glassmorphism para entornos claros */
  --glass-border: hsla(220, 15%, 10%, 0.08);
  --glass-bg: hsla(0, 0%, 100%, 0.7);
  --glow-shadow: 0 8px 24px hsla(220, 25%, 10%, 0.06); /* Sombra suave en vez de brillo emissivo */
}

### 2. Glassmorphism y Bordes
Las tarjetas del panel de control y la barra lateral deben tener un aspecto translúcido y limpio:
```css
.card {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 24px;
}
```

### 3. Tipografía
Utilizar una fuente geométrica y limpia como **Outfit** o **Inter** desde Google Fonts para mejorar la legibilidad y el aspecto:
```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
body {
  font-family: 'Outfit', sans-serif;
}
```

---

## Módulos y Requerimientos Funcionales

El dashboard se comportará como una Single Page Application (SPA) simulada, alternando la visibilidad de secciones principales en la pantalla a través de JavaScript, manteniendo la URL limpia o utilizando hashes (`#/inventario`, `#/prioridad`, etc.).

### 1. Panel de Control de Inventario
- **Formulario de Registro**:
  - Permite a los administradores registrar la entrada de bienes donados.
  - Campos: Tipo de bien (input con `<datalist>` para sugerencias de kits/insumos), Cantidad (kg/unidades), Comunidad de Destino (dropdown dinámico cargado de la API) y Centro de Acopio de Origen.
  - Validación de formulario nativa en CSS utilizando la pseudoclase `:user-valid` y `:invalid` para dar feedback visual inmediato.
- **Tabla de Bienes**:
  - Lista de bienes registrados en el inventario con filtros de búsqueda rápida por tipo de bien o comunidad.

### 2. Visualización Geográfica de Prioridad (Mapa Interactivo)
- **Mapa de México**:
  - Integrar la biblioteca **Leaflet.js** cargada de forma asíncrona.
  - Configurar un proveedor de mapas oscuro (por ejemplo, *CartoDB Dark Matter*) que encaje perfectamente con la estética del sitio.
  - Pintar marcadores dinámicos en las coordenadas de las comunidades vulnerables devueltas por el endpoint `/api/v1/comunidades/prioridad`.
  - **Código de Colores**:
    - **Rojo (Crimson)**: Score de Urgencia entre 80 y 100 (Prioridad Crítica).
    - **Naranja/Amarillo (Amber)**: Score de Urgencia entre 50 y 79 (Prioridad Alta/Media).
    - **Verde (Emerald)**: Score de Urgencia inferior a 50 (Suministro Seguro / Prioridad Baja).
  - Al hacer clic en un marcador, mostrar un popup estilizado con el nombre de la comunidad, su Score de Urgencia desglosado, y un botón para "Asignar Lote" directamente a esa ubicación.

### 3. Despacho de Envíos y Generación de QR
- **Asignación de Ruta**:
  - Pantalla para despachar lotes. Una vez que se confirma el registro de un lote, el backend genera un hash SHA-256 único.
- **Generación de QR**:
  - Consumir el hash devuelto por la API y renderizar un código QR en pantalla.
  - Utilizar una biblioteca ligera de JS (como `qrcode.js` o similar cargada localmente) o dibujar el QR en un elemento `<canvas>` nativo.
  - El QR debe contener un JSON estructurado o el hash directo para que la aplicación móvil lo pueda escanear.
  - Proveer un botón de "Imprimir Etiqueta" que abra una ventana limpia optimizada para impresión (CSS `@media print`) con el QR y la información del lote para pegarlo físicamente en las cajas de ayuda.

### 4. Portal de Transparencia Público
- **Buscador de Libre Acceso**:
  - Vista accesible sin necesidad de iniciar sesión (JWT).
  - Input de búsqueda donde cualquier ciudadano puede ingresar el `ID_Lote` (ej. `TLAP-2026-9981`).
  - **Línea de Tiempo (Custodia)**:
    - Renderizar una línea de tiempo vertical que muestre el historial completo del lote:
      1. **Creado**: Fecha, hora, centro de acopio de origen y hash original firmado.
      2. **En Ruta**: Fecha, hora de despacho y transportista asignado.
      3. **Recibido**: Estado de la validación criptográfica en la comunidad (Exitoso o Alerta de Manipulación), fecha, hora del escaneo móvil y firma digital del receptor.

---

## Integración y Seguridad de la API

- **Autenticación**:
  - Al iniciar sesión en el backend, el token JWT obtenido debe almacenarse de forma segura en `sessionStorage` o `localStorage`.
  - Cada petición a la API (excepto la consulta del portal de transparencia) debe incluir el header `Authorization: Bearer <JWT_TOKEN>`.
  - Implementar un interceptor en `js/api.js` que redirija al login si el backend responde con un código de estado `401 Unauthorized` o si el token ha expirado.
- **Manejo de Modales**:
  - Utilizar el elemento nativo HTML5 `<dialog>` para las ventanas emergentes de inicio de sesión, registro de lotes e impresión de QR.
  - Usar `.showModal()` para forzar el comportamiento de modal (bloquea la interacción del fondo y atrapa el foco del teclado de forma accesible).
  - Diseñar el fondo usando el selector CSS `dialog::backdrop` aplicando un desenfoque y oscurecimiento translúcido.

---

## Buenas Prácticas de Rendimiento (CWV)

1. **Evitar Layout Shifts (CLS)**:
   - Reservar el espacio del mapa Leaflet mediante contenedores con dimensiones de alto y ancho explícitas antes de que cargue la librería.
   - Especificar dimensiones `width` y `height` en cualquier recurso gráfico o SVG.
2. **Resource Prioritization**:
   - Cargar las hojas de estilo en el `<head>`.
   - Utilizar el atributo `defer` en las etiquetas `<script>` para evitar el bloqueo del renderizado HTML.
   - Priorizar la carga de fuentes críticas y demorar la inicialización de scripts no esenciales (como el generador de QR) hasta que la interfaz principal esté lista.
