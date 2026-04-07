/**
 * Re-export desde la ubicación canónica en hooks/shared/.
 * Este archivo existe para mantener compatibilidad con imports existentes.
 * Para nuevos archivos, importar desde '@/hooks/shared/useCurrentUser'.
 */
export { useCurrentUser } from './shared/useCurrentUser';
export type { CurrentUser } from './shared/useCurrentUser';
