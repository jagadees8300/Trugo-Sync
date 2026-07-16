export function getEntityId(entity: { _id?: string; id?: string } | string | null | undefined): string {
  if (!entity) return '';
  if (typeof entity === 'string') return entity;
  return String(entity._id ?? entity.id ?? '');
}
