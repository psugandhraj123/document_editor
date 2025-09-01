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

## Project Structure

```
client/
├── src/
│   ├── app/              # Redux store configuration
│   ├── components/       # Reusable React components
│   ├── lib/             # Utility libraries and helpers
│   ├── types/           # TypeScript type definitions
│   ├── config/          # Configuration files
│   ├── assets/          # Static assets
│   ├── App.tsx          # Main application component
│   ├── main.tsx         # Application entry point
│   └── utils.ts         # Utility functions
├── public/              # Public static files
├── package.json         # Dependencies and scripts
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── tsconfig.json        # TypeScript configuration
```

## Key Components

### App.tsx
The main application component that manages:
- WebSocket connection to the server
- Document state and operations
- User presence and cursor tracking
- Real-time collaboration features

### Redux Store
Manages application state including:
- Document content and version
- User presence information
- Pending operations
- Connection status

### WebSocket Communication
Handles real-time communication with the server:
- Document operations (insert, delete, replace)
- User presence updates
- Document snapshots
- Error handling and reconnection

## Collaboration Features

### Real-time Editing
- Type in the editor and see changes appear instantly for all connected users
- Automatic conflict resolution using operational transformation
- Version-based synchronization to handle network issues

### User Presence
- See who else is currently editing the document
- View real-time cursor positions with user colors
- Typing indicators show when others are actively editing

### Document Operations
The client supports three types of operations:
- **Insert**: Add text at a specific position
- **Delete**: Remove text from a specific range
- **Replace**: Replace text in a specific range

## Testing Collaboration

1. Start the server (see server README)
2. Start the client: `npm run dev`
3. Open multiple browser tabs to `http://localhost:5173`
4. Start typing in different tabs to see real-time collaboration
5. Try editing the same text simultaneously to test conflict resolution

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

## Contributing

1. Follow the existing code style and TypeScript patterns
2. Add proper type definitions for new features
3. Test collaboration features with multiple browser tabs
4. Update this README for any new features or changes

## License

This project is proprietary software. All rights reserved.
