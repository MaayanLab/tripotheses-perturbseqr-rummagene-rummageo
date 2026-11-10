import { fetchGeoTitles } from '@/utils/geoTitles'

export const dynamic = 'force-dynamic'

/** `?acc=GSE1,GSE2` -> `{ "GSE1": "title", ... }` */
export async function GET(request: Request) {
  const acc = (new URL(request.url).searchParams.get('acc') ?? '').split(',').filter(Boolean).slice(0, 500)
  return new Response(JSON.stringify(await fetchGeoTitles(acc)), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' },
  })
}
