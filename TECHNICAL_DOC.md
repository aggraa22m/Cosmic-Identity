# Technical Documentation: Multiverse Explorer

This document outlines the technical architecture and implementation details of the Cosmic Identity application.

## 1. System Architecture

The application is a single-page React application that interacts directly with the Google Gemini API client-side. It follows a modular structure:

- **State Management:** Handled via React `useState` and a central `AppState` enum to manage the complex generation lifecycle.
- **AI Services:** Centralized in `services/geminiService.ts`, abstracting the multi-modal calls (Image -> Text -> Audio).
- **Media Processing:** Uses browser-native APIs for real-time video synthesis and raw PCM audio decoding.

## 2. Gemini API Implementation

The app leverages three distinct Gemini models to create a cohesive multi-modal experience:

### A. Image-to-Image (`gemini-2.5-flash-image`)
- **Role:** Style transfer and facial feature adaptation.
- **Configuration:** Uses `imageConfig` with a `1:1` aspect ratio.
- **Prompting:** Combines the user's base64 image with a `universe.promptModifier` string to guide the aesthetic transformation.

### B. Logic & Reasoning (`gemini-3-flash-preview`)
- **Role:** Visual analysis and JSON generation.
- **Output:** Forced JSON schema to ensure predictable extraction of `name`, `gender`, `backstory`, and `stats`.
- **Logic:** The model analyzes the original selfie to determine gender, ensuring the subsequent TTS voice selection is contextually accurate.

### C. Text-to-Speech (`gemini-2.5-flash-preview-tts`)
- **Role:** Audio synthesis.
- **Format:** Receives raw 16-bit PCM data.
- **Voice Mapping:** Dynamically selects voices (e.g., `Zephyr`, `Kore`, `Puck`) based on the gender detected in step B and the universe theme.

## 3. Media Engineering

### Audio Handling
Gemini's TTS returns raw PCM bytes without a header. The app implements a custom `decodeAudioData` utility that:
1.  Converts Base64 to a `Uint8Array`.
2.  Maps `Int16` PCM data to `Float32` (-1.0 to 1.0) for the `AudioBuffer`.
3.  Uses `AudioContext` at a 24,000Hz sample rate for high-fidelity playback.

### Video Synthesis (MP4 Export)
The "Save Video" feature performs on-the-fly rendering:
1.  Draws the generated portrait to an `HTMLCanvasElement`.
2.  Captures a stream from the canvas using `captureStream()`.
3.  Creates a `MediaStreamDestination` from the `AudioContext` to capture the AI voice.
4.  Combines video and audio tracks into a `MediaRecorder` (WebM/VP9/Opus) and wraps it as an MP4 blob for the user.

## 4. State Machine

The app transitions through the following states:
1.  `IDLE`: Waiting for image upload and universe selection.
2.  `GENERATING_IMAGE`: Gemini is processing the image transformation.
3.  `COMPLETED`: All assets (Image, JSON, Audio) are ready and rendered.
4.  `ERROR`: Graceful handling of API failures or trans-dimensional instability.

## 5. Security & Environment
- **API Key:** The application assumes `process.env.API_KEY` is provided by the hosting environment.
- **Permissions:** `metadata.json` requests `camera` permissions for potential direct-capture expansion.
