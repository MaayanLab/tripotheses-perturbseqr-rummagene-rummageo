/**
 * Parse the three source terms that make up a Tripothesis into structured fields.
 *
 * Term formats follow the upstream resources:
 *  - Rummagene:   `PMC<id>-<supplementary file>-<sheet>-<column>`
 *                 (https://github.com/MaayanLab/rummagene, src/app/enrich/client.tsx)
 *  - RummaGEO:    `GSE<id>[,GSE<id>]-<group A>-vs-<group B>-<species> up|dn`
 *                 (https://github.com/MaayanLab/rummageo, src/components/termTable.tsx)
 *  - Perturb-Seqr: `perturbation::cellLine::cellType::timepoint::concentration[::extras] up|down`
 *                 (https://github.com/MaayanLab/PerturbSeqr, src/utils/parseTerm.ts); Tripotheses
 *                 prefixes the library slug and suffixes the signature id, e.g.
 *                 `tahoe-100m::Amsacrine::H4::CNS/Brain::24h::5.0uM down::SIG_...`.
 *
 * Readable labels precomputed at release time (scripts/prepare_tahoe_release.py) are stored in
 * `tripothesis_metadata.source_record` and take precedence over what can be parsed from the term.
 */

export type Direction = 'up' | 'down' | ''

export type RummageneTerm = {
  raw: string
  pmcid: string
  file: string
  sheet: string
  column: string
  tableLabel: string
  paperTitle: string
  year: string
  doi: string
}

export type RummageoTerm = {
  raw: string
  accessions: string[]
  groupA: string
  groupB: string
  groupALabel: string
  groupBLabel: string
  species: string
  direction: Direction
}

export type PerturbseqrTerm = {
  raw: string
  library: string
  libraryLabel: string
  perturbation: string
  cellLine: string
  cellType: string
  timepoint: string
  concentration: string
  perturbationType: string
  perturbationMethod: string
  extras: string[]
  /** The term as Perturb-Seqr stores it: without the library prefix and signature suffix. */
  sourceTerm: string
  signatureId: string
  direction: Direction
  isGeneLibrary: boolean
}

export type SourceRecord = Record<string, unknown>

const str = (value: unknown) => value == null ? '' : String(value).trim()
const clean = (value: string) => value.replace(/\s+/g, ' ').trim()
const pretty = (value: string) => clean(value.replace(/_/g, ' '))

// UTF-8 decoded as Windows-1252 and then lowercased upstream, e.g. "µm" stored as "âµm" and "μ" as "î¼".
const MOJIBAKE_LEAD: Record<string, number> = { 'â': 0xc2, 'Â': 0xc2, 'ã': 0xc3, 'Ã': 0xc3, 'î': 0xce, 'Î': 0xce, 'ï': 0xcf, 'Ï': 0xcf }
const CP1252: Record<string, number> = {
  '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89, 'Š': 0x8a,
  '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97,
  '˜': 0x98, '™': 0x99, 'š': 0x9a, '›': 0x9b, 'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f,
}
const utf8 = new TextDecoder('utf-8', { fatal: true })

function fixMojibake(value: string) {
  return value.replace(/([âÂãÃîÎïÏ])([\u0080-\u00bf€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ])/g, (match, lead: string, trail: string) => {
    const byte = trail.charCodeAt(0) <= 0xff ? trail.charCodeAt(0) : CP1252[trail]
    try {
      return utf8.decode(new Uint8Array([MOJIBAKE_LEAD[lead], byte]))
    } catch {
      return match
    }
  })
}

function parseDirection(value: string): Direction {
  const v = value.toLowerCase()
  if (v === 'up') return 'up'
  if (v === 'dn' || v === 'down') return 'down'
  return ''
}

export const formatPValue = (p: number | null | undefined) =>
  p == null ? '—' : p === 0 ? '< 5e-324' : p.toExponential(2)

export function directionLabel(direction: Direction) {
  return direction === 'up' ? 'Upregulated' : direction === 'down' ? 'Downregulated' : ''
}

/* ------------------------------------------------------------------ Rummagene */

const GENERIC_COLUMN = /^(unnamed\s*\d+|gene(s| name| names| symbol| symbols| id| ids)?|symbol|symbols|ids?|entrez.*|refgene name|\d+)$/i

export function parseRummageneTerm(term: string, record: SourceRecord = {}): RummageneTerm {
  const m = /^(PMC\d+)-(.*)$/.exec(term)
  const pmcid = str(record.rummagene_pmc_id) || (m ? m[1] : '')
  const rest = m ? m[2] : term
  // file names contain dashes, so anchor on the extension like rummagene's own UI
  const fm = /^(.+?\.(?:xlsx?|csv|tsv|txt|docx?|pdf|zip)(?:\.gz)?)-+(.*)$/i.exec(rest)
  const file = fm ? fm[1] : ''
  const tail = fm ? fm[2] : rest
  const dash = tail.lastIndexOf('-')
  let sheet = dash > 0 ? tail.slice(0, dash) : ''
  let column = dash > 0 ? tail.slice(dash + 1) : tail
  sheet = pretty(sheet)
  column = pretty(column)
  if (/^sheet\s*\d+$/i.test(sheet) || /^\d+$/.test(sheet)) sheet = ''
  if (GENERIC_COLUMN.test(column) || column === sheet) column = ''
  const tableLabel = str(record.rummagene_table_label) || [sheet, column].filter(Boolean).join(' — ')
  return {
    raw: term,
    pmcid,
    file,
    sheet,
    column,
    tableLabel,
    paperTitle: str(record.rummagene_paper_title),
    year: str(record.rummagene_paper_year),
    doi: str(record.rummagene_doi),
  }
}

export const pmcUrl = (pmcid: string) => `https://pmc.ncbi.nlm.nih.gov/articles/${pmcid}/`
export const pmcFileUrl = (pmcid: string, file: string) =>
  `https://pmc.ncbi.nlm.nih.gov/articles/instance/${pmcid.replace(/^PMC/, '')}/bin/${encodeURIComponent(file)}`
export const doiUrl = (doi: string) => `https://doi.org/${doi}`

/* ------------------------------------------------------------------- RummaGEO */

export function parseRummageoTerm(term: string, record: SourceRecord = {}): RummageoTerm {
  const m = /^((?:GSE|GDS)\d+(?:,(?:GSE|GDS)\d+)*)-(\w+)-vs-(\w+)-(\w+)\s+(up|dn|down)$/i.exec(term.trim())
  const accessions = str(record.rummageo_accession)
    ? str(record.rummageo_accession).split(',')
    : m ? m[1].split(',') : []
  return {
    raw: term,
    accessions,
    groupA: str(record.rummageo_group_first) || (m ? m[2] : ''),
    groupB: str(record.rummageo_group_second) || (m ? m[3] : ''),
    groupALabel: clean(fixMojibake(str(record.rummageo_group_first_label))),
    groupBLabel: clean(fixMojibake(str(record.rummageo_group_second_label))),
    species: m ? m[4] : '',
    direction: m ? parseDirection(m[5]) : parseDirection(str(record.rummageo_direction).replace(/regulated$/, '')),
  }
}

/** GDS uid of a GEO series, for NCBI E-utilities (GSE<n> -> 200000000 + n). */
export const geoSeriesUid = (accession: string) => {
  const m = /^GSE(\d+)$/i.exec(accession.trim())
  return m ? String(200000000 + Number(m[1])) : null
}

export const geoUrl = (accession: string) => `https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=${accession}`
export const pubmedUrl = (pmid: string) => `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`

/* ---------------------------------------------------------------- Perturb-Seqr */

export const PERTURBSEQR_LIBRARIES: Record<string, { label: string, gene?: boolean }> = {
  'tahoe-100m': { label: 'Tahoe-100M' },
  'l1000-cp': { label: 'LINCS L1000 (chemical)' },
  'l1000_cp': { label: 'LINCS L1000 (chemical)' },
  'l1000-xpr': { label: 'LINCS L1000 (CRISPR)', gene: true },
  'l1000_xpr': { label: 'LINCS L1000 (CRISPR)', gene: true },
  'l1000-sh': { label: 'LINCS L1000 (shRNA)', gene: true },
  'l1000-oe': { label: 'LINCS L1000 (overexpression)', gene: true },
  'nibr-drugseq': { label: 'NIBR DRUG-seq' },
  'cmap': { label: 'CMap' },
  'ginkgo': { label: 'Ginkgo Bioworks' },
  'sciplex': { label: 'SciPlex' },
  'deepcover-moa': { label: 'DeepCover MoA' },
  'perturb-atlas': { label: 'Perturb Atlas', gene: true },
  'replogle': { label: 'Replogle Perturb-seq', gene: true },
  'creeds-drug': { label: 'CREEDS (drug)' },
  'creeds-gene': { label: 'CREEDS (gene)', gene: true },
  'rummageo-drug': { label: 'RummaGEO (drug)' },
  'rummageo-gene': { label: 'RummaGEO (gene)', gene: true },
}

function libraryLabel(slug: string) {
  const known = PERTURBSEQR_LIBRARIES[slug.toLowerCase()]
  if (known) return known.label
  return slug.split(/[-_]/).map(w => w.length <= 4 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)).join(' ')
}

export function parsePerturbseqrTerm(term: string, library = ''): PerturbseqrTerm {
  let parts = term.split('::')
  let lib = library
  if (parts.length > 1 && (parts[0].toLowerCase() === library.toLowerCase() || PERTURBSEQR_LIBRARIES[parts[0].toLowerCase()])) {
    lib = parts[0]
    parts = parts.slice(1)
  }
  let signatureId = ''
  if (parts.length > 1 && /^SIG_/i.test(parts[parts.length - 1])) {
    signatureId = parts[parts.length - 1]
    parts = parts.slice(0, -1)
  }
  const sourceTerm = parts.join('::')
  // direction is a space-separated suffix on the last field
  let direction: Direction = ''
  const last = parts[parts.length - 1] ?? ''
  const dm = /^(.*?)\s+(up|down|dn)$/i.exec(last)
  if (dm) {
    direction = parseDirection(dm[2])
    parts = [...parts.slice(0, -1), dm[1]]
  }
  parts = parts.map(clean)
  const isGeneLibrary = !!PERTURBSEQR_LIBRARIES[lib.toLowerCase()]?.gene
  return {
    raw: term,
    library: lib,
    libraryLabel: libraryLabel(lib),
    perturbation: parts[0] ?? '',
    cellLine: parts[1] ?? '',
    cellType: parts[2] ?? '',
    timepoint: parts[3] ?? '',
    concentration: (parts[4] ?? '').replace(/(\d)\s*uM\b/g, '$1 µM').replace(/(\d)\s*nM\b/g, '$1 nM'),
    perturbationType: isGeneLibrary ? parts[5] ?? '' : '',
    perturbationMethod: isGeneLibrary ? parts[6] ?? '' : '',
    extras: parts.slice(5),
    sourceTerm,
    signatureId,
    direction,
    isGeneLibrary,
  }
}

/** Term-search links that bring up exactly one source gene set (each app matches the full term). */
export const rummageneTermSearchUrl = (term: string) =>
  `https://rummagene.com/term-search?page=1&q=${encodeURIComponent(term)}`
export const rummageoTermSearchUrl = (term: string) =>
  `https://rummageo.com/term-search?q=${encodeURIComponent(term)}`
export const perturbseqrTermSearchUrl = (term: string) =>
  `https://perturbseqr.maayanlab.cloud/term-search?page=1&q=${encodeURIComponent(term)}`

export const perturbseqrSearchUrl = (q: string) =>
  `https://perturbseqr.maayanlab.cloud/term-search?q=${encodeURIComponent(q)}`

/* ---------------------------------------------------------------- Tripothesis */

export type ParsedTripothesis = {
  rummagene: RummageneTerm
  rummageo: RummageoTerm
  perturbseqr: PerturbseqrTerm
  sources: [string, string, string]
}

/** Parse a tripothesis `source_record`. Returns null if it lacks the three source terms. */
export function parseTripothesis(record: SourceRecord | null | undefined): ParsedTripothesis | null {
  if (!record) return null
  const term1 = str(record.term1), term2 = str(record.term2), term3 = str(record.term3)
  if (!term1 || !term2 || !term3) return null
  const sources = [str(record.source1), str(record.source2), str(record.source3)] as [string, string, string]
  return {
    rummagene: parseRummageneTerm(term1, record),
    rummageo: parseRummageoTerm(term2, record),
    perturbseqr: parsePerturbseqrTerm(term3, sources[2]),
    sources,
  }
}

/**
 * Fallback before the source record has loaded: the display title is
 * `<rummagene display> × <rummageo display> × <perturb-seqr display>`.
 */
export function splitTitle(title: string | null | undefined): [string, string, string] | null {
  if (!title) return null
  const parts = title.split(' × ')
  if (parts.length < 3) return null
  // Rummagene paper titles may themselves contain ' × '; the last two pieces are well formed
  return [parts.slice(0, -2).join(' × '), parts[parts.length - 2], parts[parts.length - 1]]
}

/* ------------------------------------------------------------------ TSV export */

/** Per-source columns for TSV downloads, in display order. */
export const TRIPOTHESIS_TSV_COLUMNS = [
  'rummagenePmcid', 'rummagenePaperTitle', 'rummageneGeneSet', 'rummageneTerm',
  'rummageoGse', 'rummageoTitle', 'rummageoGroupA', 'rummageoGroupB', 'rummageoDirection', 'rummageoTerm',
  'perturbseqrLibrary', 'perturbation', 'cellLine', 'tissue', 'timepoint', 'concentration',
  'perturbseqrDirection', 'perturbseqrTerm',
] as const

export type TripothesisTsvColumn = typeof TRIPOTHESIS_TSV_COLUMNS[number]

/** Tabs or newlines inside a value would break the TSV row. */
const tsvSafe = (value: string) => value.replace(/[\t\r\n]+/g, ' ')

/** `geoTitles` maps GEO accessions to study titles (see utils/geoTitles). */
export function tripothesisTsvRow(parsed: ParsedTripothesis | null, geoTitles: Record<string, string> = {}): Record<TripothesisTsvColumn, string> {
  const g = parsed?.rummagene, e = parsed?.rummageo, p = parsed?.perturbseqr
  const row: Record<TripothesisTsvColumn, string> = {
    rummagenePmcid: g?.pmcid ?? '',
    rummagenePaperTitle: g?.paperTitle ?? '',
    rummageneGeneSet: g?.tableLabel ?? '',
    rummageneTerm: g?.raw ?? '',
    rummageoGse: e?.accessions.join(',') ?? '',
    rummageoTitle: e?.accessions.map(acc => geoTitles[acc]).filter(Boolean).join(' | ') ?? '',
    rummageoGroupA: e ? e.groupALabel || `group ${e.groupA}` : '',
    rummageoGroupB: e ? e.groupBLabel || `group ${e.groupB}` : '',
    rummageoDirection: e?.direction ?? '',
    rummageoTerm: e?.raw ?? '',
    perturbseqrLibrary: p?.libraryLabel ?? '',
    perturbation: p?.perturbation ?? '',
    cellLine: p?.cellLine ?? '',
    tissue: p?.cellType ?? '',
    timepoint: p?.timepoint ?? '',
    concentration: p?.concentration ?? '',
    perturbseqrDirection: p?.direction ?? '',
    perturbseqrTerm: p?.raw ?? '',
  }
  for (const key of TRIPOTHESIS_TSV_COLUMNS) row[key] = tsvSafe(row[key])
  return row
}
