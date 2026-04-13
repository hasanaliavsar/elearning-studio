import { useState } from 'react';
import { useStore } from '../store';
import { SlideEditor } from './SlideEditor';
import { QuizBuilder } from './QuizBuilder';
import { CourseSettings } from './CourseSettings';
import type { SlideLayout } from '../types';
import {
  ArrowLeft, Plus, ChevronDown, ChevronRight, BookOpen, FileText,
  Presentation, MoreHorizontal, Trash2, Copy, Play, Download,
  Settings, GripVertical, FolderOpen, PanelLeftClose, PanelLeftOpen,
  Image, Video, HelpCircle, Layout, LayoutTemplate, Columns,
  Type, Eye
} from 'lucide-react';

const layoutOptions: { layout: SlideLayout; label: string; icon: React.ReactNode }[] = [
  { layout: 'title', label: 'Title Slide', icon: <Type className="w-4 h-4" /> },
  { layout: 'content', label: 'Content', icon: <FileText className="w-4 h-4" /> },
  { layout: 'two-column', label: 'Two Column', icon: <Columns className="w-4 h-4" /> },
  { layout: 'image-text', label: 'Image & Text', icon: <Image className="w-4 h-4" /> },
  { layout: 'video', label: 'Video', icon: <Video className="w-4 h-4" /> },
  { layout: 'quiz', label: 'Quiz', icon: <HelpCircle className="w-4 h-4" /> },
  { layout: 'blank', label: 'Blank', icon: <Layout className="w-4 h-4" /> },
];

export function CourseEditor() {
  const course = useStore(s => s.getActiveCourse());
  const editor = useStore(s => s.editor);
  const setViewMode = useStore(s => s.setViewMode);
  const setActiveCourse = useStore(s => s.setActiveCourse);
  const updateCourse = useStore(s => s.updateCourse);
  const addModule = useStore(s => s.addModule);
  const updateModule = useStore(s => s.updateModule);
  const deleteModule = useStore(s => s.deleteModule);
  const addLesson = useStore(s => s.addLesson);
  const updateLesson = useStore(s => s.updateLesson);
  const deleteLesson = useStore(s => s.deleteLesson);
  const addSlide = useStore(s => s.addSlide);
  const deleteSlide = useStore(s => s.deleteSlide);
  const duplicateSlide = useStore(s => s.duplicateSlide);
  const selectModule = useStore(s => s.selectModule);
  const selectLesson = useStore(s => s.selectLesson);
  const selectSlide = useStore(s => s.selectSlide);
  const toggleSidebar = useStore(s => s.toggleSidebar);
  const setRightPanelTab = useStore(s => s.setRightPanelTab);
  const setShowExportDialog = useStore(s => s.setShowExportDialog);
  const setPreviewSlideIndex = useStore(s => s.setPreviewSlideIndex);

  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(course?.modules.map(m => m.id) ?? [])
  );
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(
    new Set(course?.modules.flatMap(m => m.lessons.map(l => l.id)) ?? [])
  );
  const [showAddSlideMenu, setShowAddSlideMenu] = useState<string | null>(null);
  const [slideMenuOpen, setSlideMenuOpen] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  if (!course) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No course selected</p>
      </div>
    );
  }

  const toggleModule = (id: string) => {
    const next = new Set(expandedModules);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedModules(next);
  };

  const toggleLessonExpand = (id: string) => {
    const next = new Set(expandedLessons);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedLessons(next);
  };

  const handleBack = () => {
    setActiveCourse(null);
    setViewMode('dashboard');
  };

  const startEditTitle = (id: string, currentTitle: string) => {
    setEditingTitle(id);
    setEditTitleValue(currentTitle);
  };

  const commitEditTitle = (type: 'module' | 'lesson' | 'slide', moduleId: string, lessonId?: string, slideId?: string) => {
    if (!editTitleValue.trim()) {
      setEditingTitle(null);
      return;
    }
    if (type === 'module') {
      updateModule(course.id, moduleId, { title: editTitleValue.trim() });
    } else if (type === 'lesson' && lessonId) {
      updateLesson(course.id, moduleId, lessonId, { title: editTitleValue.trim() });
    }
    setEditingTitle(null);
  };

  const handleAddSlide = (moduleId: string, lessonId: string, layout: SlideLayout) => {
    addSlide(course.id, moduleId, lessonId, layout);
    setShowAddSlideMenu(null);
  };

  const handlePreview = () => {
    setPreviewSlideIndex(0);
    setViewMode('preview');
  };

  // Find the selected slide's context
  let selectedSlide = null as typeof course.modules[0]['lessons'][0]['slides'][0] | null;
  let selectedModuleId = editor.selectedModuleId;
  let selectedLessonId = editor.selectedLessonId;

  if (editor.selectedSlideId) {
    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        const slide = lesson.slides.find(s => s.id === editor.selectedSlideId);
        if (slide) {
          selectedSlide = slide;
          selectedModuleId = mod.id;
          selectedLessonId = lesson.id;
          break;
        }
      }
      if (selectedSlide) break;
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top toolbar */}
      <header className="bg-white border-b px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="btn-icon">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button onClick={toggleSidebar} className="btn-icon">
            {editor.sidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <input
            type="text"
            value={course.title}
            onChange={e => updateCourse(course.id, { title: e.target.value })}
            className="text-lg font-bold bg-transparent border-none focus:outline-none focus:ring-0 px-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(!showSettings)} className="btn-ghost">
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <button onClick={handlePreview} className="btn-ghost">
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button onClick={() => setShowExportDialog(true)} className="btn-primary">
            <Download className="w-4 h-4" />
            Export SCORM
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Course structure */}
        {!editor.sidebarCollapsed && (
          <aside className="w-72 bg-sidebar flex flex-col flex-shrink-0 overflow-hidden border-r border-gray-800">
            <div className="p-3 border-b border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Course Structure</h2>
                <button
                  onClick={() => addModule(course.id)}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Add Module"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-2 space-y-1">
              {course.modules.map((mod, modIdx) => (
                <div key={mod.id}>
                  {/* Module item */}
                  <div
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm cursor-pointer group ${
                      editor.selectedModuleId === mod.id ? 'bg-sidebar-active text-white' : 'text-gray-300 hover:bg-sidebar-hover'
                    }`}
                    onClick={() => { selectModule(mod.id); toggleModule(mod.id); }}
                  >
                    {expandedModules.has(mod.id) ? (
                      <ChevronDown className="w-4 h-4 flex-shrink-0 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 flex-shrink-0 text-gray-500" />
                    )}
                    <FolderOpen className="w-4 h-4 flex-shrink-0 text-brand-400" />
                    {editingTitle === mod.id ? (
                      <input
                        type="text"
                        value={editTitleValue}
                        onChange={e => setEditTitleValue(e.target.value)}
                        onBlur={() => commitEditTitle('module', mod.id)}
                        onKeyDown={e => { if (e.key === 'Enter') commitEditTitle('module', mod.id); if (e.key === 'Escape') setEditingTitle(null); }}
                        className="flex-1 bg-gray-700 text-white text-sm px-1 rounded outline-none"
                        autoFocus
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        className="flex-1 truncate"
                        onDoubleClick={e => { e.stopPropagation(); startEditTitle(mod.id, mod.title); }}
                      >
                        {mod.title}
                      </span>
                    )}
                    <div className="hidden group-hover:flex items-center gap-0.5">
                      <button
                        onClick={e => { e.stopPropagation(); addLesson(course.id, mod.id); toggleModule(mod.id); }}
                        className="text-gray-500 hover:text-white"
                        title="Add Lesson"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); deleteModule(course.id, mod.id); }}
                        className="text-gray-500 hover:text-red-400"
                        title="Delete Module"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Lessons */}
                  {expandedModules.has(mod.id) && (
                    <div className="ml-4 space-y-0.5 mt-0.5">
                      {mod.lessons.map((lesson, lesIdx) => (
                        <div key={lesson.id}>
                          <div
                            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm cursor-pointer group ${
                              editor.selectedLessonId === lesson.id ? 'bg-sidebar-active text-white' : 'text-gray-400 hover:bg-sidebar-hover hover:text-gray-200'
                            }`}
                            onClick={() => { selectLesson(lesson.id); selectModule(mod.id); toggleLessonExpand(lesson.id); }}
                          >
                            {expandedLessons.has(lesson.id) ? (
                              <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-gray-600" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-gray-600" />
                            )}
                            <BookOpen className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
                            {editingTitle === lesson.id ? (
                              <input
                                type="text"
                                value={editTitleValue}
                                onChange={e => setEditTitleValue(e.target.value)}
                                onBlur={() => commitEditTitle('lesson', mod.id, lesson.id)}
                                onKeyDown={e => { if (e.key === 'Enter') commitEditTitle('lesson', mod.id, lesson.id); if (e.key === 'Escape') setEditingTitle(null); }}
                                className="flex-1 bg-gray-700 text-white text-sm px-1 rounded outline-none"
                                autoFocus
                                onClick={e => e.stopPropagation()}
                              />
                            ) : (
                              <span
                                className="flex-1 truncate"
                                onDoubleClick={e => { e.stopPropagation(); startEditTitle(lesson.id, lesson.title); }}
                              >
                                {lesson.title}
                              </span>
                            )}
                            <div className="hidden group-hover:flex items-center gap-0.5">
                              <button
                                onClick={e => { e.stopPropagation(); setShowAddSlideMenu(showAddSlideMenu === lesson.id ? null : lesson.id); }}
                                className="text-gray-500 hover:text-white"
                                title="Add Slide"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); deleteLesson(course.id, mod.id, lesson.id); }}
                                className="text-gray-500 hover:text-red-400"
                                title="Delete Lesson"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Add slide menu */}
                          {showAddSlideMenu === lesson.id && (
                            <div className="ml-6 my-1 bg-gray-800 rounded-lg border border-gray-700 p-2 grid grid-cols-2 gap-1">
                              {layoutOptions.map(opt => (
                                <button
                                  key={opt.layout}
                                  onClick={() => handleAddSlide(mod.id, lesson.id, opt.layout)}
                                  className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-300 hover:bg-gray-700 rounded"
                                >
                                  {opt.icon}
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Slides */}
                          {expandedLessons.has(lesson.id) && (
                            <div className="ml-8 space-y-0.5 mt-0.5">
                              {lesson.slides.map((slide, sIdx) => (
                                <div
                                  key={slide.id}
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs cursor-pointer group relative ${
                                    editor.selectedSlideId === slide.id
                                      ? 'bg-brand-600/30 text-brand-200 ring-1 ring-brand-500/50'
                                      : 'text-gray-500 hover:bg-sidebar-hover hover:text-gray-300'
                                  }`}
                                  onClick={() => { selectSlide(slide.id); selectLesson(lesson.id); selectModule(mod.id); }}
                                >
                                  <Presentation className="w-3 h-3 flex-shrink-0" />
                                  <span className="flex-1 truncate">{slide.title || `Slide ${sIdx + 1}`}</span>
                                  {slide.questions.length > 0 && (
                                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1 rounded">Q</span>
                                  )}
                                  <div className="hidden group-hover:flex items-center gap-0.5">
                                    <button
                                      onClick={e => { e.stopPropagation(); duplicateSlide(course.id, mod.id, lesson.id, slide.id); }}
                                      className="text-gray-500 hover:text-white"
                                      title="Duplicate"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={e => { e.stopPropagation(); deleteSlide(course.id, mod.id, lesson.id, slide.id); }}
                                      className="text-gray-500 hover:text-red-400"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Main content area */}
        <main className="flex-1 overflow-auto bg-gray-100">
          {showSettings ? (
            <CourseSettings course={course} onClose={() => setShowSettings(false)} />
          ) : selectedSlide ? (
            <SlideEditor
              course={course}
              moduleId={selectedModuleId!}
              lessonId={selectedLessonId!}
              slide={selectedSlide}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <div className="w-16 h-16 rounded-2xl bg-gray-200 flex items-center justify-center mx-auto mb-4">
                  <Presentation className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-1">Select a slide to edit</h3>
                <p className="text-sm text-gray-500">Choose a slide from the sidebar or create a new one</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
