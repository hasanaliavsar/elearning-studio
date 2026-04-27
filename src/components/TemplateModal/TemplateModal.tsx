// src/components/TemplateModal/TemplateModal.tsx
// Drop into elearning-studio/src/components/TemplateModal/
//
// Replaces the dropdown that the "+ New slide" button currently opens.
// Picks a template, calls back with a fully-formed Slide.

import React, { useEffect, useMemo, useState } from 'react';
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SLIDE_TEMPLATES.filter(t => {
      if (category !== 'All' && t.category !== category) return false;
      if (!q) return true;
      return t.name.toLowerCase().includes(q) || t.summary.toLowerCase().includes(q);
    });
  }, [query, category]);

  const selected = filtered.find(t => t.key === selectedKey) ?? filtered[0];

  // Keep selected in sync when filters change
  useEffect(() => {
    if (filtered.length && !filtered.find(t => t.key === selectedKey)) {
      const first = filtered[0];
      if (first) setSelectedKey(first.key);
    }
  }, [filtered, selectedKey]);

  // Keyboard
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'Enter' && selected) { e.preventDefault(); insert(selected); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        const i = filtered.findIndex(t => t.key === selectedKey);
        const next = filtered[Math.min(filtered.length - 1, i + 1)];
        if (next) setSelectedKey(next.key);
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const i = filtered.findIndex(t => t.key === selectedKey);
        const prev = filtered[Math.max(0, i - 1)];
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
        className="bg-white w-[1100px] max-w-[95vw] h-[680px] max-h-[92vh] rounded-lg shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#171D97]">New slide</p>
            <h2 className="text-2xl font-medium text-gray-900" style={{ fontFamily: 'Fraunces, serif' }}>
              Choose a template
            </h2>
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
        <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search templates…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 h-9 px-3 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#171D97]/20 focus:border-[#171D97]"
            autoFocus
          />
          <div className="flex gap-1">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`h-9 px-3 text-xs font-medium rounded-md transition ${
                  category === c
                    ? 'bg-[#171D97] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Body — split layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* List */}
          <div className="w-[340px] border-r border-gray-200 overflow-y-auto">
            {filtered.map(t => (
              <button
                key={t.key}
                onClick={() => setSelectedKey(t.key)}
                onDoubleClick={() => insert(t)}
                className={`w-full text-left px-5 py-3 border-b border-gray-100 transition ${
                  t.key === selected?.key ? 'bg-[#FAF8F4]' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{t.name}</span>
                  {t.badge && (
                    <span className="text-[9px] font-semibold tracking-wider uppercase text-[#D4A574] bg-[#D4A574]/10 px-1.5 py-0.5 rounded">
                      {t.badge}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-[#171D97]">{t.category}</span>
                  <span className="text-xs text-gray-500 truncate">{t.summary}</span>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-400">No templates match your search.</div>
            )}
          </div>

          {/* Preview */}
          <div className="flex-1 overflow-y-auto bg-[#FAF8F4] p-8">
            {selected && (
              <>
                <div className="bg-white rounded-md border border-gray-200 shadow-sm p-8 min-h-[320px] mb-6">
                  <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#171D97] mb-2">
                    Preview · {selected.category}
                  </p>
                  <h3 className="text-3xl font-medium text-gray-900 mb-3" style={{ fontFamily: 'Fraunces, serif' }}>
                    {selected.name}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-6">{selected.summary}</p>
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-[10px] font-semibold tracking-wider uppercase text-gray-500 mb-2">
                      Block structure ({selected.build().content.length + selected.build().questions.length} blocks)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.build().content.map((b, i) => (
                        <span key={i} className="text-[10px] font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded">
                          {b.type}
                        </span>
                      ))}
                      {selected.build().questions.map((q, i) => (
                        <span key={`q${i}`} className="text-[10px] font-mono text-[#D4A574] bg-[#D4A574]/10 px-2 py-1 rounded">
                          q:{q.type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => insert(selected)}
                  className="w-full h-12 bg-[#171D97] text-white text-sm font-medium rounded-md hover:bg-[#0A0C3F] transition"
                >
                  Insert &ldquo;{selected.name}&rdquo;
                  <span className="ml-2 text-xs opacity-60">↵</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
