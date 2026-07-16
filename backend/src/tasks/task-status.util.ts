/** Maps API / legacy status values to canonical DB status; passes custom stage keys through. */
export function normalizeStatus(status?: string): string | undefined {
  if (!status) return undefined;
  const upper = status.trim().toUpperCase().replace(/\s+/g, '_');
  const map: Record<string, string> = {
    TO_DO: 'TO_DO',
    PENDING: 'TO_DO',
    IN_PROGRESS: 'IN_PROGRESS',
    DONE: 'DONE',
    COMPLETED: 'DONE',
  };
  return map[upper] ?? upper;
}

/** Expose spec-friendly status in API responses. */
export function toApiStatus(status: string): string {
  const map: Record<string, string> = {
    TO_DO: 'TO_DO',
    PENDING: 'TO_DO',
    IN_PROGRESS: 'IN_PROGRESS',
    DONE: 'DONE',
    COMPLETED: 'DONE',
  };
  return map[status] ?? status;
}

export function isDoneStatus(status: string): boolean {
  return status === 'DONE' || status === 'COMPLETED';
}

/** Slugify a stage display name into a status key. */
export function stageKeyFromName(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}
