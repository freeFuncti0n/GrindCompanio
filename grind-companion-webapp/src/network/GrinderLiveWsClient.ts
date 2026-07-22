import { parseLiveTelemetry } from '../parsing/sessionParser';
import type { LiveTelemetry } from '../parsing/types';

export type LiveTelemetryHandler = (telemetry: LiveTelemetry) => void;

/**
 * WebSocket client for binary 20-byte live telemetry (same layout as BLE notify).
 */
export class GrinderLiveWsClient {
  private socket: WebSocket | null = null;
  private url: string | null = null;
  private handler: LiveTelemetryHandler | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldRun = false;

  connect(url: string, onTelemetry: LiveTelemetryHandler): void {
    this.disconnect(false);
    this.url = url;
    this.handler = onTelemetry;
    this.shouldRun = true;
    this.openSocket();
  }

  private openSocket(): void {
    if (!this.url || !this.handler || !this.shouldRun) return;

    const ws = new WebSocket(this.url);
    ws.binaryType = 'arraybuffer';
    this.socket = ws;

    ws.onopen = () => {
      /* server streams automatically when grinding */
    };

    ws.onmessage = (event) => {
      if (!this.handler) return;
      try {
        if (!(event.data instanceof ArrayBuffer)) return;
        this.handler(parseLiveTelemetry(new Uint8Array(event.data)));
      } catch {
        /* ignore malformed frames */
      }
    };

    ws.onclose = () => {
      this.socket = null;
      if (this.shouldRun && this.url) {
        this.reconnectTimer = setTimeout(() => this.openSocket(), 1500);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  disconnect(clearUrl = true): void {
    this.shouldRun = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
    if (clearUrl) {
      this.url = null;
      this.handler = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

export const grinderLiveWs = new GrinderLiveWsClient();
