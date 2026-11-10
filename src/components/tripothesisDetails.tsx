'use client'
import React from 'react'
import { useTripothesisDetailQuery } from '@/graphql'
import TripothesisModal from '@/components/tripothesisModal'
import useGeoTitles from '@/utils/useGeoTitles'
import {
  directionLabel, doiUrl, formatPValue, geoUrl, parseTripothesis, perturbseqrSearchUrl, perturbseqrTermSearchUrl, pmcFileUrl, pmcUrl,
  rummageneTermSearchUrl, rummageoTermSearchUrl,
} from '@/utils/tripothesisTerms'

export function ExternalLink({ href, className = 'text-blue-500 hover:underline', children }: { href: string, className?: string, children: React.ReactNode }) {
  return <a className={className} href={href} target="_blank" rel="noopener noreferrer">{children}</a>
}

const Ext = ExternalLink

type Field = [label: string, value: React.ReactNode]

/** One source column, laid out like Perturb-Seqr's paired gene set panes. */
function Pane({ title, fields, className }: { title: string, fields: Field[], className?: string }) {
  return (
    <div className={`flex-1 min-w-0 ${className ?? ''}`}>
      <p className="text-center font-semibold text-gray-700 py-1">{title}</p>
      <table className="table table-xs border-t border-slate-200">
        <tbody>
          {fields.filter(([, value]) => value != null && value !== '').map(([label, value]) => (
            <tr key={label}>
              <td className="w-px whitespace-nowrap align-top text-gray-500">{label}</td>
              <td className="break-words align-top text-gray-700">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const Mono = ({ children }: { children: React.ReactNode }) => <span className="break-all">{children}</span>

function TripothesisDetailsBody({ id }: { id: string }) {
  const { data, loading, error } = useTripothesisDetailQuery({ variables: { id } })
  const geneSet = data?.geneSet
  const tripothesis = geneSet?.tripothesis
  const parsed = React.useMemo(() => parseTripothesis(tripothesis?.sourceRecord), [tripothesis])
  const geoTitles = useGeoTitles(parsed?.rummageo.accessions)

  if (loading) return <div className="w-full flex justify-center p-4"><span className="loading loading-ring w-24"></span></div>
  if (error) return <p role="alert" className="text-center p-4">{error.message}</p>
  if (!geneSet || !parsed) return <p className="text-center text-gray-400 p-4">Tripothesis not found.</p>

  const g = parsed.rummagene, e = parsed.rummageo, p = parsed.perturbseqr
  const stats: [string, React.ReactNode][] = [
    ['Overlap', tripothesis?.threeWayOverlapCount ?? geneSet.nGeneIds],
    ['P-value', formatPValue(tripothesis?.pValueConservative)],
    ['Jaccard', tripothesis?.threeWayJaccardSimilarity?.toPrecision(3) ?? '—'],
    ['Rank', tripothesis?.finalRank ?? '—'],
  ]
  return (
    <>
      <div className="min-h-0 overflow-y-auto p-2 text-slate-500 text-sm leading-relaxed">
        <p className="text-center pb-2">
          {stats.map(([label, value], i) => (
            <React.Fragment key={label}>{i ? <span className="px-2">·</span> : null}{label}: <span className="text-gray-700">{value}</span></React.Fragment>
          ))}
        </p>
        <div className="flex flex-col lg:flex-row gap-2">
          <Pane title="RummaGene" className="lg:border-r lg:border-slate-200 lg:pr-2" fields={[
            ['Paper', g.paperTitle || null],
            ['PMC', g.pmcid ? <Ext href={pmcUrl(g.pmcid)}>{g.pmcid}</Ext> : null],
            ['DOI', g.doi ? <Ext href={doiUrl(g.doi)}>{g.doi}</Ext> : null],
            ['Year', g.year],
            ['Gene set', g.tableLabel],
            ['File', g.file && g.pmcid ? <Ext href={pmcFileUrl(g.pmcid, g.file)}>{g.file}</Ext> : g.file],
            ['Term', <Mono key="t">{g.raw}</Mono>],
          ]} />
          <Pane title="RummaGEO" className="lg:border-r lg:border-slate-200 lg:pr-2" fields={[
            ['Study', e.accessions.map(acc => geoTitles[acc.toUpperCase()]).filter(Boolean).join('; ') || null],
            ['GEO', e.accessions.length ? <span>{e.accessions.map((acc, i) => <React.Fragment key={acc}>{i ? ', ' : ''}<Ext href={geoUrl(acc)}>{acc}</Ext></React.Fragment>)}</span> : null],
            ['Group A', e.groupALabel || (e.groupA ? `group ${e.groupA}` : null)],
            ['Group B', e.groupBLabel || (e.groupB ? `group ${e.groupB}` : null)],
            ['Direction', e.direction ? `${directionLabel(e.direction)} in B vs A` : null],
            ['Species', e.species],
            ['Term', <Mono key="t">{e.raw}</Mono>],
          ]} />
          <Pane title="Perturb-Seqr" fields={[
            ['Library', p.libraryLabel],
            ['Perturbation', p.perturbation ? <Ext href={perturbseqrSearchUrl(p.perturbation)}>{p.perturbation}</Ext> : null],
            ['Cell line', p.cellLine],
            ['Tissue', p.cellType],
            ['Timepoint', p.timepoint],
            ['Concentration', p.concentration],
            ['Type', p.perturbationType],
            ['Method', p.perturbationMethod],
            ['Direction', directionLabel(p.direction)],
            ['Signature', p.signatureId ? <Mono key="s">{p.signatureId}</Mono> : null],
            ['Term', <Mono key="t">{p.raw}</Mono>],
          ]} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end border-t border-solid border-slate-200 flex-shrink-0 gap-2 p-3">
        {([
          ['View in RummaGene', rummageneTermSearchUrl(g.raw)],
          ['View in RummaGEO', rummageoTermSearchUrl(e.raw)],
          ['View in Perturb-Seqr', perturbseqrTermSearchUrl(p.sourceTerm)],
        ] as const).map(([label, href]) => (
          <a key={label} className="btn btn-sm btn-outline text-xs" href={href} target="_blank" rel="noopener noreferrer">{label}</a>
        ))}
      </div>
    </>
  )
}

export default function TripothesisDetailsModal({ id, title, onClose }: { id: string, title?: string | null, onClose: () => void }) {
  return (
    <TripothesisModal fitContent title="Tripothesis Details" subtitle={title} onClose={onClose}>
      <TripothesisDetailsBody id={id} />
    </TripothesisModal>
  )
}
