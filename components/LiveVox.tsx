
import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Radio, Zap, X } from 'lucide-react';
import { BoardElement, ViewportInfo } from '../types';
import { BOARD_OFFSET } from '../constants';

interface LiveVoxProps {
  elements: BoardElement[];
  viewport: ViewportInfo | null;
  onClose: () => void;
}

export const LiveVox: React.FC<LiveVoxProps> = ({ elements, viewport, onClose }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  
  const audioContextRes = useRef<AudioContext | null>(null);
  const nextStartTime = useRef(0);
  const sources = useRef(new Set<AudioBufferSourceNode>());
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Manual encode/decode as per guidelines
  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number) => {
    const dataInt16 = new Int16Array(data.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, sampleRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
    return buffer;
  };

  const createBlob = (data: Float32Array) => {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const stopLiveSession = () => {
    if (sessionRef.current) sessionRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setIsActive(false);
    setIsConnecting(false);
  };

  const startLiveSession = async () => {
    const { GoogleGenAI, Modality } = await import("@google/genai");

    try {
        const hasKey = await (window as any).aistudio?.hasSelectedApiKey?.();
        if (!hasKey) {
            const confirmed = confirm("Tactical Vox Link requires an external API key. Would you like to select one now?");
            if (confirmed && (window as any).aistudio?.openSelectKey) {
                await (window as any).aistudio.openSelectKey();
            } else {
                return;
            }
        }
    } catch (e) {
        console.warn("API Key Selection not supported in this environment.");
    }

    setIsConnecting(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const PPI = viewport?.pixelsPerInch || 25.4;
    const boardSummary = elements.map(e => {
        const xInches = Math.round((e.x - BOARD_OFFSET) / PPI);
        const yInches = Math.round((e.y - BOARD_OFFSET) / PPI);
        return `- ${e.label} (${e.type}): Pos(${xInches}", ${yInches}") Wounds: ${e.currentWounds}/${e.stats?.w || 1}`;
    }).join('\n');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRes.current = outputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: any) => {
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              setIsTalking(true);
              const ctx = audioContextRes.current!;
              nextStartTime.current = Math.max(nextStartTime.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), ctx, 24000);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => {
                sources.current.delete(source);
                if (sources.current.size === 0) setIsTalking(false);
              });
              source.start(nextStartTime.current);
              nextStartTime.current += buffer.duration;
              sources.current.add(source);
            }
            if (message.serverContent?.interrupted) {
              sources.current.forEach(s => s.stop());
              sources.current.clear();
              nextStartTime.current = 0;
              setIsTalking(false);
            }
          },
          onerror: (e: any) => {
            const msg = e.message || '';
            if (msg.includes("Requested entity was not found")) {
                alert("API Key error. Please re-select your key in Settings.");
            }
            console.error('Vox Error:', e);
            stopLiveSession();
          },
          onclose: () => stopLiveSession(),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } },
          systemInstruction: `You are a high-level Tactical Vox-Servitor. You provide audio intelligence. 
          Current Battlefield: ${boardSummary}. Be brief, grim-dark, and authoritative.`
        },
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error('Vox Init Failed:', err);
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    return () => stopLiveSession();
  }, []);

  return (
    <div className="absolute inset-0 bg-grim-900/95 z-50 flex flex-col items-center justify-center p-6 border-t border-green-900/50">
      <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
        <div className="h-full w-full bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
      </div>

      <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white p-2">
        <X size={24} />
      </button>

      <div className="relative flex flex-col items-center gap-8 w-full max-w-sm">
        <div className="text-center">
          <h2 className="text-green-500 font-mono text-xl tracking-tighter uppercase mb-1">Tactical Vox Link</h2>
          <div className="text-green-900 font-mono text-[10px] tracking-widest animate-pulse">
            {isActive ? 'CHANNEL ENCRYPTED // ACTIVE' : isConnecting ? 'SYNCHRONIZING...' : 'VOX OFFLINE'}
          </div>
        </div>

        <div className="w-full h-32 bg-black/40 border border-green-900/30 rounded flex items-center justify-center relative overflow-hidden">
          <div className="flex items-center gap-1">
            {[...Array(12)].map((_, i) => (
              <div 
                key={i} 
                className={`w-1.5 bg-green-500 transition-all duration-75 ${isActive ? (isTalking ? 'animate-bounce' : 'opacity-40 h-2') : 'h-1 opacity-10'}`} 
                style={{ 
                    height: isTalking ? `${Math.random() * 80 + 20}%` : undefined,
                    animationDelay: `${i * 0.05}s` 
                }} 
              />
            ))}
          </div>
          {isActive && (
             <div className="absolute bottom-2 right-2 flex items-center gap-2 text-[8px] font-mono text-green-500">
                <Radio size={8} className="animate-pulse" /> TX/RX ACTIVE
             </div>
          )}
        </div>

        <div className="flex flex-col gap-4 w-full">
          {!isActive ? (
            <button 
              onClick={startLiveSession}
              disabled={isConnecting}
              className="w-full bg-green-900/20 hover:bg-green-800/40 border border-green-500 text-green-400 font-mono py-4 rounded-lg flex items-center justify-center gap-3 transition-all active:scale-95"
            >
              {isConnecting ? <Zap size={20} className="animate-spin" /> : <Mic size={20} />}
              {isConnecting ? 'ESTABLISHING LINK...' : 'INITIALIZE VOX-LINK'}
            </button>
          ) : (
            <button 
              onClick={stopLiveSession}
              className="w-full bg-red-900/20 hover:bg-red-800/40 border border-red-500 text-red-400 font-mono py-4 rounded-lg flex items-center justify-center gap-3 transition-all active:scale-95"
            >
              <MicOff size={20} />
              TERMINATE LINK
            </button>
          )}
          
          <div className="text-[10px] font-mono text-slate-500 text-center uppercase tracking-tight leading-relaxed">
            Authorized for Command use only.<br/>
            Neural-link stability: 98.4%
          </div>
        </div>
      </div>
    </div>
  );
};
