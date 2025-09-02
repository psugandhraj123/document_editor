// /client/src/lib/network.ts
import { v4 as uuidv4 } from "uuid";

export type EnvelopeType =
  | "HELLO"
  | "OP"
  | "PRESENCE"
  | "SNAPSHOT"
  | "REQUEST_SNAPSHOT"
  | "ACK"
  | "ERROR"
  | "PING"
  | "PONG";

export interface WSEnvelope {
  type: EnvelopeType;
  payload: any;
  requestId?: string;
}

export type NetworkEvents =
  | "connected"
  | "disconnected"
  | "resync-start"
  | "resync-done"
  | "error"
  | "message";

type Handler = (data?: any) => void;

interface Options {
  userId: string;
  name: string;
  docId: string;
  lastKnownVersion: number;
}

export class NetworkClient {
  private url: string;
  private ws: WebSocket | null = null;
  private handlers: Map<NetworkEvents, Handler[]> = new Map();
  private opts: Options;
  private reconnectAttempts = 0;
  private backoffBase = 1000; // 1s
  private backoffMax = 10000; // 10s
  private heartbeatInterval: number | null = null;
  private outboundQueue: WSEnvelope[] = [];
  private sentOpIds: Set<string> = new Set();

  constructor(url: string, opts: Options) {
    this.url = url;
    this.opts = opts;
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.emit("connected");

      // Send HELLO
      this.sendEnvelope("HELLO", {
        userId: this.opts.userId,
        name: this.opts.name,
        docId: this.opts.docId,
        lastKnownVersion: this.opts.lastKnownVersion,
      });

      // Flush outbound queue
      while (this.outboundQueue.length > 0) {
        const msg = this.outboundQueue.shift()!;
        this._send(msg);
      }

      // Heartbeat
      this.heartbeatInterval = setInterval(() => {
        this.sendEnvelope("PING", { ts: Date.now() });
      }, 20000);
    };

    this.ws.onmessage = (event) => {
      try {
        const data: WSEnvelope = JSON.parse(event.data);
        if (data.type === "PONG") return; // ignore pongs
        this.emit("message", data);
      } catch (err) {
        this.emit("error", err);
      }
    };

    this.ws.onclose = () => {
      this.emit("disconnected");
      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
      this.scheduleReconnect();
    };

    this.ws.onerror = (err) => {
      this.emit("error", err);
    };
  }

  private scheduleReconnect() {
    const delay = Math.min(
      this.backoffBase * 2 ** this.reconnectAttempts,
      this.backoffMax
    );
    this.reconnectAttempts++;
    setTimeout(() => {
      this.connect();
    }, delay + Math.random() * 500); // jitter
  }

  private _send(msg: WSEnvelope) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.outboundQueue.push(msg);
      return;
    }
    this.ws.send(JSON.stringify(msg));
  }

  sendEnvelope(type: EnvelopeType, payload: any, requestId?: string) {
    const envelope: WSEnvelope = {
      type,
      payload,
      requestId: requestId || uuidv4(),
    };

    // Dedupe OP messages by opId
    if (type === "OP" && payload?.opId) {
      this.sentOpIds.add(payload.opId);
    }

    this._send(envelope);
  }

  on(event: NetworkEvents, handler: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event)!.push(handler);
  }

  private emit(event: NetworkEvents, data?: any) {
    const handlers = this.handlers.get(event) || [];
    handlers.forEach((h) => h(data));
  }

  close() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.ws?.close();
  }
}
