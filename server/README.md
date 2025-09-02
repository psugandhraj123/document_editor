# Collaborative Document Editor - Server

A WebSocket relay server for real-time collaborative document editing with operational transformation support. This server manages document synchronization, user presence, and conflict resolution between multiple clients.

## Features

- **Real-time Collaboration**: WebSocket-based communication for instant updates
- **Operational Transformation**: Automatic conflict resolution for concurrent edits
- **User Presence Management**: Track active users, cursors, and typing indicators
- **Document Versioning**: Maintain document state and handle version conflicts
- **In-memory Storage**: Fast, lightweight storage for document state
- **Authentication Ready**: Built-in authentication system with JWT support
- **CORS Support**: Cross-origin resource sharing for web clients
- **Session Management**: Express session support for user sessions

## Tech Stack

- **Node.js** - JavaScript runtime
- **TypeScript** - Type-safe development
- **Express** - Web framework and middleware
- **WebSocket (ws)** - Real-time bidirectional communication
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing

## Architecture

The server maintains an in-memory store with:
- `documents`: Document metadata and version information
- `blocks`: Text content blocks within documents
- `appliedOps`: Applied operations for replay and conflict resolution
- `connectedClients`: Active WebSocket connections
- `documentSessions`: Active editing sessions with user presence

## Prerequisites

- Node.js 18+
- npm or yarn

## Installation

```bash
cd server
npm install
```

## Development

```bash
npm run dev
```

The development server will start on `http://localhost:8080` with hot reloading.

## Production

```bash
npm run build
npm start
```

## Configuration

Set environment variables to configure the server:

```bash
# Server Configuration
PORT=8080                    # Server port (default: 8080)
NODE_ENV=development         # Environment mode
JWT_SECRET=your-secret-key   # JWT signing secret
SESSION_SECRET=session-key   # Session encryption secret

# Development
npm run dev
```

## Overview

WebSocket relay and REST API for a single in-memory document, JWT auth, and session-scoped presence.

## API Quick Reference

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/document` (requires `Authorization: Bearer <token>`) returns the single document
- WebSocket at `ws://localhost:8080?token=<JWT>`

## Testing

Manual: `node test-relay.js`  |  Demo: `node demo.js`

 

## Simulating Two Users

Two practical ways to test collaboration:

1) Different accounts
- Register two different users via `POST /api/auth/register` (or use the UI from the client)
- Login both users and connect to the WebSocket with their tokens (the client app does this automatically)

2) Same account in two tabs
- Open two tabs/windows pointing to the client app
- Login once; both tabs will attach the same user but each tab uses its own `sessionId`
- The server treats each tab (session) as a distinct participant for presence

Notes
- Presence is keyed by `sessionId`. When a WebSocket closes, the server removes only the presence associated with that connection’s owned sessions.
- For the simple demo, there is a single in-memory document (`default-doc`).

## Assumptions

- The server provides a single shared document and an in-memory presence map.
- JWT tokens are signed with `JWT_SECRET` and validated on every REST and WebSocket connection.
- The client passes the token via `Authorization: Bearer <token>` for REST and `?token=<token>` for WebSocket.
- All data is ephemeral and resets on server restart.

## Limitations

- In-memory stores only: Users, document, applied ops, and presence are not persisted.
- Single-document model: No multi-document routing, permissions, or access control lists.
- Simplified OT: Minimal conflict handling; complex concurrent edits may need stronger transformation logic.
- No horizontal scaling: No shared state or Redis; multiple instances will diverge.
- Basic security posture: No rate limiting, limited CORS configuration, and no HTTPS termination; production hardening required.

## Security Notes (Essentials)

- No rate limiting or HTTPS by default; configure for production
- CORS is open for development; lock down origins in production

## License

This project is proprietary software. All rights reserved.
