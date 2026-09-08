import type ExcelJS from "exceljs";

import { readCellText } from "./quote-sheet-fill";

const CELL_REF = /\$?([A-Z]+)\$?(\d+)/i;

export function formulaOf(cell: ExcelJS.Cell): string | null {
  const value = cell.value;
  if (value && typeof value === "object" && "formula" in value && typeof value.formula === "string") {
    return value.formula;
  }
  if (typeof value === "string" && value.startsWith("=")) {
    return value.slice(1);
  }
  return null;
}

export function colLettersToNumber(letters: string) {
  let n = 0;
  for (const ch of letters.toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n;
}

export function evaluateSheetFormulas(sheet: ExcelJS.Worksheet) {
  const cache = new Map<string, number | string | Date | null>();
  const visiting = new Set<string>();

  function keyOf(row: number, col: number) {
    return `${row}:${col}`;
  }

  function numeric(value: number | string | Date | null): number {
    if (value == null || value === "") {
      return 0;
    }
    if (value instanceof Date) {
      return value.getTime();
    }
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : 0;
    }
    const n = Number(String(value).replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  }

  function rawValue(row: number, col: number): number | string | Date | null {
    const cell = sheet.getCell(row, col);
    const formula = formulaOf(cell);
    if (formula) {
      return evaluateFormula(formula, row, col);
    }
    const value = cell.value;
    if (value == null || value === "") {
      return null;
    }
    if (typeof value === "number") {
      return value;
    }
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === "string") {
      const n = Number(value.replace(/,/g, ""));
      return Number.isFinite(n) && value.trim() !== "" ? n : value;
    }
    if (typeof value === "object" && "result" in value && value.result != null) {
      const result = value.result;
      if (typeof result === "number" || typeof result === "string" || result instanceof Date) {
        return result;
      }
    }
    const text = readCellText(cell);
    if (!text) {
      return null;
    }
    const n = Number(text.replace(/,/g, ""));
    return Number.isFinite(n) ? n : text;
  }

  function evaluateFormula(formula: string, row: number, col: number): number | string | Date | null {
    const cacheKey = keyOf(row, col);
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey) ?? null;
    }
    if (visiting.has(cacheKey)) {
      return 0;
    }
    visiting.add(cacheKey);
    const result = evalExpr(formula.trim());
    visiting.delete(cacheKey);
    cache.set(cacheKey, result);
    return result;
  }

  function sumRange(from: string, to: string) {
    const fromMatch = from.match(CELL_REF);
    const toMatch = to.match(CELL_REF);
    if (!fromMatch || !toMatch) {
      return 0;
    }
    const r1 = Number(fromMatch[2]);
    const c1 = colLettersToNumber(fromMatch[1]);
    const r2 = Number(toMatch[2]);
    const c2 = colLettersToNumber(toMatch[1]);
    let total = 0;
    for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r += 1) {
      for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c += 1) {
        total += numeric(rawValue(r, c));
      }
    }
    return total;
  }

  function evalExpr(expr: string): number | string | Date | null {
    if (/^TODAY\(\)$/i.test(expr)) {
      return new Date();
    }
    const sum = expr.match(/^SUM\(([^:]+):([^)]+)\)$/i);
    if (sum) {
      return sumRange(sum[1], sum[2]);
    }
    let rewritten = expr.replace(/(\d+(?:\.\d+)?)%/g, "($1/100)");
    rewritten = rewritten.replace(/\$?([A-Z]+)\$?(\d+)/gi, (_, letters: string, rowText: string) => {
      return String(numeric(rawValue(Number(rowText), colLettersToNumber(letters))));
    });
    if (!/^[\d.\s+\-*/()]+$/.test(rewritten)) {
      return 0;
    }
    try {
      const value = Function(`"use strict"; return (${rewritten});`)();
      return typeof value === "number" && Number.isFinite(value) ? value : 0;
    } catch {
      return 0;
    }
  }

  return {
    valueAt(row: number, col: number) {
      return rawValue(row, col);
    },
  };
}
