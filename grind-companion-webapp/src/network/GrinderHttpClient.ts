/** Default HTTP port on the grinder (see smart-grind-by-weight/src/config/network.h) */
export const GRINDER_HTTP_PORT = 8080;

export type GrinderStatusResponse = {
  wifi_connected: boolean;
  ip: string;
  live_supported: boolean;
  remote_supported: boolean;
  ws_path: string;
  build: number;
  version: string;
  hostname: string;
};

export type GrinderLiveStateResponse = {
  active: boolean;
  weight_g: number;
  flow_g_s: number;
  target_g: number;
  progress: number;
  phase_id: number;
  profile_id: number;
  grind_mode: number;
  motor_on: number;
};

export type GrinderSessionsResponse = {
  session_ids: number[];
  count: number;
};

function normalizeHost(host: string): string {
  const trimmed = host.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.replace(/\/$/, '');
  }
  return `http://${trimmed.replace(/\/$/, '')}:${GRINDER_HTTP_PORT}`;
}

export class GrinderHttpClient {
  private baseUrl: string;

  constructor(host: string) {
    this.baseUrl = normalizeHost(host);
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getWsUrl(): string {
    const url = new URL(this.baseUrl);
    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${url.host}/ws/live`;
  }

  private async request<T>(
    path: string,
    init?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}${text ? `: ${text}` : ''}`);
    }
    if (init?.method === 'POST' && response.headers.get('content-type')?.includes('json')) {
      return (await response.json()) as T;
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return (await response.json()) as T;
    }
    throw new Error(`Unexpected content type: ${contentType || 'none'}`);
  }

  async getStatus(): Promise<GrinderStatusResponse> {
    return this.request<GrinderStatusResponse>('/api/status');
  }

  async getFeatures(): Promise<GrinderStatusResponse> {
    return this.request<GrinderStatusResponse>('/api/features');
  }

  async getLiveState(): Promise<GrinderLiveStateResponse> {
    return this.request<GrinderLiveStateResponse>('/api/live/state');
  }

  async postLiveStart(): Promise<void> {
    await this.postOk('/api/live/start');
  }

  async postLiveStop(): Promise<void> {
    await this.postOk('/api/live/stop');
  }

  async postLivePurge(): Promise<void> {
    await this.postOk('/api/live/purge');
  }

  async postLiveIdle(): Promise<void> {
    await this.postOk('/api/live/idle');
  }

  private async postOk(path: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}${path}`, { method: 'POST' });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}${text ? `: ${text}` : ''}`);
    }
  }

  async getSessionIds(): Promise<number[]> {
    const data = await this.request<GrinderSessionsResponse>('/api/sessions');
    return data.session_ids ?? [];
  }

  async getSessionBinary(sessionId: number): Promise<ArrayBuffer> {
    const response = await fetch(`${this.baseUrl}/api/sessions/${sessionId}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} loading session ${sessionId}`);
    }
    return response.arrayBuffer();
  }
}
