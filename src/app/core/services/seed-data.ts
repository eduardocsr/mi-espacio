import { CalendarEvent, Note, NoteFolder, Reminder, TaskItem } from '../models/workspace.models';

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function generateSeedData() {
  const now = new Date();
  const todayStr = formatDate(now);

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDate(yesterday);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDate(tomorrow);

  const in3Days = new Date(now);
  in3Days.setDate(in3Days.getDate() + 3);
  const in3DaysStr = formatDate(in3Days);

  const in5Days = new Date(now);
  in5Days.setDate(in5Days.getDate() + 5);
  const in5DaysStr = formatDate(in5Days);

  const folders: NoteFolder[] = [
    { id: 'f-trabajo', name: 'Trabajo', color: '#74566E', icon: 'briefcase' },
    { id: 'f-estudios', name: 'Estudios', color: '#265B8A', icon: 'book-open' },
    { id: 'f-personal', name: 'Personal', color: '#8C4A19', icon: 'user' },
    { id: 'f-ideas', name: 'Ideas', color: '#246A49', icon: 'lightbulb' }
  ];

  const notes: Note[] = [
    {
      id: 'n-1',
      title: 'Plan semanal',
      folderId: 'f-trabajo',
      contentJson: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Organización y prioridades de la semana para mantener el enfoque, avanzar en los proyectos y cumplir con los compromisos clave.'
              }
            ]
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [
              {
                type: 'text',
                text: 'Objetivos de la semana',
                marks: [{ type: 'highlight', attrs: { color: '#EFEAF6' } }]
              }
            ]
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Avanzar con el análisis del proyecto SGSI.' }]
                  }
                ]
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Dedicar tiempo a aprender SQL.' }]
                  }
                ]
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Cerrar pendientes de administración.' }]
                  }
                ]
              }
            ]
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [
              {
                type: 'text',
                text: 'Tareas principales',
                marks: [{ type: 'highlight', attrs: { color: '#FDF0E6' } }]
              }
            ]
          },
          {
            type: 'taskList',
            content: [
              {
                type: 'taskItem',
                attrs: { checked: true },
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Revisar avances con el equipo (SGSI)' }]
                  }
                ]
              },
              {
                type: 'taskItem',
                attrs: { checked: true },
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Actualizar documentación del proyecto' }]
                  }
                ]
              },
              {
                type: 'taskItem',
                attrs: { checked: false },
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Completar el módulo de SQL (lecciones 4–6)' }]
                  }
                ]
              },
              {
                type: 'taskItem',
                attrs: { checked: false },
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Planificar la siguiente semana' }]
                  }
                ]
              }
            ]
          },
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: '“La constancia en pequeñas acciones genera grandes resultados.”'
                  }
                ]
              }
            ]
          },
          {
            type: 'heading',
            attrs: { level: 3 },
            content: [
              {
                type: 'text',
                text: 'Consulta SQL de apoyo',
                marks: [{ type: 'highlight', attrs: { color: '#E6F3EC' } }]
              }
            ]
          },
          {
            type: 'codeBlock',
            attrs: { language: 'sql' },
            content: [
              {
                type: 'text',
                text: 'SELECT estado, COUNT(*) AS total\nFROM tareas\nWHERE semana = CURRENT_DATE\nGROUP BY estado;'
              }
            ]
          }
        ]
      },
      plainText: 'Organización y prioridades de la semana para mantener el enfoque, avanzar en los proyectos y cumplir con los compromisos clave.',
      tags: ['Trabajo', 'Planificación', 'Productividad'],
      favorite: true,
      status: 'En progreso',
      reminderAt: '15:00',
      comments: [
        'Priorizar el módulo de SQL antes del viernes.',
        'Revisión con equipo agendada para el jueves.'
      ],
      createdAt: `${todayStr}T09:00:00.000Z`,
      updatedAt: `${todayStr}T10:32:00.000Z`
    },
    {
      id: 'n-2',
      title: 'Apuntes de SQL',
      folderId: 'f-estudios',
      contentJson: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Introducción a SQL' }]
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'SQL (Structured Query Language) es un lenguaje estándar para trabajar con bases de datos relacionales. Nos permite consultar, insertar, actualizar y eliminar datos de forma eficiente.'
              }
            ]
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: '💡 Idea clave: SQL nos ayuda a interactuar con la base de datos sin necesidad de programar lógica compleja.',
                marks: [{ type: 'highlight', attrs: { color: '#FEF9E7' } }]
              }
            ]
          },
          {
            type: 'codeBlock',
            attrs: { language: 'sql' },
            content: [
              {
                type: 'text',
                text: 'SELECT nombre, correo\nFROM usuarios\nWHERE activo = TRUE\nORDER BY fecha_registro DESC;'
              }
            ]
          }
        ]
      },
      plainText: 'SQL (Structured Query Language) es un lenguaje estándar para trabajar con bases de datos relacionales.',
      tags: ['Estudio', 'Base de datos', 'SQL'],
      favorite: true,
      status: 'En progreso',
      comments: ['Excelente referencia para consultas complejas.'],
      createdAt: `${yesterdayStr}T14:30:00.000Z`,
      updatedAt: `${yesterdayStr}T18:47:00.000Z`
    },
    {
      id: 'n-3',
      title: 'Ideas de proyectos',
      folderId: 'f-ideas',
      contentJson: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Banco de ideas innovadoras: 1. Gestor inteligente de finanzas personales. 2. Asistente botánico con recordatorios de riego. 3. Extensión de lectura sin distracciones.'
              }
            ]
          }
        ]
      },
      plainText: 'Banco de ideas innovadoras: 1. Gestor inteligente de finanzas personales. 2. Asistente botánico.',
      tags: ['Ideas', 'Proyectos'],
      favorite: false,
      status: 'Borrador',
      comments: [],
      createdAt: `${yesterdayStr}T11:00:00.000Z`,
      updatedAt: `${yesterdayStr}T16:20:00.000Z`
    },
    {
      id: 'n-4',
      title: 'Metas del mes',
      folderId: 'f-personal',
      contentJson: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Metas clave del mes: completar 15 sesiones de entrenamiento, leer 2 libros de desarrollo profesional, y mantener el presupuesto semanal equilibrado.'
              }
            ]
          }
        ]
      },
      plainText: 'Metas clave del mes: completar 15 sesiones de entrenamiento, leer 2 libros.',
      tags: ['Personal', 'Metas'],
      favorite: true,
      status: 'En progreso',
      comments: [],
      createdAt: `${yesterdayStr}T08:00:00.000Z`,
      updatedAt: `${todayStr}T09:15:00.000Z`
    }
  ];

  const tasks: TaskItem[] = [
    {
      id: 't-1',
      issueKey: 'ESP-1',
      issueType: 'Historia',
      title: 'Preparar presentación del proyecto',
      description: 'Definir estructura y diapositivas para la reunión general de avances.',
      projectTag: 'Trabajo',
      priority: 'Alta',
      status: 'todo',
      order: 0,
      dueDate: in3DaysStr,
      dueTime: '17:00',
      subtasks: [
        { id: 'st-1', title: 'Definir estructura', completed: true },
        { id: 'st-2', title: 'Crear diapositivas', completed: false }
      ],
      createdAt: `${todayStr}T08:00:00.000Z`,
      updatedAt: `${todayStr}T08:00:00.000Z`
    },
    {
      id: 't-2',
      issueKey: 'ESP-2',
      issueType: 'Tarea',
      title: 'Inscribirme al curso online',
      description: 'Revisar opciones de cursos certificados y completar registro.',
      projectTag: 'Estudio',
      priority: 'Media',
      status: 'todo',
      order: 1,
      dueDate: in5DaysStr,
      dueTime: '19:00',
      subtasks: [
        { id: 'st-3', title: 'Revisar opciones', completed: false },
        { id: 'st-4', title: 'Completar registro', completed: false }
      ],
      createdAt: `${todayStr}T08:30:00.000Z`,
      updatedAt: `${todayStr}T08:30:00.000Z`
    },
    {
      id: 't-3',
      issueKey: 'ESP-3',
      issueType: 'Mejora',
      title: 'Organizar archivos del equipo',
      description: 'Crear carpetas departamentales y clasificar documentación antigua.',
      projectTag: 'Trabajo',
      priority: 'Alta',
      status: 'in_progress',
      order: 0,
      dueDate: todayStr,
      dueTime: '15:00',
      subtasks: [
        { id: 'st-5', title: 'Crear carpetas', completed: true },
        { id: 'st-6', title: 'Mover documentos', completed: true }
      ],
      createdAt: `${todayStr}T09:00:00.000Z`,
      updatedAt: `${todayStr}T11:00:00.000Z`
    },
    {
      id: 't-4',
      issueKey: 'ESP-4',
      issueType: 'Tarea',
      title: 'Hacer rutina de ejercicio',
      description: 'Calentamiento y sesión funcional de fuerza.',
      projectTag: 'Salud',
      priority: 'Media',
      status: 'in_progress',
      order: 1,
      dueDate: todayStr,
      dueTime: '18:00',
      subtasks: [
        { id: 'st-7', title: 'Calentamiento', completed: true },
        { id: 'st-8', title: 'Rutina principal', completed: false }
      ],
      createdAt: `${todayStr}T09:30:00.000Z`,
      updatedAt: `${todayStr}T11:20:00.000Z`
    },
    {
      id: 't-5',
      issueKey: 'ESP-5',
      issueType: 'Error',
      title: 'Revisar informe mensual',
      description: 'Actualizar métricas clave y validar con los coordinadores.',
      projectTag: 'Trabajo',
      priority: 'Alta',
      status: 'review',
      order: 0,
      dueDate: todayStr,
      dueTime: '17:00',
      subtasks: [
        { id: 'st-9', title: 'Actualizar datos', completed: true },
        { id: 'st-10', title: 'Revisar indicadores', completed: true },
        { id: 'st-11', title: 'Validar con el equipo', completed: false }
      ],
      createdAt: `${todayStr}T08:15:00.000Z`,
      updatedAt: `${todayStr}T10:45:00.000Z`
    },
    {
      id: 't-6',
      issueKey: 'ESP-6',
      issueType: 'Tarea',
      title: 'Responder correos pendientes',
      description: 'Dar seguimiento a consultas urgentes de clientes internos.',
      projectTag: 'Trabajo',
      priority: 'Media',
      status: 'done',
      order: 0,
      dueDate: todayStr,
      dueTime: '10:00',
      subtasks: [
        { id: 'st-12', title: 'Revisar bandeja', completed: true }
      ],
      createdAt: `${yesterdayStr}T10:00:00.000Z`,
      updatedAt: `${todayStr}T10:15:00.000Z`
    },
    {
      id: 't-7',
      issueKey: 'ESP-7',
      issueType: 'Tarea',
      title: 'Pagar servicio de internet',
      description: 'Realizar pago en línea antes de la fecha límite.',
      projectTag: 'Personal',
      priority: 'Alta',
      status: 'done',
      order: 1,
      dueDate: todayStr,
      dueTime: '18:00',
      subtasks: [],
      createdAt: `${yesterdayStr}T12:00:00.000Z`,
      updatedAt: `${todayStr}T09:30:00.000Z`
    }
  ];

  const calendarEvents: CalendarEvent[] = [
    {
      id: 'ce-1',
      title: 'Reunión de equipo',
      category: 'Reunión',
      date: todayStr,
      startTime: '15:00',
      endTime: '16:00',
      notes: 'Revisar avances de los proyectos y coordinar sprint.'
    },
    {
      id: 'ce-2',
      title: 'Tomar vitaminas',
      category: 'Ejercicio',
      date: todayStr,
      startTime: '21:00',
      notes: 'Hábito diario de salud.'
    },
    {
      id: 'ce-3',
      title: 'Pagar servicio de internet',
      category: 'Pago',
      date: todayStr,
      startTime: '18:00',
      notes: 'Factura mensual de fibra óptica.'
    },
    {
      id: 'ce-4',
      title: 'Estudio SQL',
      category: 'Estudio',
      date: tomorrowStr,
      startTime: '18:30',
      endTime: '20:00',
      notes: 'Práctica de JOINS y subconsultas.'
    },
    {
      id: 'ce-5',
      title: 'Entrega de informe',
      category: 'Entrega',
      date: in3DaysStr,
      startTime: '17:00',
      notes: 'Entrega final de resultados del trimestre.'
    }
  ];

  const reminders: Reminder[] = [
    {
      id: 'r-1',
      title: 'Tomar vitaminas',
      description: 'Tomar mis vitaminas diarias para mantenerme saludable.',
      category: 'Salud',
      date: todayStr,
      time: '21:00',
      recurrence: 'daily',
      active: true,
      completed: false
    },
    {
      id: 'r-2',
      title: 'Reunión de equipo',
      description: 'Revisar avances del proyecto y próximas tareas.',
      category: 'Trabajo',
      date: todayStr,
      time: '15:00',
      recurrence: 'none',
      active: true,
      completed: false
    },
    {
      id: 'r-3',
      title: 'Pagar servicio de internet',
      description: 'Realizar el pago mensual antes del corte de servicio.',
      category: 'Personal',
      date: todayStr,
      time: '18:00',
      recurrence: 'monthly',
      active: true,
      completed: false
    },
    {
      id: 'r-4',
      title: 'Enviar informe mensual',
      description: 'Enviar reporte consolidado a la gerencia.',
      category: 'Trabajo',
      date: tomorrowStr,
      time: '10:00',
      recurrence: 'monthly',
      active: true,
      completed: false
    },
    {
      id: 'r-5',
      title: 'Clase de inglés',
      description: 'Práctica de conversación y gramática avanzada.',
      category: 'Estudio',
      date: in3DaysStr,
      time: '19:00',
      recurrence: 'weekly',
      active: true,
      completed: false
    }
  ];

  return { folders, notes, tasks, calendarEvents, reminders };
}
