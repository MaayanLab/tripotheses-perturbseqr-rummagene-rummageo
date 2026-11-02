'use client'

import Link from "next/link"
import classNames from 'classnames'
import { usePathname } from "next/navigation"

export default function Nav() {
  const pathname = usePathname()
  return (
    <>
      <li>
        <Link
          href="/"
          className={classNames({ 'active': pathname === '/' || pathname === '/enrich' })}
          shallow>Quadpotheses</Link></li>
      <li>
        <Link
          href="/term-search"
          className={classNames({ 'active': pathname === '/term-search' })}
          shallow>Tripotheses Search</Link></li>
      <li>
        <Link
          href="/about"
          className={classNames({ 'active': pathname === '/about' })}
          shallow>About</Link></li>
    </>
  )
}
