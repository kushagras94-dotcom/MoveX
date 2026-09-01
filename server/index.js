const dotenv = require('dotenv');
dotenv.config();
const express = require('express');

const cors = require('cors');

const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const rideRoutes = require('./routes/ride');
const driverRoutes = require('./routes/driver');
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');


connectDB();

// Redis clients for Socket.io adapter (pub/sub across server instances)
const pubClient = new Redis(process.env.REDIS_URL, { tls: process.env.REDIS_URL.startsWith('rediss://') ? {} : undefined }); 
const subClient = pubClient.duplicate();

pubClient.on('error', (err) => console.error('Redis Pub Client Error:', err));
subClient.on('error', (err) => console.error('Redis Sub Client Error:', err));

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.adapter(createAdapter(pubClient, subClient));
console.log('Socket.io Redis adapter connected');

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/driver', driverRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Uber backend is running!' });
});

// WebSocket logic
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Driver joins their own room
  socket.on('driver:join', (driverId) => {
    socket.join(`driver:${driverId}`);
    console.log(`Driver ${driverId} joined their room`);
  });

  // Rider joins ride room to track
  socket.on('ride:join', (rideId) => {
    socket.join(`ride:${rideId}`);
    console.log(`Client joined ride room: ${rideId}`);
  });

  // Driver updates their location
  socket.on('driver:location', (data) => {
    const { driverId, rideId, lat, lng } = data;
    console.log(`Driver ${driverId} location update:`, lat, lng);

    // Push location to everyone tracking this ride
    io.to(`ride:${rideId}`).emit('driver:locationUpdate', {
      driverId,
      lat,
      lng,
      timestamp: new Date()
    });
  });

  // Ride status update
  socket.on('ride:statusUpdate', (data) => {
    const { rideId, status } = data;
    io.to(`ride:${rideId}`).emit('ride:statusChanged', {
      rideId,
      status,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io accessible in controllers
app.set('io', io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});