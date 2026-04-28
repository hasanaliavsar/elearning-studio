// Block sizing — drag handle on the right edge for fluid resize, plus
// preset width buttons for snapping to 25 / 50 / 75 / 100% and an
// alignment toggle (left / center / right).
//
// Companion to SlideEditor.getBlockSizingStyle which actually applies
// the resulting width + margin styles to the block wrapper.

import { useRef, useState } from 'react';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import type { ContentBlock } from '../types';

interface ResizeHandleProps {
  block: ContentBlock;
  onResize: (width: number, align?: ContentBlock['align']) => void;
  visible: boolean;
}

export function BlockResizeHandle({ block, onResize, visible }: ResizeHandleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const handle = ref.current;
    const wrapper = handle?.parentElement;
    if (!handle || !wrapper) return;
    const parent = wrapper.parentElement;
    if (!parent) return;

    const parentRect = parent.getBoundingClientRect();
    const totalWidth = parentRect.width;
    const startX = e.clientX;
    const startWidth = wrapper.getBoundingClientRect().width;

    setDragging(true);
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const newWidthPx = Math.max(totalWidth * 0.2, Math.min(totalWidth, startWidth + dx));
      const pct = Math.round((newWidthPx / totalWidth) * 100);
      // Snap to multiples of 5
      const snapped = Math.round(pct / 5) * 5;
      onResize(snapped);
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      ref={ref}
      onPointerDown={startDrag}
      className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-10 flex items-center justify-center ${
        visible || dragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-70'
      } transition-opacity`}
      title="Drag to resize"
    >
      <div className={`w-1 h-10 rounded-full ${dragging ? 'bg-[#171D97]' : 'bg-gray-300 hover:bg-[#171D97]'} transition-colors`} />
    </div>
  );
}

// ─── Inspector controls — shown when a block is selected ──────────────────

const PRESET_WIDTHS: { label: string; value: number }[] = [
  { label: 'Full', value: 100 },
  { label: 'Wide', value: 75 },
  { label: 'Half', value: 50 },
  { label: 'Narrow', value: 33 },
];

interface SizingControlsProps {
  block: ContentBlock;
  onChange: (updates: Partial<ContentBlock>) => void;
}

export function BlockSizingControls({ block, onChange }: SizingControlsProps) {
  const width = typeof block.width === 'number' ? block.width : 100;
  const align = block.align || 'left';

  return (
    <div className="space-y-3 pt-3 border-t border-gray-100">
      <div>
        <label className="label text-xs flex items-center justify-between">
          <span>Width</span>
          <span className="text-gray-400 text-[10px] font-mono">{width}%</span>
        </label>
        <div className="flex gap-1 mt-1">
          {PRESET_WIDTHS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange({ width: p.value })}
              className={`flex-1 px-2 py-1.5 text-[11px] font-medium rounded border transition-colors ${
                width === p.value
                  ? 'bg-[#171D97] text-white border-[#171D97]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <input
          type="range"
          min={20}
          max={100}
          step={5}
          value={width}
          onChange={e => onChange({ width: Number(e.target.value) })}
          className="w-full mt-2 accent-[#171D97]"
        />
      </div>

      <div>
        <label className="label text-xs">Alignment</label>
        <div className="flex gap-1 mt-1">
          {([
            { value: 'left', icon: <AlignLeft className="w-3.5 h-3.5" />, label: 'Left' },
            { value: 'center', icon: <AlignCenter className="w-3.5 h-3.5" />, label: 'Center' },
            { value: 'right', icon: <AlignRight className="w-3.5 h-3.5" />, label: 'Right' },
          ] as const).map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ align: opt.value })}
              disabled={width >= 100}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium rounded border transition-colors ${
                align === opt.value && width < 100
                  ? 'bg-[#171D97] text-white border-[#171D97]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
              title={opt.label}
            >
              {opt.icon}
              <span className="hidden sm:inline">{opt.label}</span>
            </button>
          ))}
        </div>
        {width >= 100 && (
          <p className="text-[10px] text-gray-400 mt-1">Alignment applies when width is below 100%</p>
        )}
      </div>
    </div>
  );
}

