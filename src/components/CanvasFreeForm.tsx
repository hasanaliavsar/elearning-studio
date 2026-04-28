// Free-placement canvas — phase 1 of the website-builder layout.
// Slides with layout: 'canvas' render each content block as an absolutely
// positioned element with x/y/w/h coordinates. Authors drag to move,
// drag the corner handles to resize, and see alignment guides snap to
// the slide centre and other blocks' edges during drag.
//
// Phase 1 scope:
// - Drag a block anywhere on the slide
// - 8 resize handles (corners + edges) on the selected block
// - Alignment guides + 5-px snap to slide centre / other blocks' edges
// - Z-order: bring-forward / send-backward via toolbar buttons
//
// Out of scope for phase 1: multi-select, copy/paste, keyboard nudge,
// snap-to-grid (the "guidance lines but not block me" the user asked for
// is satisfied by alignment-only snap), SCORM export support (still uses
// the linear renderer; canvas slides will appear as a stack until phase 2).

import { useEffect, useRef, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { ContentBlock, BlockCanvasPos } from '../types';

export const CANVAS_W = 1280;
export const CANVAS_H = 720;
const SNAP_PX = 6;

// Default position for a newly added block on a canvas slide.
export function defaultCanvasPos(existing: ContentBlock[]): BlockCanvasPos {
  // Stagger so consecutive adds don't stack exactly
  const offset = existing.filter(b => b.pos).length * 40;
  return {
    x: 80 + offset,
    y: 80 + offset,
    w: 480,
    h: 200,
  };
}

interface Props {
  blocks: ContentBlock[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, pos: BlockCanvasPos) => void;
  onReorder: (id: string, dir: 'forward' | 'backward') => void;
  renderBlockBody: (block: ContentBlock) => React.ReactNode;
}

interface Guide {
  type: 'v' | 'h';
  px: number; // x for v, y for h
  label?: string;
}

export function CanvasFreeForm({ blocks, activeId, onSelect, onMove, onReorder, renderBlockBody }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [guides, setGuides] = useState<Guide[]>([]);

  // Compute the displayed scale so the 1280×720 canvas fits the parent width
  useEffect(() => {
    const measure = () => {
      const el = wrapRef.current;
      if (!el) return;
      const parent = el.parentElement;
      if (!parent) return;
      const target = Math.min(1, (parent.clientWidth - 16) / CANVAS_W);
      setScale(target);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <div className="w-full" style={{ height: CANVAS_H * scale + 8 }}>
      <div
        ref={wrapRef}
        className="relative bg-white rounded shadow-sm origin-top-left mx-auto"
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          marginLeft: 0,
        }}
        onClick={() => onSelect(null)}
      >
        {/* Background dotted grid for visual reference */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(15,23,42,0.06) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Blocks */}
        {blocks.map((block, idx) => (
          <CanvasBlock
            key={block.id}
            block={block}
            zIndex={typeof block.pos?.z === 'number' ? block.pos.z : idx}
            active={activeId === block.id}
            otherBlocks={blocks.filter(b => b.id !== block.id)}
            onSelect={() => onSelect(block.id)}
            onMove={pos => onMove(block.id, pos)}
            onSetGuides={setGuides}
            onForward={() => onReorder(block.id, 'forward')}
            onBackward={() => onReorder(block.id, 'backward')}
          >
            {renderBlockBody(block)}
          </CanvasBlock>
        ))}

        {/* Guides overlay — rendered last so they sit on top */}
        {guides.map((g, i) => (
          <div
            key={i}
            className="absolute pointer-events-none"
            style={{
              backgroundColor: '#171D97',
              [g.type === 'v' ? 'left' : 'top']: g.px,
              [g.type === 'v' ? 'top' : 'left']: 0,
              [g.type === 'v' ? 'width' : 'height']: 1,
              [g.type === 'v' ? 'height' : 'width']: g.type === 'v' ? CANVAS_H : CANVAS_W,
              opacity: 0.6,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Single positioned block with drag + resize ────────────────────────────

interface BlockProps {
  block: ContentBlock;
  zIndex: number;
  active: boolean;
  otherBlocks: ContentBlock[];
  onSelect: () => void;
  onMove: (pos: BlockCanvasPos) => void;
  onSetGuides: (guides: Guide[]) => void;
  onForward: () => void;
  onBackward: () => void;
  children: React.ReactNode;
}

function CanvasBlock({ block, zIndex, active, otherBlocks, onSelect, onMove, onSetGuides, onForward, onBackward, children }: BlockProps) {
  const pos: BlockCanvasPos = block.pos || { x: 40, y: 40, w: 480, h: 200 };
  type DragMode = 'move' | 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r';
  const dragRef = useRef<{ mode: DragMode; startX: number; startY: number; orig: BlockCanvasPos } | null>(null);

  const startDrag = (mode: DragMode) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    const slide = (e.currentTarget as HTMLElement).closest('[data-canvas-root]') as HTMLElement | null;
    const rect = slide?.getBoundingClientRect();
    const sx = rect?.width ? rect.width / CANVAS_W : 1;
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, orig: { ...pos } };

    const onPointerMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = (ev.clientX - d.startX) / sx;
      const dy = (ev.clientY - d.startY) / sx;
      let next: BlockCanvasPos = { ...d.orig };
      if (d.mode === 'move') {
        next.x = d.orig.x + dx;
        next.y = d.orig.y + dy;
      } else {
        // Resize logic — adjust by edge
        if (d.mode.includes('l')) { next.x = d.orig.x + dx; next.w = d.orig.w - dx; }
        if (d.mode.includes('r')) { next.w = d.orig.w + dx; }
        if (d.mode.includes('t')) { next.y = d.orig.y + dy; next.h = d.orig.h - dy; }
        if (d.mode.includes('b')) { next.h = d.orig.h + dy; }
        // Clamp min size
        if (next.w < 60) { next.w = 60; if (d.mode.includes('l')) next.x = d.orig.x + d.orig.w - 60; }
        if (next.h < 40) { next.h = 40; if (d.mode.includes('t')) next.y = d.orig.y + d.orig.h - 40; }
      }
      // Snap + guides
      const { snapped, guides } = computeSnap(next, otherBlocks);
      next = snapped;
      onSetGuides(guides);
      onMove(next);
    };
    const onPointerUp = () => {
      dragRef.current = null;
      onSetGuides([]);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const blockLabel = block.type;
  return (
    <div
      data-canvas-root
      className={`absolute group transition-shadow ${active ? 'ring-2 ring-[#171D97]' : 'ring-1 ring-transparent hover:ring-[#171D97]/40'}`}
      style={{
        left: pos.x,
        top: pos.y,
        width: pos.w,
        height: pos.h,
        zIndex: dragRef.current ? 999 : zIndex,
      }}
      onClick={e => { e.stopPropagation(); onSelect(); }}
    >
      {/* Drag bar — grab here to move; body remains editable */}
      <div
        data-handle
        onPointerDown={startDrag('move')}
        className={`absolute -top-7 left-0 right-0 h-7 flex items-center px-2 rounded-t cursor-move transition-opacity ${
          active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        style={{ background: 'linear-gradient(180deg, rgba(23,29,151,0.92), rgba(10,12,63,0.92))' }}
      >
        <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/90 truncate">
          ⠿ {blockLabel}
        </span>
        <span className="ml-auto text-[10px] font-mono text-white/60">
          {Math.round(pos.x)},{Math.round(pos.y)} · {Math.round(pos.w)}×{Math.round(pos.h)}
        </span>
      </div>

      {/* Block body — editable in place: pointer events on, click to interact */}
      <div className="w-full h-full overflow-hidden bg-white">
        {children}
      </div>

      {/* Z-order toolbar — only when active, positioned BELOW the drag bar to avoid overlap */}
      {active && (
        <div className="absolute -bottom-9 left-0 flex items-center gap-1 bg-white border border-gray-200 shadow-md rounded px-1.5 py-1" onPointerDown={e => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onForward(); }}
            className="p-1 rounded hover:bg-gray-100 text-gray-600"
            title="Bring forward"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onBackward(); }}
            className="p-1 rounded hover:bg-gray-100 text-gray-600"
            title="Send backward"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-gray-400 ml-1">
            Drag the navy bar to move · drag handles to resize
          </span>
        </div>
      )}

      {/* Resize handles — visible when active */}
      {active && (
        <>
          {(['tl', 'tr', 'bl', 'br'] as const).map(m => (
            <div
              key={m}
              data-handle
              onPointerDown={startDrag(m)}
              className="absolute w-3 h-3 bg-white border-2 border-[#171D97] rounded-sm"
              style={{
                left: m.includes('l') ? -6 : undefined,
                right: m.includes('r') ? -6 : undefined,
                top: m.includes('t') ? -6 : undefined,
                bottom: m.includes('b') ? -6 : undefined,
                cursor: m === 'tl' || m === 'br' ? 'nwse-resize' : 'nesw-resize',
              }}
            />
          ))}
          {(['t', 'b', 'l', 'r'] as const).map(m => (
            <div
              key={m}
              data-handle
              onPointerDown={startDrag(m)}
              className="absolute bg-white border-2 border-[#171D97] rounded-sm"
              style={{
                left: m === 'l' ? -4 : m === 'r' ? undefined : '50%',
                right: m === 'r' ? -4 : undefined,
                top: m === 't' ? -4 : m === 'b' ? undefined : '50%',
                bottom: m === 'b' ? -4 : undefined,
                width: m === 't' || m === 'b' ? 12 : 8,
                height: m === 'l' || m === 'r' ? 12 : 8,
                marginLeft: m === 't' || m === 'b' ? -6 : 0,
                marginTop: m === 'l' || m === 'r' ? -6 : 0,
                cursor: m === 't' || m === 'b' ? 'ns-resize' : 'ew-resize',
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}

// ─── Snap & guide computation ──────────────────────────────────────────────

function computeSnap(pos: BlockCanvasPos, others: ContentBlock[]): { snapped: BlockCanvasPos; guides: Guide[] } {
  const guides: Guide[] = [];
  let { x, y, w, h } = pos;

  const myEdges = { left: x, right: x + w, hCenter: x + w / 2, top: y, bottom: y + h, vCenter: y + h / 2 };

  // Targets to align to: slide centre + each other block's edges and centre
  const vTargets: { px: number; label?: string }[] = [
    { px: CANVAS_W / 2, label: 'Slide centre' },
    { px: 0 },
    { px: CANVAS_W },
  ];
  const hTargets: { px: number; label?: string }[] = [
    { px: CANVAS_H / 2, label: 'Slide centre' },
    { px: 0 },
    { px: CANVAS_H },
  ];

  for (const b of others) {
    if (!b.pos) continue;
    const { x: bx, y: by, w: bw, h: bh } = b.pos;
    vTargets.push({ px: bx }, { px: bx + bw }, { px: bx + bw / 2 });
    hTargets.push({ px: by }, { px: by + bh }, { px: by + bh / 2 });
  }

  // Find closest vertical (x) match for each of my vertical edges
  const tryV = (myPx: number, label: string) => {
    for (const t of vTargets) {
      if (Math.abs(t.px - myPx) <= SNAP_PX) {
        guides.push({ type: 'v', px: t.px });
        return t.px - myPx;
      }
    }
    return null;
  };
  const tryH = (myPx: number, label: string) => {
    for (const t of hTargets) {
      if (Math.abs(t.px - myPx) <= SNAP_PX) {
        guides.push({ type: 'h', px: t.px });
        return t.px - myPx;
      }
    }
    return null;
  };

  // Try aligning my left, centre, right (and the smallest delta wins)
  const candidatesX: (number | null)[] = [
    tryV(myEdges.left, 'left'),
    tryV(myEdges.hCenter, 'centre'),
    tryV(myEdges.right, 'right'),
  ];
  const dxAdj = candidatesX.find(d => d !== null);
  if (typeof dxAdj === 'number') x += dxAdj;

  const candidatesY: (number | null)[] = [
    tryH(myEdges.top, 'top'),
    tryH(myEdges.vCenter, 'middle'),
    tryH(myEdges.bottom, 'bottom'),
  ];
  const dyAdj = candidatesY.find(d => d !== null);
  if (typeof dyAdj === 'number') y += dyAdj;

  return { snapped: { ...pos, x, y, w, h }, guides };
}
