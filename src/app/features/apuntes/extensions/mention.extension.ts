import { Mention } from '@tiptap/extension-mention';
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';

export const MentionPluginKey = new PluginKey('mentionSuggestion');

export interface MentionItem {
  id: string;
  label: string;
  type: 'nota' | 'tarea' | 'carpeta';
  info?: string;
}

export interface MentionCallbacks {
  onOpen: (data: { items: MentionItem[]; rect: DOMRect; command: (item: MentionItem) => void }) => void;
  onUpdate: (data: { items: MentionItem[]; rect: DOMRect }) => void;
  onClose: () => void;
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const CustomMentionExtension = Mention.extend<{
  itemsSource: () => MentionItem[];
  callbacks?: MentionCallbacks;
}>({
  addOptions() {
    return {
      ...this.parent?.(),
      itemsSource: () => [],
      callbacks: undefined
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: attributes => ({
          'data-id': attributes['id']
        })
      },
      label: {
        default: null,
        parseHTML: element => element.getAttribute('data-label'),
        renderHTML: attributes => ({
          'data-label': attributes['label']
        })
      },
      mentionType: {
        default: 'nota',
        parseHTML: element => element.getAttribute('data-mention-type'),
        renderHTML: attributes => ({
          'data-mention-type': attributes['mentionType']
        })
      }
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const type = node.attrs['mentionType'] || 'nota';
    let typeClass = 'bg-[#EFEAF6] text-[#74566E] border-[#74566E]/20 dark:bg-[#74566E]/20 dark:text-[#9D7B96]';

    if (type === 'tarea') {
      typeClass = 'bg-[#E8F1FA] text-[#265B8A] border-[#265B8A]/20 dark:bg-[#265B8A]/20 dark:text-[#7EB3E0]';
    } else if (type === 'carpeta') {
      typeClass = 'bg-[#FEF9E7] text-[#975A16] border-[#975A16]/20 dark:bg-[#2E2314] dark:text-[#E9B949]';
    }

    return [
      'span',
      {
        ...HTMLAttributes,
        class: `mention-chip inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border transition-all cursor-pointer select-none ${typeClass}`,
        'data-id': node.attrs['id'],
        'data-mention-type': type
      },
      `@${node.attrs['label']}`
    ];
  },

  addProseMirrorPlugins() {
    const callbacks = this.options.callbacks;
    const getItems = this.options.itemsSource;

    return [
      Suggestion({
        pluginKey: MentionPluginKey,
        editor: this.editor,
        char: '@',
        items: ({ query }) => {
          const list = getItems ? getItems() : [];
          const q = query.toLowerCase().trim();
          if (!q) return list.slice(0, 8);
          return list
            .filter(
              item =>
                item.label.toLowerCase().includes(q) ||
                (item.info && item.info.toLowerCase().includes(q)) ||
                item.type.toLowerCase().includes(q)
            )
            .slice(0, 8);
        },
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: this.name,
                attrs: {
                  id: props.id,
                  label: props.label,
                  mentionType: props.type
                }
              },
              {
                type: 'text',
                text: ' '
              }
            ])
            .run();
        },
        render: () => {
          let currentCommand: ((item: MentionItem) => void) | null = null;

          return {
            onStart: props => {
              if (!callbacks) return;
              currentCommand = (item: MentionItem) => {
                props.command(item);
              };
              const rect = props.clientRect ? props.clientRect() : new DOMRect();
              if (rect) {
                callbacks.onOpen({
                  items: props.items,
                  rect,
                  command: currentCommand
                });
              }
            },
            onUpdate: props => {
              if (!callbacks) return;
              const rect = props.clientRect ? props.clientRect() : new DOMRect();
              if (rect) {
                callbacks.onUpdate({
                  items: props.items,
                  rect
                });
              }
            },
            onKeyDown: props => {
              if (callbacks?.onKeyDown) {
                return callbacks.onKeyDown(props);
              }
              return false;
            },
            onExit: () => {
              if (callbacks?.onClose) {
                callbacks.onClose();
              }
              currentCommand = null;
            }
          };
        }
      })
    ];
  }
});
