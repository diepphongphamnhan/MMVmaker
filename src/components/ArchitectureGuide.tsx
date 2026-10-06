import React from 'react';
import { Layers, Zap, Cpu, Film, GitFork, ShieldAlert, Check } from 'lucide-react';

export const ArchitectureGuide: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Project Structure & C-ABI CGo Isolation',
      desc: 'Isolate native C++ Skia rendering logic behind a clean, non-mangled C-ABI header (pkg/engine/skia_engine.h). The Go wrapper (pkg/engine/bridge.go) manages lifecycle and pins raw byte pointers.',
      status: 'Implemented',
    },
    {
      num: '02',
      title: 'Skia 2D Transformation & Easing Kinematics',
      desc: 'Sub-pixel matrix pan, zoom (1.0x to 3.0x), and rotation with mathematical easing curves (Linear, Quad, Cubic, Exponential, Bounce). Instantaneous velocity calculations prevent visual hitching.',
      status: 'Implemented',
    },
    {
      num: '03',
      title: 'Direct-Memory FFmpeg Pipe (Zero Disk Thrashing)',
      desc: 'Stream raw 8-bit RGBA pixel buffers directly into FFmpeg stdin via OS pipes. Eliminates all intermediate disk frames (PNG/BMP), maximizing SSD lifespan and sustaining 60 FPS output.',
      status: 'Implemented',
    },
    {
      num: '04',
      title: 'Multi-Layer Canvas & Manga Page Splitter',
      desc: 'Compositing stack: Layer 0 (Background / spread), Layer 1 (Character / action cutout), Layer 2 (Screentone / FX), Layer 3 (Onomatopoeia & speech bubbles). Spread splitter splits double pages into separate clips.',
      status: 'Architected',
    },
    {
      num: '05',
      title: 'Audio PCM Waveform & Beat-Sync Snapping',
      desc: 'Header-only miniaudio / Go-audio pipeline decoding PCM samples. Real-time amplitude envelope extraction for timeline rendering and hotkey [M] beat marker placement.',
      status: 'Architected',
    },
    {
      num: '06',
      title: 'Hardware Acceleration (VA-API / NVENC)',
      desc: 'Linux kernel direct rendering infrastructure (/dev/dri/renderD128 for Intel/AMD Mesa VA-API) and Nvidia NVENC flags, offloading H.264/HEVC compression entirely to the GPU hardware encoder.',
      status: 'Architected',
    },
  ];

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 flex flex-col gap-4">
      <div>
        <h3 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
          <GitFork className="w-4 h-4 text-sky-400" />
          <span>System Architecture & Implementation Roadmap</span>
        </h3>
        <p className="text-xs text-neutral-400 mt-0.5">
          Native Linux MMV Graphics & Encoding Architecture Blueprint
        </p>
      </div>

      {/* Step Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {steps.map((s) => (
          <div
            key={s.num}
            className="p-3 bg-neutral-950 rounded border border-neutral-800 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-sky-400">Phase {s.num}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 font-medium">
                  {s.status}
                </span>
              </div>
              <h4 className="text-xs font-semibold text-neutral-200 mb-1">{s.title}</h4>
              <p className="text-[11px] text-neutral-400 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Deep-Dive Architectural Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1 pt-4 border-t border-neutral-800/80 text-xs">
        <div className="p-3 bg-neutral-950 rounded border border-neutral-800">
          <div className="font-semibold text-neutral-200 flex items-center gap-1.5 mb-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>CGo Memory Safety Guarantee</span>
          </div>
          <p className="text-neutral-400 text-[11px] leading-relaxed">
            Crossing the CGo boundary creates execution overhead if memory is allocated inside the hot render loop. In KuroKage MMV Studio, the Go CLI allocates a <strong>single continuous byte slice</strong> before starting. The pointer is passed to Skia's raster surface, which writes pixels directly into Go RAM with zero heap reallocations.
          </p>
        </div>

        <div className="p-3 bg-neutral-950 rounded border border-neutral-800">
          <div className="font-semibold text-neutral-200 flex items-center gap-1.5 mb-1.5">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>Zero Disk Thrashing Pipe Model</span>
          </div>
          <p className="text-neutral-400 text-[11px] leading-relaxed">
            Conventional video tools write thousands of temporary frames to disk, degrading NVMe/SSD drive endurance and causing I/O bottlenecks. KuroKage writes frames directly to FFmpeg's <code className="text-emerald-300">stdin</code> pipe using Linux kernel page buffers, keeping RAM footprint under <strong>35 MB</strong> and disk writes strictly to <strong>0 MB</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
