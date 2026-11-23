import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'Reactor Design Showdown · Reactor Lab',
  description: 'Compare stirred-tank and plug-flow reactor volumes for a first-order reaction.',
}
export default function Layout({children}: {children: ReactNode}) {
  return <html lang="en"><body>{children}</body></html>
}
