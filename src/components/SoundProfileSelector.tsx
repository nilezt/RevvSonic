import React from 'react';
import { SoundProfile } from '../types';
import { SOUND_PROFILES } from '../data/soundProfiles';
import { soundEngine } from '../services/soundEngine';
import { Volume2, Check, Zap, Flame, ShieldAlert, Cpu } from 'lucide-react';

interface SoundProfileSelectorProps {
  currentProfile: SoundProfile;
  onSelectProfile: (profile: SoundProfile) => void;
  isEngineRunning: boolean;
  onStartEngine: () => void;
}

export const SoundProfileSelector: React.FC<SoundProfileSelectorProps> = ({
  currentProfile,
  onSelectProfile,
  isEngineRunning,
  onStartEngine,
}) => {
  const handleTestRev = (profile: SoundProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectProfile(profile);
    if (!isEngineRunning) {
      onStartEngine();
    }
    soundEngine.playTestChime();
  };

  const getProfileIcon = (profile: SoundProfile) => {
    if (profile.hasSupercharger) return <Zap className="w-4 h-4 text-amber-400" />;
    if (profile.hasTurbo) return <Flame className="w-4 h-4 text-cyan-400" />;
    if (profile.cylinderCount === 0) return <Cpu className="w-4 h-4 text-emerald-400" />;
    return <Volume2 className="w-4 h-4 text-rose-500" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Supercar Exhaust Sound Library
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Select an iconic engine profile. The Web Audio synthesizer calculates real-time firing orders, cylinder pulsation harmonics, turbo spool, and decel exhaust pops.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {SOUND_PROFILES.map((profile) => {
          const isSelected = profile.id === currentProfile.id;

          return (
            <div
              key={profile.id}
              onClick={() => onSelectProfile(profile)}
              className={`group relative rounded-2xl border p-5 transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-900/90 border-rose-500 shadow-xl shadow-rose-950/30'
                  : 'bg-slate-950/60 hover:bg-slate-900/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Header Lockup */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="p-2 rounded-xl bg-slate-900 border border-slate-800"
                      style={{ color: profile.accentColor }}
                    >
                      {getProfileIcon(profile)}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base group-hover:text-rose-400 transition-colors">
                        {profile.name}
                      </h3>
                      <div className="text-xs text-slate-400">{profile.subtitle}</div>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="p-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>

                {/* Engine Specifications Strip */}
                <div className="grid grid-cols-3 gap-2 py-2.5 my-3 border-y border-slate-800/80 text-center font-mono">
                  <div className="bg-slate-900/80 rounded-lg p-1.5">
                    <div className="text-[10px] text-slate-400">REDLINE</div>
                    <div className="text-xs font-bold text-white tabular-nums">
                      {profile.redlineRpm.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-slate-900/80 rounded-lg p-1.5">
                    <div className="text-[10px] text-slate-400">CONFIG</div>
                    <div className="text-xs font-bold text-white">
                      {profile.cylinderCount > 0 ? `${profile.cylinderCount} Cyl` : 'EV Warp'}
                    </div>
                  </div>
                  <div className="bg-slate-900/80 rounded-lg p-1.5">
                    <div className="text-[10px] text-slate-400">TOP SPEED</div>
                    <div className="text-xs font-bold text-white tabular-nums">
                      {profile.maxSpeedKmh} km/h
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                  {profile.description}
                </p>

                {/* Acoustic DNA Tags */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {profile.characteristics.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions: Select & Test Rev */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={(e) => handleTestRev(profile, e)}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold font-mono flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Volume2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Test Rev Audio</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectProfile(profile)}
                  className={`py-2 px-4 rounded-xl text-xs font-bold uppercase transition-all ${
                    isSelected
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-900/40'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-750'
                  }`}
                >
                  {isSelected ? 'Active' : 'Equip'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
