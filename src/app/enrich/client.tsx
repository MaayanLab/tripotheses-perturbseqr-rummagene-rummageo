'use client'
import React from 'react'
import {
  FetchUserGeneSetQuery,
  useEnrichmentQueryQuery,
  useFetchUserGeneSetQuery,
  useOverlapQueryQuery,
} from '@/graphql'
import Loading from '@/components/loading'
import Pagination from '@/components/pagination'
import useQsState from '@/utils/useQsState'
import { GeneListModal, useGeneRows } from '@/components/tripothesisGenes'
import * as array from '@/utils/array'
import { RowActions, SOURCE_COLUMN_COUNT, ScrollTable, SourceCells, SourceColumnHeaders, SourceGroupHeaders, tripothesisTableClass } from '@/components/tripothesisSourceColumns'

const pageSize = 10
const statColumnCount = 5

type GeneSetModalT = {
  type: 'UserGeneSet',
  description: string,
  genes: string[],
} | {
  type: 'GeneSetOverlap',
  id: string,
  description: string,
  genes: string[]
} | undefined


function EnrichmentResults({ queryId, userGeneSet, setModalGeneSet }: { queryId?: string, userGeneSet?: FetchUserGeneSetQuery, setModalGeneSet: React.Dispatch<React.SetStateAction<GeneSetModalT>> }) {
  const genes = React.useMemo(() =>
    array.ensure(userGeneSet?.userGeneSet?.genes).filter((gene): gene is string => !!gene).map(gene => gene.toUpperCase()),
    [userGeneSet]
  )
  const [queryString, setQueryString] = useQsState({ page: '1', q: '' })
  const [rawTerm, setRawTerm] = React.useState('')
  const { page, term } = React.useMemo(
    () => ({ page: queryString.page ? +queryString.page : 1, term: queryString.q ?? '' }),
    [queryString]
  )
  const { data: enrichmentResults, loading, error } = useEnrichmentQueryQuery({
    skip: genes.length === 0,
    variables: { genes, filterTerm: term, offset: (page - 1) * pageSize, first: pageSize },
  })
  const results = enrichmentResults?.currentBackground?.enrich

  React.useEffect(() => { setRawTerm(term) }, [term])

  if (!loading && enrichmentResults?.currentBackground === null) {
    return <div className="flex flex-col gap-2 my-2" role="status">
      <h2 className="text-md font-bold">Crossings are not loaded yet.</h2>
      <p>Crossings are still being generated; enrichment is not available yet.</p>
    </div>
  }

  return (
    <div className="flex flex-col gap-2 my-2">
      <h2 className="text-md font-bold">
        {results ? `${Intl.NumberFormat('en-US').format(results.totalCount ?? 0)} statistically significant matches.` : 'Running enrichment analysis.'}
      </h2>
      {error ? <p role="alert">{error.message}</p> : null}
      <form
        className="join flex flex-row place-content-end place-items-center"
        onSubmit={event => {
          event.preventDefault()
          setQueryString({ page: '1', q: rawTerm })
        }}
      >
        <input
          aria-label="Filter terms"
          type="text"
          className="input input-bordered join-item"
          value={rawTerm}
          onChange={event => { setRawTerm(event.currentTarget.value) }}
        />
        <button type="submit" className="btn btn-primary join-item">Search</button>
        <button
          type="reset"
          className="btn join-item"
          onClick={() => { setQueryString({ page: '1', q: '' }) }}
        >Clear</button>
        {results ? <a className="btn join-item" href={`/enrich/download?query=${queryId}&q=${encodeURIComponent(term)}`} download="results.tsv">
          Download
        </a> : null}
      </form>
      <ScrollTable>
        <table className={tripothesisTableClass}>
          <thead>
            <SourceGroupHeaders extraColumns={statColumnCount} />
            <tr>
              <SourceColumnHeaders />
              <th className="text-right" title="Input genes found in the Tripothesis gene set, out of its size">Overlap</th>
              <th className="text-right" title="Odds Ratio">OR</th>
              <th className="text-right">P-value</th>
              <th className="text-right" title="Adjusted P-value">Adj. P-value</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!results && !error ? <tr><td colSpan={SOURCE_COLUMN_COUNT + statColumnCount}><Loading /></td></tr> : null}
            {results?.nodes?.flatMap((result, resultIndex) =>
              result?.geneSets?.nodes?.map((geneSet, geneSetIndex) =>
                <tr key={`${resultIndex}-${geneSetIndex}-${geneSet.id}`}>
                  <SourceCells id={geneSet.id} title={geneSet.title} />
                  <td className="text-right tabular-nums whitespace-nowrap">
                    <button
                      className="link"
                      title="View the overlapping genes"
                      onClick={() => {
                        setModalGeneSet({
                          type: 'GeneSetOverlap',
                          id: geneSet.id,
                          description: `${userGeneSet?.userGeneSet?.description || 'User gene set'} & ${geneSet.title || geneSet.term || 'Gene set'}`,
                          genes,
                        })
                      }}
                    >{result.nOverlap}</button>
                    <span className="text-gray-500"> of {geneSet.nGeneIds}</span>
                  </td>
                  <td className="text-right tabular-nums">{result.oddsRatio?.toPrecision(3)}</td>
                  <td className="text-right tabular-nums whitespace-nowrap">{result.pvalue?.toPrecision(3)}</td>
                  <td className="text-right tabular-nums whitespace-nowrap">{result.adjPvalue?.toPrecision(3)}</td>
                  <td>
                    <RowActions id={geneSet.id} title={geneSet.title ?? geneSet.term} />
                  </td>
                </tr>
              ) ?? []
            )}
          </tbody>
        </table>
      </ScrollTable>
      {results ?
        <div className="w-full flex flex-col items-center">
          <Pagination
            page={page}
            totalCount={results.totalCount ?? undefined}
            pageSize={pageSize}
            onChange={newPage => {
              setQueryString({ page: `${newPage}`, q: term })
            }}
          />
        </div>
      : null}
    </div>
  )
}

function InputGenesModal({ genes, description, onClose }: { genes: string[], description: string, onClose: () => void }) {
  return <GeneListModal title="Input Gene Set" subtitle={description} genes={useGeneRows(genes)} name={description} onClose={onClose} />
}

function InputOverlapModal({ id, genes, description, onClose }: { id: string, genes: string[], description: string, onClose: () => void }) {
  const { data } = useOverlapQueryQuery({ variables: { id, genes } })
  return <GeneListModal title="Input Overlap" subtitle={description} genes={data?.geneSet?.overlap.nodes} name={description} onClose={onClose} />
}

function GeneSetModalWrapper({ modalGeneSet, setModalGeneSet }: { modalGeneSet: GeneSetModalT, setModalGeneSet: React.Dispatch<React.SetStateAction<GeneSetModalT>> }) {
  const onClose = () => setModalGeneSet(undefined)
  if (modalGeneSet?.type === 'UserGeneSet') return <InputGenesModal {...modalGeneSet} onClose={onClose} />
  if (modalGeneSet?.type === 'GeneSetOverlap') return <InputOverlapModal {...modalGeneSet} onClose={onClose} />
  return null
}

export default function EnrichClientPage({
  searchParams
}: {
  searchParams: {
    query: string | string[] | undefined
  }
}) {
  const queryId = array.ensure(searchParams.query)[0]
  const { data: userGeneSet } = useFetchUserGeneSetQuery({
    skip: !queryId,
    variables: { id: queryId },
  })
  const [modalGeneSet, setModalGeneSet] = React.useState<GeneSetModalT>()
  return (
    <>
      <div className="flex flex-row gap-2 alert">
        <span className="prose">Input:</span>
        <label
          className="prose underline cursor-pointer"
          onClick={evt => {
            setModalGeneSet({
              type: 'UserGeneSet',
              genes: (userGeneSet?.userGeneSet?.genes ?? []).filter((gene): gene is string => !!gene),
              description: userGeneSet?.userGeneSet?.description || 'Gene set',
            })
          }}
        >{userGeneSet?.userGeneSet?.description || 'Gene set'}{userGeneSet ? <> ({userGeneSet?.userGeneSet?.genes?.length ?? '?'} genes)</> : null}</label>
      </div>
      <EnrichmentResults queryId={queryId} userGeneSet={userGeneSet} setModalGeneSet={setModalGeneSet} />
      <GeneSetModalWrapper modalGeneSet={modalGeneSet} setModalGeneSet={setModalGeneSet} />
    </>
  )
}
