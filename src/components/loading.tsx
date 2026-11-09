import React from 'react'

/** Shared search indicator: an animated RummaGene × RummaGEO × Perturb-Seqr Venn diagram. */
export default function Loading({ label = 'Searching Gene Sets' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 w-full min-h-[50vh] p-5 text-center" role="status" aria-live="polite">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/venn-loading.svg" width={240} height={229} alt="Loading..." />
      <p className="text-lg">{label}</p>
    </div>
  )
}
