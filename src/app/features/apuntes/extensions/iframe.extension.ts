import { Node, mergeAttributes } from '@tiptap/core';

export interface IframeOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    iframe: {
      setIframe: (options: { src: string; title?: string }) => ReturnType;
    };
  }
}

// Dominios seguros y confiables autorizados
const TRUSTED_DOMAINS = [
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'vimeo.com',
  'player.vimeo.com',
  'figma.com',
  'www.figma.com',
  'docs.google.com',
  'drive.google.com',
  'maps.google.com',
  'codepen.io'
];

export function sanitizeEmbedUrl(rawUrl: string): { safeUrl: string | null; service: string } {
  try {
    const trimmed = rawUrl.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return { safeUrl: null, service: '' };
    }

    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase();
    const isAllowed = TRUSTED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));

    if (!isAllowed) {
      return { safeUrl: null, service: '' };
    }

    // 1. YouTube normal -> YouTube embed
    if (hostname.includes('youtube.com') && parsed.searchParams.has('v')) {
      const videoId = parsed.searchParams.get('v');
      return { safeUrl: `https://www.youtube-nocookie.com/embed/${videoId}`, service: 'YouTube' };
    }
    if (hostname.includes('youtu.be')) {
      const videoId = parsed.pathname.replace(/^\//, '');
      return { safeUrl: `https://www.youtube-nocookie.com/embed/${videoId}`, service: 'YouTube' };
    }

    // 2. Vimeo normal -> player embed
    if (hostname === 'vimeo.com') {
      const videoId = parsed.pathname.replace(/^\//, '');
      return { safeUrl: `https://player.vimeo.com/video/${videoId}`, service: 'Vimeo' };
    }

    // 3. Figma share -> Figma embed
    if (hostname.includes('figma.com') && !hostname.includes('embed')) {
      return {
        safeUrl: `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(trimmed)}`,
        service: 'Figma'
      };
    }

    // 4. Google Docs / Drive / Maps / CodePen
    if (hostname.includes('google.com')) return { safeUrl: trimmed, service: 'Google' };
    if (hostname.includes('codepen.io')) return { safeUrl: trimmed, service: 'CodePen' };

    return { safeUrl: trimmed, service: 'Embebido' };
  } catch {
    return { safeUrl: null, service: '' };
  }
}

export const IframeExtension = Node.create<IframeOptions>({
  name: 'iframe',
  group: 'block',
  atom: true,
  draggable: true,
  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'editorial-iframe-frame w-full h-full border-0 rounded-xl bg-black/5 dark:bg-black/30'
      }
    };
  },

  addAttributes() {
    return {
      src: {
        default: null
      },
      title: {
        default: 'Contenido embebido'
      },
      service: {
        default: 'Embebido'
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="editorial-iframe"] iframe',
        getAttrs: element => {
          const iframe = element as HTMLIFrameElement;
          return {
            src: iframe.getAttribute('src'),
            title: iframe.getAttribute('title') || 'Contenido embebido'
          };
        }
      }
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const src = node.attrs['src'];
    const title = node.attrs['title'] || 'Contenido embebido';
    const service = node.attrs['service'] || 'Embebido';

    return [
      'div',
      {
        'data-type': 'editorial-iframe',
        class: 'editorial-iframe-wrapper my-6 p-2 rounded-2xl bg-[#FAF7F5] dark:bg-[#16151B] border border-[#EAE2DE] dark:border-[#2A2832] shadow-xs'
      },
      [
        'div',
        { class: 'flex items-center justify-between px-2.5 py-1.5 mb-2 text-xs font-semibold text-[#635B5E] dark:text-neutral-400' },
        ['span', { class: 'truncate' }, `Recurso embebido (${service})`],
        [
          'a',
          {
            href: src,
            target: '_blank',
            rel: 'noopener noreferrer',
            class: 'text-[#74566E] dark:text-[#9D7B96] hover:underline flex items-center gap-1 text-[11px]'
          },
          'Abrir enlace ↗'
        ]
      ],
      [
        'div',
        { class: 'relative w-full aspect-video rounded-xl overflow-hidden border border-[#EAE2DE] dark:border-[#2A2832]' },
        [
          'iframe',
          mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
            src,
            title,
            loading: 'lazy',
            sandbox: 'allow-scripts allow-same-origin allow-presentation allow-forms',
            allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
          })
        ]
      ]
    ];
  },

  addCommands() {
    return {
      setIframe:
        ({ src, title }) =>
        ({ chain }) => {
          const { safeUrl, service } = sanitizeEmbedUrl(src);
          if (!safeUrl) return false;

          return chain()
            .insertContent({
              type: this.name,
              attrs: {
                src: safeUrl,
                title: title || `Embebido de ${service}`,
                service
              }
            })
            .run();
        }
    };
  }
});
