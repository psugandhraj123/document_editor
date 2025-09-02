# Collaborative Document Editor - Client

A real-time collaborative plaintext editor client built with React, TypeScript, and Redux Toolkit. This client provides a modern, responsive interface for collaborative document editing with operational transformation support.

## Features

- **Real-time Collaboration**: Multiple users can edit the same document simultaneously
- **Operational Transformation**: Automatic conflict resolution for concurrent edits
- **Live Cursor Tracking**: See other users' cursors and typing indicators in real-time
- **Modern UI**: Clean, responsive interface built with Tailwind CSS
- **TypeScript**: Full type safety and better developer experience
- **Redux Toolkit**: Efficient state management for complex editor state

## Tech Stack

- **React 19** - Modern React with concurrent features
- **TypeScript** - Type-safe development
- **Redux Toolkit** - State management
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **WebSocket** - Real-time communication with server

## Prerequisites

- Node.js 18+
- npm or yarn
- The server must be running (see server README)

## Installation

```bash
cd client
npm install
```

## Environment Configuration

Create a `.env` file in the client directory with the following variables:

```env
# Backend Configuration
VITE_BACKEND_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080
```

### Environment Variables

- `VITE_BACKEND_URL`: The base URL for the REST API server (default: `http://localhost:8080`)
- `VITE_WS_URL`: The WebSocket URL for real-time collaboration (default: `ws://localhost:8080`)

## Development

```bash
npm run dev
```

The development server will start on `http://localhost:5173` with hot module replacement.

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `dist` directory.

## Preview Production Build

```bash
npm run preview
```

Serves the production build locally for testing.

## Linting

```bash
npm run lint
```

Runs ESLint to check code quality and consistency.

## Quick Test

1. Start the server (see server README)
2. Start the client: `npm run dev`
3. Open two browser tabs to `http://localhost:5173`
4. Type in either tab and observe real-time updates

## Development Tips

### Debugging
- Open browser DevTools to see WebSocket messages
- Check the Redux DevTools extension for state changes
- Monitor the Network tab for WebSocket communication

### Performance
- The editor uses efficient rendering with React's reconciliation
- Redux Toolkit provides optimized state updates
- WebSocket messages are debounced to prevent spam

### Customization
- Modify `tailwind.config.js` to customize the UI theme
- Update `src/types/` for new data structures
- Extend `src/components/` for new UI components

## Troubleshooting

### Connection Issues
- Ensure the server is running on the correct port
- Check environment variables in `.env` file
- Verify WebSocket URL is accessible

### Build Issues
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npx tsc --noEmit`
- Verify all dependencies are installed

### Runtime Issues
- Check browser console for JavaScript errors
- Verify WebSocket connection status
- Monitor Redux state for unexpected changes

## Simulating Two Users

You can test collaboration in two ways:

1) Different accounts
- Register two separate users via the built-in auth UI
- Login in two different browsers or two different profiles (e.g., Chrome Profile A and Profile B)
- Both users will appear with distinct names and independent cursors

2) Same account in two tabs
- Open two tabs or windows of the same browser
- Login with the same account in both tabs
- Each tab generates its own session id (stored in `sessionStorage` as `editorSessionId`) so they behave as two distinct collaborators

Notes
- Presence is keyed by session id, not just user id. Multiple tabs for the same user are treated as separate participants.
- To clean up a tab's presence, close the tab or navigate away; the server and client broadcast presence removal for that session id.

## Assumptions

- Authentication is handled by the app’s simple in-memory user store on the server. Tokens are short-lived (24 hours) and stored in `localStorage` on the client.
- A single default document is used (`default-doc`). There is no document list or multi-document routing.
- WebSocket URL and REST API base URL are configured via `VITE_WS_URL` and `VITE_BACKEND_URL` (defaults: `ws://localhost:8080` and `http://localhost:8080`).
- Presence and cursor overlays assume a single block, plaintext editing experience.

## Limitations

- In-memory storage only: Users, document content, and presence reset on server restart.
- Single-document editor: No per-document permissions, no multi-doc navigation.
- Simplified OT: Concurrent edits are applied optimistically with minimal transformation; complex conflict scenarios may produce unexpected cursor shifts.
- No persistence or history timeline: Undo/redo is local to the session; there is no version history across sessions.
- Basic security: No rate limiting, coarse CORS defaults, and no HTTPS configuration. Production hardening is required.

## License

This project is proprietary software. All rights reserved.
