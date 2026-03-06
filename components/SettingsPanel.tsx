
import React, { useState } from 'react';
import { Settings as SettingsIcon, Check, ChevronDown, ChevronUp, Archive, Download, Upload, Eye, Gamepad2, BrainCircuit, Key, ShieldCheck, AlertCircle, MessageCircle, ExternalLink } from 'lucide-react';
import { AppSettings, AppSetting } from '../types';
import { themes } from '../styles/themes';
import { APP_VERSION } from '../constants';
import { runBoardUtilsTests, TestResult } from '../utils/boardUtils.test';

interface SettingsPanelProps {
    isOpen: boolean;
    onToggle: () => void;
    settings: AppSettings;
    onUpdateSetting: (key: keyof AppSettings, value: any) => void;
    onBackupData: () => void;
    onRestoreData: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const visualSettings: AppSetting[] = [
    {
        id: 'theme',
        label: 'UI Theme',
        description: 'Changes the visual style of the tactical interface.',
        type: 'select',
    },
    {
        id: 'labelFontSize',
        label: 'Label Font Size',
        description: 'Controls the size of text labels on the board.',
        type: 'slider',
        min: 6,
        max: 32,
        step: 1,
    },
    {
        id: 'showQuickMenu',
        label: 'Quick Creation Menu',
        description: 'Show a floating menu for adding units/terrain when the sidebar is closed.',
        type: 'toggle',
    }
];

const gameplaySettings: AppSetting[] = [
    {
        id: 'showCoherencyAlerts',
        label: 'Squad Coherency Alerts',
        description: 'Toggle visual warnings for models that break unit coherency rules.',
        type: 'toggle',
    }
];

const aiSettings: AppSetting[] = [
    {
        id: 'aiFeaturesEnabled',
        label: 'Enable Tactical Intelligence',
        description: 'Enables AI features like Advisor chat, audio transcription, and roster parsing.',
        type: 'toggle'
    }
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, settings, onUpdateSetting, onBackupData, onRestoreData }) => {
    const [isThemesOpen, setIsThemesOpen] = useState(false);
    const [isAiConfigOpen, setIsAiConfigOpen] = useState(true);
    const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
    const [testResults, setTestResults] = useState<{ summary: string, results: TestResult[] } | null>(null);

    const handleSelectKey = async () => {
        try {
            if ((window as any).aistudio?.openSelectKey) {
                await (window as any).aistudio.openSelectKey();
            } else {
                alert("API Key selection is only available within the AI Studio environment.");
            }
        } catch (e) {
            console.error("Failed to open key selection:", e);
        }
    };

    const runDiagnostics = () => {
        const results = runBoardUtilsTests();
        setTestResults(results);
    };

    if (!isOpen) return null;

    const renderSettingControl = (setting: AppSetting) => {
        if (setting.id === 'theme') {
            return (
                <div className="flex flex-col gap-2 pt-2 pb-1">
                    {Object.entries(themes).map(([key, theme]) => {
                        const isSelected = settings.theme === key;
                        return (
                            <button
                                key={key}
                                onClick={() => onUpdateSetting('theme', key)}
                                className={`
                                    group flex items-center gap-3 p-2 rounded-lg border-2 transition-all duration-200 text-left relative overflow-hidden
                                    ${isSelected
                                        ? 'border-grim-gold bg-grim-800 shadow-[0_0_10px_rgba(0,0,0,0.2)]'
                                        : 'border-grim-800 hover:border-grim-600 bg-grim-900/30'
                                    }
                                `}
                            >
                                <div
                                    className="w-12 h-12 rounded border shrink-0 relative overflow-hidden shadow-sm"
                                    style={{
                                        backgroundColor: theme.colors.grim[900],
                                        borderColor: theme.colors.grim[700]
                                    }}
                                >
                                    <div className="absolute top-0 left-0 right-0 h-3 w-full flex items-center px-1 gap-0.5" style={{ backgroundColor: theme.colors.grim[800] }}>
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.colors.grim.gold }} />
                                    </div>
                                    <div className="absolute top-3 bottom-0 left-0 right-0 p-1 flex flex-col gap-1">
                                        <div className="h-1 w-2/3 rounded-sm opacity-50" style={{ backgroundColor: theme.colors.text.muted }} />
                                        <div className="h-1 w-1/2 rounded-sm opacity-50" style={{ backgroundColor: theme.colors.text.muted }} />
                                        <div className="mt-auto h-1.5 w-full rounded-sm" style={{ backgroundColor: theme.colors.grim.accent }} />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <span className={`text-xs font-bold truncate ${isSelected ? 'text-grim-gold' : 'text-text-primary'}`}>
                                        {theme.name}
                                    </span>
                                    <span className="text-[10px] text-text-muted truncate">
                                        {theme.description}
                                    </span>
                                </div>
                                {isSelected && (
                                    <div className="text-grim-gold">
                                        <Check size={16} strokeWidth={3} />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            );
        }

        switch (setting.type) {
            case 'toggle':
                const isChecked = !!settings[setting.id];
                return (
                    <button
                        onClick={() => onUpdateSetting(setting.id, !isChecked)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${isChecked ? 'bg-grim-gold' : 'bg-grim-700'}`}
                        aria-checked={isChecked}
                        role="switch"
                    >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isChecked ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                );
            case 'slider':
                return (
                    <div className="flex items-center gap-2">
                        <input
                            type="range"
                            min={setting.min}
                            max={setting.max}
                            step={setting.step}
                            value={settings[setting.id] as number}
                            onChange={(e) => onUpdateSetting(setting.id, Number(e.target.value))}
                            className="flex-1 h-1.5 bg-grim-700 rounded-lg appearance-none cursor-pointer"
                            aria-label={setting.label}
                        />
                        <span className="text-xs font-mono bg-grim-800 px-2 py-0.5 rounded w-12 text-center text-text-primary">{settings[setting.id]}px</span>
                    </div>
                );
            case 'select':
                 return (
                    <select
                        value={settings[setting.id] as unknown as string}
                        onChange={(e) => onUpdateSetting(setting.id, e.target.value)}
                        className="w-full bg-grim-800 border border-grim-700 rounded p-2 text-sm text-text-primary focus:border-grim-gold outline-none"
                    >
                        {setting.options?.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                );
            default:
                return null;
        }
    };

    const renderSettingItem = (setting: AppSetting) => (
        <div key={setting.id} className="border-b border-grim-800 pb-4 last:border-b-0 last:pb-0">
            {setting.id === 'theme' ? (
                <div>
                    <button
                        onClick={() => setIsThemesOpen(!isThemesOpen)}
                        className="w-full flex justify-between items-start text-left group"
                    >
                        <div>
                            <label className="text-sm font-bold text-text-primary block mb-1 group-hover:text-grim-gold transition-colors cursor-pointer">
                                {setting.label}
                            </label>
                            <p className="text-xs text-text-muted">{setting.description}</p>
                        </div>
                        <div className="text-text-muted pt-1">
                            {isThemesOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                        </div>
                    </button>
                    {isThemesOpen && (
                        <div className="mt-2 animate-in slide-in-from-top-2 fade-in duration-200">
                            {renderSettingControl(setting)}
                        </div>
                    )}
                </div>
            ) : (
                <>
                    <div className="flex justify-between items-center mb-1">
                        <label htmlFor={setting.id} className="text-sm font-bold text-text-primary">{setting.label}</label>
                        {setting.type === 'toggle' && renderSettingControl(setting)}
                    </div>
                    {setting.type !== 'select' && <p id={`${setting.id}-desc`} className="text-xs text-text-muted mb-3">{setting.description}</p>}
                    {setting.type !== 'toggle' && renderSettingControl(setting)}
                </>
            )}
        </div>
    );

    return (
        <div className="w-full h-full flex flex-col bg-grim-900/50">
            <div className="bg-grim-800 p-3 flex justify-between items-center border-b border-grim-700">
                <h3 className="font-bold text-grim-gold flex items-center gap-2">
                    <SettingsIcon size={18} /> Settings
                </h3>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-grim-700">

                {/* Interface Section */}
                <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                        <Eye size={14} /> Interface & Visuals
                    </h4>
                    <div className="bg-grim-800/30 rounded-lg border border-grim-700/50 p-3 space-y-4">
                        {visualSettings.map(renderSettingItem)}
                    </div>
                </div>

                {/* Gameplay Section */}
                <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                        <Gamepad2 size={14} /> Gameplay Aids
                    </h4>
                    <div className="bg-grim-800/30 rounded-lg border border-grim-700/50 p-3 space-y-4">
                        {gameplaySettings.map(renderSettingItem)}
                    </div>
                </div>

                {/* AI Section */}
                <div>
                    <h4 className="text-xs font-bold text-grim-gold uppercase mb-3 flex items-center gap-2">
                        <BrainCircuit size={14} /> Tactical Intelligence
                    </h4>
                    <div className="bg-grim-800/30 rounded-lg border border-grim-700/50 p-3 space-y-4">
                        <button
                            onClick={() => setIsAiConfigOpen(!isAiConfigOpen)}
                            className="w-full flex justify-between items-start text-left"
                        >
                            <div className="flex-1">
                                <span className="text-sm font-bold text-text-primary">AI Services</span>
                                <p className="text-xs text-text-muted">Manage AI advisor, transcription, and roster parsing.</p>
                            </div>
                            <div className="text-text-muted pt-1">
                                {isAiConfigOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                            </div>
                        </button>

                        {isAiConfigOpen && (
                            <div className="space-y-4 pt-2 animate-in fade-in duration-200">
                                {aiSettings.map(renderSettingItem)}
                                <div className="pt-2">
                                    <button
                                        onClick={handleSelectKey}
                                        className="w-full bg-grim-700 hover:bg-grim-600 text-grim-gold border border-grim-600 py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all active:scale-95"
                                    >
                                        <Key size={14} /> Configure API Key
                                    </button>
                                    <p className="text-[10px] text-text-muted mt-2 text-center">
                                        Key selection is handled securely via the platform.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Data Management Section */}
                <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                        <Archive size={14} /> Data Management
                    </h4>
                    <div className="bg-grim-800/30 rounded-lg border border-grim-700/50 p-3 space-y-3">
                        <p className="text-[10px] text-text-muted">
                            Create a full backup of your battlefield, units, and settings.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={onBackupData}
                                className="flex flex-col items-center justify-center gap-1 bg-grim-700 hover:bg-grim-600 text-white p-2.5 rounded-lg border border-grim-600 transition-colors"
                            >
                                <Download size={16} />
                                <span className="text-[10px] font-bold">Export All</span>
                            </button>
                            <label className="flex flex-col items-center justify-center gap-1 bg-grim-700 hover:bg-grim-600 text-white p-2.5 rounded-lg border border-grim-600 cursor-pointer transition-colors">
                                <Upload size={16} />
                                <span className="text-[10px] font-bold">Import All</span>
                                <input type="file" accept=".json" className="hidden" onChange={onRestoreData} />
                            </label>
                        </div>
                    </div>
                </div>

                {/* Diagnostics - collapsed by default for beta */}
                <div>
                    <button
                        onClick={() => setIsDiagnosticsOpen(!isDiagnosticsOpen)}
                        className="w-full flex justify-between items-center text-left group"
                    >
                        <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 group-hover:text-slate-400 transition-colors">
                            <ShieldCheck size={14} /> Diagnostics
                        </h4>
                        <div className="text-slate-600">
                            {isDiagnosticsOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        </div>
                    </button>
                    {isDiagnosticsOpen && (
                        <div className="mt-3 bg-grim-800/30 rounded-lg border border-grim-700/50 p-3 space-y-3 animate-in fade-in duration-200">
                            <p className="text-[10px] text-text-muted">
                                Run internal checks to verify geometry and collision logic.
                            </p>
                            <button
                                onClick={runDiagnostics}
                                className="w-full bg-grim-700 hover:bg-grim-600 text-slate-300 border border-grim-600 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                            >
                                Run Diagnostics
                            </button>

                            {testResults && (
                                <div className="animate-in fade-in duration-200">
                                    <div className={`text-[10px] font-bold p-2 rounded border mb-2 ${testResults.summary.includes('fail') ? 'bg-red-900/20 border-red-800 text-red-400' : 'bg-green-900/20 border-green-800 text-green-400'}`}>
                                        {testResults.summary}
                                    </div>
                                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                                        {testResults.results.map((res, i) => (
                                            <div key={i} className="flex items-center gap-2 text-[9px] bg-black/20 p-1.5 rounded border border-grim-700/30">
                                                {res.passed ? <Check size={10} className="text-green-500" /> : <AlertCircle size={10} className="text-red-500" />}
                                                <span className={res.passed ? 'text-slate-300' : 'text-red-400'}>{res.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 border-t border-grim-700 bg-grim-800/50 space-y-3">
                <div className="text-center">
                    <span className="text-[10px] font-mono text-grim-gold/60 bg-grim-gold/10 px-2.5 py-1 rounded-full border border-grim-gold/20 inline-block">
                        v{APP_VERSION}
                    </span>
                </div>
                <div className="text-[9px] text-slate-600 leading-relaxed text-center px-2">
                    40 Carrot is a system-agnostic practice tool, not affiliated with or endorsed by any game publisher.
                </div>
            </div>
        </div>
    );
};
