package engine

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

// Easing presets matching engine
type EasingType int

const (
	EasingLinear       EasingType = 0
	EasingEaseInQuad   EasingType = 1
	EasingEaseOutQuad  EasingType = 2
	EasingEaseInOutQuad EasingType = 3
	EasingEaseInCubic  EasingType = 4
	EasingEaseOutCubic EasingType = 5
	EasingEaseInOutCubic EasingType = 6
	EasingEaseInExpo   EasingType = 7
	EasingEaseOutExpo  EasingType = 8
	EasingEaseInOutExpo EasingType = 9
	EasingEaseOutBounce EasingType = 10
	EasingEaseInOutBounce EasingType = 11
)

// Keyframe kinematics definition
type Keyframe struct {
	TimestampMs int64
	PosX        float32
	PosY        float32
	Scale       float32
	RotationDeg float32
	Easing      EasingType
}

// Engine wraps the native C++ Skia rendering core
type Engine struct {
	handle C.MMVEngineHandle
	width  int
	height int
	fps    int
}

// NewEngine initializes the C++ Skia graphics engine
func NewEngine(width, height, fps int, useGPU bool) (*Engine, error) {
	if width <= 0 || height <= 0 || fps <= 0 {
		return nil, errors.New("invalid dimensions or fps")
	}

	gpuFlag := C.int(0)
	if useGPU {
		gpuFlag = C.int(1)
	}

	cfg := C.MMVConfig{
		width:   C.int(width),
		height:  C.int(height),
		fps:     C.int(fps),
		use_gpu: gpuFlag,
	}

	handle := C.MMV_Engine_Create(&cfg)
	if handle == nil {
		return nil, errors.New("failed to initialize C++ Skia Engine")
	}

	e := &Engine{
		handle: handle,
		width:  width,
		height: height,
		fps:    fps,
	}

	runtime.SetFinalizer(e, (*Engine).Close)
	return e, nil
}

// Close destroys native resources
func (e *Engine) Close() {
	if e.handle != nil {
		C.MMV_Engine_Destroy(e.handle)
		e.handle = nil
	}
}

// LoadImage loads a manga panel image file
func (e *Engine) LoadImage(filepath string) error {
	if e.handle == nil {
		return errors.New("engine closed")
	}
	cPath := C.CString(filepath)
	defer C.free(unsafe.Pointer(cPath))

	ret := C.MMV_Engine_LoadImage(e.handle, cPath)
	if ret == 0 {
		return errors.New("failed to load image file into Skia engine")
	}
	return nil
}

// AddKeyframe registers an animated camera position/zoom/rotation keyframe
func (e *Engine) AddKeyframe(kf Keyframe) error {
	if e.handle == nil {
		return errors.New("engine closed")
	}

	ckf := C.MMVKeyframe{
		timestamp_ms: C.int64_t(kf.TimestampMs),
		pos_x:        C.float(kf.PosX),
		pos_y:        C.float(kf.PosY),
		scale:        C.float(kf.Scale),
		rotation_deg: C.float(kf.RotationDeg),
		easing_type:  C.int(kf.Easing),
	}

	C.MMV_Engine_AddKeyframe(e.handle, &ckf)
	return nil
}

// ClearKeyframes clears all keyframes
func (e *Engine) ClearKeyframes() {
	if e.handle != nil {
		C.MMV_Engine_ClearKeyframes(e.handle)
	}
}

// SetCameraShake configures camera shake amplitude and frequency
func (e *Engine) SetCameraShake(amplitude, frequencyHz float32) {
	if e.handle != nil {
		C.MMV_Engine_SetCameraShake(e.handle, C.float(amplitude), C.float(frequencyHz))
	}
}

// SetFlash sets transition white-flash intensity (0.0 - 1.0)
func (e *Engine) SetFlash(intensity float32) {
	if e.handle != nil {
		C.MMV_Engine_SetFlash(e.handle, C.float(intensity))
	}
}

// RenderFrame renders a single video frame at timestampMs into outBuffer.
// outBuffer must be at least width * height * 4 bytes in size.
func (e *Engine) RenderFrame(timestampMs int64, outBuffer []byte) error {
	if e.handle == nil {
		return errors.New("engine closed")
	}
	expectedSize := e.width * e.height * 4
	if len(outBuffer) < expectedSize {
		return errors.New("destination buffer too small for frame")
	}

	ret := C.MMV_Engine_RenderFrame(
		e.handle,
		C.int64_t(timestampMs),
		(*C.uint8_t)(unsafe.Pointer(&outBuffer[0])),
	)

	if ret == 0 {
		return errors.New("render frame failed in native Skia engine")
	}
	return nil
}

// FrameSize returns the byte length of a single raw RGBA frame
func (e *Engine) FrameSize() int {
	return e.width * e.height * 4
}
