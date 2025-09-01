import express from 'express';
import { createServer as createHttpServer } from 'http';
import { WebSocketServer } from 'ws';

export function createServer() {
  const app = express();
  const server = createHttpServer(app);
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // WebSocket server for real-time collaboration
  const wss = new WebSocketServer({ server });
  
  wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    
    ws.on('message', (message) => {
      // TODO: Implement message handling for collaborative editing
      console.log('Received message:', message);
    });
    
    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  });

  return server;
}
