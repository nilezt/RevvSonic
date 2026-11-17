import React, { useState, useEffect, useRef } from 'react';
import { speedMonitor } from '../services/speedMonitor';
import { soundEngine } from '../services/soundEngine';
import { Gauge, Play, RotateCcw, Volume2, FastForward } from 'lucide-react';

interface DriveSimulatorControlsProps {
  isSimulating: boolean;
  onToggleSimulation: () => void;
  isEngineRunning: boolean;
  onStartEngine: () => void;
}

export const DriveSimulatorControls: React.FC<DriveSimulatorControlsProps> = ({
  isSimulating,
  onToggleSimulation,
  isEngineRunning,
  onStartEngine,
}) => {
  const [pedalPressed, setPedalPressed] = useState(false);
  const [brakePressed, setBrakePressed] = useState(false);
  const [sliderThrottle, setSliderThrottle] = useState(0);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const scenarioTimerRef = useRef<number | null>(null);

  // Keyboard shortcut listeners (Space or ArrowUp = Gas, ArrowDown = Brake)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        setPedalPressed(true);
        if (!isEngineRunning) onStartEngine();
        speedMonitor.setVirtualThrottle(1.0);
      } else if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setBrakePressed(true);
        speedMonitor.setVirtualBrake(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        setPedalPressed(false);
        speedMonitor.setVirtualThrottle(0);
      } else if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setBrakePressed(false);
        speedMonitor.setVirtualBrake(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isEngineRunning, onStartEngine]);

  const handlePedalDown = () => {
    setPedalPressed(true);
    if (!isEngineRunning) onStartEngine();
    speedMonitor.setVirtualThrottle(1.0);
  };

  const handlePedalUp = () => {
    setPedalPressed(false);
    speedMonitor.setVirtualThrottle(0);
  };

  const handleBrakeDown = () => {
    setBrakePressed(true);
    speedMonitor.setVirtualBrake(true);
  };

  const handleBrakeUp = () => {
    setBrakePressed(false);
    speedMonitor.setVirtualBrake(false);
  };

  // Run dynamic test drive scenarios
  const runScenario = (name: string) => {
    if (!isEngineRunning) onStartEngine();
    if (!isSimulating) onToggleSimulation();

    if (scenarioTimerRef.current) {
      window.clearInterval(scenarioTimerRef.current);
    }
    setActiveScenario(name);

    let tick = 0;

    if (name === 'launch') {
      // 0-100 Launch: Full throttle for 6 seconds then decel
      speedMonitor.setVirtualBrake(false);
      speedMonitor.setVirtualThrottle(1.0);

      scenarioTimerRef.current = window.setInterval(() => {
        tick++;
        if (tick === 50) {
          // Lift throttle -> overrun crackles!
          speedMonitor.setVirtualThrottle(0);
        } else if (tick === 75) {
          clearInterval(scenarioTimerRef.current!);
          setActiveScenario(null);
        }
      }, 100);
    } else if (name === 'overrun') {
      // Highway pull to high RPM then sudden lift for pops and bangs
      speedMonitor.setVirtualThrottle(0.9);
      scenarioTimerRef.current = window.setInterval(() => {
        tick++;
        if (tick === 40) {
          speedMonitor.setVirtualThrottle(0); // Crackle festival!
        } else if (tick === 80) {
          clearInterval(scenarioTimerRef.current!);
          setActiveScenario(null);
        }
      }, 100);
    } else if (name === 'blips') {
      // Neutral double rev
      soundEngine.playTestChime();
      scenarioTimerRef.current = window.setTimeout(() => {
        setActiveScenario(null);
      }, 2500) as unknown as number;
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Gauge className="w-4 h-4 text-rose-500" />
            Cockpit Test Drive Station
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Test and simulate sports car exhaust notes from your desk or parked car before hitting the road.
          </p>
        </div>

        {/* Live GPS vs Simulator Toggle */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => onToggleSimulation()}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              !isSimulating
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            GPS Live Car Speed
          </button>
          <button
            onClick={() => onToggleSimulation()}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              isSimulating
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Simulator Pedals
          </button>
        </div>
      </div>

      {isSimulating ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
          {/* Interactive Pedals (Gas & Brake) */}
          <div className="md:col-span-6 grid grid-cols-2 gap-4">
            {/* Brake Pedal */}
            <button
              onMouseDown={handleBrakeDown}
              onMouseUp={handleBrakeUp}
              onMouseLeave={handleBrakeUp}
              onTouchStart={handleBrakeDown}
              onTouchEnd={handleBrakeUp}
              className={`h-36 rounded-xl border flex flex-col items-center justify-center p-4 select-none cursor-pointer transition-all active:scale-95 ${
                brakePressed
                  ? 'bg-rose-950/80 border-rose-500 shadow-lg shadow-rose-950/50 scale-95'
                  : 'bg-slate-950/90 hover:bg-slate-900 border-slate-750 text-slate-300'
              }`}
            >
              <span className="text-2xl font-bold font-mono">BRAKE</span>
              <span className="text-[10px] font-mono text-slate-400 mt-1">Press or Arrow Down</span>
            </button>

            {/* Gas Pedal */}
            <button
              onMouseDown={handlePedalDown}
              onMouseUp={handlePedalUp}
              onMouseLeave={handlePedalUp}
              onTouchStart={handlePedalDown}
              onTouchEnd={handlePedalUp}
              className={`h-36 rounded-xl border flex flex-col items-center justify-center p-4 select-none cursor-pointer transition-all active:scale-95 ${
                pedalPressed
                  ? 'bg-emerald-950/80 border-emerald-500 shadow-xl shadow-emerald-950/50 scale-95'
                  : 'bg-slate-950/90 hover:bg-slate-900 border-slate-750 text-slate-200'
              }`}
            >
              <span className="text-3xl font-black font-mono text-white">GAS</span>
              <span className="text-[10px] font-mono text-emerald-400 mt-1">Hold Spacebar or Click</span>
              <span className="text-[9px] font-mono text-slate-500 mt-0.5">Floor throttle to rev</span>
            </button>
          </div>

          {/* Preset Test Drive Scenarios */}
          <div className="md:col-span-6 flex flex-col justify-between gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Automatic Test Drive Runs
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => runScenario('launch')}
                disabled={activeScenario !== null}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  activeScenario === 'launch'
                    ? 'bg-rose-600/30 border-rose-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold font-mono flex items-center gap-1">
                  <Play className="w-3 h-3 text-rose-500" />
                  0-100 Launch
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Hard acceleration pull</div>
              </button>

              <button
                onClick={() => runScenario('overrun')}
                disabled={activeScenario !== null}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  activeScenario === 'overrun'
                    ? 'bg-amber-600/30 border-amber-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold font-mono flex items-center gap-1">
                  <FastForward className="w-3 h-3 text-amber-500" />
                  Overrun Pops
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Exhaust flame crackles</div>
              </button>

              <button
                onClick={() => runScenario('blips')}
                disabled={activeScenario !== null}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  activeScenario === 'blips'
                    ? 'bg-cyan-600/30 border-cyan-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold font-mono flex items-center gap-1">
                  <Volume2 className="w-3 h-3 text-cyan-400" />
                  Double Rev
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Standstill throttle blips</div>
              </button>
            </div>

            {/* Continuous Cruise Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                <span>CRUISE THROTTLE CRUISE</span>
                <span className="text-white font-bold">{Math.round(sliderThrottle * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={sliderThrottle}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setSliderThrottle(val);
                  if (!isEngineRunning) onStartEngine();
                  speedMonitor.setVirtualThrottle(val);
                }}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Live GPS Mode Banner */
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Live GPS Driving Speed Active
            </div>
            <p className="text-xs text-slate-400">
              The app is monitoring your real car speed via GPS and phone accelerometer G-forces. As you accelerate, the supercar exhaust roar will blast through your car speakers!
            </p>
          </div>
          <button
            onClick={onToggleSimulation}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg shrink-0 whitespace-nowrap"
          >
            Switch to Simulator
          </button>
        </div>
      )}
    </div>
  );
};
