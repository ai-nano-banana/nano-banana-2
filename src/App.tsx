/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Image as ImageIcon, 
  Settings, 
  Download, 
  Search, 
  Upload, 
  X, 
  Loader2, 
  Sparkles,
  Layers,
  Maximize2,
  Key
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

// Types
type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9" | "1:4" | "1:8" | "4:1" | "8:1";
type ImageSize = "512px" | "1K" | "2K" | "4K";

interface Config {
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  useGoogleSearch: boolean;
  useImageSearch: boolean;
}

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceImageMime, setReferenceImageMime] = useState<string | null>(null);
  const [config, setConfig] = useState<Config>({
    aspectRatio: "1:1",
    imageSize: "1K",
    useGoogleSearch: false,
    useImageSearch: false,
  });
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    if (window.aistudio?.hasSelectedApiKey) {
      const has = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(has);
    } else {
      // Fallback for environments where the helper might not be present yet
      setHasApiKey(true); 
    }
  };

  const handleOpenKeySelector = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setReferenceImage(event.target?.result as string);
        setReferenceImageMime(file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearReferenceImage = () => {
    setReferenceImage(null);
    setReferenceImageMime(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const generateImage = async () => {
    if (!prompt.trim() && !referenceImage) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const parts: any[] = [];
      
      if (referenceImage) {
        parts.push({
          inlineData: {
            data: referenceImage.split(',')[1],
            mimeType: referenceImageMime || 'image/png'
          }
        });
      }
      
      if (prompt.trim()) {
        parts.push({ text: prompt });
      } else if (referenceImage) {
        parts.push({ text: "Enhance this image or describe what to do with it." });
      }

      const tools = [];
      if (config.useGoogleSearch) {
        tools.push({
          googleSearch: {
            searchTypes: {
              webSearch: {},
              imageSearch: config.useImageSearch ? {} : undefined,
            }
          }
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image-preview",
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: config.aspectRatio,
            imageSize: config.imageSize,
          },
          tools: tools.length > 0 ? tools : undefined,
        }
      });

      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setGeneratedImage(`data:image/png;base64,${part.inlineData.data}`);
          foundImage = true;
          break;
        }
      }

      if (!foundImage) {
        setError("No image was generated. The model might have returned text instead.");
        console.log("Model response text:", response.text);
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      if (err.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
        setError("API Key error. Please re-select your API key.");
      } else {
        setError(err.message || "An error occurred during generation.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `nano-banana-${Date.now()}.png`;
    link.click();
  };

  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-8">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full blur opacity-25"></div>
            <div className="relative bg-black p-6 rounded-3xl border border-white/10">
              <Sparkles className="w-12 h-12 text-orange-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold tracking-tighter mb-2">Nano Banana 2</h1>
              <p className="text-white/60 text-sm mb-8">
                To use the high-quality Gemini 3.1 Flash Image model, you need to connect your Google Cloud API key.
              </p>
              <button
                onClick={handleOpenKeySelector}
                className="w-full py-4 bg-white text-black rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-orange-500 hover:text-white transition-all active:scale-95"
              >
                <Key className="w-5 h-5" />
                Connect API Key
              </button>
              <p className="mt-4 text-xs text-white/40">
                Requires a paid Google Cloud project. <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline">Learn more</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-orange-500/30">
      {/* Header */}
      <header className="h-16 border-bottom border-white/5 flex items-center justify-between px-6 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <h1 className="font-bold tracking-tight text-lg">Nano Banana <span className="text-orange-500">2</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
          {generatedImage && (
            <button 
              onClick={downloadImage}
              className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/60 hover:text-white"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
          <button className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/60 hover:text-white">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex flex-col lg:flex-row h-[calc(100vh-64px)]">
        {/* Left Sidebar - Controls */}
        <aside className="w-full lg:w-80 border-r border-white/5 p-6 overflow-y-auto bg-black/20">
          <div className="space-y-8">
            {/* Aspect Ratio */}
            <section>
              <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-4 block">Aspect Ratio</label>
              <div className="grid grid-cols-3 gap-2">
                {(["1:1", "3:4", "4:3", "9:16", "16:9", "1:4", "1:8", "4:1", "8:1"] as AspectRatio[]).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setConfig(prev => ({ ...prev, aspectRatio: ratio }))}
                    className={cn(
                      "py-2 text-xs rounded-lg border transition-all",
                      config.aspectRatio === ratio 
                        ? "bg-white text-black border-white" 
                        : "bg-white/5 border-white/10 text-white/60 hover:border-white/30"
                    )}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </section>

            {/* Image Size */}
            <section>
              <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-4 block">Resolution</label>
              <div className="grid grid-cols-2 gap-2">
                {(["512px", "1K", "2K", "4K"] as ImageSize[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => setConfig(prev => ({ ...prev, imageSize: size }))}
                    className={cn(
                      "py-2 text-xs rounded-lg border transition-all",
                      config.imageSize === size 
                        ? "bg-white text-black border-white" 
                        : "bg-white/5 border-white/10 text-white/60 hover:border-white/30"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </section>

            {/* Tools */}
            <section className="space-y-4">
              <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 block">Grounding Tools</label>
              
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <Search className="w-4 h-4 text-white/60" />
                  <span className="text-sm">Google Search</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={config.useGoogleSearch}
                  onChange={(e) => setConfig(prev => ({ ...prev, useGoogleSearch: e.target.checked }))}
                  className="w-4 h-4 accent-orange-500"
                />
              </div>

              {config.useGoogleSearch && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 ml-4">
                  <div className="flex items-center gap-3">
                    <ImageIcon className="w-4 h-4 text-white/60" />
                    <span className="text-sm">Image Search</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={config.useImageSearch}
                    onChange={(e) => setConfig(prev => ({ ...prev, useImageSearch: e.target.checked }))}
                    className="w-4 h-4 accent-orange-500"
                  />
                </div>
              )}
            </section>

            {/* Reference Image */}
            <section>
              <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-4 block">Reference Image</label>
              {referenceImage ? (
                <div className="relative group aspect-square rounded-2xl overflow-hidden border border-white/10">
                  <img src={referenceImage} alt="Reference" className="w-full h-full object-cover" />
                  <button 
                    onClick={clearReferenceImage}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-[10px] text-white/60 truncate">Reference active</p>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-square rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 text-white/40 hover:text-white hover:border-white/30 transition-all bg-white/5"
                >
                  <Upload className="w-6 h-6" />
                  <span className="text-xs font-medium">Upload Image</span>
                </button>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                className="hidden" 
                accept="image/*" 
              />
            </section>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative bg-[#050505]">
          {/* Canvas/Preview Area */}
          <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-24 h-24 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                  <Sparkles className="w-8 h-8 text-orange-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <p className="text-sm font-medium text-white/60 animate-pulse">Generating masterpiece...</p>
              </div>
            ) : generatedImage ? (
              <div className="relative max-w-full max-h-full group">
                <img 
                  src={generatedImage} 
                  alt="Generated" 
                  className="max-w-full max-h-[70vh] rounded-2xl shadow-2xl shadow-orange-500/10 border border-white/10"
                />
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={downloadImage}
                    className="p-2 bg-black/60 backdrop-blur-md rounded-xl hover:bg-orange-500 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button className="p-2 bg-black/60 backdrop-blur-md rounded-xl hover:bg-white/20 transition-colors">
                    <Maximize2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4 opacity-20">
                <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
                  <ImageIcon className="w-12 h-12" />
                </div>
                <p className="text-sm font-medium">Your creation will appear here</p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full text-red-500 text-xs flex items-center gap-2 backdrop-blur-md">
              <X className="w-3 h-3" />
              {error}
            </div>
          )}

          {/* Prompt Input Area */}
          <div className="p-6 bg-gradient-to-t from-black to-transparent">
            <div className="max-w-4xl mx-auto relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 rounded-3xl blur opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
              <div className="relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 flex items-end gap-2 focus-within:border-orange-500/50 transition-all">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={referenceImage ? "Describe how to edit this image..." : "Describe the image you want to create..."}
                  className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-3 px-4 text-sm min-h-[56px] max-h-32"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      generateImage();
                    }
                  }}
                />
                <button
                  onClick={generateImage}
                  disabled={isGenerating || (!prompt.trim() && !referenceImage)}
                  className={cn(
                    "p-3 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100",
                    isGenerating ? "bg-white/10" : "bg-orange-500 hover:bg-orange-600 text-black"
                  )}
                >
                  {isGenerating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            <p className="text-center mt-4 text-[10px] text-white/20 uppercase tracking-widest font-bold">
              Powered by Gemini 3.1 Flash Image
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
