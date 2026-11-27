import { Node, mergeAttributes } from '@tiptap/core';

export interface EmbeddedTaskOptions {
  HTMLAttributes: Record<string, any>;
  onNavigateToTask?: (taskId: string) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    embeddedTask: {
      insertEmbeddedTask: (options: {
        taskId: string;
        issueKey: string;
        title: string;
        status?: string;
        priority?: string;
      }) => ReturnType;
    };
  }
}

export const EmbeddedTaskExtension = Node.create<EmbeddedTaskOptions>({
  name: 'embeddedTask',
  group: 'block',
  atom: true,
  draggable: true,
  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'embedded-task-block my-4 p-3 rounded-2xl bg-white dark:bg-[#19181E] border border-[#EAE2DE] dark:border-[#2A2832] shadow-xs select-none'
      }
    };
  },

  addAttributes() {
    return {
      taskId: { default: '' },
      issueKey: { default: 'TASK' },
      title: { default: 'Tarea vinculada' },
      status: { default: 'todo' },
      priority: { default: 'Media' }
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="embedded-task"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'embedded-task',
        'data-task-id': node.attrs['taskId'],
        'data-issue-key': node.attrs['issueKey'],
        'data-title': node.attrs['title'],
        'data-status': node.attrs['status'],
        'data-priority': node.attrs['priority']
      }),
      [
        'div',
        { class: 'flex items-center justify-between gap-3' },
        [
          'div',
          { class: 'flex items-center gap-2 min-w-0' },
          [
            'span',
            { class: 'font-mono text-xs font-bold text-[#74566E] dark:text-[#9D7B96] bg-[#EFEAF6] dark:bg-[#74566E]/20 px-2 py-0.5 rounded-md' },
            node.attrs['issueKey']
          ],
          [
            'span',
            { class: 'text-xs font-bold text-[#231F20] dark:text-[#F3EFEA] truncate' },
            node.attrs['title']
          ]
        ],
        [
          'span',
          { class: 'text-[10px] font-semibold text-[#635B5E] dark:text-neutral-400 font-mono' },
          node.attrs['priority']
        ]
      ]
    ];
  },

  addNodeView() {
    return ({ node, editor }) => {
      const container = document.createElement('div');
      container.className =
        'embedded-task-block my-4 p-3.5 rounded-2xl bg-white dark:bg-[#19181E] border border-[#EAE2DE] dark:border-[#2A2832] shadow-xs select-none hover:border-[#74566E]/40 dark:hover:border-[#9D7B96]/40 transition-all flex items-center justify-between gap-3 group';

      const left = document.createElement('div');
      left.className = 'flex items-center gap-2.5 min-w-0';

      const keySpan = document.createElement('span');
      keySpan.className =
        'font-mono text-xs font-bold text-[#74566E] dark:text-[#9D7B96] bg-[#EFEAF6] dark:bg-[#74566E]/20 px-2 py-0.5 rounded-md shrink-0';
      keySpan.textContent = node.attrs['issueKey'] || 'TASK';

      const titleSpan = document.createElement('span');
      titleSpan.className = 'text-xs font-bold text-[#231F20] dark:text-[#F3EFEA] truncate';
      titleSpan.textContent = node.attrs['title'] || 'Tarea vinculada';

      left.appendChild(keySpan);
      left.appendChild(titleSpan);

      const right = document.createElement('div');
      right.className = 'flex items-center gap-2 shrink-0';

      const priorityBadge = document.createElement('span');
      priorityBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded bg-[#FAF7F5] dark:bg-[#201E27] text-[#635B5E] dark:text-neutral-400';
      priorityBadge.textContent = node.attrs['priority'] || 'Media';

      const viewBtn = document.createElement('button');
      viewBtn.type = 'button';
      viewBtn.className =
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF7F5] dark:bg-[#201E27] hover:bg-[#EFEAF6] dark:hover:bg-[#74566E]/30 text-[#74566E] dark:text-[#9D7B96] text-[11px] font-semibold transition-colors cursor-pointer';
      viewBtn.innerHTML = `<span>Ver tarea</span><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>`;

      viewBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.options.onNavigateToTask) {
          this.options.onNavigateToTask(node.attrs['taskId']);
        }
      };

      right.appendChild(priorityBadge);
      right.appendChild(viewBtn);

      container.appendChild(left);
      container.appendChild(right);

      return {
        dom: container,
        update: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          keySpan.textContent = updatedNode.attrs['issueKey'] || 'TASK';
          titleSpan.textContent = updatedNode.attrs['title'] || 'Tarea vinculada';
          priorityBadge.textContent = updatedNode.attrs['priority'] || 'Media';
          return true;
        }
      };
    };
  },

  addCommands() {
    return {
      insertEmbeddedTask:
        (options) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: options
            })
            .run();
        }
    };
  }
});
