import { Node, mergeAttributes } from '@tiptap/core';

export interface FigureOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figure: {
      setFigure: (options: { src: string; caption?: string; alt?: string }) => ReturnType;
    };
  }
}

export const FigureExtension = Node.create<FigureOptions>({
  name: 'figure',
  group: 'block',
  content: 'inline*',
  draggable: true,
  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'editorial-figure my-6 p-3 rounded-2xl bg-[#FAF7F5] dark:bg-[#16151B] border border-[#EAE2DE] dark:border-[#2A2832] transition-colors'
      }
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: element => element.querySelector('img')?.getAttribute('src'),
        renderHTML: attributes => ({
          'data-src': attributes['src']
        })
      },
      alt: {
        default: null,
        parseHTML: element => element.querySelector('img')?.getAttribute('alt'),
        renderHTML: attributes => ({
          'data-alt': attributes['alt']
        })
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure.editorial-figure',
        contentElement: 'figcaption'
      },
      {
        tag: 'figure',
        contentElement: 'figcaption'
      }
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'figure',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      [
        'div',
        { class: 'overflow-hidden rounded-xl border border-[#EAE2DE] dark:border-[#2A2832] bg-white dark:bg-[#19181E] flex items-center justify-center p-1' },
        [
          'img',
          {
            src: node.attrs['src'],
            alt: node.attrs['alt'] || 'Figura editorial',
            class: 'max-w-full h-auto rounded-lg mx-auto block'
          }
        ]
      ],
      [
        'figcaption',
        { class: 'text-center text-xs font-medium text-[#635B5E] dark:text-neutral-400 mt-2.5 px-2 select-text' },
        0
      ]
    ];
  },

  addCommands() {
    return {
      setFigure:
        ({ src, caption, alt }) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: { src, alt: alt || caption || 'Figura' },
              content: caption ? [{ type: 'text', text: caption }] : [{ type: 'text', text: 'Escribe un pie de foto explicativo...' }]
            })
            .run();
        }
    };
  }
});
