
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Universe } from "../types";

/**
 * Helper to decode base64 strings into Uint8Arrays for PCM processing.
 */
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes raw PCM data returned by Gemini TTS into an AudioBuffer.
 * Note: Gemini TTS returns raw 16-bit PCM at 24kHz.
 */
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
  // Always instantiate GoogleGenAI within the call to ensure the latest API key is used
  const apiKey = process.env.API_KEY || '';
  const ai = new GoogleGenAI({ apiKey });
  const imageBase64Data = base64Image.split(',')[1];

  // 1. Generate Transformed Image using Gemini 2.5 Flash Image
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
          text: `Transform the person in this photo into a character ${universe.promptModifier}. Maintain their facial features but adapt them completely to the new universe's aesthetic. High quality, detailed portrait.`,
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
  // Safely iterate through candidates and parts
  const firstCandidate = imageResponse.candidates?.[0];
  if (firstCandidate?.content?.parts) {
    for (const part of firstCandidate.content.parts) {
      if (part.inlineData?.data) {
        generatedImageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }
  }

  if (!generatedImageUrl) throw new Error("The portal failed to manifest your image. Try a different universe.");

  // 2. Generate Story & Detect Gender using Gemini 3 Flash
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
          The profile should include a gender-appropriate name, a short witty 2-sentence backstory, and three stats (strength, intelligence, luck) from 1-100, and a unique "Dimension ID". 
          Output exclusively as valid JSON.`,
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

  // Extract text content using the .text property safely
  const identity = JSON.parse(textResponse.text || '{}');
  const selectedVoice = identity.gender === 'female' ? universe.femaleVoice : universe.maleVoice;

  // 3. Generate Audio Greeting using Gemini 2.5 Flash TTS
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
