import 'leaflet/dist/leaflet.css';
import { useState, useRef } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import L from 'leaflet';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const RouteComparer = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [center, setCenter] = useState([51.0, 7.0]); // Default center
  const startRef = useRef(null);
  const endRef = useRef(null);

  const routes = [
    {
      name: "Fastest Route (Standard)",
      url: (key, origin, destination) =>
        `https://router.hereapi.com/v8/routes?transportMode=car&origin=${origin}&destination=${destination}&return=summary,polyline&apikey=${key}`,
    },
    {
      name: "Avoid Highways",
      url: (key, origin, destination) =>
        `https://router.hereapi.com/v8/routes?transportMode=car&origin=${origin}&destination=${destination}&avoid[features]=motorway&return=summary,polyline&apikey=${key}`,
    },
    {
      name: "Avoid Tolls",
      url: (key, origin, destination) =>
        `https://router.hereapi.com/v8/routes?transportMode=car&origin=${origin}&destination=${destination}&avoid[features]=tollRoad&return=summary,polyline&apikey=${key}`,
    }
  ];

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

  const geocodeAddress = async (address) => {
    const apiKey = process.env.NEXT_PUBLIC_HERE_API_KEY;
    const response = await fetch(
      `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(address)}&apiKey=${apiKey}`
    );
    const data = await response.json();
    if (data.items && data.items.length > 0) {
      return {
        lat: data.items[0].position.lat,
        lng: data.items[0].position.lng
      };
    }
    throw new Error("Address not found");
  };

  const fetchRoutes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const apiKey = process.env.NEXT_PUBLIC_HERE_API_KEY;
      if (!apiKey) throw new Error("API key is missing");

      const startAddress = startRef.current.value;
      const endAddress = endRef.current.value;
      if (!startAddress || !endAddress) throw new Error("Please enter both addresses");

      // Geocode addresses
      const startLocation = await geocodeAddress(startAddress);
      const endLocation = await geocodeAddress(endAddress);

      // Update map center
      setCenter([
        (startLocation.lat + endLocation.lat) / 2,
        (startLocation.lng + endLocation.lng) / 2
      ]);

      const origin = `${startLocation.lat},${startLocation.lng}`;
      const destination = `${endLocation.lat},${endLocation.lng}`;

      const data = await Promise.all(
        routes.map(async (route) => {
          const response = await fetch(route.url(apiKey, origin, destination));
          if (!response.ok) throw new Error(`API request failed for ${route.name}`);
          const json = await response.json();
          
          const section = json.routes?.[0]?.sections?.[0];
          if (!section) throw new Error(`No route data received for ${route.name}`);

          return {
            name: route.name,
            time: section.summary?.duration,
            length: section.summary?.length,
            polyline: decodePolyline(section.polyline),
            start: [startLocation.lat, startLocation.lng],
            end: [endLocation.lat, endLocation.lng]
          };
        })
      );
      
      setResults(data);
    } catch (err) {
      setError(err.message);
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "1rem", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}>
        🚗 Interactive Route Comparison
      </h1>
      
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "1fr 1fr", 
        gap: "15px",
        marginBottom: "20px"
      }}>
        <div>
          <label style={{ display: "block", marginBottom: "5px" }}>Start Address:</label>
          <input
            ref={startRef}
            type="text"
            placeholder="e.g., Cologne, Germany"
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "5px" }}>End Address:</label>
          <input
            ref={endRef}
            type="text"
            placeholder="e.g., Düsseldorf, Germany"
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
      </div>

      <button 
        onClick={fetchRoutes}
        style={{
          padding: "10px 20px",
          background: "#0078D4",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "16px",
          marginBottom: "20px"
        }}
        disabled={loading}
      >
        {loading ? "Calculating Routes..." : "Compare Routes"}
      </button>
      
      {error && (
        <div style={{ color: "red", marginBottom: "20px" }}>
          Error: {error}
        </div>
      )}

      {results.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" }}>
          <div>
            <h2 style={{ fontSize: "20px", marginBottom: "15px" }}>Route Summary</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "15px" }}>
              {results.map((route, index) => (
                <div key={index} style={{
                  padding: "15px",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  background: "#f9f9f9"
                }}>
                  <h3 style={{ 
                    fontSize: "18px", 
                    marginBottom: "10px",
                    color: ["#FF0000", "#0000FF", "#008000"][index] 
                  }}>
                    {route.name}
                  </h3>
                  <p>⏱️ Time: {(route.time / 60).toFixed(0)} minutes</p>
                  <p>📏 Distance: {(route.length / 1000).toFixed(1)} km</p>
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ height: "600px", borderRadius: "8px", overflow: "hidden" }}>
            <MapContainer
              center={center}
              zoom={11}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {results.length > 0 && (
                <>
                  <Marker position={results[0].start}>
                    <Popup>Start Location</Popup>
                  </Marker>
                  <Marker position={results[0].end}>
                    <Popup>End Location</Popup>
                  </Marker>
                </>
              )}
              
              {results.map((route, index) => (
                <Polyline
                  key={index}
                  positions={route.polyline}
                  color={["#FF0000", "#0000FF", "#008000"][index]}
                  weight={4}
                />
              ))}
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteComparer;
