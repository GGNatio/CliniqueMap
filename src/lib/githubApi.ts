import { GITHUB } from '../config'
import { hashText, parseClinicsFile, serializeClinicsFile } from './clinicSync'
import type { Clinic } from '../types'

const TOKEN_KEY = 'cliniquemap.github.token'

export function loadGithubToken(): string {
  return localStorage.getItem(TOKEN_KEY)?.trim() ?? ''
}

export function saveGithubToken(token: string): void {
  const trimmed = token.trim()
  if (!trimmed) localStorage.removeItem(TOKEN_KEY)
  else localStorage.setItem(TOKEN_KEY, trimmed)
}

function apiUrl(path = GITHUB.path): string {
  return `https://api.github.com/repos/${GITHUB.owner}/${GITHUB.repo}/contents/${path}`
}

function authHeaders(token: string): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

function decodeBase64Utf8(content: string): string {
  const binary = atob(content.replace(/\n/g, ''))
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function toBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export async function fetchRemoteClinicsViaApi(token: string): Promise<{
  clinics: Clinic[]
  sha: string
  hash: string
  raw: string
}> {
  const response = await fetch(
    `${apiUrl()}?ref=${encodeURIComponent(GITHUB.branch)}`,
    { headers: authHeaders(token), cache: 'no-store' },
  )

  if (response.status === 404) {
    return { clinics: [], sha: '', hash: await hashText(''), raw: '' }
  }

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      response.status === 401 || response.status === 403
        ? 'Token GitHub invalide ou sans droit d’écriture sur le dépôt.'
        : `GitHub API (${response.status}) : ${body.slice(0, 180)}`,
    )
  }

  const data = (await response.json()) as {
    sha: string
    content: string
    encoding: string
  }

  const text = decodeBase64Utf8(data.content)
  const file = parseClinicsFile(text)

  return {
    clinics: file.clinics,
    sha: data.sha,
    hash: await hashText(text),
    raw: text,
  }
}

export async function pushClinicsToGithub(options: {
  token: string
  clinics: Clinic[]
  message?: string
}): Promise<{ hash: string }> {
  const { token, clinics } = options
  const content = serializeClinicsFile(clinics)

  let sha: string | undefined
  try {
    const current = await fetchRemoteClinicsViaApi(token)
    sha = current.sha || undefined
  } catch {
    sha = undefined
  }

  const response = await fetch(apiUrl(), {
    method: 'PUT',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message:
        options.message ??
        `Mise à jour des cliniques (${clinics.length})`,
      content: toBase64Utf8(content),
      branch: GITHUB.branch,
      ...(sha ? { sha } : {}),
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    if (response.status === 409) {
      throw new Error(
        'Le fichier a changé sur GitHub entre-temps. Actualisez puis renvoyez.',
      )
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        'Token GitHub refusé. Créez un token avec accès Contents: Read and write.',
      )
    }
    throw new Error(
      `Échec de l’envoi GitHub (${response.status}) : ${body.slice(0, 180)}`,
    )
  }

  return { hash: await hashText(content) }
}
