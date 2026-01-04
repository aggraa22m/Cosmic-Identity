# Cosmic Identity: Multiverse Explorer

Cosmic Identity is an interactive web application that uses the Google Gemini API to transport users into alternate dimensions. By uploading a single selfie, users can see their "other self" in various artistic universes, read their unique backstory, and hear an AI-generated greeting in a voice that fits that reality.

## 🚀 Features

- **Trans-dimensional Transformation:** Transforms your selfie into specialized art styles (Cyberpunk, Ghibli, Renaissance, and more) using `gemini-2.5-flash-image`.
- **Identity Synthesis:** Generates a unique name, backstory, and RPG-style stats (Strength, Intelligence, Luck) based on your photo.
- **Vocal Manifestation:** Creates a custom voice greeting using Gemini's Text-to-Speech capabilities, tailored to the character's gender and universe.
- **Multiverse Export:** Download your alternate identity as a high-quality PNG or a synthesized MP4 video with the character's voice.
- **Seamless UX:** A sleek, glassmorphic UI built with React and Tailwind CSS, featuring smooth transitions and "space-time warping" loading states.

## 📖 How to Use

1.  **Prepare your Portrait:** Ensure you have a clear selfie or portrait photo where your face is visible.
2.  **Upload:** Click the "Click to upload a selfie" area and select your image.
3.  **Choose your Destination:** Browse the available universes (like Cyberpunk, Viking, or Ghibli) and select the one you want to explore.
4.  **Enter the Multiverse:** Click the large "Enter the Multiverse" button. Wait a few moments as the AI consultations the shards of reality.
5.  **Explore your Identity:**
    *   **Listen:** Click "Hear Voice Greeting" to hear your character speak.
    *   **Analyze:** Check your generated stats and backstory.
    *   **Export:** Use "Save Video (MP4)" to create a video of your character or "PNG" to save just the portrait.
6.  **Warp Again:** Click "Start Over" in the top header to try a different universe or a new photo.

## 🛠️ Tech Stack

- **Frontend:** React (Hooks, Refs), Tailwind CSS.
- **AI Core:** Google Gemini API (`@google/genai`).
- **Media Processing:** Web Audio API (PCM decoding), Canvas API, MediaRecorder API.
- **Icons:** FontAwesome.

## 🏁 Getting Started

1.  Ensure you have an environment variable `API_KEY` configured with your Google Gemini API key.
2.  Open `index.html` in a modern web browser that supports ES modules and the Web Audio API.
3.  Upload a clear selfie and select your destination universe.
4.  Warp into the multiverse!

## 📜 Universes Available

- **Cyberpunk 2077:** High-tech, low-life neon future.
- **Studio Ghibli:** Soft, nostalgic hand-painted anime.
- **Viking Saga:** Rugged warriors and misty fjords.
- **Vaporwave Dreams:** Retro-futuristic digital sunsets.
- ...and many more!
