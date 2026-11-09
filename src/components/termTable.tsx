import React from 'react'
import { useViewGeneSetQuery } from '@/graphql';
import GeneSetModal from '@/components/geneSetModal';
import useQsState from '@/utils/useQsState';
import Pagination from '@/components/pagination';
import { SourceCells, SourceColumnHeaders, SourceGroupHeaders, tripothesisTableClass } from '@/components/tripothesisSourceColumns'

const pageSize = 10

type TermRow = {
  id?: string
  term?: string | null
  title?: string | null
  description?: string | null
  nGeneIds?: number | null
  tripothesis?: { threeWayOverlapCount?: number | null; pValueConservative?: number | null } | null
}

const formatP = (p: number | null | undefined) =>
  p == null ? '—' : p === 0 ? '< 5e-324' : p.toExponential(2)

function TripothesisRow({ row, onViewGenes }: { row: TermRow, onViewGenes: () => void }) {
  return (
    <tr>
      <SourceCells id={row.id} title={row.title} />
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
            <a
              className="btn join-item font-bold text-2xl pb-1"
              href={`/term-search/download?q=${encodeURIComponent(queryString.q ?? '')}&f=${encodeURIComponent(searchTerm)}`}
              download="results.tsv"
            >&#x21E9;</a>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className={tripothesisTableClass}>
            <thead>
              <SourceGroupHeaders extraColumns={3} />
              <tr>
                <SourceColumnHeaders />
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
