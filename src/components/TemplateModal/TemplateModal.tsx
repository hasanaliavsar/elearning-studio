// src/components/TemplateModal/TemplateModal.tsx
// 3-column card grid template picker with hand-coded SVG thumbnails.
//
// Drop alongside thumbnails.tsx. Same path: src/components/TemplateModal/
//
// Public contract:
//   <TemplateModal open onClose onInsert={slide => …} />
// Pulls templates from src/data/templates.ts.

import React, { useEffect, useMemo, useState } from 'react';
import type { Slide } from '../../types';
import { SLIDE_TEMPLATES, SlideTemplate } from '../../data/templates';
import { THUMBNAILS } from './thumbnails';

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
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SLIDE_TEMPLATES.filter(t => {
      if (category !== 'All' && t.category !== category) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });
  }, [query, category]);

  // Keyboard
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  function insert(t: SlideTemplate) {
    onInsert(t.build());
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      style={{ fontFamily: "-apple-system, system-ui, 'Helvetica Neue', Arial, sans-serif" }}
    >
      <div
        className="w-[1180px] max-w-[96vw] h-[760px] max-h-[94vh] rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ backgroundColor: '#FAF8F4' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-8 pt-7 pb-5">
          <div>
            <p
              className="text-[10px] font-semibold tracking-[0.16em] uppercase mb-1"
              style={{ color: '#171D97' }}
            >
              New slide
            </p>
            <h2
              className="text-[32px] leading-tight font-medium"
              style={{ fontFamily: "Fraunces, 'Times New Roman', Georgia, serif", color: '#0A0C3F', letterSpacing: '-0.02em' }}
            >
              Choose a template
            </h2>
            <p className="text-sm mt-1.5" style={{ color: '#5C5A57' }}>
              Each template is a fully designed starting point. You can edit anything after inserting.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-md flex items-center justify-center text-base transition"
            style={{ color: '#5C5A57' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 px-8 pb-5">
          <div className="relative flex-1 max-w-[360px]">
            <input
              type="text"
              placeholder="Search templates…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-sm rounded-md focus:outline-none transition"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E8E5DE',
                color: '#1A1A1F',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#171D97')}
              onBlur={e => (e.currentTarget.style.borderColor = '#E8E5DE')}
              autoFocus
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2"
              width="14" height="14" viewBox="0 0 16 16" fill="none"
            >
              <circle cx="7" cy="7" r="5" stroke="#5C5A57" strokeWidth="1.5" />
              <path d="M11 11l3 3" stroke="#5C5A57" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map(c => {
              const active = category === c;
              return (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className="h-9 px-3.5 text-xs font-medium rounded-md transition"
                  style={{
                    backgroundColor: active ? '#171D97' : '#FFFFFF',
                    color: active ? '#FFFFFF' : '#1A1A1F',
                    border: `1px solid ${active ? '#171D97' : '#E8E5DE'}`,
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
          <div className="flex-1" />
          <span className="text-xs" style={{ color: '#5C5A57' }}>
            {filtered.length} {filtered.length === 1 ? 'template' : 'templates'}
          </span>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          {filtered.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm" style={{ color: '#5C5A57' }}>No templates match your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-5">
              {filtered.map(t => {
                const Thumb = THUMBNAILS[t.key];
                const isHovered = hoveredKey === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => insert(t)}
                    onMouseEnter={() => setHoveredKey(t.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                    className="text-left rounded-lg overflow-hidden transition group"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: `1px solid ${isHovered ? '#171D97' : '#E8E5DE'}`,
                      boxShadow: isHovered
                        ? '0 12px 28px -8px rgba(23, 29, 151, 0.18)'
                        : '0 1px 2px rgba(10, 12, 63, 0.04)',
                      transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                    }}
                  >
                    {/* Thumbnail */}
                    <div
                      className="relative w-full"
                      style={{
                        aspectRatio: '320 / 200',
                        backgroundColor: '#FAF8F4',
                        borderBottom: '1px solid #E8E5DE',
                      }}
                    >
                      {Thumb ? (
                        <Thumb className="w-full h-full block" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: '#5C5A57' }}>
                          {t.name}
                        </div>
                      )}
                      {t.badge && (
                        <span
                          className="absolute top-2.5 right-2.5 text-[9px] font-bold tracking-[0.12em] uppercase px-2 py-1 rounded"
                          style={{
                            backgroundColor: '#D4A574',
                            color: '#0A0C3F',
                          }}
                        >
                          {t.badge}
                        </span>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="px-4 py-3.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className="text-[10px] font-semibold tracking-[0.12em] uppercase"
                          style={{ color: '#171D97' }}
                        >
                          {t.category}
                        </span>
                        <span
                          className="text-[10px] font-medium opacity-0 group-hover:opacity-100 transition"
                          style={{ color: '#171D97' }}
                        >
                          Insert →
                        </span>
                      </div>
                      <h3
                        className="text-[15px] font-medium mb-1"
                        style={{
                          fontFamily: "Fraunces, 'Times New Roman', Georgia, serif",
                          color: '#0A0C3F',
                          letterSpacing: '-0.005em',
                        }}
                      >
                        {t.name}
                      </h3>
                      <p
                        className="text-xs leading-relaxed line-clamp-2"
                        style={{ color: '#5C5A57' }}
                      >
                        {t.summary}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
