import { SoundProfile, VehicleTelemetry, SpeedUnit, TransmissionMode, TripTelemetryStats } from '../types';
import { soundEngine } from './soundEngine';

export type TelemetryCallback = (telemetry: VehicleTelemetry, stats: TripTelemetryStats) => void;

class SpeedMonitorService {
  private isMonitoring = false;
  private isSimulationMode = false;
  private watchId: number | null = null;
  private listeners: Set<TelemetryCallback> = new Set();

  private currentProfile: SoundProfile | null = null;
  private speedUnit: SpeedUnit = 'kmh';
  private transmissionMode: TransmissionMode = 'automatic';

  // Real-time Vehicle State
  private speedKmh = 0;
  private targetSpeedKmh = 0;
  private smoothedSpeedKmh = 0;
  private throttle = 0;
  private targetThrottle = 0;
  private rpm = 800;
  private currentGear = 1;
  private boostBar = 0;
  private gForceLongitudinal = 0;
  private gForceLateral = 0;
  private isBraking = false;
  private isShifting = false;
  private shiftTimer: number | null = null;
  private gpsAccuracy: number | null = null;
  private lastGpsTimestamp: number | null = null;
  private lastPosition: { lat: number; lng: number; time: number } | null = null;

  // Rev limiter state
  private isLimiterActive = false;
  private limiterBounce = 0;

  // Trip Statistics
  private tripStats: TripTelemetryStats = {
    maxSpeedKmh: 0,
    currentTripDistanceKm: 0,
    runDurationSeconds: 0,
    bestZeroToHundredSec: null,
    currentAccelerationTimer: {
      isRunning: false,
      startTime: null,
      elapsedSeconds: 0,
      isCompleted: false,
    },
  };

  private animationFrameId: number | null = null;
  private lastFrameTime = performance.now();
  private tripStartTime = performance.now();

  constructor() {
    this.setupDeviceMotion();
  }

  public setProfile(profile: SoundProfile) {
    this.currentProfile = profile;
    this.rpm = profile.idleRpm;
  }

  public setSpeedUnit(unit: SpeedUnit) {
    this.speedUnit = unit;
  }

  public setTransmissionMode(mode: TransmissionMode) {
    this.transmissionMode = mode;
  }

  public setSimulationMode(enabled: boolean) {
    this.isSimulationMode = enabled;
    if (enabled && this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    } else if (!enabled && this.isMonitoring) {
      this.startGpsTracking();
    }
  }

  public isSimulating(): boolean {
    return this.isSimulationMode;
  }

  public subscribe(cb: TelemetryCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /**
   * Start Live Speed Monitoring
   */
  public start() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    this.tripStartTime = performance.now();

    if (!this.isSimulationMode) {
      this.startGpsTracking();
    }

    this.lastFrameTime = performance.now();
    this.runPhysicsLoop();
  }

  public stop() {
    this.isMonitoring = false;
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private startGpsTracking() {
    if (!('geolocation' in navigator)) {
      console.warn('Geolocation is not supported by this browser.');
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    };

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handleGpsSuccess(pos),
      (err) => this.handleGpsError(err),
      options
    );
  }

  private handleGpsSuccess(position: GeolocationPosition) {
    this.gpsAccuracy = position.coords.accuracy;
    this.lastGpsTimestamp = position.timestamp;

    let computedSpeedKmh = 0;

    if (position.coords.speed !== null && !isNaN(position.coords.speed)) {
      // Speed in m/s converted to km/h
      computedSpeedKmh = Math.max(0, position.coords.speed * 3.6);
    } else if (this.lastPosition) {
      // Fallback: Haversine distance over time delta
      const dt = (position.timestamp - this.lastPosition.time) / 1000;
      if (dt > 0.5 && dt < 10) {
        const distMeters = this.calculateDistance(
          this.lastPosition.lat,
          this.lastPosition.lng,
          position.coords.latitude,
          position.coords.longitude
        );
        computedSpeedKmh = Math.max(0, (distMeters / dt) * 3.6);
      }
    }

    this.lastPosition = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      time: position.timestamp,
    };

    if (!this.isSimulationMode) {
      // Estimate throttle load based on rate of speed increase
      const speedDelta = computedSpeedKmh - this.speedKmh;
      if (speedDelta > 0.5) {
        this.targetThrottle = Math.min(1.0, 0.3 + (speedDelta / 8));
        this.isBraking = false;
      } else if (speedDelta < -1.5) {
        this.targetThrottle = 0;
        this.isBraking = true;
      } else if (computedSpeedKmh > 5) {
        // Cruising load
        this.targetThrottle = 0.22;
        this.isBraking = false;
      } else {
        // Idle
        this.targetThrottle = 0;
        this.isBraking = false;
      }

      this.targetSpeedKmh = computedSpeedKmh;
    }
  }

  private handleGpsError(error: GeolocationPositionError) {
    console.warn('GPS position error:', error.message);
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Phone Accelerometer Integration for Instant Throttle Detection
   */
  private setupDeviceMotion() {
    if (typeof window === 'undefined') return;

    window.addEventListener('devicemotion', (event) => {
      const acc = event.acceleration || event.accelerationIncludingGravity;
      if (!acc) return;

      // Detect longitudinal acceleration surge (Z or Y depending on orientation)
      const forwardG = (acc.z !== null ? acc.z : 0) / 9.81;
      const lateralG = (acc.x !== null ? acc.x : 0) / 9.81;

      this.gForceLateral = lateralG;

      if (!this.isSimulationMode && Math.abs(forwardG) > 0.15) {
        this.gForceLongitudinal = forwardG;
        // If driver steps on gas pedal, rev sound responds instantaneously
        if (forwardG > 0.2) {
          this.targetThrottle = Math.min(1.0, this.targetThrottle + forwardG * 0.5);
        }
      }
    });
  }

  /**
   * Physics & Transmission Simulation Loop
   */
  private runPhysicsLoop = () => {
    if (!this.isMonitoring) return;

    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastFrameTime) / 1000); // delta time in seconds
    this.lastFrameTime = now;

    const profile = this.currentProfile;
    if (!profile) {
      this.animationFrameId = requestAnimationFrame(this.runPhysicsLoop);
      return;
    }

    // 1. Throttle smoothing
    this.throttle += (this.targetThrottle - this.throttle) * Math.min(1, dt * 14);

    // 2. Speed simulation or GPS speed smoothing
    if (this.isSimulationMode) {
      if (this.isBraking) {
        // Heavy deceleration
        this.speedKmh = Math.max(0, this.speedKmh - dt * 38);
        this.gForceLongitudinal = -0.7;
      } else if (this.throttle > 0.02) {
        // Power-to-weight acceleration curve
        const gearRatio = profile.gearRatios[this.currentGear - 1] || 1.0;
        const speedRatio = this.speedKmh / profile.maxSpeedKmh;
        // High acceleration in 1st/2nd gear, tapering off at top speed
        const accelForce = (gearRatio * 18 * this.throttle) * (1 - speedRatio * 0.7);
        this.speedKmh = Math.min(profile.maxSpeedKmh, this.speedKmh + dt * accelForce);
        this.gForceLongitudinal = Math.min(1.2, (accelForce / 12) * this.throttle);
      } else {
        // Rolling resistance / engine braking
        this.speedKmh = Math.max(0, this.speedKmh - dt * 4.5);
        this.gForceLongitudinal = -0.1;
      }
    } else {
      // Live GPS smoothing (Exponential moving average)
      this.speedKmh += (this.targetSpeedKmh - this.speedKmh) * Math.min(1, dt * 5.5);
    }

    // 3. Transmission & RPM Logic
    const gearRatios = profile.gearRatios;
    const finalDrive = profile.finalDrive;
    const maxGears = gearRatios.length;

    // Tire diameter approx 0.65m -> wheel circumference ~2.04m
    const wheelCircumference = 2.04;

    if (this.transmissionMode === 'automatic' && !this.isShifting) {
      // Automatic Dual-Clutch Shift Mapping
      const currentGearRatio = gearRatios[this.currentGear - 1] || 1.0;
      const speedInMs = (this.speedKmh * 1000) / 3600;
      const wheelRpm = (speedInMs / wheelCircumference) * 60;
      let calculatedRpm = wheelRpm * currentGearRatio * finalDrive;

      // Upshift check (when RPM nears redline or throttle is moderate)
      const upshiftThreshold = this.throttle > 0.7 ? profile.redlineRpm * 0.94 : profile.redlineRpm * 0.62;
      const downshiftThreshold = profile.redlineRpm * 0.32;

      if (calculatedRpm > upshiftThreshold && this.currentGear < maxGears && this.speedKmh > 12) {
        this.shiftGear(this.currentGear + 1, 'up');
      } else if (calculatedRpm < downshiftThreshold && this.currentGear > 1 && this.speedKmh > 0) {
        this.shiftGear(this.currentGear - 1, 'down');
      }
    }

    // Calculate actual engine RPM
    const currentGearRatio = gearRatios[this.currentGear - 1] || 1.0;
    const speedInMs = (this.speedKmh * 1000) / 3600;
    const wheelRpm = (speedInMs / wheelCircumference) * 60;
    let targetRpm = wheelRpm * currentGearRatio * finalDrive;

    // Account for neutral / idle / clutch slippage at low speeds
    if (this.speedKmh < 6) {
      targetRpm = Math.max(targetRpm, profile.idleRpm + this.throttle * (profile.redlineRpm * 0.85 - profile.idleRpm));
    } else {
      targetRpm = Math.max(profile.idleRpm, targetRpm);
    }

    // Rev Limiter bounce check (tat-tat-tat!)
    const isAtRedline = targetRpm >= profile.redlineRpm * 0.98;
    if (isAtRedline) {
      this.limiterBounce = (this.limiterBounce + 1) % 6;
      if (this.limiterBounce < 3) {
        targetRpm = profile.redlineRpm * 0.96;
      } else {
        targetRpm = profile.redlineRpm * 1.01;
        soundEngine.triggerExhaustCrackle(0.9);
      }
    }

    // RPM smoothing
    this.rpm += (targetRpm - this.rpm) * Math.min(1, dt * 20);

    // 4. Turbo Boost Calculation
    if (profile.hasTurbo) {
      const targetBoost = this.throttle > 0.15 
        ? -0.2 + (this.throttle * 1.8) * Math.min(1.2, this.rpm / 4000)
        : -0.6; // Vacuum
      this.boostBar += (targetBoost - this.boostBar) * Math.min(1, dt * 6);
    } else {
      this.boostBar = 0;
    }

    // 5. Send parameters to Sound Synthesis Engine
    soundEngine.updateTelemetry(
      this.rpm,
      this.throttle,
      this.boostBar,
      this.isShifting
    );

    // 6. 0-100 km/h Performance Timer & Trip Telemetry
    this.updateTripStats(dt);

    // 7. Emit Telemetry to UI Listeners
    const telemetry: VehicleTelemetry = {
      speedKmh: Math.round(this.speedKmh * 10) / 10,
      speedMph: Math.round(this.speedKmh * 0.621371 * 10) / 10,
      rpm: Math.round(this.rpm),
      currentGear: this.currentGear,
      throttle: Math.min(1, Math.max(0, this.throttle)),
      boostBar: Math.round(this.boostBar * 100) / 100,
      gForceLongitudinal: Math.round(this.gForceLongitudinal * 100) / 100,
      gForceLateral: Math.round(this.gForceLateral * 100) / 100,
      isBraking: this.isBraking,
      isRedlining: isAtRedline,
      isShifting: this.isShifting,
      gpsAccuracyMeters: this.gpsAccuracy,
      gpsTimestamp: this.lastGpsTimestamp,
      isGpsActive: !this.isSimulationMode && this.watchId !== null,
    };

    this.listeners.forEach((listener) => listener(telemetry, this.tripStats));

    this.animationFrameId = requestAnimationFrame(this.runPhysicsLoop);
  };

  /**
   * Gear Shift Execution (Dual-Clutch Ignition Cut Bang)
   */
  public shiftGear(newGear: number, direction: 'up' | 'down') {
    const profile = this.currentProfile;
    if (!profile) return;
    const maxGears = profile.gearRatios.length;
    if (newGear < 1 || newGear > maxGears || this.isShifting) return;

    this.isShifting = true;
    this.currentGear = newGear;

    if (direction === 'up') {
      soundEngine.triggerShiftBang();
    } else {
      // Downshift rev match blip
      soundEngine.triggerExhaustCrackle(0.7);
    }

    if (this.shiftTimer) window.clearTimeout(this.shiftTimer);
    this.shiftTimer = window.setTimeout(() => {
      this.isShifting = false;
    }, 110);
  }

  public manualUpshift() {
    this.shiftGear(this.currentGear + 1, 'up');
  }

  public manualDownshift() {
    this.shiftGear(this.currentGear - 1, 'down');
  }

  /**
   * Manual Throttle and Brake Controls for Testing
   */
  public setVirtualThrottle(throttle: number) {
    this.targetThrottle = Math.max(0, Math.min(1, throttle));
    this.isBraking = false;
  }

  public setVirtualBrake(isBraking: boolean) {
    this.isBraking = isBraking;
    if (isBraking) {
      this.targetThrottle = 0;
    }
  }

  /**
   * Trip & 0-100 km/h Performance Timer Logic
   */
  private updateTripStats(dt: number) {
    // Max Speed
    if (this.speedKmh > this.tripStats.maxSpeedKmh) {
      this.tripStats.maxSpeedKmh = Math.round(this.speedKmh * 10) / 10;
    }

    // Trip distance
    const distDeltaKm = (this.speedKmh * dt) / 3600;
    this.tripStats.currentTripDistanceKm += distDeltaKm;
    this.tripStats.runDurationSeconds += dt;

    // 0-100 km/h (or 0-60 mph) Acceleration Timer
    const timer = this.tripStats.currentAccelerationTimer;

    // Ready to launch condition: stationary and then full throttle
    if (!timer.isRunning && this.speedKmh < 1.0 && this.throttle > 0.4) {
      timer.isRunning = true;
      timer.startTime = performance.now();
      timer.elapsedSeconds = 0;
      timer.isCompleted = false;
    } else if (timer.isRunning && timer.startTime) {
      timer.elapsedSeconds = (performance.now() - timer.startTime) / 1000;

      // Check if 100 km/h reached
      if (this.speedKmh >= 100) {
        timer.isRunning = false;
        timer.isCompleted = true;
        if (
          this.tripStats.bestZeroToHundredSec === null ||
          timer.elapsedSeconds < this.tripStats.bestZeroToHundredSec
        ) {
          this.tripStats.bestZeroToHundredSec = Math.round(timer.elapsedSeconds * 100) / 100;
        }
      } else if (this.throttle < 0.1 && this.speedKmh < 40) {
        // Aborted launch
        timer.isRunning = false;
      }
    }
  }

  public resetTripStats() {
    this.tripStats = {
      maxSpeedKmh: 0,
      currentTripDistanceKm: 0,
      runDurationSeconds: 0,
      bestZeroToHundredSec: null,
      currentAccelerationTimer: {
        isRunning: false,
        startTime: null,
        elapsedSeconds: 0,
        isCompleted: false,
      },
    };
  }
}

export const speedMonitor = new SpeedMonitorService();
