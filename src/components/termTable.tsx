import React from 'react'
import useQsState from '@/utils/useQsState';
import Pagination from '@/components/pagination';
import { formatPValue } from '@/utils/tripothesisTerms';
import { RowActions, ScrollTable, SourceCells, SourceColumnHeaders, SourceGroupHeaders, tripothesisTableClass } from '@/components/tripothesisSourceColumns'

const pageSize = 10

type TermRow = {
  id?: string
  term?: string | null
  title?: string | null
  description?: string | null
  nGeneIds?: number | null
  tripothesis?: { threeWayOverlapCount?: number | null; pValueConservative?: number | null } | null
}

function TripothesisRow({ row }: { row: TermRow }) {
  return (
    <tr>
      <SourceCells id={row.id} title={row.title} />
      <td className="text-right tabular-nums">{row.tripothesis?.threeWayOverlapCount ?? row.nGeneIds ?? '—'}</td>
      <td className="text-right tabular-nums whitespace-nowrap">{formatPValue(row.tripothesis?.pValueConservative)}</td>
      <td>{row.id ? <RowActions id={row.id} title={row.title ?? row.term} /> : null}</td>
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


  return (
    <>
      <div className='border mt-1 mb-3'>
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
        <ScrollTable>
          <table className={tripothesisTableClass}>
            <thead>
              <SourceGroupHeaders extraColumns={3} />
              <tr>
                <SourceColumnHeaders />
                <th className="text-right" title="Number of genes shared by all three source sets">Overlap</th>
                <th className="text-right" title="Conservative raw p-value for the three-way crossing">P-value</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {dataFiltered?.slice((page-1) * pageSize, page * pageSize).map(el => (
                <TripothesisRow key={el.id} row={el} />
              ))}
            </tbody>
          </table>
        </ScrollTable>
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
