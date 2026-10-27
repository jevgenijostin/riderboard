export function checksum(text: string): string {
  let hash = 0x811c9dc5;
  for (const character of text) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0').slice(0, 4).toUpperCase();
}
export function generateKey(a: string, b: string): string {
  return `RB-${a}-${b}-${checksum(`riderboard:${a}${b}`)}`;
}
export function validateKey(key: string): boolean {
  const normalized = key.trim().toUpperCase(),
    match = /^RB-([0-9A-F]{4})-([0-9A-F]{4})-([0-9A-F]{4})$/.exec(normalized);
  return !!match && normalized === generateKey(match[1], match[2]);
}
