import React from 'react'
import classNames from 'classnames'
import { useRouter } from 'next/navigation'
import { useAddUserGeneSetMutation, useFetchGeneInfoQuery, useSourceGeneSetQuery, useViewGeneSetQuery } from '@/graphql'
import blobTsv from '@/utils/blobTsv'
import clientDownloadBlob from '@/utils/clientDownloadBlob'
import TripothesisModal from '@/components/tripothesisModal'

export type GeneRow = { symbol: string, ncbiGeneId?: number | null, description?: string | null, summary?: string | null }

function ExpandableText({ text }: { text: string }) {
  const [more, setMore] = React.useState(false)
  if (!text) return null
  return (
    <>
      {more ? text : text.split('. ')[0]}
      &nbsp;
      <button className="text-blue-500" onClick={() => setMore(m => !m)}>{more ? 'Show Less' : 'Show More'}</button>
    </>
  )
}

/** Copy-to-clipboard button with a green confirmation flash (as in Perturb-Seqr). */
function CopyButton({ label, text }: { label: string, text: string }) {
  return (
    <button
      className="btn btn-sm btn-outline text-xs transition-colors duration-500"
      type="button"
      onClick={evt => {
        const button = evt.currentTarget
        const prev = button.style.backgroundColor
        button.style.backgroundColor = 'green'
        setTimeout(() => { button.style.backgroundColor = prev }, 500)
        navigator.clipboard.writeText(text)
      }}
    >{label}</button>
  )
}

/** Symbols with whatever gene info has been ingested; symbols without info are kept. */
export function useGeneRows(symbols: string[] | undefined): GeneRow[] | undefined {
  const { data } = useFetchGeneInfoQuery({ variables: { genes: symbols ?? [] }, skip: !symbols?.length })
  return React.useMemo(() => {
    if (!symbols) return undefined
    const info = new Map((data?.geneMap?.nodes ?? []).map(node => [(node.gene ?? '').toUpperCase(), node.geneInfo]))
    return symbols.map(symbol => ({ ...info.get(symbol.toUpperCase()), symbol }))
  }, [symbols, data])
}

/**
 * A gene set as a Symbol / Description / Summary table with download, copy and enrich actions,
 * as in Perturb-Seqr's gene set modal. `genes` undefined means loading.
 */
export function GeneListModal({ title, subtitle, genes, name, onClose }: {
  title: string, subtitle?: string | null, genes: GeneRow[] | undefined, name: string, onClose: () => void,
}) {
  const router = useRouter()
  const [addUserGeneSet, mutation] = useAddUserGeneSetMutation()
  const symbols = (genes ?? []).map(gene => gene.symbol)
  return (
    <TripothesisModal title={genes ? `${title} (${genes.length})` : title} subtitle={subtitle} onClose={onClose}>
      <div className="p-2 text-slate-500 text-sm leading-relaxed overflow-auto flex-grow min-h-0">
        {!genes ? <div className="flex justify-center"><span className="loading loading-ring w-24"></span></div>
          : !genes.length ? <p className="text-center text-gray-400 p-4">No genes found.</p>
          : (
            <table className="table table-xs table-pin-rows">
              <thead className="bg-white sticky top-0"><tr><th>Symbol</th><th>Description</th><th>Summary</th></tr></thead>
              <tbody>
                {genes.map(gene => (
                  <tr key={gene.symbol}>
                    <td className="font-bold">
                      {gene.symbol}
                      {gene.ncbiGeneId
                        ? <a href={`https://www.ncbi.nlm.nih.gov/gene/${gene.ncbiGeneId}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 ml-1 font-normal">(NCBI)</a>
                        : null}
                    </td>
                    <td>{gene.description ?? ''}</td>
                    <td><ExpandableText text={gene.summary ?? ''} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
      <div className="flex flex-wrap items-center justify-end border-t border-solid border-slate-200 flex-shrink-0 gap-2 p-3">
        <button
          className="btn btn-sm btn-outline text-xs"
          type="button"
          disabled={!genes}
          onClick={() => clientDownloadBlob(blobTsv(['symbol', 'description', 'summary'], genes ?? [], ({ symbol, description, summary }) => ({ symbol, description, summary })), `${name}.tsv`)}
        >Download Table</button>
        <CopyButton label="Copy Symbols to Clipboard" text={symbols.join('\n')} />
        <button
          className="btn btn-sm btn-outline text-xs"
          type="button"
          disabled={!symbols.length}
          onClick={async () => {
            const result = await addUserGeneSet({ variables: { genes: symbols, description: subtitle ?? name } }).catch(() => undefined)
            const queryId = result?.data?.addUserGeneSet?.userGeneSet?.id
            if (queryId) {
              onClose()
              router.push(`/enrich?query=${queryId}`)
            }
          }}
        >Enrich these genes</button>
        <span className={classNames('loading w-6', { hidden: !mutation.loading })}></span>
        {mutation.error ? <div className="alert alert-error">{mutation.error.message}</div> : null}
      </div>
    </TripothesisModal>
  )
}

/** Genes shared by all three source gene sets of a Tripothesis. */
export function OverlappingGenesModal({ id, onClose }: { id: string, onClose: () => void }) {
  const { data } = useViewGeneSetQuery({ variables: { id } })
  const geneSet = data?.geneSet
  const genes = React.useMemo(
    () => geneSet ? [...geneSet.genes.nodes].sort((a, b) => a.symbol.localeCompare(b.symbol)) : undefined,
    [geneSet],
  )
  return <GeneListModal title="Overlapping Genes" subtitle={geneSet?.title ?? geneSet?.term} genes={genes} name={`${geneSet?.term ?? 'tripothesis'}_overlapping_genes`} onClose={onClose} />
}

/** One contributing source gene set (RummaGene, RummaGEO or Perturb-Seqr), in its original order. */
export function SourceGeneSetModal({ source, term, label, onClose }: { source: string, term: string, label: string, onClose: () => void }) {
  const { data } = useSourceGeneSetQuery({ variables: { source, term } })
  const symbols = React.useMemo(
    () => data ? (data.sourceGeneSet?.genes ?? []).filter((g): g is string => !!g) : undefined,
    [data],
  )
  return <GeneListModal title={`${label} Gene Set`} subtitle={term} genes={useGeneRows(symbols)} name={term} onClose={onClose} />
}
