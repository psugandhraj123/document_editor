import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Operation } from "../types/models";
import { applyEdit, transformOpIndex } from "../utils";

// --- Auth Slice ---
interface AuthState {
  userId: string;
  name: string;
  email: string;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialAuth: AuthState = {
  userId: localStorage.getItem('userId') || "",
  name: localStorage.getItem('userName') || "",
  email: localStorage.getItem('userEmail') || "",
  token: localStorage.getItem('authToken'),
  isAuthenticated: !!localStorage.getItem('authToken'),
  loading: false,
  error: null
};

const authSlice = createSlice({
  name: "auth",
  initialState: initialAuth,
  reducers: {
    setUser: (state, action: PayloadAction<{ userId: string; name: string; email: string; token: string }>) => {
      state.userId = action.payload.userId;
      state.name = action.payload.name;
      state.email = action.payload.email;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
      localStorage.setItem('authToken', action.payload.token);
      localStorage.setItem('userId', action.payload.userId);
      localStorage.setItem('userEmail', action.payload.email);
      localStorage.setItem('userName', action.payload.name);
    },
    logout: (state) => {
      state.userId = "";
      state.name = "";
      state.email = "";
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      localStorage.removeItem('authToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      sessionStorage.removeItem('editorSessionId');
    },
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setAuthError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearAuthError: (state) => {
      state.error = null;
    },
  },
});

// --- Document Slice ---
interface DocState {
  id: string; // document ID
  content: string; // entire document body
  version: number;
}

const initialDoc: DocState = {
  id: "",
  content: "Hello, World! This is a test document for undo/redo functionality.",
  version: 0,
};

const docSlice = createSlice({
  name: "doc",
  initialState: initialDoc,
  reducers: {
    setDocument: (
      state,
      action: PayloadAction<{ id: string; content: string; version: number }>
    ) => {
      state.id = action.payload.id;
      state.content = action.payload.content;
      state.version = action.payload.version;
    },

    applyOperation: (
      state,
      action: PayloadAction<Operation>
    ) => {
      const op = action.payload;
      // Apply the operation to content
      state.content = applyEdit(state.content, op);
      state.version++;
    },

    applyThirdPartyOperation: (
      state,
      action: PayloadAction<Operation>
    ) => {
      const op = action.payload;
      // Apply the operation to content
      state.content = applyEdit(state.content, op);
    },
  },
});

// --- History Slice ---
interface HistoryState {
  undo: Operation[];
  redo: Operation[];
}

const initialHistory: HistoryState = {
  undo: [],
  redo: [],
};

const historySlice = createSlice({
  name: "history",
  initialState: initialHistory,
  reducers: {
    addToUndo: (state, action: PayloadAction<Operation>) => {
      state.undo.push(action.payload);
    },

    addToRedo: (state, action: PayloadAction<Operation>) => {
      state.redo.push(action.payload);
    },

    popFromUndo: (state) => {
      if (state.undo.length > 0) {
        state.undo.pop();
      }
    },

    popFromRedo: (state) => {
      if (state.redo.length > 0) {
        state.redo.pop();
      }
    },
    clearRedo: (state) => {
      state.redo = [];
    },

    clearHistory: (state) => {
      state.undo = [];
      state.redo = [];
    },

    transformHistoryForThirdPartyOperation: (state, action: PayloadAction<Operation>) => {
      const op = action.payload;
      state.undo = state.undo.map(operation =>
        transformOpIndex(operation, op)
      );
      state.redo = state.redo.map(operation =>
        transformOpIndex(operation, op)
      );
    },
  },
});

// --- Presence Slice ---
interface Presence {
  userId: string;
  sessionId: string; // Add session ID to distinguish between tabs
  name: string;
  cursor: number;
  lastSeen: number; // Add timestamp for cleanup
  opStart?: number;
  opEnd?: number;
}

interface PresenceState {
  [sessionId: string]: Presence; // Change key to sessionId instead of userId
}

const initialPresence: PresenceState = {};

const presenceSlice = createSlice({
  name: "presence",
  initialState: initialPresence,
  reducers: {
    // Update presence with automatic session management (creates if doesn't exist, updates if it does)
    updatePresence: (state, action: PayloadAction<{
      cursor?: number;
      opStart?: number;
      opEnd?: number;
    }>) => {
      const userId = localStorage.getItem('userId');
      const name = localStorage.getItem('userName');

      if (!userId || !name) return;

      // Get or create session ID
      let sessionId = sessionStorage.getItem('editorSessionId');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem('editorSessionId', sessionId);
      }

      // If presence doesn't exist, create it
      if (!state[sessionId]) {
        state[sessionId] = {
          userId,
          sessionId,
          name,
          cursor: 0,
          lastSeen: Date.now()
        };
      }

      // Update presence with provided values
      const presence = state[sessionId];
      if (action.payload.cursor !== undefined) {
        presence.cursor = action.payload.cursor;
      }
      if (action.payload.opStart !== undefined) {
        presence.opStart = action.payload.opStart;
      }
      if (action.payload.opEnd !== undefined) {
        presence.opEnd = action.payload.opEnd;
      }
      presence.lastSeen = Date.now();
    },

    // Remove current session's presence
    removeCurrentPresence: (state) => {
      const sessionId = sessionStorage.getItem('editorSessionId');
      if (sessionId) {
        delete state[sessionId];
      }
    },

    // Handle incoming presence updates from other users
    updateUserPresence: (state, action: PayloadAction<Presence>) => {
      // Store presence using the sessionId from the incoming data
      if (action.payload.sessionId) {
        state[action.payload.sessionId] =  action.payload;
      }
    },

    // Bulk update multiple users' presence (array payload)
    updateUsersPresenceBulk: (state, action: PayloadAction<Presence[]>) => {
      for (const p of action.payload) {
        if (!p || !p.sessionId) continue;
        state[p.sessionId] = p;
      }
    },
  },
});

// Export reducers & actions
export const { setUser, logout, setAuthLoading, setAuthError, clearAuthError } = authSlice.actions;
export const { setDocument, applyOperation, applyThirdPartyOperation } = docSlice.actions;
export const {
  addToUndo,
  addToRedo,
  popFromUndo,
  popFromRedo,
  clearRedo,
  clearHistory,
  transformHistoryForThirdPartyOperation
} = historySlice.actions;
export const {
  updatePresence,
  removeCurrentPresence,
  updateUserPresence,
  updateUsersPresenceBulk
} = presenceSlice.actions;

export const rootReducer = {
  auth: authSlice.reducer,
  doc: docSlice.reducer,
  history: historySlice.reducer,
  presence: presenceSlice.reducer,
};
