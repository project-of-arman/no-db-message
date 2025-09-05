const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store user connections (in memory only)
const connectedUsers = new Map();
const typingUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins with their ID
  socket.on('join', (userId) => {
    console.log('User joining:', userId);
    connectedUsers.set(userId, socket.id);
    socket.userId = userId;
    
    // Broadcast user came online
    socket.broadcast.emit('user_status', { userId, isOnline: true });
    
    // Send current online users to the new user
    const onlineUsers = Array.from(connectedUsers.keys());
    console.log('Sending online users to', userId, ':', onlineUsers);
    socket.emit('online_users', onlineUsers);
    
    // Also broadcast to all other users that this user is online
    socket.broadcast.emit('online_users', onlineUsers);
  });

  // Handle private messages (no storage on server)
  socket.on('private_message', (data) => {
    const { recipientId, encryptedMessage, messageType = 'text' } = data;
    const recipientSocketId = connectedUsers.get(recipientId);
    
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('private_message', {
        senderId: socket.userId,
        encryptedMessage,
        messageType,
        timestamp: Date.now()
      });
    }
  });

  // Handle typing indicators
  socket.on('typing_start', (recipientId) => {
    const recipientSocketId = connectedUsers.get(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('typing_start', socket.userId);
    }
  });

  socket.on('typing_stop', (recipientId) => {
    const recipientSocketId = connectedUsers.get(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('typing_stop', socket.userId);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.userId) {
      console.log('User disconnecting:', socket.userId);
      connectedUsers.delete(socket.userId);
      // Broadcast user went offline
      socket.broadcast.emit('user_status', { 
        userId: socket.userId, 
        isOnline: false 
      });
      // Send updated online users list to all remaining users
      const onlineUsers = Array.from(connectedUsers.keys());
      socket.broadcast.emit('online_users', onlineUsers);
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`);
});