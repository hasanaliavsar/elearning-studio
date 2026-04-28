import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { RichTextEditor } from './RichTextEditor';
import { QuizBuilder } from './QuizBuilder';
import { BlockEditor } from './BlockEditors';
import { AIQuizGeneratorButton } from './AIGenerator';
import { VideoRecorderModal } from './VideoRecorder';
import { LivePreviewPane } from './LivePreviewPane';
import { ModuleCoverEditor, RawHtmlEditor, isModuleCoverHtml, isStructuralHtml } from './TemplateAwareEditor';
import { InlineAdd, ImagePicker, STOCK_IMAGES } from './CanvasInsert';
import { BlockResizeHandle, BlockSizingControls } from './BlockSizing';
import { CanvasFreeForm, defaultCanvasPos } from './CanvasFreeForm';
import { generateId } from '../utils/helpers';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Course, Slide, SlideLayout, ContentBlock, EntranceAnimation, SlideTransition, LearningObjective } from '../types';
import {
  Type, Image, Video, FileText, List, Minus, Code, Plus, Trash2,
  Settings, MessageSquare, HelpCircle, GripVertical, ChevronUp, ChevronDown,
  Layout, Columns, Palette,
  RotateCw, MousePointerClick, ChevronsUpDown, LayoutPanelTop, Clock, AlertCircle,
  Table2, MousePointer, Music, Code2, Images, MapPin, Sparkles, BookOpen, Play,
  ArrowUpFromLine, ArrowDownFromLine, PanelLeft, PanelRight, Columns2, Grid3x3,
  GitBranch, ListChecks, Layers, Quote, Columns3, Eye, EyeOff
} from 'lucide-react';

interface Props {
  course: Course;
  moduleId: string;
  lessonId: string;
  slide: Slide;
}

type BlockOption = { type: ContentBlock['type']; label: string; icon: React.ReactNode };


const blockCategories: { label: string; options: BlockOption[] }[] = [
  {
    label: 'Basic',
    options: [
      { type: 'heading', label: 'Heading', icon: <Type className="w-4 h-4" /> },
      { type: 'text', label: 'Text', icon: <FileText className="w-4 h-4" /> },
      { type: 'image', label: 'Image', icon: <Image className="w-4 h-4" /> },
      { type: 'video', label: 'Video', icon: <Video className="w-4 h-4" /> },
      { type: 'divider', label: 'Divider', icon: <Minus className="w-4 h-4" /> },
      { type: 'code', label: 'Code', icon: <Code className="w-4 h-4" /> },
      { type: 'pull-quote', label: 'Pull Quote', icon: <Quote className="w-4 h-4" /> },
      { type: 'comparison', label: 'Comparison', icon: <Columns3 className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Image Layouts',
    options: [
      { type: 'image-top', label: 'Img Top', icon: <ArrowUpFromLine className="w-4 h-4" /> },
      { type: 'image-bottom', label: 'Img Bottom', icon: <ArrowDownFromLine className="w-4 h-4" /> },
      { type: 'image-left', label: 'Img Left', icon: <PanelLeft className="w-4 h-4" /> },
      { type: 'image-right', label: 'Img Right', icon: <PanelRight className="w-4 h-4" /> },
      { type: 'two-images', label: '2 Images', icon: <Columns2 className="w-4 h-4" /> },
      { type: 'three-images', label: '3 Images', icon: <Grid3x3 className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Interactive',
    options: [
      { type: 'flip-card', label: 'Flip Cards', icon: <RotateCw className="w-4 h-4" /> },
      { type: 'hotspot', label: 'Hotspot', icon: <MousePointerClick className="w-4 h-4" /> },
      { type: 'accordion', label: 'Accordion', icon: <ChevronsUpDown className="w-4 h-4" /> },
      { type: 'tabs', label: 'Tabs', icon: <LayoutPanelTop className="w-4 h-4" /> },
      { type: 'timeline', label: 'Timeline', icon: <Clock className="w-4 h-4" /> },
      { type: 'labeled-graphic', label: 'Labels', icon: <MapPin className="w-4 h-4" /> },
      { type: 'scenario', label: 'Scenario', icon: <GitBranch className="w-4 h-4" /> },
      { type: 'checklist', label: 'Checklist', icon: <ListChecks className="w-4 h-4" /> },
      { type: 'card-sorting', label: 'Card Sort', icon: <Layers className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Media & Data',
    options: [
      { type: 'audio', label: 'Audio', icon: <Music className="w-4 h-4" /> },
      { type: 'embed', label: 'Embed', icon: <Code2 className="w-4 h-4" /> },
      { type: 'gallery', label: 'Gallery', icon: <Images className="w-4 h-4" /> },
      { type: 'table', label: 'Table', icon: <Table2 className="w-4 h-4" /> },
      { type: 'button', label: 'Button', icon: <MousePointer className="w-4 h-4" /> },
      { type: 'callout', label: 'Callout', icon: <AlertCircle className="w-4 h-4" /> },
    ],
  },
];

// Returns the inline style for a block's width + horizontal alignment.
// Defaults: width=100%, align=left. Centered/right blocks use auto margins.
export function getBlockSizingStyle(block: ContentBlock): React.CSSProperties {
  const width = typeof block.width === 'number' ? Math.max(20, Math.min(100, block.width)) : 100;
  const align = block.align || 'left';
  if (width >= 100) return {};
  return {
    width: `${width}%`,
    marginLeft: align === 'left' ? 0 : 'auto',
    marginRight: align === 'right' ? 0 : 'auto',
  };
}

// Wraps a block so it can be dragged to reorder on the canvas. Children
// receive the drag handle's listeners + attributes via render-prop so
// we can wire them to the existing GripVertical icon in the block toolbar.
function SortableBlock({ id, children }: {
  id: string;
  children: (handle: { listeners: ReturnType<typeof useSortable>['listeners']; attributes: ReturnType<typeof useSortable>['attributes']; isDragging: boolean }) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
    position: 'relative',
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ listeners, attributes, isDragging })}
    </div>
  );
}

export function SlideEditor({ course, moduleId, lessonId, slide }: Props) {
  const updateSlide = useStore(s => s.updateSlide);
  const addContentBlock = useStore(s => s.addContentBlock);
  const insertContentBlock = useStore(s => s.insertContentBlock);
  const reorderContentBlocks = useStore(s => s.reorderContentBlocks);
  const updateContentBlock = useStore(s => s.updateContentBlock);
  const deleteContentBlock = useStore(s => s.deleteContentBlock);
  const addQuestion = useStore(s => s.addQuestion);
  const editor = useStore(s => s.editor);
  const setRightPanelTab = useStore(s => s.setRightPanelTab);

  const [showAddBlock, setShowAddBlock] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [livePreviewOpen, setLivePreviewOpen] = useState(true);
  const [dragOver, setDragOver] = useState(false);

  // On canvas-layout slides, ensure every block has a `pos` — assign a
  // default if it was added by the linear add flow (which doesn't know
  // about canvas mode).
  useEffect(() => {
    if (slide.layout !== 'canvas') return;
    for (const block of slide.content) {
      if (!block.pos) {
        updateContentBlock(course.id, moduleId, lessonId, slide.id, block.id, {
          pos: defaultCanvasPos(slide.content),
        });
        break; // one at a time to keep effects predictable
      }
    }
  }, [slide.layout, slide.content, course.id, moduleId, lessonId, slide.id, updateContentBlock]);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);

  const handleUpdateSlide = (updates: Partial<Slide>) => {
    updateSlide(course.id, moduleId, lessonId, slide.id, updates);
  };

  const handleBlockUpdate = (blockId: string, updates: Partial<ContentBlock>) => {
    updateContentBlock(course.id, moduleId, lessonId, slide.id, blockId, updates);
  };

  const handleDeleteBlock = (blockId: string) => {
    deleteContentBlock(course.id, moduleId, lessonId, slide.id, blockId);
  };

  const handleInlineAdd = (type: ContentBlock['type'], atIndex: number) => {
    addContentBlock(course.id, moduleId, lessonId, slide.id, type, atIndex);
  };

  const blockSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleBlockDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = slide.content.findIndex(b => b.id === active.id);
    const newIdx = slide.content.findIndex(b => b.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const ordered = arrayMove(slide.content, oldIdx, newIdx);
    reorderContentBlocks(course.id, moduleId, lessonId, slide.id, ordered.map(b => b.id));
  };

  const handleDropFiles = async (files: FileList | null, atIndex?: number) => {
    if (!files || !files.length) return;
    const images = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!images.length) return;
    let i = typeof atIndex === 'number' ? atIndex : slide.content.length;
    for (const file of images) {
      const dataUrl: string = await new Promise(res => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.readAsDataURL(file);
      });
      const newBlock: ContentBlock = {
        id: generateId(),
        type: 'image',
        content: dataUrl,
        alt: file.name.replace(/\.[^.]+$/, ''),
        caption: '',
      };
      insertContentBlock(course.id, moduleId, lessonId, slide.id, newBlock, i);
      i += 1;
    }
  };

  const handleMoveBlock = (blockId: string, direction: 'up' | 'down') => {
    const idx = slide.content.findIndex(b => b.id === blockId);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= slide.content.length) return;
    const newContent = [...slide.content];
    [newContent[idx]!, newContent[newIdx]!] = [newContent[newIdx]!, newContent[idx]!];
    handleUpdateSlide({ content: newContent });
  };

  const handleImageUpload = (blockId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        handleBlockUpdate(blockId, { content: reader.result as string });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // Lightweight body renderer for canvas-mode blocks — no editor affordances,
  // just the visual content. Falls back to a placeholder for interactive
  // block types so authors can still see and position them.
  const renderCanvasBlockBody = (block: ContentBlock): React.ReactNode => {
    if (block.type === 'text' || block.type === 'heading' || block.type === 'list') {
      return <div className="p-3 w-full h-full overflow-hidden" dangerouslySetInnerHTML={{ __html: block.content || '<p class="text-gray-400 italic">Empty</p>' }} />;
    }
    if (block.type === 'image' && block.content) {
      return <img src={block.content} alt={block.alt || ''} className="w-full h-full object-cover" />;
    }
    if (block.type === 'image') {
      return <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs bg-gray-50 border-2 border-dashed border-gray-200">Empty image — open inspector to set</div>;
    }
    if (block.type === 'divider') return <hr className="my-auto border-gray-300" />;
    if (block.type === 'button') {
      const label = block.data?.buttonText || 'Button';
      return <div className="w-full h-full flex items-center justify-center"><a className="px-4 py-2 rounded text-sm font-medium" style={{ background: '#171D97', color: '#FFFFFF' }} onClick={e => e.preventDefault()}>{label}</a></div>;
    }
    // Generic placeholder for interactive blocks
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 bg-gray-50 border border-dashed border-gray-300 rounded">
        <span>{block.type} (open inspector)</span>
      </div>
    );
  };

  const renderBlock = (
    block: ContentBlock,
    idx: number,
    handle?: { listeners: ReturnType<typeof useSortable>['listeners']; attributes: ReturnType<typeof useSortable>['attributes']; isDragging: boolean }
  ) => {
    const isActive = activeBlockId === block.id;
    const sizingStyle = getBlockSizingStyle(block);

    return (
      <div
        key={block.id}
        className={`group relative rounded-lg border transition-all ${
          isActive ? 'border-brand-300 ring-2 ring-brand-100' : 'border-transparent hover:border-gray-200'
        }`}
        style={sizingStyle}
        onClick={() => setActiveBlockId(block.id)}
      >
        {/* Right-edge resize handle — drag to scale the block width */}
        {!slide.fullBleed && slide.layout !== 'two-column' && (
          <BlockResizeHandle
            block={block}
            onResize={(width, align) => handleBlockUpdate(block.id, { width, ...(align ? { align } : {}) })}
            visible={isActive}
          />
        )}
        {/* Block toolbar */}
        <div className={`absolute -left-10 top-0 flex flex-col items-center gap-0.5 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
          <button
            onClick={() => handleMoveBlock(block.id, 'up')}
            className="btn-icon w-6 h-6"
            disabled={idx === 0}
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            type="button"
            className="btn-icon w-6 h-6 cursor-grab active:cursor-grabbing touch-none"
            {...(handle?.attributes || {})}
            {...(handle?.listeners || {})}
            onClick={e => e.stopPropagation()}
            title="Drag to reorder"
          >
            <GripVertical className="w-3 h-3 text-gray-400" />
          </button>
          <button
            onClick={() => handleMoveBlock(block.id, 'down')}
            className="btn-icon w-6 h-6"
            disabled={idx === slide.content.length - 1}
          >
            <ChevronDown className="w-3 h-3" />
          </button>
          <select
            value={block.animation || 'none'}
            onChange={e => handleBlockUpdate(block.id, { animation: e.target.value as EntranceAnimation })}
            onClick={e => e.stopPropagation()}
            className="w-6 h-6 text-[8px] bg-white border border-gray-200 rounded cursor-pointer appearance-none text-center hover:border-brand-300"
            title="Entrance animation"
          >
            <option value="none">-</option>
            <option value="fade-in">Fade</option>
            <option value="slide-up">Up</option>
            <option value="slide-left">Left</option>
            <option value="slide-right">Right</option>
            <option value="zoom-in">Zoom</option>
            <option value="bounce-in">Bounce</option>
          </select>
        </div>

        {/* Animation badge */}
        {block.animation && block.animation !== 'none' && (
          <span className="absolute -top-2 left-2 bg-brand-100 text-brand-700 text-[9px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <Play className="w-2.5 h-2.5" />
            {block.animation}
          </span>
        )}

        {/* Delete button */}
        <button
          onClick={() => handleDeleteBlock(block.id)}
          className={`absolute -right-3 -top-3 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm ${
            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          } transition-opacity hover:bg-red-600`}
        >
          <Trash2 className="w-3 h-3" />
        </button>

        {/* Block content */}
        <div className="p-2">
          {(block.type === 'text' || block.type === 'heading' || block.type === 'list') && (
            isModuleCoverHtml(block.content) ? (
              <ModuleCoverEditor
                content={block.content}
                onChange={(html) => handleBlockUpdate(block.id, { content: html })}
              />
            ) : isStructuralHtml(block.content) ? (
              <RawHtmlEditor
                content={block.content}
                onChange={(html) => handleBlockUpdate(block.id, { content: html })}
              />
            ) : (
              <RichTextEditor
                content={block.content}
                onChange={(html) => handleBlockUpdate(block.id, { content: html })}
                minimal={block.type !== 'heading'}
                placeholder={
                  block.type === 'heading' ? 'Enter heading...' :
                  block.type === 'list' ? 'Start a list...' :
                  'Enter text...'
                }
              />
            )
          )}

          {block.type === 'image' && (
            <div className="space-y-2">
              {block.content ? (
                <div className="relative group/img">
                  <img
                    src={block.content}
                    alt={block.alt || ''}
                    className="max-w-full rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleImageUpload(block.id)}
                      className="btn-secondary text-xs"
                    >
                      Replace
                    </button>
                    <button
                      onClick={() => handleBlockUpdate(block.id, { content: '' })}
                      className="btn-danger text-xs"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <ImagePicker
                  onSelect={(src, alt) => handleBlockUpdate(block.id, { content: src, alt: alt || block.alt || '' })}
                />
              )}
              <input
                type="text"
                className="input text-xs"
                placeholder="Alt text (for accessibility)"
                value={block.alt || ''}
                onChange={e => handleBlockUpdate(block.id, { alt: e.target.value })}
              />
            </div>
          )}

          {block.type === 'video' && (
            <div className="space-y-2">
              {block.content ? (
                <div className="aspect-video rounded-lg overflow-hidden bg-black">
                  <iframe
                    src={block.content.replace('watch?v=', 'embed/')}
                    className="w-full h-full"
                    allowFullScreen
                    title="Video"
                  />
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Video className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Enter a video URL below</p>
                  <p className="text-xs text-gray-400 mt-1">Supports YouTube, Vimeo, and direct video URLs</p>
                </div>
              )}
              <input
                type="text"
                className="input text-xs"
                placeholder="Video URL (YouTube, Vimeo, or direct link)"
                value={block.content}
                onChange={e => handleBlockUpdate(block.id, { content: e.target.value })}
              />
            </div>
          )}

          {block.type === 'code' && (
            <div>
              <textarea
                className="w-full font-mono text-sm bg-brand-800 text-ivory-50 rounded-md p-4 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                rows={6}
                value={block.content.replace(/<[^>]*>/g, '')}
                onChange={e => handleBlockUpdate(block.id, { content: `<pre><code>${e.target.value}</code></pre>` })}
                placeholder="// Enter code here..."
              />
            </div>
          )}

          {block.type === 'divider' && (
            <hr className="my-4 border-gray-300" />
          )}

          {/* Interactive and advanced block types - delegate to BlockEditor */}
          {['flip-card', 'hotspot', 'accordion', 'tabs', 'timeline', 'callout',
            'table', 'button', 'audio', 'embed', 'gallery', 'labeled-graphic',
            'image-top', 'image-bottom', 'image-left', 'image-right', 'two-images', 'three-images',
            'scenario', 'checklist', 'card-sorting',
            'pull-quote', 'comparison',
          ].includes(block.type) && (
            <BlockEditor
              block={block}
              onUpdate={(updates) => handleBlockUpdate(block.id, updates)}
              onUpdateData={(dataUpdates) => handleBlockUpdate(block.id, { data: { ...block.data, ...dataUpdates } })}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex">
      {/* Main slide canvas */}
      <div className="flex-1 overflow-auto p-6" onClick={() => setActiveBlockId(null)}>
        <div className="max-w-4xl mx-auto">
          {/* Slide title */}
          <div className="mb-4 flex items-center gap-3">
            <input
              type="text"
              value={slide.title}
              onChange={e => handleUpdateSlide({ title: e.target.value })}
              className="text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 flex-1 text-gray-900 placeholder-gray-300"
              placeholder="Slide title..."
            />
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setLivePreviewOpen(v => !v); }}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition flex-shrink-0"
              title={livePreviewOpen ? 'Hide live preview' : 'Show live preview'}
            >
              {livePreviewOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {livePreviewOpen ? 'Hide preview' : 'Live preview'}
            </button>
          </div>

          {/* Slide content area */}
          <div
            className={`card min-h-[500px] relative transition-shadow ${slide.fullBleed ? 'p-0 overflow-hidden' : 'p-8'} ${dragOver ? 'ring-2 ring-[#171D97] ring-offset-2' : ''}`}
            style={{ backgroundColor: slide.backgroundColor }}
            onClick={e => e.stopPropagation()}
            onDragOver={e => {
              if (e.dataTransfer.types.includes('Files')) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                if (!dragOver) setDragOver(true);
              }
            }}
            onDragLeave={e => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              setDragOver(false);
            }}
            onDrop={e => {
              if (e.dataTransfer.types.includes('Files')) {
                e.preventDefault();
                setDragOver(false);
                handleDropFiles(e.dataTransfer.files);
              }
            }}
          >
            {dragOver && (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[#171D97]/10 backdrop-blur-[1px] rounded">
                <div className="bg-white px-4 py-2 rounded-lg shadow-md text-sm font-medium text-[#171D97] flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M3 16v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3M16 8l-4-4-4 4M12 4v12" />
                  </svg>
                  Drop image to insert
                </div>
              </div>
            )}
            {slide.layout === 'canvas' ? (
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-[#171D97]">Canvas mode · drag freely</p>
                  <div className="text-xs">
                    <InlineAdd index={slide.content.length} onInsert={handleInlineAdd} />
                  </div>
                </div>
                <CanvasFreeForm
                  blocks={slide.content}
                  activeId={activeBlockId}
                  onSelect={setActiveBlockId}
                  onMove={(id, pos) => handleBlockUpdate(id, { pos })}
                  onReorder={(id, dir) => {
                    const idx = slide.content.findIndex(b => b.id === id);
                    if (idx < 0) return;
                    const target = dir === 'forward' ? idx + 1 : idx - 1;
                    if (target < 0 || target >= slide.content.length) return;
                    const next = [...slide.content];
                    [next[idx]!, next[target]!] = [next[target]!, next[idx]!];
                    handleUpdateSlide({ content: next });
                  }}
                  renderBlockBody={renderCanvasBlockBody}
                />
              </div>
            ) : slide.fullBleed ? (
              <>{slide.content.map((block, idx) => renderBlock(block, idx))}</>
            ) : slide.layout === 'two-column' ? (
              <div className="grid grid-cols-2 gap-6">
                {slide.content.map((block, idx) => renderBlock(block, idx))}
              </div>
            ) : (
              <div>
                {slide.content.length === 0 && (
                  <div className="text-center py-10 text-gray-400">
                    <p className="text-sm mb-1">Empty slide</p>
                    <p className="text-xs">Drop an image here, or use the + line below to add content</p>
                  </div>
                )}
                <InlineAdd index={0} onInsert={handleInlineAdd} />
                <DndContext sensors={blockSensors} collisionDetection={closestCenter} onDragEnd={handleBlockDragEnd}>
                  <SortableContext items={slide.content.map(b => b.id)} strategy={verticalListSortingStrategy}>
                    {slide.content.map((block, idx) => (
                      <SortableBlock key={block.id} id={block.id}>
                        {(handle) => (
                          <>
                            {renderBlock(block, idx, handle)}
                            <InlineAdd index={idx + 1} onInsert={handleInlineAdd} />
                          </>
                        )}
                      </SortableBlock>
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {/* Quiz section */}
            {slide.questions.length > 0 && (
              <div className="mt-8 pt-6 border-t">
                <QuizBuilder
                  course={course}
                  moduleId={moduleId}
                  lessonId={lessonId}
                  slideId={slide.id}
                  questions={slide.questions}
                />
              </div>
            )}

            {/* Add content button */}
            <div className="mt-6 relative">
              <button
                onClick={() => setShowAddBlock(!showAddBlock)}
                className="w-full border-2 border-dashed border-gray-200 rounded-lg py-3 text-sm text-gray-400 hover:border-brand-300 hover:text-brand-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Content Block
              </button>

              {showAddBlock && (
                <div className="absolute left-1/2 -translate-x-1/2 mt-2 bg-white rounded-xl shadow-xl border p-4 z-10 min-w-[480px] space-y-3">
                  {blockCategories.map(cat => (
                    <div key={cat.label}>
                      <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 px-1">{cat.label}</h4>
                      <div className="grid grid-cols-6 gap-1">
                        {cat.options.map(opt => (
                          <button
                            key={opt.type}
                            onClick={() => {
                              addContentBlock(course.id, moduleId, lessonId, slide.id, opt.type);
                              setShowAddBlock(false);
                            }}
                            className="flex flex-col items-center gap-1 p-2.5 rounded-lg hover:bg-gray-50 text-gray-600 hover:text-brand-600 transition-colors"
                          >
                            {opt.icon}
                            <span className="text-[10px] leading-tight">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-2">
                    <button
                      onClick={() => {
                        addQuestion(course.id, moduleId, lessonId, slide.id);
                        setShowAddBlock(false);
                      }}
                      className="flex flex-col items-center gap-1 p-2.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"
                    >
                      <HelpCircle className="w-4 h-4" />
                      <span className="text-[10px] leading-tight">Quiz</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Premium feature toolbar */}
            <div className="flex items-center gap-2 mt-2 justify-center">
              <AIQuizGeneratorButton
                courseId={course.id}
                moduleId={moduleId}
                lessonId={lessonId}
                slideId={slide.id}
                slideContent={slide.content.map(b => b.content).filter(Boolean).join(' ')}
              />
              <button className="btn-ghost text-sm" onClick={() => setShowVideoRecorder(true)}>
                <Video className="w-4 h-4" /> Record Video
              </button>
            </div>

            <VideoRecorderModal
              open={showVideoRecorder}
              onClose={() => setShowVideoRecorder(false)}
              onRecordingComplete={(videoUrl) => {
                const newBlock = { id: crypto.randomUUID(), type: 'video' as const, content: videoUrl, alt: 'Recorded video', caption: '' };
                updateSlide(course.id, moduleId, lessonId, slide.id, { content: [...slide.content, newBlock] });
                setShowVideoRecorder(false);
              }}
            />
          </div>
        </div>
      </div>

      {/* Live preview pane */}
      {livePreviewOpen && <LivePreviewPane course={course} slide={slide} />}

      {/* Right panel */}
      <aside className="w-72 bg-white border-l flex flex-col flex-shrink-0">
        {/* Panel tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setRightPanelTab('properties')}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              editor.rightPanelTab === 'properties'
                ? 'text-brand-600 border-b-2 border-brand-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Settings className="w-3.5 h-3.5 inline mr-1" />
            Properties
          </button>
          <button
            onClick={() => setRightPanelTab('notes')}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              editor.rightPanelTab === 'notes'
                ? 'text-brand-600 border-b-2 border-brand-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
            Notes
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {editor.rightPanelTab === 'properties' && (
            <div className="space-y-4">
              {/* Block sizing — only when a block is selected and the layout supports it */}
              {(() => {
                const activeBlock = slide.content.find(b => b.id === activeBlockId);
                if (!activeBlock || slide.fullBleed || slide.layout === 'two-column') return null;
                return (
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-[#171D97] mb-2">Block size</p>
                    <BlockSizingControls
                      block={activeBlock}
                      onChange={updates => handleBlockUpdate(activeBlock.id, updates)}
                    />
                  </div>
                );
              })()}

              <div>
                <label className="label">Layout</label>
                <select
                  className="input"
                  value={slide.layout}
                  onChange={e => handleUpdateSlide({ layout: e.target.value as SlideLayout })}
                >
                  <option value="title">Title Slide</option>
                  <option value="content">Content</option>
                  <option value="two-column">Two Column</option>
                  <option value="image-text">Image & Text</option>
                  <option value="video">Video</option>
                  <option value="quiz">Quiz</option>
                  <option value="blank">Blank</option>
                  <option value="canvas">Canvas (free placement)</option>
                </select>
              </div>

              <div>
                <label className="label">Background Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={slide.backgroundColor}
                    onChange={e => handleUpdateSlide({ backgroundColor: e.target.value })}
                    className="w-8 h-8 rounded border cursor-pointer"
                  />
                  <input
                    type="text"
                    className="input flex-1"
                    value={slide.backgroundColor}
                    onChange={e => handleUpdateSlide({ backgroundColor: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">Background Image URL</label>
                <input
                  type="text"
                  className="input"
                  placeholder="https://..."
                  value={slide.backgroundImage}
                  onChange={e => handleUpdateSlide({ backgroundImage: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Estimated Duration (minutes)</label>
                <input
                  type="number"
                  className="input"
                  min={1}
                  max={60}
                  value={slide.duration}
                  onChange={e => handleUpdateSlide({ duration: parseInt(e.target.value) || 1 })}
                />
              </div>

              {/* Quick color presets */}
              <div>
                <label className="label">Quick Colors</label>
                <div className="flex gap-2 flex-wrap">
                  {['#ffffff', '#f8fafc', '#f1f5f9', '#0f172a', '#1e293b', '#4f46e5', '#059669', '#dc2626'].map(color => (
                    <button
                      key={color}
                      onClick={() => handleUpdateSlide({ backgroundColor: color })}
                      className={`w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110 ${
                        slide.backgroundColor === color ? 'border-brand-500 ring-2 ring-brand-200' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Slide info */}
              <div className="pt-4 border-t">
                <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Slide Info</h4>
                <div className="space-y-1 text-xs text-gray-500">
                  <p>{slide.content.length} content blocks</p>
                  <p>{slide.questions.length} questions</p>
                </div>
              </div>

              {/* Transition */}
              <div className="pt-4 border-t">
                <label className="label flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Transition
                </label>
                <select
                  className="input"
                  value={slide.transition || 'none'}
                  onChange={e => handleUpdateSlide({ transition: e.target.value as SlideTransition })}
                >
                  <option value="none">None</option>
                  <option value="fade">Fade</option>
                  <option value="slide-left">Slide Left</option>
                  <option value="slide-up">Slide Up</option>
                  <option value="zoom">Zoom</option>
                </select>
              </div>

              {/* Cover Slide */}
              <div className="pt-4 border-t">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={slide.isCoverSlide || false}
                    onChange={e => handleUpdateSlide({ isCoverSlide: e.target.checked })}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-xs font-medium text-gray-700">Cover Slide</span>
                </label>
                {slide.isCoverSlide && (
                  <div className="mt-2">
                    <label className="label">Subtitle</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Enter cover subtitle..."
                      value={slide.coverSubtitle || ''}
                      onChange={e => handleUpdateSlide({ coverSubtitle: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* Learning Objectives */}
              <div className="pt-4 border-t">
                <label className="label flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  Learning Objectives
                </label>
                <div className="space-y-2">
                  {(slide.learningObjectives || []).map((obj, objIdx) => (
                    <div key={obj.id} className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-400 w-4 shrink-0">{objIdx + 1}.</span>
                      <input
                        type="text"
                        className="input flex-1 text-xs"
                        placeholder="Objective..."
                        value={obj.text}
                        onChange={e => {
                          const updated = (slide.learningObjectives || []).map(o =>
                            o.id === obj.id ? { ...o, text: e.target.value } : o
                          );
                          handleUpdateSlide({ learningObjectives: updated });
                        }}
                      />
                      <button
                        onClick={() => {
                          const updated = (slide.learningObjectives || []).filter(o => o.id !== obj.id);
                          handleUpdateSlide({ learningObjectives: updated });
                        }}
                        className="btn-icon w-5 h-5 text-red-400 hover:text-red-600 shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newObj: LearningObjective = {
                        id: crypto.randomUUID(),
                        text: '',
                      };
                      handleUpdateSlide({
                        learningObjectives: [...(slide.learningObjectives || []), newObj],
                      });
                    }}
                    className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
                  >
                    <Plus className="w-3 h-3" />
                    Add Objective
                  </button>
                </div>
              </div>
            </div>
          )}

          {editor.rightPanelTab === 'notes' && (
            <div>
              <p className="text-xs text-gray-500 mb-2">
                Speaker notes are not visible to learners. Use them for instructor guidance.
              </p>
              <textarea
                className="input resize-none text-sm"
                rows={15}
                placeholder="Add speaker notes..."
                value={slide.notes}
                onChange={e => handleUpdateSlide({ notes: e.target.value })}
              />
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
