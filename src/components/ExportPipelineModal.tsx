import React, { useState } from 'react';
import { Terminal, Cpu, Play, CheckCircle2, AlertCircle, HardDrive } from 'lucide-react';

interface ExportPipelineModalProps {
  onClose?: () => void;
}

export const ExportPipelineModal: React.FC<ExportPipelineModalProps> = () => {
  const [resolution, setResolution] = useState<'1080p' | '2k' | '4k'>('1080p');
  const [fps, setFps] = useState<number>(60);
  const [duration, setDuration] = useState<number>(5);
  const [accel, setAccel] = useState<'cpu' | 'vaapi' | 'nvenc'>('cpu');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportComplete, setExportComplete] = useState<boolean>(false);
  const [renderedFrames, setRenderedFrames] = useState<number>(0);

  const resDimensions = {
    '1080p': { w: 1920, h: 1080 },
    '2k': { w: 2560, h: 1440 },
    '4k': { w: 3840, h: 2160 },
  }[resolution];

  const frameBytes = resDimensions.w * resDimensions.h * 4;
  const frameSizeMB = frameBytes / (1024 * 1024);
  const pipeThroughputMBs = frameSizeMB * fps;
  const totalFrames = duration * fps;
  const estimatedFileSizeMB = ((18000 * duration) / (8 * 1024)).toFixed(1);

  // Generate real FFmpeg command string
  const generateCommand = () => {
    let accelFlags = '-c:v libx264 -preset faster -crf 18 -pix_fmt yuv420p';
    if (accel === 'vaapi') {
      accelFlags = '-vaapi_device /dev/dri/renderD128 -vf format=nv12,hwupload -c:v h264_vaapi -qp 20';
    } else if (accel === 'nvenc') {
      accelFlags = '-c:v h264_nvenc -preset p5 -b:v 18000k -pix_fmt yuv420p';
    }

    return `ffmpeg -y -f rawvideo -vcodec rawvideo -s ${resDimensions.w}x${resDimensions.h} -pix_fmt rgba -r ${fps} -i - ${accelFlags} output_${resolution}_${fps}fps.mp4`;
  };

  const handleStartRenderTest = () => {
    setIsExporting(true);
    setExportProgress(0);
    setExportComplete(false);
    setRenderedFrames(0);

    const startTime = Date.now();
    const interval = setInterval(() => {
      setExportProgress((prev) => {
        const next = prev + 3.5;
        const currentFrames = Math.min(totalFrames, Math.floor((next / 100) * totalFrames));
        setRenderedFrames(currentFrames);

        if (next >= 100) {
          clearInterval(interval);
          setIsExporting(false);
          setExportComplete(true);
          return 100;
        }
        return next;
      });
    }, 50);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span>FFmpeg Direct Memory Pipeline & HW Acceleration</span>
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Streaming raw Skia RGBA frames straight from RAM to FFmpeg stdin with zero temporary disk files.
          </p>
        </div>
      </div>

      {/* Configuration Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-neutral-950 p-3 rounded border border-neutral-800 text-xs">
        {/* Resolution */}
        <div>
          <label className="text-neutral-400 block mb-1.5 font-medium">Resolution</label>
          <div className="flex gap-1">
            {(['1080p', '2k', '4k'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setResolution(r)}
                className={`flex-1 py-1 px-2 rounded font-mono uppercase text-center transition-colors ${
                  resolution === r
                    ? 'bg-sky-600 text-white font-medium'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Framerate */}
        <div>
          <label className="text-neutral-400 block mb-1.5 font-medium">Framerate (FPS)</label>
          <div className="flex gap-1">
            {[24, 30, 60].map((f) => (
              <button
                key={f}
                onClick={() => setFps(f)}
                className={`flex-1 py-1 px-2 rounded font-mono text-center transition-colors ${
                  fps === f
                    ? 'bg-sky-600 text-white font-medium'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Acceleration */}
        <div>
          <label className="text-neutral-400 block mb-1.5 font-medium">Encoder Target</label>
          <div className="flex gap-1">
            {(['cpu', 'vaapi', 'nvenc'] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAccel(a)}
                className={`flex-1 py-1 px-1.5 rounded uppercase font-mono text-center transition-colors ${
                  accel === a
                    ? 'bg-emerald-600 text-white font-medium'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="text-neutral-400 block mb-1.5 font-medium">Duration</label>
          <div className="flex gap-1">
            {[3, 5, 10].map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`flex-1 py-1 px-2 rounded font-mono text-center transition-colors ${
                  duration === d
                    ? 'bg-sky-600 text-white font-medium'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Memory & Throughput Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-neutral-950 rounded border border-neutral-800">
          <div className="text-neutral-500">Raw Frame Size</div>
          <div className="text-neutral-100 font-mono font-semibold text-sm mt-0.5 tabular-nums">
            {frameSizeMB.toFixed(2)} MB
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">
            {resDimensions.w}x{resDimensions.h}x4
          </div>
        </div>

        <div className="p-3 bg-neutral-950 rounded border border-neutral-800">
          <div className="text-neutral-500">Pipe Throughput</div>
          <div className="text-emerald-400 font-mono font-semibold text-sm mt-0.5 tabular-nums">
            {pipeThroughputMBs.toFixed(1)} MB/s
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">
            RAM to stdin pipe
          </div>
        </div>

        <div className="p-3 bg-neutral-950 rounded border border-neutral-800">
          <div className="text-neutral-500">Total Frames</div>
          <div className="text-amber-400 font-mono font-semibold text-sm mt-0.5 tabular-nums">
            {totalFrames} Frames
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">
            {duration}s @ {fps} FPS
          </div>
        </div>

        <div className="p-3 bg-neutral-950 rounded border border-neutral-800">
          <div className="text-neutral-500">Disk I/O Overhead</div>
          <div className="text-sky-400 font-mono font-semibold text-sm mt-0.5 tabular-nums">
            0.00 MB
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">
            Zero temp disk files
          </div>
        </div>
      </div>

      {/* Command Preview */}
      <div className="bg-neutral-950 rounded p-3 border border-neutral-800">
        <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5">
          <span className="font-medium flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-neutral-400" />
            Generated Linux Command
          </span>
          <span className="text-[11px] text-neutral-500 font-mono">OS Pipe stdin: -i -</span>
        </div>
        <div className="font-mono text-xs text-neutral-300 bg-neutral-900 p-2 rounded overflow-x-auto select-all">
          {generateCommand()}
        </div>
      </div>

      {/* Action & Benchmark Runner */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <button
            onClick={handleStartRenderTest}
            disabled={isExporting}
            className={`px-4 py-2 rounded text-xs font-medium flex items-center gap-2 transition-colors ${
              isExporting
                ? 'bg-neutral-800 text-neutral-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
            }`}
          >
            <Play className="w-4 h-4" />
            <span>{isExporting ? 'Streaming to FFmpeg Pipe...' : 'Simulate 5s Render Pipe'}</span>
          </button>

          {exportComplete && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>Piped {totalFrames} frames with 0 byte disk thrashing!</span>
            </div>
          )}
        </div>

        {isExporting && (
          <div className="bg-neutral-950 p-3 rounded border border-neutral-800 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-neutral-400 font-mono tabular-nums">
              <span>Streaming Frame {renderedFrames}/{totalFrames}</span>
              <span className="text-emerald-400">{exportProgress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-75 ease-out"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
