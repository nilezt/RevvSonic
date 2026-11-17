/**
 * Type definitions for ApexSound Car Audio & Exhaust Simulator
 */

export type SpeedUnit = 'kmh' | 'mph';

export type TransmissionMode = 'automatic' | 'manual';

export interface SoundProfile {
  id: string;
  name: string;
  subtitle: string;
  engineType: string;
  cylinderCount: number;
  displacement: string;
  redlineRpm: number;
  idleRpm: number;
  maxSpeedKmh: number;
  hasTurbo: boolean;
  hasSupercharger: boolean;
  accentColor: string;
  description: string;
  characteristics: string[];
  gearRatios: number[];
  finalDrive: number;
  soundDna: {
    baseWave: OscillatorType;
    cylinderHarmonics: number[];
    exhaustResonanceFreq: number;
    distortionGain: number;
    subBassBoost: number;
    crackleIntensity: number; // 0 to 1
    turboWhistleFreq: number;
    turboWhistleGain: number;
    superchargerWhineFreq: number;
    superchargerGain: number;
  };
}

export interface VehicleTelemetry {
  speedKmh: number;
  speedMph: number;
  rpm: number;
  currentGear: number;
  throttle: number; // 0 to 1
  boostBar: number; // -0.8 to +2.5
  gForceLongitudinal: number; // m/s^2 or G's
  gForceLateral: number;
  isBraking: boolean;
  isRedlining: boolean;
  isShifting: boolean;
  gpsAccuracyMeters: number | null;
  gpsTimestamp: number | null;
  isGpsActive: boolean;
}

export interface SoundTunerSettings {
  masterVolume: number; // 0 to 1
  subBassBoost: number; // 0 to 12 dB
  crackleFrequency: number; // 0 (off) to 1 (aggressive)
  turboVolume: number; // 0 to 1.5
  exhaustFirmness: number; // shift ignition cut duration
  pitchMultiplier: number; // 0.8 to 1.2
  cabinEqualizer: 'balanced' | 'subwoofer-bass' | 'track-crisp' | 'night-drive';
}

export interface TripTelemetryStats {
  maxSpeedKmh: number;
  currentTripDistanceKm: number;
  runDurationSeconds: number;
  bestZeroToHundredSec: number | null;
  currentAccelerationTimer: {
    isRunning: boolean;
    startTime: number | null;
    elapsedSeconds: number;
    isCompleted: boolean;
  };
}

export interface BluetoothDeviceInfo {
  connected: boolean;
  deviceName: string | null;
  deviceType: 'bluetooth-a2dp' | 'usb-carplay' | 'aux-cable' | 'phone-speaker' | 'unknown';
  sinkId: string | null;
  latencyMs: number;
}
