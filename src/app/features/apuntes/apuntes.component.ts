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
  Paperclip
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
import { common, createLowlight } from 'lowlight';

import { WorkspaceService } from '../../core/services/workspace.service';
import { Note, NoteFolder, NoteStatus } from '../../core/models/workspace.models';
import { compressImageToDataUrl } from '../../core/utils/image-compressor';

const lowlight = createLowlight(common);

// Custom CodeBlock NodeView with Header Bar & Copy to Clipboard button
const CustomCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'code-card-wrapper my-3 relative rounded-2xl border border-[#E6DFD9] dark:border-[#2A2832] bg-[#F7F5F3] dark:bg-[#19181E] shadow-2xs overflow-hidden group';

      const header = document.createElement('div');
      header.className = 'code-card-header flex items-center justify-between px-4 py-2 bg-[#EFECE8]/80 dark:bg-[#201E27]/80 border-b border-[#E6DFD9] dark:border-[#2A2832] text-xs font-mono select-none';
      header.contentEditable = 'false';

      const langSpan = document.createElement('span');
      langSpan.className = 'text-[11px] font-bold uppercase tracking-wider text-[#74566E] dark:text-[#9D7B96]';
      langSpan.textContent = node.attrs['language'] || 'código';

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'copy-code-btn inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-[#19181E] border border-[#E6DFD9] dark:border-[#2A2832] hover:bg-[#FAF7F5] dark:hover:bg-[#121115] text-[#635B5E] hover:text-[#231F20] dark:text-neutral-300 text-[11px] font-semibold transition-all shadow-2xs cursor-pointer select-none';

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
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly editorHost = viewChild<ElementRef<HTMLDivElement>>('editorHost');
  private loadedNoteId: string | null = null;
  private isInternalUpdate = false;

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

  readonly isUploadingMedia = signal<boolean>(false);
  readonly TagIcon = Tag;
  readonly ClockIcon = Clock;
  readonly CheckIcon = Check;
  readonly PencilIcon = Pencil;

  // Toolbar dropdown menus
  showHeadingMenu = signal<boolean>(false);
  showBgColorMenu = signal<boolean>(false);
  showTextColorMenu = signal<boolean>(false);
  showAttachMenu = signal<boolean>(false);

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

  // Folders collapse state
  collapsedFolders = signal<Record<string, boolean>>({});

  // New Folder creation modal/state
  showNewFolderModal = signal<boolean>(false);
  newFolderName = signal<string>('');
  newFolderColor = signal<string>('#74566E');

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
  toastMessage = signal<string | null>(null);

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
    // 1. Montaje seguro del DOM: instanciar Editor únicamente cuando editorHost esté en el DOM
    effect(() => {
      const host = this.editorHost();
      if (host && !this.editor) {
        this.initEditor(host.nativeElement);
      } else if (!host && this.editor) {
        this.editor.destroy();
        this.editor = null;
        this.loadedNoteId = null;
      }
    });

    // 2. Sincronización reactiva con activeNote / currentNote sin bucle infinito
    effect(() => {
      const note = this.currentNote();
      if (!note || !this.editor || this.isInternalUpdate) {
        return;
      }

      // Solo llamar a setContent si cambiamos a una nota distinta
      if (note.id !== this.loadedNoteId) {
        this.loadNoteIntoEditor(note);
      }
    });
  }

  ngOnInit(): void {
    // Read route param ?id=...
    this.route.queryParams.subscribe(params => {
      if (params['id']) {
        this.selectedNoteId.set(params['id']);
      } else if (!this.selectedNoteId() && this.workspace.notes().length > 0) {
        this.selectedNoteId.set(this.workspace.notes()[0].id);
      }
    });
  }

  ngOnDestroy(): void {
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

  private initEditor(element: HTMLElement): void {
    const initialNote = this.currentNote();
    const initialContent = initialNote?.contentJson || (initialNote?.plainText ? initialNote.plainText : {
      type: 'doc',
      content: [{ type: 'paragraph' }]
    });

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
          nested: true
        }),
        CustomCodeBlock.configure({
          lowlight
        }),
        Image.configure({
          inline: false,
          allowBase64: true
        })
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
        this.isInternalUpdate = true;
        const json = editor.getJSON();
        const text = editor.getText();
        const note = this.currentNote();
        if (note) {
          this.workspace.updateNote(note.id, {
            contentJson: json,
            plainText: text
          });
        }
        this.extractHtmlPreview();
        setTimeout(() => {
          this.isInternalUpdate = false;
        }, 300);
      }
    });

    if (initialNote) {
      this.loadedNoteId = initialNote.id;
    }
    this.extractHtmlPreview();
  }

  private loadNoteIntoEditor(note: Note): void {
    if (!this.editor) return;
    this.loadedNoteId = note.id;
    const content = note.contentJson || (note.plainText ? note.plainText : {
      type: 'doc',
      content: [{ type: 'paragraph' }]
    });
    this.editor.commands.setContent(content, { emitUpdate: false });
    this.extractHtmlPreview();
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

  createNote(folderId?: string): void {
    const fId = folderId || this.currentFolder()?.id || this.workspace.folders()[0]?.id;
    const newNote = this.workspace.addNote('Nota sin título', fId);
    this.selectNote(newNote);
    const targetFolder = this.workspace.folders().find(f => f.id === fId);
    if (targetFolder) {
      this.showToast(`Nueva nota en "${targetFolder.name}"`);
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

  deleteCurrentNote(): void {
    const note = this.currentNote();
    if (!note) return;
    if (confirm(`¿Eliminar la nota "${note.title}"?`)) {
      this.workspace.deleteNote(note.id);
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
    try {
      this.isUploadingMedia.set(true);
      let attachmentUrl = '';
      let isFallback = false;

      try {
        const attachment = await this.workspace.firebaseSync.uploadDocument(file);
        attachmentUrl = attachment.url;
      } catch (storageError) {
        console.warn('Firebase Storage no disponible (CORS o 404). Usando fallback local para el archivo.', storageError);
        
        // Si el archivo es menor a 10 MB, lo adjuntamos como Data URL descargable
        if (file.size <= 10 * 1024 * 1024) {
          isFallback = true;
          attachmentUrl = await this.readFileAsDataUrl(file);
        } else {
          throw new Error('FILE_TOO_LARGE_FOR_LOCAL');
        }
      }

      const sizeKb = (file.size / 1024).toFixed(1);
      const isZipOrRar = file.name.endsWith('.zip') || file.name.endsWith('.rar') || file.name.endsWith('.7z');
      const icon = isZipOrRar ? '📦' : '📎';

      // Insertar enlace al documento en el editor con opción de descarga
      const linkHtml = `<p>${icon} <a href="${attachmentUrl}" download="${file.name}" target="_blank" rel="noopener noreferrer"><strong>${file.name}</strong> (${sizeKb} KB)</a></p>`;
      this.editor?.chain().focus().insertContent(linkHtml).run();

      // Guardar cambio en la nota de inmediato
      const json = this.editor?.getJSON();
      const text = this.editor?.getText();
      const note = this.currentNote();
      if (note && json) {
        this.workspace.updateNote(note.id, { contentJson: json, plainText: text });
      }

      if (isFallback) {
        this.showToast(`Archivo "${file.name}" adjuntado a la nota.`);
      } else {
        this.showToast(`Archivo "${file.name}" subido a la nube.`);
      }
    } catch (err: any) {
      console.error('Error al adjuntar archivo:', err);
      if (err?.message === 'FILE_TOO_LARGE_FOR_LOCAL') {
        alert('El archivo supera los 10 MB y Firebase Storage no está disponible.\n\nPor favor usa la opción "📁 Vincular Google Drive" para archivos de gran tamaño.');
      } else {
        alert('No se pudo adjuntar el archivo. Puedes vincularlo directamente con Google Drive.');
      }
    } finally {
      this.isUploadingMedia.set(false);
      input.value = '';
    }
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  promptDriveLink(): void {
    const url = prompt('Ingresa el enlace público de tu archivo o documento en Google Drive:');
    if (url && url.trim()) {
      const driveUrl = url.trim();
      const driveHtml = `<p>📄 <a href="${driveUrl}" target="_blank" rel="noopener noreferrer"><strong>Archivo en Google Drive</strong></a></p>`;
      this.editor?.chain().focus().insertContent(driveHtml).run();
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

    this.htmlPreviewCode.set(foundHtml);
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
      alert('Tu navegador no soporta síntesis de voz.');
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

    const folder = this.currentFolder();
    const tag = folder ? folder.name : 'Trabajo';

    this.workspace.addTask({
      title: note.title,
      description: note.plainText ? note.plainText.slice(0, 150) + '...' : undefined,
      projectTag: tag,
      priority: 'Media',
      status: 'todo',
      linkedNoteId: note.id,
      subtasks: []
    });

    this.showToast('Tarea agregada exitosamente al tablero Kanban');
  }

  showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 3000);
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
          text: `💡 ${text}`,
          marks: [{ type: 'highlight', attrs: { color: '#FEF9E7' } }]
        }
      ]
    }).run();
  }

  closeToolbarMenus(): void {
    this.showHeadingMenu.set(false);
    this.showBgColorMenu.set(false);
    this.showTextColorMenu.set(false);
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

  setLink(): void {
    const prevUrl = this.editor?.getAttributes('link')['href'];
    const url = window.prompt('Ingresa la URL del enlace:', prevUrl);
    if (url === null) return;
    if (url === '') {
      this.editor?.chain().focus().unsetLink().run();
    } else {
      this.editor?.chain().focus().setLink({ href: url }).run();
    }
  }

  undo(): void {
    this.editor?.chain().focus().undo().run();
  }

  redo(): void {
    this.editor?.chain().focus().redo().run();
  }
}
