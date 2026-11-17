import React from 'react';
import { Volume2, VolumeX, Bluetooth, Radio } from 'lucide-react';

interface TopBarProps {
  activeTab: 'cockpit' | 'profiles' | 'tuner' | 'telemetry';
  onSelectTab: (tab: 'cockpit' | 'profiles' | 'tuner' | 'telemetry') => void;
  isEngineRunning: boolean;
  onToggleEngine: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenBluetooth: () => void;
  isBluetoothConnected: boolean;
  isGpsActive: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  isEngineRunning,
  onToggleEngine,
  isMuted,
  onToggleMute,
  onOpenBluetooth,
  isBluetoothConnected,
  isGpsActive,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="#cockpit"
            onClick={(e) => {
              e.preventDefault();
              onSelectTab('cockpit');
            }}
            className="text-lg lg:text-xl font-black tracking-tight text-white uppercase whitespace-nowrap"
          >
            Apex<span className="text-rose-500">Sound</span>
          </a>
          <span className="hidden sm:inline-block text-xs font-mono text-slate-400">
            Car Audio Sync
          </span>
        </div>

        {/* Zone 2: Navigation Links (Single-line whitespace-nowrap) */}
        <nav className="flex items-center gap-2 sm:gap-6 text-sm font-medium text-slate-300 overflow-x-auto py-1">
          <button
            onClick={() => onSelectTab('cockpit')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              activeTab === 'cockpit' ? 'text-rose-400 font-semibold' : 'hover:text-white'
            }`}
          >
            Cockpit
          </button>
          <button
            onClick={() => onSelectTab('profiles')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              activeTab === 'profiles' ? 'text-rose-400 font-semibold' : 'hover:text-white'
            }`}
          >
            Exhaust Voices
          </button>
          <button
            onClick={() => onSelectTab('tuner')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              activeTab === 'tuner' ? 'text-rose-400 font-semibold' : 'hover:text-white'
            }`}
          >
            Sound Tuner
          </button>
          <button
            onClick={() => onSelectTab('telemetry')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              activeTab === 'telemetry' ? 'text-rose-400 font-semibold' : 'hover:text-white'
            }`}
          >
            Telemetry
          </button>
        </nav>

        {/* Zone 3: Actions (Bluetooth Status, Mute, and Master Engine Start/Stop) */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Quick Bluetooth indicator */}
          <button
            onClick={onOpenBluetooth}
            title={isBluetoothConnected ? 'Car Audio Paired' : 'Connect Car Audio'}
            className={`p-2 rounded-lg transition-colors border ${
              isBluetoothConnected
                ? 'bg-sky-500/10 border-sky-500/40 text-sky-400 hover:bg-sky-500/20'
                : 'bg-slate-900 border-slate-750 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Bluetooth className="w-4 h-4" />
          </button>

          {/* Mute button */}
          <button
            onClick={onToggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
            className="p-2 rounded-lg bg-slate-900 border border-slate-750 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Master Engine Ignition Button */}
          <button
            onClick={onToggleEngine}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-md whitespace-nowrap shrink-0 flex items-center gap-2 ${
              isEngineRunning
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30 animate-pulse'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{isEngineRunning ? 'Stop Engine' : 'Start Engine'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
