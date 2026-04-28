// ─── Stock images (Unsplash CDN, no auth required) ─────────────────────────
// Curated set themed for business / training / tech / calm slides.
export const STOCK_IMAGES: { url: string; alt: string; theme: string }[] = [
  { url: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80', alt: 'Team collaboration', theme: 'team' },
  { url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80', alt: 'Dashboard analytics', theme: 'data' },
  { url: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&q=80', alt: 'Office collaboration', theme: 'office' },
  { url: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200&q=80', alt: 'Handshake', theme: 'partnership' },
  { url: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=1200&q=80', alt: 'Code on screen', theme: 'tech' },
  { url: 'https://images.unsplash.com/photo-1581090700227-1e37b190418e?w=1200&q=80', alt: 'Operations control room', theme: 'operations' },
  { url: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=1200&q=80', alt: 'Alert / warning', theme: 'alert' },
  { url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1200&q=80', alt: 'Calm sunrise', theme: 'calm' },
  { url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80', alt: 'Modern office', theme: 'workspace' },
  { url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80', alt: 'Charts & graphs', theme: 'data' },
  { url: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&q=80', alt: 'Strategy meeting', theme: 'strategy' },
  { url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80', alt: 'Conference', theme: 'event' },
];

// Inline add-button that lives between blocks on the slide canvas.
// Hovering the gap reveals a thin "+" line; clicking opens a quick-add
// popover with the most common block types. Selecting one calls
// onInsert(type, atIndex).
//
// Companion: CanvasDropZone wraps the canvas content area to handle
// drag-and-drop of image files (drop → insert image block at the end
// or near the dragged-over block).

import { useEffect, useRef, useState } from 'react';
import {
  Type as TypeIcon, FileText, Image as ImageIcon, Quote, AlertCircle, Columns3,
  Minus, MousePointer, Video, Code, Music, Code2, Images,
  RotateCw, MapPin, ChevronsUpDown, LayoutPanelTop, Clock, Table2,
  GitBranch, ListChecks, Layers,
  ArrowUpFromLine, ArrowDownFromLine, PanelLeft, PanelRight, Columns2, Grid3x3,
  List as ListIcon,
} from 'lucide-react';
import type { ContentBlock } from '../types';

type BlockType = ContentBlock['type'];

interface BlockOption {
  type: BlockType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const ICN = 'w-3.5 h-3.5';

const BLOCK_GROUPS: { label: string; options: BlockOption[] }[] = [
  {
    label: 'Basic',
    options: [
      { type: 'heading', label: 'Heading', icon: <TypeIcon className={ICN} />, description: 'Section title' },
      { type: 'text', label: 'Text', icon: <FileText className={ICN} />, description: 'Paragraph or rich text' },
      { type: 'image', label: 'Image', icon: <ImageIcon className={ICN} />, description: 'Picture / upload' },
      { type: 'pull-quote', label: 'Pull quote', icon: <Quote className={ICN} />, description: 'Quote with attribution' },
      { type: 'comparison', label: 'Comparison', icon: <Columns3 className={ICN} />, description: '2–4 columns featured' },
      { type: 'callout', label: 'Callout', icon: <AlertCircle className={ICN} />, description: 'Info / warning / tip box' },
      { type: 'button', label: 'Button', icon: <MousePointer className={ICN} />, description: 'Clickable CTA' },
      { type: 'list', label: 'List', icon: <ListIcon className={ICN} />, description: 'Bulleted or numbered list' },
      { type: 'divider', label: 'Divider', icon: <Minus className={ICN} />, description: 'Horizontal line' },
      { type: 'code', label: 'Code', icon: <Code className={ICN} />, description: 'Code snippet' },
    ],
  },
  {
    label: 'Image layouts',
    options: [
      { type: 'image-top', label: 'Image top', icon: <ArrowUpFromLine className={ICN} />, description: 'Image above text' },
      { type: 'image-bottom', label: 'Image bottom', icon: <ArrowDownFromLine className={ICN} />, description: 'Image below text' },
      { type: 'image-left', label: 'Image left', icon: <PanelLeft className={ICN} />, description: 'Image left of text' },
      { type: 'image-right', label: 'Image right', icon: <PanelRight className={ICN} />, description: 'Image right of text' },
      { type: 'two-images', label: 'Two images', icon: <Columns2 className={ICN} />, description: 'Side-by-side pair' },
      { type: 'three-images', label: 'Three images', icon: <Grid3x3 className={ICN} />, description: 'Three-up grid' },
      { type: 'gallery', label: 'Gallery', icon: <Images className={ICN} />, description: 'Image grid with captions' },
    ],
  },
  {
    label: 'Interactive',
    options: [
      { type: 'flip-card', label: 'Flip cards', icon: <RotateCw className={ICN} />, description: 'Front / back tap-to-flip' },
      { type: 'hotspot', label: 'Hotspot', icon: <MapPin className={ICN} />, description: 'Image with clickable pins' },
      { type: 'labeled-graphic', label: 'Labeled graphic', icon: <LayoutPanelTop className={ICN} />, description: 'Annotated image' },
      { type: 'accordion', label: 'Accordion', icon: <ChevronsUpDown className={ICN} />, description: 'Expandable sections' },
      { type: 'tabs', label: 'Tabs', icon: <LayoutPanelTop className={ICN} />, description: 'Tabbed content' },
      { type: 'timeline', label: 'Timeline', icon: <Clock className={ICN} />, description: 'Chronological events' },
      { type: 'table', label: 'Table', icon: <Table2 className={ICN} />, description: 'Rows and columns' },
      { type: 'scenario', label: 'Scenario', icon: <GitBranch className={ICN} />, description: 'Branching decisions' },
      { type: 'checklist', label: 'Checklist', icon: <ListChecks className={ICN} />, description: 'Tickable items' },
      { type: 'card-sorting', label: 'Card sorting', icon: <Layers className={ICN} />, description: 'Drag to categorise' },
    ],
  },
  {
    label: 'Media',
    options: [
      { type: 'video', label: 'Video', icon: <Video className={ICN} />, description: 'Embedded video' },
      { type: 'audio', label: 'Audio', icon: <Music className={ICN} />, description: 'Audio player' },
      { type: 'embed', label: 'Embed', icon: <Code2 className={ICN} />, description: 'iframe / embed' },
    ],
  },
];

interface InlineAddProps {
  index: number;
  onInsert: (type: BlockType, index: number) => void;
}

export function InlineAdd({ index, onInsert }: InlineAddProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative group/add my-1" onClick={e => e.stopPropagation()}>
      {/* Slim hover target */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-center transition-all ${
          open ? 'h-8' : 'h-2 hover:h-8'
        }`}
        aria-label="Add block here"
      >
        <span className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full transition-all ${
          open
            ? 'bg-[#171D97] text-white shadow-md'
            : 'bg-white text-[#171D97] border border-[#171D97]/30 opacity-0 group-hover/add:opacity-100 shadow-sm'
        }`}>
          <span className="text-base leading-none">+</span> Add block
        </span>
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-30 w-[420px] max-h-[460px] overflow-y-auto bg-white rounded-lg shadow-xl border border-gray-200">
          {BLOCK_GROUPS.map((group) => (
            <div key={group.label} className="border-b border-gray-100 last:border-b-0">
              <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-gray-400 px-3 pt-2.5 pb-1.5 sticky top-0 bg-white z-10">
                {group.label}
              </p>
              <div className="grid grid-cols-2 gap-0.5 p-1.5 pt-0">
                {group.options.map(({ type, label, icon, description }) => (
                  <button
                    key={type}
                    onClick={() => { onInsert(type, index); setOpen(false); }}
                    className="flex items-start gap-2 p-2 rounded-md text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="mt-0.5 text-[#171D97]">{icon}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[12px] font-medium text-gray-900 truncate">{label}</span>
                      <span className="block text-[10px] text-gray-500 truncate">{description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ImagePicker — replaces the empty-image-block dashed dropzone ──────────
// Three ways to add an image: drop file, paste URL, or pick from stock grid.

interface ImagePickerProps {
  onSelect: (dataUrlOrUrl: string, alt?: string) => void;
}

export function ImagePicker({ onSelect }: ImagePickerProps) {
  const [tab, setTab] = useState<'stock' | 'upload' | 'url'>('stock');
  const [url, setUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => onSelect(reader.result as string, file.name.replace(/\.[^.]+$/, ''));
    reader.readAsDataURL(file);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(['stock', 'upload', 'url'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 px-3 py-2 text-xs font-medium capitalize transition-colors ${
              tab === t
                ? 'text-[#171D97] border-b-2 border-[#171D97] bg-[#EFF2FF]/40'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'stock' ? 'Stock photos' : t === 'upload' ? 'Upload' : 'URL'}
          </button>
        ))}
      </div>

      {tab === 'stock' && (
        <div className="p-3">
          <div className="grid grid-cols-3 gap-2 max-h-[280px] overflow-y-auto">
            {STOCK_IMAGES.map(img => (
              <button
                key={img.url}
                type="button"
                onClick={() => onSelect(img.url, img.alt)}
                className="group relative aspect-[4/3] overflow-hidden rounded border border-gray-200 hover:border-[#171D97] hover:shadow transition-all"
                title={img.alt}
              >
                <img
                  src={img.url.replace('w=1200', 'w=300')}
                  alt={img.alt}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-[#171D97]/0 group-hover:bg-[#171D97]/15 transition-colors" />
                <span className="absolute bottom-0 left-0 right-0 px-2 py-1 text-[9px] font-medium text-white bg-gradient-to-t from-black/60 to-transparent text-left">
                  {img.alt}
                </span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-center">Curated free images via Unsplash. Click to use.</p>
        </div>
      )}

      {tab === 'upload' && (
        <div className="p-3">
          <label
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file && file.type.startsWith('image/')) handleFile(file);
            }}
            className={`flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              dragOver ? 'border-[#171D97] bg-[#EFF2FF]' : 'border-gray-300 hover:border-[#171D97]/50 hover:bg-gray-50'
            }`}
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M3 16v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3M16 8l-4-4-4 4M12 4v12" />
            </svg>
            <p className="text-sm text-gray-700 font-medium">Drop a file here</p>
            <p className="text-xs text-gray-500 mt-0.5">or click to browse</p>
          </label>
        </div>
      )}

      {tab === 'url' && (
        <div className="p-3 space-y-2">
          <input
            type="text"
            placeholder="https://example.com/image.jpg"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && url.trim()) onSelect(url.trim()); }}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-[#171D97]"
          />
          {url && (
            <div className="border border-gray-200 rounded overflow-hidden">
              <img src={url} alt="" className="w-full max-h-[180px] object-cover" onError={e => { (e.currentTarget.style.display = 'none'); }} />
            </div>
          )}
          <button
            type="button"
            disabled={!url.trim()}
            onClick={() => onSelect(url.trim())}
            className="w-full py-2 text-sm font-medium bg-[#171D97] text-white rounded hover:bg-[#0A0C3F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Use this URL
          </button>
        </div>
      )}
    </div>
  );
}
