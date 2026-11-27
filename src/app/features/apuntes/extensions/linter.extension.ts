import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface LinterIssue {
  id: string;
  type: 'warning' | 'info';
  message: string;
  from: number;
  to: number;
}

export interface LinterOptions {
  onIssuesUpdated?: (issues: LinterIssue[]) => void;
}

export const LinterPluginKey = new PluginKey('editorialLinter');

export const LinterExtension = Extension.create<LinterOptions>({
  name: 'editorialLinter',

  addOptions() {
    return {
      onIssuesUpdated: () => {}
    };
  },

  addProseMirrorPlugins() {
    const onIssuesUpdated = this.options.onIssuesUpdated;

    return [
      new Plugin({
        key: LinterPluginKey,
        state: {
          init(_, { doc }) {
            return scanDocument(doc);
          },
          apply(tr, oldIssues, _, newState) {
            if (!tr.docChanged) return oldIssues;
            const issues = scanDocument(newState.doc);
            if (onIssuesUpdated) {
              onIssuesUpdated(issues);
            }
            return issues;
          }
        }
      })
    ];
  }
});

function scanDocument(doc: any): LinterIssue[] {
  const issues: LinterIssue[] = [];
  let idCounter = 1;

  doc.descendants((node: any, pos: number) => {
    // 1. Encabezados vacíos
    if (node.type.name === 'heading') {
      const text = node.textContent?.trim();
      if (!text) {
        issues.push({
          id: `empty-heading-${idCounter++}`,
          type: 'warning',
          message: `Encabezado H${node.attrs.level} vacío. Se recomienda completarlo o eliminarlo.`,
          from: pos,
          to: pos + node.nodeSize
        });
      }
    }

    // 2. Enlaces vacíos o rotos
    if (node.marks && node.marks.length > 0) {
      node.marks.forEach((mark: any) => {
        if (mark.type.name === 'link') {
          const href = mark.attrs.href?.trim() || '';
          if (!href || href === '#' || href === 'http://') {
            issues.push({
              id: `broken-link-${idCounter++}`,
              type: 'warning',
              message: 'Enlace sin dirección URL de destino válida.',
              from: pos,
              to: pos + node.nodeSize
            });
          }
        }
      });
    }

    // 3. Párrafos excesivamente densos (> 900 caracteres sin saltos)
    if (node.type.name === 'paragraph') {
      const text = node.textContent || '';
      if (text.length > 900) {
        issues.push({
          id: `long-paragraph-${idCounter++}`,
          type: 'info',
          message: 'Párrafo extenso (> 900 caracteres). Se sugiere dividirlo para mejorar la lectura.',
          from: pos,
          to: pos + node.nodeSize
        });
      }
    }
  });

  return issues;
}
