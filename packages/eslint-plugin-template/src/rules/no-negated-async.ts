import {
  createESLintRule,
  getTemplateParserServices,
} from '../utils/create-eslint-rule';

type Options = [];
export type MessageIds = 'noNegatedAsync' | 'noLooseEquality';
export const RULE_NAME = 'no-negated-async';

export default createESLintRule<Options, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'suggestion',
    docs: {
      description: `Ensures that strict equality is used when evaluating negations on async pipe output`,
      category: 'Best Practices',
      recommended: false,
    },
    fixable: 'code',
    schema: [],
    messages: {
      noNegatedAsync:
        'Async pipes should not be negated. Use (observable | async) === (false | null | undefined) to check its value instead',
      noLooseEquality:
        'Async pipes must use strict equality `===` when comparing with `false`',
    },
  },
  defaultOptions: [],
  create(context) {
    const parserServices = getTemplateParserServices(context);
    const sourceCode = context.getSourceCode();

    return parserServices.defineTemplateBodyVisitor({
      ['BindingPipe[name=async]'](node: any) {
        if (node.parent.type === 'PrefixNot') {
          let start = sourceCode.getLocFromIndex(
            node.span.start - '!'.length - '('.length,
          );
          let end = sourceCode.getLocFromIndex(node.span.end + ')'.length);

          if (node.parent.parent.parent.type === 'BoundAttribute') {
            const loc = parserServices.convertNodeSourceSpanToLoc(
              node.parent.parent.parent.sourceSpan,
            );
            start = loc.start;
            start.column = start.column + `*ngIf="`.length;
            end = loc.end;
            end.column = end.column - `"`.length;
          }

          context.report({
            messageId: 'noNegatedAsync',
            loc: {
              start,
              end,
            },
          });
          return;
        }

        if (node.parent.type === 'Binary') {
          if (
            !(node.parent.right.type === 'LiteralPrimitive') ||
            node.parent.right.value !== false ||
            node.parent.operation !== '=='
          ) {
            return;
          }

          let start = sourceCode.getLocFromIndex(
            node.parent.span.start - '('.length,
          );
          let end = sourceCode.getLocFromIndex(
            node.parent.span.end - ')'.length,
          );

          if (node.parent.parent.parent.parent.parent.type === 'Element') {
            start = sourceCode.getLocFromIndex(
              node.parent.parent.parent.parent.sourceSpan.start.offset +
                node.parent.parent.span.start +
                '{{'.length +
                '('.length,
            );

            end = sourceCode.getLocFromIndex(
              node.parent.parent.parent.parent.sourceSpan.start.offset +
                node.span.end +
                ')'.length,
            );
          }

          context.report({
            messageId: 'noLooseEquality',
            loc: {
              start,
              end,
            },
          });
          return;
        }
      },
    });
  },
});
