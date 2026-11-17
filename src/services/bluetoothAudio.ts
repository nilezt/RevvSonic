import { BluetoothDeviceInfo } from '../types';
import { soundEngine } from './soundEngine';

export interface AudioOutputDeviceOption {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

class BluetoothAudioService {
  private deviceState: BluetoothDeviceInfo = {
    connected: false,
    deviceName: null,
    deviceType: 'unknown',
    sinkId: null,
    latencyMs: 120, // Typical Bluetooth A2DP latency
  };

  private availableDevices: AudioOutputDeviceOption[] = [];
  private listeners: Set<(state: BluetoothDeviceInfo) => void> = new Set();

  constructor() {
    this.refreshAudioOutputDevices();
  }

  public subscribe(cb: (state: BluetoothDeviceInfo) => void): () => void {
    this.listeners.add(cb);
    cb(this.deviceState);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((listener) => listener({ ...this.deviceState }));
  }

  /**
   * Enumerate system audio output sinks (Bluetooth car speakers, AUX, etc.)
   */
  public async refreshAudioOutputDevices(): Promise<AudioOutputDeviceOption[]> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return [];
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices
        .filter((d) => d.kind === 'audiooutput')
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Audio Output ${d.deviceId.slice(0, 5)}`,
          kind: d.kind,
        }));

      this.availableDevices = audioOutputs;

      // Auto-detect car or bluetooth labels
      const carOrBt = audioOutputs.find(
        (d) =>
          d.label.toLowerCase().includes('bluetooth') ||
          d.label.toLowerCase().includes('car') ||
          d.label.toLowerCase().includes('hands-free') ||
          d.label.toLowerCase().includes('sync') ||
          d.label.toLowerCase().includes('uconnect') ||
          d.label.toLowerCase().includes('mmi')
      );

      if (carOrBt && !this.deviceState.connected) {
        this.deviceState.connected = true;
        this.deviceState.deviceName = carOrBt.label;
        this.deviceState.deviceType = 'bluetooth-a2dp';
        this.deviceState.sinkId = carOrBt.deviceId;
        this.notify();
      }

      return audioOutputs;
    } catch (err) {
      console.warn('Failed to enumerate audio devices:', err);
      return [];
    }
  }

  public getAvailableDevices(): AudioOutputDeviceOption[] {
    return this.availableDevices;
  }

  public getDeviceState(): BluetoothDeviceInfo {
    return { ...this.deviceState };
  }

  /**
   * Route audio directly to selected Car Audio output sink
   */
  public async selectOutputDevice(deviceId: string, deviceName: string): Promise<boolean> {
    const success = await soundEngine.setAudioOutputDevice(deviceId);
    this.deviceState.sinkId = deviceId;
    this.deviceState.deviceName = deviceName;
    this.deviceState.connected = true;
    this.deviceState.deviceType = deviceName.toLowerCase().includes('bluetooth')
      ? 'bluetooth-a2dp'
      : 'aux-cable';
    this.notify();
    return success;
  }

  /**
   * Request Bluetooth Pairing via Web Bluetooth API (if supported)
   */
  public async scanWebBluetooth(): Promise<{ success: boolean; message: string; deviceName?: string }> {
    if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) {
      return {
        success: false,
        message: 'Web Bluetooth API is not supported in this browser. Standard Bluetooth A2DP audio routes automatically through your phone settings.',
      };
    }

    try {
      const bluetooth = (navigator as unknown as {
        bluetooth: {
          requestDevice: (options: {
            acceptAllDevices?: boolean;
            filters?: Array<{ services?: string[]; namePrefix?: string }>;
            optionalServices?: string[];
          }) => Promise<{ name?: string; id: string }>;
        };
      }).bluetooth;

      const device = await bluetooth.requestDevice({
        acceptAllDevices: true,
      });

      const name = device.name || 'Car Audio Player';
      this.deviceState.connected = true;
      this.deviceState.deviceName = name;
      this.deviceState.deviceType = 'bluetooth-a2dp';
      this.notify();

      return {
        success: true,
        message: `Successfully paired with ${name}! Audio is now routed to your car speakers.`,
        deviceName: name,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('cancelled') || errorMsg.includes('User cancelled')) {
        return {
          success: false,
          message: 'Device scan cancelled.',
        };
      }
      return {
        success: false,
        message: `Bluetooth request: ${errorMsg}`,
      };
    }
  }

  /**
   * Set connection status manually (e.g. user paired phone to car via OS Settings)
   */
  public setPairedStatus(connected: boolean, deviceName: string = 'Car Bluetooth Player') {
    this.deviceState.connected = connected;
    this.deviceState.deviceName = connected ? deviceName : null;
    this.deviceState.deviceType = connected ? 'bluetooth-a2dp' : 'unknown';
    this.notify();
  }

  public setLatency(latencyMs: number) {
    this.deviceState.latencyMs = latencyMs;
    this.notify();
  }
}

export const bluetoothAudio = new BluetoothAudioService();
