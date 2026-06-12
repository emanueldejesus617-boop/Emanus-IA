/**
 * Sanitizes and repairs malformed JSON from Gemini AI responses.
 * 
 * Gemini sometimes produces JSON with duplicated trailing characters
 * (e.g., `)\"\n metros).\"\n).\"\n).\"`) or other minor corruption.
 * This utility attempts progressive repair strategies.
 */

/**
 * Try to parse JSON, applying repair strategies if direct parse fails.
 */
export function safeParseJSON<T = any>(raw: string): T | null {
  if (!raw || !raw.trim()) return null;

  let text = raw.trim();

  // 1. Strip markdown code fences
  if (text.startsWith('```')) {
    text = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  }

  // 2. Try direct parse first
  try {
    return JSON.parse(text);
  } catch (_) {
    // Continue with repair strategies
  }

  // 3. Try extracting the outermost JSON structure (object or array)
  const jsonMatch = text.match(/^(\{[\s\S]*\}|\[[\s\S]*\])$/);
  if (jsonMatch) {
    const repaired = repairJSON(jsonMatch[0]);
    if (repaired) return repaired as T;
  }

  // 4. Try extracting JSON object from within the text
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    const repaired = repairJSON(objectMatch[0]);
    if (repaired) return repaired as T;
  }

  // 5. Try extracting JSON array from within the text
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    const repaired = repairJSON(arrayMatch[0]);
    if (repaired) return repaired as T;
  }

  return null;
}

/**
 * Attempt to repair common Gemini JSON corruption patterns:
 * - Duplicated closing characters after the last valid value
 * - Unescaped newlines inside strings
 * - Trailing commas before closing brackets
 */
function repairJSON(text: string): any | null {
  // Strategy 1: Direct parse
  try {
    return JSON.parse(text);
  } catch (_) {}

  // Strategy 2: Fix trailing garbage after the last valid string value
  // Gemini sometimes appends duplicated partial content after the last 
  // property value but before the closing braces
  let repaired = text;

  // Remove trailing commas before } or ]
  repaired = repaired.replace(/,\s*([}\]])/g, '$1');

  try {
    return JSON.parse(repaired);
  } catch (_) {}

  // Strategy 3: Progressively truncate from the end to find valid JSON
  // This handles cases where Gemini duplicates the end of a string value
  const isObject = text.trimStart().startsWith('{');
  const closingChar = isObject ? '}' : ']';

  // Find all positions of the closing character
  const closingPositions: number[] = [];
  for (let i = text.length - 1; i >= 0; i--) {
    if (text[i] === closingChar) {
      closingPositions.push(i);
    }
  }

  // Try each closing position (from the end) to see if truncating there yields valid JSON
  for (const pos of closingPositions) {
    const candidate = text.slice(0, pos + 1);
    try {
      return JSON.parse(candidate);
    } catch (_) {
      // Try with trailing comma removal too
      const cleaned = candidate.replace(/,\s*([}\]])/g, '$1');
      try {
        return JSON.parse(cleaned);
      } catch (_) {}
    }
  }

  // Strategy 4: Line-by-line truncation approach
  // Find the last complete property by looking for the pattern: "key": "value"
  // then close the structure
  const lines = text.split('\n');
  for (let endLine = lines.length - 1; endLine >= 1; endLine--) {
    const truncated = lines.slice(0, endLine).join('\n');
    
    // Count open/close braces and brackets to try to balance
    const openBraces = (truncated.match(/\{/g) || []).length;
    const closeBraces = (truncated.match(/\}/g) || []).length;
    const openBrackets = (truncated.match(/\[/g) || []).length;
    const closeBrackets = (truncated.match(/\]/g) || []).length;
    
    let balanced = truncated.trimEnd();
    // Remove trailing comma
    balanced = balanced.replace(/,\s*$/, '');
    
    // Add missing closing brackets/braces
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      balanced += ']';
    }
    for (let i = 0; i < openBraces - closeBraces; i++) {
      balanced += '}';
    }
    
    try {
      return JSON.parse(balanced);
    } catch (_) {}
  }

  return null;
}
