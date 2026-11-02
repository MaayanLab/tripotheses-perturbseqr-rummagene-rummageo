'use client'
import React from 'react'
import {
  FetchUserGeneSetQuery,
  useEnrichmentQueryQuery,
  useFetchGeneInfoQuery,
  useFetchUserGeneSetQuery,
  useOverlapQueryQuery,
  useViewGeneSetQuery
} from '@/graphql'
import Loading from '@/components/loading'
import Pagination from '@/components/pagination'
import useQsState from '@/utils/useQsState'
import GeneSetModal from '@/components/geneSetModal'
import * as array from '@/utils/array'

const pageSize = 10

type GeneSetModalT = {
  type: 'UserGeneSet',
  description: string,
  genes: string[],
} | {
  type: 'GeneSetOverlap',
  id: string,
  description: string,
  genes: string[]
} | {
  type: 'GeneSet',
  id: string,
  description: string,
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
  const { data: enrichmentResults, error } = useEnrichmentQueryQuery({
    skip: genes.length === 0,
    variables: { genes, filterTerm: term, offset: (page - 1) * pageSize, first: pageSize },
  })
  const results = enrichmentResults?.currentBackground?.enrich

  React.useEffect(() => { setRawTerm(term) }, [term])

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
        <a className="btn join-item" href={`/enrich/download?query=${queryId}&q=${encodeURIComponent(term)}`} download="results.tsv">
          Download
        </a>
      </form>
      <div className="overflow-x-auto">
        <table className="table table-xs">
          <thead>
            <tr>
              <th>Tripothesis title</th>
              <th>Description</th>
              <th>Gene Set Size</th>
              <th>Overlap</th>
              <th>Odds Ratio</th>
              <th>P-value</th>
              <th>Adjusted P-value</th>
            </tr>
          </thead>
          <tbody>
            {!results && !error ? <tr><td colSpan={7}><Loading /></td></tr> : null}
            {results?.nodes?.flatMap((result, resultIndex) =>
              result?.geneSets?.nodes?.map((geneSet, geneSetIndex) =>
                <tr key={`${resultIndex}-${geneSetIndex}-${geneSet.id}`}>
                  <td>
                    <button
                      className="link text-left"
                      onClick={() => {
                        setModalGeneSet({
                          type: 'GeneSet',
                          id: geneSet.id,
                          description: geneSet.title || geneSet.term || '',
                        })
                      }}
                    >{geneSet.title || geneSet.term}</button>
                  </td>
                  <td>{geneSet.description}</td>
                  <td>{geneSet.nGeneIds}</td>
                  <td>
                    <button
                      className="link"
                      onClick={() => {
                        setModalGeneSet({
                          type: 'GeneSetOverlap',
                          id: geneSet.id,
                          description: `${userGeneSet?.userGeneSet?.description || 'User gene set'} & ${geneSet.title || geneSet.term || 'Gene set'}`,
                          genes,
                        })
                      }}
                    >{result.nOverlap}</button>
                  </td>
                  <td>{result.oddsRatio?.toPrecision(3)}</td>
                  <td>{result.pvalue?.toPrecision(3)}</td>
                  <td>{result.adjPvalue?.toPrecision(3)}</td>
                </tr>
              ) ?? []
            )}
          </tbody>
        </table>
      </div>
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

function GeneSetModalWrapper(props: { modalGeneSet: GeneSetModalT, setModalGeneSet: React.Dispatch<React.SetStateAction<GeneSetModalT>> }) {
  const { data: geneSet } = useViewGeneSetQuery({
    skip: props.modalGeneSet?.type !== 'GeneSet',
    variables: props.modalGeneSet?.type === 'GeneSet' ? {
      id: props.modalGeneSet.id,
    } : undefined
  })
  const { data: overlap } = useOverlapQueryQuery({
    skip: props.modalGeneSet?.type !== 'GeneSetOverlap',
    variables: props.modalGeneSet?.type === 'GeneSetOverlap' ?  {
      id: props.modalGeneSet.id,
      genes: props.modalGeneSet?.genes,
    } : undefined,
  })
  const { data: userGeneSet } = useFetchGeneInfoQuery({
    skip: props.modalGeneSet?.type !== 'UserGeneSet',
    variables: props.modalGeneSet?.type === 'UserGeneSet' ? {
      genes: props.modalGeneSet.genes,
    } : undefined,
  })
  return (
    <GeneSetModal
      showModal={props.modalGeneSet !== undefined}
      term={props.modalGeneSet?.description}
      geneset={
        props.modalGeneSet?.type === 'GeneSet' ? geneSet?.geneSet?.genes.nodes
        : props.modalGeneSet?.type === 'GeneSetOverlap' ? overlap?.geneSet?.overlap.nodes
        : props.modalGeneSet?.type === 'UserGeneSet' ?
          userGeneSet?.geneMap?.nodes ? userGeneSet.geneMap.nodes.map(({ gene, geneInfo }) => ({gene, ...geneInfo}))
          : props.modalGeneSet.genes.map(symbol => ({ symbol }))
        : undefined
      }
      setShowModal={show => {
        if (!show) props.setModalGeneSet(undefined)
      }}
    />
  )
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
          htmlFor="geneSetModal"
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
