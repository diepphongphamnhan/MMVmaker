#ifndef MMV_SKIA_ENGINE_H
#define MMV_SKIA_ENGINE_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

// Opaque handle for the C++ Skia Engine instance
typedef void* MMVEngineHandle;

// Keyframe structure passed across C-ABI
typedef struct {
    int64_t timestamp_ms; // Millisecond timestamp
    float pos_x;          // Target Center X (normalized or absolute px)
    float pos_y;          // Target Center Y
    float scale;          // Zoom factor (1.0 = fit)
    float rotation_deg;   // Rotation in degrees
    int easing_type;      // Easing function index (0=Linear, 1=InQuad, 2=OutQuad, etc.)
} MMVKeyframe;

// Engine Configuration
typedef struct {
    int width;
    int height;
    int fps;
    int use_gpu;          // 0 = CPU Skia raster surface, 1 = OpenGL/Vulkan accelerated surface
} MMVConfig;

/**
 * Creates an MMV Skia Engine instance.
 * Returns NULL on initialization failure.
 */
MMVEngineHandle MMV_Engine_Create(const MMVConfig* config);

/**
 * Destroys the engine instance and frees associated Skia surfaces and textures.
 */
void MMV_Engine_Destroy(MMVEngineHandle handle);

/**
 * Loads a manga panel image file (.png, .jpg, .webp).
 * Returns 1 on success, 0 on failure.
 */
int MMV_Engine_LoadImage(MMVEngineHandle handle, const char* filepath);

/**
 * Adds a kinematic keyframe for camera transformation.
 */
void MMV_Engine_AddKeyframe(MMVEngineHandle handle, const MMVKeyframe* keyframe);

/**
 * Clears all keyframes.
 */
void MMV_Engine_ClearKeyframes(MMVEngineHandle handle);

/**
 * Configures camera shake FX.
 */
void MMV_Engine_SetCameraShake(MMVEngineHandle handle, float amplitude, float frequency_hz);

/**
 * Configures flash transition (flash_white: 0.0 to 1.0).
 */
void MMV_Engine_SetFlash(MMVEngineHandle handle, float flash_intensity);

/**
 * Renders a frame at the specified millisecond timestamp directly into the destination buffer.
 * The destination buffer MUST be at least (width * height * 4) bytes in size.
 * Output format is RGBA 8-bit unorm (ready for rawvideo pipe into FFmpeg).
 * 
 * Returns 1 on success, 0 on error.
 */
int MMV_Engine_RenderFrame(MMVEngineHandle handle, int64_t timestamp_ms, uint8_t* out_rgba_buffer);

/**
 * Returns the width and height of the currently loaded manga panel image.
 */
void MMV_Engine_GetImageDimensions(MMVEngineHandle handle, int* out_width, int* out_height);

#ifdef __cplusplus
}
#endif

#endif // MMV_SKIA_ENGINE_H
