import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

// Dynamically import the RouteComparer component with SSR disabled
const RouteComparer = dynamic(
  () => import('../components/RouteComparer'),
  { ssr: false }
)

export default function Home() {
  return (
    <div>
      <RouteComparer />
    </div>
  )
}
