import { Node, mergeAttributes } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';

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
  draggable: false,
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
          preserveAspectRatio: 'none',
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
      let lines: DrawingLine[] = [...(node.attrs['lines'] || [])];
      let currentColor = '#74566E';
      let currentSize = 3;
      let isErasing = false;
      let isDrawing = false;
      let currentPoints: { x: number; y: number }[] = [];

      const selectThisNode = () => {
        if (typeof props.getPos === 'function') {
          try {
            const pos = props.getPos();
            if (pos !== undefined && editor?.view) {
              const { state } = editor;
              if (!state.selection || state.selection.from !== pos) {
                const tr = state.tr.setSelection(NodeSelection.create(state.doc, pos));
                editor.view.dispatch(tr);
              }
            }
          } catch {}
        }
      };

      const safeUpdateAttributes = (attrs: Record<string, any>) => {
        // Capturar la posición exacta de scroll de todos los ancestros scrollables y de la ventana
        const scrollAncestors: { el: HTMLElement; top: number; left: number }[] = [];
        let curr: HTMLElement | null = container;
        while (curr) {
          if (curr.scrollHeight > curr.clientHeight || curr.scrollWidth > curr.clientWidth) {
            scrollAncestors.push({ el: curr, top: curr.scrollTop, left: curr.scrollLeft });
          }
          curr = curr.parentElement;
        }
        const winTop = typeof window !== 'undefined' ? window.scrollY : 0;
        const winLeft = typeof window !== 'undefined' ? window.scrollX : 0;

        const restoreScroll = () => {
          for (const item of scrollAncestors) {
            if (item.el.scrollTop !== item.top) item.el.scrollTop = item.top;
            if (item.el.scrollLeft !== item.left) item.el.scrollLeft = item.left;
          }
          if (typeof window !== 'undefined' && window.scrollY !== winTop) {
            window.scrollTo(winLeft, winTop);
          }
        };

        if (typeof props.getPos === 'function') {
          const pos = props.getPos();
          if (pos !== undefined && editor?.view) {
            let tr = editor.state.tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              ...attrs
            });
            // Mantener la selección en este nodo para que ProseMirror y el navegador NO salten al final del documento
            try {
              tr = tr.setSelection(NodeSelection.create(tr.doc, pos));
            } catch {}
            tr.setMeta('addToHistory', true);
            editor.view.dispatch(tr);

            restoreScroll();
            requestAnimationFrame(restoreScroll);
            setTimeout(restoreScroll, 25);
            return;
          }
        }

        if (typeof props.updateAttributes === 'function') {
          props.updateAttributes(attrs);
          restoreScroll();
          requestAnimationFrame(restoreScroll);
          setTimeout(restoreScroll, 25);
        }
      };

      const container = document.createElement('div');
      container.className =
        'editorial-drawing-block my-6 p-3 rounded-2xl bg-[#FAF7F5] dark:bg-[#16151B] border border-[#EAE2DE] dark:border-[#2A2832] shadow-xs select-none';
      container.contentEditable = 'false';
      container.setAttribute('draggable', 'false');
      container.onpointerdown = () => {
        selectThisNode();
      };
      container.ondragstart = (e) => {
        e.preventDefault();
        e.stopPropagation();
      };

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
          e.stopPropagation();
          selectThisNode();
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
          e.stopPropagation();
          selectThisNode();
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
        e.stopPropagation();
        selectThisNode();
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
        e.stopPropagation();
        selectThisNode();
        if (lines.length > 0) {
          lines.pop();
          renderPaths();
          safeUpdateAttributes({ lines });
        }
      };

      // Clear Canvas Button
      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'p-1 px-1.5 rounded-md text-[10px] font-semibold border bg-white dark:bg-[#19181E] border-[#EAE2DE] dark:border-[#2A2832] text-[#9B2C2C] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer';
      clearBtn.textContent = 'Limpiar';
      clearBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectThisNode();
        lines = [];
        renderPaths();
        safeUpdateAttributes({ lines });
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
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.setAttribute('class', 'w-full rounded-xl bg-white dark:bg-[#19181E] border border-[#EAE2DE] dark:border-[#2A2832] cursor-crosshair');
      svg.setAttribute('draggable', 'false');
      svg.style.height = '280px';
      svg.style.touchAction = 'none';
      svg.style.userSelect = 'none';
      (svg.style as any).webkitUserSelect = 'none';

      svg.ondragstart = (e) => {
        e.preventDefault();
        e.stopPropagation();
      };
      svg.onmousedown = (e) => {
        e.stopPropagation();
      };

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
        try {
          const ctm = svg.getScreenCTM();
          if (ctm) {
            const pt = svg.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const svgPoint = pt.matrixTransform(ctm.inverse());
            return {
              x: Math.round(svgPoint.x * 10) / 10,
              y: Math.round(svgPoint.y * 10) / 10
            };
          }
        } catch {}

        const rect = svg.getBoundingClientRect();
        const scaleX = 700 / (rect.width || 700);
        const scaleY = 320 / (rect.height || 320);
        return {
          x: Math.round((e.clientX - rect.left) * scaleX * 10) / 10,
          y: Math.round((e.clientY - rect.top) * scaleY * 10) / 10
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
        e.preventDefault();
        e.stopPropagation();
        selectThisNode();
        isDrawing = true;
        try {
          svg.setPointerCapture(e.pointerId);
        } catch {}
        currentPoints = [getPoint(e)];
        const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
        const eraseColor = isDark ? '#19181E' : '#FFFFFF';
        const strokeColor = isErasing ? eraseColor : currentColor;
        const strokeSize = isErasing ? currentSize * 3 : currentSize;

        livePath.setAttribute('stroke', strokeColor);
        livePath.setAttribute('stroke-width', String(strokeSize));
        livePath.setAttribute('d', pointsToSvgPath(currentPoints));
      };

      svg.onpointermove = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        e.stopPropagation();
        currentPoints.push(getPoint(e));
        livePath.setAttribute('d', pointsToSvgPath(currentPoints));
      };

      const finishStroke = (e?: PointerEvent) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
          try {
            svg.releasePointerCapture(e.pointerId);
          } catch {}
        }
        if (!isDrawing) return;
        isDrawing = false;
        if (currentPoints.length > 0) {
          const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
          const eraseColor = isDark ? '#19181E' : '#FFFFFF';
          const strokeColor = isErasing ? eraseColor : currentColor;
          const strokeSize = isErasing ? currentSize * 3 : currentSize;
          const d = pointsToSvgPath(currentPoints);
          lines.push({ color: strokeColor, size: strokeSize, d });
          currentPoints = [];
          livePath.setAttribute('d', '');
          renderPaths();
          safeUpdateAttributes({ lines });
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
        },
        ignoreMutation: () => true,
        stopEvent: () => true
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
