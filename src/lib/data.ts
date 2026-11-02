import { readFile } from 'fs/promises'
import path from 'path'

export const DATA_DIRECTORY = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'))
export const INTERSECTION_MANIFEST = 'tripothesis_manifest.json'

export type ArtifactFile = { name: string, bytes: number, sha256: string }
export type IntersectionManifest = {
  capturedAt: string, geneSets: number, backgroundGenes: number, files: ArtifactFile[]
  scope?: string, subset?: boolean
}
export type SourceManifest = {
  scope?: string,
  files: (ArtifactFile & { library: string, geneSets: number })[]
}

export async function readDataManifest<T>(filename: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path.join(DATA_DIRECTORY, filename), 'utf8')) as T
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}
