import { EnrichmentDownloadDocument, EnrichmentDownloadQuery, FetchUserGeneSetDocument, FetchUserGeneSetQuery } from '@/graphql'
import { getClient } from '@/lib/apollo/client'
import * as array from '@/utils/array'
import streamTsv from '@/utils/streamTsv'
import { tripothesisTsvRows } from '@/utils/geoTitles'
import { TRIPOTHESIS_TSV_COLUMNS } from '@/utils/tripothesisTerms'

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
  if (!userGeneSet.userGeneSet) {
    return new Response('Gene set not found', { status: 404 })
  }
  const genes = array.ensure(userGeneSet.userGeneSet?.genes).filter((gene): gene is string => !!gene).map(gene => gene.toUpperCase())
  const { data: enrichmentResults, error: enrichmentResultsError } = await getClient().query<EnrichmentDownloadQuery>({
    query: EnrichmentDownloadDocument,
    variables: { genes, filterTerm: term },
  })
  if (enrichmentResultsError) throw new Error(enrichmentResultsError.message)
  if (!enrichmentResults.currentBackground) {
    return new Response('Crossings are not loaded yet; enrichment is not available.', { status: 503 })
  }
  const nodes = enrichmentResults.currentBackground?.enrich?.nodes
  if (!nodes) throw new Error('No results')
  const items = nodes.flatMap(node => node?.geneSets.nodes.map(geneSet => ({
    geneSetHash: node.geneSetHash,
    geneSet,
    pvalue: node.pvalue,
    adjPvalue: node.adjPvalue,
    nOverlap: node.nOverlap,
    oddsRatio: node.oddsRatio,
  })) ?? [])
  const rows = await tripothesisTsvRows(items.map(item => item.geneSet.tripothesis?.sourceRecord))

  return new Response(
    streamTsv(
      ['tripothesisId', ...TRIPOTHESIS_TSV_COLUMNS, 'geneSetSize', 'nOverlap', 'oddsRatio', 'pvalue', 'adjPvalue', 'geneSetHash'],
      items.map((item, i) => ({ ...item, row: rows[i] })),
      item => ({
        tripothesisId: item.geneSet.term,
        ...item.row,
        geneSetSize: item.geneSet.nGeneIds,
        nOverlap: item.nOverlap,
        oddsRatio: item.oddsRatio,
        pvalue: item.pvalue,
        adjPvalue: item.adjPvalue,
        geneSetHash: item.geneSetHash,
      }),
    ),
    {
      headers: {
        'Content-Type': 'text/tab-separated-values',
        'Content-Disposition': 'attachment; filename="results.tsv"',
      },
    },
  )
}
