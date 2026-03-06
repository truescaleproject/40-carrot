
import React from 'react';
import { Map, FileDown, Swords, X, Keyboard } from 'lucide-react';
import { APP_VERSION } from '../constants';

interface WelcomeBannerProps {
  onDismiss: () => void;
  sidebarOpen?: boolean;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ onDismiss, sidebarOpen = false }) => {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center transition-[left] ease-in-out duration-500 pointer-events-none"
      style={{ left: sidebarOpen ? '320px' : '0px' }}
    >
      <div className="w-[90%] max-w-2xl animate-in fade-in slide-in-from-top-10 duration-500 pointer-events-auto">
      <div className="bg-grim-900/95 backdrop-blur-md border border-grim-gold/60 rounded-xl shadow-2xl overflow-hidden">
        <div className="bg-grim-800/50 p-4 border-b border-grim-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-grim-gold font-science tracking-widest uppercase">
              Welcome, Commander
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-mono text-grim-gold/60 bg-grim-gold/10 px-2 py-0.5 rounded-full border border-grim-gold/20">
                v{APP_VERSION}
              </span>
            </div>
          </div>
          <button onClick={onDismiss} className="text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-grim-800">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-slate-300 leading-relaxed">
            40 Carrot is your virtual tabletop for practicing sci-fi wargame scenarios.
            Get started in three steps:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StepCard
              icon={Map}
              iconColor="text-blue-400"
              step={1}
              title="Prepare Battlefield"
              desc="Open the Sidebar settings to load a preset map or configure custom dimensions."
            />
            <StepCard
              icon={FileDown}
              iconColor="text-green-400"
              step={2}
              title="Muster Armies"
              desc='Use the "Roster" tab below to load units via AI text, CSV, image scan, or manual builder.'
            />
            <StepCard
              icon={Swords}
              iconColor="text-red-400"
              step={3}
              title="Start Practice"
              desc="Deploy units, measure ranges, roll dice, and refine your tactical maneuvers."
            />
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-grim-800/40 rounded-lg border border-grim-700/50 text-[11px] text-slate-400">
            <Keyboard size={14} className="text-slate-500 shrink-0" />
            <span>Press <kbd className="bg-grim-700 px-1.5 py-0.5 rounded text-text-primary font-mono text-[10px] border border-grim-600">Space</kbd> to pan, <kbd className="bg-grim-700 px-1.5 py-0.5 rounded text-text-primary font-mono text-[10px] border border-grim-600">Scroll</kbd> to zoom. Open the Manual tab for all shortcuts.</span>
          </div>

          <button
            onClick={onDismiss}
            className="w-full bg-grim-gold hover:bg-yellow-400 text-grim-900 font-bold py-3 rounded-lg text-sm transition-all uppercase tracking-wider shadow-lg hover:shadow-grim-gold/20 active:scale-[0.98]"
          >
            Begin Session
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};

const StepCard = ({ icon: Icon, iconColor, step, title, desc }: { icon: any; iconColor: string; step: number; title: string; desc: string }) => (
  <div className="bg-grim-800/40 p-4 rounded-lg border border-grim-700/50 flex flex-col items-center text-center gap-2 hover:border-grim-600 hover:bg-grim-800/60 transition-all">
    <div className={`w-10 h-10 rounded-full bg-grim-700/50 flex items-center justify-center ${iconColor} mb-1`}>
      <Icon size={20} />
    </div>
    <h3 className="font-bold text-white text-sm">{step}. {title}</h3>
    <p className="text-[11px] text-slate-400 leading-relaxed">{desc}</p>
  </div>
);
