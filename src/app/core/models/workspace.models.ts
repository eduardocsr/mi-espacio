export interface NoteFolder {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export type NoteStatus = 'Borrador' | 'En progreso' | 'Finalizado';

export interface NoteAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string; // Data URL o URL en la nube
  uploadedAt: string;
}

export interface Note {
  id: string;
  title: string;
  folderId: string;
  contentJson: any; // Tiptap JSON or editor content
  html?: string;
  plainText: string;
  tags: string[];
  favorite: boolean;
  status: NoteStatus;
  reminderAt?: string;
  comments: string[];
  attachments?: NoteAttachment[];
  linkedTaskId?: string;
  linkedEventId?: string;
  createdAt: string;
  updatedAt: string;
  updatedByDevice?: string;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export type TaskPriority = 'Alta' | 'Media' | 'Baja';
export type TaskStatus = string;
export type IssueType = 'Tarea' | 'Historia' | 'Error' | 'Mejora';

export type KanbanColumnIcon = 'circle' | 'play' | 'eye' | 'check' | 'alert' | 'flag' | 'layers';

export interface KanbanColumn {
  id: string;        // ej. 'todo', 'in_progress', 'review', 'done' o 'col-xxxx'
  label: string;     // ej. 'Por hacer', 'Bloqueado', 'QA'
  color: string;     // hex o token de color para indicador e ícono
  icon: KanbanColumnIcon;
  isDoneColumn?: boolean; // para saber qué columna cuenta como "Completadas" en las métricas
  order: number;
}

export interface TaskItem {
  id: string;
  issueKey: string; // e.g., 'ESP-1', 'ESP-2'
  issueType: IssueType; // 'Tarea' | 'Historia' | 'Error' | 'Mejora'
  title: string;
  description?: string;
  projectTag: string; // e.g., 'Trabajo', 'Salud', 'Estudio', 'Personal'
  priority: TaskPriority;
  status: TaskStatus;
  order?: number; // orden manual dentro de su columna
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  subtasks: SubTask[];
  linkedNoteId?: string;
  reminderEnabled?: boolean;
  reminderId?: string;
  createdAt: string;
  updatedAt: string;
  updatedByDevice?: string;
}

export type CalendarCategory = 'Reunión' | 'Pago' | 'Estudio' | 'Ejercicio' | 'Entrega';

export interface CalendarEvent {
  id: string;
  title: string;
  category: CalendarCategory;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime?: string; // HH:mm
  allDay?: boolean;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  notes?: string;
  linkedNoteId?: string;
}

export type ReminderRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  category: string; // 'Salud', 'Trabajo', 'Personal', 'Pagos', 'Estudio'
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  recurrence: ReminderRecurrence;
  active: boolean;
  completed: boolean;
  snoozedUntil?: string;
  linkedTaskId?: string;
}

export interface WorkspaceExportData {
  version: string;
  exportedAt: string;
  isSeeded?: boolean;
  updatedAt?: number | string;
  updatedByDevice?: string;
  folders: NoteFolder[];
  notes: Note[];
  tasks: TaskItem[];
  columns?: KanbanColumn[];
  calendarEvents: CalendarEvent[];
  reminders: Reminder[];
}

export type WorkspaceSnapshot = WorkspaceExportData;

export interface UserProfile {
  id: string; // e.g. 'u-12345' or Firebase UID
  name: string;
  email: string;
  initials: string;
  color: string;
  avatarUrl?: string;
  createdAt: string;
  cloudLinked?: boolean;
  googleUid?: string;
}
