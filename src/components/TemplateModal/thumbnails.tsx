// src/components/TemplateModal/thumbnails.tsx
// Hand-coded mini-preview per template. Pure SVG — no external assets.
// 320×200 viewBox; cards scale them with CSS.

import React from 'react';

const NAVY = '#171D97';
const NAVY_DEEP = '#0A0C3F';
const SAND = '#D4A574';
const PAPER = '#FAF8F4';
const WHITE = '#FFFFFF';
const INK = '#1A1A1F';
const MUTE = '#5C5A57';
const RULE = '#E8E5DE';

const FRAUNCES = "Fraunces, 'Times New Roman', Georgia, serif";
const SANS = "-apple-system, system-ui, 'Helvetica Neue', Arial, sans-serif";

interface ThumbProps { className?: string }
const wrap = (children: React.ReactNode, bg: string = WHITE, props: ThumbProps = {}) => (
  <svg
    viewBox="0 0 320 200"
    preserveAspectRatio="xMidYMid slice"
    className={props.className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="320" height="200" fill={bg} />
    {children}
  </svg>
);

const Eyebrow = ({ x, y, text, color = NAVY }: { x: number; y: number; text: string; color?: string }) => (
  <text x={x} y={y} fontFamily={SANS} fontSize="6" fontWeight="700" letterSpacing="1" fill={color}>
    {text.toUpperCase()}
  </text>
);

// 1. Blank
export const ThumbBlank = (p: ThumbProps) => wrap(
  <>
    <rect x="20" y="20" width="280" height="160" fill={PAPER} stroke={RULE} strokeDasharray="4 4" />
    <text x="160" y="105" fontFamily={SANS} fontSize="11" fill={MUTE} textAnchor="middle">empty canvas</text>
  </>, WHITE, p
);

// 2. Number lead
export const ThumbNumberLead = (p: ThumbProps) => wrap(
  <>
    <Eyebrow x={24} y={30} text="By the numbers" />
    <text x="24" y="120" fontFamily={FRAUNCES} fontSize="92" fontWeight="500" fill={NAVY_DEEP}>
      23<tspan fill={SAND}>%</tspan>
    </text>
    <text x="24" y="148" fontFamily={FRAUNCES} fontSize="11" fill={INK} fontStyle="italic">of HNW now allocate to</text>
    <text x="24" y="162" fontFamily={FRAUNCES} fontSize="11" fill={INK} fontStyle="italic">private equity.</text>
    <rect x="24" y="172" width="80" height="2" fill={SAND} />
  </>, PAPER, p
);

// 3. Editorial split
export const ThumbEditorialSplit = (p: ThumbProps) => wrap(
  <>
    <Eyebrow x={24} y={28} text="Module 02" />
    <text x="24" y="56" fontFamily={FRAUNCES} fontSize="22" fontWeight="500" fill={NAVY_DEEP}>The case for</text>
    <text x="24" y="80" fontFamily={FRAUNCES} fontSize="22" fontWeight="500" fontStyle="italic" fill={NAVY}>private markets</text>
    <rect x="24" y="98" width="130" height="78" fill={NAVY_DEEP} />
    <circle cx="89" cy="137" r="14" fill={SAND} opacity="0.7" />
    <rect x="170" y="98" width="60" height="36" fill={PAPER} stroke={RULE} />
    <rect x="236" y="98" width="60" height="36" fill={PAPER} stroke={RULE} />
    <rect x="170" y="140" width="126" height="3" fill={INK} opacity="0.7" />
    <rect x="170" y="148" width="100" height="3" fill={INK} opacity="0.4" />
    <rect x="170" y="156" width="115" height="3" fill={INK} opacity="0.4" />
    <rect x="170" y="164" width="80" height="3" fill={INK} opacity="0.4" />
  </>, WHITE, p
);

// 4. Pull quote
export const ThumbPullQuote = (p: ThumbProps) => wrap(
  <>
    <text x="160" y="60" fontFamily={FRAUNCES} fontSize="42" fill={SAND} textAnchor="middle">&ldquo;</text>
    <text x="160" y="105" fontFamily={FRAUNCES} fontSize="16" fontWeight="500" fontStyle="italic" fill={NAVY_DEEP} textAnchor="middle">You can&rsquo;t predict.</text>
    <text x="160" y="125" fontFamily={FRAUNCES} fontSize="16" fontWeight="500" fontStyle="italic" fill={NAVY_DEEP} textAnchor="middle">You can prepare.</text>
    <line x1="130" y1="148" x2="190" y2="148" stroke={RULE} strokeWidth="1" />
    <Eyebrow x={125} y={162} text="Howard Marks" />
    <text x="160" y="174" fontFamily={SANS} fontSize="7" fill={MUTE} textAnchor="middle">Oaktree Capital</text>
  </>, PAPER, p
);

// 5. Data dashboard
export const ThumbDataDashboard = (p: ThumbProps) => wrap(
  <>
    <Eyebrow x={20} y={26} text="Lesson opener" />
    <text x="20" y="48" fontFamily={FRAUNCES} fontSize="14" fontWeight="500" fill={NAVY_DEEP}>PE in numbers</text>
    <line x1="20" y1="58" x2="300" y2="58" stroke={RULE} />
    <text x="20" y="92" fontFamily={FRAUNCES} fontSize="26" fontWeight="500" fill={NAVY}>$8.2T</text>
    <text x="20" y="104" fontFamily={SANS} fontSize="6" fontWeight="700" fill={INK} letterSpacing="0.5">GLOBAL AUM</text>
    <text x="120" y="92" fontFamily={FRAUNCES} fontSize="26" fontWeight="500" fill={NAVY}>14.2<tspan fill={SAND}>%</tspan></text>
    <text x="120" y="104" fontFamily={SANS} fontSize="6" fontWeight="700" fill={INK} letterSpacing="0.5">25-YR IRR</text>
    <text x="220" y="92" fontFamily={FRAUNCES} fontSize="26" fontWeight="500" fill={NAVY}>10<tspan fontSize="14">yrs</tspan></text>
    <text x="220" y="104" fontFamily={SANS} fontSize="6" fontWeight="700" fill={INK} letterSpacing="0.5">FUND LIFE</text>
    <line x1="20" y1="118" x2="300" y2="118" stroke={RULE} />
    <line x1="20" y1="132" x2="300" y2="132" stroke={RULE} />
    <line x1="20" y1="148" x2="300" y2="148" stroke={RULE} />
    <line x1="20" y1="164" x2="300" y2="164" stroke={RULE} />
    <line x1="20" y1="180" x2="300" y2="180" stroke={RULE} />
    <text x="26" y="128" fontFamily={SANS} fontSize="6" fontWeight="700" fill={INK}>STRATEGY</text>
    <text x="120" y="128" fontFamily={SANS} fontSize="6" fontWeight="700" fill={INK}>TOP</text>
    <text x="180" y="128" fontFamily={SANS} fontSize="6" fontWeight="700" fill={INK}>MEDIAN</text>
    <text x="250" y="128" fontFamily={SANS} fontSize="6" fontWeight="700" fill={INK}>BOTTOM</text>
    <text x="26" y="144" fontFamily={SANS} fontSize="7" fill={INK}>Buyout</text>
    <text x="26" y="160" fontFamily={SANS} fontSize="7" fill={INK}>Growth</text>
    <text x="26" y="176" fontFamily={SANS} fontSize="7" fill={INK}>VC</text>
  </>, WHITE, p
);

// 6. Cover with hotspots
export const ThumbCoverHotspots = (p: ThumbProps) => wrap(
  <>
    <rect width="320" height="200" fill={NAVY_DEEP} />
    <circle cx="60" cy="170" r="80" fill={NAVY} opacity="0.6" />
    <circle cx="280" cy="40" r="60" fill={SAND} opacity="0.25" />
    <Eyebrow x={20} y={30} text="Chapter 03" color={SAND} />
    <text x="20" y="62" fontFamily={FRAUNCES} fontSize="20" fontWeight="500" fill={PAPER}>How a fund</text>
    <text x="20" y="86" fontFamily={FRAUNCES} fontSize="20" fontWeight="500" fill={PAPER}>makes money</text>
    <text x="20" y="108" fontFamily={FRAUNCES} fontSize="9" fontStyle="italic" fill={PAPER} opacity="0.7">From capital call to distribution.</text>
    <circle cx="200" cy="140" r="10" fill={SAND} />
    <circle cx="200" cy="140" r="14" fill="none" stroke={SAND} opacity="0.5" />
    <text x="200" y="143" fontFamily={SANS} fontSize="8" fontWeight="700" fill={NAVY_DEEP} textAnchor="middle">1</text>
    <circle cx="245" cy="170" r="10" fill={SAND} />
    <text x="245" y="173" fontFamily={SANS} fontSize="8" fontWeight="700" fill={NAVY_DEEP} textAnchor="middle">2</text>
    <circle cx="280" cy="125" r="10" fill={SAND} />
    <text x="280" y="128" fontFamily={SANS} fontSize="8" fontWeight="700" fill={NAVY_DEEP} textAnchor="middle">3</text>
  </>, NAVY_DEEP, p
);

// 7. Glossary
export const ThumbGlossary = (p: ThumbProps) => wrap(
  <>
    <Eyebrow x={20} y={26} text="Reference" />
    <text x="20" y="48" fontFamily={FRAUNCES} fontSize="16" fontWeight="500" fill={NAVY_DEEP}>Glossary of terms</text>
    <rect x="20" y="64" width="80" height="22" fill={NAVY} />
    <text x="60" y="79" fontFamily={SANS} fontSize="8" fontWeight="600" fill={WHITE} textAnchor="middle">Mechanics</text>
    <rect x="100" y="64" width="80" height="22" fill={PAPER} />
    <text x="140" y="79" fontFamily={SANS} fontSize="8" fill={MUTE} textAnchor="middle">Returns</text>
    <rect x="180" y="64" width="80" height="22" fill={PAPER} />
    <text x="220" y="79" fontFamily={SANS} fontSize="8" fill={MUTE} textAnchor="middle">Deal types</text>
    <line x1="20" y1="100" x2="300" y2="100" stroke={RULE} />
    <text x="20" y="115" fontFamily={SANS} fontSize="9" fontWeight="600" fill={INK}>AUM</text>
    <text x="290" y="115" fontFamily={SANS} fontSize="11" fill={MUTE} textAnchor="end">+</text>
    <line x1="20" y1="124" x2="300" y2="124" stroke={RULE} />
    <text x="20" y="139" fontFamily={SANS} fontSize="9" fontWeight="600" fill={INK}>Capital call</text>
    <text x="290" y="139" fontFamily={SANS} fontSize="11" fill={NAVY} textAnchor="end">−</text>
    <text x="20" y="153" fontFamily={SANS} fontSize="7" fill={MUTE}>When a fund formally requests committed</text>
    <text x="20" y="163" fontFamily={SANS} fontSize="7" fill={MUTE}>capital from its limited partners.</text>
    <line x1="20" y1="172" x2="300" y2="172" stroke={RULE} />
    <text x="20" y="187" fontFamily={SANS} fontSize="9" fontWeight="600" fill={INK}>Carried interest</text>
    <text x="290" y="187" fontFamily={SANS} fontSize="11" fill={MUTE} textAnchor="end">+</text>
  </>, WHITE, p
);

// 8. Timeline
export const ThumbTimeline = (p: ThumbProps) => {
  const stops = [
    { x: 32,  label: 'Y0',    title: 'Close',   active: false },
    { x: 96,  label: 'Y1-5',  title: 'Invest',  active: false },
    { x: 160, label: 'Y3-7',  title: 'Build',   active: true },
    { x: 224, label: 'Y5-10', title: 'Harvest', active: false },
    { x: 288, label: 'Y10+',  title: 'Wind',    active: false },
  ];
  return wrap(
    <>
      <Eyebrow x={20} y={26} text="From close to wind-down" />
      <text x="20" y="48" fontFamily={FRAUNCES} fontSize="14" fontWeight="500" fill={NAVY_DEEP}>A typical fund lifecycle</text>
      <line x1="32" y1="100" x2="288" y2="100" stroke={RULE} strokeWidth="2" />
      {stops.map((s, i) => (
        <g key={i}>
          <circle cx={s.x} cy={100} r={6} fill={s.active ? SAND : NAVY} />
          <text x={s.x} y={86} fontFamily={SANS} fontSize="6" fontWeight="700" fill={NAVY} textAnchor="middle">{s.label}</text>
          <text x={s.x} y={120} fontFamily={SANS} fontSize="7" fill={INK} textAnchor="middle">{s.title}</text>
        </g>
      ))}
      {[20, 92, 164, 236].map((x, i) => (
        <g key={i}>
          <rect x={x} y={138} width="64" height="42" fill={PAPER} stroke={RULE} />
          <circle cx={x + 32} cy={159} r={8} fill={NAVY} opacity="0.3" />
        </g>
      ))}
    </>, WHITE, p
  );
};

// 9. Knowledge check
export const ThumbKnowledgeCheck = (p: ThumbProps) => wrap(
  <>
    <Eyebrow x={20} y={26} text="Knowledge check" color={SAND} />
    <text x="20" y="48" fontFamily={FRAUNCES} fontSize="14" fontWeight="500" fill={NAVY_DEEP}>Let&rsquo;s see what stuck.</text>
    <rect x="20" y="62" width="280" height="118" fill={PAPER} stroke={RULE} />
    <text x="32" y="80" fontFamily={SANS} fontSize="6" fontWeight="700" fill={NAVY}>Q1 OF 6</text>
    <text x="32" y="96" fontFamily={SANS} fontSize="9" fill={INK}>A capital call lands. Best next step?</text>
    <circle cx="40" cy="116" r="5" fill={WHITE} stroke={RULE} />
    <text x="52" y="119" fontFamily={SANS} fontSize="8" fill={INK}>Sell long-term holdings</text>
    <circle cx="40" cy="134" r="5" fill={NAVY} />
    <circle cx="40" cy="134" r="2" fill={WHITE} />
    <text x="52" y="137" fontFamily={SANS} fontSize="8" fontWeight="600" fill={INK}>Draw on liquidity line</text>
    <circle cx="40" cy="152" r="5" fill={WHITE} stroke={RULE} />
    <text x="52" y="155" fontFamily={SANS} fontSize="8" fill={INK}>Default on the call</text>
    <circle cx="40" cy="170" r="5" fill={WHITE} stroke={RULE} />
    <text x="52" y="173" fontFamily={SANS} fontSize="8" fill={INK}>Request an extension</text>
  </>, WHITE, p
);

// 10. Card sort
export const ThumbCardSort = (p: ThumbProps) => {
  const buckets = ['Buyout', 'Growth', 'VC', 'Credit'];
  return wrap(
    <>
      <Eyebrow x={20} y={26} text="Applied exercise" color={SAND} />
      <text x="20" y="48" fontFamily={FRAUNCES} fontSize="13" fontWeight="500" fill={NAVY_DEEP}>Sort the strategies</text>
      {buckets.map((b, i) => {
        const x = 20 + i * 70;
        return (
          <g key={i}>
            <rect x={x} y={62} width={64} height={80} fill={PAPER} stroke={RULE} strokeDasharray="3 3" />
            <text x={x + 32} y={76} fontFamily={SANS} fontSize="7" fontWeight="700" fill={NAVY} textAnchor="middle">{b.toUpperCase()}</text>
          </g>
        );
      })}
      <rect x="22" y="84" width="60" height="22" fill={WHITE} stroke={NAVY} strokeWidth="1" />
      <text x="52" y="98" fontFamily={SANS} fontSize="6" fill={INK} textAnchor="middle">$400M industrial</text>
      <rect x="162" y="84" width="60" height="22" fill={WHITE} stroke={NAVY} strokeWidth="1" />
      <text x="192" y="98" fontFamily={SANS} fontSize="6" fill={INK} textAnchor="middle">Series B SaaS</text>
      <rect x="100" y="155" width="120" height="26" fill={WHITE} stroke={SAND} strokeWidth="1.5" />
      <text x="160" y="171" fontFamily={SANS} fontSize="7" fill={INK} textAnchor="middle">$5M seed AI startup</text>
      <text x="160" y="153" fontFamily={SANS} fontSize="6" fill={MUTE} textAnchor="middle">↑ drag to bucket</text>
    </>, WHITE, p
  );
};

// 11. Process walkthrough
export const ThumbProcess = (p: ThumbProps) => {
  const steps = ['Establish floor', 'Quantify horizon', 'Stress-test cash flow', 'Set range'];
  return wrap(
    <>
      <Eyebrow x={20} y={26} text="How-to · 6 steps" />
      <text x="20" y="48" fontFamily={FRAUNCES} fontSize="14" fontWeight="500" fill={NAVY_DEEP}>How to size a PE allocation</text>
      <rect x="20" y="62" width="120" height="76" fill={NAVY_DEEP} />
      <polygon points="68,90 68,110 88,100" fill={SAND} />
      <text x="80" y="148" fontFamily={SANS} fontSize="7" fill={MUTE} textAnchor="middle">Walkthrough · 12:04</text>
      {steps.map((s, i) => {
        const y = 70 + i * 18;
        const checked = i < 2;
        return (
          <g key={i}>
            <rect x="152" y={y - 7} width="10" height="10" fill={checked ? NAVY : WHITE} stroke={RULE} />
            {checked && <polyline points={`154,${y - 2} 156,${y + 1} 160,${y - 4}`} stroke={WHITE} strokeWidth="1.5" fill="none" />}
            <text x="168" y={y + 1} fontFamily={SANS} fontSize="8" fill={checked ? MUTE : INK} textDecoration={checked ? 'line-through' : 'none'}>{s}</text>
          </g>
        );
      })}
      <rect x="152" y="148" width="148" height="4" fill={PAPER} />
      <rect x="152" y="148" width="74" height="4" fill={SAND} />
      <text x="152" y="166" fontFamily={SANS} fontSize="6" fill={MUTE}>2 of 4 complete</text>
      <rect x="20" y="148" width="120" height="22" fill={NAVY} />
      <text x="80" y="163" fontFamily={SANS} fontSize="8" fontWeight="600" fill={WHITE} textAnchor="middle">↓ Worksheet (.xlsx)</text>
    </>, WHITE, p
  );
};

// 12. Compare & contrast
export const ThumbCompare = (p: ThumbProps) => {
  const rows: [string, string, string][] = [
    ['Position', 'Equity', 'Senior'],
    ['Net IRR',  '15-25%', '8-12%'],
    ['Hold',     '4-7y',   '3-5y'],
    ['Income',   '~10%',   '~80%'],
  ];
  return wrap(
    <>
      <Eyebrow x={20} y={26} text="Compare & contrast" />
      <text x="20" y="48" fontFamily={FRAUNCES} fontSize="13" fontWeight="500" fill={NAVY_DEEP}>PE vs. PD — when does each win?</text>
      <line x1="20" y1="62" x2="300" y2="62" stroke={INK} strokeWidth="1.5" />
      <text x="26"  y="76" fontFamily={SANS} fontSize="6" fontWeight="700" fill={INK}>DIMENSION</text>
      <text x="135" y="76" fontFamily={SANS} fontSize="6" fontWeight="700" fill={NAVY}>PRIVATE EQUITY</text>
      <text x="225" y="76" fontFamily={SANS} fontSize="6" fontWeight="700" fill={SAND}>PRIVATE DEBT</text>
      <line x1="20" y1="84" x2="300" y2="84" stroke={RULE} />
      {rows.map((row, i) => {
        const y = 100 + i * 18;
        return (
          <g key={i}>
            <text x="26"  y={y} fontFamily={SANS} fontSize="8" fill={INK}>{row[0]}</text>
            <text x="135" y={y} fontFamily={SANS} fontSize="8" fontWeight="600" fill={NAVY}>{row[1]}</text>
            <text x="225" y={y} fontFamily={SANS} fontSize="8" fontWeight="600" fill={SAND}>{row[2]}</text>
            <line x1="20" y1={y + 6} x2="300" y2={y + 6} stroke={RULE} />
          </g>
        );
      })}
    </>, WHITE, p
  );
};

// Lookup by template key
export const THUMBNAILS: Record<string, React.FC<ThumbProps>> = {
  'blank': ThumbBlank,
  'number-lead': ThumbNumberLead,
  'editorial-split': ThumbEditorialSplit,
  'pull-quote': ThumbPullQuote,
  'data-dashboard': ThumbDataDashboard,
  'cover-hotspots': ThumbCoverHotspots,
  'glossary': ThumbGlossary,
  'timeline-milestones': ThumbTimeline,
  'knowledge-check': ThumbKnowledgeCheck,
  'card-sort': ThumbCardSort,
  'process-walkthrough': ThumbProcess,
  'compare-contrast': ThumbCompare,
};
