# Collaborative Document Editor

A real-time collaborative plaintext editor with operational transformation (OT) support, built with React + TypeScript on the frontend and Node.js + WebSocket on the backend.

## Purpose

This is a **plaintext collaborative editor** that provides:
- **Real-time collaboration** - Multiple users can edit the same document simultaneously
- **In-memory relay** - No database required, all state is maintained in memory
- **Operational Transformation** - Handles concurrent edits and resolves conflicts automatically
- **WebSocket communication** - Low-latency real-time updates between clients

## Architecture

```
┌─────────────┐    WebSocket    ┌─────────────┐
│   Client 1  │ ◄─────────────► │   Server    │
│  (Browser)  │                 │ (Relay)     │
└─────────────┘                 └─────────────┘
       ▲                              ▲
       │                              │
       │                              │
┌─────────────┐    WebSocket    ┌─────────────┐
│   Client 2  │ ◄─────────────► │   Server    │
│  (Browser)  │                 │ (Relay)     │
└─────────────┘                 └─────────────┘
```

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Running Locally

1. **Start the WebSocket relay server:**
   ```bash
   cd server
   npm install
   npm run dev
   ```
   Server will start on `http://localhost:8080`

2. **Start the React client:**
   ```bash
   cd client
   npm install
   npm run dev
   ```
   Client will start on `http://localhost:5173`

3. **Open multiple browser tabs** to simulate multiple users collaborating

## Simulating Multiple Users

To test collaboration:
1. Open the editor in one browser tab
2. Open the same URL in another tab (or different browser)
3. Start typing in both tabs - you'll see real-time updates
4. Try editing the same text simultaneously to test conflict resolution

## WebSocket Message Protocol

All messages use a JSON envelope format:

```typescript
interface WSEnvelope {
  type: 'HELLO' | 'OP' | 'PRESENCE' | 'SNAPSHOT' | 'REQUEST_SNAPSHOT' | 'ACK' | 'ERROR';
  payload: any;
  requestId?: string;
}
```

### Message Types & Schemas

#### HELLO - Client Connection
```json
{
  "type": "HELLO",
  "payload": {
    "userId": "user-123",
    "name": "Alice",
    "color": "#ff6b6b"
  }
}
```

#### OP - Document Operation
```json
{
  "type": "OP",
  "payload": {
    "opId": "op-456",
    "userId": "user-123",
    "docId": "doc-789",
    "baseVersion": 5,
    "blockId": "block-abc",
    "kind": "insert",
    "index": 10,
    "text": "Hello World",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### PRESENCE - User Cursor/Status
```json
{
  "type": "PRESENCE",
  "payload": {
    "userId": "user-123",
    "name": "Alice",
    "color": "#ff6b6b",
    "cursor": {
      "blockId": "block-abc",
      "index": 15
    },
    "typing": true
  }
}
```

#### SNAPSHOT - Document State
```json
{
  "type": "SNAPSHOT",
  "payload": {
    "docId": "doc-789",
    "version": 6,
    "blocks": [
      {
        "id": "block-abc",
        "text": "Hello World\nThis is a test",
        "version": 6
      }
    ],
    "blockOrder": ["block-abc"]
  }
}
```

#### REQUEST_SNAPSHOT - Request Document State
```json
{
  "type": "REQUEST_SNAPSHOT",
  "payload": {
    "docId": "doc-789"
  },
  "requestId": "req-123"
}
```

#### ACK - Operation Acknowledgment
```json
{
  "type": "ACK",
  "payload": {
    "opId": "op-456",
    "status": "applied"
  },
  "requestId": "req-123"
}
```

#### ERROR - Error Response
```json
{
  "type": "ERROR",
  "payload": {
    "code": "VERSION_MISMATCH",
    "message": "Operation based on outdated version",
    "details": {
      "expectedVersion": 6,
      "receivedVersion": 4
    }
  },
  "requestId": "req-123"
}
```

## Debugging Tips

### Latency Simulation
Add artificial delays in the server to simulate network latency:

```typescript
// In server/src/app.ts
ws.on('message', async (message) => {
  // Simulate 100ms network delay
  await new Promise(resolve => setTimeout(resolve, 100));
  // Process message...
});
```

### Force Conflicts
To test conflict resolution:
1. Open two tabs
2. Make edits at the same position simultaneously
3. Watch the OT algorithm resolve conflicts
4. Check the console for conflict resolution logs

### Debug Logging
Enable verbose logging by setting environment variables:
```bash
DEBUG=* npm run dev  # Server
DEBUG=* npm run dev  # Client
```

## Developer Guide

### Project Structure
```
├── client/                 # React frontend
│   ├── src/
│   │   ├── types/         # TypeScript interfaces
│   │   │   └── models.ts  # Core data models
│   │   └── App.tsx        # Main editor component
│   └── package.json
├── server/                 # WebSocket relay
│   ├── src/
│   │   ├── app.ts         # Express + WebSocket setup
│   │   └── index.ts       # Server entry point
│   └── package.json
└── README.md
```

### Where Slices Live
- **Client State**: Document content, user presence, pending operations
- **Server State**: Document snapshots, operation history, connected clients
- **Shared State**: Document version numbers, operation IDs

### OT Logic Implementation
The operational transformation logic handles:
1. **Insert Operations**: Add text at specific positions
2. **Delete Operations**: Remove text ranges
3. **Replace Operations**: Replace text ranges with new content
4. **Conflict Resolution**: Automatically resolve concurrent edits

Key invariants:
- Operations must be based on document versions ≤ current version
- Text content required for insert/replace operations
- Length required for delete/replace operations

### Extending the Editor

#### Adding New Operation Types
1. Extend the `Operation.kind` union in `client/src/types/models.ts`
2. Update the server's operation handling logic
3. Implement the corresponding client-side editor behavior

#### Adding New Message Types
1. Add to the `WSEnvelope.type` union
2. Define the payload schema
3. Implement server-side message handling
4. Update client-side message processing

#### Adding New Document Features
1. Extend the `Document` or `Block` interfaces
2. Update the snapshot message schema
3. Modify the editor UI to display new features
4. Implement the corresponding collaboration logic

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is proprietary software. All rights reserved.
