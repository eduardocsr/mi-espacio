import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  LucideAngularModule,
  FileText,
  Folder,
  Plus,
  Search,
  Star,
  MoreVertical,
  CheckCircle2,
  Trash2,
  Volume2,
  VolumeX,
  Code2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Bold,
  Italic,
  Strikethrough,
  Underline,
  Highlighter,
  Lightbulb,
  Palette,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Undo2,
  Redo2,
  Link2,
  Eye,
  EyeOff,
  Send,
  MessageSquare,
  Info,
  Tag,
  Pencil,
  Clock,
  Check,
  Image as ImageIcon,
  Paperclip,
  Download,
  X,
  Copy,
  SquareCheck,
  Maximize2,
  Minimize2,
  Calendar,
  Sparkles,
  WandSparkles,
  Printer,
  ArrowRight,
  Table as TableIcon,
  TextAlignCenter,
  TextAlignJustify,
  TextAlignStart,
  TextAlignEnd,
  LayoutTemplate,
  AtSign,
  Globe,
  PenTool,
  Columns,
  Rows,
  CheckCheck,
  AlertTriangle
} from 'lucide-angular';

import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Highlight } from '@tiptap/extension-highlight';
import { Underline as TiptapUnderline } from '@tiptap/extension-underline';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Image from '@tiptap/extension-image';
import { Table as TiptapTable, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import { TextAlign } from '@tiptap/extension-text-align';
import { BubbleMenu as TiptapBubbleMenu } from '@tiptap/extension-bubble-menu';
import { NodeSelection } from '@tiptap/pm/state';
import { common, createLowlight } from 'lowlight';

import { SlashCommandsExtension, SlashCommandItem } from './extensions/slash-commands.extension';
import { CleverRulesExtension } from './extensions/clever-rules.extension';
import { FigureExtension } from './extensions/figure.extension';
import { IframeExtension, IframeNodeExtension, sanitizeEmbedUrl } from './extensions/iframe.extension';
import { DrawingExtension } from './extensions/drawing.extension';
import { EmbeddedTaskExtension } from './extensions/embedded-task.extension';
import { CustomMentionExtension, MentionItem } from './extensions/mention.extension';
import { LinterExtension, LinterIssue } from './extensions/linter.extension';
import { NOTE_TEMPLATES, NoteTemplate } from './extensions/templates.data';

import { WorkspaceService } from '../../core/services/workspace.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import { AiConfigService } from '../../core/services/ai-config.service';
import { Note, NoteFolder, NoteStatus, NoteAttachment, TaskItem as WorkspaceTaskItem, CalendarEvent } from '../../core/models/workspace.models';
import { compressImageToDataUrl } from '../../core/utils/image-compressor';

const lowlight = createLowlight(common);

// Custom CodeBlock NodeView with Header Bar & Copy to Clipboard button
const CustomCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'code-card-wrapper my-3 relative rounded-2xl border border-[#E6DFDA] dark:border-[#2A2832] bg-[#F7F5F3] dark:bg-[#19181E] shadow-2xs overflow-hidden group';

      const header = document.createElement('div');
      header.className = 'code-card-header flex items-center justify-between px-4 py-2 bg-[#EFECE8]/80 dark:bg-[#201E27]/80 border-b border-[#E6DFDA] dark:border-[#2A2832] text-xs font-mono select-none';
      header.contentEditable = 'false';

      const langSpan = document.createElement('span');
      langSpan.className = 'text-[11px] font-bold uppercase tracking-wider text-[#74566E] dark:text-[#9D7B96]';
      langSpan.textContent = node.attrs['language'] || 'código';

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'copy-code-btn inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-[#19181E] border border-[#E6DFDA] dark:border-[#2A2832] hover:bg-[#FAF7F5] dark:hover:bg-[#121115] text-[#635B5E] hover:text-[#231F20] dark:text-neutral-300 text-[11px] font-semibold transition-all shadow-2xs cursor-pointer select-none';

      const copyIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
      const checkIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#246A49" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

      copyBtn.innerHTML = `${copyIconSvg}<span>Copiar</span>`;

      const pre = document.createElement('pre');
      pre.className = 'm-0! p-4! border-0! bg-transparent! rounded-none! overflow-x-auto';
      const code = document.createElement('code');
      pre.appendChild(code);

      let resetTimer: any = null;

      const performCopy = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();

        const codeText = code.innerText || code.textContent || node.textContent || '';

        // Feedback visual inmediato (0ms)
        copyBtn.innerHTML = `${checkIconSvg}<span class="text-[#246A49] dark:text-green-400 font-bold">¡Copiado!</span>`;
        copyBtn.classList.add('bg-[#E6F3EC]', 'border-[#246A49]/30');

        if (resetTimer) clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          copyBtn.innerHTML = `${copyIconSvg}<span>Copiar</span>`;
          copyBtn.classList.remove('bg-[#E6F3EC]', 'border-[#246A49]/30');
        }, 2000);

        // Copia a portapapeles con fallback síncrono
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(codeText).catch(() => {
            fallbackCopy(codeText);
          });
        } else {
          fallbackCopy(codeText);
        }
      };

      const fallbackCopy = (text: string) => {
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          ta.style.top = '0';
          ta.setAttribute('readonly', '');
          document.body.appendChild(ta);
          ta.select();
          ta.setSelectionRange(0, ta.value.length);
          document.execCommand('copy');
          document.body.removeChild(ta);
        } catch (_) {}
      };

      copyBtn.addEventListener('click', performCopy);
      copyBtn.addEventListener('mousedown', (e) => e.stopPropagation());
      copyBtn.addEventListener('pointerdown', (e) => e.stopPropagation());

      header.appendChild(langSpan);
      header.appendChild(copyBtn);

      dom.appendChild(header);
      dom.appendChild(pre);

      return {
        dom,
        contentDOM: code,
        update: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          langSpan.textContent = updatedNode.attrs['language'] || 'código';
          return true;
        },
        stopEvent: (event: Event) => {
          const target = event.target as HTMLElement;
          if (target && (target.closest('.copy-code-btn') || target.closest('.code-card-header'))) {
            return true;
          }
          return false;
        },
        ignoreMutation: (mutation: any) => {
          if (header.contains(mutation.target as Node) || copyBtn.contains(mutation.target as Node)) {
            return true;
          }
          return false;
        }
      };
    };
  }
});

// Vista /apuntes (Editor Tiptap y Notas)
@Component({
  selector: 'app-apuntes',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './apuntes.component.html'
})
export class ApuntesComponent implements OnInit, OnDestroy {
  readonly workspace = inject(WorkspaceService);
  readonly feedback = inject(UiFeedbackService);
  readonly aiConfig = inject(AiConfigService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);

  readonly editorHost = viewChild<ElementRef<HTMLDivElement>>('editorHost');
  readonly bubbleMenuEl = viewChild<ElementRef<HTMLDivElement>>('bubbleMenuEl');
  private loadedNoteId: string | null = null;
  private isInternalUpdate = false;
  private lastLocalKeystrokeAt = 0;
  private deferredRemoteUpdateTimer: any = null;
  private pendingRemoteContent: { content: any; noteTime: number } | null = null;

  // Lucide Icons
  readonly FileTextIcon = FileText;
  readonly FolderIcon = Folder;
  readonly PlusIcon = Plus;
  readonly SearchIcon = Search;
  readonly StarIcon = Star;
  readonly MoreVerticalIcon = MoreVertical;
  readonly CheckCircle2Icon = CheckCircle2;
  readonly Trash2Icon = Trash2;
  readonly Volume2Icon = Volume2;
  readonly VolumeXIcon = VolumeX;
  readonly Code2Icon = Code2;
  readonly ExternalLinkIcon = ExternalLink;
  readonly ChevronDownIcon = ChevronDown;
  readonly ChevronRightIcon = ChevronRight;
  readonly BoldIcon = Bold;
  readonly ItalicIcon = Italic;
  readonly StrikethroughIcon = Strikethrough;
  readonly ListIcon = List;
  readonly ListOrderedIcon = ListOrdered;
  readonly ListTodoIcon = ListTodo;
  readonly QuoteIcon = Quote;
  readonly Undo2Icon = Undo2;
  readonly Redo2Icon = Redo2;
  readonly Link2Icon = Link2;
  readonly UnderlineIcon = Underline;
  readonly HighlighterIcon = Highlighter;
  readonly LightbulbIcon = Lightbulb;
  readonly PaletteIcon = Palette;
  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;
  readonly SendIcon = Send;
  readonly MessageSquareIcon = MessageSquare;
  readonly InfoIcon = Info;
  readonly ImageIcon = ImageIcon;
  readonly PaperclipIcon = Paperclip;
  readonly DownloadIcon = Download;
  readonly XIcon = X;
  readonly CopyIcon = Copy;
  readonly SquareCheckIcon = SquareCheck;
  readonly Maximize2Icon = Maximize2;
  readonly Minimize2Icon = Minimize2;
  readonly CalendarIcon = Calendar;

  readonly isUploadingMedia = signal<boolean>(false);
  readonly activePdfPreview = signal<{ name: string; safeUrl: SafeResourceUrl; rawUrl: string } | null>(null);
  readonly TagIcon = Tag;
  readonly ClockIcon = Clock;
  readonly CheckIcon = Check;
  readonly PencilIcon = Pencil;
  readonly SparklesIcon = Sparkles;
  readonly WandSparklesIcon = WandSparkles;
  readonly PrinterIcon = Printer;
  readonly ArrowRightIcon = ArrowRight;
  readonly TableIcon = TableIcon;
  readonly TextAlignCenterIcon = TextAlignCenter;
  readonly TextAlignJustifyIcon = TextAlignJustify;
  readonly TextAlignStartIcon = TextAlignStart;
  readonly TextAlignEndIcon = TextAlignEnd;
  readonly LayoutTemplateIcon = LayoutTemplate;
  readonly AtSignIcon = AtSign;
  readonly GlobeIcon = Globe;
  readonly PenToolIcon = PenTool;
  readonly ColumnsIcon = Columns;
  readonly RowsIcon = Rows;
  readonly CheckCheckIcon = CheckCheck;
  readonly AlertTriangleIcon = AlertTriangle;

  // New Tiptap Suite States
  readonly noteTemplates = NOTE_TEMPLATES;
  showTemplateModal = signal<boolean>(false);
  showIframeModal = signal<boolean>(false);
  showFigureModal = signal<boolean>(false);
  showTaskPickerModal = signal<boolean>(false);
  showLinterPopover = signal<boolean>(false);
  currentTextDirection = signal<'ltr' | 'rtl' | 'auto'>('ltr');
  currentAlign = signal<'left' | 'center' | 'right' | 'justify'>('left');

  figureForm = signal<{ src: string; caption: string; alt: string }>({ src: '', caption: '', alt: '' });
  iframeForm = signal<{ url: string; title: string }>({ url: '', title: '' });
  linterIssues = signal<LinterIssue[]>([]);

  // Slash commands state
  slashCommandState = signal<{
    isOpen: boolean;
    items: SlashCommandItem[];
    selectedIndex: number;
    x: number;
    y: number;
    command: ((item: SlashCommandItem) => void) | null;
  }>({
    isOpen: false,
    items: [],
    selectedIndex: 0,
    x: 0,
    y: 0,
    command: null
  });

  // Mentions state
  mentionState = signal<{
    isOpen: boolean;
    items: MentionItem[];
    selectedIndex: number;
    x: number;
    y: number;
    command: ((item: MentionItem) => void) | null;
  }>({
    isOpen: false,
    items: [],
    selectedIndex: 0,
    x: 0,
    y: 0,
    command: null
  });

  // Toolbar dropdown menus
  showHeadingMenu = signal<boolean>(false);
  showBgColorMenu = signal<boolean>(false);
  showTextColorMenu = signal<boolean>(false);
  showAttachMenu = signal<boolean>(false);
  showAiMenu = signal<boolean>(false);
  showExportMenu = signal<boolean>(false);
  isAiGenerating = signal<boolean>(false);
  aiActionLoading = signal<'summarize' | 'improve' | 'structure' | 'actionPlan' | 'ideas' | null>(null);

  // Background / Highlight Colors (Editorial Soft Pastels)
  readonly bgColors = [
    { label: 'Púrpura suave', value: '#EFEAF6', text: '#5B447A' },
    { label: 'Ámbar suave', value: '#FDF0E6', text: '#8C4A19' },
    { label: 'Verde salvia', value: '#E6F3EC', text: '#246A49' },
    { label: 'Azul zafiro', value: '#E8F1FA', text: '#265B8A' },
    { label: 'Rojo suave', value: '#FDECEC', text: '#9B2C2C' },
    { label: 'Amarillo suave', value: '#FEF9E7', text: '#975A16' },
    { label: 'Gris editorial', value: '#FAF7F5', text: '#635B5E' },
    { label: 'Sin fondo', value: 'none', text: '#635B5E' }
  ];

  // Text Colors
  readonly textColors = [
    { label: 'Predeterminado', value: 'none', color: '#231F20' },
    { label: 'Ciruela acento', value: '#74566E', color: '#74566E' },
    { label: 'Verde salvia', value: '#246A49', color: '#246A49' },
    { label: 'Azul zafiro', value: '#265B8A', color: '#265B8A' },
    { label: 'Ámbar cálido', value: '#8C4A19', color: '#8C4A19' },
    { label: 'Rojo teja', value: '#9B2C2C', color: '#9B2C2C' },
    { label: 'Gris oscuro', value: '#635B5E', color: '#635B5E' }
  ];

  // Selected note
  readonly selectedNoteId = signal<string | null>(null);

  // Responsive Segmented Mobile View Tab ('pages' | 'editor' | 'details')
  activeMobileTab = signal<'pages' | 'editor' | 'details'>('editor');

  // Search in notes
  searchQuery = signal<string>('');

  // Right sidebar tab ('info' | 'comments')
  rightTab = signal<'info' | 'comments'>('info');
  showDetailsPanel = signal<boolean>(typeof window !== 'undefined' ? window.innerWidth >= 1536 : false);

  toggleDetailsPanel(): void {
    this.showDetailsPanel.update(v => !v);
  }

  // Focus mode (expands editor by hiding folders sidebar)
  isFocusMode = signal<boolean>(false);

  // Batch selection mode in folders/notes tree
  isBatchSelectMode = signal<boolean>(false);
  selectedNoteIds = signal<Set<string>>(new Set());
  showBatchMoveModal = signal<boolean>(false);

  // Quick template popover
  showTemplateMenu = signal<boolean>(false);

  // Word count and reading time computeds
  readonly currentNoteWords = computed<number>(() => {
    const note = this.currentNote();
    if (!note) return 0;
    const text = note.plainText || '';
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  });

  readonly currentNoteReadingTime = computed<number>(() => {
    const words = this.currentNoteWords();
    if (words === 0) return 0;
    return Math.max(1, Math.ceil(words / 200));
  });

  // Folders collapse state
  collapsedFolders = signal<Record<string, boolean>>({});

  // New Folder creation modal/state
  showNewFolderModal = signal<boolean>(false);
  newFolderName = signal<string>('');
  newFolderColor = signal<string>('#74566E');

  // Edit Folder modal/state
  showEditFolderModal = signal<boolean>(false);
  editingFolder = signal<NoteFolder | null>(null);
  editingFolderName = signal<string>('');
  editingFolderColor = signal<string>('#74566E');

  // New Tag input
  newTagInput = signal<string>('');

  // New Comment input
  newCommentInput = signal<string>('');

  // HTML Preview state
  showHtmlPreview = signal<boolean>(false);
  htmlPreviewCode = signal<string>('');

  // Speech Synthesis (TTS)
  isSpeaking = signal<boolean>(false);
  ttsRate = signal<number>(1.0);
  availableRates = [0.9, 1.0, 1.25, 1.5];

  // Save status indicator linked to WorkspaceService real IndexedDB persistence
  readonly saveStatus = this.workspace.saveStatus;

  // Tiptap Editor instance
  editor: Editor | null = null;

  // Computed Current Note
  readonly currentNote = computed<Note | null>(() => {
    const id = this.selectedNoteId();
    if (!id) return this.workspace.notes()[0] || null;
    return this.workspace.notes().find(n => n.id === id) || this.workspace.notes()[0] || null;
  });

  // Current folder of the note
  readonly currentFolder = computed<NoteFolder | null>(() => {
    const note = this.currentNote();
    if (!note) return null;
    return this.workspace.folders().find(f => f.id === note.folderId) || null;
  });

  // Tarea vinculada en Kanban (enlace bidireccional)
  readonly currentLinkedTask = computed<WorkspaceTaskItem | null>(() => {
    const note = this.currentNote();
    if (!note) return null;
    return this.workspace.tasks().find(t => t.linkedNoteId === note.id || t.id === note.linkedTaskId) || null;
  });

  // Evento vinculado en Calendario (enlace bidireccional)
  readonly currentLinkedEvent = computed<CalendarEvent | null>(() => {
    const note = this.currentNote();
    if (!note) return null;
    return this.workspace.calendarEvents().find(e => e.linkedNoteId === note.id || e.id === note.linkedEventId) || null;
  });

  // Unique deduplicated tags for current note
  readonly currentNoteTags = computed<string[]>(() => {
    const tags = this.currentNote()?.tags || [];
    return Array.from(new Set(tags));
  });

  // Filtered Notes
  readonly filteredNotes = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const notes = this.workspace.notes();
    if (!q) return notes;
    return notes.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.plainText.toLowerCase().includes(q) ||
      n.tags.some(t => t.toLowerCase().includes(q))
    );
  });

  // Favorite notes
  readonly favoriteNotes = computed(() => {
    return this.workspace.notes().filter(n => n.favorite);
  });

  constructor() {
    // 1. Montaje seguro del DOM: instanciar Editor únicamente cuando editorHost esté en el DOM (desacoplado de ciclo CD)
    effect(() => {
      const host = this.editorHost();
      if (host && !this.editor) {
        queueMicrotask(() => {
          const currentHost = this.editorHost();
          if (currentHost && !this.editor) {
            this.initEditor(currentHost.nativeElement);
          }
        });
      } else if (!host && this.editor) {
        this.editor.destroy();
        this.editor = null;
        this.loadedNoteId = null;
      }
    });

    // 2. Sincronización reactiva con activeNote / currentNote sin bucle infinito y en vivo
    effect(() => {
      const note = this.currentNote();
      if (!note || !this.editor || this.isInternalUpdate) {
        return;
      }

      // Caso 1: Cambio a una nota distinta en la lista
      if (note.id !== this.loadedNoteId) {
        this.loadNoteIntoEditor(note);
        return;
      }

      // Caso 2: Es la misma nota abierta (note.id === this.loadedNoteId)
      // Si la actualización proviene de este mismo dispositivo/pestaña, ignorar (evitar ecos/bucles)
      if (note.updatedByDevice && note.updatedByDevice === this.workspace.deviceId) {
        return;
      }

      // Si el usuario local pulsó teclas DESPUÉS de que se generó la actualización remota,
      // la edición local es más reciente. No sobrescribir lo que el usuario está escribiendo.
      const remoteNoteTime = new Date(note.updatedAt).getTime() || 0;
      if (this.lastLocalKeystrokeAt > remoteNoteTime) {
        return;
      }

      // Comprobar si el contenido entrante difiere del contenido actual del editor
      const incomingHtml = note.html || '';
      const currentHtml = this.editor.getHTML();
      const hasMeaningfulJson = this.isContentJsonMeaningful(note.contentJson);
      const contentToApply = (hasMeaningfulJson ? note.contentJson : null) ||
        (note.html && note.html !== '<p></p>' ? note.html : null) ||
        (note.plainText ? note.plainText : '');

      const isDifferent = incomingHtml
        ? incomingHtml !== currentHtml
        : (note.contentJson && JSON.stringify(note.contentJson) !== JSON.stringify(this.editor.getJSON()));

      if (!isDifferent) {
        return;
      }

      const applyRemoteContent = (content: any) => {
        if (!this.editor || this.loadedNoteId !== note.id) return;
        this.isInternalUpdate = true;
        try {
          // Preservar la posición del cursor si el editor tiene foco activo (evita saltos al inicio)
          const { from, to } = this.editor.state.selection;
          this.editor.commands.setContent(content, { emitUpdate: false });
          const maxPos = this.editor.state.doc.content.size;
          if (from !== undefined && to !== undefined) {
            this.editor.commands.setTextSelection({
              from: Math.min(from, maxPos),
              to: Math.min(to, maxPos)
            });
          }
          this.extractHtmlPreview();
        } finally {
          setTimeout(() => {
            this.isInternalUpdate = false;
          }, 50);
        }
      };

      // Control determinista por tiempo desde última pulsación local
      const timeSinceKeystroke = Date.now() - this.lastLocalKeystrokeAt;
      if (timeSinceKeystroke >= 1000) {
        if (this.deferredRemoteUpdateTimer) {
          clearTimeout(this.deferredRemoteUpdateTimer);
          this.deferredRemoteUpdateTimer = null;
        }
        this.pendingRemoteContent = null;
        applyRemoteContent(contentToApply);
      } else {
        // El usuario está tecleando activamente (< 1000ms):
        // Guardar el contenido remoto pendiente para aplicarlo en cuanto haya una pausa en el tecleo
        this.pendingRemoteContent = { content: contentToApply, noteTime: remoteNoteTime };
        if (this.deferredRemoteUpdateTimer) {
          clearTimeout(this.deferredRemoteUpdateTimer);
        }
        const delay = Math.max(100, 1000 - timeSinceKeystroke);
        this.deferredRemoteUpdateTimer = setTimeout(() => {
          this.deferredRemoteUpdateTimer = null;
          if (this.pendingRemoteContent) {
            if (this.lastLocalKeystrokeAt <= this.pendingRemoteContent.noteTime) {
              applyRemoteContent(this.pendingRemoteContent.content);
            }
            this.pendingRemoteContent = null;
          }
        }, delay);
      }
    });
  }

  ngOnInit(): void {
    // Read route param ?id=... (desacoplado de ciclo CD inicial)
    this.route.queryParams.subscribe(params => {
      queueMicrotask(() => {
        if (params['id']) {
          this.selectedNoteId.set(params['id']);
        } else if (!this.selectedNoteId() && this.workspace.notes().length > 0) {
          this.selectedNoteId.set(this.workspace.notes()[0].id);
        }
      });
    });
  }

  ngOnDestroy(): void {
    if (this.deferredRemoteUpdateTimer) {
      clearTimeout(this.deferredRemoteUpdateTimer);
      this.deferredRemoteUpdateTimer = null;
    }
    this.pendingRemoteContent = null;
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }
    this.stopSpeaking();
  }

  focusEditor(): void {
    if (this.editor && !this.editor.isFocused) {
      this.editor.commands.focus('end');
    }
  }

  onEditorHostClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target && (target.closest('.copy-code-btn') || target.closest('.code-card-header'))) {
      return;
    }
    this.focusEditor();
  }

  private isContentJsonMeaningful(json: any): boolean {
    if (!json || !json.content) return false;
    if (json.content.length > 1) return true;
    if (json.content.length === 1) {
      const first = json.content[0];
      return !!(first.content && first.content.length > 0);
    }
    return false;
  }

  private initEditor(element: HTMLElement): void {
    const initialNote = this.currentNote();
    const hasMeaningfulJson = this.isContentJsonMeaningful(initialNote?.contentJson);
    const initialContent = (hasMeaningfulJson ? initialNote?.contentJson : null) ||
      (initialNote?.html && initialNote.html !== '<p></p>' ? initialNote.html : null) ||
      (initialNote?.plainText ? initialNote.plainText : {
        type: 'doc',
        content: [{ type: 'paragraph' }]
      });

    const bubbleEl = this.bubbleMenuEl()?.nativeElement || (typeof document !== 'undefined' ? document.getElementById('editorial-bubble-menu') : null);

    this.editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          codeBlock: false,
          paragraph: {},
          hardBreak: {}
        }),
        TextStyle,
        Color,
        Highlight.configure({
          multicolor: true
        }),
        TaskList,
        TaskItem.configure({
          nested: true,
          HTMLAttributes: {
            'data-type': 'taskItem'
          }
        }),
        CustomCodeBlock.configure({
          lowlight
        }),
        Image.configure({
          inline: false,
          allowBase64: true
        }),
        Link.configure({
          openOnClick: false,
          autolink: true,
          HTMLAttributes: {
            class: 'text-[#74566E] dark:text-[#9D7B96] underline font-semibold hover:opacity-80 transition-opacity'
          }
        }),
        TiptapTable.configure({
          resizable: true
        }),
        TableRow,
        TableHeader,
        TableCell,
        TextAlign.configure({
          types: ['heading', 'paragraph']
        }),
        CleverRulesExtension,
        FigureExtension,
        IframeExtension,
        IframeNodeExtension,
        DrawingExtension,
        EmbeddedTaskExtension.configure({
          onNavigateToTask: (taskId: string) => this.navigateToLinkedTask(taskId)
        }),
        CustomMentionExtension.configure({
          itemsSource: () => this.getMentionItems(),
          callbacks: {
            onOpen: ({ items, rect, command }) => {
              const winH = typeof window !== 'undefined' ? window.innerHeight : 800;
              const y = rect.bottom + 280 > winH && rect.top > 290 ? Math.max(16, rect.top - 288) : rect.bottom + 8;
              this.mentionState.set({
                isOpen: true,
                items,
                selectedIndex: 0,
                x: Math.min(Math.max(rect.left, 16), (typeof window !== 'undefined' ? window.innerWidth : 800) - 300),
                y,
                command
              });
            },
            onUpdate: ({ items, rect }) => {
              const winH = typeof window !== 'undefined' ? window.innerHeight : 800;
              const y = rect.bottom + 280 > winH && rect.top > 290 ? Math.max(16, rect.top - 288) : rect.bottom + 8;
              this.mentionState.update(s => ({
                ...s,
                items,
                selectedIndex: Math.min(s.selectedIndex, Math.max(0, items.length - 1)),
                x: Math.min(Math.max(rect.left, 16), (typeof window !== 'undefined' ? window.innerWidth : 800) - 300),
                y
              }));
            },
            onClose: () => {
              this.mentionState.update(s => ({ ...s, isOpen: false }));
            },
            onKeyDown: (props) => this.handleMentionKeyDown(props)
          }
        }),
        SlashCommandsExtension.configure({
          items: this.buildSlashCommandItems(),
          callbacks: {
            onOpen: ({ items, rect, command }) => {
              const winH = typeof window !== 'undefined' ? window.innerHeight : 800;
              const y = rect.bottom + 320 > winH && rect.top > 330 ? Math.max(16, rect.top - 328) : rect.bottom + 8;
              this.slashCommandState.set({
                isOpen: true,
                items,
                selectedIndex: 0,
                x: Math.min(Math.max(rect.left, 16), (typeof window !== 'undefined' ? window.innerWidth : 800) - 320),
                y,
                command
              });
            },
            onUpdate: ({ items, rect }) => {
              const winH = typeof window !== 'undefined' ? window.innerHeight : 800;
              const y = rect.bottom + 320 > winH && rect.top > 330 ? Math.max(16, rect.top - 328) : rect.bottom + 8;
              this.slashCommandState.update(s => ({
                ...s,
                items,
                selectedIndex: Math.min(s.selectedIndex, Math.max(0, items.length - 1)),
                x: Math.min(Math.max(rect.left, 16), (typeof window !== 'undefined' ? window.innerWidth : 800) - 320),
                y
              }));
            },
            onClose: () => {
              this.slashCommandState.update(s => ({ ...s, isOpen: false }));
            },
            onKeyDown: (props) => this.handleSlashKeyDown(props)
          }
        }),
        LinterExtension.configure({
          onIssuesUpdated: (issues) => {
            this.linterIssues.set(issues);
          }
        }),
        ...(bubbleEl
          ? [
              TiptapBubbleMenu.configure({
                element: bubbleEl as HTMLElement,
                updateDelay: 50
              })
            ]
          : [])
      ],
      content: initialContent,
      editorProps: {
        attributes: {
          class: 'focus:outline-none min-h-[360px] py-2 w-full cursor-text'
        },
        handlePaste: (view, event) => {
          // Soporte directo para pegar imágenes desde el portapapeles (Ctrl + V / Capturas de pantalla)
          const files = event.clipboardData?.files;
          if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
              const file = files[i];
              if (file.type.startsWith('image/')) {
                event.preventDefault();
                this.uploadAndInsertImageFile(file);
                return true;
              }
            }
          }

          const text = event.clipboardData?.getData('text/plain');
          if (!text) return false;

          // 1. If text is selected and pasted content is URL -> transform to link
          if (!view.state.selection.empty && this.isUrl(text.trim())) {
            const url = text.trim();
            this.editor?.chain().focus().setLink({ href: url }).run();
            return true;
          }

          // 2. Si el cursor ya está dentro de un bloque de código, insertar el texto plano directamente
          // sin permitir que Tiptap parseé las etiquetas HTML y rompa el bloque
          if (view.state.selection.$from.parent.type.name === 'codeBlock') {
            view.dispatch(view.state.tr.insertText(text));
            this.extractHtmlPreview();
            return true;
          }

          // 3. Detección automática de bloques de código (HTML, JSON, TS, JS, CSS, SQL, Python)
          // Se inserta como nodo de texto literal dentro del bloque de código para evitar que Tiptap
          // intente parsear las etiquetas HTML como nodos del documento y las expulse fuera del recuadro
          const detectedLang = this.detectCodeLanguage(text);
          if (detectedLang) {
            this.editor?.chain().focus().insertContent({
              type: 'codeBlock',
              attrs: { language: detectedLang },
              content: [{ type: 'text', text: text }]
            }).run();
            this.extractHtmlPreview();
            return true;
          }

          return false;
        }
      },
      onUpdate: ({ editor }) => {
        if (this.isInternalUpdate) {
          return;
        }
        this.lastLocalKeystrokeAt = Date.now();
        if (this.pendingRemoteContent && this.lastLocalKeystrokeAt > this.pendingRemoteContent.noteTime) {
          this.pendingRemoteContent = null;
          if (this.deferredRemoteUpdateTimer) {
            clearTimeout(this.deferredRemoteUpdateTimer);
            this.deferredRemoteUpdateTimer = null;
          }
        }
        const json = editor.getJSON();
        const html = editor.getHTML();
        const text = editor.getText();
        const note = this.currentNote();
        if (note) {
          this.workspace.updateNote(note.id, {
            contentJson: json,
            html,
            plainText: text,
            updatedAt: new Date().toISOString(),
            updatedByDevice: this.workspace.deviceId
          });
        }
        this.extractHtmlPreview();
      }
    });

    if (initialNote) {
      this.loadedNoteId = initialNote.id;
    }
    this.extractHtmlPreview();
  }

  private loadNoteIntoEditor(note: Note): void {
    if (!this.editor) return;
    if (this.deferredRemoteUpdateTimer) {
      clearTimeout(this.deferredRemoteUpdateTimer);
      this.deferredRemoteUpdateTimer = null;
    }
    this.pendingRemoteContent = null;
    this.loadedNoteId = note.id;
    const hasMeaningfulJson = this.isContentJsonMeaningful(note.contentJson);
    const content = (hasMeaningfulJson ? note.contentJson : null) ||
      (note.html && note.html !== '<p></p>' ? note.html : null) ||
      (note.plainText ? note.plainText : {
        type: 'doc',
        content: [{ type: 'paragraph' }]
      });
    this.isInternalUpdate = true;
    try {
      this.editor.commands.setContent(content, { emitUpdate: false });
      this.extractHtmlPreview();
    } finally {
      setTimeout(() => {
        this.isInternalUpdate = false;
      }, 50);
    }
  }

  selectNote(note: Note): void {
    this.selectedNoteId.set(note.id);
    if (this.editor && note.id !== this.loadedNoteId) {
      this.loadNoteIntoEditor(note);
    }
    this.activeMobileTab.set('editor');
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { id: note.id },
      queryParamsHandling: 'merge'
    });
  }

  getNoteExcerpt(note: Note): string {
    if (note.plainText && note.plainText.trim()) {
      return note.plainText.replace(/\s+/g, ' ').trim();
    }
    if (note.html) {
      return note.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    return '';
  }

  duplicateNote(note: Note): void {
    const copyTitle = `${note.title || 'Sin título'} (copia)`;
    const newNote = this.workspace.addNote(copyTitle, note.folderId);
    this.workspace.updateNote(newNote.id, {
      contentJson: note.contentJson,
      html: note.html,
      plainText: note.plainText,
      tags: note.tags ? [...note.tags] : ['General'],
      status: note.status
    });
    this.selectNote(newNote);
    this.feedback.info(`Apunte duplicado: "${copyTitle}"`);
  }

  async deleteNoteWithConfirm(note: Note): Promise<void> {
    const confirmed = await this.feedback.confirm({
      title: 'Eliminar apunte',
      message: `¿Estás seguro de que deseas eliminar permanentemente "${note.title || 'Sin título'}"?`,
      confirmLabel: 'Eliminar apunte',
      tone: 'danger'
    });
    if (confirmed) {
      const deletedNote = { ...note };
      const wasSelected = this.currentNote()?.id === note.id;
      this.workspace.deleteNote(note.id);
      this.feedback.toast({
        type: 'info',
        message: `"${note.title || 'Apunte'}" eliminado.`,
        durationMs: 6000,
        actionLabel: 'Deshacer',
        onAction: () => {
          this.workspace.restoreNote(deletedNote);
          this.selectNote(deletedNote);
          this.feedback.success(`Apunte "${deletedNote.title || 'Sin título'}" restaurado`);
        }
      });
      if (wasSelected) {
        const remaining = this.workspace.notes();
        if (remaining.length > 0) {
          this.selectNote(remaining[0]);
        } else {
          this.selectedNoteId.set(null);
          this.loadedNoteId = null;
          this.editor?.commands.clearContent(false);
        }
      }
    }
  }

  toggleFocusMode(): void {
    this.isFocusMode.update(v => !v);
    if (this.isFocusMode()) {
      this.feedback.info('Modo enfoque activado');
    }
  }

  createNote(folderId?: string): void {
    this.createNoteFromTemplate('blank', folderId);
  }

  createNoteFromTemplate(template: 'blank' | 'meeting' | 'tech' | 'checklist', folderId?: string): void {
    this.showTemplateMenu.set(false);
    const fId = folderId || this.currentFolder()?.id || this.workspace.folders()[0]?.id;

    let title = 'Nota sin título';
    let html = '<p></p>';

    if (template === 'meeting') {
      const todayFormatted = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
      title = `Reunión: ${todayFormatted}`;
      html = `<h2>Objetivo de la reunión</h2><p>Definir el propósito principal y acuerdos esperados de la sesión.</p><h3>Participantes</h3><ul><li><p>Participante 1</p></li><li><p>Participante 2</p></li></ul><h3>Puntos tratados</h3><ol><li><p>Revisión de avances y métricas clave.</p></li><li><p>Bloqueos identificados y soluciones.</p></li></ol><h3>Acuerdos y próximos pasos</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Acción 1: Responsable y fecha límite</p></li><li data-type="taskItem" data-checked="false"><p>Acción 2: Responsable y fecha límite</p></li></ul>`;
    } else if (template === 'tech') {
      title = 'Nota técnica / Script SQL';
      html = `<h2>Contexto y objetivo técnico</h2><p>Descripción técnica de la consulta, estructura de tablas o procedimiento.</p><pre><code class="language-sql">-- Consulta de extracción optimizada
SELECT 
    id, 
    nombre, 
    fecha_creacion, 
    estado
FROM registros
WHERE activo = 1
ORDER BY fecha_creacion DESC
LIMIT 50;</code></pre><h3>Consideraciones de rendimiento</h3><p>Verificar índices sobre columnas de filtrado y volumen esperado.</p>`;
    } else if (template === 'checklist') {
      title = 'Lista de verificación';
      html = `<h2>Tareas prioritarias</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Revisar requerimientos y arquitectura</p></li><li data-type="taskItem" data-checked="false"><p>Implementar cambios de frontend y backend</p></li><li data-type="taskItem" data-checked="false"><p>Ejecutar pruebas en múltiples resoluciones</p></li><li data-type="taskItem" data-checked="false"><p>Validar accesibilidad y temas claro/oscuro</p></li></ul><h3>Notas de seguimiento</h3><p>Registrar cualquier detalle o bloqueo durante la ejecución.</p>`;
    }

    const newNote = this.workspace.addNote(title, fId);
    this.workspace.updateNote(newNote.id, { html });
    this.selectNote(newNote);
    const targetFolder = this.workspace.folders().find(f => f.id === fId);
    if (targetFolder) {
      this.feedback.info(`Nota creada en "${targetFolder.name}"`);
    }
  }

  // Batch Selection Methods
  toggleBatchSelectMode(): void {
    this.isBatchSelectMode.update(v => !v);
    if (!this.isBatchSelectMode()) {
      this.clearBatchSelection();
    }
  }

  toggleNoteSelect(noteId: string, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedNoteIds.update(set => {
      const next = new Set(set);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  }

  isNoteSelected(noteId: string): boolean {
    return this.selectedNoteIds().has(noteId);
  }

  isFolderFullySelected(folderId: string): boolean {
    const notes = this.getNotesByFolder(folderId);
    if (notes.length === 0) return false;
    return notes.every(n => this.selectedNoteIds().has(n.id));
  }

  isFolderPartiallySelected(folderId: string): boolean {
    const notes = this.getNotesByFolder(folderId);
    if (notes.length === 0) return false;
    const selectedCount = notes.filter(n => this.selectedNoteIds().has(n.id)).length;
    return selectedCount > 0 && selectedCount < notes.length;
  }

  toggleFolderSelectAll(folderId: string, event?: Event): void {
    if (event) event.stopPropagation();
    const notes = this.getNotesByFolder(folderId);
    if (notes.length === 0) return;
    const allSelected = notes.every(n => this.selectedNoteIds().has(n.id));
    this.selectedNoteIds.update(set => {
      const next = new Set(set);
      notes.forEach(n => {
        if (allSelected) {
          next.delete(n.id);
        } else {
          next.add(n.id);
        }
      });
      return next;
    });
  }

  clearBatchSelection(): void {
    this.selectedNoteIds.set(new Set());
    this.showBatchMoveModal.set(false);
  }

  batchMoveToFolder(targetFolderId: string): void {
    const ids = Array.from(this.selectedNoteIds());
    if (ids.length === 0) return;
    const targetFolder = this.workspace.folders().find(f => f.id === targetFolderId);
    ids.forEach(id => {
      this.workspace.updateNote(id, { folderId: targetFolderId });
    });
    this.showBatchMoveModal.set(false);
    this.clearBatchSelection();
    this.feedback.success(`${ids.length} notas movidas a "${targetFolder?.name || 'carpeta'}"`);
  }

  async batchDeleteSelectedNotes(): Promise<void> {
    const count = this.selectedNoteIds().size;
    if (count === 0) return;
    const confirmed = await this.feedback.confirm({
      title: `Eliminar ${count} notas`,
      message: `¿Estás seguro de que deseas eliminar permanentemente las ${count} notas seleccionadas? Esta acción no se puede deshacer.`,
      confirmLabel: `Eliminar ${count} notas`,
      tone: 'danger'
    });
    if (confirmed) {
      const ids = Array.from(this.selectedNoteIds());
      const deletedNotes = this.workspace.notes().filter(n => ids.includes(n.id));
      ids.forEach(id => this.workspace.deleteNote(id));
      this.clearBatchSelection();

      this.feedback.toast({
        type: 'info',
        message: `${count} notas eliminadas.`,
        durationMs: 6000,
        actionLabel: 'Deshacer',
        onAction: () => {
          deletedNotes.forEach(n => this.workspace.restoreNote(n));
          if (deletedNotes.length > 0) {
            this.selectNote(deletedNotes[0]);
          }
          this.feedback.success(`${count} notas restauradas`);
        }
      });

      const remaining = this.workspace.notes();
      if (!remaining.find(n => n.id === this.selectedNoteId())) {
        if (remaining.length > 0) {
          this.selectNote(remaining[0]);
        } else {
          this.selectedNoteId.set(null);
          this.loadedNoteId = null;
          this.editor?.commands.clearContent(false);
        }
      }
    }
  }

  setNoteFolder(folderId: string): void {
    const note = this.currentNote();
    if (!note || note.folderId === folderId) return;
    this.workspace.updateNote(note.id, { folderId });
    const targetFolder = this.workspace.folders().find(f => f.id === folderId);
    if (targetFolder) {
      this.showToast(`Nota movida a la carpeta "${targetFolder.name}"`);
    }
  }

  updateNoteTitle(newTitle: string): void {
    const note = this.currentNote();
    if (!note) return;
    this.workspace.updateNote(note.id, { title: newTitle });
  }

  async deleteCurrentNote(): Promise<void> {
    const note = this.currentNote();
    if (!note) return;
    const confirmed = await this.feedback.confirm({
      title: 'Eliminar apunte',
      message: `¿Estás seguro de que deseas eliminar permanentemente "${note.title}"?`,
      confirmLabel: 'Eliminar apunte',
      tone: 'danger'
    });
    if (confirmed) {
      const deletedNote = { ...note };
      this.workspace.deleteNote(note.id);
      this.feedback.toast({
        type: 'info',
        message: `"${note.title}" eliminado.`,
        durationMs: 6000,
        actionLabel: 'Deshacer',
        onAction: () => {
          this.workspace.restoreNote(deletedNote);
          this.selectNote(deletedNote);
          this.feedback.success(`Apunte "${deletedNote.title}" restaurado`);
        }
      });
      const remaining = this.workspace.notes();
      if (remaining.length > 0) {
        this.selectNote(remaining[0]);
      } else {
        this.selectedNoteId.set(null);
        this.loadedNoteId = null;
        this.editor?.commands.clearContent(false);
      }
    }
  }

  toggleFavorite(): void {
    const note = this.currentNote();
    if (!note) return;
    this.workspace.toggleNoteFavorite(note.id);
  }

  setNoteStatus(status: NoteStatus): void {
    const note = this.currentNote();
    if (!note) return;
    this.workspace.updateNote(note.id, { status });
  }

  async uploadAndInsertImageFile(file: File): Promise<void> {
    try {
      this.isUploadingMedia.set(true);
      // Comprime y optimiza la imagen en 0ms en el navegador
      // Evita bloqueos de CORS de Firebase Storage y sincroniza limpio en Firestore e IndexedDB
      const dataUrl = await compressImageToDataUrl(file);
      if (!dataUrl) return;

      if (this.editor) {
        this.editor.chain().focus().setImage({ src: dataUrl, alt: file.name }).run();

        // Disparar persistencia inmediata de la nota con la imagen
        const json = this.editor.getJSON();
        const text = this.editor.getText();
        const note = this.currentNote();
        if (note) {
          this.workspace.updateNote(note.id, {
            contentJson: json,
            plainText: text
          });
        }
      }
    } catch (err) {
      console.error('Error al insertar imagen:', err);
    } finally {
      this.isUploadingMedia.set(false);
    }
  }

  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.uploadAndInsertImageFile(file);
    input.value = '';
  }

  async attachDocumentOrPdf(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const note = this.currentNote();
    if (!note) {
      this.feedback.warning('Por favor selecciona o crea una nota antes de adjuntar un archivo.');
      return;
    }

    try {
      this.isUploadingMedia.set(true);
      let attachmentUrl = '';
      let isFallback = false;

      try {
        const attachment = await this.workspace.firebaseSync.uploadDocument(file);
        attachmentUrl = attachment.url;
      } catch (storageError) {
        console.warn('Firebase Storage no disponible (CORS o 404). Usando guardado local para el archivo.', storageError);
        
        // Si el archivo es menor a 10 MB, lo adjuntamos como Data URL descargable
        if (file.size <= 10 * 1024 * 1024) {
          isFallback = true;
          attachmentUrl = await this.readFileAsDataUrl(file);
        } else {
          throw new Error('FILE_TOO_LARGE_FOR_LOCAL');
        }
      }

      // 1. Registrar en la lista de attachments de la nota
      const newAttachment: NoteAttachment = {
        id: 'att-' + Date.now(),
        name: file.name,
        size: file.size,
        type: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
        url: attachmentUrl,
        uploadedAt: new Date().toISOString()
      };

      const existingAttachments = note.attachments || [];
      const updatedAttachments = [...existingAttachments, newAttachment];
      this.workspace.updateNote(note.id, { attachments: updatedAttachments });

      // 2. Insertar referencia con estilo en el editor
      const sizeKb = (file.size / 1024).toFixed(1);
      const linkHtml = `<p><strong>[Archivo: ${file.name}]</strong> (${sizeKb} KB)</p>`;
      this.editor?.chain().focus().insertContent(linkHtml).run();

      const json = this.editor?.getJSON();
      const text = this.editor?.getText();
      if (json) {
        this.workspace.updateNote(note.id, { contentJson: json, plainText: text });
      }

      if (isFallback) {
        this.showToast(`Archivo "${file.name}" adjuntado con visor disponible.`);
      } else {
        this.showToast(`Archivo "${file.name}" subido a la nube.`);
      }

      // 3. Si es un PDF, abrir automáticamente el visor para previsualizarlo de inmediato
      if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
        this.openAttachment(newAttachment);
      }
    } catch (err: any) {
      console.error('Error al adjuntar archivo:', err);
      if (err?.message === 'FILE_TOO_LARGE_FOR_LOCAL') {
        this.feedback.warning(
          'El archivo supera los 10 MB. Para archivos de gran tamaño, usa la opción "Vincular Google Drive".',
          'Archivo pesado'
        );
      } else {
        this.feedback.error('No se pudo adjuntar el archivo. Intenta vincularlo con Google Drive.');
      }
    } finally {
      this.isUploadingMedia.set(false);
      input.value = '';
    }
  }

  openAttachment(att: NoteAttachment): void {
    const isPdf = att.type === 'application/pdf' || att.name.toLowerCase().endsWith('.pdf');
    let blobUrl = att.url;
    if (att.url.startsWith('data:')) {
      const blob = this.dataUrlToBlob(att.url);
      blobUrl = URL.createObjectURL(blob);
    }

    if (isPdf) {
      const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);
      this.activePdfPreview.set({
        name: att.name,
        safeUrl,
        rawUrl: blobUrl
      });
    } else {
      this.downloadAttachment(att);
    }
  }

  downloadAttachment(att: { name: string; url: string }): void {
    let downloadUrl = att.url;
    if (att.url.startsWith('data:')) {
      const blob = this.dataUrlToBlob(att.url);
      downloadUrl = URL.createObjectURL(blob);
    }
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = att.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  openInNewTab(url: string): void {
    window.open(url, '_blank');
  }

  closePdfPreview(): void {
    this.activePdfPreview.set(null);
  }

  async removeAttachment(attId: string): Promise<void> {
    const note = this.currentNote();
    if (!note || !note.attachments) return;
    const confirmed = await this.feedback.confirm({
      title: 'Eliminar archivo adjunto',
      message: '¿Estás seguro de que deseas quitar este archivo adjunto de la nota?',
      confirmLabel: 'Eliminar',
      tone: 'danger'
    });
    if (confirmed) {
      const updated = note.attachments.filter(a => a.id !== attId);
      this.workspace.updateNote(note.id, { attachments: updated });
      this.feedback.info('Archivo adjunto eliminado');
    }
  }

  private dataUrlToBlob(dataUrl: string): Blob {
    const parts = dataUrl.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
    const binary = atob(parts[1]);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type: mime });
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async promptDriveLink(): Promise<void> {
    const url = await this.feedback.prompt({
      title: 'Vincular Google Drive',
      message: 'Ingresa el enlace público de tu archivo o documento en Google Drive:',
      placeholder: 'https://drive.google.com/file/d/...',
      confirmLabel: 'Vincular enlace',
      inputType: 'url'
    });
    if (url && url.trim()) {
      const driveUrl = url.trim();
      const driveHtml = `<p><a href="${driveUrl}" target="_blank" rel="noopener noreferrer"><strong>Archivo en Google Drive</strong></a></p>`;
      this.editor?.chain().focus().insertContent(driveHtml).run();
      this.feedback.success('Enlace de Google Drive añadido a la nota.');
    }
  }

  // --- Folder Management ---
  toggleFolderCollapse(folderId: string): void {
    const current = this.collapsedFolders();
    this.collapsedFolders.set({
      ...current,
      [folderId]: !current[folderId]
    });
  }

  isFolderCollapsed(folderId: string): boolean {
    return !!this.collapsedFolders()[folderId];
  }

  getNotesByFolder(folderId: string): Note[] {
    return this.filteredNotes().filter(n => n.folderId === folderId);
  }

  createFolder(): void {
    const name = this.newFolderName().trim();
    if (!name) return;
    const folder = this.workspace.addFolder(name, this.newFolderColor());
    this.newFolderName.set('');
    this.showNewFolderModal.set(false);
    this.createNote(folder.id);
  }

  openEditFolderModal(folder: NoteFolder, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.editingFolder.set(folder);
    this.editingFolderName.set(folder.name);
    this.editingFolderColor.set(folder.color || '#74566E');
    this.showEditFolderModal.set(true);
  }

  saveFolderEdit(): void {
    const folder = this.editingFolder();
    const name = this.editingFolderName().trim();
    if (!folder || !name) return;

    this.workspace.updateFolder(folder.id, {
      name,
      color: this.editingFolderColor()
    });
    this.showEditFolderModal.set(false);
    this.editingFolder.set(null);
    this.feedback.success(`Carpeta "${name}" actualizada`);
  }

  async deleteFolderWithConfirm(folder: NoteFolder, event?: Event): Promise<void> {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const notesInFolder = this.getNotesByFolder(folder.id);
    const count = notesInFolder.length;

    const message = count > 0
      ? `¿Estás seguro de que deseas eliminar la carpeta "${folder.name}"? Sus ${count} ${count === 1 ? 'apunte se reasignará' : 'apuntes se reasignarán'} a otra carpeta para no perderlos.`
      : `¿Estás seguro de que deseas eliminar la carpeta "${folder.name}"?`;

    const confirmed = await this.feedback.confirm({
      title: 'Eliminar carpeta',
      message,
      confirmLabel: 'Eliminar carpeta',
      tone: 'danger'
    });

    if (confirmed) {
      if (this.showEditFolderModal() && this.editingFolder()?.id === folder.id) {
        this.showEditFolderModal.set(false);
        this.editingFolder.set(null);
      }
      this.workspace.deleteFolder(folder.id);
      this.feedback.info(`Carpeta "${folder.name}" eliminada`);
    }
  }

  // --- Tags Management ---
  addTag(): void {
    const tag = this.newTagInput().trim();
    const note = this.currentNote();
    if (!tag || !note) return;
    if (!note.tags.includes(tag)) {
      this.workspace.updateNote(note.id, {
        tags: [...note.tags, tag]
      });
    }
    this.newTagInput.set('');
  }

  removeTag(tagToRemove: string): void {
    const note = this.currentNote();
    if (!note) return;
    this.workspace.updateNote(note.id, {
      tags: note.tags.filter(t => t !== tagToRemove)
    });
  }

  // --- Comments Management ---
  addComment(): void {
    const text = this.newCommentInput().trim();
    const note = this.currentNote();
    if (!text || !note) return;
    this.workspace.updateNote(note.id, {
      comments: [...note.comments, text]
    });
    this.newCommentInput.set('');
  }

  // --- Code Detection & Links ---
  private isUrl(text: string): boolean {
    try {
      const url = new URL(text);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private detectCodeLanguage(text: string): string | null {
    const trimmed = text.trim();
    if (trimmed.length < 8) return null;

    // JSON
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        JSON.parse(trimmed);
        return 'json';
      } catch {}
    }

    // HTML / XML
    if (
      /^<(!DOCTYPE\s+html|[a-z][\w-]*(\s+[^>]*)?>.*<\/[a-z][\w-]*>|\w+>)/is.test(trimmed) ||
      (trimmed.includes('</div>') || trimmed.includes('</span>') || trimmed.includes('</p>') || trimmed.includes('</html>'))
    ) {
      return 'html';
    }

    // SQL
    if (/\b(SELECT\s+.+\s+FROM|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|CREATE\s+TABLE)\b/i.test(trimmed)) {
      return 'sql';
    }

    // CSS / SCSS
    if (/(?:^|\n)\s*([.#]?[a-zA-Z0-9_-]+|:[a-zA-Z-]+)\s*\{[^}]*:[^}]*;/m.test(trimmed)) {
      return 'css';
    }

    // TypeScript / JavaScript
    if (
      /\b(import\s+.+\s+from\s+['"]|export\s+(default\s+)?(class|function|const|let|interface|type)|const\s+\w+\s*:\s*[A-Z]|function\s+\w+\s*\(|\bconsole\.log\()/m.test(trimmed)
    ) {
      if (trimmed.includes(': string') || trimmed.includes(': number') || trimmed.includes('interface ') || trimmed.includes('type ')) {
        return 'typescript';
      }
      return 'javascript';
    }

    return null;
  }

  // --- Isolated HTML Preview ---
  extractHtmlPreview(): void {
    if (!this.editor) return;
    const json = this.editor.getJSON();
    let foundHtml = '';

    const traverse = (node: any) => {
      if (node.type === 'codeBlock' && (node.attrs?.language === 'html' || node.attrs?.language === 'xml')) {
        const text = node.content?.map((c: any) => c.text).join('') || '';
        foundHtml += text + '\n';
      }
      if (node.content) {
        node.content.forEach(traverse);
      }
    };
    traverse(json);

    queueMicrotask(() => {
      this.htmlPreviewCode.set(foundHtml);
    });
  }

  toggleHtmlPreview(): void {
    this.extractHtmlPreview();
    this.showHtmlPreview.update(v => !v);
  }

  // --- Speech Synthesis (TTS) ---
  toggleSpeech(): void {
    if (this.isSpeaking()) {
      this.stopSpeaking();
    } else {
      this.speakNote();
    }
  }

  speakNote(): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      this.feedback.warning('Tu navegador no soporta la síntesis de voz.');
      return;
    }

    const note = this.currentNote();
    if (!note) return;

    window.speechSynthesis.cancel();
    const textToRead = `${note.title}. ${note.plainText || ''}`;
    if (!textToRead.trim()) return;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = this.ttsRate();

    // Select Spanish voice
    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find(v => v.lang.startsWith('es-PE') || v.lang.startsWith('es-ES') || v.lang.startsWith('es'));
    if (esVoice) utterance.voice = esVoice;

    utterance.onstart = () => this.isSpeaking.set(true);
    utterance.onend = () => this.isSpeaking.set(false);
    utterance.onerror = () => this.isSpeaking.set(false);

    window.speechSynthesis.speak(utterance);
  }

  stopSpeaking(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.isSpeaking.set(false);
    }
  }

  changeTtsRate(rate: number): void {
    this.ttsRate.set(rate);
    if (this.isSpeaking()) {
      this.speakNote(); // restart with new speed
    }
  }

  // --- Create Task in Kanban ---
  createTaskFromNote(): void {
    const note = this.currentNote();
    if (!note) return;

    // Si ya existe una tarea vinculada, avisar y ofrecer ir a verla directamente
    const existing = this.currentLinkedTask();
    if (existing) {
      this.feedback.info(`Este apunte ya está vinculado con la tarea ${existing.issueKey} (${this.getColumnLabel(existing.status)})`, 'Tarea existente', {
        actionLabel: 'Ver en Kanban →',
        onAction: () => this.navigateToLinkedTask(existing.id)
      });
      return;
    }

    const folder = this.currentFolder();
    const tag = folder ? folder.name : 'Trabajo';

    const newTask = this.workspace.addTask({
      title: note.title || 'Nueva tarea desde apunte',
      description: note.plainText ? note.plainText.slice(0, 200) + '...' : undefined,
      projectTag: tag,
      priority: 'Media',
      status: 'todo',
      linkedNoteId: note.id,
      subtasks: []
    });

    // Guardar la referencia bidireccional en la nota
    this.workspace.updateNote(note.id, { linkedTaskId: newTask.id });

    this.feedback.success(`Tarea ${newTask.issueKey} creada y vinculada con este apunte`, 'Tarea en Kanban', {
      actionLabel: 'Ver en Kanban →',
      onAction: () => this.navigateToLinkedTask(newTask.id)
    });
  }

  navigateToLinkedTask(taskId: string): void {
    this.router.navigate(['/tareas'], { queryParams: { taskId } });
  }

  navigateToLinkedEvent(eventId: string): void {
    this.router.navigate(['/calendario'], { queryParams: { eventId } });
  }

  getColumnLabel(status: string): string {
    return this.workspace.columns().find(c => c.id === status)?.label || status;
  }

  showToast(msg: string): void {
    this.feedback.info(msg);
  }

  isFormatActive(name: string, attributes?: Record<string, any>): boolean {
    if (!this.editor) return false;
    try {
      return !!this.editor.isActive(name, attributes);
    } catch {
      return false;
    }
  }

  getCurrentHeadingLabel(): string {
    if (!this.editor) return 'Texto';
    if (this.isFormatActive('heading', { level: 1 })) return 'Título 1';
    if (this.isFormatActive('heading', { level: 2 })) return 'Título 2';
    if (this.isFormatActive('heading', { level: 3 })) return 'Título 3';
    return 'Texto';
  }

  // Editor Toolbar Commands
  setParagraph(): void {
    this.editor?.chain().focus().setParagraph().run();
  }

  toggleHeading(level: 1 | 2 | 3): void {
    this.editor?.chain().focus().toggleHeading({ level }).run();
  }

  toggleBold(): void {
    this.editor?.chain().focus().toggleBold().run();
  }

  toggleItalic(): void {
    this.editor?.chain().focus().toggleItalic().run();
  }

  toggleStrike(): void {
    this.editor?.chain().focus().toggleStrike().run();
  }

  toggleUnderline(): void {
    this.editor?.chain().focus().toggleUnderline().run();
  }

  setBackgroundColor(color: string): void {
    if (color === 'none') {
      this.editor?.chain().focus().unsetHighlight().run();
    } else {
      this.editor?.chain().focus().setHighlight({ color }).run();
    }
    this.showBgColorMenu.set(false);
  }

  setTextColor(color: string): void {
    if (color === 'none') {
      this.editor?.chain().focus().unsetColor().run();
    } else {
      this.editor?.chain().focus().setColor(color).run();
    }
    this.showTextColorMenu.set(false);
  }

  insertCallout(text: string = 'Idea clave: '): void {
    this.editor?.chain().focus().insertContent({
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: `${text}`,
          marks: [{ type: 'highlight', attrs: { color: '#FEF9E7' } }]
        }
      ]
    }).run();
  }

  closeToolbarMenus(): void {
    this.showHeadingMenu.set(false);
    this.showBgColorMenu.set(false);
    this.showTextColorMenu.set(false);
    this.showAiMenu.set(false);
    this.showExportMenu.set(false);
  }

  toggleBulletList(): void {
    this.editor?.chain().focus().toggleBulletList().run();
  }

  toggleOrderedList(): void {
    this.editor?.chain().focus().toggleOrderedList().run();
  }

  toggleTaskList(): void {
    this.editor?.chain().focus().toggleTaskList().run();
  }

  toggleBlockquote(): void {
    this.editor?.chain().focus().toggleBlockquote().run();
  }

  toggleCodeBlock(lang: string = 'javascript'): void {
    this.editor?.chain().focus().toggleCodeBlock({ language: lang }).run();
  }

  async setLink(): Promise<void> {
    const prevUrl = this.editor?.getAttributes('link')['href'] || '';
    const url = await this.feedback.prompt({
      title: 'Insertar hipervínculo',
      message: 'Ingresa la dirección web (URL) para el texto seleccionado:',
      placeholder: 'https://ejemplo.com',
      defaultValue: prevUrl,
      confirmLabel: 'Guardar enlace',
      inputType: 'url'
    });
    if (url === null) return;
    if (url.trim() === '') {
      this.editor?.chain().focus().unsetLink().run();
    } else {
      this.editor?.chain().focus().setLink({ href: url.trim() }).run();
    }
  }

  // --- Asistente Inteligente Gemini AI ---
  toggleAiMenu(): void {
    if (!this.aiConfig.hasApiKey()) {
      this.promptForApiKey();
      return;
    }
    this.showAiMenu.update(v => !v);
  }

  async promptForApiKey(): Promise<void> {
    const key = await this.feedback.prompt({
      title: 'Configurar Gemini AI',
      message: 'Ingresa tu Google Gemini API Key (obténla gratis en aistudio.google.com/app/apikey) para habilitar el asistente:',
      placeholder: 'AIzaSy...',
      defaultValue: this.aiConfig.apiKey(),
      confirmLabel: 'Guardar clave',
      inputType: 'text'
    });
    if (key !== null) {
      this.aiConfig.setApiKey(key.trim());
      if (key.trim()) {
        this.feedback.success('Clave de Gemini guardada. ¡Asistente IA habilitado!');
      } else {
        this.feedback.info('Clave de Gemini eliminada.');
      }
    }
  }

  async runAiSummarize(): Promise<void> {
    const note = this.currentNote();
    if (!note) return;
    const text = note.plainText || '';
    if (text.trim().length < 20) {
      this.feedback.warning('El apunte debe tener al menos unas líneas de contenido para poder resumirlo.');
      return;
    }

    this.showAiMenu.set(false);
    this.isAiGenerating.set(true);
    this.aiActionLoading.set('summarize');

    try {
      const summaryHtml = await this.aiConfig.summarizeNote(note.title, text);
      const calloutHtml = `
        <div class="my-4 p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs">
          <p class="font-bold text-amber-900 dark:text-amber-300 mb-1.5 flex items-center gap-1.5">
            <strong>Resumen Ejecutivo (Gemini AI)</strong>
          </p>
          ${summaryHtml}
        </div>
      `;
      this.editor?.chain().focus().insertContent(calloutHtml).run();
      this.feedback.success('Resumen generado e insertado en la nota');
    } catch (err: any) {
      this.handleAiError(err);
    } finally {
      this.isAiGenerating.set(false);
      this.aiActionLoading.set(null);
    }
  }

  async runAiImproveWriting(): Promise<void> {
    const note = this.currentNote();
    if (!note) return;
    const text = note.plainText || '';
    if (text.trim().length < 20) {
      this.feedback.warning('El apunte debe tener más contenido para mejorar la redacción.');
      return;
    }

    this.showAiMenu.set(false);
    this.isAiGenerating.set(true);
    this.aiActionLoading.set('improve');

    try {
      const improvedHtml = await this.aiConfig.improveWriting(note.title, text);
      const previousHtml = this.editor?.getHTML() || '';

      this.editor?.chain().focus().setContent(improvedHtml).run();

      this.feedback.toast({
        type: 'success',
        title: 'Redacción mejorada con Gemini',
        message: 'Se ha pulido y reestructurado el texto con estilo editorial.',
        durationMs: 7000,
        actionLabel: 'Deshacer cambios',
        onAction: () => {
          this.editor?.chain().focus().setContent(previousHtml).run();
          this.feedback.info('Se restauró el texto original');
        }
      });
    } catch (err: any) {
      this.handleAiError(err);
    } finally {
      this.isAiGenerating.set(false);
      this.aiActionLoading.set(null);
    }
  }

  insertTable(): void {
    if (!this.editor) return;
    this.editor.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run();
    this.feedback.info('Tabla insertada. Puedes escribir en cada celda.');
  }

  addTableRowBefore(): void {
    this.editor?.chain().focus().addRowBefore().run();
  }

  addTableRowAfter(): void {
    this.editor?.chain().focus().addRowAfter().run();
  }

  deleteTableRow(): void {
    this.editor?.chain().focus().deleteRow().run();
  }

  addTableColBefore(): void {
    this.editor?.chain().focus().addColumnBefore().run();
  }

  addTableColAfter(): void {
    this.editor?.chain().focus().addColumnAfter().run();
  }

  deleteTableCol(): void {
    this.editor?.chain().focus().deleteColumn().run();
  }

  deleteTable(): void {
    this.editor?.chain().focus().deleteTable().run();
    this.feedback.info('Tabla eliminada.');
  }

  toggleTableHeaderRow(): void {
    this.editor?.chain().focus().toggleHeaderRow().run();
  }

  setTextAlign(align: 'left' | 'center' | 'right' | 'justify'): void {
    this.currentAlign.set(align);
    this.editor?.chain().focus().setTextAlign(align).run();
  }

  toggleTextDirection(): void {
    const next = this.currentTextDirection() === 'rtl' ? 'ltr' : 'rtl';
    this.currentTextDirection.set(next);
    this.feedback.info(`Dirección de texto: ${next === 'rtl' ? 'Derecha a Izquierda (RTL)' : 'Izquierda a Derecha (LTR)'}`);
  }

  buildSlashCommandItems(): SlashCommandItem[] {
    return [
      {
        id: 'h1',
        title: 'Título 1',
        description: 'Encabezado grande para secciones principales',
        category: 'Texto',
        icon: 'heading-1',
        command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run()
      },
      {
        id: 'h2',
        title: 'Título 2',
        description: 'Subtítulo mediano para subsecciones',
        category: 'Texto',
        icon: 'heading-2',
        command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run()
      },
      {
        id: 'h3',
        title: 'Título 3',
        description: 'Encabezado pequeño para apartados',
        category: 'Texto',
        icon: 'heading-3',
        command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run()
      },
      {
        id: 'bullet-list',
        title: 'Lista con viñetas',
        description: 'Lista simple con viñetas redondas',
        category: 'Listas',
        icon: 'list',
        command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run()
      },
      {
        id: 'ordered-list',
        title: 'Lista numerada',
        description: 'Secuencia ordenada paso a paso',
        category: 'Listas',
        icon: 'list-ordered',
        command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run()
      },
      {
        id: 'task-list',
        title: 'Lista de verificación',
        description: 'Casillas de verificación interactivas',
        category: 'Listas',
        icon: 'list-todo',
        command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleTaskList().run()
      },
      {
        id: 'table',
        title: 'Tabla editorial',
        description: 'Tabla de 3 filas y 2 columnas con bordes',
        category: 'Estructura',
        icon: 'table',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run();
        }
      },
      {
        id: 'code-block',
        title: 'Bloque de código',
        description: 'Fragmento con resaltado y botón copiar',
        category: 'Estructura',
        icon: 'code',
        command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
      },
      {
        id: 'quote',
        title: 'Cita editorial',
        description: 'Párrafo destacado con borde cálido',
        category: 'Texto',
        icon: 'quote',
        command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run()
      },
      {
        id: 'divider',
        title: 'Separador horizontal',
        description: 'Línea divisoria sutil',
        category: 'Estructura',
        icon: 'minus',
        command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run()
      },
      {
        id: 'figure',
        title: 'Figura con pie de foto',
        description: 'Imagen centrada con epígrafe descriptivo',
        category: 'Multimedia',
        icon: 'image',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).run();
          this.openFigureModal();
        }
      },
      {
        id: 'drawing',
        title: 'Dibujo a mano alzada',
        description: 'Lienzo vectorial SVG interactivo',
        category: 'Multimedia',
        icon: 'pen-tool',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).insertContent({ type: 'drawing', attrs: { lines: [] } }).run();
        }
      },
      {
        id: 'iframe',
        title: 'Incrustar web (iFrame seguro)',
        description: 'Figma, YouTube, Google Docs o Vimeo',
        category: 'Multimedia',
        icon: 'globe',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).run();
          this.openIframeModal();
        }
      },
      {
        id: 'template',
        title: 'Plantilla estructurada',
        description: 'Acta de reunión, especificación o proyecto',
        category: 'Avanzado',
        icon: 'layout-template',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).run();
          this.showTemplateModal.set(true);
        }
      }
    ];
  }

  getSlashItemIcon(iconName: string): any {
    switch (iconName) {
      case 'heading-1':
      case 'heading-2':
      case 'heading-3':
        return this.FileTextIcon;
      case 'list':
        return this.ListIcon;
      case 'list-ordered':
        return this.ListOrderedIcon;
      case 'list-todo':
        return this.ListTodoIcon;
      case 'table':
        return this.TableIcon;
      case 'code':
        return this.Code2Icon;
      case 'quote':
        return this.QuoteIcon;
      case 'minus':
        return this.MoreVerticalIcon;
      case 'image':
        return this.ImageIcon;
      case 'pen-tool':
        return this.PenToolIcon;
      case 'globe':
        return this.GlobeIcon;
      case 'layout-template':
        return this.LayoutTemplateIcon;
      default:
        return this.SparklesIcon;
    }
  }

  getMentionItems(): MentionItem[] {
    const items: MentionItem[] = [];
    const currentId = this.currentNote()?.id;

    // Notas del usuario
    this.workspace.notes().forEach(n => {
      if (n.id !== currentId) {
        items.push({
          id: n.id,
          label: n.title || 'Nota sin título',
          type: 'nota',
          info: 'Apunte'
        });
      }
    });

    // Tareas del tablero Kanban
    this.workspace.tasks().forEach(t => {
      items.push({
        id: t.id,
        label: `${t.issueKey}: ${t.title}`,
        type: 'tarea',
        info: `Tarea (${this.getColumnLabel(t.status)})`
      });
    });

    // Carpetas
    this.workspace.folders().forEach(f => {
      items.push({
        id: f.id,
        label: f.name,
        type: 'carpeta',
        info: 'Carpeta'
      });
    });

    return items;
  }

  handleSlashKeyDown(props: { event: KeyboardEvent }): boolean {
    const { event } = props;
    const state = this.slashCommandState();
    if (!state.isOpen || state.items.length === 0) return false;

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const newIdx = (state.selectedIndex + state.items.length - 1) % state.items.length;
      this.slashCommandState.update(s => ({ ...s, selectedIndex: newIdx }));
      return true;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const newIdx = (state.selectedIndex + 1) % state.items.length;
      this.slashCommandState.update(s => ({ ...s, selectedIndex: newIdx }));
      return true;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const item = state.items[state.selectedIndex];
      if (item && state.command) {
        state.command(item);
      }
      return true;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.slashCommandState.update(s => ({ ...s, isOpen: false }));
      return true;
    }
    return false;
  }

  handleMentionKeyDown(props: { event: KeyboardEvent }): boolean {
    const { event } = props;
    const state = this.mentionState();
    if (!state.isOpen || state.items.length === 0) return false;

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const newIdx = (state.selectedIndex + state.items.length - 1) % state.items.length;
      this.mentionState.update(s => ({ ...s, selectedIndex: newIdx }));
      return true;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const newIdx = (state.selectedIndex + 1) % state.items.length;
      this.mentionState.update(s => ({ ...s, selectedIndex: newIdx }));
      return true;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const item = state.items[state.selectedIndex];
      if (item && state.command) {
        state.command(item);
      }
      return true;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.mentionState.update(s => ({ ...s, isOpen: false }));
      return true;
    }
    return false;
  }

  selectSlashItem(item: SlashCommandItem): void {
    const state = this.slashCommandState();
    if (state.command) {
      state.command(item);
    }
    this.slashCommandState.update(s => ({ ...s, isOpen: false }));
  }

  selectMentionItem(item: MentionItem): void {
    const state = this.mentionState();
    if (state.command) {
      state.command(item);
    }
    this.mentionState.update(s => ({ ...s, isOpen: false }));
  }

  convertSelectionToTask(): void {
    if (!this.editor) return;
    const { from, to } = this.editor.state.selection;
    const selectedText = this.editor.state.doc.textBetween(from, to, ' ').trim();
    if (!selectedText) {
      this.feedback.warning('Selecciona texto en el editor para convertirlo en tarea.');
      return;
    }

    const folder = this.currentFolder();
    const title = selectedText.length > 90 ? selectedText.slice(0, 87) + '...' : selectedText;
    const newTask = this.workspace.addTask({
      title,
      description: selectedText,
      projectTag: folder ? folder.name : 'General',
      priority: 'Media',
      status: 'todo',
      linkedNoteId: this.currentNote()?.id,
      subtasks: []
    });

    this.editor.chain().focus().deleteRange({ from, to }).insertContent({
      type: 'embeddedTask',
      attrs: {
        taskId: newTask.id,
        issueKey: newTask.issueKey,
        title: newTask.title,
        status: newTask.status,
        priority: newTask.priority
      }
    }).run();

    this.feedback.success(`Tarea ${newTask.issueKey} creada e insertada en el apunte`, 'Tarea en Kanban', {
      actionLabel: 'Ver en Kanban →',
      onAction: () => this.navigateToLinkedTask(newTask.id)
    });
  }

  closeSlashCommands(): void {
    this.slashCommandState.update(s => ({ ...s, isOpen: false }));
  }

  closeMentions(): void {
    this.mentionState.update(s => ({ ...s, isOpen: false }));
  }

  updateFigureSrc(src: string): void {
    this.figureForm.update(f => ({ ...f, src }));
  }

  updateFigureCaption(caption: string): void {
    this.figureForm.update(f => ({ ...f, caption }));
  }

  updateFigureAlt(alt: string): void {
    this.figureForm.update(f => ({ ...f, alt }));
  }

  updateIframeUrl(url: string): void {
    this.iframeForm.update(f => ({ ...f, url }));
  }

  updateIframeTitle(title: string): void {
    this.iframeForm.update(f => ({ ...f, title }));
  }

  openFigureModal(): void {
    this.figureForm.set({ src: '', caption: '', alt: '' });
    this.showFigureModal.set(true);
  }

  insertFigure(): void {
    const form = this.figureForm();
    if (!form.src.trim()) return;
    this.editor?.chain().focus().insertContent({
      type: 'figure',
      attrs: {
        src: form.src.trim(),
        alt: form.alt.trim() || 'Imagen editorial',
        caption: form.caption.trim() || 'Pie de foto descriptivo'
      }
    }).run();
    this.showFigureModal.set(false);
    this.feedback.success('Figura con pie de foto insertada.');
  }

  openIframeModal(): void {
    this.iframeForm.set({ url: '', title: '' });
    this.showIframeModal.set(true);
  }

  insertIframe(): void {
    const form = this.iframeForm();
    const rawUrl = form.url.trim();
    if (!rawUrl) return;

    const { safeUrl, service } = sanitizeEmbedUrl(rawUrl);
    if (!safeUrl) {
      this.feedback.warning('El enlace debe ser de un proveedor compatible (YouTube, Vimeo, Figma, Google Docs o CodePen).');
      return;
    }

    const title = form.title.trim() || `Contenido de ${service}`;
    if (this.editor) {
      const sel = this.editor.state.selection;
      if (sel instanceof NodeSelection) {
        this.editor.chain().focus().setTextSelection(sel.to).insertContent([
          {
            type: 'iframe',
            attrs: { src: safeUrl, title, service }
          },
          {
            type: 'paragraph'
          }
        ]).run();
      } else {
        this.editor.chain().focus().insertContent([
          {
            type: 'iframe',
            attrs: { src: safeUrl, title, service }
          },
          {
            type: 'paragraph'
          }
        ]).run();
      }
    }

    this.showIframeModal.set(false);
    this.feedback.success(`Incrustación de ${service} insertada.`);
  }

  insertDrawing(): void {
    if (!this.editor) return;
    const sel = this.editor.state.selection;
    if (sel instanceof NodeSelection) {
      this.editor.chain().focus().setTextSelection(sel.to).insertContent([
        {
          type: 'drawing',
          attrs: { lines: [] }
        },
        {
          type: 'paragraph'
        }
      ]).run();
    } else {
      this.editor.chain().focus().insertContent([
        {
          type: 'drawing',
          attrs: { lines: [] }
        },
        {
          type: 'paragraph'
        }
      ]).run();
    }
    this.feedback.info('Lienzo de dibujo vectorial interactivo insertado.');
  }

  applyTemplate(template: NoteTemplate): void {
    if (!this.editor) return;
    this.editor.chain().focus().insertContent(template.contentHtml).run();
    this.showTemplateModal.set(false);
    this.feedback.success(`Plantilla "${template.name}" insertada en el apunte.`);
  }

  jumpToIssue(issue: LinterIssue): void {
    if (!this.editor) return;
    this.editor.commands.setTextSelection({ from: issue.from, to: issue.to });
    this.editor.commands.focus();
    this.showLinterPopover.set(false);
  }

  async runAiStructureNote(): Promise<void> {
    const note = this.currentNote();
    if (!note) return;
    const text = this.editor?.getText() || note.plainText || '';
    if (text.trim().length < 10) {
      this.feedback.warning('El apunte debe tener más contenido para poder analizarlo y estructurarlo.');
      return;
    }

    this.showAiMenu.set(false);
    this.isAiGenerating.set(true);
    this.aiActionLoading.set('structure');

    try {
      const structuredHtml = await this.aiConfig.structureMessyNote(note.title, text);
      const previousHtml = this.editor?.getHTML() || '';

      this.editor?.chain().focus().setContent(structuredHtml).run();

      this.feedback.toast({
        type: 'success',
        title: 'Apunte estructurado con Gemini',
        message: 'Se organizaron y estructuraron los datos en formato editorial (tablas y secciones).',
        durationMs: 8000,
        actionLabel: 'Deshacer cambios',
        onAction: () => {
          this.editor?.chain().focus().setContent(previousHtml).run();
          this.feedback.info('Se restauró el texto original');
        }
      });
    } catch (err: any) {
      this.handleAiError(err);
    } finally {
      this.isAiGenerating.set(false);
      this.aiActionLoading.set(null);
    }
  }

  async runAiExtractActionPlan(): Promise<void> {
    const note = this.currentNote();
    if (!note) return;
    const text = note.plainText || '';
    if (text.trim().length < 15) {
      this.feedback.warning('El apunte debe tener más contenido para extraer tareas.');
      return;
    }

    this.showAiMenu.set(false);
    this.isAiGenerating.set(true);
    this.aiActionLoading.set('actionPlan');

    try {
      const tasks = await this.aiConfig.extractActionPlan(note.title, text);
      if (tasks.length === 0) {
        this.feedback.info('No se detectaron tareas pendientes en el texto.');
        return;
      }

      const taskItemsHtml = tasks
        .map(t => `<li data-type="taskItem" data-checked="false"><p>${t}</p></li>`)
        .join('');
      const checklistBlock = `<h3>Plan de acción extraído (Gemini AI)</h3><ul data-type="taskList">${taskItemsHtml}</ul>`;

      this.editor?.chain().focus().insertContent(checklistBlock).run();
      this.feedback.success(`Se insertaron ${tasks.length} tareas pendientes en la nota`);
    } catch (err: any) {
      this.handleAiError(err);
    } finally {
      this.isAiGenerating.set(false);
      this.aiActionLoading.set(null);
    }
  }

  async runAiGenerateIdeas(): Promise<void> {
    const note = this.currentNote();
    if (!note) return;
    const text = note.plainText || '';
    if (text.trim().length < 15) {
      this.feedback.warning('El apunte debe tener más contenido para sugerir ideas.');
      return;
    }

    this.showAiMenu.set(false);
    this.isAiGenerating.set(true);
    this.aiActionLoading.set('ideas');

    try {
      const ideasHtml = await this.aiConfig.generateIdeas(note.title, text);
      const blockHtml = `
        <div class="my-3 p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/30 text-xs text-[#231F20] dark:text-[#F3EFEA]">
          <p class="font-bold text-[#74566E] dark:text-[#9D7B96] mb-1">Ideas y preguntas de profundización:</p>
          ${ideasHtml}
        </div>
      `;
      this.editor?.chain().focus().insertContent(blockHtml).run();
      this.feedback.success('Ideas sugeridas añadidas a la nota');
    } catch (err: any) {
      this.handleAiError(err);
    } finally {
      this.isAiGenerating.set(false);
      this.aiActionLoading.set(null);
    }
  }

  private handleAiError(err: any): void {
    console.error('Error al ejecutar Gemini AI:', err);
    const msg = err?.message || '';
    if (msg.includes('NO_API_KEY')) {
      this.promptForApiKey();
    } else if (msg.includes('API_NOT_ENABLED')) {
      this.feedback.error('La API de Gemini no está activa en tu proyecto. Crea tu clave gratuita en aistudio.google.com/app/apikey');
    } else if (msg.includes('INVALID_API_KEY')) {
      this.feedback.error('La clave de API de Gemini parece no ser válida o no tiene permisos. Por favor revísala.');
    } else {
      const cleanMsg = msg.replace(/^Error:\s*/, '').slice(0, 140);
      this.feedback.error(cleanMsg || 'No se pudo conectar con el servicio de Gemini. Revisa tu clave y conexión.');
    }
  }

  undo(): void {
    this.editor?.chain().focus().undo().run();
  }

  redo(): void {
    this.editor?.chain().focus().redo().run();
  }

  toggleExportMenu(): void {
    this.showExportMenu.update(v => !v);
    this.showAiMenu.set(false);
  }

  exportNoteToMarkdown(): void {
    const note = this.currentNote();
    if (!note) return;
    this.showExportMenu.set(false);

    const markdown = this.buildNoteMarkdown(note);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.slugify(note.title || 'apunte')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.feedback.success('Apunte exportado en formato Markdown (.md)');
  }

  async copyNoteAsMarkdown(): Promise<void> {
    const note = this.currentNote();
    if (!note) return;
    this.showExportMenu.set(false);

    try {
      const markdown = this.buildNoteMarkdown(note);
      await navigator.clipboard.writeText(markdown);
      this.feedback.success('Copiado al portapapeles en formato Markdown');
    } catch {
      this.feedback.warning('No se pudo acceder al portapapeles automáticamente');
    }
  }

  printNote(): void {
    const note = this.currentNote();
    if (!note) return;
    this.showExportMenu.set(false);
    this.showAiMenu.set(false);
    this.showDetailsPanel.set(false);
    this.activeMobileTab.set('editor');

    // Pequeño timeout para permitir que Angular cierre los desplegables y el panel de detalles antes de abrir el diálogo de impresión
    setTimeout(() => {
      window.print();
    }, 120);
  }

  private buildNoteMarkdown(note: any): string {
    const folder = this.workspace.folders().find((f: any) => f.id === note.folderId)?.name || 'General';
    const tags = note.tags?.length ? `[${note.tags.map((t: string) => `"${t}"`).join(', ')}]` : '[]';
    const dateStr = note.createdAt ? new Date(note.createdAt).toISOString() : new Date().toISOString();
    const updatedStr = note.updatedAt ? new Date(note.updatedAt).toISOString() : dateStr;

    const frontmatter = [
      '---',
      `title: "${(note.title || 'Sin título').replace(/"/g, '\\"')}"`,
      `created: ${dateStr}`,
      `updated: ${updatedStr}`,
      `folder: "${folder.replace(/"/g, '\\"')}"`,
      `tags: ${tags}`,
      '---',
      ''
    ].join('\n');

    const bodyHtml = this.editor?.getHTML() || note.content || '';
    const bodyMd = this.convertHtmlToMarkdown(bodyHtml);

    return `${frontmatter}\n# ${note.title || 'Sin título'}\n\n${bodyMd}`.trim();
  }

  private convertHtmlToMarkdown(html: string): string {
    if (!html || typeof window === 'undefined') return '';

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const raw = this.domNodeToMarkdown(doc.body);
    return raw.replace(/\n{3,}/g, '\n\n').trim();
  }

  private domNodeToMarkdown(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    const getChildrenMd = () => {
      return Array.from(el.childNodes).map(child => this.domNodeToMarkdown(child)).join('');
    };

    switch (tag) {
      case 'h1': return `\n\n# ${getChildrenMd().trim()}\n\n`;
      case 'h2': return `\n\n## ${getChildrenMd().trim()}\n\n`;
      case 'h3': return `\n\n### ${getChildrenMd().trim()}\n\n`;
      case 'h4': return `\n\n#### ${getChildrenMd().trim()}\n\n`;
      case 'h5': return `\n\n##### ${getChildrenMd().trim()}\n\n`;
      case 'h6': return `\n\n###### ${getChildrenMd().trim()}\n\n`;
      case 'p': return `\n\n${getChildrenMd().trim()}\n\n`;
      case 'strong':
      case 'b': return `**${getChildrenMd()}**`;
      case 'em':
      case 'i': return `*${getChildrenMd()}*`;
      case 's':
      case 'del':
      case 'strike': return `~~${getChildrenMd()}~~`;
      case 'u': return `<u>${getChildrenMd()}</u>`;
      case 'mark': return `==${getChildrenMd()}==`;
      case 'code':
        if (el.parentElement?.tagName.toLowerCase() === 'pre') {
          return getChildrenMd();
        }
        return `\`${getChildrenMd()}\``;
      case 'pre': {
        const codeEl = el.querySelector('code');
        const lang = codeEl?.className?.replace(/^language-/, '') || '';
        const codeContent = codeEl ? codeEl.textContent : el.textContent;
        return `\n\n\`\`\`${lang}\n${codeContent?.trim() || ''}\n\`\`\`\n\n`;
      }
      case 'blockquote': {
        const inner = getChildrenMd().trim();
        const lines = inner.split('\n').map(l => `> ${l}`).join('\n');
        return `\n\n${lines}\n\n`;
      }
      case 'table': {
        const rows = Array.from(el.querySelectorAll('tr'));
        if (rows.length === 0) return '';
        const mdRows: string[] = [];
        rows.forEach((row, rowIndex) => {
          const cells = Array.from(row.querySelectorAll('th, td'));
          const cellTexts = cells.map(cell => this.domNodeToMarkdown(cell).replace(/\n/g, ' ').trim());
          mdRows.push(`| ${cellTexts.join(' | ')} |`);
          if (rowIndex === 0) {
            mdRows.push(`| ${cells.map(() => '---').join(' | ')} |`);
          }
        });
        return `\n\n${mdRows.join('\n')}\n\n`;
      }
      case 'hr': return `\n\n---\n\n`;
      case 'br': return `\n`;
      case 'a': {
        const href = el.getAttribute('href') || '';
        return `[${getChildrenMd()}](${href})`;
      }
      case 'figure': {
        const img = el.querySelector('img');
        const caption = el.querySelector('figcaption');
        const src = img?.getAttribute('src') || '';
        const alt = img?.getAttribute('alt') || 'figura';
        const capText = caption ? this.domNodeToMarkdown(caption).trim() : '';
        return `\n\n![${alt}](${src})${capText ? `\n*${capText}*` : ''}\n\n`;
      }
      case 'figcaption': return getChildrenMd().trim();
      case 'iframe':
      case 'iframe-node': {
        const src = el.getAttribute('src') || '';
        const title = el.getAttribute('title') || 'Contenido incrustado';
        return `\n\n[Incrustación: ${title}](${src})\n\n`;
      }
      case 'div': {
        const dataType = el.getAttribute('data-type');
        if (dataType === 'embedded-task') {
          const key = el.getAttribute('data-issue-key') || 'TASK';
          const title = el.getAttribute('data-title') || '';
          const priority = el.getAttribute('data-priority') || '';
          return `\n\n> [Tarea ${key}: **${title}** (${priority})]\n\n`;
        }
        if (dataType === 'editorial-drawing') {
          return `\n\n> [Dibujo vectorial SVG]\n\n`;
        }
        return getChildrenMd();
      }
      case 'span': {
        if (el.classList.contains('mention-chip') || el.hasAttribute('data-mention-type')) {
          return `@${el.textContent?.replace(/^@/, '').trim()}`;
        }
        return getChildrenMd();
      }
      case 'img': {
        const src = el.getAttribute('src') || '';
        const alt = el.getAttribute('alt') || 'imagen';
        return `![${alt}](${src})`;
      }
      case 'ul': {
        return `\n\n${getChildrenMd().trim()}\n\n`;
      }
      case 'ol': {
        let index = 1;
        const items = Array.from(el.children).map(li => {
          const text = this.domNodeToMarkdown(li).trim().replace(/^[-*]\s*/, '');
          return `${index++}. ${text}`;
        }).join('\n');
        return `\n\n${items}\n\n`;
      }
      case 'li': {
        const isTaskItem = el.getAttribute('data-type') === 'taskItem' || el.hasAttribute('data-checked');
        if (isTaskItem) {
          const isChecked = el.getAttribute('data-checked') === 'true';
          const contentNodes = Array.from(el.childNodes).filter(
            c => c.nodeType === Node.TEXT_NODE || (c.nodeType === Node.ELEMENT_NODE && (c as HTMLElement).tagName.toLowerCase() !== 'label')
          );
          const text = contentNodes.map(c => this.domNodeToMarkdown(c)).join('').trim();
          return `- [${isChecked ? 'x' : ' '}] ${text}\n`;
        }
        return `- ${getChildrenMd().trim()}\n`;
      }
      default:
        return getChildrenMd();
    }
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') || 'apunte';
  }
}
