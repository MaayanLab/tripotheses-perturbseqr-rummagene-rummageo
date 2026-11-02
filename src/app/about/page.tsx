import React from 'react'
import { INTERSECTION_MANIFEST, IntersectionManifest, readDataManifest } from '@/lib/data'

export const metadata = { title: 'About Tripothesis' }

export default async function About() {
  const manifest = await readDataManifest<IntersectionManifest>(INTERSECTION_MANIFEST)
  return <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
    <h1 className="text-xl">About Tripothesis</h1>
    <p className="leading-7">Tripothesis explores shared genes between Perturb-Seqr perturbation signatures, RummaGene literature-derived gene sets, and human RummaGEO expression signatures.</p>
    <p className="leading-7">The crossing objective is to retain the 100,000 most statistically significant three-way source combinations for each Perturb-Seqr library, without contribution quotas on individual source sets. A crossing is scored by the most conservative of three hypergeometric tests, each comparing one source set with the intersection of the other two.</p>
    {manifest && <p className="leading-7">The currently loaded dataset contains {manifest.geneSets.toLocaleString('en-US')} gene sets and {manifest.backgroundGenes.toLocaleString('en-US')} background genes.{manifest.subset ? ' It is a demonstration subset.' : ''} The Downloads page provides the active data and provenance.</p>}
    <p className="leading-7">The website supports gene-set enrichment and term search. The crossing algorithm is being developed step by step, beginning with a straightforward exhaustive implementation.</p>
  </div>
}
