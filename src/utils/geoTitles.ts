import { SourceRecord, geoSeriesUid, parseTripothesis, tripothesisTsvRow } from '@/utils/tripothesisTerms'

/** Server-side GEO series titles from NCBI E-utilities, cached for the life of the process. */
const cache = new Map<string, string>()
const CHUNK = 200

async function fetchChunk(accessions: string[]) {
  const uids = accessions.map(geoSeriesUid).filter((uid): uid is string => !!uid)
  if (!uids.length) return
  const res = await fetch('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ db: 'gds', retmode: 'json', id: uids.join(',') }),
    signal: AbortSignal.timeout(10000),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`esummary ${res.status}`)
  const { result } = await res.json() as { result?: Record<string, { accession?: string, title?: string }> & { uids?: string[] } }
  for (const uid of result?.uids ?? []) {
    const item = result?.[uid] as { accession?: string, title?: string } | undefined
    if (item?.accession && item.title) cache.set(item.accession.toUpperCase(), item.title.trim())
  }
}

export async function fetchGeoTitles(accessions: string[]): Promise<Record<string, string>> {
  const wanted = Array.from(new Set(accessions.map(acc => acc.trim().toUpperCase()).filter(acc => geoSeriesUid(acc))))
  const missing = wanted.filter(acc => !cache.has(acc))
  for (let i = 0; i < missing.length; i += CHUNK) {
    try {
      await fetchChunk(missing.slice(i, i + CHUNK))
    } catch (error) {
      console.warn('GEO title lookup failed', error)
      break
    }
  }
  return Object.fromEntries(wanted.filter(acc => cache.has(acc)).map(acc => [acc, cache.get(acc)!]))
}

/** TSV rows for Tripothesis source records, with GEO study titles looked up in one pass. */
export async function tripothesisTsvRows(records: unknown[]) {
  const parsed = records.map(record => parseTripothesis(record as SourceRecord | null))
  const titles = await fetchGeoTitles(parsed.flatMap(p => p?.rummageo.accessions ?? []))
  return parsed.map(p => tripothesisTsvRow(p, titles))
}
