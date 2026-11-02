import { createReadStream } from 'fs'
import { realpath, stat } from 'fs/promises'
import path from 'path'
import { Readable } from 'stream'
import { ArtifactFile, DATA_DIRECTORY, INTERSECTION_MANIFEST, readDataManifest } from '@/lib/data'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: { path: string[] } }) {
  const isSource = params.path.length === 2 && params.path[0] === 'source-libraries'
  const filename = params.path[params.path.length - 1]
  if ((!isSource && params.path.length !== 1) || !filename || path.basename(filename) !== filename) {
    return new Response('File not found', { status: 404 })
  }
  const manifestPath = isSource ? 'source-libraries/manifest.json' : INTERSECTION_MANIFEST
  const manifest = await readDataManifest<{ files: ArtifactFile[] }>(manifestPath)
  if (!manifest || (filename !== path.basename(manifestPath) && !manifest.files.some(file => file.name === filename))) {
    return new Response('File not found', { status: 404 })
  }
  try {
    const root = await realpath(DATA_DIRECTORY)
    const filePath = await realpath(path.join(root, ...params.path))
    if (!filePath.startsWith(root + path.sep)) return new Response('File not found', { status: 404 })
    const info = await stat(filePath)
    if (!info.isFile()) return new Response('File not found', { status: 404 })
    return new Response(Readable.toWeb(createReadStream(filePath)) as ReadableStream<Uint8Array>, {
      headers: {
        'Content-Type': filename.endsWith('.json') ? 'application/json' : filename.endsWith('.gz') ? 'application/gzip' : 'text/plain; charset=utf-8',
        'Content-Length': String(info.size),
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return new Response('File not found', { status: 404 })
    throw error
  }
}
