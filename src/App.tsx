import React, { useState, useEffect, useRef } from 'react';
import {
  Film,
  Code,
  Cpu,
  Layers,
  Sparkles,
  Sliders,
  Scissors,
  Zap,
  Activity,
  Terminal,
  Volume2,
  Download,
  Check,
} from 'lucide-react';
import { CanvasPreview } from './components/CanvasPreview';
import { Timeline } from './components/Timeline';
import { EasingGraph } from './components/EasingGraph';
import { CodeExplorer } from './components/CodeExplorer';
import { ExportPipelineModal } from './components/ExportPipelineModal';
import { ArchitectureGuide } from './components/ArchitectureGuide';
import { Keyframe, BeatMarker, EasingFunction } from './types/mmv';

export default function App() {
  // Navigation tab
  const [activeTab, setActiveTab] = useState<
    'workbench' | 'codebase' | 'pipeline' | 'architecture'
  >('workbench');

  // Animation & Playhead State (5.0 seconds = 5000 ms)
  const durationMs = 5000;
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // FX & Camera Parameters
  const [cameraShakeAmp, setCameraShakeAmp] = useState<number>(8.0);
  const [cameraShakeFreq, setCameraShakeFreq] = useState<number>(14.0);
  const [flashIntensity, setFlashIntensity] = useState<number>(0.0);
  const [showSpeedlines, setShowSpeedlines] = useState<boolean>(true);
  const [splitSpread, setSplitSpread] = useState<'full' | 'left' | 'right'>('full');
  const [snapToMarker, setSnapToMarker] = useState<boolean>(true);

  // Kinematic Keyframes for the 5-second scene
  const [keyframes, setKeyframes] = useState<Keyframe[]>([
    {
      id: 'kf-0',
      timestampMs: 0,
      posX: 0,
      posY: 0,
      scale: 1.0,
      rotationDeg: 0,
      easing: 'EaseInOutCubic',
    },
    {
      id: 'kf-1',
      timestampMs: 1500,
      posX: 140,
      posY: -60,
      scale: 1.35,
      rotationDeg: 1.5,
      easing: 'EaseInOutCubic',
    },
    {
      id: 'kf-2',
      timestampMs: 2800,
      posX: -160,
      posY: 50,
      scale: 1.55,
      rotationDeg: -2.0,
      easing: 'EaseOutExpo',
    },
    {
      id: 'kf-3',
      timestampMs: 4200,
      posX: 0,
      posY: 0,
      scale: 1.85,
      rotationDeg: 0.8,
      easing: 'EaseOutBounce',
    },
    {
      id: 'kf-4',
      timestampMs: 5000,
      posX: 0,
      posY: 0,
      scale: 2.0,
      rotationDeg: 0,
      easing: 'Linear',
    },
  ]);

  // Selected keyframe for editing
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string>('kf-2');

  // Beat Markers (Dropped by hotkey M or user)
  const [beatMarkers, setBeatMarkers] = useState<BeatMarker[]>([
    { id: 'bm-1', timestampMs: 750, label: 'Snare' },
    { id: 'bm-2', timestampMs: 1500, label: 'Kick' },
    { id: 'bm-3', timestampMs: 2250, label: 'Hat' },
    { id: 'bm-4', timestampMs: 2800, label: 'Drop' },
    { id: 'bm-5', timestampMs: 3600, label: 'Kick' },
    { id: 'bm-6', timestampMs: 4200, label: 'Climax' },
  ]);

  // Selected easing preview
  const [currentEasing, setCurrentEasing] = useState<EasingFunction>('EaseInOutCubic');

  // 60 FPS playback loop
  const lastTimeRef = useRef<number>(performance.now());
  useEffect(() => {
    let animId: number;

    const loop = (now: number) => {
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      if (isPlaying) {
        setCurrentTimeMs((prev) => {
          let next = prev + delta;
          if (next >= durationMs) {
            next = 0; // Loop back
          }
          return next;
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, durationMs]);

  // Handle flash on beat drop (t = ~2.8s)
  useEffect(() => {
    if (currentTimeMs >= 2780 && currentTimeMs <= 2920) {
      setFlashIntensity(0.75);
    } else if (flashIntensity > 0) {
      setFlashIntensity(0);
    }
  }, [currentTimeMs, flashIntensity]);

  // Add beat marker
  const handleAddBeatMarker = (tMs: number) => {
    const newMarker: BeatMarker = {
      id: `bm-${Date.now()}`,
      timestampMs: Math.round(tMs),
      label: `Beat ${(tMs / 1000).toFixed(2)}s`,
    };
    setBeatMarkers((prev) =>
      [...prev, newMarker].sort((a, b) => a.timestampMs - b.timestampMs)
    );
  };

  const handleRemoveBeatMarker = (id: string) => {
    setBeatMarkers((prev) => prev.filter((m) => m.id !== id));
  };

  // Add keyframe at current time
  const handleAddKeyframe = (tMs: number) => {
    const newKf: Keyframe = {
      id: `kf-${Date.now()}`,
      timestampMs: Math.round(tMs),
      posX: 0,
      posY: 0,
      scale: 1.4,
      rotationDeg: 0,
      easing: currentEasing,
    };
    setKeyframes((prev) =>
      [...prev, newKf].sort((a, b) => a.timestampMs - b.timestampMs)
    );
    setSelectedKeyframeId(newKf.id);
  };

  const selectedKf = keyframes.find((k) => k.id === selectedKeyframeId) || keyframes[0];

  const updateSelectedKf = (fields: Partial<Keyframe>) => {
    setKeyframes((prev) =>
      prev.map((k) => (k.id === selectedKf.id ? { ...k, ...fields } : k))
    );
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Top Bar Contract: Brand - Nav Links - Primary Action */}
      <header className="flex items-center justify-between px-6 py-3.5 bg-neutral-900 border-b border-neutral-800 shrink-0">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-red-600 flex items-center justify-center font-black text-white text-xs">
            黑
          </div>
          <span className="text-base font-bold tracking-tight text-neutral-100">
            KuroKage MMV Studio
          </span>
        </div>

        {/* Zone 2: Navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-neutral-400">
          <button
            onClick={() => setActiveTab('workbench')}
            className={`transition-colors pb-0.5 ${
              activeTab === 'workbench'
                ? 'text-white border-b-2 border-emerald-500 font-semibold'
                : 'hover:text-neutral-200'
            }`}
          >
            Kinematics Workbench
          </button>
          <button
            onClick={() => setActiveTab('codebase')}
            className={`transition-colors pb-0.5 ${
              activeTab === 'codebase'
                ? 'text-white border-b-2 border-emerald-500 font-semibold'
                : 'hover:text-neutral-200'
            }`}
          >
            Native CGo Engine
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`transition-colors pb-0.5 ${
              activeTab === 'pipeline'
                ? 'text-white border-b-2 border-emerald-500 font-semibold'
                : 'hover:text-neutral-200'
            }`}
          >
            FFmpeg Memory Pipe
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`transition-colors pb-0.5 ${
              activeTab === 'architecture'
                ? 'text-white border-b-2 border-emerald-500 font-semibold'
                : 'hover:text-neutral-200'
            }`}
          >
            Architecture Blueprint
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveTab('pipeline')}
            className="px-3.5 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Test 5s Pipe</span>
          </button>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-5">
        {/* Sub-header status bar */}
        <div className="flex items-center justify-between text-xs text-neutral-400 border-b border-neutral-800/80 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-neutral-200 font-medium">Native Linux Engine</span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span>Go 1.22 + CGo + Google Skia (C++17)</span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span className="text-emerald-400 font-mono">Zero Disk Thrashing Pipe</span>
          </div>

          <div className="hidden sm:flex items-center gap-3 font-mono text-[11px] text-neutral-400">
            <span>RES: 1920x1080</span>
            <span className="text-neutral-600">·</span>
            <span>RATE: 60 FPS</span>
            <span className="text-neutral-600">·</span>
            <span className="text-sky-400">RAM PIPE: 497.6 MB/s</span>
          </div>
        </div>

        {/* WORKBENCH TAB */}
        {activeTab === 'workbench' && (
          <div className="flex flex-col gap-5">
            {/* Top Row: Canvas Preview (Left 65%) + Inspector Panel (Right 35%) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Canvas Area */}
              <div className="lg:col-span-8 flex flex-col gap-2">
                <CanvasPreview
                  currentTimeMs={currentTimeMs}
                  durationMs={durationMs}
                  keyframes={keyframes}
                  cameraShakeAmp={cameraShakeAmp}
                  cameraShakeFreq={cameraShakeFreq}
                  flashIntensity={flashIntensity}
                  showSpeedlines={showSpeedlines}
                  splitSpread={splitSpread}
                />
              </div>

              {/* Inspector & Kinematics Control Panel */}
              <div className="lg:col-span-4 bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex flex-col gap-4 text-xs">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <h3 className="font-semibold text-neutral-200 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-sky-400" />
                    <span>Kinematics & FX Inspector</span>
                  </h3>
                  <span className="text-neutral-500 font-mono text-[11px]">
                    Layer 0 (Panel)
                  </span>
                </div>

                {/* Manga Spread Splitter */}
                <div>
                  <label className="text-neutral-400 block mb-1 font-medium flex items-center gap-1">
                    <Scissors className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Manga Spread Splitter</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-neutral-950 p-1 rounded border border-neutral-800 text-center">
                    {(['full', 'left', 'right'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSplitSpread(s)}
                        className={`py-1 rounded capitalize transition-colors ${
                          splitSpread === s
                            ? 'bg-sky-600 text-white font-medium'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected Keyframe Inspector */}
                <div className="bg-neutral-950 p-3 rounded border border-neutral-800 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-neutral-300 font-medium">
                    <span>Keyframe at {(selectedKf.timestampMs / 1000).toFixed(2)}s</span>
                    <span className="font-mono text-sky-400">
                      Zoom: {selectedKf.scale.toFixed(2)}x
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-neutral-500 block">Pan X (px)</span>
                      <input
                        type="range"
                        min="-400"
                        max="400"
                        value={selectedKf.posX}
                        onChange={(e) =>
                          updateSelectedKf({ posX: parseFloat(e.target.value) })
                        }
                        className="w-full accent-sky-500"
                      />
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Pan Y (px)</span>
                      <input
                        type="range"
                        min="-300"
                        max="300"
                        value={selectedKf.posY}
                        onChange={(e) =>
                          updateSelectedKf({ posY: parseFloat(e.target.value) })
                        }
                        className="w-full accent-sky-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-neutral-500 block">Scale (Zoom)</span>
                      <input
                        type="range"
                        min="0.8"
                        max="3.0"
                        step="0.05"
                        value={selectedKf.scale}
                        onChange={(e) =>
                          updateSelectedKf({ scale: parseFloat(e.target.value) })
                        }
                        className="w-full accent-sky-500"
                      />
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Rotation (deg)</span>
                      <input
                        type="range"
                        min="-20"
                        max="20"
                        step="0.5"
                        value={selectedKf.rotationDeg}
                        onChange={(e) =>
                          updateSelectedKf({ rotationDeg: parseFloat(e.target.value) })
                        }
                        className="w-full accent-sky-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Camera FX */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400 font-medium">Camera Shake Amplitude</span>
                    <span className="font-mono text-neutral-300">{cameraShakeAmp}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={cameraShakeAmp}
                    onChange={(e) => setCameraShakeAmp(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />

                  <div className="flex items-center justify-between mt-1">
                    <span className="text-neutral-400 font-medium">Speedlines Overlay</span>
                    <button
                      onClick={() => setShowSpeedlines(!showSpeedlines)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        showSpeedlines
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {showSpeedlines ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Timeline + Audio Beat Markers */}
            <Timeline
              currentTimeMs={currentTimeMs}
              durationMs={durationMs}
              isPlaying={isPlaying}
              onPlayToggle={() => setIsPlaying(!isPlaying)}
              onSeek={(t) => setCurrentTimeMs(t)}
              onReset={() => setCurrentTimeMs(0)}
              keyframes={keyframes}
              beatMarkers={beatMarkers}
              onAddBeatMarker={handleAddBeatMarker}
              onRemoveBeatMarker={handleRemoveBeatMarker}
              onAddKeyframe={handleAddKeyframe}
              snapToMarker={snapToMarker}
              onToggleSnap={() => setSnapToMarker(!snapToMarker)}
            />

            {/* Easing Graph Preview */}
            <EasingGraph
              currentEasing={selectedKf.easing}
              onSelectEasing={(e) => {
                setCurrentEasing(e);
                updateSelectedKf({ easing: e });
              }}
              progress={currentTimeMs / durationMs}
            />
          </div>
        )}

        {/* CODEBASE TAB */}
        {activeTab === 'codebase' && <CodeExplorer />}

        {/* PIPELINE TAB */}
        {activeTab === 'pipeline' && <ExportPipelineModal />}

        {/* ARCHITECTURE TAB */}
        {activeTab === 'architecture' && <ArchitectureGuide />}
      </main>

      {/* Footer */}
      <footer className="mt-auto px-6 py-4 bg-neutral-900 border-t border-neutral-800 text-neutral-500 text-xs flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="font-medium text-neutral-300">KuroKage MMV Studio</span>
          <span>·</span>
          <span>Native Linux Desktop CGo Architecture</span>
          <span>·</span>
          <span>Zero Disk Thrashing Memory Pipe</span>
        </div>
        <div className="font-mono text-[11px] text-neutral-400">
          Target: Linux x86_64 / VA-API & NVENC Hardware Accelerated
        </div>
      </footer>
    </div>
  );
}
