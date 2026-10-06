export type EasingFunction =
  | 'Linear'
  | 'EaseInQuad'
  | 'EaseOutQuad'
  | 'EaseInOutQuad'
  | 'EaseInCubic'
  | 'EaseOutCubic'
  | 'EaseInOutCubic'
  | 'EaseInExpo'
  | 'EaseOutExpo'
  | 'EaseInOutExpo'
  | 'EaseOutBounce'
  | 'EaseInOutBounce';

export interface Keyframe {
  id: string;
  timestampMs: number;
  posX: number;
  posY: number;
  scale: number;
  rotationDeg: number;
  easing: EasingFunction;
}

export interface BeatMarker {
  id: string;
  timestampMs: number;
  label?: string;
  color?: string;
}

export interface TimelineTrack {
  id: string;
  name: string;
  color: string;
  type: 'image' | 'bubble' | 'fx' | 'audio';
  visible: boolean;
  locked: boolean;
}

export interface RenderProfile {
  name: string;
  width: number;
  height: number;
  fps: number;
  accel: 'cpu' | 'vaapi' | 'nvenc';
  bitrateKbps: number;
}
