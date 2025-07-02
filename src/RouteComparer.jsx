import '../public/leaflet.css';
import React, { useState } from "react";
import { MapContainer, TileLayer, Polyline } from "react-leaflet";


const HERE_API_KEY = "72b_8FCh0EqFOlfVTRGCdsAv1sDkiryQJuJkWUnVOFQ"; // <-- Hier deinen API-Key einsetzen

const routes = [
  {
    name: "Hauptstraße (Standard)",
    url: (key) =>
      `https://router.hereapi.com/v8/routes?transportMode=car&origin=51.0719,7.0454&destination=51.1831,6.8157&return=summary,polyline&apikey=${key}`,
  },
  {
    name: "über Brandsackerstraße",
    url: (key) =>
      `https://router.hereapi.com/v8/routes?transportMode=car&origin=51.0719,7.0454&via=51.0965,6.9342&destination=51.1831,6.8157&return=summary,polyline&apikey=${key}`,
  },
  {
    name: "ohne Autobahn",
    url: (key) =>
      `https://router.hereapi.com/v8/routes?transportMode=car&origin=51.0719,7.0454&destination=51.1831,6.8157&avoid[features]=motorway&return=summary,polyline&apikey=${key}`,
  },
];

function decodePolyline(polyline) {
  const coords = [];
  let lat = 0,
    lng = 0;
  for (let i = 0; i < polyline.length; i += 2) {
    lat += polyline[i];
    lng += polyline[i + 1];
    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
}

export default function RouteComparer() {
  const [results, setResults] = useState([]);

  const fetchRoutes = async () => {
    const data = await Promise.all(
      routes.map(async (r) => {
        const res = await fetch(r.url(HERE_API_KEY));
        const json = await res.json();
        const summary = json.routes?.[0]?.sections?.[0]?.summary;
        const polyline = decodePolyline(json.routes?.[0]?.sections?.[0]?.polyline);
        return {
          name: r.name,
          time: summary?.duration,
          length: summary?.length,
          polyline,
        };
      })
    );
    setResults(data);
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold" }}>🚗 Routenvergleich mit HERE API</h1>
      <button onClick={fetchRoutes} style={{ margin: "10px 0", padding: "0.5rem 1rem" }}>
        Routen abrufen
      </button>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
        {results.map((r, i) => (
          <div
            key={i}
            style={{
              border: "1px solid #ccc",
              borderRadius: "8px",
              padding: "1rem",
              width: "250px",
              background: "#f9f9f9",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: "600" }}>{r.name}</h2>
            <p>🕒 Zeit: {Math.round(r.time / 60)} Minuten</p>
            <p>📏 Strecke: {Math.round(r.length / 1000)} km</p>
          </div>
        ))}
      </div>

      {results.length > 0 && (
        <MapContainer
          center={[51.12, 6.93]}
          zoom={11}
          style={{ height: "400px", width: "100%", marginTop: "2rem" }}
          scrollWheelZoom={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {results.map((r, i) => (
            <Polyline
              key={i}
              positions={r.polyline}
              color={["red", "blue", "green", "purple"][i % 4]}
            />
          ))}
        </MapContainer>
      )}
    </div>
  );
}
