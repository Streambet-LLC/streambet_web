/**
 * Production hostnames. collectiqapp.xyz is the main domain; cardcade.fun is
 * the old one and redirects there, but keep it so any stray load still
 * counts as production.
 */
const PRODUCTION_HOSTS = new Set(['collectiqapp.xyz', 'www.collectiqapp.xyz', 'cardcade.fun']);

export function isProductionHost(host: string = window.location.hostname): boolean {
  return PRODUCTION_HOSTS.has(host);
}
