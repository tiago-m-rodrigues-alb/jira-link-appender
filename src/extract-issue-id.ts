export function extractIssueId(source: string, pattern: RegExp): string | null {
  // Match the branch name against the pattern
  const match = source.match(pattern)

  // If a match is found, return the issue ID
  if (match && match[0]) {
    return match[0]
  }

  // If no match is found, return null
  return null
}
