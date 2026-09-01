import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import MapView from './MapView';

const API = process.env.REACT_APP_API_URL ||'https://uber-ride-booking-backend.onrender.com/api';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'https://uber-ride-booking-backend.onrender.com';

function RiderDashboard() {
  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(null);
  const [clickMode, setClickMode] = useState('pickup');
  const [ride, setRide] = useState(null);
  const [status, setStatus] = useState('');
  const [driverLocation, setDriverLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const name = localStorage.getItem('name');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) navigate('/');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, navigate]);

  const handleMapClick = (latlng) => {
    if (clickMode === 'pickup') {
      setPickup({ lat: latlng.lat, lng: latlng.lng, address: `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}` });
      setClickMode('destination');
    } else {
      setDestination({ lat: latlng.lat, lng: latlng.lng, address: `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}` });
      setClickMode('pickup');
    }
  };

  const requestRide = async () => {
    if (!pickup || !destination) {
      setError('Please select pickup and destination on map');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API}/rides/request`, {
        pickup,
        destination
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setRide(res.data);
      setStatus('requested');

      const socket = io(SOCKET_URL);
      socket.emit('ride:join', res.data.ride._id);
      socket.on('driver:locationUpdate', (data) => {
        setDriverLocation(data);
      });
      socket.on('ride:statusChanged', (data) => {
        setStatus(data.status);
      });

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request ride');
    }
    setLoading(false);
  };

  const logout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.headerText}> MoveX</h2>
        <div>
          <span style={styles.welcomeText}>Hi, {name}</span>
          <button onClick={logout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>

      <div style={styles.body}>
        {/* Left panel */}
        <div style={styles.panel}>
          {!ride ? (
            <>
              <h3 style={styles.panelTitle}>Book a Ride</h3>
              <div style={styles.instructionBox}>
                <p style={styles.instruction}>
                  {clickMode === 'pickup'
                    ? '📍 Click on map to set PICKUP location'
                    : '🏁 Click on map to set DESTINATION'}
                </p>
              </div>

              {pickup && (
                <div style={styles.locationItem}>
                  <span style={styles.greenDot}></span>
                  <span>Pickup: {pickup.address}</span>
                </div>
              )}
              {destination && (
                <div style={styles.locationItem}>
                  <span style={styles.redDot}></span>
                  <span>Destination: {destination.address}</span>
                </div>
              )}

              {error && <p style={styles.error}>{error}</p>}

              <button
                style={{
                  ...styles.button,
                  opacity: (!pickup || !destination) ? 0.5 : 1
                }}
                onClick={requestRide}
                disabled={loading || !pickup || !destination}
              >
                {loading ? '🔍 Finding driver...' : ' Request Ride'}
              </button>

              {pickup && destination && (
                <button style={styles.resetBtn} onClick={() => {
                  setPickup(null);
                  setDestination(null);
                  setClickMode('pickup');
                }}>
                  Reset locations
                </button>
              )}
            </>
          ) : (
            <>
              <h3 style={styles.panelTitle}>Ride Status</h3>
              <div style={{
                ...styles.statusBadge,
                backgroundColor: status === 'completed' ? 'green' : status === 'accepted' ? 'blue' : '#f0a500'
              }}>
                {status.toUpperCase()}
              </div>
              <div style={styles.infoBox}>
                <p>💰 Fare: <strong>{ride.estimatedFare}</strong></p>
                <p>📏 Distance: <strong>{ride.roadDistance}</strong></p>
                <p>⏱ Driver arrives: <strong>{ride.estimatedDriverArrival}</strong></p>
              </div>
              {driverLocation && (
                <div style={styles.driverBox}>
                  <p> Driver is moving towards you!</p>
                  <p style={styles.coords}>
                    {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}
                  </p>
                </div>
              )}
              <button style={styles.button} onClick={() => {
                setRide(null);
                setPickup(null);
                setDestination(null);
                setStatus('');
                setDriverLocation(null);
              }}>
                Book Another Ride
              </button>
            </>
          )}
        </div>

        {/* Map */}
        <div style={styles.mapContainer}>
          <MapView
            pickup={pickup}
            destination={destination}
            driverLocation={driverLocation}
            onMapClick={handleMapClick}
          />
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f8f8f8', fontFamily: 'Arial, sans-serif' },
  header: { backgroundColor: '#000', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  headerText: { color: 'white', margin: 0 },
  welcomeText: { color: '#ccc', marginRight: '1rem' },
  logoutBtn: { padding: '6px 14px', backgroundColor: '#ff4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  body: { display: 'flex', gap: '1.5rem', padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' },
  panel: { width: '320px', flexShrink: 0, backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', height: 'fit-content' },
  panelTitle: { margin: '0 0 1rem 0', fontSize: '18px' },
  instructionBox: { backgroundColor: '#f0f0f0', borderRadius: '8px', padding: '12px', marginBottom: '1rem' },
  instruction: { margin: 0, fontSize: '14px', color: '#333' },
  locationItem: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', color: '#333' },
  greenDot: { width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'green', flexShrink: 0 },
  redDot: { width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'red', flexShrink: 0 },
  button: { width: '100%', padding: '12px', backgroundColor: '#000', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer', marginTop: '1rem' },
  resetBtn: { width: '100%', padding: '10px', backgroundColor: 'transparent', color: '#666', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', marginTop: '8px' },
  error: { color: 'red', fontSize: '13px', marginTop: '8px' },
  statusBadge: { color: 'white', padding: '8px 16px', borderRadius: '20px', display: 'inline-block', marginBottom: '1rem', fontSize: '13px', fontWeight: 'bold' },
  infoBox: { backgroundColor: '#f8f8f8', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' },
  driverBox: { backgroundColor: '#e8f4fd', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' },
  coords: { fontFamily: 'monospace', fontSize: '12px', color: '#666' },
  mapContainer: { flex: 1, minWidth: 0 }
};

export default RiderDashboard;