import React, { useState } from 'react';
import { SoundTunerSettings } from '../types';
import { soundEngine } from '../services/soundEngine';
import { Sliders, X, Volume2, Flame, Zap, Disc, RotateCcw } from 'lucide-react';

interface ExhaustTunerModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SoundTunerSettings;
  onUpdateSettings: (newSettings: Partial<SoundTunerSettings>) => void;
}

export const ExhaustTunerModal: React.FC<ExhaustTunerModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const handleReset = () => {
    onUpdateSettings({
      masterVolume: 0.85,
      subBassBoost: 4,
      crackleFrequency: 0.8,
      turboVolume: 0.7,
      exhaustFirmness: 1.0,
      pitchMultiplier: 1.0,
      cabinEqualizer: 'balanced',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Exhaust Acoustic Tuner</h2>
              <p className="text-xs text-slate-400">Calibrate subwoofers, crackle violence, and turbo spool</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto py-4 space-y-5 flex-1 pr-1">
          {/* Cabin EQ Presets */}
          <div>
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2">
              Car Cabin Acoustic Equalizer
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'balanced', name: 'Balanced Studio', desc: 'Standard OEM stereo' },
                { id: 'subwoofer-bass', name: 'Subwoofer Rumble', desc: 'Heavy sub-bass boost' },
                { id: 'track-crisp', name: 'Track Titanium', desc: 'Crisp exhaust rasp' },
                { id: 'night-drive', name: 'Night Cruise', desc: 'Mellow low drone' },
              ].map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onUpdateSettings({ cabinEqualizer: preset.id as SoundTunerSettings['cabinEqualizer'] })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    settings.cabinEqualizer === preset.id
                      ? 'bg-rose-500/15 border-rose-500 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold">{preset.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{preset.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Master Volume */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-rose-500" />
                Master Exhaust Output
              </span>
              <span className="font-bold text-white tabular-nums">
                {Math.round(settings.masterVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.masterVolume}
              onChange={(e) => onUpdateSettings({ masterVolume: parseFloat(e.target.value) })}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>

          {/* Subwoofer Bass Booster */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Disc className="w-4 h-4 text-amber-500" />
                Car Subwoofer Low-End Boost (30–80 Hz)
              </span>
              <span className="font-bold text-amber-400 tabular-nums">
                +{settings.subBassBoost} dB
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="12"
              step="1"
              value={settings.subBassBoost}
              onChange={(e) => onUpdateSettings({ subBassBoost: parseInt(e.target.value) })}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>Flat 0 dB</span>
              <span>Subwoofer Punch +6 dB</span>
              <span>Maximum +12 dB</span>
            </div>
          </div>

          {/* Overrun Crackle & Pop Frequency */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-rose-400" />
                Deceleration Crackles & Flame Pops
              </span>
              <span className="font-bold text-rose-400 tabular-nums">
                {settings.crackleFrequency === 0
                  ? 'Off'
                  : settings.crackleFrequency < 0.4
                  ? 'Mild Burble'
                  : settings.crackleFrequency < 0.8
                  ? 'Aggressive'
                  : 'Flame Spitting'}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.crackleFrequency}
              onChange={(e) => onUpdateSettings({ crackleFrequency: parseFloat(e.target.value) })}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>

          {/* Turbo Spool & Blow-Off Valve */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-cyan-400" />
                Turbo Whistle & Blow-Off Valve (BOV)
              </span>
              <span className="font-bold text-cyan-400 tabular-nums">
                {Math.round(settings.turboVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.1"
              value={settings.turboVolume}
              onChange={(e) => onUpdateSettings({ turboVolume: parseFloat(e.target.value) })}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* Pitch Multiplier */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">Acoustic Pitch Multiplier</span>
              <span className="font-bold text-white tabular-nums">
                {settings.pitchMultiplier.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.25"
              step="0.02"
              value={settings.pitchMultiplier}
              onChange={(e) => onUpdateSettings({ pitchMultiplier: parseFloat(e.target.value) })}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>Deeper 0.8x</span>
              <span>Factory 1.0x</span>
              <span>Screaming 1.25x</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
          >
            Apply Tuning
          </button>
        </div>
      </div>
    </div>
  );
};
