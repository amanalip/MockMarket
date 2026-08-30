import { Token, TokenType, ASTNode } from './strategy-types';
import { BarRuleContext } from '../engine/backtester/backtester';

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    // Whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Infinity / NaN literals
    const lower8 = input.slice(i, i + 8).toLowerCase();
    const lower9 = input.slice(i, i + 9).toLowerCase();
    const lower3 = input.slice(i, i + 3).toLowerCase();
    if (lower8 === 'infinity') {
      tokens.push({ type: 'NUMBER', value: 'Infinity', pos: i });
      i += 8;
      continue;
    }
    if (lower9 === '-infinity') {
      tokens.push({ type: 'NUMBER', value: '-Infinity', pos: i });
      i += 9;
      continue;
    }
    if (lower3 === 'nan') {
      tokens.push({ type: 'NUMBER', value: 'NaN', pos: i });
      i += 3;
      continue;
    }
    // Numbers (including negative)
    if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(input[i + 1] || '')) || (char === '-' && (/[0-9]/.test(input[i + 1] || '') || (input[i + 1] === '.' && /[0-9]/.test(input[i + 2] || ''))))) {
      let numStr = '';
      const start = i;
      let dotCount = 0;
      if (input[i] === '-') {
        numStr += '-';
        i++;
      }
      while (i < input.length && (/[0-9]/.test(input[i]) || (input[i] === '.' && dotCount === 0))) {
        if (input[i] === '.') dotCount++;
        numStr += input[i];
        i++;
      }
      // Validate number not malformed like trailing dot
      if (numStr.endsWith('.') || (numStr.match(/\./g) || []).length > 1) {
        throw new Error(`Invalid number '${numStr}' at index ${start}`);
      }
      // Detect malformed 1.2.3 (second dot without separator)
      if (i < input.length && input[i] === '.' && /[0-9]/.test(input[i + 1] || '')) {
        throw new Error(`Invalid number '${numStr}.' at index ${start}`);
      }
      tokens.push({ type: 'NUMBER', value: numStr, pos: start });
      continue;
    }

    // Comparison Operators (>=, <=, ==, !=, >, <)
    if (char === '>' || char === '<' || char === '=' || char === '!') {
      let op = char;
      const start = i;
      if (input[i + 1] === '=') {
        op += '=';
        i += 2;
      } else {
        i++;
      }
      tokens.push({ type: 'OPERATOR', value: op, pos: start });
      continue;
    }

    // Parentheses and Punctuation
    if (char === '(') {
      tokens.push({ type: 'LPAREN', value: '(', pos: i });
      i++;
      continue;
    }
    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: ')', pos: i });
      i++;
      continue;
    }
    if (char === ',') {
      tokens.push({ type: 'COMMA', value: ',', pos: i });
      i++;
      continue;
    }

    // Identifiers & Logical Operators
    if (/[a-zA-Z_]/.test(char)) {
      let ident = '';
      const start = i;
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
        ident += input[i];
        i++;
      }
      const upper = ident.toUpperCase();
      if (upper === 'AND' || upper === 'OR') {
        tokens.push({ type: 'LOGICAL', value: upper, pos: start });
      } else if (upper === 'NOT') {
        tokens.push({ type: 'LOGICAL', value: 'NOT', pos: start });
      } else {
        tokens.push({ type: 'IDENTIFIER', value: upper, pos: start });
      }
      continue;
    }

    throw new Error(`Unexpected character '${char}' at index ${i}`);
  }

  tokens.push({ type: 'EOF', value: '', pos: i });
  return tokens;
}

class Parser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private match(...types: TokenType[]): boolean {
    const p = this.peek();
    return types.includes(p.type);
  }

  private consume(type: TokenType, errMsg: string): Token {
    if (this.peek().type === type) {
      return this.tokens[this.current++];
    }
    throw new Error(`${errMsg} at position ${this.peek().pos}. Found '${this.peek().value}'`);
  }

  parse(): ASTNode {
    const node = this.parseOr();
    if (this.peek().type !== 'EOF') {
      throw new Error(`Unexpected token '${this.peek().value}' at position ${this.peek().pos}`);
    }
    return node;
  }

  private parseOr(): ASTNode {
    let left = this.parseAnd();
    while (this.peek().type === 'LOGICAL' && this.peek().value === 'OR') {
      this.current++;
      const right = this.parseAnd();
      left = { type: 'LogicalOp', operator: 'OR', left, right };
    }
    return left;
  }

  private parseAnd(): ASTNode {
    let left = this.parseNot();
    while (this.peek().type === 'LOGICAL' && this.peek().value === 'AND') {
      this.current++;
      const right = this.parseNot();
      left = { type: 'LogicalOp', operator: 'AND', left, right };
    }
    return left;
  }

  private parseNot(): ASTNode {
    if (this.peek().type === 'LOGICAL' && this.peek().value === 'NOT') {
      this.current++;
      const expr = this.parseNot();
      return { type: 'UnaryOp', operator: 'NOT', expr };
    }
    return this.parseComparison();
  }

  private parseComparison(): ASTNode {
    const left = this.parsePrimary();

    if (this.match('OPERATOR')) {
      const op = this.tokens[this.current++].value;
      const right = this.parsePrimary();
      return { type: 'BinaryOp', operator: op, left, right };
    }

    return left;
  }

  private parsePrimary(): ASTNode {
    const token = this.peek();

    if (token.type === 'NUMBER') {
      this.current++;
      return { type: 'Number', value: parseFloat(token.value) };
    }

    if (token.type === 'LPAREN') {
      this.current++;
      const expr = this.parseOr();
      this.consume('RPAREN', "Expected ')'");
      return expr;
    }

    if (token.type === 'IDENTIFIER') {
      const name = token.value;
      this.current++;

      // Check if function or parametrized indicator e.g. SMA(50), crosses_above(A, B)
      if (this.peek().type === 'LPAREN') {
        this.current++;
        const args: ASTNode[] = [];

        if (this.peek().type !== 'RPAREN') {
          args.push(this.parseOr());
          while (this.peek().type === 'COMMA') {
            this.current++;
            args.push(this.parseOr());
          }
        }
        this.consume('RPAREN', "Expected ')' after arguments");

        if (name === 'CROSSES_ABOVE' || name === 'CROSSES_BELOW') {
          return { type: 'FunctionCall', name, args };
        }

        // Parametrized indicator e.g. SMA(50)
        const param = args.length > 0 && args[0].type === 'Number' ? args[0].value : undefined;
        return { type: 'Identifier', name, param };
      }

      return { type: 'Identifier', name };
    }

    throw new Error(`Unexpected token '${token.value}' at position ${token.pos}`);
  }
}

export function parseRuleToAST(ruleStr: string): ASTNode {
  const tokens = tokenize(ruleStr);
  const parser = new Parser(tokens);
  return parser.parse();
}

function resolveValue(node: ASTNode, ctx: BarRuleContext, offset = 0): number {
  const targetIndex = Math.max(0, ctx.index + offset);

  if (node.type === 'Number') {
    return node.value;
  }

  if (node.type === 'Identifier') {
    const name = node.name;
    const param = node.param;

    if (name === 'PRICE' || name === 'CLOSE') {
      return ctx.candles[targetIndex]?.close ?? 0;
    }
    if (name === 'OPEN') {
      return ctx.candles[targetIndex]?.open ?? 0;
    }
    if (name === 'HIGH') {
      return ctx.candles[targetIndex]?.high ?? 0;
    }
    if (name === 'LOW') {
      return ctx.candles[targetIndex]?.low ?? 0;
    }
    if (name === 'VOLUME') {
      return ctx.candles[targetIndex]?.volume ?? 0;
    }

    if (name === 'SMA') {
      if (param === 50) return ctx.indicators.sma50[targetIndex] ?? 0;
      if (param === 200) return ctx.indicators.sma200[targetIndex] ?? 0;
      // Unknown period falls back to sma20 (instead of silent 0)
      return ctx.indicators.sma20[targetIndex] ?? 0;
    }

    if (name === 'EMA') {
      if (param === 26) return ctx.indicators.ema26[targetIndex] ?? 0;
      // Unknown period falls back to ema12
      return ctx.indicators.ema12[targetIndex] ?? 0;
    }

    if (name === 'RSI') {
      return ctx.indicators.rsi14[targetIndex] ?? 50;
    }

    if (name === 'MACD') {
      return ctx.indicators.macd[targetIndex]?.macd ?? 0;
    }
    if (name === 'MACD_SIGNAL') {
      return ctx.indicators.macd[targetIndex]?.signal ?? 0;
    }

    if (name === 'BB_UPPER') {
      return ctx.indicators.bb[targetIndex]?.upper ?? 0;
    }
    if (name === 'BB_MIDDLE') {
      return ctx.indicators.bb[targetIndex]?.middle ?? 0;
    }
    if (name === 'BB_LOWER') {
      return ctx.indicators.bb[targetIndex]?.lower ?? 0;
    }

    if (name === 'VOLUME_MA') {
      return ctx.indicators.volumeMA20[targetIndex] ?? 0;
    }

    return 0;
  }

  return 0;
}

function evaluateAST(node: ASTNode, ctx: BarRuleContext): boolean {
  if (node.type === 'LogicalOp') {
    const leftRes = evaluateAST(node.left, ctx);
    if (node.operator === 'AND') {
      return leftRes && evaluateAST(node.right, ctx);
    } else {
      return leftRes || evaluateAST(node.right, ctx);
    }
  }

  if (node.type === 'UnaryOp') {
    return !evaluateAST(node.expr, ctx);
  }

  if (node.type === 'BinaryOp') {
    const leftVal = resolveValue(node.left, ctx);
    const rightVal = resolveValue(node.right, ctx);
    // Handle NaN explicitly: NaN == NaN should be false for both, but NaN != NaN should be true
    const leftIsNaN = Number.isNaN(leftVal);
    const rightIsNaN = Number.isNaN(rightVal);
    if (leftIsNaN || rightIsNaN) {
      if (node.operator === '==' || node.operator === '=') return false;
      if (node.operator === '!=') return true;
      return false;
    }

    switch (node.operator) {
      case '>': return leftVal > rightVal;
      case '<': return leftVal < rightVal;
      case '>=': return leftVal >= rightVal;
      case '<=': return leftVal <= rightVal;
      case '==':
      case '=': {
        const diff = Math.abs(leftVal - rightVal);
        const maxAbs = Math.max(Math.abs(leftVal), Math.abs(rightVal), 1);
        return diff < 0.001 || diff / maxAbs < 0.00001;
      }
      case '!=': {
        const diff = Math.abs(leftVal - rightVal);
        const maxAbs = Math.max(Math.abs(leftVal), Math.abs(rightVal), 1);
        return diff >= 0.001 && diff / maxAbs >= 0.00001;
      }
      default: return false;
    }
  }

  if (node.type === 'FunctionCall') {
    if (node.name === 'CROSSES_ABOVE' && node.args.length === 2) {
      if (ctx.index < 1) return false;
      const prevA = resolveValue(node.args[0], ctx, -1);
      const prevB = resolveValue(node.args[1], ctx, -1);
      const currA = resolveValue(node.args[0], ctx, 0);
      const currB = resolveValue(node.args[1], ctx, 0);
      return prevA <= prevB && currA > currB;
    }

    if (node.name === 'CROSSES_BELOW' && node.args.length === 2) {
      if (ctx.index < 1) return false;
      const prevA = resolveValue(node.args[0], ctx, -1);
      const prevB = resolveValue(node.args[1], ctx, -1);
      const currA = resolveValue(node.args[0], ctx, 0);
      const currB = resolveValue(node.args[1], ctx, 0);
      return prevA >= prevB && currA < currB;
    }
  }

  return false;
}

export function compileRule(ruleStr: string): (ctx: BarRuleContext) => boolean {
  const clean = ruleStr.trim();
  if (!clean) return () => false;
  const ast = parseRuleToAST(clean);
  return (ctx: BarRuleContext) => evaluateAST(ast, ctx);
}

export function validateRule(ruleStr: string): { valid: boolean; error?: string } {
  try {
    const clean = ruleStr.trim();
    if (!clean) return { valid: false, error: 'Rule cannot be empty' };
    parseRuleToAST(clean);
    return { valid: true };
  } catch (err: unknown) {
    return { valid: false, error: err instanceof Error ? err.message : 'Invalid rule syntax' };
  }
}
