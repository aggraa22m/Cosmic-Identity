
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Universe } from "../types";

const API_KEY = process.env.API_KEY || '';

// Base64 decode helper
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Raw PCM to AudioBuffer
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const generateMultiverseIdentity = async (
  base64Image: string,
  universe: Universe,
  onProgress: (step: string) => void
) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const imageBase64Data = base64Image.split(',')[1];

  // 1. Generate Transformed Image
  onProgress('Consulting the Multiverse shards...');
  const imageResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: imageBase64Data,
            mimeType: 'image/jpeg',
          },
        },
        {
          text: `Transform the person in this photo into a character ${universe.promptModifier}. Maintain their facial features but adapt them completely to the new universe's aesthetic. High quality, detailed.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  });

  let generatedImageUrl = '';
  for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      generatedImageUrl = `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  if (!generatedImageUrl) throw new Error("Failed to generate image");

  // 2. Generate Story & Detect Gender
  onProgress('Scanning biological signatures...');
  const textResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            data: imageBase64Data,
            mimeType: 'image/jpeg',
          },
        },
        {
          text: `Analyze the person in this image and determine their gender (male or female). 
          Based on that, create a multiverse profile for them in the ${universe.name} universe. 
          The profile should include a gender-appropriate name, a short witty 2-sentence backstory, and three stats (strength, intelligence, luck) from 1-100, and a "Dimension ID". 
          Output as JSON.`,
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          gender: { type: Type.STRING, enum: ['male', 'female'] },
          backstory: { type: Type.STRING },
          stats: {
            type: Type.OBJECT,
            properties: {
              strength: { type: Type.NUMBER },
              intelligence: { type: Type.NUMBER },
              luck: { type: Type.NUMBER },
              dimension: { type: Type.STRING }
            }
          }
        },
        required: ["name", "gender", "backstory", "stats"]
      }
    }
  });

  const identity = JSON.parse(textResponse.text || '{}');
  const selectedVoice = identity.gender === 'female' ? universe.femaleVoice : universe.maleVoice;

  // 3. Generate Audio Greeting
  onProgress('Tuning the trans-dimensional frequencies...');
  const audioResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say in a voice fitting for ${universe.name}: "Greetings, Explorer. In this dimension, my name is ${identity.name}. ${identity.backstory}"` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: selectedVoice },
        },
      },
    },
  });

  const base64Audio = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  
  return {
    imageUrl: generatedImageUrl,
    ...identity,
    base64Audio
  };
};

export interface PlayingAudio {
  source: AudioBufferSourceNode;
  context: AudioContext;
}

export const playGeneratedAudio = async (base64Audio: string): Promise<PlayingAudio> => {
  const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  const audioBuffer = await decodeAudioData(
    decode(base64Audio),
    outputAudioContext,
    24000,
    1,
  );
  const source = outputAudioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(outputAudioContext.destination);
  source.start();
  return { source, context: outputAudioContext };
};

export const getAudioBuffer = async (base64Audio: string): Promise<AudioBuffer> => {
  const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  return await decodeAudioData(
    decode(base64Audio),
    outputAudioContext,
    24000,
    1,
  );
};
