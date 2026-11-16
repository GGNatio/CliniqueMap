/** Dépôt GitHub qui héberge data/cliniques.json (source centralisée) */
export const GITHUB = {
  owner: 'GGNatio',
  repo: 'CliniqueMap',
  branch: 'main',
  path: 'data/cliniques.json',
} as const

export const CLINICS_RAW_URL = `https://raw.githubusercontent.com/${GITHUB.owner}/${GITHUB.repo}/${GITHUB.branch}/${GITHUB.path}`

/** Vérification périodique du fichier distant (ms) */
export const CLINICS_SYNC_INTERVAL_MS = 60_000
