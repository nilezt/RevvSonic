import React, { useEffect, useRef, useState } from 'react';
import { 
  VehicleTelemetry, 
  SoundProfile, 
  SpeedUnit, 
  TransmissionMode, 
  BluetoothDeviceInfo 
} from '../types';
import { soundEngine } from '../services/soundEngine';
import { 
  Gauge, 
  Flame, 
  Navigation, 
  Zap, 
  ArrowLeftRight, 
  Radio, 
  Bluetooth, 
  RotateCcw 
} from 'lucide-react';

interface CockpitDashboardProps {
  telemetry: VehicleTelemetry;
  profile: SoundProfile;
  speedUnit: SpeedUnit;
  onToggleSpeedUnit: () => void;
  transmissionMode: TransmissionMode;
  onToggleTransmissionMode: () => void;
  onManualUpshift: () => void;
  onManualDownshift: () => void;
  isEngineRunning: boolean;
  onToggleEngine: () => void;
  bluetoothState: BluetoothDeviceInfo;
  onOpenBluetooth: () => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
}

export const CockpitDashboard: React.FC<CockpitDashboardProps> = ({
  telemetry,
  profile,
  speedUnit,
  onToggleSpeedUnit,
  transmissionMode,
  onToggleTransmissionMode,
  onManualUpshift,
  onManualDownshift,
  isEngineRunning,
  onToggleEngine,
  bluetoothState,
  onOpenBluetooth,
  isSimulating,
  onToggleSimulation,
}) => {
  const [isHudMode, setIsHudMode] = useState(false);
  const visualizerCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live Audio Spectrum Visualizer
  useEffect(() => {
    let animId: number;
    const canvas = visualizerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = new Uint8Array(64);

    const renderSpectrum = () => {
      animId = requestAnimationFrame(renderSpectrum);
      soundEngine.getAnalyserData(dataArray);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const barCount = 32;
      const barWidth = (width / barCount) - 2;

      for (let i = 0; i < barCount; i++) {
        const val = dataArray[i * 2] || 0;
        const barHeight = (val / 255) * height;

        // Gradient from accent color to rose
        const hue = i < 10 ? 350 : (i < 20 ? 25 : 200);
        ctx.fillStyle = `hsl(${hue}, 85%, ${Math.min(75, 40 + val * 0.15)}%)`;
        ctx.fillRect(i * (barWidth + 2), height - barHeight, barWidth, barHeight);
      }
    };

    renderSpectrum();
    return () => cancelAnimationFrame(animId);
  }, []);

  const displayedSpeed = speedUnit === 'kmh' ? telemetry.speedKmh : telemetry.speedMph;
  const rpmRatio = Math.min(1.05, telemetry.rpm / profile.redlineRpm);
  const redlineStartRatio = (profile.redlineRpm * 0.88) / profile.redlineRpm;

  // Shift Light LED calculations (8 lights)
  const shiftLeds = Array.from({ length: 8 }).map((_, idx) => {
    const threshold = 0.5 + (idx / 7) * 0.45; // between 50% and 95% redline
    const isActive = rpmRatio >= threshold;
    const isRed = idx >= 6;
    const isAmber = idx >= 4 && idx < 6;
    const isGreen = idx < 4;
    return { isActive, isRed, isAmber, isGreen };
  });

  // Calculate needle rotation angle (-120deg to +120deg)
  const needleAngle = -120 + rpmRatio * 240;

  return (
    <div
      className={`relative w-full transition-transform duration-300 ${
        isHudMode ? '-scale-y-100 scale-x-100 font-bold' : ''
      }`}
    >
      {/* Top Telemetry Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 text-xs font-mono text-slate-400 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="text-slate-300 font-semibold">{profile.name}</span>
          <span className="text-slate-600">/</span>
          <span>{profile.engineType}</span>
          <span className="text-slate-600">/</span>
          <span className="text-rose-400">{profile.redlineRpm.toLocaleString()} RPM MAX</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Drive Mode Toggle */}
          <button
            onClick={onToggleSimulation}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
              isSimulating
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>{isSimulating ? 'Bench Simulator' : 'Live GPS Drive'}</span>
          </button>

          {/* Bluetooth Car Audio status */}
          <button
            onClick={onOpenBluetooth}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
              bluetoothState.connected
                ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bluetooth className="w-3.5 h-3.5" />
            <span>
              {bluetoothState.connected ? bluetoothState.deviceName || 'Car Bluetooth' : 'Pair Car Audio'}
            </span>
          </button>

          {/* HUD Mirror Mode */}
          <button
            onClick={() => setIsHudMode(!isHudMode)}
            title="Mirror for Windshield Head-Up Display"
            className={`p-1.5 rounded transition-colors ${
              isHudMode
                ? 'bg-rose-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Cluster Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 sm:p-6 lg:p-8 backdrop-blur-sm shadow-2xl relative overflow-hidden">
        {/* Ambient Glow */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ backgroundColor: profile.accentColor }}
        />

        {/* Left Column: Boost & G-Force Telemetry */}
        <div className="lg:col-span-3 flex flex-col justify-between gap-6 order-2 lg:order-1">
          {/* Turbo Boost Gauge */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
              <span className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-cyan-400" />
                {profile.hasTurbo ? 'TURBO BOOST' : profile.hasSupercharger ? 'SUPERCHARGER' : 'MANIFOLD VACUUM'}
              </span>
              <span className="font-bold text-white tabular-nums">
                {telemetry.boostBar >= 0 ? `+${telemetry.boostBar.toFixed(2)}` : telemetry.boostBar.toFixed(2)} BAR
              </span>
            </div>

            {/* Boost Bar Indicator */}
            <div className="relative h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
              {/* Vacuum portion (left 25%) */}
              <div className="w-1/4 h-full border-r border-slate-700 relative">
                <div
                  className="absolute right-0 top-0 bottom-0 bg-slate-500 transition-all duration-75"
                  style={{
                    width: `${Math.min(100, Math.max(0, (-telemetry.boostBar / 0.8) * 100))}%`,
                  }}
                />
              </div>
              {/* Boost portion (right 75%) */}
              <div className="w-3/4 h-full relative">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-amber-500 to-rose-500 transition-all duration-75"
                  style={{
                    width: `${Math.min(100, Math.max(0, (telemetry.boostBar / 2.2) * 100))}%`,
                  }}
                />
              </div>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>-0.8 VAC</span>
              <span>0.0 ATM</span>
              <span>+2.2 BAR</span>
            </div>
          </div>

          {/* Throttle Load & G-Force Meter */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
              <span>THROTTLE LOAD</span>
              <span className="text-white font-bold tabular-nums">
                {Math.round(telemetry.throttle * 100)}%
              </span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-rose-500 transition-all duration-75"
                style={{ width: `${Math.round(telemetry.throttle * 100)}%` }}
              />
            </div>

            {/* G-Force Readouts */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-2">
                <div className="text-[10px] font-mono text-slate-400">LONGITUDINAL</div>
                <div className="text-base font-bold font-mono text-white tabular-nums">
                  {telemetry.gForceLongitudinal >= 0
                    ? `+${telemetry.gForceLongitudinal.toFixed(2)}`
                    : telemetry.gForceLongitudinal.toFixed(2)}G
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-2">
                <div className="text-[10px] font-mono text-slate-400">LATERAL</div>
                <div className="text-base font-bold font-mono text-white tabular-nums">
                  {telemetry.gForceLateral >= 0
                    ? `+${telemetry.gForceLateral.toFixed(2)}`
                    : telemetry.gForceLateral.toFixed(2)}G
                </div>
              </div>
            </div>
          </div>

          {/* Exhaust Acoustic Visualizer */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <div className="text-[10px] font-mono text-slate-400 mb-1 flex items-center justify-between">
              <span>EXHAUST FREQUENCY SPECTRUM</span>
              <span className="text-rose-400">ACOUSTIC LIVE</span>
            </div>
            <canvas
              ref={visualizerCanvasRef}
              width={260}
              height={44}
              className="w-full h-11 rounded bg-slate-900/80"
            />
          </div>
        </div>

        {/* Center Column: Big Tachometer Dial & Shift Lights */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center order-1 lg:order-2 py-4">
          {/* Shift Light LED Bar */}
          <div className="flex items-center gap-1.5 mb-3 px-4 py-1.5 bg-slate-950/80 border border-slate-800 rounded-full">
            {shiftLeds.map((led, idx) => (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-75 ${
                  led.isActive
                    ? led.isRed
                      ? 'bg-rose-500 shadow-lg shadow-rose-500/80 animate-pulse'
                      : led.isAmber
                      ? 'bg-amber-400 shadow-md shadow-amber-400/80'
                      : 'bg-emerald-400 shadow-md shadow-emerald-400/80'
                    : 'bg-slate-800 border border-slate-700/60'
                }`}
              />
            ))}
          </div>

          {/* Circular Analog Tachometer & Speed Center */}
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
            {/* SVG Dial Arc */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
              {/* Dial Track Background */}
              <circle
                cx="100"
                cy="100"
                r="82"
                fill="none"
                stroke="rgba(30, 41, 59, 0.8)"
                strokeWidth="10"
                strokeDasharray="386"
                strokeDashoffset="128"
                strokeLinecap="round"
              />
              {/* Normal RPM Arc */}
              <circle
                cx="100"
                cy="100"
                r="82"
                fill="none"
                stroke={profile.accentColor}
                strokeWidth="10"
                strokeDasharray="386"
                strokeDashoffset={386 - Math.min(258, rpmRatio * 258)}
                strokeLinecap="round"
                className="transition-all duration-75"
              />
              {/* Redline Zone Arc */}
              <circle
                cx="100"
                cy="100"
                r="82"
                fill="none"
                stroke="rgba(239, 68, 68, 0.4)"
                strokeWidth="10"
                strokeDasharray="386"
                strokeDashoffset={386 - 258}
                className="opacity-70"
              />
            </svg>

            {/* Glowing Needle */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-75"
              style={{ transform: `rotate(${needleAngle}deg)` }}
            >
              <div className="w-1 h-36 bg-gradient-to-t from-transparent via-rose-500 to-rose-400 rounded-full shadow-lg shadow-rose-500/90 -translate-y-12" />
            </div>

            {/* Dial Center Hub & Digital Readout */}
            <div className="absolute inset-10 rounded-full bg-slate-950/95 border-2 border-slate-800 flex flex-col items-center justify-center p-4 text-center shadow-inner">
              {/* Digital Speed */}
              <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white tabular-nums">
                {Math.round(displayedSpeed)}
              </div>
              <button
                onClick={onToggleSpeedUnit}
                className="text-xs font-mono font-semibold text-rose-400 hover:text-rose-300 uppercase tracking-widest mt-0.5"
              >
                {speedUnit}
              </button>

              {/* Digital RPM */}
              <div className="mt-2 text-xs font-mono text-slate-400">
                <span className="text-white font-bold tabular-nums text-sm">
                  {telemetry.rpm.toLocaleString()}
                </span>{' '}
                RPM
              </div>

              {/* Engine Ignition Status */}
              <div className="mt-1">
                {isEngineRunning ? (
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    LIVE EXHAUST
                  </span>
                ) : (
                  <button
                    onClick={onToggleEngine}
                    className="text-[10px] font-mono text-amber-400 hover:underline"
                  >
                    IGNITION OFF
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Transmission & Shift Controls */}
        <div className="lg:col-span-3 flex flex-col justify-between gap-6 order-3">
          {/* Big Race Gear Indicator */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col items-center text-center">
            <div className="w-full flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
              <span>GEAR</span>
              <button
                onClick={onToggleTransmissionMode}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded text-[10px] uppercase font-bold"
              >
                {transmissionMode === 'automatic' ? 'AUTO DCT' : 'MANUAL'}
              </button>
            </div>

            {/* Gear Number */}
            <div className="my-2 relative flex items-center justify-center">
              <span
                className={`text-6xl sm:text-7xl font-black font-mono tracking-tight transition-transform ${
                  telemetry.isShifting ? 'scale-90 text-rose-500' : 'text-white'
                }`}
              >
                {telemetry.currentGear}
              </span>
              {telemetry.isShifting && (
                <span className="absolute -top-1 -right-4 text-[10px] font-mono bg-rose-500 text-white px-1 rounded animate-ping">
                  CUT
                </span>
              )}
            </div>

            <div className="text-[11px] font-mono text-slate-400">
              {transmissionMode === 'automatic'
                ? 'Dual-Clutch Auto Shift'
                : 'Paddle Shift Active'}
            </div>
          </div>

          {/* Manual Paddle Shifters (Visible in both or prominent in manual) */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onManualDownshift}
              className="py-3 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all border border-slate-700 flex flex-col items-center text-slate-200"
            >
              <span className="text-xl font-bold font-mono">-</span>
              <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400">
                Downshift
              </span>
            </button>
            <button
              onClick={onManualUpshift}
              className="py-3 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all border border-slate-700 flex flex-col items-center text-slate-200"
            >
              <span className="text-xl font-bold font-mono">+</span>
              <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400">
                Upshift
              </span>
            </button>
          </div>

          {/* Quick Vehicle Specs Card */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs font-mono space-y-1.5 text-slate-400">
            <div className="flex justify-between">
              <span>CYLINDERS</span>
              <span className="text-white">{profile.cylinderCount || 'EV'}</span>
            </div>
            <div className="flex justify-between">
              <span>DISPLACEMENT</span>
              <span className="text-white">{profile.displacement}</span>
            </div>
            <div className="flex justify-between">
              <span>TOP SPEED</span>
              <span className="text-white">{profile.maxSpeedKmh} km/h</span>
            </div>
            <div className="flex justify-between">
              <span>EXHAUST DNA</span>
              <span className="text-rose-400 capitalize">{profile.engineType}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
