package pipeline

import (
	"fmt"
	"io"
	"os/exec"
)

// HardwareAccel options
type HardwareAccel string

const (
	AccelCPU   HardwareAccel = "cpu"   // libx264
	AccelVAAPI HardwareAccel = "vaapi" // Linux Intel/AMD Mesa VA-API (/dev/dri/renderD128)
	AccelNVENC HardwareAccel = "nvenc" // Nvidia GPU NVENC
)

// ExportConfig encapsulates video export parameters
type ExportConfig struct {
	Width       int
	Height      int
	FPS         int
	BitrateKbps int
	Accel       HardwareAccel
	OutputPath  string
	AudioPath   string // Optional audio file to multiplex
}

// FFmpegPipe encapsulates an active streaming pipe to FFmpeg
type FFmpegPipe struct {
	cmd    *exec.Cmd
	stdin  io.WriteCloser
	config ExportConfig
}

// NewFFmpegPipe launches the FFmpeg process configured for rawvideo stdin
func NewFFmpegPipe(cfg ExportConfig) (*FFmpegPipe, error) {
	args := []string{
		"-y", // overwrite output
		"-f", "rawvideo",
		"-vcodec", "rawvideo",
		"-s", fmt.Sprintf("%dx%d", cfg.Width, cfg.Height),
		"-pix_fmt", "rgba",
		"-r", fmt.Sprintf("%d", cfg.FPS),
		"-i", "-", // Read from stdin pipe
	}

	// Audio inclusion if provided
	if cfg.AudioPath != "" {
		args = append(args, "-i", cfg.AudioPath, "-c:a", "aac", "-b:a", "320k")
	}

	// Codec & Hardware Acceleration selection
	switch cfg.Accel {
	case AccelVAAPI:
		args = append(args,
			"-vaapi_device", "/dev/dri/renderD128",
			"-vf", "format=nv12,hwupload",
			"-c:v", "h264_vaapi",
			"-qp", "20",
		)
	case AccelNVENC:
		args = append(args,
			"-c:v", "h264_nvenc",
			"-preset", "p5",
			"-pix_fmt", "yuv420p",
			"-b:v", fmt.Sprintf("%dk", cfg.BitrateKbps),
		)
	case AccelCPU:
		fallthrough
	default:
		args = append(args,
			"-c:v", "libx264",
			"-preset", "faster",
			"-crf", "18",
			"-pix_fmt", "yuv420p",
		)
	}

	args = append(args, cfg.OutputPath)

	cmd := exec.Command("ffmpeg", args...)
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to open stdin pipe for ffmpeg: %w", err)
	}

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("failed to start ffmpeg command (%v): %w", args, err)
	}

	return &FFmpegPipe{
		cmd:    cmd,
		stdin:  stdin,
		config: cfg,
	}, nil
}

// WriteRawFrame writes a raw RGBA pixel buffer directly to the FFmpeg stdin pipe
func (p *FFmpegPipe) WriteRawFrame(rgbaBuffer []byte) error {
	_, err := p.stdin.Write(rgbaBuffer)
	return err
}

// Close finishes writing to stdin and waits for FFmpeg encoding to complete
func (p *FFmpegPipe) Close() error {
	if p.stdin != nil {
		_ = p.stdin.Close()
	}
	if p.cmd != nil {
		return p.cmd.Wait()
	}
	return nil
}
