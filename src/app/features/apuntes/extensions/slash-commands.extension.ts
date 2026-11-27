import { Extension } from '@tiptap/core';
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';

export const SlashCommandsPluginKey = new PluginKey('slashCommandsSuggestion');

export interface SlashCommandItem {
  id: string;
  title: string;
  description: string;
  category: 'Texto' | 'Listas' | 'Estructura' | 'Multimedia' | 'Avanzado';
  icon: string;
  command: (params: { editor: any; range: any }) => void;
}

export interface SlashCommandCallbacks {
  onOpen: (data: { items: SlashCommandItem[]; rect: DOMRect; command: (item: SlashCommandItem) => void }) => void;
  onUpdate: (data: { items: SlashCommandItem[]; rect: DOMRect }) => void;
  onClose: () => void;
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const SlashCommandsExtension = Extension.create<{
  callbacks?: SlashCommandCallbacks;
  items: SlashCommandItem[];
}>({
  name: 'slashCommands',

  addOptions() {
    return {
      items: [],
      callbacks: undefined
    };
  },

  addProseMirrorPlugins() {
    const callbacks = this.options.callbacks;
    const allItems = this.options.items || [];

    return [
      Suggestion({
        pluginKey: SlashCommandsPluginKey,
        editor: this.editor,
        char: '/',
        items: ({ query }) => {
          const q = query.toLowerCase().trim();
          if (!q) return allItems;
          return allItems.filter(
            item =>
              item.title.toLowerCase().includes(q) ||
              item.description.toLowerCase().includes(q) ||
              item.category.toLowerCase().includes(q)
          );
        },
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
        render: () => {
          let currentCommand: ((item: SlashCommandItem) => void) | null = null;

          return {
            onStart: props => {
              if (!callbacks) return;
              currentCommand = (item: SlashCommandItem) => {
                item.command({ editor: props.editor, range: props.range });
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
