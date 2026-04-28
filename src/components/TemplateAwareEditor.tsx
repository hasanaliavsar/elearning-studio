// Template-aware editor: detects well-known template HTML structures
// (e.g. the Module cover's full-bleed navy hero) and exposes the editable
// text fields as labelled inputs, while preserving the surrounding styled
// wrapper untouched. Falls back to a raw-HTML textarea if the structure
// can't be recognised.
//
// Why: TipTap can't preserve <div style=…> wrappers. A raw HTML textarea
// works but is hostile UX. This middle layer gives authors a clean form
// for the common case (one Module-cover template per chapter) without
// losing the styling.

import { useMemo } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  content: string;
  onChange: (html: string) => void;
}

// Detects the Module cover template shape produced by templates.ts.
// Marker: outer absolute div + 135deg navy gradient.
export function isModuleCoverHtml(html: string): boolean {
  if (!html) return false;
  return /position\s*:\s*absolute[^"]*background\s*:\s*linear-gradient\(135deg\s*,\s*#171D97/i.test(html);
}

// Generic structural HTML detector — used as the fallback gate.
export function isStructuralHtml(html: string): boolean {
  if (!html) return false;
  if (/<div[^>]*style=["'][^"']*position\s*:\s*absolute/i.test(html)) return true;
  if (/<div[^>]*style=["'][^"']*background\s*:\s*linear-gradient/i.test(html)) return true;
  if (/clamp\s*\(/.test(html)) return true;
  return false;
}

interface ModuleCoverFields {
  eyebrow: string;
  title: string;
  subtitle: string;
  moduleLabel: string;
}

function parseModuleCover(html: string): ModuleCoverFields | null {
  if (typeof window === 'undefined') return null;
  try {
    const doc = new DOMParser().parseFromString(`<root>${html}</root>`, 'text/html');
    const root = doc.body.querySelector('root') ?? doc.body;
    // The structure: outer div > radial overlay > content div > [eyebrow p, h1, subtitle p, divider div, module-label p]
    // Walk to the deepest content container (div with position:relative;max-width)
    const contentDivs = Array.from(root.querySelectorAll('div')).filter(d => {
      const s = (d.getAttribute('style') || '').toLowerCase();
      return s.includes('position:relative') && s.includes('max-width');
    });
    const content = contentDivs[0];
    if (!content) return null;

    const ps = Array.from(content.querySelectorAll(':scope > p'));
    const h1 = content.querySelector(':scope > h1');
    if (!h1 || ps.length < 2) return null;

    return {
      eyebrow: (ps[0]?.textContent || '').trim(),
      title: (h1.innerHTML || '').replace(/<br\s*\/?>/gi, '\n').trim(),
      subtitle: (ps[1]?.textContent || '').trim(),
      moduleLabel: (ps[2]?.textContent || '').trim(),
    };
  } catch {
    return null;
  }
}

function rebuildModuleCover(prevHtml: string, fields: ModuleCoverFields): string {
  if (typeof window === 'undefined') return prevHtml;
  try {
    const doc = new DOMParser().parseFromString(`<root>${prevHtml}</root>`, 'text/html');
    const root = doc.body.querySelector('root') ?? doc.body;
    const contentDivs = Array.from(root.querySelectorAll('div')).filter(d => {
      const s = (d.getAttribute('style') || '').toLowerCase();
      return s.includes('position:relative') && s.includes('max-width');
    });
    const content = contentDivs[0];
    if (!content) return prevHtml;

    const ps = Array.from(content.querySelectorAll(':scope > p'));
    const h1 = content.querySelector(':scope > h1');
    if (!h1 || ps.length < 2) return prevHtml;

    if (ps[0]) ps[0].textContent = fields.eyebrow;
    h1.innerHTML = fields.title.replace(/\n/g, '<br/>');
    if (ps[1]) ps[1].textContent = fields.subtitle;
    if (ps[2]) ps[2].textContent = fields.moduleLabel;

    return root.innerHTML;
  } catch {
    return prevHtml;
  }
}

export function ModuleCoverEditor({ content, onChange }: Props) {
  const fields = useMemo(() => parseModuleCover(content), [content]);

  // Defensive — if parse fails, render the raw editor below
  if (!fields) return <RawHtmlEditor content={content} onChange={onChange} />;

  const set = (patch: Partial<ModuleCoverFields>) => {
    onChange(rebuildModuleCover(content, { ...fields, ...patch }));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 text-[11px] text-[#171D97] bg-[#EFF2FF] border border-[#171D97]/15 rounded p-2">
        <span className="text-base leading-none mt-px">✨</span>
        <span>Module cover template — edit the four fields below and the styled hero rebuilds automatically.</span>
      </div>

      <FieldRow label="Eyebrow" hint="Small uppercase label above the title">
        <input
          className="input text-xs"
          placeholder="Internal training"
          value={fields.eyebrow}
          onChange={e => set({ eyebrow: e.target.value })}
        />
      </FieldRow>

      <FieldRow label="Title" hint="Use Enter for line breaks (Fraunces serif, large display)">
        <textarea
          className="input text-sm font-serif"
          rows={3}
          placeholder={'Product\nEmergency Process'}
          value={fields.title}
          onChange={e => set({ title: e.target.value })}
        />
      </FieldRow>

      <FieldRow label="Subtitle">
        <input
          className="input text-xs"
          placeholder="A Stakeholder's Guide to Crisis Response at Moonfare"
          value={fields.subtitle}
          onChange={e => set({ subtitle: e.target.value })}
        />
      </FieldRow>

      <FieldRow label="Module label" hint="Small uppercase label at the bottom of the hero">
        <input
          className="input text-xs"
          placeholder="Module 1: Introduction & Why It Matters"
          value={fields.moduleLabel}
          onChange={e => set({ moduleLabel: e.target.value })}
        />
      </FieldRow>

      <details className="text-[11px] text-gray-500">
        <summary className="cursor-pointer hover:text-gray-700">Edit raw HTML (advanced)</summary>
        <RawHtmlEditor content={content} onChange={onChange} />
      </details>
    </div>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label text-xs">{label}</label>
      {hint && <p className="text-[10px] text-gray-500 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

export function RawHtmlEditor({ content, onChange }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
        <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>Styled HTML — editing here preserves the layout. The rich-text editor would strip the <code className="font-mono">&lt;div&gt;</code> structure.</span>
      </div>
      <textarea
        value={content}
        onChange={e => onChange(e.target.value)}
        spellCheck={false}
        className="w-full font-mono text-[11px] leading-snug bg-gray-50 border border-gray-200 rounded p-2 focus:outline-none focus:border-brand-500"
        rows={Math.min(20, Math.max(6, content.split('\n').length + 1))}
      />
    </div>
  );
}
