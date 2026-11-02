import React from 'react'
import { INTERSECTION_MANIFEST, IntersectionManifest, SourceManifest, readDataManifest } from '@/lib/data'

export const metadata = { title: 'Downloads' }
const base = '/downloads'
const descriptions: Record<string, string> = {
  'tripothesis.gmt.gz': 'Intersected gene sets (GMT)',
  'tripothesis_metadata.tsv.gz': 'Source terms, libraries, ranks, scores, and subset provenance (TSV)',
  'tripothesis_snapshot.json.gz': 'Complete preserved API snapshot, including original database identities (JSON)',
}

export default async function Downloads() {
  const [manifest, sources] = await Promise.all([
    readDataManifest<IntersectionManifest>(INTERSECTION_MANIFEST),
    readDataManifest<SourceManifest>('source-libraries/manifest.json'),
  ])
  return <div className="flex flex-col gap-2 my-2">
    <h1 className="text-xl">Download Tripothesis data</h1>
    {manifest ? <>
    <p className="prose">Dataset prepared on {manifest.capturedAt.slice(0, 10)}: {manifest.geneSets.toLocaleString()} gene sets and {manifest.backgroundGenes.toLocaleString()} background genes.</p>
    <div className="overflow-x-auto"><table className="table table-xs">
      <thead><tr><th>Artifact</th><th>Download</th><th>Size</th></tr></thead>
      <tbody>{manifest.files.map(file => <tr key={file.name}>
        <td>{descriptions[file.name]}<details><summary>SHA-256</summary><code className="break-all">{file.sha256}</code></details></td>
        <td><a className="link" href={`${base}/${file.name}`} download>{file.name}</a></td>
        <td className="whitespace-nowrap">{(file.bytes / 1024 / 1024).toFixed(1)} MiB</td>
      </tr>)}</tbody>
    </table></div>
    <p><a className="link" href={`${base}/${INTERSECTION_MANIFEST}`} download>Download provenance and checksum manifest</a></p>
    </> : <p className="prose">Intersection downloads are not available locally. Place the artifacts and tripothesis_manifest.json in data/.</p>}
    {sources ? <>
    <h2 className="text-md font-bold mt-4">Un-intersected source GMTs</h2>
    <p className="prose">{sources.scope ?? `Source GMTs for the ${sources.files.length} libraries used by the active dataset.`}</p>
    <div className="overflow-x-auto"><table className="table table-xs">
      <thead><tr><th>Source library</th><th>Gene sets</th><th>Download</th><th>Size</th></tr></thead>
      <tbody>{sources.files.map(file => <tr key={file.name}>
        <td>{file.library}</td><td>{file.geneSets.toLocaleString()}</td>
        <td><a className="link" href={`/downloads/source-libraries/${file.name}`} download>GMT</a></td>
        <td>{(file.bytes / 1024 / 1024).toFixed(1)} MiB</td>
      </tr>)}</tbody>
    </table></div>
    <p><a className="link" href="/downloads/source-libraries/manifest.json" download>Source-library URLs, provenance, and checksums</a></p>
    </> : <p className="prose">Source-library downloads are not available locally. Place their artifacts in data/source-libraries/.</p>}
  </div>
}
