import { TermSearchDownloadDocument, TermSearchDownloadQuery } from '@/graphql'
import { getClient } from '@/lib/apollo/client'
import streamTsv from '@/utils/streamTsv'
import { TRIPOTHESIS_TSV_COLUMNS, parseTripothesis, tripothesisTsvRow } from '@/utils/tripothesisTerms'

export const dynamic = 'force-dynamic'

/** Term search results as TSV: `q` is the search, `f` the table filter (same matching as the page). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''
  const f = (searchParams.get('f') ?? '').toLowerCase()
  const { data, error } = await getClient().query<TermSearchDownloadQuery>({
    query: TermSearchDownloadDocument,
    variables: { terms: [q], first: 10000 },
  })
  if (error) throw new Error(error.message)
  const nodes = (data.geneSetTermSearch?.nodes ?? [])
    .filter(node => [node.title, node.term].some(value => value?.toLowerCase().includes(f)))

  return new Response(
    streamTsv(
      ['tripothesisId', ...TRIPOTHESIS_TSV_COLUMNS, 'nGenes', 'intersectionCount', 'crossingPvalue'],
      nodes,
      node => ({
        tripothesisId: node.term,
        ...tripothesisTsvRow(parseTripothesis(node.tripothesis?.sourceRecord)),
        nGenes: node.nGeneIds,
        intersectionCount: node.tripothesis?.threeWayOverlapCount ?? node.nGeneIds,
        crossingPvalue: node.tripothesis?.pValueConservative,
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
