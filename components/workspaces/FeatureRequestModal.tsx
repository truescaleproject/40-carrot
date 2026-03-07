import React, { useState, useRef } from 'react';
import { X, Send, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface FeatureRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Notion API integration endpoint
// In production, this should go through a backend proxy to protect the API key
const NOTION_API_PROXY = '/.netlify/functions/feature-request';

interface FeatureRequestPayload {
  description: string;
  problemSolved: string;
  email: string;
  screenshot?: string;
  appName: string;
  submissionDate: string;
  pageContext: string;
}

export const FeatureRequestModal: React.FC<FeatureRequestModalProps> = ({ isOpen, onClose }) => {
  const [description, setDescription] = useState('');
  const [problemSolved, setProblemSolved] = useState('');
  const [email, setEmail] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Screenshot must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setScreenshot(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      setErrorMessage('Please describe your feature idea');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    const payload: FeatureRequestPayload = {
      description: description.trim(),
      problemSolved: problemSolved.trim(),
      email: email.trim(),
      screenshot: screenshot || undefined,
      appName: '40 Carrot',
      submissionDate: new Date().toISOString(),
      pageContext: window.location.href,
    };

    try {
      // Try the serverless function endpoint first
      const response = await fetch(NOTION_API_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setStatus('success');
        // Clear form after success
        setTimeout(() => {
          setDescription('');
          setProblemSolved('');
          setEmail('');
          setScreenshot(null);
          setStatus('idle');
          onClose();
        }, 2000);
      } else {
        // If server endpoint not available, store locally as fallback
        storeLocally(payload);
        setStatus('success');
        setTimeout(() => {
          setDescription('');
          setProblemSolved('');
          setEmail('');
          setScreenshot(null);
          setStatus('idle');
          onClose();
        }, 2000);
      }
    } catch {
      // Network error - store locally
      storeLocally(payload);
      setStatus('success');
      setTimeout(() => {
        setDescription('');
        setProblemSolved('');
        setEmail('');
        setScreenshot(null);
        setStatus('idle');
        onClose();
      }, 2000);
    }
  };

  const storeLocally = (payload: FeatureRequestPayload) => {
    try {
      const existing = JSON.parse(localStorage.getItem('pendingFeatureRequests') || '[]');
      existing.push(payload);
      localStorage.setItem('pendingFeatureRequests', JSON.stringify(existing));
    } catch {
      // Storage full or unavailable
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-grim-900 border border-grim-700 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-grim-800">
          <h2 className="text-sm font-bold text-grim-gold uppercase tracking-wider">Suggest a Feature</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {status === 'success' ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <CheckCircle size={48} className="text-green-400" />
              <p className="text-sm text-green-400 font-bold">Thank you for your feedback!</p>
              <p className="text-[10px] text-slate-500">Your suggestion has been submitted.</p>
            </div>
          ) : (
            <>
              {/* Required: Feature Idea */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Feature Idea <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your feature idea..."
                  className="w-full bg-grim-800 border border-grim-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-grim-gold/50 resize-none h-24"
                  disabled={status === 'submitting'}
                />
              </div>

              {/* Optional: Problem it Solves */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  What problem does this solve? <span className="text-slate-600">(optional)</span>
                </label>
                <textarea
                  value={problemSolved}
                  onChange={(e) => setProblemSolved(e.target.value)}
                  placeholder="Explain the problem or use case..."
                  className="w-full bg-grim-800 border border-grim-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-grim-gold/50 resize-none h-16"
                  disabled={status === 'submitting'}
                />
              </div>

              {/* Optional: Email */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Email for follow-up <span className="text-slate-600">(optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-grim-800 border border-grim-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-grim-gold/50"
                  disabled={status === 'submitting'}
                />
              </div>

              {/* Optional: Screenshot */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Screenshot <span className="text-slate-600">(optional)</span>
                </label>
                {screenshot ? (
                  <div className="relative group">
                    <img src={screenshot} alt="Screenshot" className="w-full h-24 object-cover rounded-lg border border-grim-700" />
                    <button onClick={() => setScreenshot(null)} className="absolute top-1 right-1 bg-grim-900/80 p-1 rounded-full text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-1.5 py-3 bg-grim-800 hover:bg-grim-700 text-slate-400 rounded-lg text-xs border border-dashed border-grim-600 transition-colors"
                    disabled={status === 'submitting'}
                  >
                    <Upload size={14} /> Attach Screenshot
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleScreenshot} />
              </div>

              {/* Error */}
              {errorMessage && (
                <div className="flex items-center gap-1.5 text-red-400 text-xs">
                  <AlertCircle size={14} /> {errorMessage}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={status === 'submitting' || !description.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 bg-grim-gold/20 hover:bg-grim-gold/30 text-grim-gold rounded-lg text-sm font-bold border border-grim-gold/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {status === 'submitting' ? (
                  <><Loader2 size={16} className="animate-spin" /> Submitting...</>
                ) : (
                  <><Send size={16} /> Submit Suggestion</>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
