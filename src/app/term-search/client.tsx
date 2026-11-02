'use client'
import React from 'react'
import { useTermSearchQuery } from '@/graphql'
import TermTable from '@/components/termTable'
import useQsState from '@/utils/useQsState'
import Stats from '@/components/stats'

export function TermSearchResults({ terms }: { terms: string }) {
  const { data, error } = useTermSearchQuery({ variables: { terms: [terms], first: 10000 } })
  if (error) return <p role="alert">{error.message}</p>
  if (!data) {
    return <p>Searching <Stats show_gene_sets />.</p>
  }
  return (
    <div className="flex flex-col gap-2 my-2">
      <h2 className="text-md font-bold">
        Found {data.geneSetTermSearch?.totalCount ?? 0} matching tripotheses.
      </h2>
      {data.geneSetTermSearch?.nodes && data.geneSetTermSearch.nodes.length > 0
        ? <TermTable terms={data.geneSetTermSearch.nodes} />
        : null}
    </div>
  )
}

const examples = [
  'Selinexor',
  'GSE104917',
  'CDK1',
]

function Examples({ onSelect }: { onSelect: (example: string) => void }) {
  return (
    <p className="prose p-2">
      try an example:&nbsp;
      {examples.flatMap((example, index) => [
        index > 0 ? <React.Fragment key={index}>, </React.Fragment> : null,
        <a
          key={example}
          className="font-bold text-sm cursor-pointer"
          onClick={() => onSelect(example)}
        >{example}</a>
      ])}
    </p>
  )
}

export default function TermSearchClientPage(props: { searchParams?: { page?: string, q?: string } }) {
  const [queryString, setQueryString] = useQsState({ page: props.searchParams?.page ?? '1', q: props.searchParams?.q ?? '' })
  const [rawTerms, setRawTerms] = React.useState('')
  React.useEffect(() => { setRawTerms(queryString.q ?? '') }, [queryString.q])
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setQueryString({ page: '1', q: rawTerms, f: '' })
  }

  return (
    <>
      <h1 className="text-xl">Tripotheses Search</h1>
      <div className="flex-col">
        <form className="flex flex-row items-center gap-4" onSubmit={submit}>
          <span className="label-text text-lg">Tripothesis</span>
          <input
            type="text"
            aria-label="Search Tripotheses"
            className="input input-bordered"
            placeholder="Selinexor"
            value={rawTerms}
            onChange={event => setRawTerms(event.currentTarget.value)}
          />
          <button type="submit" className="btn btn-primary normal-case">Search</button>
          <div>Search Tripothesis titles, libraries, or genes.</div>
        </form>
        <Examples onSelect={example => setQueryString({ page: '1', q: example, f: '' })} />
      </div>
      <TermSearchResults terms={queryString.q ?? ''} />
    </>
  )
}
