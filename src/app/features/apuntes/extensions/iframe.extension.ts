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
  'm.youtube.com',
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

function escapeHtml(text: string): string {
  if (typeof document === 'undefined') return text;
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function sanitizeEmbedUrl(rawUrl: string): { safeUrl: string | null; service: string } {
  try {
    let trimmed = (rawUrl || '').trim();
    if (!trimmed) {
      return { safeUrl: null, service: '' };
    }

    // Prepend https:// si no se incluyó protocolo
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = 'https://' + trimmed;
    }

    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase();
    const isAllowed = TRUSTED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));

    if (!isAllowed) {
      return { safeUrl: null, service: '' };
    }

    // 1. YouTube: match standard watch?v=, shorts/, embed/, youtu.be/
    const ytMatch = trimmed.match(
      /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i
    );
    if (ytMatch && ytMatch[1]) {
      return {
        safeUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`,
        service: 'YouTube'
      };
    }

    // 2. Vimeo: match vimeo.com/ID o player.vimeo.com/video/ID
    const vimeoMatch = trimmed.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/i);
    if (vimeoMatch && vimeoMatch[1]) {
      return {
        safeUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
        service: 'Vimeo'
      };
    }

    // 3. Figma share -> Figma embed
    if (hostname.includes('figma.com')) {
      if (trimmed.includes('/embed?')) {
        return { safeUrl: trimmed, service: 'Figma' };
      }
      return {
        safeUrl: `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(trimmed)}`,
        service: 'Figma'
      };
    }

    // 4. Google Docs / Drive / Maps
    if (hostname.includes('docs.google.com')) {
      const previewUrl = trimmed.replace(/\/edit(\?.*)?$/, '/preview');
      return { safeUrl: previewUrl, service: 'Google Docs' };
    }
    if (hostname.includes('drive.google.com')) {
      const previewUrl = trimmed.replace(/\/view(\?.*)?$/, '/preview');
      return { safeUrl: previewUrl, service: 'Google Drive' };
    }
    if (hostname.includes('maps.google.com') || (hostname.includes('google.com') && parsed.pathname.includes('/maps'))) {
      return { safeUrl: trimmed, service: 'Google Maps' };
    }

    // 5. CodePen
    if (hostname.includes('codepen.io')) {
      const embedUrl = trimmed.replace(/\/pen\//, '/embed/');
      return { safeUrl: embedUrl, service: 'CodePen' };
    }

    return { safeUrl: trimmed, service: 'Embebido' };
  } catch {
    return { safeUrl: null, service: '' };
  }
}

export const IframeExtension = Node.create<IframeOptions>({
  name: 'iframe',
  group: 'block',
  atom: true,
  draggable: false,
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
      },
      {
        tag: 'div[data-type="editorial-iframe"]',
        getAttrs: element => {
          const div = element as HTMLDivElement;
          const iframe = div.querySelector('iframe');
          return {
            src: iframe?.getAttribute('src') || null,
            title: iframe?.getAttribute('title') || 'Contenido embebido'
          };
        }
      },
      {
        tag: 'iframe[src]',
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
        class: 'editorial-iframe-wrapper my-6 p-2 rounded-2xl bg-[#FAF7F5] dark:bg-[#16151B] border border-[#EAE2DE] dark:border-[#2A2832] shadow-xs select-none'
      },
      [
        'div',
        { class: 'flex items-center justify-between px-2.5 py-1.5 mb-2 text-xs font-semibold text-[#635B5E] dark:text-neutral-400 select-none' },
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

  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const container = document.createElement('div');
      container.className =
        'editorial-iframe-wrapper my-6 p-2 rounded-2xl bg-[#FAF7F5] dark:bg-[#16151B] border border-[#EAE2DE] dark:border-[#2A2832] shadow-xs select-none';
      container.contentEditable = 'false';
      container.setAttribute('draggable', 'false');

      const header = document.createElement('div');
      header.className =
        'flex items-center justify-between px-2.5 py-1.5 mb-2 text-xs font-semibold text-[#635B5E] dark:text-neutral-400 select-none';

      const info = document.createElement('div');
      info.className = 'flex items-center gap-2 truncate';

      const service = node.attrs['service'] || 'Embebido';
      const title = node.attrs['title'] || 'Recurso embebido';
      const src = node.attrs['src'] || '';

      const serviceName = document.createElement('span');
      serviceName.className = 'inline-flex items-center gap-1.5 text-xs font-semibold text-[#231F20] dark:text-[#F3EFEA] truncate';
      serviceName.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        <span>${escapeHtml(service)}: ${escapeHtml(title)}</span>
      `;
      info.appendChild(serviceName);

      const actions = document.createElement('div');
      actions.className = 'flex items-center gap-2 flex-shrink-0';

      const openLink = document.createElement('a');
      openLink.href = src;
      openLink.target = '_blank';
      openLink.rel = 'noopener noreferrer';
      openLink.className =
        'text-[#74566E] dark:text-[#9D7B96] hover:underline flex items-center gap-1 text-[11px] font-medium';
      openLink.textContent = 'Abrir enlace ↗';

      actions.appendChild(openLink);
      header.appendChild(info);
      header.appendChild(actions);

      const frameWrapper = document.createElement('div');
      frameWrapper.className =
        'relative w-full aspect-video rounded-xl overflow-hidden border border-[#EAE2DE] dark:border-[#2A2832] bg-black/5 dark:bg-black/30';

      const iframe = document.createElement('iframe');
      iframe.src = src;
      iframe.title = title;
      iframe.loading = 'lazy';
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-forms');
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
      iframe.className = 'w-full h-full border-0';

      frameWrapper.appendChild(iframe);
      container.appendChild(header);
      container.appendChild(frameWrapper);

      return {
        dom: container,
        update: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          if (updatedNode.attrs['src'] !== iframe.src) {
            iframe.src = updatedNode.attrs['src'];
          }
          return true;
        },
        ignoreMutation: () => true,
        stopEvent: () => true
      };
    };
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

export const IframeNodeExtension = IframeExtension.extend({
  name: 'iframeNode'
});
