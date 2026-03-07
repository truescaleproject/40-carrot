import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { safeLocalStorageGet, safeLocalStorageSet } from '../../utils/storageUtils';

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

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'savedLocally' | 'error';

export const FeatureRequestModal: React.FC<FeatureRequestModalProps> = ({ isOpen, onClose }) => {
  const [description, setDescription] = useState('');
  const [problemSolved, setProblemSolved] = useState('');
  const [email, setEmail] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Focus trap - focus modal on open
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const firstInput = modalRef.current.querySelector<HTMLElement>('textarea, input, button');
      firstInput?.focus();
    }
  }, [isOpen]);

  const resetForm = useCallback(() => {
    setDescription('');
    setProblemSolved('');
    setEmail('');
    setScreenshot(null);
    setStatus('idle');
  }, []);

  const resetAndClose = useCallback((delay = 2000) => {
    setTimeout(() => {
      resetForm();
      onClose();
    }, delay);
  }, [resetForm, onClose]);

  const storeLocally = useCallback((payload: FeatureRequestPayload) => {
    try {
      const raw = safeLocalStorageGet('pendingFeatureRequests');
      const existing = raw ? JSON.parse(raw) : [];
      existing.push(payload);
      safeLocalStorageSet('pendingFeatureRequests', JSON.stringify(existing));
    } catch {
      // Storage full or unavailable
    }
  }, []);

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
      const response = await fetch(NOTION_API_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setStatus('success');
        resetAndClose();
      } else {
        storeLocally(payload);
        setStatus('savedLocally');
        resetAndClose();
      }
    } catch {
      storeLocally(payload);
      setStatus('savedLocally');
      resetAndClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="feature-request-title"
    >
      <div
        ref={modalRef}
        className="bg-grim-900 border border-grim-700 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-grim-800">
          <h2 id="feature-request-title" className="text-sm font-bold text-grim-gold uppercase tracking-wider">Suggest a Feature</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors" aria-label="Close dialog"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {(status === 'success' || status === 'savedLocally') ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <CheckCircle size={48} className={status === 'success' ? 'text-green-400' : 'text-amber-400'} />
              <p className={`text-sm font-bold ${status === 'success' ? 'text-green-400' : 'text-amber-400'}`}>
                {status === 'success' ? 'Thank you for your feedback!' : 'Saved for later submission'}
              </p>
              <p className="text-[10px] text-slate-500">
                {status === 'success'
                  ? 'Your suggestion has been submitted.'
                  : 'Your suggestion was saved locally and will be submitted when the server is available.'}
              </p>
            </div>
          ) : (
            <>
              {/* Required: Feature Idea */}
              <div>
                <label htmlFor="feature-desc" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Feature Idea <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="feature-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your feature idea..."
                  className="w-full bg-grim-800 border border-grim-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-grim-gold/50 resize-none h-24"
                  disabled={status === 'submitting'}
                />
              </div>

              {/* Optional: Problem it Solves */}
              <div>
                <label htmlFor="feature-problem" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  What problem does this solve? <span className="text-slate-600">(optional)</span>
                </label>
                <textarea
                  id="feature-problem"
                  value={problemSolved}
                  onChange={(e) => setProblemSolved(e.target.value)}
                  placeholder="Explain the problem or use case..."
                  className="w-full bg-grim-800 border border-grim-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-grim-gold/50 resize-none h-16"
                  disabled={status === 'submitting'}
                />
              </div>

              {/* Optional: Email */}
              <div>
                <label htmlFor="feature-email" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Email for follow-up <span className="text-slate-600">(optional)</span>
                </label>
                <input
                  id="feature-email"
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
                    <img src={screenshot} alt="Screenshot preview" className="w-full h-24 object-cover rounded-lg border border-grim-700" />
                    <button onClick={() => setScreenshot(null)} className="absolute top-1 right-1 bg-grim-900/80 p-1 rounded-full text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Remove screenshot"><X size={14} /></button>
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
                <div className="flex items-center gap-1.5 text-red-400 text-xs" role="alert">
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
