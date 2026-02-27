import { GoogleGenAI } from "@google/genai";

export const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  return new GoogleGenAI({ apiKey });
};

export const ASPECT_RATIOS = ["1:1", "3:4", "4:3", "9:16", "16:9", "1:4", "1:8", "4:1", "8:1"] as const;
export const IMAGE_SIZES = ["512px", "1K", "2K", "4K"] as const;

export type AspectRatio = typeof ASPECT_RATIOS[number];
export type ImageSize = typeof IMAGE_SIZES[number];

export interface GenerationConfig {
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  useGoogleSearch: boolean;
  useImageSearch: boolean;
}
