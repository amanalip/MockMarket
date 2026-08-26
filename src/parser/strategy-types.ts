export type TokenType =
  | 'IDENTIFIER'
  | 'NUMBER'
  | 'OPERATOR'
  | 'LOGICAL'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

export type ASTNode =
  | { type: 'BinaryOp'; operator: string; left: ASTNode; right: ASTNode }
  | { type: 'LogicalOp'; operator: 'AND' | 'OR'; left: ASTNode; right: ASTNode }
  | { type: 'UnaryOp'; operator: 'NOT'; expr: ASTNode }
  | { type: 'FunctionCall'; name: string; args: ASTNode[] }
  | { type: 'Identifier'; name: string; param?: number }
  | { type: 'Number'; value: number };

export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  entryRule: string;
  exitRule: string;
  defaultStopLoss?: number;
  defaultTakeProfit?: number;
}
