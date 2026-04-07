export function computeDiff(original: string, modified: string): string[] {
  const origLines = original.split("\n");
  const modLines = modified.split("\n");
  const maxLen = Math.max(origLines.length, modLines.length);
  const diff: string[] = [];

  for (let i = 0; i < maxLen; i++) {
    const o = origLines[i];
    const m = modLines[i];
    if (o === undefined && m !== undefined) {
      diff.push(`+ ${m}`);
    } else if (o !== undefined && m === undefined) {
      diff.push(`- ${o}`);
    } else if (o !== m) {
      diff.push(`- ${o}`);
      diff.push(`+ ${m}`);
    } else {
      diff.push(`  ${o}`);
    }
  }

  return diff;
}
