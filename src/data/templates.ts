// src/data/templates.ts
// Drop into elearning-studio/src/data/templates.ts
//
// Editorial template library for the "+ New slide" modal.
// Each template returns a fully-formed `Slide` that uses real ContentBlock
// and Question types from src/types.ts — no schema additions required.

import type {
  Slide,
  ContentBlock,
  ContentBlockType,
  Question,
  QuestionType,
  CalloutStyle,
} from '../types';
import { generateId } from '../utils/helpers';

// ─── Block builders ──────────────────────────────────────────────────
const heading = (html: string): ContentBlock => ({ id: generateId(), type: 'heading', content: html, alt: '', caption: '' });
const text    = (html: string): ContentBlock => ({ id: generateId(), type: 'text',    content: html, alt: '', caption: '' });
const divider = (): ContentBlock => ({ id: generateId(), type: 'divider', content: '', alt: '', caption: '' });

const callout = (style: CalloutStyle, title: string, body: string): ContentBlock => ({
  id: generateId(), type: 'callout',
  content: `<p>${body}</p>`,
  alt: '', caption: '',
  data: { calloutStyle: style, calloutTitle: title },
});

const image = (alt: string, caption = ''): ContentBlock => ({
  id: generateId(), type: 'image', content: '', alt, caption,
});

const video = (caption = ''): ContentBlock => ({
  id: generateId(), type: 'video', content: '', alt: '', caption,
});

const audio = (caption = ''): ContentBlock => ({
  id: generateId(), type: 'audio', content: '', alt: '', caption,
  data: { audioUrl: '' },
});

const accordion = (items: { title: string; content: string }[]): ContentBlock => ({
  id: generateId(), type: 'accordion', content: '', alt: '', caption: '',
  data: { accordionItems: items.map(i => ({ id: generateId(), ...i })) },
});

const tabs = (items: { title: string; content: string }[]): ContentBlock => ({
  id: generateId(), type: 'tabs', content: '', alt: '', caption: '',
  data: { tabItems: items.map(i => ({ id: generateId(), ...i })) },
});

const flipCards = (cards: { front: string; back: string }[]): ContentBlock => ({
  id: generateId(), type: 'flip-card', content: '', alt: '', caption: '',
  data: { flipCards: cards.map(c => ({ id: generateId(), ...c, frontImage: '', backImage: '' })) },
});

const gallery = (items: { caption: string }[], columns = 3): ContentBlock => ({
  id: generateId(), type: 'gallery', content: '', alt: '', caption: '',
  data: { galleryImages: items.map(i => ({ id: generateId(), url: '', alt: '', ...i })), galleryColumns: columns },
});

const table = (headers: string[], rows: string[][], striped = true): ContentBlock => ({
  id: generateId(), type: 'table', content: '', alt: '', caption: '',
  data: { tableHeaders: headers, tableRows: rows, tableStriped: striped },
});

const buttonBlock = (txt: string): ContentBlock => ({
  id: generateId(), type: 'button', content: '', alt: '', caption: '',
  data: { buttonText: txt, buttonUrl: '#', buttonStyle: 'primary', buttonNewTab: true },
});

const checklist = (title: string, items: { title: string; description: string }[]): ContentBlock => ({
  id: generateId(), type: 'checklist', content: '', alt: '', caption: '',
  data: { checklistTitle: title, checklistItems: items.map(i => ({ id: generateId(), ...i })) },
});

const labeledGraphic = (markers: { x: number; y: number; label: string; description: string }[]): ContentBlock => ({
  id: generateId(), type: 'labeled-graphic', content: '', alt: '', caption: '',
  data: { labeledImage: '', labeledMarkers: markers.map(m => ({ id: generateId(), color: '#D4A574', ...m })) },
});

const timeline = (events: { date: string; title: string; description: string }[]): ContentBlock => ({
  id: generateId(), type: 'timeline', content: '', alt: '', caption: '',
  data: { timelineEvents: events.map(e => ({ id: generateId(), icon: '', ...e })) },
});

interface ScenarioStepInput {
  id: string;
  text?: string;
  isEnd?: boolean;
  endType?: 'success' | 'failure' | 'neutral';
  endMessage?: string;
  choices?: { text: string; nextStepId: string; feedback?: string }[];
}
const scenario = (title: string, description: string, steps: ScenarioStepInput[]): ContentBlock => ({
  id: generateId(), type: 'scenario', content: '', alt: '', caption: '',
  data: {
    scenarioTitle: title,
    scenarioDescription: description,
    scenarioImage: '',
    scenarioSteps: steps.map(s => ({
      id: s.id,
      text: s.text || '',
      isEnd: s.isEnd,
      endType: s.endType,
      endMessage: s.endMessage,
      choices: (s.choices || []).map(c => ({ id: generateId(), ...c })),
    })),
  },
});

const cardSorting = (categories: string[], cards: { text: string; correctCategory: string }[]): ContentBlock => ({
  id: generateId(), type: 'card-sorting', content: '', alt: '', caption: '',
  data: { cardSortCategories: categories, cardSortCards: cards.map(c => ({ id: generateId(), ...c })) },
});

// ─── Question builders ──────────────────────────────────────────────
const baseQ = (type: QuestionType, text: string, points = 10): Question => ({
  id: generateId(), type, text, options: [], matchingPairs: [],
  correctAnswer: '', correctOrder: [], explanation: '', points,
});

// ─── Template descriptor ────────────────────────────────────────────
export interface SlideTemplate {
  key: string;
  name: string;
  category: 'Foundations' | 'Editorial' | 'Data' | 'Reference' | 'Assessment' | 'How-to';
  summary: string;
  badge?: string;
  build: () => Slide;
}

// ─── Templates ──────────────────────────────────────────────────────
export const SLIDE_TEMPLATES: SlideTemplate[] = [
  {
    key: 'module-cover',
    name: 'Module cover',
    category: 'Foundations',
    summary: 'Navy hero with eyebrow, large display title, subtitle, and module label. Use to open a module or chapter.',
    build: () => ({
      id: generateId(), title: 'Module cover', layout: 'content',
      content: [
        text(`<div style="position:relative;overflow:hidden;border-radius:12px;background:linear-gradient(135deg,#171D97 0%,#0A0C3F 100%);padding:96px 72px 88px;color:#FAF8F4;min-height:540px;display:flex;flex-direction:column;justify-content:center;">
          <div style="position:absolute;inset:0;background-image:radial-gradient(circle at 85% 15%, rgba(91,102,207,0.45), transparent 55%), radial-gradient(circle at 15% 90%, rgba(212,165,116,0.18), transparent 50%);pointer-events:none;"></div>
          <div style="position:relative;max-width:780px;">
            <p style="font-size:13px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#DDE0FA;margin:0 0 32px;">Internal training</p>
            <h1 style="font-family:Fraunces,serif;font-size:96px;line-height:1.0;font-weight:400;color:#FAF8F4;letter-spacing:-0.02em;margin:0 0 28px;">Product<br/>Emergency Process</h1>
            <p style="font-family:-apple-system,system-ui,sans-serif;font-size:24px;line-height:1.35;font-weight:400;color:#FAF8F4;margin:0 0 28px;">A Stakeholder&rsquo;s Guide to Crisis Response at Moonfare</p>
            <div style="width:340px;height:1px;background:rgba(250,248,244,0.35);margin:0 0 24px;"></div>
            <p style="font-size:13px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#DDE0FA;margin:0;">Module 1: Introduction &amp; Why It Matters</p>
          </div>
        </div>`),
      ],
      questions: [], notes: '',
      backgroundColor: '#FAF8F4', backgroundImage: '', duration: 3,
    }),
  },
  {
    key: 'blank',
    name: 'Blank slide',
    category: 'Foundations',
    summary: 'A clean canvas. Add blocks one at a time.',
    build: () => ({
      id: generateId(), title: 'Untitled slide', layout: 'blank',
      content: [], questions: [], notes: '',
      backgroundColor: '#FFFFFF', backgroundImage: '', duration: 2,
    }),
  },

  {
    key: 'number-lead',
    name: 'Number lead',
    category: 'Editorial',
    summary: 'Headline figure with sourced context and a supporting callout.',
    build: () => ({
      id: generateId(), title: '23%', layout: 'content',
      content: [
        text('<p style="color:#171D97;font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;">By the numbers</p>'),
        heading('<h1 style="font-family:Fraunces,serif;font-size:200px;line-height:0.92;font-weight:400;color:#0A0C3F;letter-spacing:-0.04em;margin:0;">23<span style="color:#D4A574;">%</span></h1>'),
        text('<p style="font-family:Fraunces,serif;font-size:28px;line-height:1.25;color:#1A1A1F;max-width:640px;margin:0;">of high-net-worth individuals now allocate to private equity — up from just 6% a decade ago.</p>'),
        callout('info', 'Why this matters', 'Wealth managers without a private-markets capability are increasingly losing share to platforms that offer one.'),
        divider(),
        text('<p style="font-size:13px;color:#5C5A57;">Source: Bain &amp; Company Global Private Equity Report, 2024</p>'),
      ],
      questions: [], notes: '',
      backgroundColor: '#FAF8F4', backgroundImage: '', duration: 4,
    }),
  },

  {
    key: 'editorial-split',
    name: 'Editorial split',
    category: 'Editorial',
    summary: 'Magazine spread — display headline, hero image, key concept cards, audio narration.',
    build: () => ({
      id: generateId(), title: 'The case for private markets', layout: 'two-column',
      content: [
        text('<p style="color:#171D97;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;">Module 02 · Foundations</p>'),
        heading('<h1 style="font-family:Fraunces,serif;font-size:64px;line-height:1.02;color:#0A0C3F;letter-spacing:-0.025em;margin:0;">The case for <em style="color:#171D97;">private</em> markets</h1>'),
        image('Hero editorial image'),
        text('<p style="font-family:Fraunces,serif;font-size:22px;line-height:1.45;color:#1A1A1F;font-style:italic;margin:0;">For most of modern history, the highest-returning companies were available to anyone with a brokerage account. That stopped being true around 2000.</p>'),
        text('<p style="font-size:16px;line-height:1.65;color:#1A1A1F;margin:0;">Today, fewer than half of US companies generating $100M+ in revenue are publicly traded. The rest sit in private hands — and increasingly, in private equity portfolios.</p>'),
        audio('Listen — narrated version (2:30)'),
        flipCards([
          { front: 'Regulation', back: 'Sarbanes-Oxley (2002) made staying private cheaper than going public for many growth-stage firms.' },
          { front: 'Capital supply', back: 'PE dry powder hit a record $2.6T in 2024 — companies rarely need IPOs to fundraise.' },
          { front: 'Talent retention', back: 'Private equity ownership lets management run free from public market pressure.' },
        ]),
      ],
      questions: [], notes: '',
      backgroundColor: '#FFFFFF', backgroundImage: '', duration: 6,
    }),
  },

  {
    key: 'pull-quote',
    name: 'Pull quote',
    category: 'Editorial',
    summary: 'Centered editorial quote with attribution and an optional video clip.',
    build: () => ({
      id: generateId(), title: 'Quote — Marks', layout: 'content',
      content: [
        text('<div style="text-align:center;color:#D4A574;font-size:64px;font-family:Fraunces,serif;">&ldquo;</div>'),
        heading('<h2 style="font-family:Fraunces,serif;font-size:52px;line-height:1.2;font-style:italic;color:#0A0C3F;text-align:center;max-width:920px;margin:0 auto;">You can&rsquo;t predict. You can prepare.</h2>'),
        divider(),
        text('<div style="text-align:center;"><p style="font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#171D97;margin:0;">Howard Marks</p><p style="font-size:13px;color:#5C5A57;margin:2px 0 0;">Co-founder &amp; Co-chairman, Oaktree Capital Management</p></div>'),
        video('Howard Marks · Oaktree memo recording — 8:12'),
        callout('tip', 'Discussion prompt', 'Listen for forecast-anchored language with your next client. Marks would push you to focus on positioning, not prediction.'),
      ],
      questions: [], notes: '',
      backgroundColor: '#FAF8F4', backgroundImage: '', duration: 5,
    }),
  },

  {
    key: 'data-dashboard',
    name: 'Data dashboard',
    category: 'Data',
    summary: 'Stat grid + benchmark table + interactive takeaway checklist.',
    build: () => ({
      id: generateId(), title: 'PE in numbers', layout: 'content',
      content: [
        text('<p style="color:#171D97;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;">Lesson opener · Foundations</p>'),
        heading('<h2 style="font-family:Fraunces,serif;font-size:44px;line-height:1.1;color:#0A0C3F;letter-spacing:-0.02em;margin:0;">Private equity, by the numbers</h2>'),
        text(`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:32px;border-top:1px solid #E8E5DE;padding-top:32px;">
          <div><p style="font-family:Fraunces,serif;font-size:84px;line-height:0.9;color:#171D97;letter-spacing:-0.03em;margin:0;">$8.2T</p><p style="font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#1A1A1F;margin:12px 0 4px;">Global AUM</p><p style="font-size:14px;color:#5C5A57;margin:0;">Total assets under management across PE strategies, 2024.</p></div>
          <div><p style="font-family:Fraunces,serif;font-size:84px;line-height:0.9;color:#171D97;letter-spacing:-0.03em;margin:0;">14.2<span style="color:#D4A574;">%</span></p><p style="font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#1A1A1F;margin:12px 0 4px;">25-yr median return</p><p style="font-size:14px;color:#5C5A57;margin:0;">Net IRR for top-quartile buyout funds vs. 9.7% S&amp;P 500.</p></div>
          <div><p style="font-family:Fraunces,serif;font-size:84px;line-height:0.9;color:#171D97;letter-spacing:-0.03em;margin:0;">~10<span style="font-size:48px;">yrs</span></p><p style="font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#1A1A1F;margin:12px 0 4px;">Typical fund life</p><p style="font-size:14px;color:#5C5A57;margin:0;">5 years to invest, 5 years to harvest.</p></div>
        </div>`),
        table(
          ['Strategy', 'Top quartile', 'Median', 'Bottom quartile'],
          [
            ['<strong>Buyout</strong>', '18.4%', '14.2%', '7.1%'],
            ['<strong>Growth equity</strong>', '21.2%', '15.8%', '6.9%'],
            ['<strong>Venture capital</strong>', '24.6%', '11.4%', '−2.3%'],
            ['<strong>Secondaries</strong>', '15.1%', '12.9%', '8.4%'],
            ['<strong>Private credit</strong>', '11.3%', '9.4%', '6.7%'],
          ],
        ),
        checklist('Takeaways for your next client conversation', [
          { title: 'Lead with dispersion, not averages', description: 'Manager selection drives more variance than asset class choice.' },
          { title: 'Anchor the J-curve early', description: 'Set expectations: years 1-3 will look bad on paper.' },
          { title: 'Frame liquidity as a feature', description: 'Illiquidity premium is real — but only if the client can ride it out.' },
          { title: 'Compare to the right benchmark', description: 'PME (public market equivalent), not nominal index returns.' },
        ]),
      ],
      questions: [], notes: '',
      backgroundColor: '#FFFFFF', backgroundImage: '', duration: 8,
    }),
  },

  {
    key: 'cover-hotspots',
    name: 'Cover with hotspots',
    category: 'Editorial',
    summary: 'Full-bleed cover, labeled graphic with click-to-reveal pins, and a branching scenario.',
    build: () => {
      const s1 = generateId(), s2 = generateId(), s3 = generateId(), s4 = generateId();
      const eGood = generateId(), eCaution = generateId(), eBad = generateId(), eMixed = generateId();
      return {
        id: generateId(), title: 'How a fund makes money', layout: 'content',
        content: [
          text(`<div style="position:relative;overflow:hidden;height:520px;background:linear-gradient(135deg,#0A0C3F 0%,#171D97 100%);display:flex;align-items:flex-end;padding:64px;color:#FAF8F4;">
            <div style="position:absolute;inset:0;background-image:radial-gradient(circle at 20% 80%, rgba(212,165,116,0.25), transparent 50%), radial-gradient(circle at 80% 20%, rgba(91,102,207,0.4), transparent 50%);"></div>
            <div style="position:relative;max-width:680px;">
              <p style="font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#D4A574;margin:0 0 16px;">Chapter 03 · Mechanics</p>
              <h1 style="font-family:Fraunces,serif;font-size:72px;line-height:1.0;color:#FAF8F4;letter-spacing:-0.025em;margin:0 0 20px;">How a fund actually makes money</h1>
              <p style="font-family:Fraunces,serif;font-size:22px;line-height:1.4;color:#DDE0FA;font-style:italic;margin:0;">From capital call to distribution, in eight steps and one chart.</p>
            </div>
          </div>`),
          labeledGraphic([
            { x: 22, y: 35, label: 'Source', description: 'Proprietary deal flow from operating partners — bypasses competitive auctions.' },
            { x: 48, y: 60, label: 'Diligence', description: '6-8 weeks. Commercial, financial, legal, ESG, IT, management.' },
            { x: 70, y: 30, label: 'Capital structure', description: '40% equity / 60% debt typical. Higher leverage amplifies returns and risk.' },
            { x: 80, y: 70, label: 'Value creation', description: 'Operational improvements, add-on M&A, multiple expansion.' },
            { x: 35, y: 75, label: 'Exit', description: 'Strategic sale, secondary buyout, or IPO. 4-6 year hold typical.' },
          ]),
          scenario(
            'Branching scenario',
            'A diligence red flag emerges in week 5 of an 8-week process. Your IC meeting is in 10 days.',
            [
              { id: s1, text: 'The target\'s top customer (24% of revenue) just put their contract out to bid. What do you do first?', choices: [
                { text: 'Pause diligence and demand customer interviews before proceeding.', nextStepId: s2, feedback: 'Smart — call the customer.' },
                { text: 'Push ahead — the LOI is non-binding, you can always walk later.', nextStepId: s3, feedback: 'Risky.' },
                { text: 'Negotiate a 15% price reduction to compensate for the new risk.', nextStepId: s4, feedback: 'Premature.' },
              ]},
              { id: s2, text: 'Customer interview reveals dissatisfaction with delivery times, not pricing. What now?', choices: [
                { text: 'Build a 100-day operational fix into the value-creation plan and proceed.', nextStepId: eGood },
                { text: 'Walk — customer concentration is too high regardless.', nextStepId: eCaution },
              ]},
              { id: s3, text: 'You proceed and close. Six months later, the customer leaves. Your model misses by 28%.', choices: [
                { text: 'Continue', nextStepId: eBad },
              ]},
              { id: s4, text: 'Seller refuses the cut. You walk. Three months later a competitor closes at your original price.', choices: [
                { text: 'Continue', nextStepId: eMixed },
              ]},
              { id: eGood,    isEnd: true, endType: 'success', endMessage: 'You diagnosed the real risk and fixed it. Customer renewed at +12% on a 5-year deal. Returns above plan.' },
              { id: eCaution, isEnd: true, endType: 'neutral', endMessage: 'Conservative call. You missed a 2.4x deal — but avoided a real risk that could have gone the other way.' },
              { id: eBad,     isEnd: true, endType: 'failure', endMessage: 'Diligence existed for a reason. The deal returned 0.8x and damaged your fund\'s track record.' },
              { id: eMixed,   isEnd: true, endType: 'neutral', endMessage: 'You may have been right — or you may have left value on the table. The honest answer: you\'ll never know.' },
            ],
          ),
        ],
        questions: [], notes: '',
        backgroundColor: '#FFFFFF', backgroundImage: '', duration: 10,
      };
    },
  },

  {
    key: 'glossary',
    name: 'Glossary & reference',
    category: 'Reference',
    summary: 'Tab-organized accordion glossary with a pro tip callout.',
    build: () => ({
      id: generateId(), title: 'Glossary', layout: 'content',
      content: [
        text('<p style="color:#171D97;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;">Reference · Bookmark this page</p>'),
        heading('<h2 style="font-family:Fraunces,serif;font-size:44px;line-height:1.1;color:#0A0C3F;letter-spacing:-0.02em;margin:0;">Glossary of terms</h2>'),
        text('<p style="font-size:16px;color:#5C5A57;max-width:560px;margin:0;">Every word that matters, in plain English. Tap to expand.</p>'),
        tabs([
          { title: 'Fund mechanics', content: '<p>Concepts every LP needs before reading their first PPM.</p>' },
          { title: 'Returns &amp; fees', content: '<p>How performance is measured — and how it can be made to look better than it is.</p>' },
          { title: 'Deal types', content: '<p>The strategy taxonomy: buyout, growth, venture, credit, secondaries.</p>' },
        ]),
        accordion([
          { title: 'AUM — assets under management', content: '<p>The total market value of investments a fund manages on behalf of its clients.</p>' },
          { title: 'Capital call (drawdown)', content: '<p>When a fund formally requests committed capital from its limited partners. Missing one can mean forfeiting your entire commitment.</p>' },
          { title: 'Carried interest (carry)', content: '<p>The GP\'s share of fund profits — typically 20% above an 8% hurdle rate.</p>' },
          { title: 'DPI — distributions to paid-in capital', content: '<p>Cash returned to investors divided by capital they\'ve put in. The only return metric that pays for groceries.</p>' },
          { title: 'IRR — internal rate of return', content: '<p>The annualized rate of growth, accounting for the timing of cash flows. Beware of GPs who optimize for IRR at the expense of multiples.</p>' },
          { title: 'J-curve', content: '<p>The shape of fund returns over time — early years show losses, with returns materializing later.</p>' },
          { title: 'TVPI — total value to paid-in', content: '<p>DPI plus residual value (unrealized gains).</p>' },
        ]),
        callout('tip', 'Pro tip', 'Always ask for DPI by vintage. IRR and TVPI can be propped up. Cash returned cannot.'),
      ],
      questions: [], notes: '',
      backgroundColor: '#FFFFFF', backgroundImage: '', duration: 5,
    }),
  },

  {
    key: 'timeline-milestones',
    name: 'Timeline + milestones',
    category: 'Data',
    summary: 'Horizontal milestone strip, era gallery, and key inflection callouts.',
    build: () => ({
      id: generateId(), title: 'The fund lifecycle', layout: 'content',
      content: [
        text('<p style="color:#171D97;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;">From close to wind-down · 10 years</p>'),
        heading('<h2 style="font-family:Fraunces,serif;font-size:44px;line-height:1.1;color:#0A0C3F;letter-spacing:-0.02em;margin:0;">A typical PE fund lifecycle</h2>'),
        timeline([
          { date: 'Year 0',     title: 'Final close',    description: 'Fund stops accepting commitments. Investment period begins.' },
          { date: 'Years 1-5',  title: 'Investment',     description: 'GP sources, diligences, acquires.' },
          { date: 'Years 3-7',  title: 'Value creation', description: 'Operational improvements, add-ons, repositioning.' },
          { date: 'Years 5-10', title: 'Harvest',        description: 'Companies are sold. Distributions return to LPs.' },
          { date: 'Year 10+',   title: 'Wind-down',      description: 'Final exits. Performance locked in.' },
        ]),
        gallery([
          { caption: 'Year 1 — Capital deployed' },
          { caption: 'Year 4 — Portfolio built' },
          { caption: 'Year 7 — First exits' },
          { caption: 'Year 10 — Wind-down' },
        ], 4),
        callout('warning', 'The J-curve', 'Expect negative IRR in years 1-3. Investors who panic-sell on a secondary in year 3 routinely lose 30-40% of their eventual upside.'),
        callout('success', 'The harvest', 'Top-quartile funds typically return 40-60% of TVPI in years 6-9. The boring middle is where the magic compounds.'),
      ],
      questions: [], notes: '',
      backgroundColor: '#FFFFFF', backgroundImage: '', duration: 6,
    }),
  },

  {
    key: 'knowledge-check',
    name: 'Knowledge check',
    category: 'Assessment',
    badge: 'Interactive',
    summary: 'Multi-question quiz with mixed types: MCQ, true/false, fill-in, slider, matching, rating.',
    build: () => {
      const mcQ: Question = {
        ...baseQ('multiple-choice', 'A capital call lands. Your client\'s liquid cash won\'t cover it. Best next step?', 10),
        options: [
          { id: generateId(), text: 'Sell long-term holdings immediately to free up cash.', isCorrect: false },
          { id: generateId(), text: 'Draw on a pre-arranged liquidity line and review at next quarterly review.', isCorrect: true },
          { id: generateId(), text: 'Default on the call and accept the penalty.', isCorrect: false },
          { id: generateId(), text: 'Request an extension from the GP.', isCorrect: false },
        ],
        explanation: 'Liquidity facilities exist precisely for this. Defaults forfeit prior commitments; GPs almost never grant extensions; forced sales create avoidable tax events.',
      };
      const tfQ: Question = {
        ...baseQ('true-false', 'A higher IRR always means a better fund.', 5),
        options: [
          { id: generateId(), text: 'True', isCorrect: false },
          { id: generateId(), text: 'False — IRR can be inflated by early small distributions.', isCorrect: true },
        ],
        explanation: 'A fund returning 2.0x in 8 years has lower IRR than one returning 1.4x in 3 years — but more money. Always pair IRR with TVPI and DPI.',
      };
      const fbQ: Question = {
        ...baseQ('fill-in-blank', 'The metric that tells you cash actually returned to investors is called ___.', 5),
        correctAnswer: 'DPI',
        explanation: 'DPI = distributions to paid-in capital. The only return metric you can spend.',
      };
      const slQ: Question = {
        ...baseQ('slider', 'What % of your client\'s liquid wealth would you allocate to private markets?', 0),
        sliderMin: 0, sliderMax: 50, sliderStep: 5, sliderUnit: '%', sliderCorrect: 17,
        explanation: 'Most wealth managers settle in the 10-25% range, depending on liquidity needs.',
      };
      const mtQ: Question = {
        ...baseQ('matching', 'Match each term to its definition.', 10),
        matchingPairs: [
          { id: generateId(), left: 'TVPI', right: 'Total value (cash + paper) divided by capital paid in' },
          { id: generateId(), left: 'Carry', right: 'GP\'s share of profits above the hurdle rate' },
          { id: generateId(), left: 'Vintage', right: 'The year a fund first deploys capital' },
          { id: generateId(), left: 'Hurdle', right: 'Minimum return LPs must earn before GP gets carry' },
        ],
        explanation: 'These four terms come up in every LPAC meeting.',
      };
      const rtQ: Question = {
        ...baseQ('rating', 'How confident do you feel explaining the J-curve to a client right now?', 0),
        ratingMax: 5, ratingCorrect: 4, ratingStyle: 'stars',
        explanation: 'If you rated 3 or below, revisit Module 02 Lesson 4.',
      };
      return {
        id: generateId(), title: 'Check your thinking', layout: 'quiz',
        content: [
          text('<p style="color:#D4A574;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;">Knowledge check · 6 questions</p>'),
          heading('<h2 style="font-family:Fraunces,serif;font-size:36px;line-height:1.15;color:#0A0C3F;letter-spacing:-0.02em;margin:0;">Let\'s see what stuck.</h2>'),
          text('<p style="font-size:15px;color:#5C5A57;max-width:680px;margin:0;">A mix of recall, applied judgement, and self-assessment. No trick questions.</p>'),
        ],
        questions: [mcQ, tfQ, fbQ, slQ, mtQ, rtQ],
        notes: '',
        backgroundColor: '#FAF8F4', backgroundImage: '', duration: 8,
      };
    },
  },

  {
    key: 'card-sort',
    name: 'Sort the strategies',
    category: 'Assessment',
    badge: 'Interactive',
    summary: 'Drag-to-categorize exercise. Tests applied taxonomy, not vocabulary.',
    build: () => ({
      id: generateId(), title: 'Sort the strategies', layout: 'content',
      content: [
        text('<p style="color:#D4A574;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;">Applied exercise</p>'),
        heading('<h2 style="font-family:Fraunces,serif;font-size:36px;line-height:1.15;color:#0A0C3F;letter-spacing:-0.02em;margin:0;">Which strategy fits which deal?</h2>'),
        text('<p style="font-size:15px;color:#5C5A57;max-width:680px;margin:0;">Each card describes a real-world transaction. Sort it into the strategy bucket that best fits.</p>'),
        cardSorting(
          ['Buyout', 'Growth equity', 'Venture capital', 'Private credit'],
          [
            { text: 'Lead a $80M Series B in a vertical SaaS company at 12x ARR', correctCategory: 'Venture capital' },
            { text: 'Acquire a $400M family-owned industrial parts distributor with 60% leverage', correctCategory: 'Buyout' },
            { text: 'Originate a $150M unitranche loan to refinance a portfolio company', correctCategory: 'Private credit' },
            { text: 'Take a 25% minority stake in a profitable D2C brand growing 40% YoY', correctCategory: 'Growth equity' },
            { text: 'Lead a $5M seed round in a pre-revenue AI infrastructure startup', correctCategory: 'Venture capital' },
            { text: 'Take a regional pizza chain private, install new CFO, roll up competitors', correctCategory: 'Buyout' },
          ],
        ),
        callout('info', 'No single right answer', 'Deals often straddle categories. Build pattern-recognition for the prototypical case — then know when to flag exceptions.'),
      ],
      questions: [], notes: '',
      backgroundColor: '#FFFFFF', backgroundImage: '', duration: 6,
    }),
  },

  {
    key: 'process-walkthrough',
    name: 'Process walkthrough',
    category: 'How-to',
    summary: 'Step-by-step instructional layout with checklist + video + downloadable worksheet.',
    build: () => ({
      id: generateId(), title: 'How to size a PE allocation', layout: 'content',
      content: [
        text('<p style="color:#171D97;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;">How-to · 6 steps</p>'),
        heading('<h1 style="font-family:Fraunces,serif;font-size:52px;line-height:1.05;color:#0A0C3F;letter-spacing:-0.025em;margin:0;">How to size a private-markets allocation</h1>'),
        text('<p style="font-family:Fraunces,serif;font-size:20px;line-height:1.5;color:#5C5A57;font-style:italic;margin:0;">A working framework — not a formula.</p>'),
        video('Walkthrough — full screen demo (12:04)'),
        checklist('Work through these in order — don\'t skip', [
          { title: '1. Establish the liquidity floor', description: '12-24 months of expenses + planned major outlays.' },
          { title: '2. Quantify the time horizon', description: 'Years until the bulk of capital is needed. PE only works if it\'s 7+.' },
          { title: '3. Stress-test the cash-flow model', description: 'Run capital calls + distributions across vintages.' },
          { title: '4. Set the strategic range', description: 'Typically 10-25% of liquid net worth for HNW.' },
          { title: '5. Build a vintage diversification plan', description: 'Commit ~25% of target allocation per year over 4 years.' },
          { title: '6. Document the rationale', description: 'Write down why — for the IPS, for the client, for future-you.' },
        ]),
        table(
          ['Input', 'Value', 'Notes'],
          [
            ['Liquid net worth', '$12M', 'Excludes primary residence + business equity'],
            ['Annual expenses', '$420K', '$5M kept in liquid reserve'],
            ['Time horizon', '15+ years', 'Client is 52, no near-term liquidity needs'],
            ['Risk tolerance', 'Moderate-high', 'Has weathered 2008, 2020 without panic'],
            ['<strong>Recommended allocation</strong>', '<strong>$2.0M (17%)</strong>', '<strong>Deployed over 4 vintages</strong>'],
          ],
        ),
        callout('tip', 'Get the worksheet', 'Download the editable Excel model — pre-built capital-call schedule, J-curve simulator, and IPS template.'),
        buttonBlock('Download worksheet (.xlsx)'),
      ],
      questions: [], notes: '',
      backgroundColor: '#FFFFFF', backgroundImage: '', duration: 12,
    }),
  },

  {
    key: 'compare-contrast',
    name: 'Compare & contrast',
    category: 'Reference',
    summary: 'Side-by-side comparison table with a tabbed deep-dive.',
    build: () => ({
      id: generateId(), title: 'PE vs. PD — a side-by-side', layout: 'content',
      content: [
        text('<p style="color:#171D97;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;">Compare &amp; contrast</p>'),
        heading('<h2 style="font-family:Fraunces,serif;font-size:44px;line-height:1.1;color:#0A0C3F;letter-spacing:-0.02em;margin:0;">Private equity vs. private debt — when does each win?</h2>'),
        table(
          ['Dimension', 'Private equity', 'Private debt'],
          [
            ['<strong>Position in capital stack</strong>', 'Equity (most subordinated)', 'Senior secured (most protected)'],
            ['<strong>Target net IRR</strong>', '15-25%', '8-12%'],
            ['<strong>Typical hold period</strong>', '4-7 years', '3-5 years'],
            ['<strong>Income vs. capital gain</strong>', '~10% income / 90% gain', '~80% income / 20% gain'],
            ['<strong>Downside in recession</strong>', 'High — loss of principal possible', 'Lower — collateral protection'],
            ['<strong>Best for client who…</strong>', 'Wants growth, can wait', 'Wants yield, has liquidity now'],
          ],
        ),
        tabs([
          { title: 'When PE wins', content: '<p>Long horizon, growth-oriented mandate, ability to weather J-curve and stomach mark-to-market volatility.</p>' },
          { title: 'When PD wins', content: '<p>Income need, shorter horizon, recession concern, want diversification away from public credit.</p>' },
          { title: 'When to blend', content: '<p>Most HNW clients land here. A 60/40 PE/PD sleeve provides growth + ballast.</p>' },
        ]),
        callout('info', 'Rebalancing reality', 'Unlike public portfolios, you can\'t rebalance private allocations on demand. The mix you commit to today is the mix you live with for a decade.'),
      ],
      questions: [], notes: '',
      backgroundColor: '#FFFFFF', backgroundImage: '', duration: 7,
    }),
  },
];
