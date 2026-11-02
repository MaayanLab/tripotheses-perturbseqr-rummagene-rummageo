import React from 'react'
import { useViewGeneSetQuery } from '@/graphql';
import GeneSetModal from '@/components/geneSetModal';
import useQsState from '@/utils/useQsState';
import Pagination from '@/components/pagination';
import blobTsv from '@/utils/blobTsv';
import clientDownloadBlob from '@/utils/clientDownloadBlob';

const pageSize = 10

export default function TermTable({ terms }: { terms: { id?: string; term?: string | null; title?: string | null; description?: string | null; nGeneIds?: number | null; tripothesis?: { threeWayOverlapCount?: number | null; pValueConservative?: number | null } | null }[] }) {
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
          <div className="tooltip" data-tip="Search results">
            <button
              type="submit"
              className="btn join-item"
            >&#x1F50D;</button>
          </div>
          <div className="tooltip" data-tip="Clear search">
            <button
              type="reset"
              className="btn join-item"
              onClick={evt => {
                setQueryString({ page: '1', f: '' })
              }}
            >&#x232B;</button>
          </div>
          <div className="tooltip" data-tip="Download results">
            <button
              type="button"
              className="btn join-item font-bold text-2xl pb-1"
              onClick={evt => {
                if (!dataFiltered) return
                const blob = blobTsv(['term', 'tripothesisId', 'description', 'nGenes', 'intersectionCount', 'crossingPvalue'], dataFiltered, item => ({
                  term: item.title || item.term,
                  tripothesisId: item.term,
                  description: item.description,
                  nGenes: item.nGeneIds,
                  intersectionCount: item.tripothesis?.threeWayOverlapCount ?? item.nGeneIds,
                  crossingPvalue: item.tripothesis?.pValueConservative,
                }))
                clientDownloadBlob(blob, 'results.tsv')
              }}
            >&#x21E9;</button>
          </div>
        </div>
        <table className="table table-xs table-pin-cols table-auto">
          <thead>
            <tr>
              <th>Tripothesis title</th>
              <th className="text-right" title="Number of genes shared by all three source sets">Intersection size</th>
              <th className="text-right" title="Conservative raw p-value for the three-way crossing">Crossing p-value (raw)</th>
              <th>Gene Set</th>
            </tr>
          </thead>
          <tbody>
            {dataFiltered?.slice((page-1) * pageSize, page * pageSize).map(el => {
              return (
                <tr key={el?.id} className={"hover:bg-gray-100 dark:hover:bg-gray-700"}>
                  <td className="break-words">{el.title || el.term}</td>
                  <td className="text-right tabular-nums">{el.tripothesis?.threeWayOverlapCount ?? el.nGeneIds ?? '—'}</td>
                  <td className="text-right tabular-nums whitespace-nowrap">{el.tripothesis?.pValueConservative == null ? '—' : el.tripothesis.pValueConservative === 0 ? '< 5e-324' : el.tripothesis.pValueConservative.toExponential(2)}</td>
                  <td className='w-3/12'>
                    <button
                      className='btn btn-xs btn-outline p-2 h-auto'
                      data-te-toggle="modal"
                      data-te-target="#geneSetModal"
                      data-te-ripple-init
                      data-te-ripple-color="light"
                      onClick={evt => {
                        setCurrTerm(el.title || el.term || '')
                        setGeneSetId(el?.id || '')
                        setShowModal(true)
                      }}
                    ><p>View Gene Set ({el?.nGeneIds})</p>
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
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
