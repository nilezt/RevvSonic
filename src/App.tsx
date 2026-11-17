import React, { useState, useEffect, useCallback } from 'react';
import { 
  VehicleTelemetry, 
  SoundProfile, 
  SpeedUnit, 
  TransmissionMode, 
  BluetoothDeviceInfo, 
  SoundTunerSettings,
  TripTelemetryStats 
} from './types';
import { SOUND_PROFILES } from './data/soundProfiles';
import { soundEngine } from './services/soundEngine';
import { speedMonitor } from './services/speedMonitor';
import { bluetoothAudio } from './services/bluetoothAudio';

import { TopBar } from './components/TopBar';
import { CockpitDashboard } from './components/CockpitDashboard';
import { DriveSimulatorControls } from './components/DriveSimulatorControls';
import { SoundProfileSelector } from './components/SoundProfileSelector';
import { TripTelemetry } from './components/TripTelemetry';
import { BluetoothModal } from './components/BluetoothModal';
import { ExhaustTunerModal } from './components/ExhaustTunerModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'cockpit' | 'profiles' | 'tuner' | 'telemetry'>('cockpit');
  const [currentProfile, setCurrentProfile] = useState<SoundProfile>(SOUND_PROFILES[0]);
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>('kmh');
  const [transmissionMode, setTransmissionMode] = useState<TransmissionMode>('automatic');
  const [isEngineRunning, setIsEngineRunning] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(true); // Defaults to simulation so user can test right away

  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState<boolean>(false);
  const [isTunerModalOpen, setIsTunerModalOpen] = useState<boolean>(false);

  const [bluetoothState, setBluetoothState] = useState<BluetoothDeviceInfo>(bluetoothAudio.getDeviceState());
  const [soundSettings, setSoundSettings] = useState<SoundTunerSettings>(soundEngine.getSettings());

  const [telemetry, setTelemetry] = useState<VehicleTelemetry>({
    speedKmh: 0,
    speedMph: 0,
    rpm: SOUND_PROFILES[0].idleRpm,
    currentGear: 1,
    throttle: 0,
    boostBar: 0,
    gForceLongitudinal: 0,
    gForceLateral: 0,
    isBraking: false,
    isRedlining: false,
    isShifting: false,
    gpsAccuracyMeters: null,
    gpsTimestamp: null,
    isGpsActive: false,
  });

  const [tripStats, setTripStats] = useState<TripTelemetryStats>({
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
  });

  // Setup services on mount
  useEffect(() => {
    speedMonitor.setProfile(currentProfile);
    speedMonitor.setSpeedUnit(speedUnit);
    speedMonitor.setTransmissionMode(transmissionMode);
    speedMonitor.setSimulationMode(isSimulating);
    speedMonitor.start();

    const unsubTelemetry = speedMonitor.subscribe((newTelem, newStats) => {
      setTelemetry({ ...newTelem });
      setTripStats({ ...newStats });
    });

    const unsubBt = bluetoothAudio.subscribe((newBt) => {
      setBluetoothState({ ...newBt });
    });

    return () => {
      unsubTelemetry();
      unsubBt();
      speedMonitor.stop();
      soundEngine.close();
    };
  }, []);

  // Update profile
  const handleSelectProfile = useCallback((profile: SoundProfile) => {
    setCurrentProfile(profile);
    speedMonitor.setProfile(profile);
    soundEngine.setProfile(profile);
  }, []);

  // Master Engine Start / Stop
  const handleToggleEngine = useCallback(async () => {
    if (!isEngineRunning) {
      const ok = await soundEngine.initAudio();
      if (ok) {
        soundEngine.setProfile(currentProfile);
        setIsEngineRunning(true);
      }
    } else {
      soundEngine.close();
      setIsEngineRunning(false);
    }
  }, [isEngineRunning, currentProfile]);

  const handleStartEngine = useCallback(async () => {
    if (!isEngineRunning) {
      await handleToggleEngine();
    }
  }, [isEngineRunning, handleToggleEngine]);

  const handleToggleMute = useCallback(() => {
    if (isMuted) {
      soundEngine.updateSettings({ masterVolume: soundSettings.masterVolume });
      setIsMuted(false);
    } else {
      soundEngine.updateSettings({ masterVolume: 0 });
      setIsMuted(true);
    }
  }, [isMuted, soundSettings.masterVolume]);

  const handleToggleSpeedUnit = useCallback(() => {
    const nextUnit: SpeedUnit = speedUnit === 'kmh' ? 'mph' : 'kmh';
    setSpeedUnit(nextUnit);
    speedMonitor.setSpeedUnit(nextUnit);
  }, [speedUnit]);

  const handleToggleTransmissionMode = useCallback(() => {
    const nextMode: TransmissionMode = transmissionMode === 'automatic' ? 'manual' : 'automatic';
    setTransmissionMode(nextMode);
    speedMonitor.setTransmissionMode(nextMode);
  }, [transmissionMode]);

  const handleToggleSimulation = useCallback(() => {
    const nextSim = !isSimulating;
    setIsSimulating(nextSim);
    speedMonitor.setSimulationMode(nextSim);
  }, [isSimulating]);

  const handleUpdateSettings = useCallback((newSettings: Partial<SoundTunerSettings>) => {
    soundEngine.updateSettings(newSettings);
    setSoundSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white pb-12">
      {/* 3-Zone Fixed Top Navigation Bar */}
      <TopBar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'tuner') {
            setIsTunerModalOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        isEngineRunning={isEngineRunning}
        onToggleEngine={handleToggleEngine}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onOpenBluetooth={() => setIsBluetoothModalOpen(true)}
        isBluetoothConnected={bluetoothState.connected}
        isGpsActive={telemetry.isGpsActive}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {activeTab === 'cockpit' && (
          <>
            {/* Primary Cockpit Gauge Cluster */}
            <CockpitDashboard
              telemetry={telemetry}
              profile={currentProfile}
              speedUnit={speedUnit}
              onToggleSpeedUnit={handleToggleSpeedUnit}
              transmissionMode={transmissionMode}
              onToggleTransmissionMode={handleToggleTransmissionMode}
              onManualUpshift={() => speedMonitor.manualUpshift()}
              onManualDownshift={() => speedMonitor.manualDownshift()}
              isEngineRunning={isEngineRunning}
              onToggleEngine={handleToggleEngine}
              bluetoothState={bluetoothState}
              onOpenBluetooth={() => setIsBluetoothModalOpen(true)}
              isSimulating={isSimulating}
              onToggleSimulation={handleToggleSimulation}
            />

            {/* Interactive Throttle & Test Drive Controls */}
            <DriveSimulatorControls
              isSimulating={isSimulating}
              onToggleSimulation={handleToggleSimulation}
              isEngineRunning={isEngineRunning}
              onStartEngine={handleStartEngine}
            />

            {/* Quick Trip Strip */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-4">
                <span>
                  TOP SPEED:{' '}
                  <strong className="text-white">
                    {Math.round(speedUnit === 'kmh' ? tripStats.maxSpeedKmh : tripStats.maxSpeedKmh * 0.621371)}{' '}
                    {speedUnit}
                  </strong>
                </span>
                <span className="text-slate-700">·</span>
                <span>
                  TRIP DISTANCE:{' '}
                  <strong className="text-white">
                    {tripStats.currentTripDistanceKm.toFixed(2)} km
                  </strong>
                </span>
                {tripStats.bestZeroToHundredSec !== null && (
                  <>
                    <span className="text-slate-700">·</span>
                    <span>
                      BEST 0-100:{' '}
                      <strong className="text-amber-400">
                        {tripStats.bestZeroToHundredSec.toFixed(2)}s
                      </strong>
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={() => setActiveTab('telemetry')}
                className="text-rose-400 hover:text-rose-300 font-semibold"
              >
                View Full Telemetry &rarr;
              </button>
            </div>
          </>
        )}

        {activeTab === 'profiles' && (
          <SoundProfileSelector
            currentProfile={currentProfile}
            onSelectProfile={handleSelectProfile}
            isEngineRunning={isEngineRunning}
            onStartEngine={handleStartEngine}
          />
        )}

        {activeTab === 'telemetry' && (
          <TripTelemetry
            telemetry={telemetry}
            stats={tripStats}
            speedUnit={speedUnit}
          />
        )}
      </main>

      {/* Bluetooth Pairing & Audio Routing Modal */}
      <BluetoothModal
        isOpen={isBluetoothModalOpen}
        onClose={() => setIsBluetoothModalOpen(false)}
        bluetoothState={bluetoothState}
      />

      {/* Exhaust Acoustic Tuner Modal */}
      <ExhaustTunerModal
        isOpen={isTunerModalOpen}
        onClose={() => setIsTunerModalOpen(false)}
        settings={soundSettings}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
}
