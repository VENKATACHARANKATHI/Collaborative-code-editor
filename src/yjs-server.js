#!/usr/bin/env node

/**
 * Yjs WebSocket Server for collaborative editing
 * This server handles the synchronization of collaborative editing using Yjs
 */

const WebSocket = require('ws');
const http = require('http');
const y = require('y-websocket/bin/utils');

const port = process.env.PORT || 1234;
const host = process.env.HOST || 'localhost';

const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end('Yjs WebSocket server for collaborative editing\n');
});

// Create a WebSocket server
const wss = new WebSocket.Server({ server });

// Set up Yjs WebSocket server
y.setupWSConnection(wss, server, { host });

server.listen(port, () => {
  console.log(`Yjs WebSocket server running at http://${host}:${port}`);
  console.log('Ready for collaborative editing connections');
});

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
});

// Log WebSocket connections
wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`New connection from ${ip}`);
  
  ws.on('close', () => {
    console.log(`Connection from ${ip} closed`);
  });
});