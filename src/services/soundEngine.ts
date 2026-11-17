import { SoundProfile, SoundTunerSettings } from '../types';

class CarSoundEngine {
  private ctx: AudioContext | null = null;
  private isRunning = false;
  private currentProfile: SoundProfile | null = null;
  private settings: SoundTunerSettings = {
    masterVolume: 0.85,
    subBassBoost: 4,
    crackleFrequency: 0.8,
    turboVolume: 0.7,
    exhaustFirmness: 1.0,
    pitchMultiplier: 1.0,
    cabinEqualizer: 'balanced',
  };

  // Audio Nodes
  private masterGain: GainNode | null = null;
  private eqLow: BiquadFilterNode | null = null;
  private eqMid: BiquadFilterNode | null = null;
  private eqHigh: BiquadFilterNode | null = null;
  private analyser: AnalyserNode | null = null;
  private waveshaper: WaveShaperNode | null = null;

  // Engine Oscillators & Gains
  private baseOsc: OscillatorNode | null = null;
  private baseGain: GainNode | null = null;
  private subOsc: OscillatorNode | null = null;
  private subGain: GainNode | null = null;
  private harmonicOsc: OscillatorNode | null = null;
  private harmonicGain: GainNode | null = null;
  private exhaustFilter: BiquadFilterNode | null = null;

  // Turbocharger Nodes
  private turboNoiseNode: AudioBufferSourceNode | null = null;
  private turboFilter: BiquadFilterNode | null = null;
  private turboWhistleOsc: OscillatorNode | null = null;
  private turboGain: GainNode | null = null;
  private lastBoost = 0;
  private lastThrottle = 0;

  // Supercharger Nodes
  private superchargerOsc: OscillatorNode | null = null;
  private superchargerGain: GainNode | null = null;

  // White noise buffer for crackles & turbo
  private noiseBuffer: AudioBuffer | null = null;
  private lastCrackleTime = 0;

  // Selected audio sink device id
  private currentSinkId: string | null = null;

  constructor() {
    // Lazy initialized on first user gesture
  }

  public async initAudio(): Promise<boolean> {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx({ latencyHint: 'interactive' });
      }

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      this.setupMasterChain();
      this.generateNoiseBuffer();
      this.isRunning = true;
      return true;
    } catch (err) {
      console.error('Failed to initialize AudioContext:', err);
      return false;
    }
  }

  private setupMasterChain() {
    if (!this.ctx) return;

    // Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.settings.masterVolume, this.ctx.currentTime);

    // 3-Band Equalizer for Car Audio Tuning
    this.eqLow = this.ctx.createBiquadFilter();
    this.eqLow.type = 'lowshelf';
    this.eqLow.frequency.setValueAtTime(120, this.ctx.currentTime);
    this.eqLow.gain.setValueAtTime(this.settings.subBassBoost, this.ctx.currentTime);

    this.eqMid = this.ctx.createBiquadFilter();
    this.eqMid.type = 'peaking';
    this.eqMid.frequency.setValueAtTime(650, this.ctx.currentTime);
    this.eqMid.Q.setValueAtTime(1.2, this.ctx.currentTime);
    this.eqMid.gain.setValueAtTime(2.0, this.ctx.currentTime);

    this.eqHigh = this.ctx.createBiquadFilter();
    this.eqHigh.type = 'highshelf';
    this.eqHigh.frequency.setValueAtTime(4500, this.ctx.currentTime);
    this.eqHigh.gain.setValueAtTime(1.0, this.ctx.currentTime);

    // Spectrum Analyser for Cockpit Display
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 128;
    this.analyser.smoothingTimeConstant = 0.8;

    // WaveShaper for raw exhaust saturation
    this.waveshaper = this.ctx.createWaveShaper();
    this.waveshaper.curve = this.makeDistortionCurve(16) as Float32Array<ArrayBuffer>;
    this.waveshaper.oversample = '2x';

    // Connect Chain
    this.waveshaper.connect(this.eqLow);
    this.eqLow.connect(this.eqMid);
    this.eqMid.connect(this.eqHigh);
    this.eqHigh.connect(this.analyser);
    this.analyser.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  private makeDistortionCurve(amount: number): Float32Array {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      // Asymmetric saturation (mimics positive exhaust pressure vs back-draft)
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x)) * (x > 0 ? 1.1 : 0.9);
    }
    return curve;
  }

  private generateNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds looped noise
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  public setProfile(profile: SoundProfile) {
    this.currentProfile = profile;
    this.rebuildEngineVoices();
  }

  private rebuildEngineVoices() {
    if (!this.ctx || !this.currentProfile || !this.waveshaper) return;

    // Stop existing nodes
    this.stopEngineVoices();

    const now = this.ctx.currentTime;
    const dna = this.currentProfile.soundDna;

    // 1. Base Combustion Oscillator
    this.baseOsc = this.ctx.createOscillator();
    this.baseOsc.type = dna.baseWave;
    this.baseOsc.frequency.setValueAtTime(45, now);

    this.baseGain = this.ctx.createGain();
    this.baseGain.gain.setValueAtTime(0.35, now);

    // 2. Subharmonic Crank Rumble
    this.subOsc = this.ctx.createOscillator();
    this.subOsc.type = 'triangle';
    this.subOsc.frequency.setValueAtTime(25, now);

    this.subGain = this.ctx.createGain();
    this.subGain.gain.setValueAtTime(0.4 * dna.subBassBoost, now);

    // 3. High Harmonic Exhaust Rasp
    this.harmonicOsc = this.ctx.createOscillator();
    this.harmonicOsc.type = 'sawtooth';
    this.harmonicOsc.frequency.setValueAtTime(90, now);

    this.harmonicGain = this.ctx.createGain();
    this.harmonicGain.gain.setValueAtTime(0.25, now);

    // Exhaust Resonant Filter
    this.exhaustFilter = this.ctx.createBiquadFilter();
    this.exhaustFilter.type = 'bandpass';
    this.exhaustFilter.frequency.setValueAtTime(dna.exhaustResonanceFreq, now);
    this.exhaustFilter.Q.setValueAtTime(2.2, now);

    // Connect Engine Voices
    this.baseOsc.connect(this.baseGain);
    this.subOsc.connect(this.subGain);
    this.harmonicOsc.connect(this.harmonicGain);

    this.baseGain.connect(this.exhaustFilter);
    this.subGain.connect(this.waveshaper); // Sub-bass direct to saturation
    this.harmonicGain.connect(this.exhaustFilter);

    this.exhaustFilter.connect(this.waveshaper);

    this.baseOsc.start(now);
    this.subOsc.start(now);
    this.harmonicOsc.start(now);

    // 4. Turbocharger Setup (if profile has turbo)
    if (this.currentProfile.hasTurbo && this.noiseBuffer) {
      this.turboNoiseNode = this.ctx.createBufferSource();
      this.turboNoiseNode.buffer = this.noiseBuffer;
      this.turboNoiseNode.loop = true;

      this.turboFilter = this.ctx.createBiquadFilter();
      this.turboFilter.type = 'bandpass';
      this.turboFilter.frequency.setValueAtTime(dna.turboWhistleFreq || 2200, now);
      this.turboFilter.Q.setValueAtTime(4.0, now);

      this.turboWhistleOsc = this.ctx.createOscillator();
      this.turboWhistleOsc.type = 'sine';
      this.turboWhistleOsc.frequency.setValueAtTime(1800, now);

      this.turboGain = this.ctx.createGain();
      this.turboGain.gain.setValueAtTime(0, now);

      const whistleGain = this.ctx.createGain();
      whistleGain.gain.setValueAtTime(0.3, now);
      this.turboWhistleOsc.connect(whistleGain);
      whistleGain.connect(this.turboGain);

      this.turboNoiseNode.connect(this.turboFilter);
      this.turboFilter.connect(this.turboGain);

      this.turboGain.connect(this.eqMid!);

      this.turboNoiseNode.start(now);
      this.turboWhistleOsc.start(now);
    }

    // 5. Supercharger Setup (if profile has supercharger)
    if (this.currentProfile.hasSupercharger) {
      this.superchargerOsc = this.ctx.createOscillator();
      this.superchargerOsc.type = 'triangle';
      this.superchargerOsc.frequency.setValueAtTime(1200, now);

      this.superchargerGain = this.ctx.createGain();
      this.superchargerGain.gain.setValueAtTime(0, now);

      this.superchargerOsc.connect(this.superchargerGain);
      this.superchargerGain.connect(this.eqHigh!);

      this.superchargerOsc.start(now);
    }
  }

  private stopEngineVoices() {
    try {
      this.baseOsc?.stop();
      this.baseOsc?.disconnect();
      this.subOsc?.stop();
      this.subOsc?.disconnect();
      this.harmonicOsc?.stop();
      this.harmonicOsc?.disconnect();

      this.turboNoiseNode?.stop();
      this.turboNoiseNode?.disconnect();
      this.turboWhistleOsc?.stop();
      this.turboWhistleOsc?.disconnect();

      this.superchargerOsc?.stop();
      this.superchargerOsc?.disconnect();
    } catch {
      // Ignored
    }
  }

  /**
   * Main sound calculation loop called on every telemetry update
   */
  public updateTelemetry(
    rpm: number,
    throttle: number,
    boostBar: number,
    isShifting: boolean
  ) {
    if (!this.ctx || !this.currentProfile || !this.baseOsc || !this.subOsc || !this.harmonicOsc) {
      return;
    }

    const now = this.ctx.currentTime;
    const dna = this.currentProfile.soundDna;
    const cylinders = this.currentProfile.cylinderCount || 4;

    // Firing frequency formula: f = (RPM * Cylinders) / 120 (for 4-stroke engine)
    // For electric: f = (RPM / 60) * polePairs
    let fundamentalFreq = cylinders > 0 
      ? (rpm * cylinders) / 120 
      : (rpm / 60) * 4;

    fundamentalFreq *= this.settings.pitchMultiplier;
    fundamentalFreq = Math.max(18, Math.min(fundamentalFreq, 1800));

    // Ramp frequencies smoothly to prevent clicking
    this.baseOsc.frequency.setTargetAtTime(fundamentalFreq, now, 0.04);
    this.subOsc.frequency.setTargetAtTime(fundamentalFreq * 0.5, now, 0.05);
    this.harmonicOsc.frequency.setTargetAtTime(fundamentalFreq * 2.0, now, 0.04);

    // Throttle Load Volume & Texture:
    // Engine is quieter and throatier when idling; roaring and wide open when accelerating
    const loadFactor = Math.max(0.15, throttle);
    const rpmRatio = rpm / this.currentProfile.redlineRpm;

    // During upshift ignition cut: drop volume momentarily to simulate fuel-cut
    const shiftDamping = isShifting ? 0.15 : 1.0;

    const baseVol = (0.2 + loadFactor * 0.45 + rpmRatio * 0.35) * shiftDamping;
    const subVol = (0.3 + loadFactor * 0.4) * (dna.subBassBoost * 0.5) * shiftDamping;
    const harmVol = (0.1 + loadFactor * 0.55 + rpmRatio * 0.35) * shiftDamping;

    this.baseGain?.gain.setTargetAtTime(baseVol, now, 0.03);
    this.subGain?.gain.setTargetAtTime(subVol, now, 0.03);
    this.harmonicGain?.gain.setTargetAtTime(harmVol, now, 0.03);

    // Dynamic Filter Tracking: Exhaust resonance opens up as RPM climbs
    const targetResonance = dna.exhaustResonanceFreq + rpmRatio * 450 + throttle * 200;
    this.exhaustFilter?.frequency.setTargetAtTime(targetResonance, now, 0.05);

    // Turbocharger Audio Dynamics
    if (this.currentProfile.hasTurbo && this.turboGain && this.turboFilter && this.turboWhistleOsc) {
      const activeBoost = Math.max(0, boostBar);
      const turboWhistleBase = dna.turboWhistleFreq || 2200;
      const turboPitch = turboWhistleBase + activeBoost * 1400;

      this.turboFilter.frequency.setTargetAtTime(turboPitch, now, 0.06);
      this.turboWhistleOsc.frequency.setTargetAtTime(turboPitch, now, 0.06);

      const turboVol = activeBoost * 0.4 * this.settings.turboVolume * shiftDamping;
      this.turboGain.gain.setTargetAtTime(turboVol, now, 0.05);

      // Blow-Off Valve (BOV) detection: rapid throttle lift from boost
      if (this.lastBoost > 0.45 && throttle < 0.15 && this.lastThrottle > 0.5) {
        this.triggerBlowOffValve(this.lastBoost);
      }
    }

    // Supercharger Audio Dynamics (Roots-type belt whine)
    if (this.currentProfile.hasSupercharger && this.superchargerGain && this.superchargerOsc) {
      const whineFreq = 800 + (rpmRatio * 2800);
      this.superchargerOsc.frequency.setTargetAtTime(whineFreq, now, 0.04);
      const superchargerVol = (0.05 + loadFactor * 0.35 + rpmRatio * 0.25) * dna.superchargerGain;
      this.superchargerGain.gain.setTargetAtTime(superchargerVol * shiftDamping, now, 0.04);
    }

    // Exhaust Overrun Deceleration Crackles & Burble:
    // When throttle is lifted at high RPM (overrun), unburnt fuel pops in exhaust!
    if (throttle < 0.1 && rpmRatio > 0.45 && !isShifting && this.settings.crackleFrequency > 0.1) {
      const timeSinceLastCrackle = now - this.lastCrackleTime;
      const crackleInterval = 0.08 + Math.random() * 0.18; // 80-260ms between pops
      if (timeSinceLastCrackle > crackleInterval && Math.random() < this.settings.crackleFrequency) {
        this.triggerExhaustCrackle(rpmRatio);
        this.lastCrackleTime = now;
      }
    }

    this.lastBoost = boostBar;
    this.lastThrottle = throttle;
  }

  /**
   * Fires a distinct turbo blow-off valve (BOV) atmospheric dump sound (pssshh-ch-ch)
   */
  private triggerBlowOffValve(peakBoost: number) {
    if (!this.ctx || !this.noiseBuffer) return;

    const now = this.ctx.currentTime;
    const bovNoise = this.ctx.createBufferSource();
    bovNoise.buffer = this.noiseBuffer;

    const bovFilter = this.ctx.createBiquadFilter();
    bovFilter.type = 'highpass';
    bovFilter.frequency.setValueAtTime(3200, now);
    bovFilter.frequency.exponentialRampToValueAtTime(1400, now + 0.35);

    const bovGain = this.ctx.createGain();
    const peakVol = Math.min(0.65, peakBoost * 0.5 * this.settings.turboVolume);
    bovGain.gain.setValueAtTime(peakVol, now);
    bovGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    bovNoise.connect(bovFilter);
    bovFilter.connect(bovGain);
    bovGain.connect(this.masterGain!);

    bovNoise.start(now);
    bovNoise.stop(now + 0.45);
  }

  /**
   * Fires an exhaust backfire pop or burble
   */
  public triggerExhaustCrackle(intensity = 0.8) {
    if (!this.ctx || !this.noiseBuffer) return;

    const now = this.ctx.currentTime;
    const crackleNoise = this.ctx.createBufferSource();
    crackleNoise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    // Deep thunder pop vs sharp rifle crack
    const isLoudGunshot = Math.random() > 0.7;
    filter.frequency.setValueAtTime(isLoudGunshot ? 1200 : 380, now);
    filter.Q.setValueAtTime(isLoudGunshot ? 3.5 : 1.8, now);

    const gain = this.ctx.createGain();
    const volume = (isLoudGunshot ? 0.7 : 0.4) * intensity;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    crackleNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.waveshaper!);

    crackleNoise.start(now);
    crackleNoise.stop(now + 0.08);
  }

  /**
   * Upshift Dual-Clutch Ignition Cut Bang ("BRAAP!")
   */
  public triggerShiftBang() {
    if (!this.ctx) return;
    this.triggerExhaustCrackle(1.0);
    // Subwoofer thump on upshift engagement
    const now = this.ctx.currentTime;
    const subThump = this.ctx.createOscillator();
    subThump.type = 'sine';
    subThump.frequency.setValueAtTime(65, now);
    subThump.frequency.exponentialRampToValueAtTime(28, now + 0.12);

    const thumpGain = this.ctx.createGain();
    thumpGain.gain.setValueAtTime(0.8, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    subThump.connect(thumpGain);
    thumpGain.connect(this.eqLow!);

    subThump.start(now);
    subThump.stop(now + 0.13);
  }

  /**
   * Play a 2-second test rev to confirm car Bluetooth audio connection
   */
  public async playTestChime(): Promise<void> {
    await this.initAudio();
    if (!this.ctx) return;

    // Simulate an aggressive neutral double-rev
    const startRpm = this.currentProfile?.idleRpm || 800;
    const peakRpm = (this.currentProfile?.redlineRpm || 7000) * 0.75;

    let step = 0;
    const testInterval = setInterval(() => {
      step++;
      let curRpm = startRpm;
      let throttle = 0;

      if (step < 15) {
        // Rev 1
        throttle = 0.8;
        curRpm = startRpm + (peakRpm - startRpm) * (step / 15);
      } else if (step < 25) {
        // Drop 1
        throttle = 0;
        curRpm = peakRpm - (peakRpm - startRpm) * ((step - 15) / 10);
      } else if (step < 40) {
        // Rev 2 (Bigger)
        throttle = 1.0;
        curRpm = startRpm + (peakRpm * 1.15 - startRpm) * ((step - 25) / 15);
      } else if (step < 60) {
        // Overrun drop with crackles
        throttle = 0;
        curRpm = peakRpm * 1.15 - (peakRpm * 1.15 - startRpm) * ((step - 40) / 20);
      } else {
        clearInterval(testInterval);
        this.updateTelemetry(startRpm, 0, 0, false);
        return;
      }

      this.updateTelemetry(curRpm, throttle, throttle * 1.2, false);
    }, 35);
  }

  /**
   * Audio Output Device Routing (Car Bluetooth audio player sink)
   */
  public async setAudioOutputDevice(deviceId: string): Promise<boolean> {
    try {
      this.currentSinkId = deviceId;
      if (this.ctx && 'setSinkId' in this.ctx) {
        // Experimental Web Audio setSinkId
        await (this.ctx as unknown as { setSinkId: (id: string) => Promise<void> }).setSinkId(deviceId);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('setSinkId not fully supported or failed:', err);
      return false;
    }
  }

  public getAnalyserData(dataArray: Uint8Array): void {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(dataArray as unknown as Uint8Array<ArrayBuffer>);
    }
  }

  public updateSettings(newSettings: Partial<SoundTunerSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    if (newSettings.masterVolume !== undefined && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(newSettings.masterVolume, now, 0.05);
    }
    if (newSettings.subBassBoost !== undefined && this.eqLow) {
      this.eqLow.gain.setTargetAtTime(newSettings.subBassBoost, now, 0.05);
    }

    // Cabin Equalizer Presets
    if (newSettings.cabinEqualizer) {
      switch (newSettings.cabinEqualizer) {
        case 'subwoofer-bass':
          this.eqLow?.gain.setTargetAtTime(8, now, 0.05);
          this.eqMid?.gain.setTargetAtTime(1.5, now, 0.05);
          this.eqHigh?.gain.setTargetAtTime(0, now, 0.05);
          break;
        case 'track-crisp':
          this.eqLow?.gain.setTargetAtTime(3, now, 0.05);
          this.eqMid?.gain.setTargetAtTime(4.5, now, 0.05);
          this.eqHigh?.gain.setTargetAtTime(3.5, now, 0.05);
          break;
        case 'night-drive':
          this.eqLow?.gain.setTargetAtTime(5, now, 0.05);
          this.eqMid?.gain.setTargetAtTime(1.0, now, 0.05);
          this.eqHigh?.gain.setTargetAtTime(-2, now, 0.05);
          break;
        case 'balanced':
        default:
          this.eqLow?.gain.setTargetAtTime(this.settings.subBassBoost, now, 0.05);
          this.eqMid?.gain.setTargetAtTime(2.0, now, 0.05);
          this.eqHigh?.gain.setTargetAtTime(1.0, now, 0.05);
          break;
      }
    }
  }

  public getSettings(): SoundTunerSettings {
    return { ...this.settings };
  }

  public isAudioActive(): boolean {
    return this.isRunning && this.ctx !== null && this.ctx.state === 'running';
  }

  public close() {
    this.stopEngineVoices();
    this.ctx?.close();
    this.ctx = null;
    this.isRunning = false;
  }
}

export const soundEngine = new CarSoundEngine();
