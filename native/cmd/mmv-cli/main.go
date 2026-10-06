package main

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

	log.Printf("==================================================")
	log.Printf(" KuroKage MMV Studio - High Performance Native CLI")
	log.Printf("==================================================")
	log.Printf("Resolution:  %dx%d @ %d FPS", *width, *height, *fps)
	log.Printf("Duration:    %.1f seconds (%d frames)", *durationSec, int(*durationSec*float64(*fps)))
	log.Printf("Target File: %s", *outputPath)
	log.Printf("Pipeline:    C++ Skia -> Direct Memory Pipe -> FFmpeg (%s)", *accel)
	log.Printf("==================================================")

	// 1. Initialize C++ Skia Engine
	eng, err := engine.NewEngine(*width, *height, *fps, false)
	if err != nil {
		log.Fatalf("Fatal: failed to create Skia engine: %v", err)
	}
	defer eng.Close()

	if *imagePath != "" {
		absPath, _ := filepath.Abs(*imagePath)
		if err := eng.LoadImage(absPath); err != nil {
			log.Printf("Warning: Could not load %s (%v), using internal manga test generator", *imagePath, err)
		} else {
			log.Printf("Loaded manga panel: %s", absPath)
		}
	} else {
		log.Println("No input image provided: using procedural speedline manga panel")
	}

	// 2. Program Kinematic Camera Keyframes for a dynamic MMV beat drop
	totalMs := int64(*durationSec * 1000)
	eng.ClearKeyframes()
	
	// Keyframe 0: Establishing shot
	eng.AddKeyframe(engine.Keyframe{
		TimestampMs: 0,
		PosX:        0,
		PosY:        0,
		Scale:       1.0,
		RotationDeg: 0,
		Easing:      engine.EasingEaseInOutCubic,
	})

	// Keyframe 1: Pan into character face
	eng.AddKeyframe(engine.Keyframe{
		TimestampMs: int64(float64(totalMs) * 0.30),
		PosX:        140,
		PosY:        -60,
		Scale:       1.35,
		RotationDeg: 1.5,
		Easing:      engine.EasingEaseInOutCubic,
	})

	// Keyframe 2: Quick snap pan to dialogue/action line
	eng.AddKeyframe(engine.Keyframe{
		TimestampMs: int64(float64(totalMs) * 0.60),
		PosX:        -160,
		PosY:        50,
		Scale:       1.55,
		RotationDeg: -2.0,
		Easing:      engine.EasingEaseOutExpo,
	})

	// Keyframe 3: Climax zoom with bounce
	eng.AddKeyframe(engine.Keyframe{
		TimestampMs: int64(float64(totalMs) * 0.85),
		PosX:        0,
		PosY:        0,
		Scale:       1.85,
		RotationDeg: 0.8,
		Easing:      engine.EasingEaseOutBounce,
	})

	// Keyframe 4: Final punch zoom
	eng.AddKeyframe(engine.Keyframe{
		TimestampMs: totalMs,
		PosX:        0,
		PosY:        0,
		Scale:       2.0,
		RotationDeg: 0.0,
		Easing:      engine.EasingLinear,
	})

	// Add dynamic camera shake
	eng.SetCameraShake(14.0, 16.0)

	// 3. Start Zero-Copy FFmpeg Streaming Pipe
	exportCfg := pipeline.ExportConfig{
		Width:       *width,
		Height:      *height,
		FPS:         *fps,
		BitrateKbps: 18000,
		Accel:       pipeline.HardwareAccel(*accel),
		OutputPath:  *outputPath,
	}

	pipe, err := pipeline.NewFFmpegPipe(exportCfg)
	if err != nil {
		log.Fatalf("Fatal: failed to spawn FFmpeg pipe: %v", err)
	}

	totalFrames := int(*durationSec * float64(*fps))
	frameBytes := eng.FrameSize()
	
	// Pre-allocate ONE single frame buffer in memory (Zero GC thrashing)
	frameBuffer := make([]byte, frameBytes)

	log.Printf("Starting frame streaming pipe (%d frames, %d MB RAM per frame)...", 
		totalFrames, frameBytes/(1024*1024))

	startTime := time.Now()

	for frameIdx := 0; frameIdx < totalFrames; frameIdx++ {
		timestampMs := int64(float64(frameIdx) * 1000.0 / float64(*fps))

		// Brief white flash transition at beat drop (t = 2.8s)
		if timestampMs >= 2750 && timestampMs <= 2900 {
			eng.SetFlash(0.85)
		} else {
			eng.SetFlash(0.0)
		}

		// Render C++ Skia frame into Go buffer
		if err := eng.RenderFrame(timestampMs, frameBuffer); err != nil {
			log.Fatalf("Error rendering frame %d at %dms: %v", frameIdx, timestampMs, err)
		}

		// Pipe directly into FFmpeg stdin
		if err := pipe.WriteRawFrame(frameBuffer); err != nil {
			log.Fatalf("Error writing frame %d to FFmpeg pipe: %v", frameIdx, err)
		}

		if (frameIdx+1)%30 == 0 || frameIdx == totalFrames-1 {
			elapsed := time.Since(startTime).Seconds()
			currentFps := float64(frameIdx+1) / elapsed
			pct := float64(frameIdx+1) * 100.0 / float64(totalFrames)
			fmt.Printf("\r>> Render Progress: [%3.0f%%] Frame %3d/%d (%.1f FPS)", 
				pct, frameIdx+1, totalFrames, currentFps)
			os.Stdout.Sync()
		}
	}

	fmt.Println()
	log.Println("Closing stdin pipe and finalizing MP4 container...")

	if err := pipe.Close(); err != nil {
		log.Fatalf("FFmpeg export failed: %v", err)
	}

	totalTime := time.Since(startTime)
	avgFPS := float64(totalFrames) / totalTime.Seconds()
	fileInfo, statErr := os.Stat(*outputPath)
	fileSizeMB := 0.0
	if statErr == nil {
		fileSizeMB = float64(fileInfo.Size()) / (1024.0 * 1024.0)
	}

	log.Printf("==================================================")
	log.Printf(" SUCCESS: 5-Second MMV Rendered Successfully!")
	log.Printf(" Output File: %s (%.2f MB)", *outputPath, fileSizeMB)
	log.Printf(" Total Time:  %.2fs", totalTime.Seconds())
	log.Printf(" Average FPS: %.1f FPS", avgFPS)
	log.Printf(" Zero temporary disk files were written during export.")
	log.Printf("==================================================")
}
