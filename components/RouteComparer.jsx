'use client'
import { useState, useRef } from "react";
import dynamic from 'next/dynamic';

// Dynamically import MapContainer to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

export default function RouteComparer() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const startRef = useRef(null);
  const endRef = useRef(null);

  const fetchRoutes = async () => {
    setLoading(true);
    setError('');
    
    try {
      const start = startRef.current.value;
      const end = endRef.current.value;
      
      if (!start || !end) {
        throw new Error('Please enter both locations');
      }

      // Geocode addresses first
      const [startCoords, endCoords] = await Promise.all([
        geocode(start),
        geocode(end)
      ]);

      const routes = await Promise.all([
        fetchRoute(startCoords, endCoords, 'fastest'),
        fetchRoute(startCoords, endCoords, 'avoidHighways'),
      ]);

      setResults(routes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const geocode = async (address) => {
    const response = await fetch(
      `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(address)}&apiKey=${process.env.NEXT_PUBLIC_HERE_API_KEY}`
    );
    const data = await response.json();
    return data.items[0].position;
  };

  const fetchRoute = async (start, end, type) => {
    let url = `https://router.hereapi.com/v8/routes?transportMode=car&origin=${start.lat},${start.lng}&destination=${end.lat},${end.lng}&return=summary,polyline&apikey=${process.env.NEXT_PUBLIC_HERE_API_KEY}`;
    
    if (type === 'avoidHighways') {
      url += '&avoid[features]=motorway';
    }

    const response = await fetch(url);
    const data = await response.json();
    return {
      name: type === 'fastest' ? 'Fastest Route' : 'Scenic Route (No Highways)',
      ...data.routes[0].sections[0].summary,
      polyline: decodePolyline(data.routes[0].sections[0].polyline),
      start: [start.lat, start.lng],
      end: [end.lat, end.lng]
    };
  };

  const decodePolyline = (polyline) => {
    const coords = [];
    let lat = 0, lng = 0;
    for (let i = 0; i < polyline.length; i += 2) {
      lat += polyline[i];
      lng += polyline[i + 1];
      coords.push([lat / 1e5, lng / 1e5]);
    }
    return coords;
  };

  return (
    <div className="container">
      <h1>Route Comparison with HERE API</h1>
      
      <div className="input-group">
        <input 
          ref={startRef} 
          type="text" 
          placeholder="Start address (e.g. Berlin, Germany)" 
        />
        <input 
          ref={endRef} 
          type="text" 
          placeholder="End address (e.g. Hamburg, Germany)" 
        />
      </div>

      <button onClick={fetchRoutes} disabled={loading}>
        {loading ? 'Loading...' : 'Get Routes'}
      </button>

      {error && <div className="error">{error}</div>}

      {results.length > 0 && (
        <div className="results">
          <div className="map-container">
            <MapContainer
              center={[
                (results[0].start[0] + results[0].end[0]) / 2,
                (results[0].start[1] + results[0].end[1]) / 2
              ]}
              zoom={10}
              style={{ height: '500px', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              <Marker position={results[0].start}>
                <Popup>Start</Popup>
              </Marker>
              <Marker position={results[0].end}>
                <Popup>End</Popup>
              </Marker>
              {results.map((route, i) => (
                <Polyline
                  key={i}
                  positions={route.polyline}
                  color={i === 0 ? 'blue' : 'green'}
                />
              ))}
            </MapContainer>
          </div>

          <div className="route-info">
            {results.map((route, i) => (
              <div key={i} className="route-card">
                <h3>{route.name}</h3>
                <p>⏱️ {(route.duration / 60).toFixed(0)} min</p>
                <p>📏 {(route.length / 1000).toFixed(1)} km</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px;
        }
        .input-group {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin: 20px 0;
        }
        input {
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 4px;
        }
        button {
          background: #0070f3;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
        }
        button:disabled {
          opacity: 0.7;
        }
        .error {
          color: red;
          margin: 10px 0;
        }
        .results {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 20px;
        }
        .map-container {
          height: 500px;
          border-radius: 8px;
          overflow: hidden;
        }
        .route-card {
          border: 1px solid #ddd;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 10px;
        }
      `}</style>
    </div>
  );
}
