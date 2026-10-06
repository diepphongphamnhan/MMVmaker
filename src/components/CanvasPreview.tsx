import React, { useRef, useEffect } from 'react';
import { Keyframe } from '../types/mmv';
import { evaluateEasing } from '../utils/easing';

interface CanvasPreviewProps {
  currentTimeMs: number;
  durationMs: number;
  keyframes: Keyframe[];
  cameraShakeAmp: number;
  cameraShakeFreq: number;
  flashIntensity: number;
  showSpeedlines: boolean;
  splitSpread: 'full' | 'left' | 'right';
}

export const CanvasPreview: React.FC<CanvasPreviewProps> = ({
  currentTimeMs,
  durationMs,
  keyframes,
  cameraShakeAmp,
  cameraShakeFreq,
  flashIntensity,
  showSpeedlines,
  splitSpread,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Calculate interpolated values for timestamp
  const calculateKinematics = (tMs: number) => {
    if (keyframes.length === 0) {
      const progress = Math.min(1, Math.max(0, tMs / durationMs));
      const eased = evaluateEasing('EaseInOutCubic', progress);
      return {
        posX: eased * 140,
        posY: -eased * 40,
        scale: 1.0 + eased * 0.45,
        rotation: Math.sin(progress * Math.PI) * 1.5,
      };
    }

    if (tMs <= keyframes[0].timestampMs) {
      return {
        posX: keyframes[0].posX,
        posY: keyframes[0].posY,
        scale: keyframes[0].scale,
        rotation: keyframes[0].rotationDeg,
      };
    }

    if (tMs >= keyframes[keyframes.length - 1].timestampMs) {
      const last = keyframes[keyframes.length - 1];
      return {
        posX: last.posX,
        posY: last.posY,
        scale: last.scale,
        rotation: last.rotationDeg,
      };
    }

    for (let i = 0; i < keyframes.length - 1; i++) {
      const k0 = keyframes[i];
      const k1 = keyframes[i + 1];
      if (tMs >= k0.timestampMs && tMs <= k1.timestampMs) {
        const dt = k1.timestampMs - k0.timestampMs;
        const localT = dt > 0 ? (tMs - k0.timestampMs) / dt : 0;
        const eased = evaluateEasing(k1.easing, localT);

        return {
          posX: k0.posX + (k1.posX - k0.posX) * eased,
          posY: k0.posY + (k1.posY - k0.posY) * eased,
          scale: k0.scale + (k1.scale - k0.scale) * eased,
          rotation: k0.rotationDeg + (k1.rotationDeg - k0.rotationDeg) * eased,
        };
      }
    }

    return { posX: 0, posY: 0, scale: 1, rotation: 0 };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Kinematics calculations
    const kf = calculateKinematics(currentTimeMs);
    let posX = kf.posX;
    let posY = kf.posY;
    const scale = kf.scale;
    const rotation = kf.rotation;

    // Camera Shake
    if (cameraShakeAmp > 0) {
      const tSec = currentTimeMs / 1000;
      const shakeX = Math.sin(tSec * cameraShakeFreq * 6.28) * cameraShakeAmp;
      const shakeY = Math.cos(tSec * cameraShakeFreq * 8.31) * cameraShakeAmp * 0.7;
      posX += shakeX;
      posY += shakeY;
    }

    // Clear background (Letterbox dark canvas)
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    // Center point translation + keyframe pan & rotation
    ctx.translate(width / 2 + posX, height / 2 + posY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);

    // Render Manga Panel Artwork Simulation (1280x720 internal coordinates)
    const panelW = 1200;
    const panelH = 680;
    const halfW = panelW / 2;
    const halfH = panelH / 2;

    // Manga paper background (warm off-white)
    ctx.fillStyle = '#f8f8f6';
    ctx.fillRect(-halfW, -halfH, panelW, panelH);

    // Comic Panel Outer Border
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 14;
    ctx.strokeRect(-halfW + 20, -halfH + 20, panelW - 40, panelH - 40);

    // Inner Split Gutter if full spread
    if (splitSpread === 'full') {
      ctx.fillStyle = '#111111';
      ctx.fillRect(-6, -halfH + 20, 12, panelH - 40);
    }

    // Left or Right Spread crop clipping
    if (splitSpread === 'left') {
      ctx.fillStyle = '#111111';
      ctx.fillRect(0, -halfH + 20, halfW - 20, panelH - 40);
    } else if (splitSpread === 'right') {
      ctx.fillStyle = '#111111';
      ctx.fillRect(-halfW + 20, -halfH + 20, halfW - 20, panelH - 40);
    }

    // Manga Screentone Dots (Halftone texture)
    ctx.fillStyle = '#ddddda';
    const dotSpacing = 16;
    for (let x = -halfW + 40; x < halfW - 40; x += dotSpacing) {
      for (let y = -halfH + 40; y < halfH - 40; y += dotSpacing) {
        if ((x + y) % 32 === 0) {
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Speedlines
    if (showSpeedlines) {
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 2.5;
      const numLines = 64;
      const focalX = 0;
      const focalY = 0;
      for (let i = 0; i < numLines; i++) {
        const angle = (i / numLines) * Math.PI * 2;
        const innerRadius = 140 + (i % 5) * 20;
        const outerRadius = 550;
        const x1 = focalX + Math.cos(angle) * innerRadius;
        const y1 = focalY + Math.sin(angle) * innerRadius;
        const x2 = focalX + Math.cos(angle) * outerRadius;
        const y2 = focalY + Math.sin(angle) * outerRadius;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    // Manga Character Silhouette & Action Lines
    // Central Character Silhouette
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.moveTo(-70, 180);
    ctx.lineTo(-40, 40);
    ctx.lineTo(-65, -30);
    ctx.lineTo(-30, -90);
    ctx.lineTo(0, -140); // hair spike
    ctx.lineTo(25, -95);
    ctx.lineTo(60, -80);
    ctx.lineTo(35, -35);
    ctx.lineTo(55, 45);
    ctx.lineTo(85, 180);
    ctx.closePath();
    ctx.fill();

    // Katana / Action Blade line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-180, 120);
    ctx.lineTo(190, -130);
    ctx.stroke();

    // Japanese Sound FX Onomatopoeia (ド ド ド - Dododo Action Impact)
    ctx.font = '900 48px "Hiragino Kaku Gothic Pro", "Noto Sans JP", sans-serif';
    ctx.fillStyle = '#111111';
    ctx.fillText('ド', -280, -60);
    ctx.fillText('ド', 210, -80);
    ctx.fillText('ッ', 240, 40);

    // Dialogue speech balloon
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(-230, -180, 110, 60, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#111111';
    ctx.fillText('BEAT DROP', -280, -185);
    ctx.fillText('60 FPS PIPED', -285, -165);

    ctx.restore();

    // Flash Transition Layer
    if (flashIntensity > 0.01) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, flashIntensity)})`;
      ctx.fillRect(0, 0, width, height);
    }

    // HUD Info Overlay in Viewport
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(16, 16, 260, 74);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(16, 16, 260, 74);

    ctx.font = '12px monospace';
    ctx.fillStyle = '#10b981';
    ctx.fillText(`TIME: ${(currentTimeMs / 1000).toFixed(2)}s / ${(durationMs / 1000).toFixed(2)}s`, 28, 38);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(`ZOOM: ${scale.toFixed(2)}x | ROT: ${rotation.toFixed(1)}°`, 28, 56);
    ctx.fillText(`OFFSET: X:${posX.toFixed(0)}px Y:${posY.toFixed(0)}px`, 28, 74);

  }, [
    currentTimeMs,
    durationMs,
    keyframes,
    cameraShakeAmp,
    cameraShakeFreq,
    flashIntensity,
    showSpeedlines,
    splitSpread,
  ]);

  return (
    <div className="relative w-full aspect-video bg-neutral-950 rounded-lg overflow-hidden border border-neutral-800 flex items-center justify-center shadow-xl">
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        className="w-full h-full object-contain"
        aria-label="MMV Skia Canvas Preview"
      />
    </div>
  );
};
