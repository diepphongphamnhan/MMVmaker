import { EasingFunction } from '../types/mmv';

export function evaluateEasing(type: EasingFunction, t: number): number {
  t = Math.max(0, Math.min(1, t));

  switch (type) {
    case 'Linear':
      return t;
    case 'EaseInQuad':
      return t * t;
    case 'EaseOutQuad':
      return t * (2 - t);
    case 'EaseInOutQuad':
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    case 'EaseInCubic':
      return t * t * t;
    case 'EaseOutCubic': {
      const f = t - 1;
      return f * f * f + 1;
    }
    case 'EaseInOutCubic':
      return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    case 'EaseInExpo':
      return t === 0 ? 0 : Math.pow(2, 10 * (t - 1));
    case 'EaseOutExpo':
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    case 'EaseInOutExpo':
      if (t === 0 || t === 1) return t;
      if (t < 0.5) return 0.5 * Math.pow(2, 20 * t - 10);
      return 1 - 0.5 * Math.pow(2, -20 * t + 10);
    case 'EaseOutBounce':
      return easeOutBounce(t);
    case 'EaseInOutBounce':
      return t < 0.5
        ? 0.5 * (1 - easeOutBounce(1 - t * 2))
        : 0.5 * easeOutBounce(t * 2 - 1) + 0.5;
    default:
      return t;
  }
}

function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    t -= 1.5 / d1;
    return n1 * t * t + 0.75;
  } else if (t < 2.5 / d1) {
    t -= 2.25 / d1;
    return n1 * t * t + 0.9375;
  } else {
    t -= 2.625 / d1;
    return n1 * t * t + 0.984375;
  }
}
