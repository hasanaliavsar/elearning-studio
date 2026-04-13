import { useState } from 'react';
import { useStore } from '../store';
import { RichTextEditor } from './RichTextEditor';
import { QuizBuilder } from './QuizBuilder';
import type { Course, Slide, SlideLayout, ContentBlock } from '../types';
import {
  Type, Image, Video, FileText, List, Minus, Code, Plus, Trash2,
  Settings, MessageSquare, HelpCircle, GripVertical, ChevronUp, ChevronDown,
  Layout, Columns, Palette
} from 'lucide-react';

interface Props {
  course: Course;
  moduleId: string;
  lessonId: string;
  slide: Slide;
}

const blockTypeOptions: { type: ContentBlock['type']; label: string; icon: React.ReactNode }[] = [
  { type: 'heading', label: 'Heading', icon: <Type className="w-4 h-4" /> },
  { type: 'text', label: 'Text', icon: <FileText className="w-4 h-4" /> },
  { type: 'image', label: 'Image', icon: <Image className="w-4 h-4" /> },
  { type: 'video', label: 'Video', icon: <Video className="w-4 h-4" /> },
  { type: 'list', label: 'List', icon: <List className="w-4 h-4" /> },
  { type: 'code', label: 'Code', icon: <Code className="w-4 h-4" /> },
  { type: 'divider', label: 'Divider', icon: <Minus className="w-4 h-4" /> },
];

export function SlideEditor({ course, moduleId, lessonId, slide }: Props) {
  const updateSlide = useStore(s => s.updateSlide);
  const addContentBlock = useStore(s => s.addContentBlock);
  const updateContentBlock = useStore(s => s.updateContentBlock);
  const deleteContentBlock = useStore(s => s.deleteContentBlock);
  const addQuestion = useStore(s => s.addQuestion);
  const editor = useStore(s => s.editor);
  const setRightPanelTab = useStore(s => s.setRightPanelTab);

  const [showAddBlock, setShowAddBlock] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  const handleUpdateSlide = (updates: Partial<Slide>) => {
    updateSlide(course.id, moduleId, lessonId, slide.id, updates);
  };

  const handleBlockUpdate = (blockId: string, updates: Partial<ContentBlock>) => {
    updateContentBlock(course.id, moduleId, lessonId, slide.id, blockId, updates);
  };

  const handleDeleteBlock = (blockId: string) => {
    deleteContentBlock(course.id, moduleId, lessonId, slide.id, blockId);
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

  const renderBlock = (block: ContentBlock, idx: number) => {
    const isActive = activeBlockId === block.id;

    return (
      <div
        key={block.id}
        className={`group relative rounded-lg border transition-all ${
          isActive ? 'border-brand-300 ring-2 ring-brand-100' : 'border-transparent hover:border-gray-200'
        }`}
        onClick={() => setActiveBlockId(block.id)}
      >
        {/* Block toolbar */}
        <div className={`absolute -left-10 top-0 flex flex-col items-center gap-0.5 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
          <button
            onClick={() => handleMoveBlock(block.id, 'up')}
            className="btn-icon w-6 h-6"
            disabled={idx === 0}
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <GripVertical className="w-3 h-3 text-gray-400 cursor-grab" />
          <button
            onClick={() => handleMoveBlock(block.id, 'down')}
            className="btn-icon w-6 h-6"
            disabled={idx === slide.content.length - 1}
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

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
                <div
                  onClick={() => handleImageUpload(block.id)}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/50 transition-colors"
                >
                  <Image className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Click to upload an image</p>
                  <p className="text-xs text-gray-400 mt-1">or paste an image URL below</p>
                </div>
              )}
              <input
                type="text"
                className="input text-xs"
                placeholder="Image URL (or use upload above)"
                value={block.content?.startsWith('data:') ? '' : block.content}
                onChange={e => handleBlockUpdate(block.id, { content: e.target.value })}
              />
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
                className="w-full font-mono text-sm bg-gray-900 text-gray-100 rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
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
          <div className="mb-4">
            <input
              type="text"
              value={slide.title}
              onChange={e => handleUpdateSlide({ title: e.target.value })}
              className="text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 w-full text-gray-900 placeholder-gray-300"
              placeholder="Slide title..."
            />
          </div>

          {/* Slide content area */}
          <div
            className="card p-8 min-h-[500px] relative"
            style={{ backgroundColor: slide.backgroundColor }}
            onClick={e => e.stopPropagation()}
          >
            <div className={`space-y-4 ${slide.layout === 'two-column' ? 'grid grid-cols-2 gap-6 space-y-0' : ''}`}>
              {slide.content.map((block, idx) => renderBlock(block, idx))}
            </div>

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
                <div className="absolute left-1/2 -translate-x-1/2 mt-2 bg-white rounded-xl shadow-xl border p-3 grid grid-cols-4 gap-2 z-10 min-w-[320px]">
                  {blockTypeOptions.map(opt => (
                    <button
                      key={opt.type}
                      onClick={() => {
                        addContentBlock(course.id, moduleId, lessonId, slide.id, opt.type);
                        setShowAddBlock(false);
                      }}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-gray-50 text-gray-600 hover:text-brand-600 transition-colors"
                    >
                      {opt.icon}
                      <span className="text-xs">{opt.label}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      addQuestion(course.id, moduleId, lessonId, slide.id);
                      setShowAddBlock(false);
                    }}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span className="text-xs">Quiz</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
