import { Node, mergeAttributes } from '@tiptap/core';

export interface DrawingLine {
  color: string;
  size: number;
  d: string;
}

export interface DrawingOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    drawing: {
      insertDrawing: () => ReturnType;
    };
  }
}

export const DrawingExtension = Node.create<DrawingOptions>({
  name: 'drawing',
  group: 'block',
  atom: true,
  draggable: true,
  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'editorial-drawing-block my-6 p-3 rounded-2xl bg-[#FAF7F5] dark:bg-[#16151B] border border-[#EAE2DE] dark:border-[#2A2832] shadow-xs select-none'
      }
    };
  },

  addAttributes() {
    return {
      lines: {
        default: [],
        parseHTML: element => {
          const raw = element.getAttribute('data-lines');
          try {
            return raw ? JSON.parse(raw) : [];
          } catch {
            return [];
          }
        },
        renderHTML: attributes => ({
          'data-lines': JSON.stringify(attributes['lines'] || [])
        })
      }
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="editorial-drawing"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const lines: DrawingLine[] = node.attrs['lines'] || [];
    const svgPaths = lines
      .map(
        l =>
          `<path d="${l.d}" stroke="${l.color}" stroke-width="${l.size}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`
      )
      .join('');

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'editorial-drawing'
      }),
      [
        'svg',
        {
          viewBox: '0 0 700 320',
          class: 'w-full h-auto rounded-xl bg-white dark:bg-[#19181E] border border-[#EAE2DE] dark:border-[#2A2832]',
          style: 'max-height: 340px;'
        },
        // In static render
        svgPaths
      ]
    ];
  },

  addNodeView() {
    return (props: any) => {
      const { node, editor } = props;
      const updateAttributes = props.updateAttributes || ((attrs: any) => editor.commands.updateAttributes('drawing', attrs));
      let lines: DrawingLine[] = [...(node.attrs['lines'] || [])];
      let currentColor = '#74566E';
      let currentSize = 3;
      let isErasing = false;
      let isDrawing = false;
      let currentPoints: { x: number; y: number }[] = [];

      const container = document.createElement('div');
      container.className =
        'editorial-drawing-block my-6 p-3 rounded-2xl bg-[#FAF7F5] dark:bg-[#16151B] border border-[#EAE2DE] dark:border-[#2A2832] shadow-xs select-none';

      // Header Toolbar
      const toolbar = document.createElement('div');
      toolbar.className = 'flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#EAE2DE] dark:border-[#2A2832] flex-wrap';

      // Title & Badge
      const titleWrapper = document.createElement('div');
      titleWrapper.className = 'flex items-center gap-2';
      titleWrapper.innerHTML = `
        <span class="text-xs font-bold text-[#231F20] dark:text-[#F3EFEA] flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 5-2.4 2.4"/><path d="m16 8 2 2"/><path d="m14 10-6.6 6.6a2 2 0 0 0-.5 1l-.9 3.5 3.5-.9a2 2 0 0 0 1-.5l6.6-6.6"/></svg>
          Dibujo libre
        </span>
        <span class="text-[10px] text-[#635B5E] dark:text-neutral-400 font-mono">Vector SVG</span>
      `;

      // Tools Row
      const tools = document.createElement('div');
      tools.className = 'flex items-center gap-1.5 flex-wrap';

      // Color Swatches
      const colors = [
        { label: 'Ciruela', value: '#74566E' },
        { label: 'Tinta', value: '#231F20' },
        { label: 'Océano', value: '#265B8A' },
        { label: 'Terracota', value: '#C97D60' },
        { label: 'Esmeralda', value: '#246A49' }
      ];

      const colorContainer = document.createElement('div');
      colorContainer.className = 'flex items-center gap-1 pr-1 border-r border-[#EAE2DE] dark:border-[#2A2832]';

      colors.forEach(c => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.title = c.label;
        btn.className = `w-5 h-5 rounded-full border border-black/10 transition-transform cursor-pointer ${currentColor === c.value ? 'ring-2 ring-offset-1 ring-[#74566E]' : 'hover:scale-110'}`;
        btn.style.backgroundColor = c.value;
        btn.onclick = (e) => {
          e.preventDefault();
          isErasing = false;
          currentColor = c.value;
          updateActiveTools();
        };
        colorContainer.appendChild(btn);
      });

      // Sizes: 2px, 4px, 8px
      const sizeContainer = document.createElement('div');
      sizeContainer.className = 'flex items-center gap-1 pr-1 border-r border-[#EAE2DE] dark:border-[#2A2832]';

      const sizes = [
        { label: 'Fino', val: 2 },
        { label: 'Medio', val: 4 },
        { label: 'Grueso', val: 8 }
      ];

      sizes.forEach(s => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.title = `Grosor: ${s.label}`;
        btn.className = `px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${currentSize === s.val ? 'bg-[#EFEAF6] text-[#74566E] border-[#74566E]/40' : 'bg-white dark:bg-[#19181E] text-[#635B5E] border-[#EAE2DE] dark:border-[#2A2832]'}`;
        btn.textContent = `${s.val}px`;
        btn.onclick = (e) => {
          e.preventDefault();
          currentSize = s.val;
          updateActiveTools();
        };
        sizeContainer.appendChild(btn);
      });

      // Eraser Button
      const eraserBtn = document.createElement('button');
      eraserBtn.type = 'button';
      eraserBtn.className = 'p-1 rounded-md text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1 bg-white dark:bg-[#19181E] border-[#EAE2DE] dark:border-[#2A2832] text-[#635B5E]';
      eraserBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>
        <span class="text-[10px]">Borrar</span>
      `;
      eraserBtn.onclick = (e) => {
        e.preventDefault();
        isErasing = !isErasing;
        updateActiveTools();
      };

      // Undo Stroke Button
      const undoBtn = document.createElement('button');
      undoBtn.type = 'button';
      undoBtn.className = 'p-1 px-1.5 rounded-md text-[10px] font-semibold border bg-white dark:bg-[#19181E] border-[#EAE2DE] dark:border-[#2A2832] text-[#635B5E] hover:text-[#231F20] transition-colors cursor-pointer';
      undoBtn.textContent = 'Deshacer';
      undoBtn.onclick = (e) => {
        e.preventDefault();
        if (lines.length > 0) {
          lines.pop();
          renderPaths();
          updateAttributes({ lines });
        }
      };

      // Clear Canvas Button
      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'p-1 px-1.5 rounded-md text-[10px] font-semibold border bg-white dark:bg-[#19181E] border-[#EAE2DE] dark:border-[#2A2832] text-[#9B2C2C] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer';
      clearBtn.textContent = 'Limpiar';
      clearBtn.onclick = (e) => {
        e.preventDefault();
        lines = [];
        renderPaths();
        updateAttributes({ lines });
      };

      function updateActiveTools() {
        if (isErasing) {
          eraserBtn.className = 'p-1 rounded-md text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1 bg-amber-100 dark:bg-amber-950/40 border-amber-300 text-amber-800 dark:text-amber-300';
        } else {
          eraserBtn.className = 'p-1 rounded-md text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1 bg-white dark:bg-[#19181E] border-[#EAE2DE] dark:border-[#2A2832] text-[#635B5E]';
        }
      }

      tools.appendChild(colorContainer);
      tools.appendChild(sizeContainer);
      tools.appendChild(eraserBtn);
      tools.appendChild(undoBtn);
      tools.appendChild(clearBtn);

      toolbar.appendChild(titleWrapper);
      toolbar.appendChild(tools);

      // SVG Canvas
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 700 320');
      svg.setAttribute('class', 'w-full rounded-xl bg-white dark:bg-[#19181E] border border-[#EAE2DE] dark:border-[#2A2832] cursor-crosshair touch-none');
      svg.style.height = '280px';

      const pathsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      svg.appendChild(pathsGroup);

      const livePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      livePath.setAttribute('fill', 'none');
      livePath.setAttribute('stroke-linecap', 'round');
      livePath.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(livePath);

      function renderPaths() {
        pathsGroup.innerHTML = '';
        lines.forEach(line => {
          const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          p.setAttribute('d', line.d);
          p.setAttribute('stroke', line.color);
          p.setAttribute('stroke-width', String(line.size));
          p.setAttribute('fill', 'none');
          p.setAttribute('stroke-linecap', 'round');
          p.setAttribute('stroke-linejoin', 'round');
          pathsGroup.appendChild(p);
        });
      }

      function getPoint(e: PointerEvent): { x: number; y: number } {
        const rect = svg.getBoundingClientRect();
        const scaleX = 700 / rect.width;
        const scaleY = 320 / rect.height;
        return {
          x: Math.round((e.clientX - rect.left) * scaleX),
          y: Math.round((e.clientY - rect.top) * scaleY)
        };
      }

      function pointsToSvgPath(pts: { x: number; y: number }[]): string {
        if (pts.length === 0) return '';
        if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y} L ${pts[0].x + 0.1} ${pts[0].y + 0.1}`;
        let d = `M ${pts[0].x} ${pts[0].y}`;
        for (let i = 1; i < pts.length; i++) {
          d += ` L ${pts[i].x} ${pts[i].y}`;
        }
        return d;
      }

      svg.onpointerdown = (e) => {
        if (!editor.isEditable) return;
        isDrawing = true;
        svg.setPointerCapture(e.pointerId);
        currentPoints = [getPoint(e)];
        const strokeColor = isErasing ? '#FFFFFF' : currentColor;
        const strokeSize = isErasing ? currentSize * 3 : currentSize;

        livePath.setAttribute('stroke', strokeColor);
        livePath.setAttribute('stroke-width', String(strokeSize));
        livePath.setAttribute('d', pointsToSvgPath(currentPoints));
      };

      svg.onpointermove = (e) => {
        if (!isDrawing) return;
        currentPoints.push(getPoint(e));
        livePath.setAttribute('d', pointsToSvgPath(currentPoints));
      };

      const finishStroke = () => {
        if (!isDrawing) return;
        isDrawing = false;
        if (currentPoints.length > 0) {
          const strokeColor = isErasing ? '#FFFFFF' : currentColor;
          const strokeSize = isErasing ? currentSize * 3 : currentSize;
          const d = pointsToSvgPath(currentPoints);
          lines.push({ color: strokeColor, size: strokeSize, d });
          currentPoints = [];
          livePath.setAttribute('d', '');
          renderPaths();
          updateAttributes({ lines });
        }
      };

      svg.onpointerup = finishStroke;
      svg.onpointercancel = finishStroke;

      renderPaths();

      container.appendChild(toolbar);
      container.appendChild(svg);

      return {
        dom: container,
        update: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          lines = [...(updatedNode.attrs['lines'] || [])];
          renderPaths();
          return true;
        }
      };
    };
  },

  addCommands() {
    return {
      insertDrawing:
        () =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: { lines: [] }
            })
            .run();
        }
    };
  }
});
