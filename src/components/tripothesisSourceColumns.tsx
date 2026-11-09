import React from 'react'
import { useTripothesisDetailQuery } from '@/graphql'
import { Direction, geoUrl, parseTripothesis, perturbseqrSearchUrl, pmcUrl, splitTitle } from '@/utils/tripothesisTerms'

/**
 * The per-source columns shared by every Tripothesis table (term search, enrichment):
 * RummaGene, RummaGEO and Perturb-Seqr. Tables render these and append their own
 * statistics columns.
 */

// Very light tints of each source application's theme:
// RummaGene is monochrome (slate), RummaGEO is teal, Perturb-Seqr uses cyan for drug libraries.
const RG = 'bg-[#f3f4f6]'
const GEO = 'bg-[#e6f5f2]'
const PS = 'bg-[#e8f9fc]'

export const SOURCE_COLUMN_COUNT = 11

/** Pass to the <table> className for consistent padding. */
export const tripothesisTableClass = 'table table-xs [&_th]:px-2 [&_td]:px-2'

const dir = (d: Direction) => d === 'up' ? 'Up' : d === 'down' ? 'Down' : 'N/A'

function Link({ href, children }: { href: string, children: React.ReactNode }) {
  return <a className="link link-neutral hover:link-hover" href={href} target="_blank" rel="noreferrer">{children}</a>
}

function Clamp({ text, title }: { text: string, title?: string }) {
  return <span className="line-clamp-2" title={title ?? text}>{text || 'N/A'}</span>
}

/** GEO group descriptions share most words; keep only the words that distinguish each group. */
function comparison(a: string, b: string) {
  const words = (s: string) => s.split(/\s+/).filter(Boolean)
  const setA = new Set(words(a).map(w => w.toLowerCase())), setB = new Set(words(b).map(w => w.toLowerCase()))
  const onlyA = words(a).filter(w => !setB.has(w.toLowerCase())).join(' ')
  const onlyB = words(b).filter(w => !setA.has(w.toLowerCase())).join(' ')
  return `${onlyA || a} vs ${onlyB || b}`
}

/** First header row: one cell per source, followed by a blank cell spanning the table's own columns. */
export function SourceGroupHeaders({ extraColumns }: { extraColumns: number }) {
  return (
    <tr>
      <th colSpan={3} className={`${RG} text-center border-b`}>RummaGene</th>
      <th colSpan={3} className={`${GEO} text-center border-b`}>RummaGEO</th>
      <th colSpan={5} className={`${PS} text-center border-b`}>Perturb-Seqr</th>
      {extraColumns > 0 ? <th colSpan={extraColumns}></th> : null}
    </tr>
  )
}

/** Second header row cells for the source columns; place inside the table's own <tr>. */
export function SourceColumnHeaders() {
  return (
    <>
      <th className={RG}>Paper</th>
      <th className={RG}>Title</th>
      <th className={RG}>Gene Set</th>
      <th className={GEO}>GEO Series</th>
      <th className={GEO}>Comparison</th>
      <th className={GEO}>Direction</th>
      <th className={PS}>Perturbation</th>
      <th className={PS}>Cell Line</th>
      <th className={PS}>Timepoint</th>
      <th className={PS}>Concentration</th>
      <th className={PS}>Direction</th>
    </>
  )
}

/** Source cells for one Tripothesis gene set; place inside the table's own <tr>. */
export function SourceCells({ id, title }: { id?: string, title?: string | null }) {
  const { data } = useTripothesisDetailQuery({ variables: { id }, skip: !id })
  const parsed = React.useMemo(() => parseTripothesis(data?.geneSet?.tripothesis?.sourceRecord), [data])
  const fallback = splitTitle(title)
  const loading = <span className="text-gray-400">…</span>
  const g = parsed?.rummagene, e = parsed?.rummageo, p = parsed?.perturbseqr
  return (
    <>
      <td className={RG}>{g ? <Link href={pmcUrl(g.pmcid)}>{g.pmcid}</Link> : loading}</td>
      <td className={`${RG} max-w-[220px]`}><Clamp text={g ? g.paperTitle : fallback?.[0] ?? ''} /></td>
      <td className={`${RG} max-w-[140px]`}>{g ? <Clamp text={g.tableLabel} /> : loading}</td>
      <td className={GEO}>{e ? e.accessions.map(acc => <div key={acc}><Link href={geoUrl(acc)}>{acc}</Link></div>) : loading}</td>
      <td className={`${GEO} max-w-[260px]`}>
        {e
          ? (e.groupALabel && e.groupBLabel
            ? <Clamp text={comparison(e.groupALabel, e.groupBLabel)} title={`${e.groupALabel}\nvs\n${e.groupBLabel}`} />
            : `group ${e.groupA} vs group ${e.groupB}`)
          : <Clamp text={fallback?.[1] ?? ''} />}
      </td>
      <td className={GEO}>{e ? dir(e.direction) : loading}</td>
      <td className={`${PS} max-w-[140px]`}>{p ? <Link href={perturbseqrSearchUrl(p.perturbation)}>{p.perturbation}</Link> : <Clamp text={fallback?.[2] ?? ''} />}</td>
      <td className={PS}>{p ? p.cellLine || 'N/A' : loading}</td>
      <td className={PS}>{p ? p.timepoint || 'N/A' : loading}</td>
      <td className={`${PS} whitespace-nowrap`}>{p ? p.concentration || 'N/A' : loading}</td>
      <td className={PS}>{p ? dir(p.direction) : loading}</td>
    </>
  )
}
