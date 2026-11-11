import React from 'react'
import { useTripothesisDetailQuery } from '@/graphql'
import useGeoTitles from '@/utils/useGeoTitles'
import { OverlappingGenesModal, SourceGeneSetModal } from '@/components/tripothesisGenes'
import TripothesisDetailsModal, { ExternalLink } from '@/components/tripothesisDetails'
import { Direction, geoUrl, parseTripothesis, perturbseqrSearchUrl, pmcUrl, splitTitle } from '@/utils/tripothesisTerms'

/**
 * The per-source columns shared by every Tripothesis table (term search, enrichment):
 * RummaGene, RummaGEO and Perturb-Seqr. Tables render these and append their own
 * statistics columns.
 */

// Very light tints of each source application's theme:
// RummaGene is monochrome (slate), RummaGEO is teal, Perturb-Seqr uses cyan for drug libraries.
// Even rows use a slightly darker shade so rows are easy to follow across the table.
const RG = 'bg-[#f3f4f6] [tr:nth-child(even)>&]:bg-[#e7e9ec]'
const GEO = 'bg-[#e6f5f2] [tr:nth-child(even)>&]:bg-[#d6eee9]'
const PS = 'bg-[#e8f9fc] [tr:nth-child(even)>&]:bg-[#d6f2f8]'

export const SOURCE_COLUMN_COUNT = 12

/** Pass to the <table> className for consistent padding. */
export const tripothesisTableClass = [
  'table table-xs [&_th]:px-1.5 [&_th]:whitespace-nowrap [&_td]:px-1.5 [&_td]:py-1 [&_td]:leading-tight',
  '[&_tbody_tr]:border-b [&_tbody_tr]:border-gray-300 [&_tbody_tr:nth-child(even)]:bg-[#f5f6f7]',
].join(' ')

const dir = (d: Direction) => d === 'up' ? 'Up' : d === 'down' ? 'Down' : 'N/A'

function Ext({ href, children }: { href: string, children: React.ReactNode }) {
  return <ExternalLink href={href} className="link link-neutral hover:link-hover">{children}</ExternalLink>
}

/** Up to two lines, then "…"; full text on hover. */
function Clamp({ text, title }: { text: string, title?: string }) {
  return <span className="line-clamp-2" title={title ?? text}>{text || 'N/A'}</span>
}

/** One line, then "…"; full text on hover. The cell needs a max width. */
function Trunc({ text, children }: { text: string, children?: React.ReactNode }) {
  return <span className="block truncate" title={text}>{children ?? (text || 'N/A')}</span>
}

const rowButtonClass = 'btn btn-outline normal-case whitespace-nowrap h-5 min-h-0 px-1.5 text-[0.65rem] leading-none'

/** Compact table button that opens a modal; the modal is mounted only while open. */
function ModalButton({ label, modal }: { label: string, modal: (onClose: () => void) => React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <button className={rowButtonClass} onClick={() => setOpen(true)}>{label}</button>
      {open ? modal(() => setOpen(false)) : null}
    </>
  )
}

/** GEO group descriptions share most words; keep only the words that distinguish each group. */
function comparison(a: string, b: string) {
  const words = (s: string) => s.split(/\s+/).filter(Boolean)
  const setA = new Set(words(a).map(w => w.toLowerCase())), setB = new Set(words(b).map(w => w.toLowerCase()))
  const onlyA = words(a).filter(w => !setB.has(w.toLowerCase())).join(' ')
  const onlyB = words(b).filter(w => !setA.has(w.toLowerCase())).join(' ')
  return `${onlyA || a} vs ${onlyB || b}`
}

function GeneSetButton({ source, term, label }: { source?: string, term?: string, label: string }) {
  if (!source || !term) return null
  return <ModalButton label="View Gene Set" modal={onClose => <SourceGeneSetModal source={source} term={term} label={label} onClose={onClose} />} />
}

/** First header row: one cell per source, followed by a blank cell spanning the table's own columns. */
export function SourceGroupHeaders({ extraColumns }: { extraColumns: number }) {
  return (
    <tr>
      <th colSpan={3} className={`${RG} text-center border-b`}>RummaGene</th>
      <th colSpan={3} className={`${GEO} text-center border-b`}>RummaGEO</th>
      <th colSpan={6} className={`${PS} text-center border-b`}>Perturb-Seqr</th>
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
      <th className={GEO}>Study</th>
      <th className={GEO}>Comparison</th>
      <th className={GEO}>Direction</th>
      <th className={PS}>Library</th>
      <th className={PS}>Perturbation</th>
      <th className={PS}>Cell Line</th>
      <th className={PS} title="Timepoint">Time</th>
      <th className={PS} title="Concentration">Conc.</th>
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
  const geoTitles = useGeoTitles(e?.accessions)
  return (
    <>
      <td className={RG}>
        <div>{g ? <Ext href={pmcUrl(g.pmcid)}>{g.pmcid}</Ext> : loading}</div>
        <GeneSetButton source={parsed?.sources[0]} term={g?.raw} label="RummaGene" />
      </td>
      <td className={`${RG} max-w-[150px]`}><Clamp text={g ? g.paperTitle : fallback?.[0] ?? ''} /></td>
      <td className={`${RG} max-w-[120px]`}>{g ? <Clamp text={g.tableLabel} /> : loading}</td>
      <td className={`${GEO} min-w-[140px] max-w-[180px]`}>
        {e ? <>
          <Trunc text={e.accessions.map(acc => geoTitles[acc.toUpperCase()] ?? acc).join('; ')} />
          <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
            {e.accessions.map(acc => <Ext key={acc} href={geoUrl(acc)}>{acc}</Ext>)}
            <GeneSetButton source={parsed?.sources[1]} term={e.raw} label="RummaGEO" />
          </div>
        </> : loading}
      </td>
      <td className={`${GEO} max-w-[150px]`}>
        {e
          ? (e.groupALabel && e.groupBLabel
            ? <Clamp text={comparison(e.groupALabel, e.groupBLabel)} title={`${e.groupALabel}\nvs\n${e.groupBLabel}`} />
            : `group ${e.groupA} vs group ${e.groupB}`)
          : <Clamp text={fallback?.[1] ?? ''} />}
      </td>
      <td className={GEO}>{e ? dir(e.direction) : loading}</td>
      <td className={`${PS} max-w-[110px]`}>
        {p ? <Trunc text={p.libraryLabel || 'N/A'} /> : loading}
        <GeneSetButton source={parsed?.sources[2]} term={p?.raw} label="Perturb-Seqr" />
      </td>
      <td className={`${PS} max-w-[120px]`}>
        {p
          ? <span className="line-clamp-2" title={p.perturbation}><Ext href={perturbseqrSearchUrl(p.perturbation)}>{p.perturbation}</Ext></span>
          : <Clamp text={fallback?.[2] ?? ''} />}
      </td>
      <td className={`${PS} max-w-[90px]`}>{p ? <Clamp text={p.cellLine || 'N/A'} /> : loading}</td>
      <td className={`${PS} whitespace-nowrap`}>{p ? p.timepoint || 'N/A' : loading}</td>
      <td className={`${PS} whitespace-nowrap`}>{p ? p.concentration || 'N/A' : loading}</td>
      <td className={PS}>{p ? dir(p.direction) : loading}</td>
    </>
  )
}

/** Horizontal scroll container that shows a hint and an edge fade while columns are hidden to the right. */
export function ScrollTable({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [more, setMore] = React.useState(false)
  const update = React.useCallback(() => {
    const el = ref.current
    if (el) setMore(el.scrollWidth - el.clientWidth - el.scrollLeft > 4)
  }, [])
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    return () => observer.disconnect()
  }, [update])
  return (
    <div className="relative">
      <div className={`text-right text-xs text-gray-500 pb-1 ${more ? '' : 'invisible'}`}>Scroll for more columns &rarr;</div>
      <div ref={ref} className="overflow-x-auto" onScroll={update}>{children}</div>
      {more ? <div className="pointer-events-none absolute right-0 top-5 bottom-0 w-12 bg-gradient-to-l from-gray-400/40 to-transparent" /> : null}
    </div>
  )
}

/** Last cell of a Tripothesis row: overlapping genes and details. */
export function RowActions({ id, title }: { id: string, title?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <ModalButton label="Overlapping Genes" modal={onClose => <OverlappingGenesModal id={id} onClose={onClose} />} />
      <ModalButton label="Details" modal={onClose => <TripothesisDetailsModal id={id} title={title} onClose={onClose} />} />
    </div>
  )
}
