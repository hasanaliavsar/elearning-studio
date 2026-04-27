// Live, read-only preview of the active slide.
// Mirrors the styling that Preview.tsx applies to each block, without
// the full Preview chrome (no header, no quiz interactivity, no nav).
//
// Designed to live next to the SlideEditor canvas so authors can see
// what their changes look like in real time.

import type { Course, Slide, ContentBlock } from '../types';

interface Props {
  course: Course;
  slide: Slide;
}

const INTERACTIVE_HINT_TYPES = new Set([
  'flip-card', 'hotspot', 'tabs', 'accordion', 'scenario',
  'card-sorting', 'labeled-graphic', 'audio', 'video', 'embed',
]);

export function LivePreviewPane({ course, slide }: Props) {
  return (
    <aside className="w-[460px] flex-shrink-0 border-l border-gray-200 bg-gray-50 overflow-y-auto">
      <div className="px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-semibold tracking-[0.16em] uppercase text-[#171D97]">Live preview</p>
            <p className="text-xs text-gray-500 mt-0.5">Updates as you edit</p>
          </div>
          <span className="text-[10px] text-gray-400">{slide.content.length} block{slide.content.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      <div className="p-4">
        <div
          className={`rounded-md shadow-sm relative ${slide.fullBleed ? 'overflow-hidden' : ''}`}
          style={{
            backgroundColor: slide.backgroundColor || '#FFFFFF',
            backgroundImage: slide.backgroundImage ? `url(${slide.backgroundImage})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            minHeight: 360,
            padding: slide.fullBleed ? 0 : 24,
            fontFamily: course.settings.fontFamily || 'Inter',
          }}
        >
          {slide.title && !slide.fullBleed && (
            <h2
              className="mb-4"
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: 22,
                fontWeight: 400,
                color: isDarkBg(slide.backgroundColor) ? '#FFFFFF' : '#0A0C3F',
                letterSpacing: '-0.01em',
              }}
            >
              {slide.title}
            </h2>
          )}

          <div className={slide.fullBleed ? '' : `space-y-4 ${slide.layout === 'two-column' ? 'grid grid-cols-2 gap-4 space-y-0' : ''}`}>
            {slide.content.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No content blocks yet.</p>
            ) : (
              slide.content.map((b, i) => <BlockPreview key={b.id || i} block={b} />)
            )}
          </div>

          {slide.questions.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-[10px] font-semibold tracking-wider uppercase text-[#171D97] mb-2">
                Quiz · {slide.questions.length} question{slide.questions.length === 1 ? '' : 's'}
              </p>
              <p className="text-xs text-gray-500">Open Preview to take the quiz.</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function isDarkBg(c: string | undefined): boolean {
  if (!c) return false;
  const dark = ['#0A0C3F', '#101258', '#171D97', '#0f172a', '#1e293b', '#101321'];
  return dark.includes(c.toUpperCase()) || dark.map(x => x.toLowerCase()).includes(c.toLowerCase());
}

function BlockPreview({ block }: { block: ContentBlock }) {
  const t = block.type;

  if (t === 'heading' || t === 'text') {
    return <div dangerouslySetInnerHTML={{ __html: block.content || '' }} />;
  }

  if (t === 'image') {
    return (
      <figure>
        <img src={block.content} alt={block.alt || ''} className="w-full rounded" />
        {block.caption && <figcaption className="text-xs text-gray-500 text-center mt-1">{block.caption}</figcaption>}
      </figure>
    );
  }

  if (t === 'divider') {
    return <hr className="my-3 border-gray-300" />;
  }

  if (t === 'callout') {
    const style = block.data?.calloutStyle || 'info';
    const palette: Record<string, { bg: string; border: string; text: string }> = {
      info: { bg: '#EFF2FF', border: '#171D97', text: '#0A0C3F' },
      warning: { bg: '#FFF7E6', border: '#D4A574', text: '#5C3A11' },
      danger: { bg: '#FEF2F2', border: '#C0392B', text: '#7A1A12' },
      success: { bg: '#F0FDF4', border: '#22C55E', text: '#14532D' },
    };
    const p = palette[style] || palette['info']!;
    return (
      <div className="rounded p-3" style={{ backgroundColor: p.bg, borderLeft: `3px solid ${p.border}`, color: p.text }}>
        {block.data?.calloutTitle && (
          <p className="text-xs font-semibold mb-1" style={{ color: p.border }}>{block.data.calloutTitle}</p>
        )}
        <div className="text-xs" dangerouslySetInnerHTML={{ __html: block.content || '' }} />
      </div>
    );
  }

  if (t === 'button') {
    return (
      <a
        href={block.data?.buttonUrl || '#'}
        target={block.data?.buttonNewTab ? '_blank' : undefined}
        rel="noopener noreferrer"
        className="inline-block px-4 py-2 rounded text-sm font-medium"
        style={{ background: '#171D97', color: '#FFFFFF', textDecoration: 'none' }}
        onClick={e => e.preventDefault()}
      >
        {block.data?.buttonText || 'Button'}
      </a>
    );
  }

  if (t === 'pull-quote') {
    const d = block.data || {};
    const name = d.pqName || '';
    const initials = (() => {
      const parts = name.trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) return '?';
      if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
      return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
    })();
    const useImage = d.pqAvatarMode === 'image' && d.pqPortraitUrl;
    return (
      <div className="relative rounded p-4" style={{ backgroundColor: '#FAF8F4' }}>
        <div style={{ position: 'absolute', left: 0, top: 16, bottom: 16, width: 2, backgroundColor: '#171D97' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 12, alignItems: 'start', paddingLeft: 8 }}>
          {useImage ? (
            <img src={d.pqPortraitUrl} alt={name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'linear-gradient(135deg, #171D97 0%, #0A0C3F 100%)',
              color: '#D4A574', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, fontWeight: 500,
            }}>{initials}</div>
          )}
          <div>
            <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 32, lineHeight: 0.5, color: '#D4A574', display: 'block', marginBottom: 4 }}>“</span>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 14, lineHeight: 1.4, color: '#0A0C3F', fontWeight: 300, margin: '0 0 8px 0' }}>
              {d.pqQuote || 'Your quotation will appear here.'}
            </p>
            <div style={{ fontSize: 11, color: '#0A0C3F', fontWeight: 600 }}>{name || 'Name'}</div>
            {(d.pqRole || d.pqOrg) && (
              <div style={{ fontSize: 10, color: '#5C5A57', marginTop: 1 }}>
                {d.pqRole}{d.pqRole && d.pqOrg && ' · '}{d.pqOrg && <b style={{ color: '#171D97' }}>{d.pqOrg}</b>}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (t === 'comparison' && block.data?.cmpColumns) {
    const cols = block.data.cmpColumns;
    return (
      <div>
        {block.data.cmpEyebrow && (
          <p className="text-[9px] font-semibold tracking-[0.18em] uppercase mb-1" style={{ color: '#171D97' }}>{block.data.cmpEyebrow}</p>
        )}
        {block.data.cmpTitle && (
          <h3 className="mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, fontWeight: 400, color: '#0A0C3F' }}>{block.data.cmpTitle}</h3>
        )}
        <div className={`grid gap-2 grid-cols-${Math.min(cols.length, 4)}`} style={{ gridTemplateColumns: `repeat(${Math.min(cols.length, 4)}, minmax(0, 1fr))` }}>
          {cols.map(c => (
            <div key={c.id} className="rounded p-2 relative" style={{ backgroundColor: '#FFFFFF', border: c.featured ? '1px solid #D4A574' : '1px solid #E8E5DE' }}>
              {c.featured && c.ribbonLabel && (
                <span className="absolute -top-1.5 left-2 text-[8px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded" style={{ background: '#D4A574', color: '#FFFFFF' }}>{c.ribbonLabel}</span>
              )}
              <p className="text-[8px] font-semibold tracking-wider uppercase mb-0.5" style={{ color: '#171D97' }}>{c.eyebrow}</p>
              <p className="text-[12px] font-medium" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#0A0C3F', lineHeight: 1.1 }}>{c.title}</p>
              {c.subtitle && <p className="text-[9px] font-mono mt-0.5" style={{ color: '#5C5A57' }}>{c.subtitle}</p>}
              <ul className="mt-2 space-y-0.5">
                {c.bullets.map(b => (
                  <li key={b.id} className="text-[10px] flex items-start gap-1" style={{ color: b.included ? '#0A0C3F' : '#9CA3AF' }}>
                    <span style={{ color: b.included ? '#171D97' : '#D1D5DB' }}>{b.included ? '✓' : '–'}</span>
                    <span>{b.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (t === 'timeline' && block.data?.timelineEvents) {
    return (
      <ol className="space-y-2 border-l-2 pl-3" style={{ borderColor: '#171D97' }}>
        {block.data.timelineEvents.map(ev => (
          <li key={ev.id} className="text-xs">
            <p className="font-semibold" style={{ color: '#0A0C3F' }}>{ev.title}</p>
            {ev.date && <p className="text-[10px]" style={{ color: '#171D97' }}>{ev.date}</p>}
            {ev.description && <p className="text-[11px] text-gray-600 mt-0.5">{ev.description}</p>}
          </li>
        ))}
      </ol>
    );
  }

  if (t === 'checklist' && block.data?.checklistItems) {
    return (
      <ul className="space-y-1">
        {block.data.checklistItems.map(item => (
          <li key={item.id} className="text-xs flex items-start gap-2">
            <span className="mt-0.5" style={{ color: '#171D97' }}>☑</span>
            <div>
              <p style={{ color: '#0A0C3F', fontWeight: 500 }}>{item.title}</p>
              {item.description && <p className="text-[10px]" style={{ color: '#5C5A57' }}>{item.description}</p>}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (t === 'table' && block.data?.tableHeaders) {
    return (
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>{block.data.tableHeaders.map((h, i) => <th key={i} className="text-left p-1 border-b font-semibold" style={{ color: '#0A0C3F' }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {(block.data.tableRows || []).map((row, ri) => (
            <tr key={ri}>{row.map((cell, ci) => <td key={ci} className="p-1 border-b border-gray-100" style={{ color: '#5C5A57' }}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (t === 'accordion' && block.data?.accordionItems) {
    return (
      <div className="space-y-1">
        {block.data.accordionItems.map(item => (
          <details key={item.id} className="border rounded p-2 text-xs" style={{ borderColor: '#E8E5DE' }}>
            <summary className="cursor-pointer font-medium" style={{ color: '#0A0C3F' }}>{item.title}</summary>
            <div className="mt-1 text-[11px] text-gray-600" dangerouslySetInnerHTML={{ __html: item.content || '' }} />
          </details>
        ))}
      </div>
    );
  }

  // Image layout blocks
  if (t === 'image-top' || t === 'image-bottom' || t === 'image-left' || t === 'image-right') {
    const reverse = t === 'image-bottom' || t === 'image-right';
    const horizontal = t === 'image-left' || t === 'image-right';
    const imgs = block.data?.layoutImages || [];
    const text = block.data?.layoutText || '';
    return (
      <div className={horizontal ? `flex gap-3 ${reverse ? 'flex-row-reverse' : ''}` : `flex flex-col ${reverse ? 'flex-col-reverse' : ''} gap-3`}>
        {imgs[0]?.url && <img src={imgs[0].url} alt={imgs[0].alt || ''} className="rounded flex-1 max-w-[40%] object-cover" />}
        <div className="text-xs flex-1" dangerouslySetInnerHTML={{ __html: text }} />
      </div>
    );
  }

  // Fallback for interactive types
  if (INTERACTIVE_HINT_TYPES.has(t)) {
    return (
      <div className="rounded border border-dashed p-3 text-center" style={{ borderColor: '#171D97', backgroundColor: '#EFF2FF' }}>
        <p className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: '#171D97' }}>{t.replace('-', ' ')}</p>
        <p className="text-[10px] mt-0.5" style={{ color: '#5C5A57' }}>Open Preview to interact.</p>
      </div>
    );
  }

  // Generic fallback
  return (
    <div className="text-[10px] text-gray-400 italic">[{t} block]</div>
  );
}
