// Inline add-button that lives between blocks on the slide canvas.
// Hovering the gap reveals a thin "+" line; clicking opens a quick-add
// popover with the most common block types. Selecting one calls
// onInsert(type, atIndex).
//
// Companion: CanvasDropZone wraps the canvas content area to handle
// drag-and-drop of image files (drop → insert image block at the end
// or near the dragged-over block).

import { useEffect, useRef, useState } from 'react';
import { Type as TypeIcon, FileText, Image as ImageIcon, Quote, AlertCircle, Columns3, Minus, MousePointer } from 'lucide-react';
import type { ContentBlock } from '../types';

type BlockType = ContentBlock['type'];

const QUICK_TYPES: { type: BlockType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: 'heading', label: 'Heading', icon: <TypeIcon className="w-3.5 h-3.5" />, description: 'Section title' },
  { type: 'text', label: 'Text', icon: <FileText className="w-3.5 h-3.5" />, description: 'Paragraph or rich text' },
  { type: 'image', label: 'Image', icon: <ImageIcon className="w-3.5 h-3.5" />, description: 'Picture from URL' },
  { type: 'pull-quote', label: 'Pull quote', icon: <Quote className="w-3.5 h-3.5" />, description: 'Highlighted quote with attribution' },
  { type: 'callout', label: 'Callout', icon: <AlertCircle className="w-3.5 h-3.5" />, description: 'Info / warning / tip / success box' },
  { type: 'comparison', label: 'Comparison', icon: <Columns3 className="w-3.5 h-3.5" />, description: '2–4 columns with featured option' },
  { type: 'button', label: 'Button', icon: <MousePointer className="w-3.5 h-3.5" />, description: 'Clickable CTA' },
  { type: 'divider', label: 'Divider', icon: <Minus className="w-3.5 h-3.5" />, description: 'Horizontal line' },
];

interface InlineAddProps {
  index: number;
  onInsert: (type: BlockType, index: number) => void;
}

export function InlineAdd({ index, onInsert }: InlineAddProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative group/add my-1" onClick={e => e.stopPropagation()}>
      {/* Slim hover target */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-center transition-all ${
          open ? 'h-8' : 'h-2 hover:h-8'
        }`}
        aria-label="Add block here"
      >
        <span className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full transition-all ${
          open
            ? 'bg-[#171D97] text-white shadow-md'
            : 'bg-white text-[#171D97] border border-[#171D97]/30 opacity-0 group-hover/add:opacity-100 shadow-sm'
        }`}>
          <span className="text-base leading-none">+</span> Add block
        </span>
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-30 w-[320px] bg-white rounded-lg shadow-xl border border-gray-200 p-2">
          <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-gray-400 px-2 py-1">
            Insert block
          </p>
          <div className="grid grid-cols-2 gap-1">
            {QUICK_TYPES.map(({ type, label, icon, description }) => (
              <button
                key={type}
                onClick={() => { onInsert(type, index); setOpen(false); }}
                className="flex items-start gap-2 p-2 rounded-md text-left hover:bg-gray-50 transition-colors"
              >
                <span className="mt-0.5 text-[#171D97]">{icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[12px] font-medium text-gray-900 truncate">{label}</span>
                  <span className="block text-[10px] text-gray-500 truncate">{description}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
