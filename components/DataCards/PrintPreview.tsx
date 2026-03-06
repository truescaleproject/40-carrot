import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DataCard as Card } from './DataCard';
import { UnitCardData } from '../../types/dataCards';
import { X, Printer, LayoutTemplate, Smartphone, Grid2X2 } from 'lucide-react';

interface PrintPreviewModalProps {
  cards: { col1: UnitCardData[], col2: UnitCardData[] }[];
  isOpen: boolean;
  onClose: () => void;
  cardWidth: number;
  cardHeight: number;
}

type PrintLayout = 'portrait-3' | 'landscape-2' | 'landscape-4';

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ cards, isOpen, onClose, cardWidth, cardHeight }) => {
  const [layout, setLayout] = useState<PrintLayout>('portrait-3');
  const [scale, setScale] = useState(100); // Percentage
  const [gap, setGap] = useState(10); // px
  const [showCutLines, setShowCutLines] = useState(true);

  // Initialize print root
  useEffect(() => {
    const printRoot = document.getElementById('print-root');
    if (!printRoot) return;
    printRoot.innerHTML = ''; // Clear previous
  }, []);

  if (!isOpen) return null;

  // Configuration constants
  const PAGE_WIDTH_PORTRAIT = 8.5; // inches
  const PAGE_HEIGHT_PORTRAIT = 11; // inches

  const isLandscape = layout.includes('landscape');
  const pageWidth = isLandscape ? 11 : 8.5;
  const pageHeight = isLandscape ? 8.5 : 11;
  const cardsPerPage = layout === 'portrait-3' ? 3 : layout === 'landscape-2' ? 2 : 4;

  // Chunk cards for printing
  const chunks = [];
  for (let i = 0; i < cards.length; i += cardsPerPage) {
    chunks.push(cards.slice(i, i + cardsPerPage));
  }

  const handlePrint = () => {
    window.print();
  };

  const getLayoutStyles = () => {
    switch (layout) {
      case 'portrait-3':
        return {
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: `${gap}px`,
          paddingTop: '0.5in',
        };
      case 'landscape-2':
        return {
          display: 'flex',
          flexDirection: 'row' as const,
          alignItems: 'center',
          justifyContent: 'center',
          gap: `${gap}px`,
          paddingTop: '2.5in', // Vertically center 3.5" in 8.5"
        };
      case 'landscape-4':
        return {
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          justifyContent: 'center',
          alignContent: 'center',
          gap: `${gap}px`,
          padding: '0.5in',
        };
      default:
        return {};
    }
  };

  // Content to render inside each sheet
  const renderSheetContent = (chunk: typeof cards, sheetIndex: number) => (
    <div
        style={{
            ...getLayoutStyles(),
            width: '100%',
            height: '100%',
            transform: `scale(${scale / 100})`,
            transformOrigin: 'center top'
        }}
    >
        {chunk.map((cardData, idx) => (
            <div key={idx} className={`relative ${showCutLines ? 'border border-dashed border-gray-300' : ''}`}>
               <Card
                 column1={cardData.col1}
                 column2={cardData.col2}
                 onEditUnit={() => {}}
                 pageNumber={(sheetIndex * cardsPerPage) + idx + 1}
                 width={cardWidth}
                 height={cardHeight}
                />
            </div>
        ))}
    </div>
  );

  // Render the actual printable content into #print-root using a Portal
  const printContent = (
    <>
        {chunks.map((chunk, i) => (
            <div
                key={i}
                className="print-sheet relative"
                style={{
                    width: `${pageWidth}in`,
                    height: `${pageHeight}in`,
                    // We can use flex to center the content wrapper in the sheet
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}
            >
                {renderSheetContent(chunk, i)}
                {/* Print Metadata */}
                <div className="absolute bottom-2 right-2 text-[8px] text-gray-400 font-mono">
                    Page {i + 1} • GrimDark Data Cards
                </div>
            </div>
        ))}
    </>
  );

  return (
    <>
        {/* The Portal to the hidden print div */}
        {document.getElementById('print-root') && createPortal(printContent, document.getElementById('print-root')!)}

        {/* The Modal UI */}
        <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 print:hidden backdrop-blur-sm">
            <div className="bg-grim-900 w-full max-w-6xl h-[90vh] rounded-lg border border-grim-700 flex overflow-hidden shadow-2xl">

                {/* Sidebar Controls */}
                <div className="w-80 bg-grim-900 p-6 flex flex-col border-r border-grim-800 gap-6 overflow-y-auto">
                    <div>
                        <h2 className="text-xl font-bold text-white font-['Chakra_Petch'] mb-1">Print Preview</h2>
                        <p className="text-xs text-slate-400">Configure your layout for 8.5" x 11" paper.</p>
                        <p className="text-[10px] text-yellow-500 mt-2">Card Size: {cardWidth}" x {cardHeight}"</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Layout</label>
                            <div className="grid grid-cols-1 gap-2">
                                <button
                                    onClick={() => { setLayout('portrait-3'); setScale(100); }}
                                    className={`p-3 rounded border text-left flex items-center gap-3 transition-all ${layout === 'portrait-3' ? 'bg-yellow-600/20 border-yellow-600 text-yellow-500' : 'bg-grim-900 border-grim-800 text-slate-400 hover:bg-grim-800'}`}
                                >
                                    <Smartphone size={18} />
                                    <div>
                                        <div className="text-sm font-bold">Portrait (1x3)</div>
                                        <div className="text-[10px] opacity-70">3 Cards per page. Best fit.</div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => { setLayout('landscape-2'); setScale(100); }}
                                    className={`p-3 rounded border text-left flex items-center gap-3 transition-all ${layout === 'landscape-2' ? 'bg-yellow-600/20 border-yellow-600 text-yellow-500' : 'bg-grim-900 border-grim-800 text-slate-400 hover:bg-grim-800'}`}
                                >
                                    <LayoutTemplate size={18} />
                                    <div>
                                        <div className="text-sm font-bold">Landscape (1x2)</div>
                                        <div className="text-[10px] opacity-70">2 Cards centered. Safe margins.</div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => { setLayout('landscape-4'); setScale(94); }}
                                    className={`p-3 rounded border text-left flex items-center gap-3 transition-all ${layout === 'landscape-4' ? 'bg-yellow-600/20 border-yellow-600 text-yellow-500' : 'bg-grim-900 border-grim-800 text-slate-400 hover:bg-grim-800'}`}
                                >
                                    <Grid2X2 size={18} />
                                    <div>
                                        <div className="text-sm font-bold">Landscape (2x2)</div>
                                        <div className="text-[10px] opacity-70">4 Cards. Tight fit (Scale ~94%).</div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block flex justify-between">
                                <span>Scale: {scale}%</span>
                            </label>
                            <input
                                type="range"
                                min="50"
                                max="100"
                                value={scale}
                                onChange={(e) => setScale(Number(e.target.value))}
                                className="w-full accent-yellow-500 h-2 bg-grim-800 rounded-lg appearance-none cursor-pointer"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">Adjust if cards are getting cut off by printer margins.</p>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block flex justify-between">
                                <span>Gap: {gap}px</span>
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="50"
                                value={gap}
                                onChange={(e) => setGap(Number(e.target.value))}
                                className="w-full accent-yellow-500 h-2 bg-grim-800 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                             <input
                                type="checkbox"
                                id="cutlines"
                                checked={showCutLines}
                                onChange={(e) => setShowCutLines(e.target.checked)}
                                className="accent-yellow-500 w-4 h-4 rounded"
                             />
                             <label htmlFor="cutlines" className="text-sm text-slate-300 cursor-pointer">Show Cut Lines (Border)</label>
                        </div>
                    </div>

                    <div className="mt-auto space-y-3">
                        <button
                            onClick={handlePrint}
                            className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded flex justify-center items-center gap-2 shadow-lg transition-colors"
                        >
                            <Printer size={20} /> Print Now
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-2 bg-grim-800 hover:bg-grim-700 text-slate-300 font-bold rounded flex justify-center items-center gap-2 transition-colors"
                        >
                            <X size={16} /> Cancel
                        </button>
                    </div>
                </div>

                {/* Preview Area */}
                <div className="flex-1 bg-grim-800 overflow-y-auto p-8 flex flex-col items-center gap-8 relative">
                    <div className="absolute top-4 right-4 bg-black/50 px-3 py-1 rounded text-xs text-slate-400 pointer-events-none">
                        Scroll to see all pages
                    </div>

                    {chunks.map((chunk, i) => (
                        <div
                            key={i}
                            className="bg-white shadow-2xl transition-all duration-300 origin-top"
                            style={{
                                width: `${pageWidth}in`,
                                height: `${pageHeight}in`,
                                minWidth: `${pageWidth}in`, // Prevent shrinking in flex
                                minHeight: `${pageHeight}in`,
                                transform: 'scale(0.7)', // Visual scale for UI to fit on screen
                                marginBottom: '-3in', // Counteract the scale gap
                                marginTop: i === 0 ? '-1.5in' : '0',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center'
                            }}
                        >
                            {renderSheetContent(chunk, i)}
                        </div>
                    ))}
                    {/* Spacer for bottom */}
                    <div className="h-24 w-full shrink-0"></div>
                </div>
            </div>
        </div>
    </>
  );
};
