# KuroKage MMV Studio - Linux Build Makefile
CC ?= gcc
CXX ?= g++
GO ?= go

# Skia installation path (optional if using Skia prebuilts)
SKIA_DIR ?= /opt/skia

# CGo Compilation Flags
export CGO_ENABLED=1
export CXXFLAGS=-O3 -std=c++17 -Wall -Wextra -fPIC
export LDFLAGS=-lstdc++ -lm

.PHONY: all build run clean test-pipe

all: build

# Build mmv-cli binary
build:
	@echo "==> Building KuroKage MMV Native CLI (CGo + Skia Engine)..."
	cd cmd/mmv-cli && $(GO) build -v -o ../../bin/mmv-cli .
	@echo "==> Build complete: bin/mmv-cli"

# Render a sample 5-second 1080p 60fps MP4 video
run: build
	@echo "==> Running 5-second MMV render test straight to FFmpeg stdin pipe..."
	./bin/mmv-cli -w 1920 -h 1080 -fps 60 -dur 5.0 -out output_5s_mmv.mp4

# Test VA-API hardware acceleration (Intel/AMD)
run-vaapi: build
	./bin/mmv-cli -w 1920 -h 1080 -fps 60 -dur 5.0 -accel vaapi -out output_vaapi.mp4

# Test NVENC hardware acceleration (Nvidia)
run-nvenc: build
	./bin/mmv-cli -w 1920 -h 1080 -fps 60 -dur 5.0 -accel nvenc -out output_nvenc.mp4

clean:
	rm -rf bin/ output_*.mp4
