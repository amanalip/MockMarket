import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDataDir = path.resolve(__dirname, '../public/data');
const tickersFilePath = path.join(publicDataDir, 'tickers.json');

function parseLiteral(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isPrefixUnaryExpression(node) && (node.operator === ts.SyntaxKind.MinusToken || node.operator === ts.SyntaxKind.PlusToken)) {
    const value = parseLiteral(node.operand);
    if (typeof value !== 'number') throw new Error('Unary operators are only allowed on numeric literals');
    return node.operator === ts.SyntaxKind.MinusToken ? -value : value;
  }
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(parseLiteral);
  if (ts.isObjectLiteralExpression(node)) {
    const result = {};
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property) || property.name === undefined || ts.isComputedPropertyName(property.name)) {
        throw new Error('CORE_TICKERS may contain only plain property assignments');
      }
      const key = ts.isIdentifier(property.name) || ts.isStringLiteral(property.name) || ts.isNumericLiteral(property.name)
        ? property.name.text
        : undefined;
      if (key === undefined) throw new Error('CORE_TICKERS contains an unsupported property name');
      result[key] = parseLiteral(property.initializer);
    }
    return result;
  }
  if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)) return parseLiteral(node.expression);
  throw new Error(`CORE_TICKERS contains non-literal syntax: ${ts.SyntaxKind[node.kind]}`);
}

export function parseCoreTickers(sourceText, sourceName = 'tickers.ts') {
  const source = ts.createSourceFile(sourceName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  if (source.parseDiagnostics.length > 0) {
    throw new Error(`Unable to parse ${sourceName}: ${source.parseDiagnostics[0].messageText}`);
  }
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === 'CORE_TICKERS' && declaration.initializer) {
        const parsed = parseLiteral(declaration.initializer);
        if (!Array.isArray(parsed)) throw new Error('CORE_TICKERS must be an array literal');
        return parsed;
      }
    }
  }
  throw new Error(`CORE_TICKERS was not found in ${sourceName}`);
}

export function exportTickers() {
  const tickersTsPath = path.resolve(__dirname, '../src/model/tickers.ts');
  const parsed = parseCoreTickers(fs.readFileSync(tickersTsPath, 'utf8'), tickersTsPath);
  fs.writeFileSync(tickersFilePath, `${JSON.stringify(parsed, null, 2)}\n`);
  console.log(`Saved ${parsed.length} tickers to ${tickersFilePath}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    exportTickers();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
