import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  section: string;
  expandedSection: string | null;
  onToggle: (section: string) => void;
  icon: React.ElementType;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, section, expandedSection, onToggle, icon: Icon }) => (
  <button
    onClick={() => onToggle(expandedSection === section ? '' : section)}
    className="w-full flex items-center justify-between py-2 text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-grim-gold transition-colors"
    aria-expanded={expandedSection === section}
    aria-controls={`section-${section}`}
  >
    <span className="flex items-center gap-1.5"><Icon size={12} />{title}</span>
    {expandedSection === section ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
  </button>
);
