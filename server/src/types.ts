import { v4 as uuidv4 } from "uuid";
import { Request } from "express";

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
 */
export interface WSEnvelope {
  /** Type of message being sent */
  type: 'HELLO' | 'OP' | 'PRESENCE' | 'SNAPSHOT' | 'REQUEST_SNAPSHOT' | 'ACK' | 'ERROR' | 'PING' | 'PONG';
  /** Message payload (type depends on the message type) */
  payload: any;
  /** Optional request ID for request-response pattern */
  requestId?: string;
}

/**
 * Generate a unique operation ID
 */
export const generateOpId = () => uuidv4();

// Authentication types
export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthRequest extends Request {
  user?: User;
}

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  iat: number;
  exp: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  token: string;
}
  