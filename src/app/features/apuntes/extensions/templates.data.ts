export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  badge: string;
  contentHtml: string;
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'meeting-minutes',
    name: 'Acta de Reunión',
    description: 'Estructura formal con asistentes, agenda, acuerdos y compromisos accionables',
    icon: 'calendar',
    badge: 'Reunión',
    contentHtml: `
<h1>Acta de Reunión: [Nombre de la Sesión]</h1>
<p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} | <strong>Horario:</strong> 10:00 - 11:00</p>

<h2>1. Participantes y Asistentes</h2>
<ul>
  <li><strong>Moderador:</strong> [Nombre del organizador]</li>
  <li><strong>Asistentes:</strong> [Participante 1], [Participante 2]</li>
</ul>

<h2>2. Objetivos de la Sesión</h2>
<p>Definir acuerdos clave y validar avances del proyecto actual.</p>

<h2>3. Puntos Tratados y Acuerdos</h2>
<ul>
  <li><strong>Punto 1:</strong> Revisión del estado actual del sprint y bloqueos.</li>
  <li><strong>Punto 2:</strong> Validación de prioridades con el equipo de producto.</li>
</ul>

<h2>4. Decisiones Clave</h2>
<blockquote>Se aprueba el paso a la siguiente fase bajo los criterios acordados en la sesión.</blockquote>

<h2>5. Tareas y Compromisos</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>Documentar especificaciones acordadas</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>Enviar resumen ejecutivo a todos los asistentes</p></div></li>
</ul>
`.trim()
  },

  {
    id: 'tech-spec',
    name: 'Especificación Técnica',
    description: 'Documento de arquitectura, modelo de datos, endpoints y riesgos para desarrollo',
    icon: 'code',
    badge: 'Ingeniería',
    contentHtml: `
<h1>Especificación Técnica: [Nombre de la Funcionalidad]</h1>
<p><strong>Autor:</strong> [Nombre del Arquitecto] | <strong>Estado:</strong> Borrador Técnico | <strong>Versión:</strong> 1.0.0</p>

<h2>1. Resumen y Contexto</h2>
<p>Breve descripción del problema que resuelve esta implementación y la motivación técnica.</p>

<h2>2. Objetivos del Sistema</h2>
<ul>
  <li>Garantizar persistencia local-first con baja latencia.</li>
  <li>Mantener sincronización reactiva en tiempo real y tolerancia a desconexión.</li>
</ul>

<h2>3. Arquitectura y Componentes</h2>
<p>Detalle de los servicios involucrados, flujo de datos y dependencias principales:</p>
<pre><code class="language-typescript">// Interfaz principal del modelo
export interface FeaturePayload {
  id: string;
  name: string;
  timestamp: number;
}</code></pre>

<h2>4. Riesgos y Plan de Mitigación</h2>
<table>
  <thead>
    <tr>
      <th>Riesgo Identificado</th>
      <th>Impacto</th>
      <th>Estrategia de Mitigación</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Pérdida de conectividad durante escritura</td>
      <td><code>MEDIO</code></td>
      <td>Almacenamiento en IndexedDB con cola de reintentos</td>
    </tr>
    <tr>
      <td>Conflicto de edición concurrente</td>
      <td><code>BAJO</code></td>
      <td>Resolución por marca de tiempo y deviceId</td>
    </tr>
  </tbody>
</table>

<h2>5. Plan de Pruebas y Tareas</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>Implementar pruebas unitarias en Karma</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>Validar compilación en producción con ng build</p></div></li>
</ul>
`.trim()
  },

  {
    id: 'project-plan',
    name: 'Plan de Proyecto',
    description: 'Alcance, matriz de entregables, responsables y cronograma de hitos',
    icon: 'folder',
    badge: 'Gestión',
    contentHtml: `
<h1>Plan de Proyecto: [Título del Proyecto]</h1>
<p><strong>Líder de Proyecto:</strong> [Nombre] | <strong>Fecha Inicio:</strong> ${new Date().toLocaleDateString('es-ES')} | <strong>Hito Objetivo:</strong> Q4</p>

<h2>1. Alcance y Entregables Clave</h2>
<p>Definición del perímetro de trabajo y resultados tangibles esperados.</p>

<h2>2. Matriz de Responsabilidades y Roles</h2>
<table>
  <thead>
    <tr>
      <th>Fase / Entregable</th>
      <th>Responsable</th>
      <th>Código / Módulo</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Diseño UI y Prototipo</td>
      <td>Diseñador Lead</td>
      <td><code>DESIGN-CORE</code></td>
    </tr>
    <tr>
      <td>Desarrollo Frontend</td>
      <td>Arquitecto Angular</td>
      <td><code>FE-APP</code></td>
    </tr>
    <tr>
      <td>Auditoría de Calidad</td>
      <td>QA Specialist</td>
      <td><code>QA-TEST</code></td>
    </tr>
  </tbody>
</table>

<h2>3. Tareas Críticas del Lanzamiento</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>Revisión final de tokens visuales en modo claro y oscuro</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>Despliegue verificado en producción</p></div></li>
</ul>
`.trim()
  },

  {
    id: 'credentials-directory',
    name: 'Directorio de Roles y Credenciales',
    description: 'Matriz estructurada estilo Notion para catálogo de perfiles, usuarios y tokens',
    icon: 'table',
    badge: 'Seguridad',
    contentHtml: `
<h1>Directorio de Perfiles y Cuentas de Sistema</h1>
<p>Catálogo centralizado de roles, permisos y credenciales de acceso para control administrativo.</p>

<table>
  <thead>
    <tr>
      <th>Perfil / Rol</th>
      <th>Usuario / Código</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>ADMINISTRADOR GENERAL</td>
      <td><code>ADMIN_SIS_1_001</code></td>
    </tr>
    <tr>
      <td>SUPERVISOR DE OPERACIONES</td>
      <td><code>SUP_OPERACIONES_LIMA</code></td>
    </tr>
    <tr>
      <td>ANALISTA DE SOPORTE</td>
      <td><code>ANALISTA_SOPORTE_TI</code></td>
    </tr>
  </tbody>
</table>

<blockquote><strong>Nota de seguridad:</strong> Las credenciales registradas deben renovarse periódicamente y respetar los privilegios de mínimo acceso.</blockquote>
`.trim()
  }
];
