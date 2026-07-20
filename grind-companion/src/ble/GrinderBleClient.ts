import { Buffer } from 'buffer';
import { BleManager, Device, State, Subscription } from 'react-native-ble-plx';
import { Platform } from 'react-native';
import {
  BLE_DATA_CMD_GET_FILE_LIST,
  BLE_DATA_CMD_REQUEST_FILE,
  BLE_DATA_COMPLETE,
  BLE_DATA_CONTROL_CHAR_UUID,
  BLE_DATA_ERROR,
  BLE_DATA_SERVICE_UUID,
  BLE_DATA_STATUS_CHAR_UUID,
  BLE_DATA_TRANSFER_CHAR_UUID,
  BLE_LIVE_CONTROL_CHAR_UUID,
  BLE_LIVE_CMD_DISABLE,
  BLE_LIVE_CMD_ENABLE,
  BLE_LIVE_CMD_START_GRIND,
  BLE_LIVE_CMD_STOP_GRIND,
  BLE_LIVE_CMD_CONTINUE_PURGE,
  BLE_LIVE_CMD_RETURN_IDLE,
  BLE_LIVE_SERVICE_UUID,
  BLE_LIVE_TELEMETRY_CHAR_UUID,
  BLE_SYSINFO_SESSIONS_CHAR_UUID,
  BLE_SYSINFO_SERVICE_UUID,
  BLE_SYSINFO_SYSTEM_CHAR_UUID,
  DEVICE_NAME,
} from './uuids';
import { parseLiveTelemetry, parseSessionFile } from '../parsing/sessionParser';
import type { LiveTelemetry, ParsedSessionFile } from '../parsing/types';
import { getExistingSessionIds, upsertParsedSession } from '../db/database';

export type ScanDevice = {
  id: string;
  name: string | null;
  rssi: number | null;
};

type ProgressCallback = (message: string, progress?: number) => void;

function base64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(Buffer.from(b64, 'base64'));
}

function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

function concatChunks(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

function readU32LE(data: Uint8Array, offset: number): number {
  return (
    (data[offset] |
      (data[offset + 1] << 8) |
      (data[offset + 2] << 16) |
      (data[offset + 3] << 24)) >>>
    0
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type BleFeatures = {
  liveSupported: boolean;
  remoteSupported: boolean;
};

/**
 * BLE client for GrindByWeight — mirrors tools/ble/grinder-ble.py export flow.
 */
export class GrinderBleClient {
  private manager: BleManager | null = null;
  private device: Device | null = null;
  private transferSub: Subscription | null = null;
  private statusSub: Subscription | null = null;
  private liveSub: Subscription | null = null;

  private receivingData = false;
  private dataChunks: Uint8Array[] = [];
  private dataStatus = 0;

  private ensureManager(): BleManager {
    if (Platform.OS === 'web') {
      throw new Error('BLE is not available on web. Use a Dev Client on iPhone/iPad.');
    }
    if (!this.manager) {
      this.manager = new BleManager();
    }
    return this.manager;
  }

  async waitForPoweredOn(timeoutMs = 15000): Promise<void> {
    const manager = this.ensureManager();
    const start = Date.now();
    let state = await manager.state();
    while (state !== State.PoweredOn) {
      if (Date.now() - start > timeoutMs) {
        throw new Error(`Bluetooth not ready (state=${state})`);
      }
      await sleep(250);
      state = await manager.state();
    }
  }

  async scan(timeoutMs = 8000): Promise<ScanDevice[]> {
    const manager = this.ensureManager();
    await this.waitForPoweredOn();

    const found = new Map<string, ScanDevice>();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        manager.stopDeviceScan();
        resolve(Array.from(found.values()));
      }, timeoutMs);

      manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
        if (error) {
          clearTimeout(timer);
          manager.stopDeviceScan();
          reject(error);
          return;
        }
        if (!device) return;
        const name = device.name ?? device.localName;
        if (name && name.toLowerCase().includes('grind')) {
          found.set(device.id, {
            id: device.id,
            name,
            rssi: device.rssi,
          });
        }
      });
    });
  }

  async connect(deviceId?: string, deviceName = DEVICE_NAME): Promise<Device> {
    const manager = this.ensureManager();
    await this.waitForPoweredOn();

    let targetId = deviceId;
    if (!targetId) {
      const devices = await this.scan(10000);
      const match = devices.find((d) => d.name === deviceName) ?? devices[0];
      if (!match) {
        throw new Error(`${deviceName} not found. Enable BLE on the grinder.`);
      }
      targetId = match.id;
    }

    const device = await manager.connectToDevice(targetId, { autoConnect: false });
    await device.discoverAllServicesAndCharacteristics();
    this.device = device;

    this.transferSub?.remove();
    this.statusSub?.remove();

    this.transferSub = device.monitorCharacteristicForService(
      BLE_DATA_SERVICE_UUID,
      BLE_DATA_TRANSFER_CHAR_UUID,
      (error, characteristic) => {
        if (error || !characteristic?.value) return;
        if (this.receivingData) {
          this.dataChunks.push(base64ToBytes(characteristic.value));
        }
      }
    );

    this.statusSub = device.monitorCharacteristicForService(
      BLE_DATA_SERVICE_UUID,
      BLE_DATA_STATUS_CHAR_UUID,
      (error, characteristic) => {
        if (error || !characteristic?.value) return;
        const bytes = base64ToBytes(characteristic.value);
        if (bytes.length === 0) return;
        this.dataStatus = bytes[0];
        if (this.dataStatus === BLE_DATA_COMPLETE || this.dataStatus === BLE_DATA_ERROR) {
          this.receivingData = false;
        }
      }
    );

    await sleep(400);
    return device;
  }

  async disconnect(): Promise<void> {
    try {
      await this.disableLiveStream();
    } catch {
      /* ignore */
    }
    this.transferSub?.remove();
    this.statusSub?.remove();
    this.liveSub?.remove();
    this.transferSub = null;
    this.statusSub = null;
    this.liveSub = null;
    if (this.device) {
      try {
        await this.device.cancelConnection();
      } catch {
        /* ignore */
      }
    }
    this.device = null;
  }

  isConnected(): boolean {
    return this.device != null;
  }

  getDeviceId(): string | null {
    return this.device?.id ?? null;
  }

  async detectFeatures(): Promise<BleFeatures> {
    if (!this.device) {
      return { liveSupported: false, remoteSupported: false };
    }
    try {
      const services = await this.device.services();
      const liveService = services.find(
        (s) => s.uuid.toLowerCase() === BLE_LIVE_SERVICE_UUID.toLowerCase()
      );
      if (!liveService) {
        return { liveSupported: false, remoteSupported: false };
      }
      const characteristics = await liveService.characteristics();
      const norm = (uuid: string) => uuid.toLowerCase();
      const hasTelemetry = characteristics.some(
        (c) => norm(c.uuid) === norm(BLE_LIVE_TELEMETRY_CHAR_UUID)
      );
      const hasControl = characteristics.some(
        (c) => norm(c.uuid) === norm(BLE_LIVE_CONTROL_CHAR_UUID)
      );
      return {
        liveSupported: hasTelemetry && hasControl,
        remoteSupported: hasControl,
      };
    } catch {
      return { liveSupported: false, remoteSupported: false };
    }
  }

  async sendLiveCommand(command: number): Promise<void> {
    if (!this.device) throw new Error('Not connected');
    await this.device.writeCharacteristicWithResponseForService(
      BLE_LIVE_SERVICE_UUID,
      BLE_LIVE_CONTROL_CHAR_UUID,
      bytesToBase64(Uint8Array.from([command]))
    );
  }

  private async writeControl(bytes: number[]): Promise<void> {
    if (!this.device) throw new Error('Not connected');
    await this.device.writeCharacteristicWithResponseForService(
      BLE_DATA_SERVICE_UUID,
      BLE_DATA_CONTROL_CHAR_UUID,
      bytesToBase64(Uint8Array.from(bytes))
    );
  }

  private async receiveUntilComplete(timeoutMs: number): Promise<Uint8Array> {
    this.dataChunks = [];
    this.receivingData = true;
    const start = Date.now();
    while (this.receivingData && Date.now() - start < timeoutMs) {
      await sleep(50);
    }
    if (this.receivingData) {
      this.receivingData = false;
      throw new Error('Timeout waiting for BLE data');
    }
    if (this.dataStatus === BLE_DATA_ERROR) {
      throw new Error('Grinder reported an export error');
    }
    return concatChunks(this.dataChunks);
  }

  async getFileList(): Promise<number[]> {
    await this.writeControl([BLE_DATA_CMD_GET_FILE_LIST]);
    const data = await this.receiveUntilComplete(10000);
    if (data.length < 4) throw new Error('Invalid file list');
    const count = readU32LE(data, 0);
    const ids: number[] = [];
    for (let i = 0; i < count; i++) {
      const offset = 4 + i * 4;
      if (offset + 4 <= data.length) {
        ids.push(readU32LE(data, offset));
      }
    }
    return ids;
  }

  async requestSessionFile(sessionId: number): Promise<ParsedSessionFile> {
    const payload = new Uint8Array(5);
    payload[0] = BLE_DATA_CMD_REQUEST_FILE;
    payload[1] = sessionId & 0xff;
    payload[2] = (sessionId >> 8) & 0xff;
    payload[3] = (sessionId >> 16) & 0xff;
    payload[4] = (sessionId >> 24) & 0xff;
    await this.writeControl([...payload]);
    const fileData = await this.receiveUntilComplete(30000);
    return parseSessionFile(fileData, sessionId);
  }

  async syncSessions(
    onProgress?: ProgressCallback
  ): Promise<{ imported: number; skipped: number }> {
    onProgress?.('Requesting session list…');
    const remoteIds = await this.getFileList();
    if (remoteIds.length === 0) {
      onProgress?.('No sessions on device', 100);
      return { imported: 0, skipped: 0 };
    }

    const existing = await getExistingSessionIds();
    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < remoteIds.length; i++) {
      const id = remoteIds[i];
      const pct = Math.round(((i + 1) / remoteIds.length) * 100);
      if (existing.has(id)) {
        skipped += 1;
        onProgress?.(`Skip session ${id} (already synced)`, pct);
        continue;
      }
      onProgress?.(`Importing session ${id}…`, pct);
      try {
        const parsed = await this.requestSessionFile(id);
        await upsertParsedSession(parsed.session, parsed.events, parsed.measurements);
        imported += 1;
      } catch (e) {
        onProgress?.(
          `Failed session ${id}: ${e instanceof Error ? e.message : String(e)}`,
          pct
        );
      }
    }

    onProgress?.(`Done: ${imported} imported, ${skipped} skipped`, 100);
    return { imported, skipped };
  }

  async readSystemInfo(): Promise<string | null> {
    if (!this.device) return null;
    try {
      const char = await this.device.readCharacteristicForService(
        BLE_SYSINFO_SERVICE_UUID,
        BLE_SYSINFO_SYSTEM_CHAR_UUID
      );
      if (!char.value) return null;
      return new TextDecoder().decode(base64ToBytes(char.value));
    } catch {
      return null;
    }
  }

  async readSessionsInfo(): Promise<string | null> {
    if (!this.device) return null;
    try {
      const char = await this.device.readCharacteristicForService(
        BLE_SYSINFO_SERVICE_UUID,
        BLE_SYSINFO_SESSIONS_CHAR_UUID
      );
      if (!char.value) return null;
      return new TextDecoder().decode(base64ToBytes(char.value));
    } catch {
      return null;
    }
  }

  async enableLiveStream(onTelemetry: (t: LiveTelemetry) => void): Promise<boolean> {
    if (!this.device) throw new Error('Not connected');
    try {
      this.liveSub?.remove();
      this.liveSub = this.device.monitorCharacteristicForService(
        BLE_LIVE_SERVICE_UUID,
        BLE_LIVE_TELEMETRY_CHAR_UUID,
        (error, characteristic) => {
          if (error || !characteristic?.value) return;
          try {
            onTelemetry(parseLiveTelemetry(base64ToBytes(characteristic.value)));
          } catch {
            /* ignore malformed */
          }
        }
      );
      await this.device.writeCharacteristicWithResponseForService(
        BLE_LIVE_SERVICE_UUID,
        BLE_LIVE_CONTROL_CHAR_UUID,
        bytesToBase64(Uint8Array.from([BLE_LIVE_CMD_ENABLE]))
      );
      return true;
    } catch {
      this.liveSub?.remove();
      this.liveSub = null;
      return false;
    }
  }

  async disableLiveStream(): Promise<void> {
    if (!this.device) return;
    try {
      await this.device.writeCharacteristicWithResponseForService(
        BLE_LIVE_SERVICE_UUID,
        BLE_LIVE_CONTROL_CHAR_UUID,
        bytesToBase64(Uint8Array.from([BLE_LIVE_CMD_DISABLE]))
      );
    } catch {
      /* ignore */
    }
    this.liveSub?.remove();
    this.liveSub = null;
  }

  destroy(): void {
    void this.disconnect();
    this.manager?.destroy();
    this.manager = null;
  }
}

export const grinderBle = new GrinderBleClient();
