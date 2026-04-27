// src/components/TemplateModal/TemplateModal.tsx
// Grid-style template picker.
// Picks a template, calls back with a fully-formed Slide.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Slide } from '../../types';
import { SLIDE_TEMPLATES, SlideTemplate } from '../../data/templates';

interface Props {
  open: boolean;
  onClose: () => void;
  onInsert: (slide: Slide) => void;
}

const CATEGORIES = ['All', 'Foundations', 'Editorial', 'Data', 'Reference', 'Assessment', 'How-to'] as const;
type Category = typeof CATEGORIES[number];

export function TemplateModal({ open, onClose, onInsert }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('All');
  const [selectedKey, setSelectedKey] = useState<string>(SLIDE_TEMPLATES[0]?.key ?? '');
  const gridRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SLIDE_TEMPLATES.filter(t => {
      if (category !== 'All' && t.category !== category) return false;
      if (!q) return true;
      return t.name.toLowerCase().includes(q) || t.summary.toLowerCase().includes(q);
    });
  }, [query, category]);

  const selected = filtered.find(t => t.key === selectedKey) ?? filtered[0];

  useEffect(() => {
    if (filtered.length && !filtered.find(t => t.key === selectedKey)) {
      const first = filtered[0];
      if (first) setSelectedKey(first.key);
    }
  }, [filtered, selectedKey]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'Enter' && selected) { e.preventDefault(); insert(selected); return; }
      const i = filtered.findIndex(t => t.key === selectedKey);
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = filtered[Math.min(filtered.length - 1, i + 1)];
        if (next) setSelectedKey(next.key);
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = filtered[Math.max(0, i - 1)];
        if (prev) setSelectedKey(prev.key);
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = filtered[Math.min(filtered.length - 1, i + 3)];
        if (next) setSelectedKey(next.key);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = filtered[Math.max(0, i - 3)];
        if (prev) setSelectedKey(prev.key);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, filtered, selectedKey, selected]);

  if (!open) return null;

  function insert(t: SlideTemplate) {
    onInsert(t.build());
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white w-[1140px] max-w-[95vw] h-[760px] max-h-[94vh] rounded-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-8 pt-7 pb-5">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#171D97] mb-1">New slide</p>
            <h2 className="text-[28px] font-medium text-gray-900 mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
              Choose a template
            </h2>
            <p className="text-[13px] text-gray-500 leading-relaxed max-w-[520px]">
              Start with a layout that matches your intent. Every template is fully editable after insertion.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-500"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 px-8 pb-5">
          <div className="relative w-[280px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Search templates…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171D97]/20 focus:border-[#171D97]"
              autoFocus
            />
          </div>
          <div className="flex gap-1.5 flex-1">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`h-9 px-3.5 text-[13px] font-medium rounded-full transition ${
                  category === c
                    ? 'bg-[#171D97] text-white'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <span className="text-[12px] text-gray-400 whitespace-nowrap">{filtered.length} template{filtered.length === 1 ? '' : 's'}</span>
        </div>

        {/* Grid */}
        <div ref={gridRef} className="flex-1 overflow-y-auto px-8 pb-8 bg-[#FAF8F4]">
          {filtered.length === 0 ? (
            <div className="p-16 text-center text-sm text-gray-400">No templates match your search.</div>
          ) : (
            <div className="grid grid-cols-3 gap-4 pt-2">
              {filtered.map(t => {
                const isSelected = t.key === selected?.key;
                const built = t.build();
                const blockCount = built.content.length + built.questions.length;
                return (
                  <button
                    key={t.key}
                    onClick={() => setSelectedKey(t.key)}
                    onDoubleClick={() => insert(t)}
                    className={`group bg-white rounded-lg border-2 transition text-left flex flex-col overflow-hidden ${
                      isSelected
                        ? 'border-[#171D97] shadow-md'
                        : 'border-transparent hover:border-gray-200 shadow-sm hover:shadow'
                    }`}
                  >
                    {/* Thumbnail area */}
                    <div className="relative h-[160px] bg-[#F3F0EA] flex items-center justify-center overflow-hidden">
                      <ThumbPreview template={t} />
                      {t.badge && (
                        <span className="absolute top-3 right-3 text-[9px] font-semibold tracking-wider uppercase text-[#D4A574] bg-white px-2 py-1 rounded-full shadow-sm">
                          {t.badge}
                        </span>
                      )}
                    </div>
                    {/* Meta */}
                    <div className="p-4 flex flex-col gap-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="text-[15px] font-medium text-gray-900 truncate" style={{ fontFamily: 'Fraunces, serif' }}>
                          {t.name}
                        </h3>
                        <span className="text-[9px] font-semibold tracking-wider uppercase text-[#171D97] whitespace-nowrap">
                          {t.category}
                        </span>
                      </div>
                      <p className="text-[12px] text-gray-500 leading-snug line-clamp-2 min-h-[32px]">{t.summary}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {built.content.slice(0, 4).map((b, i) => (
                          <span key={i} className="text-[9px] font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                            {b.type}
                          </span>
                        ))}
                        {built.questions.length > 0 && (
                          <span className="text-[9px] font-mono text-[#D4A574] bg-[#D4A574]/10 px-1.5 py-0.5 rounded">
                            {built.questions.length}q
                          </span>
                        )}
                        {blockCount > 4 && (
                          <span className="text-[9px] font-mono text-gray-400 px-1.5 py-0.5">
                            +{blockCount - 4}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-4 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-3 text-[11px] text-gray-400">
            <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded font-mono">↑↓←→</kbd> navigate</span>
            <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded font-mono">Enter</kbd> insert</span>
            <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded font-mono">Esc</kbd> close</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="h-10 px-4 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition"
            >
              Cancel
            </button>
            <button
              onClick={() => selected && insert(selected)}
              disabled={!selected}
              className="h-10 px-5 text-sm font-medium bg-[#171D97] text-white rounded-md hover:bg-[#0A0C3F] transition disabled:opacity-50"
            >
              + Insert {selected ? selected.name : 'template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Lightweight per-template thumbnail. Picks a visual based on the template key
// or category so authors can scan the grid without rendering full slides.
function ThumbPreview({ template }: { template: SlideTemplate }) {
  const key = template.key;
  const cat = template.category;

  // Per-template hand-tuned thumbnails for the most distinctive ones
  if (key === 'blank') {
    return (
      <div className="w-[78%] h-[78%] border border-dashed border-gray-300 rounded-md flex items-center justify-center text-gray-300">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </div>
    );
  }
  if (key === 'pull-quote') {
    return (
      <div className="w-[78%] flex flex-col items-center text-center gap-2">
        <span className="text-[#D4A574] text-2xl leading-none" style={{ fontFamily: 'Fraunces, serif' }}>“</span>
        <p className="text-[11px] italic text-gray-700 leading-snug" style={{ fontFamily: 'Fraunces, serif' }}>
          You can&apos;t predict. You can prepare.
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <div className="w-4 h-4 rounded-full bg-[#171D97]" />
          <span className="text-[9px] text-gray-500">Attribution</span>
        </div>
      </div>
    );
  }
  if (key === 'number-lead' || cat === 'Data') {
    return (
      <div className="w-[80%] flex flex-col gap-2">
        <div className="text-[28px] font-medium text-[#171D97] leading-none" style={{ fontFamily: 'Fraunces, serif' }}>
          23<span className="text-base">%</span>
        </div>
        <p className="text-[9px] text-gray-500 leading-tight">Headline figure with sourced context</p>
        <div className="flex items-end gap-1 h-6 mt-1">
          {[3, 5, 4, 7, 6, 8].map((h, i) => (
            <div key={i} className="flex-1 bg-[#171D97] rounded-sm" style={{ height: `${h * 10}%`, opacity: 0.4 + i * 0.1 }} />
          ))}
        </div>
      </div>
    );
  }
  if (key === 'editorial-split' || cat === 'Editorial') {
    return (
      <div className="w-[82%] flex gap-2 items-center">
        <div className="flex-1 flex flex-col gap-1">
          <p className="text-[10px] font-medium text-gray-900 leading-tight" style={{ fontFamily: 'Fraunces, serif' }}>
            The case for <em>private</em> markets
          </p>
          <div className="h-1 bg-gray-200 rounded w-full" />
          <div className="h-1 bg-gray-200 rounded w-[80%]" />
          <div className="h-1 bg-gray-200 rounded w-[60%]" />
        </div>
        <div className="w-12 h-14 rounded bg-gradient-to-br from-[#171D97] to-[#0A0C3F]" />
      </div>
    );
  }
  if (key === 'cover-hotspots') {
    return (
      <div className="w-[82%] h-[78%] rounded-md bg-gradient-to-br from-[#171D97] to-[#0A0C3F] flex items-center justify-center p-3">
        <p className="text-[11px] text-white text-center leading-tight" style={{ fontFamily: 'Fraunces, serif' }}>
          How a fund<br />actually makes money
        </p>
      </div>
    );
  }
  if (cat === 'Reference') {
    return (
      <div className="w-[82%] flex flex-col gap-1.5">
        <p className="text-[10px] font-medium text-gray-900 mb-1" style={{ fontFamily: 'Fraunces, serif' }}>
          Glossary of terms
        </p>
        {['AUM — assets under management', 'Capital call (drawdown)', 'Carried interest (carry)'].map((t, i) => (
          <div key={i} className="flex items-center gap-1.5 border-b border-gray-200 pb-0.5">
            <span className="text-[8px] text-gray-700 truncate flex-1">{t}</span>
            <span className="text-gray-300 text-[8px]">▾</span>
          </div>
        ))}
      </div>
    );
  }
  if (cat === 'Assessment') {
    return (
      <div className="w-[82%] flex flex-col gap-1.5">
        <p className="text-[11px] font-medium text-gray-900 mb-1" style={{ fontFamily: 'Fraunces, serif' }}>
          Let&apos;s see what stuck
        </p>
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full border border-gray-300" />
            <div className="flex-1 h-1.5 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }
  if (cat === 'How-to') {
    return (
      <div className="w-[82%] flex items-center gap-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-5 h-5 rounded-full bg-[#171D97] text-white text-[8px] flex items-center justify-center">{i}</div>
            <div className="w-full h-1 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Default fallback — typographic
  return (
    <div className="w-[80%] flex flex-col gap-1.5">
      <p className="text-[12px] font-medium text-gray-900 truncate" style={{ fontFamily: 'Fraunces, serif' }}>
        {template.name}
      </p>
      <div className="h-1 bg-gray-200 rounded w-full" />
      <div className="h-1 bg-gray-200 rounded w-[80%]" />
      <div className="h-1 bg-gray-200 rounded w-[60%]" />
    </div>
  );
}
