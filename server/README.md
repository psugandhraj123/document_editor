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

## Project Structure

```
server/
├── src/
│   ├── app.ts              # Express app setup and middleware
│   ├── index.ts            # Server entry point and WebSocket setup
│   ├── types.ts            # TypeScript type definitions
│   ├── ot.ts               # Operational transformation logic
│   ├── auth.ts             # Authentication middleware and utilities
│   └── authRoutes.ts       # Authentication API routes
├── dist/                   # Compiled JavaScript output
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── .eslintrc.js           # ESLint configuration
└── .prettierrc            # Prettier configuration
```

## WebSocket Message Protocol

All messages use a JSON envelope format:

```typescript
interface WSEnvelope {
  type: 'HELLO' | 'OP' | 'PRESENCE' | 'SNAPSHOT' | 'REQUEST_SNAPSHOT' | 'ACK' | 'ERROR';
  payload: any;
  requestId?: string;
}
```

### Client → Server Messages

#### HELLO - Client Connection
```json
{
  "type": "HELLO",
  "payload": {
    "userId": "unique-user-id",
    "name": "User Display Name",
    "docId": "document-id",
    "lastKnownVersion": 0
  }
}
```

#### OP - Document Operation
```json
{
  "type": "OP",
  "payload": {
    "opId": "unique-operation-id",
    "userId": "user-id",
    "docId": "document-id",
    "baseVersion": 1,
    "blockId": "block-id",
    "kind": "insert|delete|replace",
    "index": 0,
    "length": 5,
    "text": "Hello"
  }
}
```

#### PRESENCE - User Cursor/Status
```json
{
  "type": "PRESENCE",
  "payload": {
    "cursor": {
      "blockId": "block-id",
      "index": 10
    },
    "typing": true
  }
}
```

### Server → Client Messages

#### SNAPSHOT - Document State
```json
{
  "type": "SNAPSHOT",
  "payload": {
    "document": {
      "id": "doc-id",
      "version": 5,
      "blockOrder": ["block1", "block2"]
    },
    "blocks": [
      {
        "id": "block1",
        "text": "Hello World",
        "version": 3
      }
    ]
  }
}
```

#### OP - Broadcast Operation
```json
{
  "type": "OP",
  "payload": {
    "opId": "op-id",
    "userId": "user-id",
    "docId": "doc-id",
    "baseVersion": 4,
    "blockId": "block-id",
    "kind": "insert",
    "index": 0,
    "text": "Hello",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

#### PRESENCE - Broadcast User Presence
```json
{
  "type": "PRESENCE",
  "payload": {
    "userId": "user-id",
    "name": "User Name",
    "color": "#FF6B6B",
    "cursor": {
      "blockId": "block-id",
      "index": 10
    },
    "typing": false
  }
}
```

#### ACK - Operation Acknowledgment
```json
{
  "type": "ACK",
  "payload": {
    "opId": "op-id",
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

## Authentication System

The server includes a complete authentication system:

### API Endpoints

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/profile` - Get user profile (protected)

### JWT Authentication

- JWT tokens for stateless authentication
- bcryptjs for secure password hashing
- Express session support for additional session management

## Operation Types

### Insert Operation
Adds text at a specific position in a block.

```typescript
{
  kind: "insert",
  index: 10,
  text: "Hello World"
}
```

### Delete Operation
Removes a specified number of characters from a block.

```typescript
{
  kind: "delete",
  index: 5,
  length: 3
}
```

### Replace Operation
Replaces a portion of text in a block with new text.

```typescript
{
  kind: "replace",
  index: 0,
  length: 5,
  text: "New Text"
}
```

## Operational Transformation

The server implements operational transformation (OT) for conflict resolution:

### Key Features
- **Concurrency Control**: Handles simultaneous edits from multiple users
- **Conflict Resolution**: Automatically resolves editing conflicts
- **Version Management**: Maintains document version consistency
- **Operation Replay**: Replays operations for late-joining clients

### OT Algorithm
1. **Version Checking**: Operations must be based on current document version
2. **Duplicate Prevention**: Operations with same `opId` are ignored
3. **Transformation**: Conflicting operations are transformed to maintain consistency
4. **Application**: Transformed operations are applied to document state

## Presence Management

### Real-time Updates
- Cursor positions and typing status are broadcast to all document participants
- Debounced broadcasting (100ms intervals) to prevent spam
- Unique user colors for visual identification

### User Tracking
- Active users are tracked per document session
- Automatic cleanup of disconnected users
- Typing indicators with debounced updates

## Performance Considerations

### In-memory Storage
- Fast access but data is lost on server restart
- Suitable for development and small-scale deployments
- Consider persistence layer for production use

### Operation Deduplication
- Prevents duplicate operations from being applied
- Maintains operation history for conflict resolution
- Efficient operation lookup and storage

### Connection Management
- Automatically cleans up dead connections
- Efficient broadcasting to relevant document participants
- Memory leak prevention through proper cleanup

## Testing

### Manual Testing
```bash
node test-relay.js
```

### Demo Script
```bash
node demo.js
```

## Security Notes

### Current Implementation
- **No Rate Limiting**: Consider implementing rate limiting for production
- **Input Validation**: Operations are validated but not sanitized
- **No CORS Restrictions**: Configure CORS for production environments

### Production Recommendations
- Implement rate limiting to prevent abuse
- Add input sanitization for user content
- Configure CORS with specific origins
- Use HTTPS in production
- Implement proper logging and monitoring

## Debugging

### Enable Debug Logging
```bash
DEBUG=* npm run dev
```

### Latency Simulation
Add artificial delays to simulate network latency:

```typescript
// In src/index.ts
ws.on('message', async (message) => {
  // Simulate 100ms network delay
  await new Promise(resolve => setTimeout(resolve, 100));
  // Process message...
});
```

### Force Conflicts
To test conflict resolution:
1. Connect multiple clients to the same document
2. Make edits at the same position simultaneously
3. Watch the OT algorithm resolve conflicts
4. Check server logs for conflict resolution details

## Future Enhancements

### Planned Features
- **Persistence**: Add database storage for documents and operations
- **Rate Limiting**: Implement rate limiting to prevent abuse
- **Metrics**: Enhanced logging and monitoring capabilities
- **Scalability**: Support for multiple server instances
- **Document History**: Version history and rollback capabilities

### Architecture Improvements
- **Redis Integration**: Distributed session and document storage
- **Load Balancing**: Support for horizontal scaling
- **Microservices**: Split into separate services for different concerns
- **Event Sourcing**: Event-driven architecture for better scalability

## Contributing

1. Follow TypeScript best practices
2. Add proper error handling and validation
3. Test with multiple concurrent clients
4. Update this README for any new features
5. Ensure all tests pass before submitting changes

## License

This project is proprietary software. All rights reserved.
