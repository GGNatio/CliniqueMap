import type { Clinic } from '../types'

export interface ClinicsDiff {
  added: Clinic[]
  removed: Clinic[]
  modified: Array<{ before: Clinic; after: Clinic }>
  hasChanges: boolean
}

function fingerprint(clinic: Clinic): string {
  return JSON.stringify({
    name: clinic.name,
    address: clinic.address,
    phone: clinic.phone ?? '',
    notes: clinic.notes ?? '',
    category: clinic.category,
    lat: clinic.lat,
    lng: clinic.lng,
  })
}

/** Compare la liste locale à la liste distante (comme un aperçu de commit). */
export function diffClinics(local: Clinic[], remote: Clinic[]): ClinicsDiff {
  const remoteById = new Map(remote.map((c) => [c.id, c]))
  const localById = new Map(local.map((c) => [c.id, c]))

  const added: Clinic[] = []
  const removed: Clinic[] = []
  const modified: Array<{ before: Clinic; after: Clinic }> = []

  for (const clinic of local) {
    const remoteClinic = remoteById.get(clinic.id)
    if (!remoteClinic) {
      added.push(clinic)
      continue
    }
    if (fingerprint(clinic) !== fingerprint(remoteClinic)) {
      modified.push({ before: remoteClinic, after: clinic })
    }
  }

  for (const clinic of remote) {
    if (!localById.has(clinic.id)) removed.push(clinic)
  }

  return {
    added,
    removed,
    modified,
    hasChanges: added.length + removed.length + modified.length > 0,
  }
}
