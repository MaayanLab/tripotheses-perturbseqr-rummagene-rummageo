
import React from 'react'
import Image from 'next/image'
import Stats from '@/components/stats'

export default function Loading() {
  return (
    <>
        <div className="text-center p-5">
        <Image className={'rounded mx-auto'} src={'/images/loading.gif'} width={125} height={250} alt={'Loading...'}/>
        <p>Searching <Stats bold show_gene_sets /> for enriched terms.</p>
        </div>
    </>
  )
}
