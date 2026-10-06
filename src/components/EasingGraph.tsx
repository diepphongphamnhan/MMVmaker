import React from 'react';
import { EasingFunction } from '../types/mmv';
import { evaluateEasing } from '../utils/easing';

interface EasingGraphProps {
  currentEasing: EasingFunction;
  onSelectEasing: (easing: EasingFunction) => void;
  progress: number; // 0.0 to 1.0
}

const EASING_OPTIONS: { name: EasingFunction; desc: string; category: string }[] = [
  { name: 'Linear', desc: 'Constant rate for mechanical pans', category: 'Basic' },
  { name: 'EaseInQuad', desc: 'Accelerates into motion', category: 'Quadratic' },
  { name: 'EaseOutQuad', desc: 'Decelerates gently to rest', category: 'Quadratic' },
  { name: 'EaseInOutCubic', desc: 'Smooth cinematic camera zoom', category: 'Cubic' },
  { name: 'EaseInExpo', desc: 'Dramatic slow build into sudden cut', category: 'Exponential' },
  { name: 'EaseOutExpo', desc: 'Ultra-fast snap stop on panel', category: 'Exponential' },
  { name: 'EaseOutBounce', desc: 'Elastic comic bounce on impact', category: 'Elastic' },
  { name: 'EaseInOutBounce', desc: 'Dual-phase bouncing transition', category: 'Elastic' },
];

export const EasingGraph: React.FC<EasingGraphProps> = ({
  currentEasing,
  onSelectEasing,
  progress,
}) => {
  // Generate SVG curve points
  const points = React.useMemo(() => {
    const pts: string[] = [];
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const val = evaluateEasing(currentEasing, t);
      // Map t (0..1) -> x (10..190), val (0..1) -> y (110..10)
      const x = 10 + t * 180;
      const y = 110 - Math.min(1.2, Math.max(-0.2, val)) * 100;
      pts.push(`${x},${y}`);
    }
    return pts.join(' ');
  }, [currentEasing]);

  // Current marker on curve
  const currentVal = evaluateEasing(currentEasing, progress);
  const currentX = 10 + progress * 180;
  const currentY = 110 - Math.min(1.2, Math.max(-0.2, currentVal)) * 100;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-200">
          Easing Curve Kinematics
        </h3>
        <span className="text-xs font-mono text-emerald-400">
          y(t) = {currentVal.toFixed(3)}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        {/* SVG Curve Canvas */}
        <div className="relative bg-neutral-950 rounded border border-neutral-800 p-2 flex flex-col items-center">
          <svg
            viewBox="0 0 200 120"
            className="w-full h-32 overflow-visible"
            aria-label={`Curve for ${currentEasing}`}
          >
            {/* Grid lines */}
            <line x1="10" y1="10" x2="190" y2="10" stroke="#262626" strokeDasharray="3 3" />
            <line x1="10" y1="60" x2="190" y2="60" stroke="#262626" strokeDasharray="3 3" />
            <line x1="10" y1="110" x2="190" y2="110" stroke="#404040" />
            <line x1="10" y1="10" x2="10" y2="110" stroke="#404040" />
            <line x1="190" y1="10" x2="190" y2="110" stroke="#262626" strokeDasharray="3 3" />

            {/* Easing Path */}
            <polyline
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              points={points}
            />

            {/* Active Progress Dot */}
            <circle
              cx={currentX}
              cy={currentY}
              r="4.5"
              fill="#f43f5e"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          </svg>

          <div className="w-full flex justify-between text-[10px] font-mono text-neutral-500 mt-1 px-2">
            <span>t = 0.0</span>
            <span className="text-rose-400">t = {progress.toFixed(2)}</span>
            <span>t = 1.0</span>
          </div>
        </div>

        {/* Easing Selector List */}
        <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1">
          {EASING_OPTIONS.map((item) => (
            <button
              key={item.name}
              onClick={() => onSelectEasing(item.name)}
              className={`px-2.5 py-1.5 rounded text-left text-xs transition-colors flex items-center justify-between ${
                currentEasing === item.name
                  ? 'bg-sky-950/70 border border-sky-600/60 text-sky-200'
                  : 'bg-neutral-950/40 hover:bg-neutral-800 text-neutral-400 border border-transparent'
              }`}
            >
              <div>
                <span className="font-medium text-neutral-200">{item.name}</span>
                <span className="block text-[10px] text-neutral-500">{item.desc}</span>
              </div>
              <span className="text-[10px] font-mono text-neutral-600">{item.category}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
