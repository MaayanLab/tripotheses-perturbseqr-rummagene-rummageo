'use client'
import React from 'react'

/** GEO study titles via /api/geo-titles, cached per accession list for the page's lifetime. */
const cache = new Map<string, Promise<Record<string, string>>>()

function load(key: string) {
  if (!cache.has(key)) {
    cache.set(key, fetch(`/api/geo-titles?acc=${encodeURIComponent(key)}`)
      .then(res => res.ok ? res.json() : {})
      .catch(() => ({})))
  }
  return cache.get(key)!
}

export default function useGeoTitles(accessions: string[] | undefined): Record<string, string | undefined> {
  const key = (accessions ?? []).map(acc => acc.toUpperCase()).join(',')
  const [titles, setTitles] = React.useState<Record<string, string>>({})
  React.useEffect(() => {
    if (!key) return
    let active = true
    load(key).then(result => { if (active) setTitles(result) })
    return () => { active = false }
  }, [key])
  return titles
}
