import { useEffect } from 'react'
import L from 'leaflet'

export default function Home() {
  useEffect(() => {
    const map = L.map('map').setView([51.505, -0.09], 13)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    L.marker([51.505, -0.09]).addTo(map)
      .bindPopup('Hello Next.js + Leaflet!')
      .openPopup()

    return () => {
      map.remove()
    }
  }, [])

  return <div id="map" style={{ height: '500px', width: '100%' }} />
}
