/**
 * Utility functions to sanitize text for display and TTS (speech synthesis).
 * Removes raw LaTeX expressions, dollar signs ($), and non-didactic technical symbols
 * so students get a smooth, natural reading experience both visually and audibly.
 */

/**
 * Cleans LaTeX commands, dollar signs ($), and technical notation into friendly text for visual display.
 * Example: "$f(x)$" -> "f(x)"
 * Example: "$\\frac{dy}{dx}$" -> "dy/dx"
 * Example: "* $f'(x)$" -> "- f'(x)"
 */
export function cleanLatexAndSymbols(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // 1. Remove LaTeX fractions \frac{numerator}{denominator} -> numerator/denominator
  // Loop to handle nested fractions if any
  let prevCleaned = "";
  while (cleaned !== prevCleaned) {
    prevCleaned = cleaned;
    cleaned = cleaned.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "$1/$2");
  }

  // 2. Remove LaTeX square roots \sqrt{x} -> raiz(x)
  cleaned = cleaned.replace(/\\sqrt\{([^{}]+)\}/g, "raiz($1)");

  // 3. Remove LaTeX text blocks \text{x} -> x
  cleaned = cleaned.replace(/\\text\{([^{}]+)\}/g, "$1");

  // 4. Convert common LaTeX math operators to clean Unicode/text symbols
  cleaned = cleaned
    .replace(/\\times|\\cdot/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\le|\\leq/g, "≤")
    .replace(/\\ge|\\geq/g, "≥")
    .replace(/\\neq/g, "≠")
    .replace(/\\approx/g, "≈")
    .replace(/\\pm/g, "±")
    .replace(/\\infty/g, "infinito")
    .replace(/\\int/g, "integral")
    .replace(/\\sum/g, "soma")
    .replace(/\\left\(|\\right\)/g, match => (match.includes("left") ? "(" : ")"))
    .replace(/\\left\[|\\right\]/g, match => (match.includes("left") ? "[" : "]"))
    .replace(/\\alpha/g, "alfa")
    .replace(/\\beta/g, "beta")
    .replace(/\\gamma/g, "gama")
    .replace(/\\delta|\\Delta/g, "delta")
    .replace(/\\pi|\\Pi/g, "pi")
    .replace(/\\theta/g, "teta");

  // 5. Remove math delimiters: $$, $, \[, \], \(, \)
  cleaned = cleaned
    .replace(/\$\$/g, "")
    .replace(/\$/g, "")
    .replace(/\\\[|\\\]/g, "")
    .replace(/\\\(|\\\)/g, "");

  // 6. Clean up remaining LaTeX command backslashes (e.g. \sin, \cos -> sin, cos)
  cleaned = cleaned.replace(/\\([a-zA-Z]+)/g, "$1");

  // 7. Clean remaining standalone backslashes and unnecessary curly braces
  cleaned = cleaned.replace(/\\/g, "").replace(/\{|\}/g, "");

  // 8. Convert asterisk list items "* " at line starts to dash list items "- "
  // so Markdown renderers format them cleanly without displaying raw asterisk symbols
  cleaned = cleaned.replace(/^(\s*)\*\s+/gm, "$1- ");

  return cleaned;
}

/**
 * Cleans text specifically for Web Speech API (speech synthesis / audio reading).
 * Converts symbols, derivatives, math notation, and ordinals into spoken Portuguese words.
 * Example: "f'(x)" -> "f linha de x"
 * Example: "dy/dx" -> "dy sobre dx"
 * Example: "11ª" -> "décima primeira"
 */
export function cleanTextForTTS(text: string): string {
  if (!text) return "";

  // First apply general symbol cleanup
  let cleanText = cleanLatexAndSymbols(text);

  // 1. Remove all emojis (Unicode ranges for symbols and pictograms)
  cleanText = cleanText
    .replace(/[\u{1F000}-\u{1FFFF}|\u{2600}-\u{27FF}|\u{2B00}-\u{2BFF}|\u{FE00}-\u{FEFF}|\u{1FA00}-\u{1FFFF}]/gu, "")
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
    .replace(/[\u2702-\u27B0]/gu, "")
    .replace(/\p{Emoji_Presentation}/gu, "");

  // 2. Convert mathematical derivatives and calculus notation for natural TTS speech
  cleanText = cleanText
    .replace(/f'\s*\(\s*x\s*\)/gi, "f linha de x")
    .replace(/f''\s*\(\s*x\s*\)/gi, "f segunda de x")
    .replace(/f'\s*/gi, "f linha ")
    .replace(/y'\s*/gi, "y linha ")
    .replace(/dy\s*\/\s*dx/gi, "dy sobre dx")
    .replace(/df\s*\/\s*dx/gi, "df sobre dx")
    .replace(/([a-zA-Z0-9]+)\s*\/\s*([a-zA-Z0-9]+)/g, "$1 sobre $2");

  // 3. Convert exponents for natural reading
  cleanText = cleanText
    .replace(/\^2\b/g, " ao quadrado")
    .replace(/\^3\b/g, " ao cubo")
    .replace(/\^([0-9a-zA-Z]+)/g, " elevado a $1");

  // 4. Normalize class ordinals (11.ª, 11ª, 11º, etc.) for TTS reading
  cleanText = cleanText
    // Feminine
    .replace(/11\s*\.?\s*([ªa](?![a-zA-Z]))/gi, "décima primeira")
    .replace(/12\s*\.?\s*([ªa](?![a-zA-Z]))/gi, "décima segunda")
    .replace(/10\s*\.?\s*([ªa](?![a-zA-Z]))/gi, "décima")
    .replace(/9\s*\.?\s*([ªa](?![a-zA-Z]))/gi, "nona")
    .replace(/8\s*\.?\s*([ªa](?![a-zA-Z]))/gi, "oitava")
    .replace(/7\s*\.?\s*([ªa](?![a-zA-Z]))/gi, "sétima")
    .replace(/6\s*\.?\s*([ªa](?![a-zA-Z]))/gi, "sexta")
    .replace(/5\s*\.?\s*([ªa](?![a-zA-Z]))/gi, "quinta")
    .replace(/4\s*\.?\s*([ªa](?![a-zA-Z]))/gi, "quarta")
    .replace(/3\s*\.?\s*([ªa](?![a-zA-Z]))/gi, "terceira")
    .replace(/2\s*\.?\s*([ªa](?![a-zA-Z]))/gi, "segunda")
    .replace(/1\s*\.?\s*([ªa](?![a-zA-Z]))/gi, "primeira")
    // Masculine
    .replace(/11\s*\.?\s*([ºo](?![a-zA-Z]))/gi, "décimo primeiro")
    .replace(/12\s*\.?\s*([ºo](?![a-zA-Z]))/gi, "décimo segundo")
    .replace(/10\s*\.?\s*([ºo](?![a-zA-Z]))/gi, "décimo")
    .replace(/9\s*\.?\s*([ºo](?![a-zA-Z]))/gi, "nono")
    .replace(/8\s*\.?\s*([ºo](?![a-zA-Z]))/gi, "oitavo")
    .replace(/7\s*\.?\s*([ºo](?![a-zA-Z]))/gi, "sétimo")
    .replace(/6\s*\.?\s*([ºo](?![a-zA-Z]))/gi, "sexto")
    .replace(/5\s*\.?\s*([ºo](?![a-zA-Z]))/gi, "quinto")
    .replace(/4\s*\.?\s*([ºo](?![a-zA-Z]))/gi, "quarto")
    .replace(/3\s*\.?\s*([ºo](?![a-zA-Z]))/gi, "terceiro")
    .replace(/2\s*\.?\s*([ºo](?![a-zA-Z]))/gi, "segundo")
    .replace(/1\s*\.?\s*([ºo](?![a-zA-Z]))/gi, "primeiro");

  // 5. Remove punctuation symbols that impair audio pronunciation (*, #, `, _, ~, [, ], $, \)
  cleanText = cleanText
    .replace(/[*#`_\-~]/g, " ")
    .replace(/\[\s*\]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleanText;
}
