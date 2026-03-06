
import React, { useState, useRef, useEffect } from 'react';
import { generateTacticalAdvice } from '../services/geminiService';
import { BoardElement, ChatMessage, AiDeploymentItem, ViewportInfo, AppSettings } from '../types';
import { Send, Cpu, Loader2, ExternalLink, Mic, BrainCircuit, ShieldCheck, AlertCircle } from 'lucide-react';
import { LiveVox } from './LiveVox';

interface TacticalAdvisorProps {
  elements: BoardElement[];
  boardWidth: number;
  boardHeight: number;
  onDeploy: (items: AiDeploymentItem[]) => void;
  isOpen: boolean;
  onToggle: () => void;
  getViewport: () => ViewportInfo | null;
  appSettings: AppSettings;
  onUpdateSetting: (key: keyof AppSettings, value: any) => void;
}

interface ExtendedChatMessage extends ChatMessage {
    sources?: {title: string, uri: string}[];
}

export const TacticalAdvisor: React.FC<TacticalAdvisorProps> = ({ 
  elements, onDeploy, isOpen, getViewport, appSettings, onUpdateSetting 
}) => {
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([
    { role: 'model', text: 'Tactical Advisor active. Systems online. I can access rules and datasheets. Awaiting query.', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveVoxOpen, setIsLiveVoxOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
        isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ExtendedChatMessage = { role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const viewport = getViewport();
    try {
        const result = await generateTacticalAdvice(input, elements, viewport);
        
        if (!isMounted.current) return;

        if (result.deploymentItems && result.deploymentItems.length > 0) {
            onDeploy(result.deploymentItems);
        }
        
        setMessages(prev => [...prev, { 
            role: 'model', 
            text: result.text, 
            timestamp: Date.now(),
            sources: result.sources
        }]);
    } catch (e) {
        if (!isMounted.current) return;
    } finally {
        if (isMounted.current) setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Activation screen if AI is not enabled
  if (!appSettings.aiFeaturesEnabled) {
    return (
        <div className="w-full h-full flex flex-col bg-grim-900/90 relative overflow-hidden animate-in fade-in duration-300 p-6 items-center justify-center text-center">
            <div className="absolute top-0 left-0 w-full h-1 bg-grim-gold/20" />
            <div className="mb-6 p-4 bg-grim-800 rounded-full border border-grim-700 shadow-xl">
                <BrainCircuit size={48} className="text-grim-gold" />
            </div>
            
            <h3 className="text-lg font-bold text-white uppercase tracking-widest mb-2 font-science">Vox-Servitor Offline</h3>
            <p className="text-xs text-text-secondary max-w-xs mb-8 leading-relaxed">
                External tactical processing requires an active uplink to Google Gemini API. Your queries and board data will be sent to external servers.
            </p>

            <div className="space-y-4 w-full max-w-xs">
                <button 
                    onClick={() => onUpdateSetting('aiFeaturesEnabled', true)}
                    className="w-full bg-grim-gold hover:bg-yellow-400 text-grim-900 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                >
                    <ShieldCheck size={18} />
                    INITIALIZE UPLINK
                </button>
                <div className="flex items-start gap-2 text-[10px] text-slate-500 text-left bg-grim-800/50 p-3 rounded border border-grim-700">
                    <AlertCircle size={14} className="shrink-0 mt-0.5 text-blue-400"/>
                    <p>By initializing, you agree to send query data to AI services. You can also configure a custom API key in Settings.</p>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-grim-900/50 relative overflow-hidden">
      {isLiveVoxOpen && (
        <LiveVox 
            elements={elements} 
            viewport={getViewport()} 
            onClose={() => setIsLiveVoxOpen(false)} 
        />
      )}

      <div className="bg-grim-800 p-3 flex justify-between items-center border-b border-grim-700">
        <h3 className="font-bold text-grim-gold flex items-center gap-2 text-sm uppercase tracking-wider">
          <Cpu size={16} /> Tactical Advisor
        </h3>
        <button 
          onClick={() => setIsLiveVoxOpen(true)}
          className="flex items-center gap-1.5 px-2 py-1 bg-green-900/30 hover:bg-green-800/40 border border-green-800 rounded text-[10px] font-bold text-green-400 transition-colors group"
        >
          <Mic size={12} className="group-hover:animate-pulse" /> 
          VOX LINK
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div 
              className={`max-w-[85%] rounded-lg p-3 text-sm select-text ${
                msg.role === 'user' 
                  ? 'bg-grim-700 text-white border border-grim-600' 
                  : 'bg-green-900/30 text-green-100 border border-green-800/50 font-mono'
              }`}
            >
              {msg.text}
            </div>
            {msg.sources && msg.sources.length > 0 && (
                <div className="mt-1 ml-1 max-w-[85%] flex flex-wrap gap-1">
                    {msg.sources.map((src, i) => (
                        <a 
                            key={i} 
                            href={src.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[9px] bg-grim-800 text-blue-300 border border-grim-600 rounded px-1.5 py-0.5 hover:bg-grim-700 hover:text-white transition-colors"
                        >
                            <ExternalLink size={8}/> {src.title.substring(0, 15)}...
                        </a>
                    ))}
                </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-grim-800 p-3 rounded-lg flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-grim-gold" />
              <span className="text-xs text-slate-400">Querying database...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-grim-800 border-t border-grim-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask for advice or rules..."
            className="flex-1 bg-grim-900 border border-grim-600 rounded px-4 py-2.5 text-sm text-white focus:outline-none focus:border-grim-gold placeholder-slate-600 select-text"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading}
            className="bg-grim-gold text-grim-900 px-4 py-2.5 rounded hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
