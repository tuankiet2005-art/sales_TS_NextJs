const COLOR_FUNCTIONS = ["oklch", "oklab", "lch", "lab", "color-mix", "color"];

export function rewriteCssColorFunctions(
  input: string,
  convert: (fn: string) => string,
): string {
  let result = input;
  for (let i = 0; i < 40; i += 1) {
    const match = innermostColorFunction(result);
    if (!match) {
      return result;
    }
    result = `${result.slice(0, match.start)}${convert(match.text)}${result.slice(match.end)}`;
  }
  return result;
}

export function cssContainsUnsupportedColor(value: string): boolean {
  const lower = value.toLowerCase();
  return COLOR_FUNCTIONS.some((name) => lower.includes(`${name}(`));
}

function innermostColorFunction(input: string): { start: number; end: number; text: string } | null {
  const lower = input.toLowerCase();
  let innerStart = -1;
  let nameLength = 0;
  for (const name of COLOR_FUNCTIONS) {
    const token = `${name}(`;
    let from = 0;
    while (from < lower.length) {
      const start = lower.indexOf(token, from);
      if (start === -1) {
        break;
      }
      const prev = start === 0 ? "" : input[start - 1];
      if (prev && /[A-Za-z0-9_-]/.test(prev)) {
        from = start + 1;
        continue;
      }
      if (start >= innerStart) {
        innerStart = start;
        nameLength = token.length;
      }
      from = start + 1;
    }
  }
  if (innerStart === -1) {
    return null;
  }
  const open = innerStart + nameLength - 1;
  const end = matchingParenEnd(input, open);
  if (end == null) {
    return null;
  }
  return { start: innerStart, end, text: input.slice(innerStart, end) };
}

function matchingParenEnd(input: string, openIndex: number): number | null {
  let depth = 0;
  for (let i = openIndex; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === "(") {
      depth += 1;
    } else if (ch === ")") {
      depth -= 1;
      if (depth === 0) {
        return i + 1;
      }
    }
  }
  return null;
}
