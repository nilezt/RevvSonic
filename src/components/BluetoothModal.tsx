import React, { useState, useEffect } from 'react';
import { BluetoothDeviceInfo } from '../types';
import { bluetoothAudio, AudioOutputDeviceOption } from '../services/bluetoothAudio';
import { soundEngine } from '../services/soundEngine';
import { 
  Bluetooth, 
  X, 
  CheckCircle2, 
  Volume2, 
  Sliders, 
  Radio, 
  Car, 
  HelpCircle,
  ExternalLink
} from 'lucide-react';

interface BluetoothModalProps {
  isOpen: boolean;
  onClose: () => void;
  bluetoothState: BluetoothDeviceInfo;
}

export const BluetoothModal: React.FC<BluetoothModalProps> = ({
  isOpen,
  onClose,
  bluetoothState,
}) => {
  const [availableDevices, setAvailableDevices] = useState<AudioOutputDeviceOption[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(bluetoothState.sinkId || '');
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [isTestingRev, setIsTestingRev] = useState(false);
  const [customName, setCustomName] = useState(bluetoothState.deviceName || '');

  useEffect(() => {
    if (isOpen) {
      loadDevices();
    }
  }, [isOpen]);

  const loadDevices = async () => {
    const devices = await bluetoothAudio.refreshAudioOutputDevices();
    setAvailableDevices(devices);
  };

  const handleSelectOutput = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    const chosen = availableDevices.find((d) => d.deviceId === deviceId);
    const label = chosen ? chosen.label : 'Car Audio Receiver';
    await bluetoothAudio.selectOutputDevice(deviceId, label);
  };

  const handleScanBluetooth = async () => {
    setIsScanning(true);
    setScanMessage(null);
    const res = await bluetoothAudio.scanWebBluetooth();
    setIsScanning(false);
    setScanMessage(res.message);
    if (res.deviceName) {
      setCustomName(res.deviceName);
    }
    loadDevices();
  };

  const handleTestAudio = async () => {
    setIsTestingRev(true);
    await soundEngine.playTestChime();
    setTimeout(() => setIsTestingRev(false), 2400);
  };

  const handleSaveCustomName = (e: React.FormEvent) => {
    e.preventDefault();
    if (customName.trim()) {
      bluetoothAudio.setPairedStatus(true, customName.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Bluetooth className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Car Audio Bluetooth Sync</h2>
              <p className="text-xs text-slate-400">Stream roaring supercar exhaust straight to your car stereo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto py-4 space-y-5 flex-1 pr-1">
          {/* Connection Status Banner */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
              bluetoothState.connected
                ? 'bg-sky-500/10 border-sky-500/30 text-sky-200'
                : 'bg-slate-950/60 border-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Car className="w-5 h-5 text-sky-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-white">
                  {bluetoothState.connected ? bluetoothState.deviceName || 'Car Audio Player' : 'No Bluetooth Car Audio Selected'}
                </div>
                <div className="text-xs text-slate-400">
                  {bluetoothState.connected
                    ? 'Audio sink stream active · High-fidelity stereo'
                    : 'Pair your phone to your car Bluetooth in Settings'}
                </div>
              </div>
            </div>

            {bluetoothState.connected && (
              <span className="flex items-center gap-1 text-xs font-mono font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                Active
              </span>
            )}
          </div>

          {/* Quick Audio Speaker Test */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
                  Car Speaker Rev Test
                </h4>
                <p className="text-xs text-slate-400">
                  Play an instant 2-second exhaust rev to confirm sound plays through your car speakers.
                </p>
              </div>
              <button
                onClick={handleTestAudio}
                disabled={isTestingRev}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-rose-950/40 transition-all shrink-0"
              >
                <Volume2 className="w-4 h-4" />
                <span>{isTestingRev ? 'Revving...' : 'Test Rev'}</span>
              </button>
            </div>
          </div>

          {/* Audio Output Sink Selection */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
              Audio Output Target
            </label>
            {availableDevices.length > 0 ? (
              <select
                value={selectedDeviceId}
                onChange={(e) => handleSelectOutput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500"
              >
                <option value="">Default System Audio (OS Bluetooth Paired)</option>
                {availableDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                System audio defaults to whichever device your phone is currently playing music through (Car Bluetooth, AUX, or CarPlay).
              </div>
            )}
          </div>

          {/* Web Bluetooth Scanning Option */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Web Bluetooth Device Pairing
              </span>
              <button
                onClick={handleScanBluetooth}
                disabled={isScanning}
                className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>{isScanning ? 'Searching...' : 'Scan Bluetooth Devices'}</span>
              </button>
            </div>
            {scanMessage && (
              <div className="text-xs p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
                {scanMessage}
              </div>
            )}
          </div>

          {/* Manual Car Name Tag */}
          <form onSubmit={handleSaveCustomName} className="space-y-2">
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
              Custom Car Audio Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. BMW iDrive / Ford SYNC / Pioneer BT"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors"
              >
                Set
              </button>
            </div>
          </form>

          {/* How to Connect 3-Step Guide */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-2.5">
            <h4 className="text-xs font-mono text-slate-300 font-bold flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
              How It Works with Car Audio
            </h4>
            <ol className="text-xs text-slate-400 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>
                Connect your smartphone to your car stereo via <strong>Bluetooth Audio (A2DP)</strong>, Apple CarPlay, Android Auto, or 3.5mm AUX.
              </li>
              <li>
                Ensure your car audio source is set to <strong>Bluetooth / Media</strong>.
              </li>
              <li>
                Press <strong>Start Engine</strong> in this app. As you drive, the exhaust roar accelerates in sync with your real vehicle speed!
              </li>
            </ol>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
