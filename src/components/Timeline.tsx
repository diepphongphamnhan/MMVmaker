import React, { useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Flag, Magnet, SkipBack, SkipForward, Plus } from 'lucide-react';
import { Keyframe, BeatMarker } from '../types/mmv';

interface TimelineProps {
  currentTimeMs: number;
  durationMs: number;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onSeek: (timestampMs: number) => void;
  onReset: () => void;
  keyframes: Keyframe[];
  beatMarkers: BeatMarker[];
  onAddBeatMarker: (timestampMs: number) => void;
  onRemoveBeatMarker: (id: string) => void;
  onAddKeyframe: (timestampMs: number) => void;
  snapToMarker: boolean;
  onToggleSnap: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  currentTimeMs,
  durationMs,
  isPlaying,
  onPlayToggle,
  onSeek,
  onReset,
  keyframes,
  beatMarkers,
  onAddBeatMarker,
  onRemoveBeatMarker,
  onAddKeyframe,
  snapToMarker,
  onToggleSnap,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);

  // Keyboard hotkeys: Space (Play/Pause), M (Beat Marker), Arrow keys (Frame stepping)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        onPlayToggle();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        onAddBeatMarker(currentTimeMs);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const step = e.shiftKey ? 250 : (1000 / 60);
        onSeek(Math.max(0, currentTimeMs - step));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const step = e.shiftKey ? 250 : (1000 / 60);
        onSeek(Math.min(durationMs, currentTimeMs + step));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTimeMs, durationMs, onPlayToggle, onAddBeatMarker, onSeek]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    let targetMs = (clickX / rect.width) * durationMs;

    // Snapping logic
    if (snapToMarker && beatMarkers.length > 0) {
      const snapThreshold = 150; // ms
      for (const marker of beatMarkers) {
        if (Math.abs(marker.timestampMs - targetMs) < snapThreshold) {
          targetMs = marker.timestampMs;
          break;
        }
      }
    }

    onSeek(targetMs);
  };

  const progressPercent = (currentTimeMs / durationMs) * 100;
  const currentFrame = Math.floor((currentTimeMs / 1000) * 60);

  // Generate deterministic audio waveform bar heights
  const waveformBars = React.useMemo(() => {
    const bars: number[] = [];
    for (let i = 0; i < 120; i++) {
      // Audio beat peaks at ~2.8s (bar 67) and periodic rhythmic patterns
      const t = (i / 120) * 5.0;
      let amp = Math.sin(t * 12) * 0.3 + Math.cos(t * 24) * 0.2 + 0.35;
      if (Math.abs(t - 2.8) < 0.3) {
        amp = 0.95; // Beat drop peak
      } else if (Math.abs(t - 1.5) < 0.2) {
        amp = 0.8;
      } else if (Math.abs(t - 4.2) < 0.25) {
        amp = 0.88;
      }
      bars.push(Math.max(0.1, Math.min(1.0, amp)));
    }
    return bars;
  }, []);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex flex-col gap-3">
      {/* Playback Controls Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
            title="Reset to 0s"
            aria-label="Reset timeline"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => onSeek(Math.max(0, currentTimeMs - 1000 / 60))}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
            title="Step Previous Frame"
            aria-label="Previous frame"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={onPlayToggle}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded flex items-center gap-1.5 transition-colors shadow-sm"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Play</span>
              </>
            )}
          </button>
          <button
            onClick={() => onSeek(Math.min(durationMs, currentTimeMs + 1000 / 60))}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
            title="Step Next Frame"
            aria-label="Next frame"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Counter Displays (Tabular Figures) */}
        <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-neutral-300">
          <div className="flex items-center gap-1.5 bg-neutral-950 px-2.5 py-1 rounded border border-neutral-800">
            <span className="text-neutral-500">TIME:</span>
            <span className="text-emerald-400 font-semibold">{(currentTimeMs / 1000).toFixed(2)}s</span>
            <span className="text-neutral-600">/</span>
            <span>{(durationMs / 1000).toFixed(2)}s</span>
          </div>
          <div className="flex items-center gap-1.5 bg-neutral-950 px-2.5 py-1 rounded border border-neutral-800">
            <span className="text-neutral-500">FRAME:</span>
            <span className="text-amber-400 font-semibold">{currentFrame}</span>
            <span className="text-neutral-600">@</span>
            <span>60 FPS</span>
          </div>
        </div>

        {/* Hotkey Tools & Snapping */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSnap}
            className={`px-3 py-1.5 text-xs font-medium rounded flex items-center gap-1.5 border transition-colors ${
              snapToMarker
                ? 'bg-amber-950/60 text-amber-300 border-amber-700/60'
                : 'bg-neutral-800/80 text-neutral-400 border-neutral-700 hover:text-white'
            }`}
            title="Toggle Snap to Beat Marker"
            aria-label="Toggle snap to beat markers"
          >
            <Magnet className="w-3.5 h-3.5" />
            <span>Snap ({snapToMarker ? 'ON' : 'OFF'})</span>
          </button>

          <button
            onClick={() => onAddBeatMarker(currentTimeMs)}
            className="px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded flex items-center gap-1.5 transition-colors"
            title="Add Beat Marker (Hotkey: M)"
            aria-label="Add beat marker"
          >
            <Flag className="w-3.5 h-3.5 text-amber-400" />
            <span>Mark Beat [M]</span>
          </button>

          <button
            onClick={() => onAddKeyframe(currentTimeMs)}
            className="px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded flex items-center gap-1.5 transition-colors"
            title="Add Keyframe at Playhead"
            aria-label="Add keyframe"
          >
            <Plus className="w-3.5 h-3.5 text-sky-400" />
            <span>+ Keyframe</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Timeline Ruler & Tracks */}
      <div
        ref={timelineRef}
        onClick={handleTimelineClick}
        className="relative w-full h-32 bg-neutral-950 rounded border border-neutral-800 overflow-hidden cursor-crosshair select-none flex flex-col justify-between p-2"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={durationMs}
        aria-valuenow={currentTimeMs}
        aria-label="Timeline scrubber"
      >
        {/* Time Markers Header (Ruler) */}
        <div className="w-full h-5 flex justify-between text-[10px] font-mono tabular-nums text-neutral-500 border-b border-neutral-800/80 px-1 pointer-events-none">
          <span>0.00s</span>
          <span>1.00s</span>
          <span>2.00s</span>
          <span>3.00s</span>
          <span>4.00s</span>
          <span>5.00s</span>
        </div>

        {/* Audio Waveform Track */}
        <div className="relative w-full h-12 flex items-center gap-[2px] px-1 pointer-events-none">
          {waveformBars.map((height, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-neutral-700/60"
              style={{
                height: `${height * 100}%`,
                backgroundColor: i > 62 && i < 72 ? '#f59e0b' : undefined,
              }}
            />
          ))}
        </div>

        {/* Keyframe & Beat Marker Indicators Track */}
        <div className="relative w-full h-7 border-t border-neutral-800/80 pointer-events-none">
          {/* Beat Markers */}
          {beatMarkers.map((marker) => {
            const posPct = (marker.timestampMs / durationMs) * 100;
            return (
              <div
                key={marker.id}
                className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center group pointer-events-auto"
                style={{ left: `${posPct}%` }}
                title={`Beat Marker: ${(marker.timestampMs / 1000).toFixed(2)}s`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSeek(marker.timestampMs);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemoveBeatMarker(marker.id);
                }}
              >
                <div className="w-2.5 h-2.5 rotate-45 bg-amber-400 border border-neutral-950 shadow-sm" />
                <div className="w-[1px] h-32 bg-amber-400/50 absolute top-2.5" />
              </div>
            );
          })}

          {/* Keyframes (Diamond icons) */}
          {keyframes.map((kf) => {
            const posPct = (kf.timestampMs / durationMs) * 100;
            return (
              <div
                key={kf.id}
                className="absolute top-1.5 transform -translate-x-1/2 flex flex-col items-center pointer-events-auto cursor-pointer"
                style={{ left: `${posPct}%` }}
                title={`Keyframe at ${(kf.timestampMs / 1000).toFixed(2)}s: Scale ${kf.scale}x, Rot ${kf.rotationDeg}°, ${kf.easing}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSeek(kf.timestampMs);
                }}
              >
                <div className="w-3 h-3 rotate-45 bg-sky-400 border border-neutral-900 shadow-sm hover:scale-125 transition-transform" />
                <span className="text-[9px] font-mono text-sky-300 mt-1">
                  {(kf.timestampMs / 1000).toFixed(1)}s
                </span>
              </div>
            );
          })}
        </div>

        {/* Red Playhead Line */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] pointer-events-none z-20"
          style={{ left: `${progressPercent}%` }}
        >
          <div className="w-3 h-3 bg-red-500 rotate-45 transform -translate-x-1/2 -top-1.5 absolute" />
        </div>
      </div>

      {/* Editor Hotkeys Guidance Footer */}
      <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1">
        <div className="flex items-center gap-3">
          <span>
            <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-300 border border-neutral-700">Space</kbd> Play/Pause
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-300 border border-neutral-700">M</kbd> Drop Beat Marker
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-300 border border-neutral-700">← / →</kbd> 1 Frame (Shift: 15 Frames)
          </span>
        </div>
        <div className="text-neutral-500">
          Right-click marker to remove
        </div>
      </div>
    </div>
  );
};
