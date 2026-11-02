'use client'
import { useStatsQuery } from '@/graphql'
import classNames from 'classnames'

export default function Stats({
  bold,
  show_sets_analyzed,
  show_gene_sets,
}: {
  bold?: boolean,
  show_sets_analyzed?: boolean,
  show_gene_sets?: boolean,
}) {
  const { data } = useStatsQuery({ pollInterval: 60000 })

  if (show_gene_sets) {
    return data?.geneSets?.totalCount !== undefined
      ? <><span className={classNames({ 'font-bold': bold })}>{Intl.NumberFormat('en-US').format(data.geneSets.totalCount)}</span>&nbsp;gene sets</>
      : <span className="loading">loading</span>
  }
  if (show_sets_analyzed) {
    return data?.userGeneSetCount != null
      ? <><span className={classNames({ 'font-bold': bold })}>{Intl.NumberFormat('en-US').format(data.userGeneSetCount)}</span>&nbsp;sets analyzed</>
      : <span className="loading">loading</span>
  }
  return null
}
