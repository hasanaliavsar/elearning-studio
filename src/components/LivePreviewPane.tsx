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

// Real canvas size — matches a typical learner viewport so vw-based
// units inside the slide HTML render at their authored size. The
// outer wrapper then CSS-scales the whole thing down to fit the pane.
const REAL_W = 1280;
const REAL_H = 800;

export function LivePreviewPane({ course, slide }: Props) {
  // Pane content area is ~432px wide (460 - 28 px padding/border).
  const paneW = 432;
  const scale = paneW / REAL_W;
  const scaledH = REAL_H * scale;

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
        {/* Outer: takes the scaled-down dimensions in flow */}
        <div
          className="rounded-md shadow-sm overflow-hidden bg-white"
          style={{ width: paneW, height: scaledH }}
        >
          {/* Inner: renders at real size, then scales */}
          <div
            style={{
              width: REAL_W,
              height: REAL_H,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              position: 'relative',
              backgroundColor: slide.backgroundColor || '#FFFFFF',
              backgroundImage: slide.backgroundImage ? `url(${slide.backgroundImage})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              padding: slide.fullBleed ? 0 : 48,
              fontFamily: course.settings.fontFamily || 'Inter',
              overflow: 'hidden',
            }}
          >
            {slide.title && !slide.fullBleed && (
              <h2
                style={{
                  fontFamily: "'Fraunces', Georgia, serif",
                  fontSize: 32,
                  fontWeight: 400,
                  color: isDarkBg(slide.backgroundColor) ? '#FFFFFF' : '#0A0C3F',
                  letterSpacing: '-0.01em',
                  marginBottom: 24,
                }}
              >
                {slide.title}
              </h2>
            )}

            <div
              className={slide.fullBleed ? '' : `${slide.layout === 'two-column' ? 'grid grid-cols-2 gap-6' : 'space-y-5'}`}
              style={{ position: slide.fullBleed ? 'absolute' : 'static', inset: slide.fullBleed ? 0 : undefined }}
            >
              {slide.content.length === 0 ? (
                <p className="text-base text-gray-400 italic">No content blocks yet.</p>
              ) : (
                slide.content.map((b, i) => {
                  const w = typeof b.width === 'number' ? Math.max(20, Math.min(100, b.width)) : 100;
                  const al = b.align || 'left';
                  const wrap: React.CSSProperties = w >= 100 ? {} : {
                    width: `${w}%`,
                    marginLeft: al === 'left' ? 0 : 'auto',
                    marginRight: al === 'right' ? 0 : 'auto',
                  };
                  return (
                    <div key={b.id || i} style={wrap}>
                      <BlockPreview block={b} />
                    </div>
                  );
                })
              )}
            </div>

            {slide.questions.length > 0 && !slide.fullBleed && (
              <div className="mt-8 pt-5 border-t border-gray-200">
                <p className="text-xs font-semibold tracking-wider uppercase text-[#171D97] mb-2">
                  Quiz · {slide.questions.length} question{slide.questions.length === 1 ? '' : 's'}
                </p>
                <p className="text-sm text-gray-500">Open Preview to take the quiz.</p>
              </div>
            )}
          </div>
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
      <div style={{ borderRadius: 8, padding: 20, backgroundColor: p.bg, borderLeft: `4px solid ${p.border}`, color: p.text }}>
        {block.data?.calloutTitle && (
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: p.border }}>{block.data.calloutTitle}</p>
        )}
        <div style={{ fontSize: 16, lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: block.content || '' }} />
      </div>
    );
  }

  if (t === 'button') {
    return (
      <a
        href="#"
        onClick={e => e.preventDefault()}
        style={{ display: 'inline-block', padding: '12px 24px', borderRadius: 8, background: '#171D97', color: '#FFFFFF', textDecoration: 'none', fontSize: 16, fontWeight: 500 }}
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
      <div style={{ position: 'relative', borderRadius: 8, padding: 40, backgroundColor: '#FAF8F4' }}>
        <div style={{ position: 'absolute', left: 0, top: 32, bottom: 32, width: 3, backgroundColor: '#171D97' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 32, alignItems: 'start', paddingLeft: 16 }}>
          {useImage ? (
            <img src={d.pqPortraitUrl} alt={name} style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: 96, height: 96, borderRadius: '50%',
              background: 'linear-gradient(135deg, #171D97 0%, #0A0C3F 100%)',
              color: '#D4A574', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Fraunces', Georgia, serif", fontSize: 34, fontWeight: 500,
            }}>{initials}</div>
          )}
          <div>
            <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 64, lineHeight: 0.5, color: '#D4A574', display: 'block', marginBottom: 6 }}>“</span>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 22, lineHeight: 1.4, color: '#0A0C3F', fontWeight: 300, margin: '0 0 22px 0' }}>
              {d.pqQuote || 'Your quotation will appear here.'}
            </p>
            <div style={{ fontSize: 14, color: '#0A0C3F', fontWeight: 600 }}>{name || 'Name'}</div>
            {(d.pqRole || d.pqOrg) && (
              <div style={{ fontSize: 12, color: '#5C5A57', marginTop: 2 }}>
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
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#171D97', marginBottom: 6 }}>{block.data.cmpEyebrow}</p>
        )}
        {block.data.cmpTitle && (
          <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 24, fontWeight: 400, color: '#0A0C3F', marginBottom: 16 }}>{block.data.cmpTitle}</h3>
        )}
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: `repeat(${Math.min(cols.length, 4)}, minmax(0, 1fr))` }}>
          {cols.map(c => (
            <div key={c.id} style={{ position: 'relative', borderRadius: 8, padding: 16, backgroundColor: '#FFFFFF', border: c.featured ? '2px solid #D4A574' : '1px solid #E8E5DE' }}>
              {c.featured && c.ribbonLabel && (
                <span style={{ position: 'absolute', top: -10, left: 12, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 4, background: '#D4A574', color: '#FFFFFF' }}>{c.ribbonLabel}</span>
              )}
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#171D97', marginBottom: 4 }}>{c.eyebrow}</p>
              <p style={{ fontSize: 18, fontWeight: 500, fontFamily: "'Fraunces', Georgia, serif", color: '#0A0C3F', lineHeight: 1.15 }}>{c.title}</p>
              {c.subtitle && <p style={{ fontSize: 12, fontFamily: 'monospace', color: '#5C5A57', marginTop: 4 }}>{c.subtitle}</p>}
              <ul style={{ marginTop: 12, padding: 0, listStyle: 'none' }}>
                {c.bullets.map(b => (
                  <li key={b.id} style={{ fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4, color: b.included ? '#0A0C3F' : '#9CA3AF' }}>
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
      <ol style={{ listStyle: 'none', padding: 0, margin: 0, borderLeft: '3px solid #171D97' }}>
        {block.data.timelineEvents.map(ev => (
          <li key={ev.id} style={{ paddingLeft: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#0A0C3F', margin: 0 }}>{ev.title}</p>
            {ev.date && <p style={{ fontSize: 12, color: '#171D97', margin: '2px 0 0 0' }}>{ev.date}</p>}
            {ev.description && <p style={{ fontSize: 13, color: '#5C5A57', margin: '4px 0 0 0', lineHeight: 1.4 }}>{ev.description}</p>}
          </li>
        ))}
      </ol>
    );
  }

  if (t === 'checklist' && block.data?.checklistItems) {
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {block.data.checklistItems.map(item => (
          <li key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
            <span style={{ color: '#171D97', fontSize: 18, lineHeight: 1 }}>☑</span>
            <div>
              <p style={{ color: '#0A0C3F', fontWeight: 500, fontSize: 16, margin: 0 }}>{item.title}</p>
              {item.description && <p style={{ fontSize: 13, color: '#5C5A57', margin: '2px 0 0 0' }}>{item.description}</p>}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (t === 'table' && block.data?.tableHeaders) {
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr>{block.data.tableHeaders.map((h, i) => <th key={i} style={{ textAlign: 'left', padding: 8, borderBottom: '2px solid #0A0C3F', fontWeight: 600, color: '#0A0C3F' }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {(block.data.tableRows || []).map((row, ri) => (
            <tr key={ri}>{row.map((cell, ci) => <td key={ci} style={{ padding: 8, borderBottom: '1px solid #E8E5DE', color: '#5C5A57' }}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (t === 'accordion' && block.data?.accordionItems) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {block.data.accordionItems.map(item => (
          <details key={item.id} style={{ border: '1px solid #E8E5DE', borderRadius: 8, padding: 14 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 16, color: '#0A0C3F' }}>{item.title}</summary>
            <div style={{ marginTop: 10, fontSize: 14, color: '#5C5A57', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: item.content || '' }} />
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
      <div style={{ display: 'flex', flexDirection: horizontal ? (reverse ? 'row-reverse' : 'row') : (reverse ? 'column-reverse' : 'column'), gap: 16 }}>
        {imgs[0]?.url && <img src={imgs[0].url} alt={imgs[0].alt || ''} style={{ borderRadius: 8, flex: 1, maxWidth: horizontal ? '40%' : '100%', objectFit: 'cover' }} />}
        <div style={{ fontSize: 16, flex: 1, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: text }} />
      </div>
    );
  }

  // Fallback for interactive types
  if (INTERACTIVE_HINT_TYPES.has(t)) {
    return (
      <div style={{ borderRadius: 8, border: '2px dashed #171D97', padding: 20, textAlign: 'center', backgroundColor: '#EFF2FF' }}>
        <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#171D97', margin: 0 }}>{t.replace('-', ' ')}</p>
        <p style={{ fontSize: 13, marginTop: 4, color: '#5C5A57' }}>Open Preview to interact.</p>
      </div>
    );
  }

  // Generic fallback
  return (
    <div style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>[{t} block]</div>
  );
}
