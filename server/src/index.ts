import http from "http";
import express from "express";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import {
  Document,
  Operation,
  WSEnvelope,
  generateOpId,
  Presence,
} from "./types";
import { applyOperation } from "./ot";
import authRoutes from "./authRoutes";
import { authMiddleware, verifyToken } from "./auth";
import { AuthRequest } from "./types";

// -----------------------------
// Single document store
// -----------------------------
let document: Document = {
  id: "default-doc",
  version: 0,
  content: "Hello, World! This is a test document for collaborative editing."
};

const clients = new Set<WebSocket>();
// Store user presence information by sessionId
const userPresence = new Map<string, Presence>();

// -----------------------------
// Server setup
// -----------------------------
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (_, res) => res.json({ status: "ok" }));

// Authentication routes
app.use("/api/auth", authRoutes);

// Protected document endpoint
app.get("/api/document", authMiddleware, (_, res) => {
  res.json(document);
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// -----------------------------
// Helper functions
// -----------------------------
function send(ws: WebSocket, type: string, payload: any, requestId?: string) {
  const envelope: WSEnvelope = { type: type as any, payload, requestId };
  ws.send(JSON.stringify(envelope));
}

function broadcast(exclude: WebSocket, msg: WSEnvelope) {
  clients.forEach((client) => {
    if (client !== exclude) {
      client.send(JSON.stringify(msg));
    }
  });
}

// -----------------------------
// WebSocket logic with authentication
// -----------------------------
wss.on("connection", (ws: WebSocket, req) => {
  // Extract token from query parameters or headers
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const token = url.searchParams.get('token') || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    send(ws, "ERROR", { message: "Authentication required" });
    ws.close();
    return;
  }
  
  const payload = verifyToken(token);
  if (!payload) {
    send(ws, "ERROR", { message: "Invalid token" });
    ws.close();
    return;
  }
  
  console.log(`User ${payload.name} connected`);
  clients.add(ws);

  ws.on("message", (raw) => {
    try {
      const msg: WSEnvelope = JSON.parse(raw.toString());

      // HELLO - Send current document state
      if (msg.type === "HELLO") {
        send(ws, "SNAPSHOT", { doc: document }, msg.requestId);
        return;
      }

      // OP - Apply operation to document
      if (msg.type === "OP") {
        const op: Operation = msg.payload;

        // Ensure operation has required fields
        if (!op.opId) op.opId = generateOpId();
        if (!op.docId) op.docId = document.id;
        if (!op.userId) op.userId = payload.userId;
        if (!op.baseVersion) op.baseVersion = document.version;
        if (!op.timestamp) op.timestamp = new Date().toISOString();

        // // Simple version check
        // if (op.baseVersion !== document.version) {
        //   send(ws, "ERROR", {
        //     message: "Version mismatch, request snapshot",
        //     requestId: msg.requestId
        //   });
        //   return;
        // }

        // Apply operation
        try {
          const newContent = applyOperation(document.content, op);
          document.content = newContent;
          document.version++;

          // Broadcast to other clients
          broadcast(ws, { type: "OP", payload: op });
          
          // Send ACK
          send(ws, "ACK", { opId: op.opId }, msg.requestId);
        } catch (error) {
          console.error("Error applying operation:", error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          send(ws, "ERROR", {
            message: `Failed to apply operation: ${errorMessage}`,
            requestId: msg.requestId
          });
        }
        return;
      }

      // PRESENCE - Update user presence and broadcast to others
      if (msg.type === "PRESENCE") {
        const presence: Presence = msg.payload;
        
        // Ensure presence has required fields
        if (!presence.userId) presence.userId = payload.userId;
        if (!presence.name) presence.name = payload.name;
        if (!presence.sessionId) {
          // Generate a session ID if not provided
          presence.sessionId = `${payload.userId}-${Date.now()}`;
        }
        
        // Store the presence by sessionId
        userPresence.set(presence.sessionId, presence);
        
        // Broadcast to other clients
        broadcast(ws, { type: "PRESENCE", payload: presence });
        
        // Send ACK
        send(ws, "ACK", { presenceId: presence.sessionId }, msg.requestId);
        return;
      }

      // REQUEST_SNAPSHOT
      if (msg.type === "REQUEST_SNAPSHOT") {
        send(ws, "SNAPSHOT", { doc: document }, msg.requestId);
        return;
      }

      // PING
      if (msg.type === "PING") {
        send(ws, "PONG", { ts: Date.now() });
        return;
      }

    } catch (err) {
      console.error("Error processing message:", err);
      send(ws, "ERROR", { message: "Malformed message" });
    }
  });

  ws.on("close", () => {
    // Remove user presence when they disconnect
    // Find and remove all sessions for this user
    for (const [sessionId, presence] of userPresence.entries()) {
      if (presence.userId === payload.userId) {
        userPresence.delete(sessionId);
      }
    }
    clients.delete(ws);
    console.log(`User ${payload.name} disconnected`);
  });
});

// -----------------------------
// Start server
// -----------------------------
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Document editor server listening on :${PORT}`);
  console.log(`Document available at: http://localhost:${PORT}/api/document`);
  console.log(`Auth endpoints available at: http://localhost:${PORT}/api/auth`);
});
