import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());

// Store room data
const rooms = new Map();
// Map socket IDs to client IDs for tracking connections across tabs
const socketToClientMap = new Map();
// Map socket IDs to room IDs for easier room lookup
const socketToRoomMap = new Map();

io.on('connection', (socket) => {
  console.log('A user connected with socket ID:', socket.id);
  
  // Simple ping/pong to check connection
  socket.emit('connection_established', { id: socket.id, message: 'Connected to server' });
  
  // Get client ID and room ID from query parameters
  const clientId = socket.handshake.query.clientId;
  const roomIdFromQuery = socket.handshake.query.roomId;
  
  if (clientId) {
    console.log(`Socket ${socket.id} associated with client ID ${clientId}`);
    socketToClientMap.set(socket.id, clientId);
    
    // If roomId is provided in the query, join that room immediately
    if (roomIdFromQuery) {
      console.log(`Auto-joining room ${roomIdFromQuery} from query parameters`);
      socketToRoomMap.set(socket.id, roomIdFromQuery);
    }
  }

  socket.on('joinRoom', ({ username, roomId, clientId }) => {
    console.log(`JOIN REQUEST: ${username} attempting to join room ${roomId} with socket ID ${socket.id}`);
    
    // Clean up any previous room membership for this socket
    const previousRooms = Array.from(socket.rooms).filter(room => room !== socket.id);
    if (previousRooms.length > 0) {
      console.log(`Socket ${socket.id} is leaving ${previousRooms.length} previous rooms`);
      previousRooms.forEach(room => {
        socket.leave(room);
        console.log(`Socket ${socket.id} left room ${room}`);
      });
    }
    
    // Join the new room
    console.log(`Socket ${socket.id} joining room: ${roomId}`);
    socket.join(roomId);
    socketToRoomMap.set(socket.id, roomId);
    
    // Always use socket.id as the unique identifier
    console.log(`Using socket.id ${socket.id} as user identifier`);
    
    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      console.log(`Creating new room: ${roomId}`);
      rooms.set(roomId, {
        users: new Map(),
        code: ''
      });
    }

    const room = rooms.get(roomId);
    
    // Check if this user (by username) already exists in the room
    // But is connected from a different socket
    let existingUser = null;
    room.users.forEach((user, id) => {
      if (user.username === username && id !== socket.id) {
        existingUser = { user, id };
      }
    });
    
    // If user already exists with same username but different socket,
    // just update their socket list instead of creating a new user
    if (existingUser) {
      console.log(`User ${username} already exists in room with ID ${existingUser.id}, adding new socket`);
      existingUser.user.sockets.push(socket.id);
    } else {
      // Add user to room with socket.id as the identifier
      console.log(`Adding user ${username} with socket ID ${socket.id} to room ${roomId}`);
      room.users.set(socket.id, {
        id: socket.id,
        username: username,
        peerId: null,
        sockets: [socket.id]
      });
    }

    // Send current code to new user
    console.log(`Sending current code to new user ${socket.id}`);
    socket.emit('code-change', room.code);

    // Log all users in the room for debugging
    console.log(`Users in room ${roomId}:`);
    room.users.forEach((user, id) => {
      console.log(`- ${user.username} (${id})`);
    });

    // Broadcast updated user list to all clients in the room
    const userList = Array.from(room.users.values())
      // Filter out duplicate users (keeping only unique usernames)
      .filter((user, index, self) => 
        index === self.findIndex(u => u.username === user.username)
      )
      .map(user => ({
        id: user.id,
        username: user.username,
        peerId: user.peerId
      }));
    
    console.log(`Sending user list to room ${roomId}: ${userList.length} users`);
    io.to(roomId).emit('userList', userList);

    // Notify others that a user has joined
    console.log(`Notifying others that ${username} has joined room ${roomId}`);
    socket.to(roomId).emit('userJoined', username);
    
    // Notify the user that they have successfully joined
    socket.emit('joinedRoom', { 
      roomId, 
      userCount: room.users.size,
      message: `You (${username}) have joined room ${roomId}`
    });
  });

  socket.on('peer-id', ({ peerId }) => {
    // Find the room this socket is in
    const roomId = socketToRoomMap.get(socket.id) || Array.from(socket.rooms)[1];
    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId);
      
      // Always use socket.id as the user identifier
      const user = room.users.get(socket.id);
      if (user) {
        user.peerId = peerId;
        
        // Broadcast updated user list
        const userList = Array.from(room.users.values()).map(user => ({
          id: user.id,
          username: user.username,
          peerId: user.peerId
        }));
        io.to(roomId).emit('userList', userList);
      }
    }
  });

  socket.on('code-change', (code) => {
    // Find the room this socket is in
    const roomId = socketToRoomMap.get(socket.id) || Array.from(socket.rooms)[1];
    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId);
      room.code = code;
      
      // Broadcast code change to all other users in the room
      socket.to(roomId).emit('code-change', code);
      
      console.log(`User ${socket.id} updated code in room ${roomId}`);
    }
  });

  socket.on('chat-message', (message) => {
    console.log(`Received chat message from ${socket.id}:`, message);
    
    const roomId = socketToRoomMap.get(socket.id) || Array.from(socket.rooms)[1];
    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId);
      const user = room.users.get(socket.id);
      
      if (user) {
        // Ensure the message has the correct sender and username
        const messageToSend = {
          ...message,
          username: user.username,
          sender: socket.id,
          timestamp: message.timestamp || new Date().toISOString()
        };
        
        console.log(`Broadcasting message to room ${roomId}:`, messageToSend);
        
        // Send to all other users in the room
        socket.to(roomId).emit('chat-message', messageToSend);
      }
    } else {
      console.log(`Could not find room for socket ${socket.id} to send message`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`===== DISCONNECT: User with socket ID ${socket.id} disconnected =====`);
    const roomId = socketToRoomMap.get(socket.id);
    
    // Remove this socket from the room
    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId);
      
      // Find the user associated with this socket
      let userToRemove = null;
      let removeCompletely = false;
      
      room.users.forEach((user, id) => {
        // Check if this user has the disconnected socket in their sockets array
        const socketIndex = user.sockets.indexOf(socket.id);
        if (socketIndex !== -1) {
          userToRemove = { user, id };
          // Remove this socket from the user's sockets array
          user.sockets.splice(socketIndex, 1);
          
          // If this was the user's last socket, mark for complete removal
          if (user.sockets.length === 0) {
            removeCompletely = true;
          }
        }
      });
      
      if (userToRemove) {
        const username = userToRemove.user.username;
        
        if (removeCompletely) {
          console.log(`Removing user ${username} completely as they have no active connections`);
          room.users.delete(userToRemove.id);
          
          // Notify others that a user has left
          io.to(roomId).emit('userLeft', username);
          console.log(`Notified others that ${username} has left room ${roomId}`);
        } else {
          console.log(`User ${username} still has ${userToRemove.user.sockets.length} active connections`);
        }
        
        // Create updated user list
        const userList = Array.from(room.users.values())
          // Filter out duplicate users
          .filter((user, index, self) => 
            index === self.findIndex(u => u.username === user.username)
          )
          .map(user => ({
            id: user.id,
            username: user.username,
            peerId: user.peerId
          }));
        
        console.log(`Updated user list for room ${roomId}: ${userList.length} users remaining`);
        console.log(`Users in room: ${userList.map(u => u.username).join(', ') || 'none'}`);
        
        // Broadcast updated user list to all clients in the room
        io.to(roomId).emit('userList', userList);
        
        // Clean up empty rooms
        if (room.users.size === 0) {
          rooms.delete(roomId);
          console.log(`Room ${roomId} deleted because it's empty`);
        }
      }
    }
    
    // Clean up mappings
    socketToClientMap.delete(socket.id);
    socketToRoomMap.delete(socket.id);
  });

  // Add handler for requestUserList event
  socket.on('requestUserList', ({ roomId }) => {
    console.log(`Client ${socket.id} requested user list for room ${roomId}`);
    
    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId);
      
      // Create user list to send to clients
      const userList = Array.from(room.users.values()).map(user => ({
        id: user.id,
        username: user.username,
        peerId: user.peerId
      }));
      
      // Log detailed information about users
      console.log(`Room ${roomId} has ${userList.length} users:`);
      userList.forEach(user => {
        console.log(`- ${user.username} (${user.id})`);
      });
      
      // Send specifically to the requesting socket first to ensure it gets the list
      socket.emit('userList', userList);
      
      // Then send to the entire room
      io.to(roomId).emit('userList', userList);
    } else {
      console.log(`Could not find room ${roomId} for user list request`);
      // Send empty list if room doesn't exist
      socket.emit('userList', []);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});