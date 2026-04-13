import { useState, useRef, useCallback } from 'react';
import { generateId } from '../utils/helpers';
import type {
  ContentBlock,
  ContentBlockData,
  FlipCardItem,
  HotspotMarker,
  AccordionItem,
  TabItem,
  TimelineEvent,
  GalleryImage,
  LabeledMarker,
  CalloutStyle,
  ButtonStyle,
} from '../types';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Image,
  X,
  Edit3,
  Eye,
  Clock,
  Info,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  ExternalLink,
  Music,
  Code,
  Columns,
  MapPin,
  Tag,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BlockEditorProps {
  block: ContentBlock;
  onUpdate: (updates: Partial<ContentBlock>) => void;
  onUpdateData: (updates: Partial<ContentBlockData>) => void;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function ensureData(block: ContentBlock): ContentBlockData {
  return block.data ?? {};
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-semibold uppercase text-gray-400 tracking-wide mb-2">{children}</h4>
  );
}

function EmptyState({ icon: Icon, text, onAction, actionLabel }: {
  icon: React.FC<{ className?: string }>;
  text: string;
  onAction?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
      <Icon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
      <p className="text-sm text-gray-400">{text}</p>
      {onAction && actionLabel && (
        <button onClick={onAction} className="btn-primary text-xs mt-3">
          <Plus className="w-3 h-3 mr-1 inline" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function ItemActions({
  index,
  total,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5 flex-shrink-0">
      <button
        onClick={onMoveUp}
        disabled={index === 0}
        className="btn-icon w-6 h-6 disabled:opacity-30"
        title="Move up"
      >
        <ChevronUp className="w-3 h-3" />
      </button>
      <GripVertical className="w-3 h-3 text-gray-300" />
      <button
        onClick={onMoveDown}
        disabled={index === total - 1}
        className="btn-icon w-6 h-6 disabled:opacity-30"
        title="Move down"
      >
        <ChevronDown className="w-3 h-3" />
      </button>
      <button onClick={onDelete} className="btn-icon w-6 h-6 text-red-400 hover:text-red-600" title="Delete">
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

function moveItem<T>(arr: T[], from: number, direction: 'up' | 'down'): T[] {
  const to = direction === 'up' ? from - 1 : from + 1;
  if (to < 0 || to >= arr.length) return arr;
  const copy = [...arr];
  [copy[from]!, copy[to]!] = [copy[to]!, copy[from]!];
  return copy;
}

// ---------------------------------------------------------------------------
// 1. Flip Card Editor
// ---------------------------------------------------------------------------

function FlipCardEditor({ block, onUpdateData }: BlockEditorProps) {
  const data = ensureData(block);
  const cards = data.flipCards ?? [];
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);

  const updateCards = (updated: FlipCardItem[]) => onUpdateData({ flipCards: updated });

  const addCard = () => {
    updateCards([...cards, { id: generateId(), front: '', back: '', frontImage: '', backImage: '' }]);
  };

  const updateCard = (id: string, updates: Partial<FlipCardItem>) => {
    updateCards(cards.map(c => (c.id === id ? { ...c, ...updates } : c)));
  };

  const removeCard = (id: string) => updateCards(cards.filter(c => c.id !== id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionHeading>Flip Cards</SectionHeading>
        <button onClick={addCard} className="btn-secondary text-xs">
          <Plus className="w-3 h-3 mr-1 inline" /> Add Card
        </button>
      </div>

      {cards.length === 0 && (
        <EmptyState icon={Columns} text="No flip cards yet" onAction={addCard} actionLabel="Add Card" />
      )}

      {cards.map((card, idx) => (
        <div key={card.id} className="card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Card {idx + 1}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPreviewIdx(previewIdx === idx ? null : idx)}
                className="btn-icon w-6 h-6"
                title="Toggle preview"
              >
                <Eye className="w-3 h-3" />
              </button>
              <ItemActions
                index={idx}
                total={cards.length}
                onMoveUp={() => updateCards(moveItem(cards, idx, 'up'))}
                onMoveDown={() => updateCards(moveItem(cards, idx, 'down'))}
                onDelete={() => removeCard(card.id)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-xs">Front Text</label>
              <textarea
                className="input text-xs resize-none"
                rows={2}
                placeholder="Front side..."
                value={card.front}
                onChange={e => updateCard(card.id, { front: e.target.value })}
              />
              <input
                className="input text-xs mt-1"
                placeholder="Front image URL (optional)"
                value={card.frontImage}
                onChange={e => updateCard(card.id, { frontImage: e.target.value })}
              />
            </div>
            <div>
              <label className="label text-xs">Back Text</label>
              <textarea
                className="input text-xs resize-none"
                rows={2}
                placeholder="Back side..."
                value={card.back}
                onChange={e => updateCard(card.id, { back: e.target.value })}
              />
              <input
                className="input text-xs mt-1"
                placeholder="Back image URL (optional)"
                value={card.backImage}
                onChange={e => updateCard(card.id, { backImage: e.target.value })}
              />
            </div>
          </div>

          {/* Mini preview */}
          {previewIdx === idx && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
              <div className="rounded-lg bg-blue-50 p-3 text-center text-xs min-h-[60px] flex flex-col items-center justify-center">
                {card.frontImage && (
                  <img src={card.frontImage} alt="" className="w-12 h-12 object-cover rounded mb-1" />
                )}
                <span className="text-gray-700">{card.front || <em className="text-gray-400">Front</em>}</span>
              </div>
              <div className="rounded-lg bg-green-50 p-3 text-center text-xs min-h-[60px] flex flex-col items-center justify-center">
                {card.backImage && (
                  <img src={card.backImage} alt="" className="w-12 h-12 object-cover rounded mb-1" />
                )}
                <span className="text-gray-700">{card.back || <em className="text-gray-400">Back</em>}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Hotspot Editor
// ---------------------------------------------------------------------------

function HotspotEditor({ block, onUpdateData }: BlockEditorProps) {
  const data = ensureData(block);
  const image = data.hotspotImage ?? '';
  const markers = data.hotspotMarkers ?? [];
  const imgRef = useRef<HTMLDivElement>(null);

  const updateMarkers = (updated: HotspotMarker[]) => onUpdateData({ hotspotMarkers: updated });

  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!imgRef.current) return;
      const rect = imgRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const newMarker: HotspotMarker = {
        id: generateId(),
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        label: `Marker ${markers.length + 1}`,
        description: '',
      };
      updateMarkers([...markers, newMarker]);
    },
    [markers, onUpdateData],
  );

  const updateMarker = (id: string, updates: Partial<HotspotMarker>) => {
    updateMarkers(markers.map(m => (m.id === id ? { ...m, ...updates } : m)));
  };

  const removeMarker = (id: string) => updateMarkers(markers.filter(m => m.id !== id));

  return (
    <div className="space-y-3">
      <SectionHeading>Hotspot Image</SectionHeading>

      <div>
        <label className="label text-xs">Image URL</label>
        <input
          className="input text-xs"
          placeholder="https://example.com/image.png"
          value={image}
          onChange={e => onUpdateData({ hotspotImage: e.target.value })}
        />
      </div>

      {image && (
        <div>
          <p className="text-xs text-gray-400 mb-1">Click on the image to add a marker</p>
          <div
            ref={imgRef}
            className="relative rounded-lg overflow-hidden border cursor-crosshair"
            onClick={handleImageClick}
          >
            <img src={image} alt="Hotspot" className="w-full block" />
            {markers.map((m, i) => (
              <div
                key={m.id}
                className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow-lg border-2 border-white pointer-events-none"
                style={{ left: `${m.x}%`, top: `${m.y}%` }}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      )}

      {markers.length > 0 && (
        <div className="space-y-2">
          <SectionHeading>Markers</SectionHeading>
          {markers.map((m, idx) => (
            <div key={m.id} className="card p-2 flex gap-2 items-start">
              <span className="w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center flex-shrink-0 mt-1">
                {idx + 1}
              </span>
              <div className="flex-1 space-y-1">
                <input
                  className="input text-xs"
                  placeholder="Label"
                  value={m.label}
                  onChange={e => updateMarker(m.id, { label: e.target.value })}
                />
                <textarea
                  className="input text-xs resize-none"
                  rows={2}
                  placeholder="Description..."
                  value={m.description}
                  onChange={e => updateMarker(m.id, { description: e.target.value })}
                />
                <span className="text-[10px] text-gray-400">
                  x: {m.x.toFixed(1)}% &middot; y: {m.y.toFixed(1)}%
                </span>
              </div>
              <button onClick={() => removeMarker(m.id)} className="btn-icon w-6 h-6 text-red-400 hover:text-red-600 flex-shrink-0">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Accordion Editor
// ---------------------------------------------------------------------------

function AccordionEditor({ block, onUpdateData }: BlockEditorProps) {
  const data = ensureData(block);
  const items = data.accordionItems ?? [];

  const updateItems = (updated: AccordionItem[]) => onUpdateData({ accordionItems: updated });

  const addItem = () => {
    updateItems([...items, { id: generateId(), title: '', content: '' }]);
  };

  const updateItem = (id: string, updates: Partial<AccordionItem>) => {
    updateItems(items.map(it => (it.id === id ? { ...it, ...updates } : it)));
  };

  const removeItem = (id: string) => updateItems(items.filter(it => it.id !== id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionHeading>Accordion Sections</SectionHeading>
        <button onClick={addItem} className="btn-secondary text-xs">
          <Plus className="w-3 h-3 mr-1 inline" /> Add Section
        </button>
      </div>

      {items.length === 0 && (
        <EmptyState icon={ChevronDown} text="No accordion sections yet" onAction={addItem} actionLabel="Add Section" />
      )}

      {items.map((item, idx) => (
        <div key={item.id} className="card p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <input
                className="input text-xs font-medium"
                placeholder="Section title..."
                value={item.title}
                onChange={e => updateItem(item.id, { title: e.target.value })}
              />
            </div>
            <ItemActions
              index={idx}
              total={items.length}
              onMoveUp={() => updateItems(moveItem(items, idx, 'up'))}
              onMoveDown={() => updateItems(moveItem(items, idx, 'down'))}
              onDelete={() => removeItem(item.id)}
            />
          </div>
          <textarea
            className="input text-xs resize-none"
            rows={3}
            placeholder="Section content..."
            value={item.content}
            onChange={e => updateItem(item.id, { content: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. Tabs Editor
// ---------------------------------------------------------------------------

function TabsEditor({ block, onUpdateData }: BlockEditorProps) {
  const data = ensureData(block);
  const tabs = data.tabItems ?? [];
  const [activeTab, setActiveTab] = useState(0);

  const updateTabs = (updated: TabItem[]) => onUpdateData({ tabItems: updated });

  const addTab = () => {
    const newTab: TabItem = { id: generateId(), title: `Tab ${tabs.length + 1}`, content: '' };
    updateTabs([...tabs, newTab]);
    setActiveTab(tabs.length);
  };

  const updateTab = (id: string, updates: Partial<TabItem>) => {
    updateTabs(tabs.map(t => (t.id === id ? { ...t, ...updates } : t)));
  };

  const removeTab = (id: string) => {
    const updated = tabs.filter(t => t.id !== id);
    updateTabs(updated);
    if (activeTab >= updated.length) setActiveTab(Math.max(0, updated.length - 1));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionHeading>Tabs</SectionHeading>
        <button onClick={addTab} className="btn-secondary text-xs">
          <Plus className="w-3 h-3 mr-1 inline" /> Add Tab
        </button>
      </div>

      {tabs.length === 0 && (
        <EmptyState icon={Columns} text="No tabs yet" onAction={addTab} actionLabel="Add Tab" />
      )}

      {tabs.length > 0 && (
        <>
          {/* Tab bar preview */}
          <div className="flex gap-1 border-b">
            {tabs.map((tab, idx) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(idx)}
                className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${
                  activeTab === idx
                    ? 'bg-white border border-b-white -mb-px text-blue-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.title || `Tab ${idx + 1}`}
              </button>
            ))}
          </div>

          {/* Active tab editor */}
          {tabs[activeTab] && (
            <div className="card p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  className="input text-xs font-medium flex-1"
                  placeholder="Tab title..."
                  value={tabs[activeTab]!.title}
                  onChange={e => updateTab(tabs[activeTab]!.id, { title: e.target.value })}
                />
                <ItemActions
                  index={activeTab}
                  total={tabs.length}
                  onMoveUp={() => {
                    updateTabs(moveItem(tabs, activeTab, 'up'));
                    setActiveTab(Math.max(0, activeTab - 1));
                  }}
                  onMoveDown={() => {
                    updateTabs(moveItem(tabs, activeTab, 'down'));
                    setActiveTab(Math.min(tabs.length - 1, activeTab + 1));
                  }}
                  onDelete={() => removeTab(tabs[activeTab]!.id)}
                />
              </div>
              <textarea
                className="input text-xs resize-none"
                rows={5}
                placeholder="Tab content..."
                value={tabs[activeTab]!.content}
                onChange={e => updateTab(tabs[activeTab]!.id, { content: e.target.value })}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. Timeline Editor
// ---------------------------------------------------------------------------

function TimelineEditor({ block, onUpdateData }: BlockEditorProps) {
  const data = ensureData(block);
  const events = data.timelineEvents ?? [];

  const updateEvents = (updated: TimelineEvent[]) => onUpdateData({ timelineEvents: updated });

  const addEvent = () => {
    updateEvents([
      ...events,
      { id: generateId(), date: '', title: '', description: '', icon: '' },
    ]);
  };

  const updateEvent = (id: string, updates: Partial<TimelineEvent>) => {
    updateEvents(events.map(ev => (ev.id === id ? { ...ev, ...updates } : ev)));
  };

  const removeEvent = (id: string) => updateEvents(events.filter(ev => ev.id !== id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionHeading>Timeline Events</SectionHeading>
        <button onClick={addEvent} className="btn-secondary text-xs">
          <Plus className="w-3 h-3 mr-1 inline" /> Add Event
        </button>
      </div>

      {events.length === 0 && (
        <EmptyState icon={Clock} text="No timeline events yet" onAction={addEvent} actionLabel="Add Event" />
      )}

      <div className="relative">
        {events.length > 1 && (
          <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-gray-200" />
        )}

        <div className="space-y-3">
          {events.map((ev, idx) => (
            <div key={ev.id} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center flex-shrink-0 mt-2 relative z-10">
                {idx + 1}
              </div>
              <div className="card p-3 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    className="input text-xs w-32"
                    placeholder="Date / label"
                    value={ev.date}
                    onChange={e => updateEvent(ev.id, { date: e.target.value })}
                  />
                  <input
                    className="input text-xs flex-1"
                    placeholder="Event title"
                    value={ev.title}
                    onChange={e => updateEvent(ev.id, { title: e.target.value })}
                  />
                  <ItemActions
                    index={idx}
                    total={events.length}
                    onMoveUp={() => updateEvents(moveItem(events, idx, 'up'))}
                    onMoveDown={() => updateEvents(moveItem(events, idx, 'down'))}
                    onDelete={() => removeEvent(ev.id)}
                  />
                </div>
                <textarea
                  className="input text-xs resize-none"
                  rows={2}
                  placeholder="Event description..."
                  value={ev.description}
                  onChange={e => updateEvent(ev.id, { description: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. Callout Editor
// ---------------------------------------------------------------------------

const calloutStyles: { value: CalloutStyle; label: string; icon: React.ReactNode; bg: string; border: string; text: string }[] = [
  { value: 'info', label: 'Info', icon: <Info className="w-4 h-4" />, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  { value: 'warning', label: 'Warning', icon: <AlertTriangle className="w-4 h-4" />, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  { value: 'tip', label: 'Tip', icon: <Lightbulb className="w-4 h-4" />, bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  { value: 'success', label: 'Success', icon: <CheckCircle className="w-4 h-4" />, bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
];

function CalloutEditor({ block, onUpdateData }: BlockEditorProps) {
  const data = ensureData(block);
  const style = data.calloutStyle ?? 'info';
  const title = data.calloutTitle ?? '';
  const active = calloutStyles.find(s => s.value === style) ?? calloutStyles[0]!;

  return (
    <div className="space-y-3">
      <SectionHeading>Callout</SectionHeading>

      <div>
        <label className="label text-xs">Style</label>
        <div className="flex gap-2">
          {calloutStyles.map(cs => (
            <button
              key={cs.value}
              onClick={() => onUpdateData({ calloutStyle: cs.value })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                style === cs.value
                  ? `${cs.bg} ${cs.border} ${cs.text}`
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {cs.icon}
              {cs.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label text-xs">Title</label>
        <input
          className="input text-xs"
          placeholder="Callout title..."
          value={title}
          onChange={e => onUpdateData({ calloutTitle: e.target.value })}
        />
      </div>

      {/* Live preview */}
      <div className={`rounded-lg border p-4 ${active.bg} ${active.border}`}>
        <div className={`flex items-center gap-2 font-semibold text-sm ${active.text}`}>
          {active.icon}
          {title || 'Callout Title'}
        </div>
        <p className="mt-1 text-xs text-gray-600">
          {block.content || <em className="text-gray-400">Content is edited in the main content area above.</em>}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 7. Table Editor
// ---------------------------------------------------------------------------

function TableEditor({ block, onUpdateData }: BlockEditorProps) {
  const data = ensureData(block);
  const headers = data.tableHeaders ?? ['Column 1', 'Column 2'];
  const rows = data.tableRows ?? [['', '']];
  const striped = data.tableStriped ?? false;

  const setHeaders = (h: string[]) => onUpdateData({ tableHeaders: h });
  const setRows = (r: string[][]) => onUpdateData({ tableRows: r });

  const addColumn = () => {
    setHeaders([...headers, `Column ${headers.length + 1}`]);
    setRows(rows.map(row => [...row, '']));
  };

  const removeColumn = (colIdx: number) => {
    if (headers.length <= 1) return;
    setHeaders(headers.filter((_, i) => i !== colIdx));
    setRows(rows.map(row => row.filter((_, i) => i !== colIdx)));
  };

  const addRow = () => {
    setRows([...rows, Array(headers.length).fill('')]);
  };

  const removeRow = (rowIdx: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== rowIdx));
  };

  const updateHeader = (colIdx: number, value: string) => {
    const updated = [...headers];
    updated[colIdx] = value;
    setHeaders(updated);
  };

  const updateCell = (rowIdx: number, colIdx: number, value: string) => {
    const updated = rows.map(r => [...r]);
    updated[rowIdx]![colIdx] = value;
    setRows(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionHeading>Table</SectionHeading>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={striped}
              onChange={e => onUpdateData({ tableStriped: e.target.checked })}
              className="rounded border-gray-300 text-blue-600"
            />
            Striped
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              {headers.map((h, colIdx) => (
                <th key={colIdx} className="border border-gray-200 bg-gray-50 p-0 relative group/th">
                  <input
                    className="w-full px-2 py-1.5 bg-transparent font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                    value={h}
                    onChange={e => updateHeader(colIdx, e.target.value)}
                  />
                  {headers.length > 1 && (
                    <button
                      onClick={() => removeColumn(colIdx)}
                      className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center opacity-0 group-hover/th:opacity-100 transition-opacity"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </th>
              ))}
              <th className="w-8 border-none">
                <button onClick={addColumn} className="btn-icon w-6 h-6" title="Add column">
                  <Plus className="w-3 h-3" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx} className={striped && rowIdx % 2 === 1 ? 'bg-gray-50' : ''}>
                {row.map((cell, colIdx) => (
                  <td key={colIdx} className="border border-gray-200 p-0">
                    <input
                      className="w-full px-2 py-1.5 bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                      value={cell}
                      onChange={e => updateCell(rowIdx, colIdx, e.target.value)}
                      placeholder="..."
                    />
                  </td>
                ))}
                <td className="w-8 border-none">
                  {rows.length > 1 && (
                    <button onClick={() => removeRow(rowIdx)} className="btn-icon w-6 h-6 text-red-400 hover:text-red-600" title="Remove row">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={addRow} className="btn-ghost text-xs w-full">
        <Plus className="w-3 h-3 mr-1 inline" /> Add Row
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 8. Button Editor
// ---------------------------------------------------------------------------

const buttonStyleOptions: { value: ButtonStyle; label: string }[] = [
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'outline', label: 'Outline' },
  { value: 'link', label: 'Link' },
];

function ButtonEditor({ block, onUpdateData }: BlockEditorProps) {
  const data = ensureData(block);
  const text = data.buttonText ?? 'Click Here';
  const url = data.buttonUrl ?? '';
  const style = data.buttonStyle ?? 'primary';
  const newTab = data.buttonNewTab ?? false;

  const btnClasses: Record<ButtonStyle, string> = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50',
    link: 'text-blue-600 underline hover:text-blue-800',
  };

  return (
    <div className="space-y-3">
      <SectionHeading>Button</SectionHeading>

      <div>
        <label className="label text-xs">Button Text</label>
        <input
          className="input text-xs"
          placeholder="Click Here"
          value={text}
          onChange={e => onUpdateData({ buttonText: e.target.value })}
        />
      </div>

      <div>
        <label className="label text-xs">URL</label>
        <input
          className="input text-xs"
          placeholder="https://..."
          value={url}
          onChange={e => onUpdateData({ buttonUrl: e.target.value })}
        />
      </div>

      <div>
        <label className="label text-xs">Style</label>
        <select
          className="input text-xs"
          value={style}
          onChange={e => onUpdateData({ buttonStyle: e.target.value as ButtonStyle })}
        >
          {buttonStyleOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
        <input
          type="checkbox"
          checked={newTab}
          onChange={e => onUpdateData({ buttonNewTab: e.target.checked })}
          className="rounded border-gray-300 text-blue-600"
        />
        Open in new tab
        <ExternalLink className="w-3 h-3 text-gray-400" />
      </label>

      {/* Live preview */}
      <div className="pt-3 border-t">
        <p className="text-[10px] text-gray-400 mb-2 uppercase tracking-wide">Preview</p>
        <div className="flex justify-center">
          <span className={`inline-block px-5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-default ${btnClasses[style]}`}>
            {text || 'Button'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 9. Audio Editor
// ---------------------------------------------------------------------------

function AudioEditor({ block, onUpdateData }: BlockEditorProps) {
  const data = ensureData(block);
  const audioUrl = data.audioUrl ?? '';

  return (
    <div className="space-y-3">
      <SectionHeading>Audio</SectionHeading>

      <div>
        <label className="label text-xs">Audio File URL</label>
        <input
          className="input text-xs"
          placeholder="https://example.com/audio.mp3"
          value={audioUrl}
          onChange={e => onUpdateData({ audioUrl: e.target.value })}
        />
      </div>

      {audioUrl ? (
        <div className="card p-3">
          <p className="text-[10px] text-gray-400 mb-2 uppercase tracking-wide">Preview</p>
          <audio controls className="w-full" src={audioUrl}>
            Your browser does not support the audio element.
          </audio>
        </div>
      ) : (
        <EmptyState icon={Music} text="Enter an audio URL to see a preview" />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 10. Embed Editor
// ---------------------------------------------------------------------------

function EmbedEditor({ block, onUpdateData }: BlockEditorProps) {
  const data = ensureData(block);
  const embedUrl = data.embedUrl ?? '';
  const embedHeight = data.embedHeight ?? 400;

  return (
    <div className="space-y-3">
      <SectionHeading>Embed (iFrame)</SectionHeading>

      <div>
        <label className="label text-xs">Embed URL</label>
        <input
          className="input text-xs"
          placeholder="https://example.com/embed"
          value={embedUrl}
          onChange={e => onUpdateData({ embedUrl: e.target.value })}
        />
      </div>

      <div>
        <label className="label text-xs">Height (px)</label>
        <input
          type="number"
          className="input text-xs w-32"
          min={100}
          max={1200}
          value={embedHeight}
          onChange={e => onUpdateData({ embedHeight: parseInt(e.target.value) || 400 })}
        />
      </div>

      {embedUrl ? (
        <div className="card p-0 overflow-hidden rounded-lg">
          <p className="text-[10px] text-gray-400 px-3 pt-2 uppercase tracking-wide">Preview</p>
          <iframe
            src={embedUrl}
            className="w-full border-0"
            style={{ height: `${Math.min(embedHeight, 400)}px` }}
            title="Embed preview"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      ) : (
        <EmptyState icon={Code} text="Enter an embed URL to see a preview" />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 11. Gallery Editor
// ---------------------------------------------------------------------------

function GalleryEditor({ block, onUpdateData }: BlockEditorProps) {
  const data = ensureData(block);
  const images = data.galleryImages ?? [];
  const columns = data.galleryColumns ?? 3;

  const updateImages = (updated: GalleryImage[]) => onUpdateData({ galleryImages: updated });

  const addImage = () => {
    updateImages([...images, { id: generateId(), url: '', caption: '', alt: '' }]);
  };

  const updateImage = (id: string, updates: Partial<GalleryImage>) => {
    updateImages(images.map(img => (img.id === id ? { ...img, ...updates } : img)));
  };

  const removeImage = (id: string) => updateImages(images.filter(img => img.id !== id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionHeading>Gallery</SectionHeading>
        <button onClick={addImage} className="btn-secondary text-xs">
          <Plus className="w-3 h-3 mr-1 inline" /> Add Image
        </button>
      </div>

      <div>
        <label className="label text-xs">Grid Columns</label>
        <div className="flex gap-2">
          {[2, 3, 4].map(n => (
            <button
              key={n}
              onClick={() => onUpdateData({ galleryColumns: n })}
              className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                columns === n
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {n} cols
            </button>
          ))}
        </div>
      </div>

      {images.length === 0 && (
        <EmptyState icon={Image} text="No images yet" onAction={addImage} actionLabel="Add Image" />
      )}

      {/* Thumbnail grid preview */}
      {images.length > 0 && (
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {images.map(img =>
            img.url ? (
              <div key={img.id} className="relative group/gimg rounded-lg overflow-hidden border aspect-square bg-gray-100">
                <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/gimg:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => removeImage(img.id)}
                    className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                {img.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1.5 py-0.5 truncate">
                    {img.caption}
                  </div>
                )}
              </div>
            ) : (
              <div key={img.id} className="rounded-lg border-2 border-dashed border-gray-200 aspect-square flex items-center justify-center">
                <Image className="w-6 h-6 text-gray-300" />
              </div>
            ),
          )}
        </div>
      )}

      {/* Image detail editors */}
      {images.map((img, idx) => (
        <div key={img.id} className="card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Image {idx + 1}</span>
            <ItemActions
              index={idx}
              total={images.length}
              onMoveUp={() => updateImages(moveItem(images, idx, 'up'))}
              onMoveDown={() => updateImages(moveItem(images, idx, 'down'))}
              onDelete={() => removeImage(img.id)}
            />
          </div>
          <input
            className="input text-xs"
            placeholder="Image URL"
            value={img.url}
            onChange={e => updateImage(img.id, { url: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input text-xs"
              placeholder="Caption"
              value={img.caption}
              onChange={e => updateImage(img.id, { caption: e.target.value })}
            />
            <input
              className="input text-xs"
              placeholder="Alt text"
              value={img.alt}
              onChange={e => updateImage(img.id, { alt: e.target.value })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 12. Labeled Graphic Editor
// ---------------------------------------------------------------------------

function LabeledGraphicEditor({ block, onUpdateData }: BlockEditorProps) {
  const data = ensureData(block);
  const image = data.labeledImage ?? '';
  const markers = data.labeledMarkers ?? [];
  const imgRef = useRef<HTMLDivElement>(null);

  const updateMarkers = (updated: LabeledMarker[]) => onUpdateData({ labeledMarkers: updated });

  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!imgRef.current) return;
      const rect = imgRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const newMarker: LabeledMarker = {
        id: generateId(),
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        label: `Label ${markers.length + 1}`,
        description: '',
        color: '#3b82f6',
      };
      updateMarkers([...markers, newMarker]);
    },
    [markers, onUpdateData],
  );

  const updateMarker = (id: string, updates: Partial<LabeledMarker>) => {
    updateMarkers(markers.map(m => (m.id === id ? { ...m, ...updates } : m)));
  };

  const removeMarker = (id: string) => updateMarkers(markers.filter(m => m.id !== id));

  return (
    <div className="space-y-3">
      <SectionHeading>Labeled Graphic</SectionHeading>

      <div>
        <label className="label text-xs">Image URL</label>
        <input
          className="input text-xs"
          placeholder="https://example.com/diagram.png"
          value={image}
          onChange={e => onUpdateData({ labeledImage: e.target.value })}
        />
      </div>

      {image && (
        <div>
          <p className="text-xs text-gray-400 mb-1">Click on the image to add a labeled marker</p>
          <div
            ref={imgRef}
            className="relative rounded-lg overflow-hidden border cursor-crosshair"
            onClick={handleImageClick}
          >
            <img src={image} alt="Labeled graphic" className="w-full block" />
            {markers.map((m, i) => (
              <div
                key={m.id}
                className="absolute w-7 h-7 -ml-3.5 -mt-3.5 rounded-full text-white text-xs font-bold flex items-center justify-center shadow-lg border-2 border-white pointer-events-none"
                style={{ left: `${m.x}%`, top: `${m.y}%`, backgroundColor: m.color }}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      )}

      {markers.length > 0 && (
        <div className="space-y-2">
          <SectionHeading>Labels</SectionHeading>
          {markers.map((m, idx) => (
            <div key={m.id} className="card p-2 flex gap-2 items-start">
              <div
                className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-1"
                style={{ backgroundColor: m.color }}
              >
                {idx + 1}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex gap-2">
                  <input
                    className="input text-xs flex-1"
                    placeholder="Label"
                    value={m.label}
                    onChange={e => updateMarker(m.id, { label: e.target.value })}
                  />
                  <input
                    type="color"
                    value={m.color}
                    onChange={e => updateMarker(m.id, { color: e.target.value })}
                    className="w-8 h-8 rounded border cursor-pointer flex-shrink-0"
                    title="Marker color"
                  />
                </div>
                <textarea
                  className="input text-xs resize-none"
                  rows={2}
                  placeholder="Description..."
                  value={m.description}
                  onChange={e => updateMarker(m.id, { description: e.target.value })}
                />
                <span className="text-[10px] text-gray-400">
                  x: {m.x.toFixed(1)}% &middot; y: {m.y.toFixed(1)}%
                </span>
              </div>
              <button onClick={() => removeMarker(m.id)} className="btn-icon w-6 h-6 text-red-400 hover:text-red-600 flex-shrink-0">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 13. Image Layout Editors (image-top, image-bottom, image-left, image-right, two-images, three-images)
// ---------------------------------------------------------------------------

function useLayoutImageUpload(
  onUpdateData: BlockEditorProps['onUpdateData'],
  images: { url: string; caption: string; alt: string }[],
  index: number,
) {
  return () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const updated = [...images];
        updated[index] = { ...updated[index]!, url: reader.result as string };
        onUpdateData({ layoutImages: updated });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };
}

function LayoutImageInput({
  image,
  index,
  images,
  onUpdateData,
}: {
  image: { url: string; caption: string; alt: string };
  index: number;
  images: { url: string; caption: string; alt: string }[];
  onUpdateData: BlockEditorProps['onUpdateData'];
}) {
  const handleUpload = useLayoutImageUpload(onUpdateData, images, index);
  const updateField = (field: string, value: string) => {
    const updated = [...images];
    updated[index] = { ...updated[index]!, [field]: value };
    onUpdateData({ layoutImages: updated });
  };

  return (
    <div className="space-y-1.5">
      {image.url ? (
        <div className="relative group/img">
          <img src={image.url} alt={image.alt || ''} className="w-full rounded-lg max-h-40 object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
            <button onClick={handleUpload} className="btn-secondary text-xs">Replace</button>
          </div>
        </div>
      ) : (
        <div
          onClick={handleUpload}
          className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
        >
          <Image className="w-6 h-6 text-gray-400 mx-auto mb-1" />
          <p className="text-[10px] text-gray-500">Upload image</p>
        </div>
      )}
      <input
        className="input text-xs"
        placeholder="Image URL"
        value={image.url.startsWith('data:') ? '' : image.url}
        onChange={e => updateField('url', e.target.value)}
      />
      <input
        className="input text-xs"
        placeholder="Caption"
        value={image.caption}
        onChange={e => updateField('caption', e.target.value)}
      />
    </div>
  );
}

function ensureLayoutImages(data: ContentBlockData, count: number) {
  const existing = data.layoutImages ?? [];
  const result = [...existing];
  while (result.length < count) result.push({ url: '', caption: '', alt: '' });
  return result.slice(0, count);
}

function ImageTopEditor({ block, onUpdateData }: BlockEditorProps) {
  const data = ensureData(block);
  const images = ensureLayoutImages(data, 1);
  return (
    <div className="space-y-3">
      <SectionHeading>Image Top Layout</SectionHeading>
      <LayoutImageInput image={images[0]!} index={0} images={images} onUpdateData={onUpdateData} />
      <textarea
        className="input text-xs resize-none"
        rows={4}
        placeholder="Text content below the image..."
        value={data.layoutText ?? ''}
        onChange={e => onUpdateData({ layoutText: e.target.value })}
      />
    </div>
  );
}

function ImageBottomEditor({ block, onUpdateData }: BlockEditorProps) {
  const data = ensureData(block);
  const images = ensureLayoutImages(data, 1);
  return (
    <div className="space-y-3">
      <SectionHeading>Image Bottom Layout</SectionHeading>
      <textarea
        className="input text-xs resize-none"
        rows={4}
        placeholder="Text content above the image..."
        value={data.layoutText ?? ''}
        onChange={e => onUpdateData({ layoutText: e.target.value })}
      />
      <LayoutImageInput image={images[0]!} index={0} images={images} onUpdateData={onUpdateData} />
    </div>
  );
}

function ImageLeftEditor({ block, onUpdateData }: BlockEditorProps) {
  const data = ensureData(block);
  const images = ensureLayoutImages(data, 1);
  return (
    <div className="space-y-3">
      <SectionHeading>Image Left Layout</SectionHeading>
      <div className="grid grid-cols-2 gap-3">
        <LayoutImageInput image={images[0]!} index={0} images={images} onUpdateData={onUpdateData} />
        <textarea
          className="input text-xs resize-none h-full"
          rows={6}
          placeholder="Text content..."
          value={data.layoutText ?? ''}
          onChange={e => onUpdateData({ layoutText: e.target.value })}
        />
      </div>
    </div>
  );
}

function ImageRightEditor({ block, onUpdateData }: BlockEditorProps) {
  const data = ensureData(block);
  const images = ensureLayoutImages(data, 1);
  return (
    <div className="space-y-3">
      <SectionHeading>Image Right Layout</SectionHeading>
      <div className="grid grid-cols-2 gap-3">
        <textarea
          className="input text-xs resize-none h-full"
          rows={6}
          placeholder="Text content..."
          value={data.layoutText ?? ''}
          onChange={e => onUpdateData({ layoutText: e.target.value })}
        />
        <LayoutImageInput image={images[0]!} index={0} images={images} onUpdateData={onUpdateData} />
      </div>
    </div>
  );
}

function TwoImagesEditor({ block, onUpdateData }: BlockEditorProps) {
  const data = ensureData(block);
  const images = ensureLayoutImages(data, 2);
  return (
    <div className="space-y-3">
      <SectionHeading>Two Images Layout</SectionHeading>
      <div className="grid grid-cols-2 gap-3">
        {images.map((img, idx) => (
          <LayoutImageInput key={idx} image={img} index={idx} images={images} onUpdateData={onUpdateData} />
        ))}
      </div>
    </div>
  );
}

function ThreeImagesEditor({ block, onUpdateData }: BlockEditorProps) {
  const data = ensureData(block);
  const images = ensureLayoutImages(data, 3);
  return (
    <div className="space-y-3">
      <SectionHeading>Three Images Layout</SectionHeading>
      <div className="grid grid-cols-3 gap-3">
        {images.map((img, idx) => (
          <LayoutImageInput key={idx} image={img} index={idx} images={images} onUpdateData={onUpdateData} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main BlockEditor component
// ---------------------------------------------------------------------------

export function BlockEditor(props: BlockEditorProps) {
  const { block } = props;

  switch (block.type) {
    case 'flip-card':
      return <FlipCardEditor {...props} />;
    case 'hotspot':
      return <HotspotEditor {...props} />;
    case 'accordion':
      return <AccordionEditor {...props} />;
    case 'tabs':
      return <TabsEditor {...props} />;
    case 'timeline':
      return <TimelineEditor {...props} />;
    case 'callout':
      return <CalloutEditor {...props} />;
    case 'table':
      return <TableEditor {...props} />;
    case 'button':
      return <ButtonEditor {...props} />;
    case 'audio':
      return <AudioEditor {...props} />;
    case 'embed':
      return <EmbedEditor {...props} />;
    case 'gallery':
      return <GalleryEditor {...props} />;
    case 'labeled-graphic':
      return <LabeledGraphicEditor {...props} />;
    case 'image-top':
      return <ImageTopEditor {...props} />;
    case 'image-bottom':
      return <ImageBottomEditor {...props} />;
    case 'image-left':
      return <ImageLeftEditor {...props} />;
    case 'image-right':
      return <ImageRightEditor {...props} />;
    case 'two-images':
      return <TwoImagesEditor {...props} />;
    case 'three-images':
      return <ThreeImagesEditor {...props} />;
    default:
      return null;
  }
}
