/**
 * Type definitions for the collaborative document editor
 */

/**
 * Represents a user in the system
 */
export interface User {
  /** Unique identifier for the user */
  userId: string;
  /** Display name of the user */
  name: string;
}

/**
 * Represents the presence/state of a user in a document
 */
export interface Presence {
  /** Unique identifier for the user */
  userId: string;
  /** Display name of the user */
  name: string;
  /** Session identifier to distinguish between browser tabs */
  sessionId: string;
  /** Current cursor position of the user */
  cursor: number;
  /** Start index of the user's latest applied operation (inclusive) */
  opStart?: number;
  /** End index of the user's latest applied operation (exclusive) */
  opEnd?: number;
}

/**
 * Represents a collaborative document
 */
export interface Document {
  /** Unique identifier for the document */
  id: string;
  /** Current version number of the document */
  version: number;
  /** Document content as a single string */
  content: string;
}



/**
 * Represents an operation performed on a document
 * 
 * @invariant baseVersion <= document.version (operation must be based on a version <= current doc version)
 * @invariant For 'insert' operations: text must be provided
 * @invariant For 'delete' operations: length must be provided and > 0
 * @invariant For 'replace' operations: both text and length must be provided
 * @invariant index >= 0 (operation index must be non-negative)
 * @invariant For delete/replace: index + length <= block.text.length (operation must not exceed block boundaries)
 */
export interface Operation {
  /** Unique identifier for the operation */
  opId: string;
  /** ID of the user who performed the operation */
  userId: string;
  /** ID of the document this operation applies to */
  docId: string;
  /** Document version this operation is based on */
  baseVersion: number;
  /** Type of operation */
  kind: 'insert' | 'delete' | 'replace';
  /** Character index where the operation starts */
  index: number;
  /** Number of characters to delete/replace (required for delete/replace operations) */
  length?: number;
  /** Text to insert (required for insert/replace operations) */
  text?: string;
  /** Previous text that was removed (for undo/redo) */
  prevText?: string;
  /** Timestamp when the operation was created */
  timestamp?: string;
  /** Whether this operation is an inverse operation (for undo/redo) */
  invert?: boolean;
}



/**
 * WebSocket message envelope for communication between client and server
 * 
 * @invariant payload type must match the message type
 * @invariant requestId is required for messages expecting a response (REQUEST_SNAPSHOT)
 */
export interface WSEnvelope {
  /** Type of message being sent */
  type: 'HELLO' | 'OP' | 'PRESENCE' | 'SNAPSHOT' | 'REQUEST_SNAPSHOT' | 'ACK' | 'ERROR' | 'PING';
  /** Message payload (type depends on the message type) */
  payload: any;
  /** Optional request ID for request-response pattern */
  requestId?: string;
}
