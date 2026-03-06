export function parseUrlList(input: string): string[] {
  if (!input) return [];

  // 1) Find all http/https URLs in the pasted text
  const matches = input.match(/https?:\/\/[^\s]+/g) ?? [];

  // 2) Clean common trailing punctuation Safari/Notes sometimes adds
  const cleaned = matches
    .map(u => u.trim().replace(/[)\],.]+$/g, "")) // strip trailing ")", "]", ",", "."
    .filter(Boolean);

  // 3) Deduplicate while preserving order
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const u of cleaned) {
    if (!seen.has(u)) {
      seen.add(u);
      unique.push(u);
    }
  }

  return unique;
}
