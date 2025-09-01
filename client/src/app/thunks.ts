import { createAsyncThunk } from "@reduxjs/toolkit";
import { applyOperation, addToUndo, addToRedo, popFromUndo, popFromRedo, setDocument, clearHistory, clearRedo, updateUsersPresenceBulk, updatePresence } from "./slice";
import { getFinalCursor, getOperationRange, transformCursorForOperation } from "../utils";
import type { Operation } from "../types/models";
import type { NetworkClient } from "../lib/network";

// Network client reference that can be set from outside
let networkClient: NetworkClient | null = null;

export const setNetworkClient = (client: NetworkClient) => {
  networkClient = client;
};

// Build, apply locally, and broadcast bulk presence changes for an operation
function computeAndBroadcastBulkPresence(
  dispatch: any,
  getState: any,
  operation: Operation,
  finalCursor: number,
  opRange: { start: number; end: number }
) {
  const state = getState() as any;
  const presenceState = state.presence as Record<string, { sessionId: string; cursor: number; userId: string; name: string; opStart?: number; opEnd?: number } | undefined>;
  const mySessionId = sessionStorage.getItem('editorSessionId');
  dispatch(updatePresence({ cursor: finalCursor, opStart: opRange.start, opEnd: opRange.end }));


  const bulk: Array<{ userId: string; name: string; sessionId: string; cursor: number; opStart?: number; opEnd?: number; lastSeen?: number }> = [];

  // Others adjusted through the operation
  for (const p of Object.values(presenceState)) {
    if (!p) continue;
    if (mySessionId && p.sessionId === mySessionId) continue;
    const newCursor = transformCursorForOperation(p.cursor ?? 0, operation);
    if (newCursor !== p.cursor) {
      bulk.push({ userId: p.userId, name: p.name, sessionId: p.sessionId, cursor: newCursor, lastSeen: Date.now() });
    }
  }

  // 2) Bulk apply eligible others locally
  if (bulk.length > 0) {
    dispatch(updateUsersPresenceBulk(bulk as any));
  }

  // 3) Send eligible updates + current presence to the server
  let selfPresence: any = null;
  if (mySessionId) {
    const updated = getState() as any;
    const updatedPresenceState = updated.presence as Record<string, any>;
    selfPresence = updatedPresenceState[mySessionId] || null;
  }

  const serverPayload = selfPresence ? [selfPresence, ...bulk] : bulk;
  if (networkClient && serverPayload.length > 0) {
    networkClient.sendEnvelope("PRESENCE", serverPayload);
  }
}

// Thunk for setting document that also clears history
export const setDocumentWithHistoryClear = createAsyncThunk(
  'doc/setDocumentWithHistoryClear',
  async (documentData: { id: string; content: string; version: number }, { dispatch }) => {
    // Set the document
    dispatch(setDocument(documentData));
    // Clear the history
    dispatch(clearHistory());
    return null;
  }
);

// Custom thunk actions that can update both document and presence
export const undoWithPresenceUpdate = createAsyncThunk(
  'doc/undoWithPresence',
  async (_, { dispatch, getState }) => {
    console.log("undoWithPresenceUpdate");
    const state = getState() as any;
    const historyState = state.history;
    
    if (historyState.undo.length === 0) return null;
    
    // Get the last operation before popping it
    const lastOp = historyState.undo[historyState.undo.length - 1];
    
    // Calculate the final cursor position after undoing
    const inverted = { ...lastOp, invert: true } as Operation;
    const finalCursor = getFinalCursor(inverted);
    const opRange = getOperationRange(inverted);
    
    // Pop the operation from undo stack
    dispatch(popFromUndo());
    
    // Apply the inverted operation to the document
    dispatch(applyOperation({...lastOp, invert: true}));
    
    // Add to redo stack
    dispatch(addToRedo(lastOp));
    
    // Compute and apply bulk presence updates (self + adjusted others)
    computeAndBroadcastBulkPresence(dispatch, getState, inverted, finalCursor, opRange);
    
    // Send operation to network
    if (networkClient) {
      networkClient.sendEnvelope("OP", { ...lastOp, invert: true });
    }
    
    return null;
  }
);

export const redoWithPresenceUpdate = createAsyncThunk(
  'doc/redoWithPresence',
  async (_, { dispatch, getState }) => {
    const state = getState() as any;
    const historyState = state.history;
    
    if (historyState.redo.length === 0) return null;
    
    // Get the operation before popping it
    const op = historyState.redo[historyState.redo.length - 1];
    
    // Calculate the final cursor position after redoing
    const finalCursor = getFinalCursor(op);
    const opRange = getOperationRange(op);
    
    // Pop the operation from redo stack
    dispatch(popFromRedo());
    
    // Apply the operation to the document
    dispatch(applyOperation(op));
    
    // Add back to undo stack
    dispatch(addToUndo(op));
    
    // Compute and apply bulk presence updates (self + adjusted others)
    computeAndBroadcastBulkPresence(dispatch, getState, op, finalCursor, opRange);
    
    // Send operation to network
    if (networkClient) {
      networkClient.sendEnvelope("OP", op);
    }
    
    return null;
  }
);

export const applyOperationWithPresenceUpdate = createAsyncThunk(
  'doc/applyOperationWithPresence',
  async (operation: Operation, { dispatch, getState }) => {
    // Apply the operation to the document
    dispatch(applyOperation(operation));
    
    // Add to undo stack
    dispatch(addToUndo(operation));
    dispatch(clearRedo());
    
    // Calculate the final cursor position after applying the operation
    const finalCursor = getFinalCursor(operation);
    const opRange = getOperationRange(operation);

    // Compute and send bulk presence updates: self + adjust others
    computeAndBroadcastBulkPresence(dispatch, getState, operation, finalCursor, opRange);
    
    // Send operation to network
    if (networkClient) {
      networkClient.sendEnvelope("OP", operation);
    }
    
    return null;
  }
);

