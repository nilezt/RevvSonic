import React from 'react';
import { TripTelemetryStats, VehicleTelemetry, SpeedUnit } from '../types';
import { speedMonitor } from '../services/speedMonitor';
import { Timer, Zap, MapPin, Gauge, RotateCcw, Award } from 'lucide-react';

interface TripTelemetryProps {
  telemetry: VehicleTelemetry;
  stats: TripTelemetryStats;
  speedUnit: SpeedUnit;
}

export const TripTelemetry: React.FC<TripTelemetryProps> = ({
  telemetry,
  stats,
  speedUnit,
}) => {
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    const ms = Math.floor((totalSeconds % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const timer = stats.currentAccelerationTimer;
  const isKmh = speedUnit === 'kmh';
  const targetLabel = isKmh ? '0-100 KM/H' : '0-60 MPH';
  const displayedMaxSpeed = isKmh ? stats.maxSpeedKmh : stats.maxSpeedKmh * 0.621371;
  const displayedDistance = isKmh ? stats.currentTripDistanceKm : stats.currentTripDistanceKm * 0.621371;
  const distUnit = isKmh ? 'km' : 'mi';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Trip Telemetry & Launch Performance
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Precision GPS speed log, acceleration timer, and maximum velocity tracking.
          </p>
        </div>

        <button
          onClick={() => speedMonitor.resetTripStats()}
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono flex items-center gap-2 border border-slate-800 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Trip Log</span>
        </button>
      </div>

      {/* Grid of Key Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 0-100 Launch Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-rose-400 font-bold">
              <Timer className="w-4 h-4" />
              {targetLabel} LAUNCH
            </span>
            <span className={timer.isRunning ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}>
              {timer.isRunning ? 'TIMING' : timer.isCompleted ? 'COMPLETE' : 'STANDBY'}
            </span>
          </div>

          <div className="my-3">
            <div className="text-3xl sm:text-4xl font-black font-mono text-white tabular-nums">
              {timer.elapsedSeconds > 0 ? timer.elapsedSeconds.toFixed(2) : '0.00'}s
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {timer.isRunning
                ? 'Floor throttle to accelerate!'
                : 'Stop vehicle to arm launch timer'}
            </div>
          </div>

          {stats.bestZeroToHundredSec !== null && (
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                Trip Best
              </span>
              <span className="text-amber-400 font-bold tabular-nums">
                {stats.bestZeroToHundredSec.toFixed(2)}s
              </span>
            </div>
          )}
        </div>

        {/* Max Speed Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-amber-400 font-bold">
              <Gauge className="w-4 h-4" />
              MAX SPEED REACHED
            </span>
          </div>

          <div className="my-3">
            <div className="text-3xl sm:text-4xl font-black font-mono text-white tabular-nums">
              {Math.round(displayedMaxSpeed)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 uppercase font-mono">
              {speedUnit} peak velocity
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-xs font-mono text-slate-400">
            Current Speed: <span className="text-white font-bold">{Math.round(telemetry.speedKmh)} km/h</span>
          </div>
        </div>

        {/* Trip Distance Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <MapPin className="w-4 h-4" />
              TRIP DISTANCE
            </span>
          </div>

          <div className="my-3">
            <div className="text-3xl sm:text-4xl font-black font-mono text-white tabular-nums">
              {displayedDistance.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 uppercase font-mono">
              {distUnit} logged
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-xs font-mono text-slate-400">
            Trip Duration: <span className="text-white font-bold">{formatTime(stats.runDurationSeconds)}</span>
          </div>
        </div>

        {/* GPS Satellite Signal Status */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <Zap className="w-4 h-4" />
              GPS RECEIVER ACCURACY
            </span>
          </div>

          <div className="my-3">
            <div className="text-2xl sm:text-3xl font-black font-mono text-white tabular-nums">
              {telemetry.gpsAccuracyMeters !== null
                ? `±${Math.round(telemetry.gpsAccuracyMeters)}m`
                : telemetry.isGpsActive
                ? 'Acquiring...'
                : 'Simulator Mode'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {telemetry.isGpsActive ? 'High Accuracy Satellites' : 'Virtual Road Physics'}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-xs font-mono text-slate-400 flex justify-between">
            <span>Sample Rate:</span>
            <span className="text-emerald-400 font-bold">60 Hz Smooth</span>
          </div>
        </div>
      </div>
    </div>
  );
};
