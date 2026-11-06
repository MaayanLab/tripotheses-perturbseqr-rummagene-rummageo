import React from 'react'
import { useTripothesisDetailQuery, useViewGeneSetQuery } from '@/graphql';
import GeneSetModal from '@/components/geneSetModal';
import useQsState from '@/utils/useQsState';
import Pagination from '@/components/pagination';
import blobTsv from '@/utils/blobTsv';
import clientDownloadBlob from '@/utils/clientDownloadBlob';
import { Direction, geoUrl, parseTripothesis, perturbseqrSearchUrl, pmcUrl, splitTitle } from '@/utils/tripothesisTerms'

const pageSize = 10

type TermRow = {
  id?: string
  term?: string | null
  title?: string | null
  description?: string | null
  nGeneIds?: number | null
  tripothesis?: { threeWayOverlapCount?: number | null; pValueConservative?: number | null } | null
}

// Very light tints of each source application's theme:
// RummaGene is monochrome (slate), RummaGEO is teal, Perturb-Seqr uses cyan for drug libraries.
const RG = 'bg-[#f3f4f6]'
const GEO = 'bg-[#e6f5f2]'
const PS = 'bg-[#e8f9fc]'

const formatP = (p: number | null | undefined) =>
  p == null ? '—' : p === 0 ? '< 5e-324' : p.toExponential(2)

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

function TripothesisRow({ row, onViewGenes }: { row: TermRow, onViewGenes: () => void }) {
  const { data } = useTripothesisDetailQuery({ variables: { id: row.id }, skip: !row.id })
  const parsed = React.useMemo(() => parseTripothesis(data?.geneSet?.tripothesis?.sourceRecord), [data])
  const fallback = splitTitle(row.title)
  const loading = <span className="text-gray-400">…</span>
  const g = parsed?.rummagene, e = parsed?.rummageo, p = parsed?.perturbseqr
  return (
    <tr>
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
      <td className="text-right tabular-nums">{row.tripothesis?.threeWayOverlapCount ?? row.nGeneIds ?? '—'}</td>
      <td className="text-right tabular-nums whitespace-nowrap">{formatP(row.tripothesis?.pValueConservative)}</td>
      <td>
        <button className="btn btn-xs btn-outline normal-case whitespace-nowrap" onClick={onViewGenes}>
          View ({row.nGeneIds})
        </button>
      </td>
    </tr>
  )
}

export default function TermTable({ terms }: { terms: TermRow[] }) {
  const [queryString, setQueryString] = useQsState({ page: '1', f: '' })
  const { page, searchTerm } = React.useMemo(() => ({ page: queryString.page ? +queryString.page : 1, searchTerm: queryString.f ?? '' }), [queryString])

  const dataFiltered = React.useMemo(() =>
    terms.filter(el => {
      return [el.title, el.term].some(value => value?.toLowerCase().includes(searchTerm.toLowerCase()))
    }),
  [terms, searchTerm])

  const [geneSetId, setGeneSetId] = React.useState(terms[0].id)
  const [currTerm, setCurrTerm] = React.useState(terms[0].title || terms[0].term)
  const [showModal, setShowModal] = React.useState(false)

  const genesQuery = useViewGeneSetQuery({
    variables: { id: geneSetId }
  })

  return (
    <>
      <GeneSetModal geneset={genesQuery?.data?.geneSet?.genes.nodes} term={currTerm} showModal={showModal} setShowModal={setShowModal}></GeneSetModal>
      <div className='border m-5 mt-1'>
        <div className='join flex flex-row place-content-end items-center pt-3 pr-3'>
          <span className="label-text text-base">Search:&nbsp;</span>
          <input
            type="text"
            aria-label="Filter Tripothesis titles"
            className="input input-bordered"
            value={searchTerm}
            onChange={evt => {
              setQueryString({ page: '1', f: evt.currentTarget.value })
            }}
          />
          <div className="tooltip" data-tip="Clear search">
            <button
              type="reset"
              className="btn join-item"
              onClick={() => {
                setQueryString({ page: '1', f: '' })
              }}
            >&#x232B;</button>
          </div>
          <div className="tooltip" data-tip="Download results">
            <button
              type="button"
              className="btn join-item font-bold text-2xl pb-1"
              onClick={() => {
                if (!dataFiltered) return
                const blob = blobTsv(['tripothesisId', 'rummagene', 'rummageo', 'perturbseqr', 'nGenes', 'intersectionCount', 'crossingPvalue'], dataFiltered, item => {
                  const parts = splitTitle(item.title)
                  return {
                    tripothesisId: item.term,
                    rummagene: parts?.[0] ?? item.title,
                    rummageo: parts?.[1] ?? '',
                    perturbseqr: parts?.[2] ?? '',
                    nGenes: item.nGeneIds,
                    intersectionCount: item.tripothesis?.threeWayOverlapCount ?? item.nGeneIds,
                    crossingPvalue: item.tripothesis?.pValueConservative,
                  }
                })
                clientDownloadBlob(blob, 'results.tsv')
              }}
            >&#x21E9;</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table table-xs [&_th]:px-2 [&_td]:px-2">
            <thead>
              <tr>
                <th colSpan={3} className={`${RG} text-center border-b`}>RummaGene</th>
                <th colSpan={3} className={`${GEO} text-center border-b`}>RummaGEO</th>
                <th colSpan={5} className={`${PS} text-center border-b`}>Perturb-Seqr</th>
                <th colSpan={3}></th>
              </tr>
              <tr>
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
                <th className="text-right" title="Number of genes shared by all three source sets">Overlap</th>
                <th className="text-right" title="Conservative raw p-value for the three-way crossing">P-value</th>
                <th>Genes</th>
              </tr>
            </thead>
            <tbody>
              {dataFiltered?.slice((page-1) * pageSize, page * pageSize).map(el => (
                <TripothesisRow
                  key={el.id}
                  row={el}
                  onViewGenes={() => {
                    setCurrTerm(el.title || el.term || '')
                    setGeneSetId(el?.id || '')
                    setShowModal(true)
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex flex-col items-center">
        <Pagination
          page={page}
          pageSize={pageSize}
          totalCount={dataFiltered?.length}
          onChange={newPage => {setQueryString({ page: `${newPage}` })}}
        />
      </div>
    </>
  )
}
