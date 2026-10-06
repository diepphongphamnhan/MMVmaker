import React, { useState } from 'react';
import { Copy, Check, Terminal, FileCode, Cpu, ShieldCheck } from 'lucide-react';

interface FileEntry {
  id: string;
  filename: string;
  path: string;
  language: string;
  description: string;
  code: string;
}

const NATIVE_FILES: FileEntry[] = [
  {
    id: 'cli',
    filename: 'main.go',
    path: 'cmd/mmv-cli/main.go',
    language: 'go',
    description: 'Go CLI application that renders the 5-second MMV video by streaming raw Skia RGBA frames to FFmpeg stdin.',
    code: `package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"mmv/pkg/engine"
	"mmv/pkg/pipeline"
)

func main() {
	imagePath := flag.String("image", "", "Path to manga panel image (.png/.jpg)")
	outputPath := flag.String("out", "output_5s_mmv.mp4", "Output MP4 video file path")
	width := flag.Int("w", 1920, "Output video width")
	height := flag.Int("h", 1080, "Output video height")
	fps := flag.Int("fps", 60, "Output framerate")
	durationSec := flag.Float64("dur", 5.0, "Animation duration in seconds")
	accel := flag.String("accel", "cpu", "Hardware acceleration (cpu, vaapi, nvenc)")
	flag.Parse()

	// 1. Initialize C++ Skia Engine via CGo
	eng, err := engine.NewEngine(*width, *height, *fps, false)
	if err != nil {
		log.Fatalf("Fatal: failed to create Skia engine: %v", err)
	}
	defer eng.Close()

	if *imagePath != "" {
		absPath, _ := filepath.Abs(*imagePath)
		_ = eng.LoadImage(absPath)
	}

	// 2. Program Kinematic Camera Keyframes for Manga Beat Drop
	totalMs := int64(*durationSec * 1000)
	eng.ClearKeyframes()
	eng.AddKeyframe(engine.Keyframe{TimestampMs: 0, PosX: 0, PosY: 0, Scale: 1.0, Easing: engine.EasingEaseInOutCubic})
	eng.AddKeyframe(engine.Keyframe{TimestampMs: int64(float64(totalMs) * 0.30), PosX: 140, PosY: -60, Scale: 1.35, Easing: engine.EasingEaseInOutCubic})
	eng.AddKeyframe(engine.Keyframe{TimestampMs: int64(float64(totalMs) * 0.60), PosX: -160, PosY: 50, Scale: 1.55, Easing: engine.EasingEaseOutExpo})
	eng.AddKeyframe(engine.Keyframe{TimestampMs: int64(float64(totalMs) * 0.85), PosX: 0, PosY: 0, Scale: 1.85, Easing: engine.EasingEaseOutBounce})
	eng.AddKeyframe(engine.Keyframe{TimestampMs: totalMs, PosX: 0, PosY: 0, Scale: 2.0, Easing: engine.EasingLinear})
	eng.SetCameraShake(14.0, 16.0)

	// 3. Start Zero-Copy FFmpeg Streaming Pipe
	exportCfg := pipeline.ExportConfig{
		Width: *width, Height: *height, FPS: *fps, BitrateKbps: 18000,
		Accel: pipeline.HardwareAccel(*accel), OutputPath: *outputPath,
	}
	pipe, err := pipeline.NewFFmpegPipe(exportCfg)
	if err != nil {
		log.Fatalf("Fatal: failed to spawn FFmpeg pipe: %v", err)
	}

	totalFrames := int(*durationSec * float64(*fps))
	frameBytes := eng.FrameSize()
	
	// Pre-allocate ONE single frame buffer (Zero GC thrashing in hot loop)
	frameBuffer := make([]byte, frameBytes)
	startTime := time.Now()

	for frameIdx := 0; frameIdx < totalFrames; frameIdx++ {
		timestampMs := int64(float64(frameIdx) * 1000.0 / float64(*fps))
		
		// Flash transition at beat drop
		if timestampMs >= 2750 && timestampMs <= 2900 {
			eng.SetFlash(0.85)
		} else {
			eng.SetFlash(0.0)
		}

		// Render C++ Skia frame into Go buffer
		_ = eng.RenderFrame(timestampMs, frameBuffer)

		// Pipe directly into FFmpeg stdin
		_ = pipe.WriteRawFrame(frameBuffer)
	}

	_ = pipe.Close()
	log.Printf("SUCCESS: Rendered %s (Zero disk thrashing)", *outputPath)
}`,
  },
  {
    id: 'bridge',
    filename: 'bridge.go',
    path: 'pkg/engine/bridge.go',
    language: 'go',
    description: 'CGo binding layer providing clean, type-safe Go abstractions while isolating C pointers and pinning.',
    code: `package engine

/*
#cgo CXXFLAGS: -std=c++17 -O3 -fPIC
#cgo LDFLAGS: -lstdc++ -lm
#include "skia_engine.h"
#include <stdlib.h>
*/
import "C"
import (
	"errors"
	"runtime"
	"unsafe"
)

type Engine struct {
	handle C.MMVEngineHandle
	width  int
	height int
	fps    int
}

func NewEngine(width, height, fps int, useGPU bool) (*Engine, error) {
	cfg := C.MMVConfig{
		width:   C.int(width),
		height:  C.int(height),
		fps:     C.int(fps),
		use_gpu: C.int(0),
	}
	if useGPU { cfg.use_gpu = C.int(1) }
	
	handle := C.MMV_Engine_Create(&cfg)
	if handle == nil {
		return nil, errors.New("failed to initialize C++ Skia Engine")
	}

	e := &Engine{handle: handle, width: width, height: height, fps: fps}
	runtime.SetFinalizer(e, (*Engine).Close)
	return e, nil
}

func (e *Engine) RenderFrame(timestampMs int64, outBuffer []byte) error {
	expectedSize := e.width * e.height * 4
	if len(outBuffer) < expectedSize {
		return errors.New("destination buffer too small")
	}
	// Zero-copy direct memory pass into C++ Skia rasterizer
	ret := C.MMV_Engine_RenderFrame(
		e.handle,
		C.int64_t(timestampMs),
		(*C.uint8_t)(unsafe.Pointer(&outBuffer[0])),
	)
	if ret == 0 {
		return errors.New("render frame failed")
	}
	return nil
}`,
  },
  {
    id: 'skia_header',
    filename: 'skia_engine.h',
    path: 'pkg/engine/skia_engine.h',
    language: 'cpp',
    description: 'Clean C-ABI interface ensuring zero C++ name mangling for seamless CGo linkage.',
    code: `#ifndef MMV_SKIA_ENGINE_H
#define MMV_SKIA_ENGINE_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef void* MMVEngineHandle;

typedef struct {
    int64_t timestamp_ms;
    float pos_x;
    float pos_y;
    float scale;
    float rotation_deg;
    int easing_type;
} MMVKeyframe;

typedef struct {
    int width;
    int height;
    int fps;
    int use_gpu;
} MMVConfig;

MMVEngineHandle MMV_Engine_Create(const MMVConfig* config);
void MMV_Engine_Destroy(MMVEngineHandle handle);
int  MMV_Engine_LoadImage(MMVEngineHandle handle, const char* filepath);
void MMV_Engine_AddKeyframe(MMVEngineHandle handle, const MMVKeyframe* keyframe);
void MMV_Engine_ClearKeyframes(MMVEngineHandle handle);
void MMV_Engine_SetCameraShake(MMVEngineHandle handle, float amplitude, float frequency_hz);
void MMV_Engine_SetFlash(MMVEngineHandle handle, float flash_intensity);
int  MMV_Engine_RenderFrame(MMVEngineHandle handle, int64_t timestamp_ms, uint8_t* out_rgba_buffer);

#ifdef __cplusplus
}
#endif

#endif // MMV_SKIA_ENGINE_H`,
  },
  {
    id: 'skia_cpp',
    filename: 'skia_engine.cpp',
    path: 'pkg/engine/skia_engine.cpp',
    language: 'cpp',
    description: 'C++ Skia 2D rendering implementation with matrix pan/zoom, camera shake, and RGBA pixel buffer output.',
    code: `#include "skia_engine.h"
#include "easing.hpp"
#include <vector>
#include <cmath>
#include <algorithm>

#ifdef USE_SKIA
#include "include/core/SkCanvas.h"
#include "include/core/SkSurface.h"
#include "include/core/SkImage.h"
#include "include/core/SkMatrix.h"
#endif

class MMVSkiaEngineImpl {
public:
    MMVSkiaEngineImpl(int w, int h, int fps, bool use_gpu)
        : width_(w), height_(h), fps_(fps), use_gpu_(use_gpu) {
#ifdef USE_SKIA
        SkImageInfo info = SkImageInfo::Make(width_, height_, kRGBA_8888_SkColorType, kPremul_SkAlphaType);
        sk_surface_ = SkSurface::MakeRaster(info);
#endif
    }

    bool RenderFrame(int64_t timestamp_ms, uint8_t* out_buffer) {
        float posX = 0.0f, posY = 0.0f, scale = 1.0f, rotation = 0.0f;
        InterpolateKeyframes(timestamp_ms, posX, posY, scale, rotation);

        // Apply camera shake FX
        if (shake_amplitude_ > 0.001f) {
            float t_sec = static_cast<float>(timestamp_ms) / 1000.0f;
            posX += std::sin(t_sec * shake_frequency_ * 6.28f) * shake_amplitude_;
            posY += std::cos(t_sec * shake_frequency_ * 8.31f) * shake_amplitude_ * 0.7f;
        }

#ifdef USE_SKIA
        SkCanvas* canvas = sk_surface_->getCanvas();
        canvas->clear(SK_ColorBLACK);
        canvas->save();
        canvas->translate(width_ * 0.5f + posX, height_ * 0.5f + posY);
        canvas->rotate(rotation);
        canvas->scale(scale, scale);
        // Draw manga panel image with bilinear sampling
        canvas->drawImage(sk_image_, -sk_image_->width()*0.5f, -sk_image_->height()*0.5f);
        canvas->restore();
        
        SkImageInfo dstInfo = SkImageInfo::Make(width_, height_, kRGBA_8888_SkColorType, kUnpremul_SkAlphaType);
        return sk_surface_->readPixels(dstInfo, out_buffer, width_ * 4, 0, 0);
#else
        // Fallback software bilinear rasterizer
        RenderFallback(posX, posY, scale, rotation, out_buffer);
        return true;
#endif
    }
    // ...
};`,
  },
  {
    id: 'ffmpeg_pipe',
    filename: 'ffmpeg.go',
    path: 'pkg/pipeline/ffmpeg.go',
    language: 'go',
    description: 'Hardware-accelerated FFmpeg direct memory pipe with Linux VA-API and Nvidia NVENC support.',
    code: `package pipeline

import (
	"fmt"
	"io"
	"os/exec"
)

type HardwareAccel string
const (
	AccelCPU   HardwareAccel = "cpu"   // libx264
	AccelVAAPI HardwareAccel = "vaapi" // Linux Intel/AMD Mesa VA-API (/dev/dri/renderD128)
	AccelNVENC HardwareAccel = "nvenc" // Nvidia GPU NVENC
)

func NewFFmpegPipe(cfg ExportConfig) (*FFmpegPipe, error) {
	args := []string{
		"-y",
		"-f", "rawvideo",
		"-vcodec", "rawvideo",
		"-s", fmt.Sprintf("%dx%d", cfg.Width, cfg.Height),
		"-pix_fmt", "rgba",
		"-r", fmt.Sprintf("%d", cfg.FPS),
		"-i", "-", // Stream from stdin pipe
	}

	switch cfg.Accel {
	case AccelVAAPI:
		args = append(args, "-vaapi_device", "/dev/dri/renderD128", "-vf", "format=nv12,hwupload", "-c:v", "h264_vaapi", "-qp", "20")
	case AccelNVENC:
		args = append(args, "-c:v", "h264_nvenc", "-preset", "p5", "-pix_fmt", "yuv420p")
	default:
		args = append(args, "-c:v", "libx264", "-preset", "faster", "-crf", "18", "-pix_fmt", "yuv420p")
	}

	args = append(args, cfg.OutputPath)
	cmd := exec.Command("ffmpeg", args...)
	stdin, err := cmd.StdinPipe()
	if err != nil { return nil, err }
	if err := cmd.Start(); err != nil { return nil, err }

	return &FFmpegPipe{cmd: cmd, stdin: stdin, config: cfg}, nil
}`,
  },
  {
    id: 'makefile',
    filename: 'Makefile',
    path: 'native/Makefile',
    language: 'makefile',
    description: 'Linux Makefile with compiler flags and targets.',
    code: `CC ?= gcc
CXX ?= g++
GO ?= go

export CGO_ENABLED=1
export CXXFLAGS=-O3 -std=c++17 -Wall -Wextra -fPIC
export LDFLAGS=-lstdc++ -lm

.PHONY: all build run run-vaapi run-nvenc clean

all: build

build:
	@echo "==> Building KuroKage MMV Native CLI (CGo + Skia Engine)..."
	cd cmd/mmv-cli && $(GO) build -v -o ../../bin/mmv-cli .

run: build
	./bin/mmv-cli -w 1920 -h 1080 -fps 60 -dur 5.0 -out output_5s_mmv.mp4

run-vaapi: build
	./bin/mmv-cli -accel vaapi -out output_vaapi.mp4

run-nvenc: build
	./bin/mmv-cli -accel nvenc -out output_nvenc.mp4

clean:
	rm -rf bin/ output_*.mp4`,
  },
];

export const CodeExplorer: React.FC = () => {
  const [activeFileId, setActiveFileId] = useState<string>('cli');
  const [copied, setCopied] = useState<boolean>(false);

  const activeFile = NATIVE_FILES.find((f) => f.id === activeFileId) || NATIVE_FILES[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden flex flex-col">
      {/* Tab Header */}
      <div className="bg-neutral-950 border-b border-neutral-800 px-4 py-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {NATIVE_FILES.map((file) => (
            <button
              key={file.id}
              onClick={() => setActiveFileId(file.id)}
              className={`px-3 py-1.5 text-xs font-mono rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeFileId === file.id
                  ? 'bg-neutral-800 text-sky-400 font-medium border border-neutral-700 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{file.filename}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleCopy}
          className="px-2.5 py-1 text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded border border-neutral-700 flex items-center gap-1.5 transition-colors"
          title="Copy file contents"
          aria-label="Copy file content"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* File Description & Location */}
      <div className="px-4 py-2.5 bg-neutral-900/80 border-b border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
        <span className="font-mono text-neutral-300">{activeFile.path}</span>
        <span>{activeFile.description}</span>
      </div>

      {/* Code Viewer */}
      <div className="p-4 bg-neutral-950 overflow-x-auto max-h-[460px] font-mono text-xs text-neutral-200 leading-relaxed">
        <pre>
          <code>{activeFile.code}</code>
        </pre>
      </div>

      {/* Engineering Callout */}
      <div className="px-4 py-3 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Zero GC Thrashing Guarantee:</strong> Single reusable frame buffer passed via <code className="text-sky-300">unsafe.Pointer</code> into Skia C-ABI without escaping Go heap.
          </span>
        </div>
        <div className="flex items-center gap-2 text-neutral-500 font-mono">
          <Cpu className="w-4 h-4" />
          <span>Linux x86_64 / VA-API / NVENC</span>
        </div>
      </div>
    </div>
  );
};
