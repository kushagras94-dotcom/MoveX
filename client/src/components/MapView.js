import { useEffect , useRef} from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom icons
const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const destinationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const driverIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Click handler component
function ClickHandler({ onMapClick, disabled  }) {
  useMapEvents({
    click(e) {
      if (!disabled) {
        onMapClick(e.latlng);
      }
    }
  });
  return null;
}

function RecenterMap({ userLocation }) {
  const map = useMap();
  const hasCentered = useRef(false);

  useEffect(() => {
    if (userLocation && !hasCentered.current) {
      map.setView([userLocation.lat, userLocation.lng], map.getZoom());
      hasCentered.current = true;
    }
  }, [userLocation, map]);

  return null;
}

function MapView({ pickup, destination, driverLocation, onMapClick, route, userLocation, rideActive }) {
  return (
    <MapContainer
      center={userLocation ? [userLocation.lat, userLocation.lng] : [26.9124, 75.7873]}
      zoom={13}
      style={{ height: '400px', width: '100%', borderRadius: '12px' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />

      <ClickHandler onMapClick={onMapClick} disabled={rideActive} />
      <RecenterMap userLocation={userLocation} />

      {pickup && (
        <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
          <Popup>📍 Pickup: {pickup.address}</Popup>
        </Marker>
      )}

      {destination && (
        <Marker position={[destination.lat, destination.lng]} icon={destinationIcon}>
          <Popup>🏁 Destination: {destination.address}</Popup>
        </Marker>
      )}

      {driverLocation && (
        <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon}>
          <Popup> Driver is here</Popup>
        </Marker>
      )}
      {userLocation && (
        <Marker
          position={[userLocation.lat, userLocation.lng]}
          icon={L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41]
          })}
        >
          <Popup>📍 You are here</Popup>
        </Marker>
      )}

      {route && route.length > 0 && (
        <Polyline positions={route} color="#2563eb" weight={4} opacity={0.7} />
      )}
    </MapContainer>
  );
}

export default MapView;