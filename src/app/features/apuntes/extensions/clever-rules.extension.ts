import { Extension, InputRule, markInputRule } from '@tiptap/core';

export const CleverRulesExtension = Extension.create({
  name: 'cleverRules',

  addInputRules() {
    const rules: InputRule[] = [
      // Raya editorial em-dash: "-- " -> "— "
      new InputRule({
        find: /--\s$/,
        handler: ({ state, range }) => {
          state.tr.replaceWith(range.from, range.to, state.schema.text('— '));
        }
      }),

      // Flecha derecha: "-> " -> "→ "
      new InputRule({
        find: /->\s$/,
        handler: ({ state, range }) => {
          state.tr.replaceWith(range.from, range.to, state.schema.text('→ '));
        }
      }),

      // Flecha izquierda: "<- " -> "← "
      new InputRule({
        find: /<-\s$/,
        handler: ({ state, range }) => {
          state.tr.replaceWith(range.from, range.to, state.schema.text('← '));
        }
      }),

      // Desigualdad: "!= " -> "≠ "
      new InputRule({
        find: /!=\s$/,
        handler: ({ state, range }) => {
          state.tr.replaceWith(range.from, range.to, state.schema.text('≠ '));
        }
      }),

      // Menor o igual: "<= " -> "≤ "
      new InputRule({
        find: /<=\s$/,
        handler: ({ state, range }) => {
          state.tr.replaceWith(range.from, range.to, state.schema.text('≤ '));
        }
      }),

      // Mayor o igual: ">= " -> "≥ "
      new InputRule({
        find: />=\s$/,
        handler: ({ state, range }) => {
          state.tr.replaceWith(range.from, range.to, state.schema.text('≥ '));
        }
      }),

      // Fracciones comunes: "1/2 " -> "½ ", "1/4 " -> "¼ ", "3/4 " -> "¾ "
      new InputRule({
        find: /1\/2\s$/,
        handler: ({ state, range }) => {
          state.tr.replaceWith(range.from, range.to, state.schema.text('½ '));
        }
      }),
      new InputRule({
        find: /1\/4\s$/,
        handler: ({ state, range }) => {
          state.tr.replaceWith(range.from, range.to, state.schema.text('¼ '));
        }
      }),
      new InputRule({
        find: /3\/4\s$/,
        handler: ({ state, range }) => {
          state.tr.replaceWith(range.from, range.to, state.schema.text('¾ '));
        }
      }),

      // Símbolos legales / marcas: "(c) " -> "© ", "(r) " -> "® ", "(tm) " -> "™ "
      new InputRule({
        find: /\(c\)\s$/i,
        handler: ({ state, range }) => {
          state.tr.replaceWith(range.from, range.to, state.schema.text('© '));
        }
      }),
      new InputRule({
        find: /\(r\)\s$/i,
        handler: ({ state, range }) => {
          state.tr.replaceWith(range.from, range.to, state.schema.text('® '));
        }
      }),
      new InputRule({
        find: /\(tm\)\s$/i,
        handler: ({ state, range }) => {
          state.tr.replaceWith(range.from, range.to, state.schema.text('™ '));
        }
      })
    ];

    // Markdown shortcut para resaltar con ==texto== -> mark highlight
    if (this.editor.schema.marks['highlight']) {
      rules.push(
        markInputRule({
          find: /(?:^|[^*_])(==(?!\s)(.+?)(?<!\s)==)$/,
          type: this.editor.schema.marks['highlight']
        })
      );
    }

    return rules;
  }
});
