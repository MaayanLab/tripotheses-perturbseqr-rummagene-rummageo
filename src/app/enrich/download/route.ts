import { EnrichmentQueryDocument, EnrichmentQueryQuery, FetchUserGeneSetDocument, FetchUserGeneSetQuery } from '@/graphql'
import { getClient } from '@/lib/apollo/client'
import * as array from '@/utils/array'
import streamTsv from '@/utils/streamTsv'

export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const queryId = searchParams.get('query')
  const term = searchParams.get('q') || ''
  if (!queryId) {
    return new Response('query is required', { status: 400 })
  }
  const { data: userGeneSet, error: userGeneSetError } = await getClient().query<FetchUserGeneSetQuery>({
    query: FetchUserGeneSetDocument,
    variables: { id: queryId },
  })
  if (userGeneSetError) throw new Error(userGeneSetError.message)
  const genes = array.ensure(userGeneSet.userGeneSet?.genes).filter((gene): gene is string => !!gene).map(gene => gene.toUpperCase())
  const { data: enrichmentResults, error: enrichmentResultsError } = await getClient().query<EnrichmentQueryQuery>({
    query: EnrichmentQueryDocument,
    variables: {
      genes,
      filterTerm: term,
      offset: 0,
      first: null,
    },
  })
  if (enrichmentResultsError) throw new Error(enrichmentResultsError.message)
  const nodes = enrichmentResults.currentBackground?.enrich?.nodes
  if (!nodes) throw new Error('No results')

  return new Response(
    streamTsv(
      ['term', 'tripothesisId', 'description', 'geneSetSize', 'nOverlap', 'oddsRatio', 'pvalue', 'adjPvalue', 'geneSetHash'],
      nodes.flatMap(node => node?.geneSets.nodes.map(geneSet => ({
        geneSetHash: node.geneSetHash,
        geneSet,
        pvalue: node.pvalue,
        adjPvalue: node.adjPvalue,
        nOverlap: node.nOverlap,
        oddsRatio: node.oddsRatio,
      }))),
      item => item?.geneSet ? {
        term: item.geneSet.title || item.geneSet.term,
        tripothesisId: item.geneSet.term,
        description: item.geneSet.description,
        geneSetSize: item.geneSet.nGeneIds,
        nOverlap: item.nOverlap,
        oddsRatio: item.oddsRatio,
        pvalue: item.pvalue,
        adjPvalue: item.adjPvalue,
        geneSetHash: item.geneSetHash,
      } : undefined,
    ),
    {
      headers: {
        'Content-Type': 'text/tab-separated-values',
        'Content-Disposition': 'attachment; filename="results.tsv"',
      },
    },
  )
}
