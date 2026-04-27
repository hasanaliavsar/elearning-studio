import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Course, Module, Lesson, Slide, Question, ContentBlock, EditorState, ViewMode, SlideLayout, QuestionType, ContentBlockType } from './types';
import { generateId, deepClone } from './utils/helpers';
import moonfareEmergencyCourse from './data/moonfare-emergency-course.json';
import moonfareEmergencyPremiumCourse from './data/moonfare-emergency-course-premium.json';

const SEED_FLAG_KEY = 'elearning-studio-seed-v3-applied';

function buildSeedCourses(): Course[] {
  return [
    { ...(moonfareEmergencyPremiumCourse as unknown as Course), id: generateId() },
    { ...(moonfareEmergencyCourse as unknown as Course), id: generateId() },
  ];
}

function createDefaultSettings() {
  return {
    passingScore: 70,
    showFeedback: true,
    allowRetry: true,
    maxAttempts: 3,
    shuffleQuestions: false,
    showProgress: true,
    completionCriteria: 'all-slides' as const,
    primaryColor: '#4f46e5',
    accentColor: '#10b981',
    fontFamily: 'Inter',
    logoUrl: '',
    theme: 'modern' as const,
    defaultTransition: 'fade' as const,
    defaultAnimation: 'fade-in' as const,
    showCertificate: true,
    certificateTitle: 'Certificate of Completion',
    certificateOrg: '',
    enableScrollReveal: true,
    enableKeyboardNav: true,
    enableGamification: true,
    landingPage: {
      enabled: true,
      backgroundColor: '#fdf0e8',
      backgroundGradient: '',
      textColor: '#1e293b',
      showModuleList: true,
      showProgress: true,
      showCompanyLogo: true,
      companyLogoUrl: '',
      companyName: '',
      tagline: '',
      heroImageUrl: '',
    },
  };
}

function createDefaultSlide(layout: SlideLayout = 'content', title = 'New Slide'): Slide {
  const blocks: ContentBlock[] = [];

  if (layout === 'title') {
    blocks.push(
      { id: generateId(), type: 'heading', content: '<h1>Slide Title</h1>', alt: '', caption: '' },
      { id: generateId(), type: 'text', content: '<p>Subtitle or description text</p>', alt: '', caption: '' }
    );
  } else if (layout === 'content') {
    blocks.push(
      { id: generateId(), type: 'heading', content: '<h2>Content Title</h2>', alt: '', caption: '' },
      { id: generateId(), type: 'text', content: '<p>Add your content here...</p>', alt: '', caption: '' }
    );
  } else if (layout === 'two-column') {
    blocks.push(
      { id: generateId(), type: 'heading', content: '<h2>Two Column Layout</h2>', alt: '', caption: '' },
      { id: generateId(), type: 'text', content: '<p>Left column content...</p>', alt: '', caption: '' },
      { id: generateId(), type: 'text', content: '<p>Right column content...</p>', alt: '', caption: '' }
    );
  } else if (layout === 'image-text') {
    blocks.push(
      { id: generateId(), type: 'heading', content: '<h2>Image & Text</h2>', alt: '', caption: '' },
      { id: generateId(), type: 'image', content: '', alt: 'Placeholder image', caption: '' },
      { id: generateId(), type: 'text', content: '<p>Description text...</p>', alt: '', caption: '' }
    );
  } else if (layout === 'video') {
    blocks.push(
      { id: generateId(), type: 'heading', content: '<h2>Video Lesson</h2>', alt: '', caption: '' },
      { id: generateId(), type: 'video', content: '', alt: '', caption: '' },
      { id: generateId(), type: 'text', content: '<p>Video description...</p>', alt: '', caption: '' }
    );
  }

  return {
    id: generateId(),
    title,
    layout,
    content: blocks,
    questions: [],
    notes: '',
    backgroundColor: '#ffffff',
    backgroundImage: '',
    duration: 2,
  };
}

function createDefaultQuestion(type: QuestionType = 'multiple-choice'): Question {
  const base: Question = {
    id: generateId(),
    type,
    text: 'Enter your question here',
    options: [],
    matchingPairs: [],
    correctAnswer: '',
    correctOrder: [],
    explanation: '',
    points: 10,
  };

  if (type === 'multiple-choice') {
    base.options = [
      { id: generateId(), text: 'Option A', isCorrect: true },
      { id: generateId(), text: 'Option B', isCorrect: false },
      { id: generateId(), text: 'Option C', isCorrect: false },
      { id: generateId(), text: 'Option D', isCorrect: false },
    ];
  } else if (type === 'true-false') {
    base.options = [
      { id: generateId(), text: 'True', isCorrect: true },
      { id: generateId(), text: 'False', isCorrect: false },
    ];
  } else if (type === 'fill-in-blank') {
    base.correctAnswer = 'answer';
  } else if (type === 'matching') {
    base.matchingPairs = [
      { id: generateId(), left: 'Term 1', right: 'Definition 1' },
      { id: generateId(), left: 'Term 2', right: 'Definition 2' },
      { id: generateId(), left: 'Term 3', right: 'Definition 3' },
    ];
  } else if (type === 'drag-sort') {
    const opts = [
      { id: generateId(), text: 'First item', isCorrect: false },
      { id: generateId(), text: 'Second item', isCorrect: false },
      { id: generateId(), text: 'Third item', isCorrect: false },
    ];
    base.options = opts;
    base.correctOrder = opts.map(o => o.id);
  } else if (type === 'likert') {
    base.text = 'I am satisfied with this experience.';
    base.likertLabels = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'];
    base.likertCorrectIndex = 3; // "Agree"
  } else if (type === 'rating') {
    base.text = 'How would you rate this experience?';
    base.ratingMax = 5;
    base.ratingCorrect = 4;
    base.ratingStyle = 'stars';
  } else if (type === 'slider') {
    base.text = 'How likely are you to recommend this to a colleague?';
    base.sliderMin = 0;
    base.sliderMax = 100;
    base.sliderStep = 1;
    base.sliderCorrect = 80;
    base.sliderUnit = '%';
  } else if (type === 'image-choice') {
    base.text = 'Which image best represents the concept?';
    base.options = [
      { id: generateId(), text: 'Option A', isCorrect: true, imageUrl: '' },
      { id: generateId(), text: 'Option B', isCorrect: false, imageUrl: '' },
      { id: generateId(), text: 'Option C', isCorrect: false, imageUrl: '' },
    ];
    base.imageChoiceColumns = 3;
  } else if (type === 'matrix') {
    base.text = 'Rate each of the following:';
    base.matrixColumns = ['Poor', 'Fair', 'Good', 'Excellent'];
    base.matrixRows = [
      { id: generateId(), label: 'Content quality', correctColumn: 2 },
      { id: generateId(), label: 'Ease of use', correctColumn: 3 },
      { id: generateId(), label: 'Visual design', correctColumn: 2 },
    ];
    base.matrixGraded = false;
  } else if (type === 'dropdown') {
    base.text = 'Select the correct answer:';
    base.options = [
      { id: generateId(), text: 'Option A', isCorrect: false },
      { id: generateId(), text: 'Option B', isCorrect: true },
      { id: generateId(), text: 'Option C', isCorrect: false },
      { id: generateId(), text: 'Option D', isCorrect: false },
    ];
    base.dropdownPlaceholder = 'Choose an answer...';
  } else if (type === 'open-ended') {
    base.text = 'Describe your understanding of this concept:';
    base.openEndedMaxLength = 500;
    base.openEndedPlaceholder = 'Type your answer here...';
    base.openEndedKeywords = ['key concept', 'important'];
    base.points = 0; // typically not auto-graded
  } else if (type === 'ranking') {
    const opts = [
      { id: generateId(), text: 'Feature A', isCorrect: false },
      { id: generateId(), text: 'Feature B', isCorrect: false },
      { id: generateId(), text: 'Feature C', isCorrect: false },
      { id: generateId(), text: 'Feature D', isCorrect: false },
    ];
    base.options = opts;
    base.correctOrder = opts.map(o => o.id);
    base.text = 'Rank these items from most to least important:';
  } else if (type === 'hotspot-question') {
    base.text = 'Click on the correct area in the image:';
    base.hotspotImage = '';
    base.hotspotZones = [
      { id: generateId(), x: 50, y: 50, radius: 10, label: 'Correct zone', isCorrect: true },
    ];
  }

  return base;
}

interface AppState {
  courses: Course[];
  activeCourseId: string | null;
  viewMode: ViewMode;
  editor: EditorState;
  previewSlideIndex: number;
  showExportDialog: boolean;

  // Course CRUD
  createCourse: (title: string, description?: string) => string;
  updateCourse: (courseId: string, updates: Partial<Course>) => void;
  deleteCourse: (courseId: string) => void;
  duplicateCourse: (courseId: string) => string;
  importCourse: (course: Course) => void;

  // Navigation
  setViewMode: (mode: ViewMode) => void;
  setActiveCourse: (courseId: string | null) => void;
  openCourseEditor: (courseId: string) => void;

  // Module CRUD
  addModule: (courseId: string) => void;
  updateModule: (courseId: string, moduleId: string, updates: Partial<Module>) => void;
  deleteModule: (courseId: string, moduleId: string) => void;
  reorderModules: (courseId: string, moduleIds: string[]) => void;

  // Lesson CRUD
  addLesson: (courseId: string, moduleId: string) => void;
  updateLesson: (courseId: string, moduleId: string, lessonId: string, updates: Partial<Lesson>) => void;
  deleteLesson: (courseId: string, moduleId: string, lessonId: string) => void;
  reorderLessons: (courseId: string, moduleId: string, lessonIds: string[]) => void;

  // Slide CRUD
  addSlide: (courseId: string, moduleId: string, lessonId: string, layout?: SlideLayout) => void;
  addSlideFromTemplate: (courseId: string, moduleId: string, lessonId: string, slide: Slide) => void;
  updateSlide: (courseId: string, moduleId: string, lessonId: string, slideId: string, updates: Partial<Slide>) => void;
  deleteSlide: (courseId: string, moduleId: string, lessonId: string, slideId: string) => void;
  duplicateSlide: (courseId: string, moduleId: string, lessonId: string, slideId: string) => void;
  reorderSlides: (courseId: string, moduleId: string, lessonId: string, slideIds: string[]) => void;

  // Content block CRUD
  addContentBlock: (courseId: string, moduleId: string, lessonId: string, slideId: string, type: ContentBlock['type']) => void;
  updateContentBlock: (courseId: string, moduleId: string, lessonId: string, slideId: string, blockId: string, updates: Partial<ContentBlock>) => void;
  deleteContentBlock: (courseId: string, moduleId: string, lessonId: string, slideId: string, blockId: string) => void;

  // Question CRUD
  addQuestion: (courseId: string, moduleId: string, lessonId: string, slideId: string, type?: QuestionType) => void;
  updateQuestion: (courseId: string, moduleId: string, lessonId: string, slideId: string, questionId: string, updates: Partial<Question>) => void;
  deleteQuestion: (courseId: string, moduleId: string, lessonId: string, slideId: string, questionId: string) => void;

  // Editor state
  selectModule: (moduleId: string | null) => void;
  selectLesson: (lessonId: string | null) => void;
  selectSlide: (slideId: string | null) => void;
  selectQuestion: (questionId: string | null) => void;
  navigateToSlide: (moduleId: string, lessonId: string, slideId: string) => void;
  navigateToLesson: (moduleId: string, lessonId: string) => void;
  toggleSidebar: () => void;
  setRightPanelTab: (tab: EditorState['rightPanelTab']) => void;
  setShowExportDialog: (show: boolean) => void;

  // Preview
  setPreviewSlideIndex: (index: number) => void;

  // Helpers
  getActiveCourse: () => Course | null;
  getSelectedSlide: () => Slide | null;
}

function findCourse(courses: Course[], courseId: string): Course | undefined {
  return courses.find(c => c.id === courseId);
}

function findModule(course: Course, moduleId: string): Module | undefined {
  return course.modules.find(m => m.id === moduleId);
}

function findLesson(module: Module, lessonId: string): Lesson | undefined {
  return module.lessons.find(l => l.id === lessonId);
}

function findSlide(lesson: Lesson, slideId: string): Slide | undefined {
  return lesson.slides.find(s => s.id === slideId);
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      courses: [],
      activeCourseId: null,
      viewMode: 'dashboard',
      editor: {
        selectedModuleId: null,
        selectedLessonId: null,
        selectedSlideId: null,
        selectedQuestionId: null,
        sidebarCollapsed: false,
        rightPanelTab: 'properties',
      },
      previewSlideIndex: 0,
      showExportDialog: false,

      createCourse: (title, description = '') => {
        const id = generateId();
        const now = new Date().toISOString();
        const moduleId = generateId();
        const lessonId = generateId();
        const course: Course = {
          id,
          title,
          description,
          author: '',
          version: '1.0',
          language: 'en',
          thumbnail: '',
          modules: [
            {
              id: moduleId,
              title: 'Module 1',
              description: '',
              order: 0,
              thumbnail: '',
              color: '',
              lessons: [
                {
                  id: lessonId,
                  title: 'Lesson 1',
                  description: '',
                  order: 0,
                  slides: [createDefaultSlide('title', 'Welcome')],
                },
              ],
            },
          ],
          settings: createDefaultSettings(),
          createdAt: now,
          updatedAt: now,
          tags: [],
        };
        set(state => ({ courses: [...state.courses, course] }));
        return id;
      },

      updateCourse: (courseId, updates) => {
        set(state => ({
          courses: state.courses.map(c =>
            c.id === courseId
              ? { ...c, ...updates, updatedAt: new Date().toISOString() }
              : c
          ),
        }));
      },

      deleteCourse: (courseId) => {
        set(state => ({
          courses: state.courses.filter(c => c.id !== courseId),
          activeCourseId: state.activeCourseId === courseId ? null : state.activeCourseId,
          viewMode: state.activeCourseId === courseId ? 'dashboard' : state.viewMode,
        }));
      },

      duplicateCourse: (courseId) => {
        const state = get();
        const course = findCourse(state.courses, courseId);
        if (!course) return '';
        const newCourse = deepClone(course);
        const newId = generateId();
        newCourse.id = newId;
        newCourse.title = `${course.title} (Copy)`;
        newCourse.createdAt = new Date().toISOString();
        newCourse.updatedAt = new Date().toISOString();
        // Regenerate all IDs
        const regenIds = (obj: Record<string, unknown>) => {
          if (obj && typeof obj === 'object' && 'id' in obj) {
            obj.id = generateId();
          }
          Object.values(obj).forEach(v => {
            if (Array.isArray(v)) v.forEach(item => { if (typeof item === 'object' && item) regenIds(item as Record<string, unknown>); });
            else if (typeof v === 'object' && v) regenIds(v as Record<string, unknown>);
          });
        };
        newCourse.modules.forEach(m => {
          m.id = generateId();
          m.lessons.forEach(l => {
            l.id = generateId();
            l.slides.forEach(s => {
              s.id = generateId();
              s.content.forEach(c => { c.id = generateId(); });
              s.questions.forEach(q => {
                q.id = generateId();
                q.options.forEach(o => { o.id = generateId(); });
                q.matchingPairs.forEach(p => { p.id = generateId(); });
              });
            });
          });
        });
        set(state => ({ courses: [...state.courses, newCourse] }));
        return newId;
      },

      importCourse: (course) => {
        set(state => ({ courses: [...state.courses, { ...course, id: generateId() }] }));
      },

      setViewMode: (mode) => set({ viewMode: mode }),

      setActiveCourse: (courseId) => set({ activeCourseId: courseId }),

      openCourseEditor: (courseId) => {
        const course = findCourse(get().courses, courseId);
        if (!course) return;
        const firstModule = course.modules[0];
        const firstLesson = firstModule?.lessons[0];
        const firstSlide = firstLesson?.slides[0];
        set({
          activeCourseId: courseId,
          viewMode: 'editor',
          editor: {
            selectedModuleId: firstModule?.id ?? null,
            selectedLessonId: firstLesson?.id ?? null,
            selectedSlideId: firstSlide?.id ?? null,
            selectedQuestionId: null,
            sidebarCollapsed: false,
            rightPanelTab: 'properties',
          },
        });
      },

      addModule: (courseId) => {
        set(state => ({
          courses: state.courses.map(c => {
            if (c.id !== courseId) return c;
            const defaultColors = ['#171D97', '#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#f97316', '#06b6d4', '#ef4444'];
            const newModule: Module = {
              id: generateId(),
              title: `Module ${c.modules.length + 1}`,
              description: '',
              order: c.modules.length,
              thumbnail: '',
              color: defaultColors[c.modules.length % defaultColors.length] ?? '#171D97',
              lessons: [
                {
                  id: generateId(),
                  title: 'Lesson 1',
                  description: '',
                  order: 0,
                  slides: [createDefaultSlide('content', 'New Slide')],
                },
              ],
            };
            return { ...c, modules: [...c.modules, newModule], updatedAt: new Date().toISOString() };
          }),
        }));
      },

      updateModule: (courseId, moduleId, updates) => {
        set(state => ({
          courses: state.courses.map(c => {
            if (c.id !== courseId) return c;
            return {
              ...c,
              modules: c.modules.map(m => (m.id === moduleId ? { ...m, ...updates } : m)),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      deleteModule: (courseId, moduleId) => {
        set(state => ({
          courses: state.courses.map(c => {
            if (c.id !== courseId) return c;
            return {
              ...c,
              modules: c.modules.filter(m => m.id !== moduleId),
              updatedAt: new Date().toISOString(),
            };
          }),
          editor: state.editor.selectedModuleId === moduleId
            ? { ...state.editor, selectedModuleId: null, selectedLessonId: null, selectedSlideId: null }
            : state.editor,
        }));
      },

      reorderModules: (courseId, moduleIds) => {
        set(state => ({
          courses: state.courses.map(c => {
            if (c.id !== courseId) return c;
            const reordered = moduleIds.map((id, idx) => {
              const mod = c.modules.find(m => m.id === id);
              return mod ? { ...mod, order: idx } : null;
            }).filter((m): m is Module => m !== null);
            return { ...c, modules: reordered, updatedAt: new Date().toISOString() };
          }),
        }));
      },

      reorderLessons: (courseId, moduleId, lessonIds) => {
        set(state => ({
          courses: state.courses.map(c => {
            if (c.id !== courseId) return c;
            return {
              ...c,
              modules: c.modules.map(m => {
                if (m.id !== moduleId) return m;
                const reordered = lessonIds.map((id, idx) => {
                  const lesson = m.lessons.find(l => l.id === id);
                  return lesson ? { ...lesson, order: idx } : null;
                }).filter((l): l is Lesson => l !== null);
                return { ...m, lessons: reordered };
              }),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      addLesson: (courseId, moduleId) => {
        set(state => ({
          courses: state.courses.map(c => {
            if (c.id !== courseId) return c;
            return {
              ...c,
              modules: c.modules.map(m => {
                if (m.id !== moduleId) return m;
                const newLesson: Lesson = {
                  id: generateId(),
                  title: `Lesson ${m.lessons.length + 1}`,
                  description: '',
                  order: m.lessons.length,
                  slides: [createDefaultSlide('content', 'New Slide')],
                };
                return { ...m, lessons: [...m.lessons, newLesson] };
              }),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      updateLesson: (courseId, moduleId, lessonId, updates) => {
        set(state => ({
          courses: state.courses.map(c => {
            if (c.id !== courseId) return c;
            return {
              ...c,
              modules: c.modules.map(m => {
                if (m.id !== moduleId) return m;
                return {
                  ...m,
                  lessons: m.lessons.map(l => (l.id === lessonId ? { ...l, ...updates } : l)),
                };
              }),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      deleteLesson: (courseId, moduleId, lessonId) => {
        set(state => ({
          courses: state.courses.map(c => {
            if (c.id !== courseId) return c;
            return {
              ...c,
              modules: c.modules.map(m => {
                if (m.id !== moduleId) return m;
                return { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) };
              }),
              updatedAt: new Date().toISOString(),
            };
          }),
          editor: state.editor.selectedLessonId === lessonId
            ? { ...state.editor, selectedLessonId: null, selectedSlideId: null }
            : state.editor,
        }));
      },

      addSlide: (courseId, moduleId, lessonId, layout = 'content') => {
        const newSlide = createDefaultSlide(layout);
        set(state => ({
          courses: state.courses.map(c => {
            if (c.id !== courseId) return c;
            return {
              ...c,
              modules: c.modules.map(m => {
                if (m.id !== moduleId) return m;
                return {
                  ...m,
                  lessons: m.lessons.map(l => {
                    if (l.id !== lessonId) return l;
                    return { ...l, slides: [...l.slides, newSlide] };
                  }),
                };
              }),
              updatedAt: new Date().toISOString(),
            };
          }),
          editor: { ...state.editor, selectedSlideId: newSlide.id },
        }));
      },

      addSlideFromTemplate: (courseId, moduleId, lessonId, slide) => {
        set(state => ({
          courses: state.courses.map(c => {
            if (c.id !== courseId) return c;
            return {
              ...c,
              modules: c.modules.map(m => {
                if (m.id !== moduleId) return m;
                return {
                  ...m,
                  lessons: m.lessons.map(l => {
                    if (l.id !== lessonId) return l;
                    return { ...l, slides: [...l.slides, slide] };
                  }),
                };
              }),
              updatedAt: new Date().toISOString(),
            };
          }),
          editor: { ...state.editor, selectedSlideId: slide.id },
        }));
      },

      updateSlide: (courseId, moduleId, lessonId, slideId, updates) => {
        set(state => ({
          courses: state.courses.map(c => {
            if (c.id !== courseId) return c;
            return {
              ...c,
              modules: c.modules.map(m => {
                if (m.id !== moduleId) return m;
                return {
                  ...m,
                  lessons: m.lessons.map(l => {
                    if (l.id !== lessonId) return l;
                    return {
                      ...l,
                      slides: l.slides.map(s => (s.id === slideId ? { ...s, ...updates } : s)),
                    };
                  }),
                };
              }),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      deleteSlide: (courseId, moduleId, lessonId, slideId) => {
        set(state => ({
          courses: state.courses.map(c => {
            if (c.id !== courseId) return c;
            return {
              ...c,
              modules: c.modules.map(m => {
                if (m.id !== moduleId) return m;
                return {
                  ...m,
                  lessons: m.lessons.map(l => {
                    if (l.id !== lessonId) return l;
                    return { ...l, slides: l.slides.filter(s => s.id !== slideId) };
                  }),
                };
              }),
              updatedAt: new Date().toISOString(),
            };
          }),
          editor: state.editor.selectedSlideId === slideId
            ? { ...state.editor, selectedSlideId: null }
            : state.editor,
        }));
      },

      duplicateSlide: (courseId, moduleId, lessonId, slideId) => {
        set(state => ({
          courses: state.courses.map(c => {
            if (c.id !== courseId) return c;
            return {
              ...c,
              modules: c.modules.map(m => {
                if (m.id !== moduleId) return m;
                return {
                  ...m,
                  lessons: m.lessons.map(l => {
                    if (l.id !== lessonId) return l;
                    const slide = l.slides.find(s => s.id === slideId);
                    if (!slide) return l;
                    const dup = deepClone(slide);
                    dup.id = generateId();
                    dup.title = `${slide.title} (Copy)`;
                    dup.content.forEach(c => { c.id = generateId(); });
                    dup.questions.forEach(q => {
                      q.id = generateId();
                      q.options.forEach(o => { o.id = generateId(); });
                      q.matchingPairs.forEach(p => { p.id = generateId(); });
                    });
                    const idx = l.slides.findIndex(s => s.id === slideId);
                    const newSlides = [...l.slides];
                    newSlides.splice(idx + 1, 0, dup);
                    return { ...l, slides: newSlides };
                  }),
                };
              }),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      reorderSlides: (courseId, moduleId, lessonId, slideIds) => {
        set(state => ({
          courses: state.courses.map(c => {
            if (c.id !== courseId) return c;
            return {
              ...c,
              modules: c.modules.map(m => {
                if (m.id !== moduleId) return m;
                return {
                  ...m,
                  lessons: m.lessons.map(l => {
                    if (l.id !== lessonId) return l;
                    const reordered = slideIds.map(id => l.slides.find(s => s.id === id)).filter((s): s is Slide => s !== null);
                    return { ...l, slides: reordered };
                  }),
                };
              }),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      addContentBlock: (courseId, moduleId, lessonId, slideId, type) => {
        const block: ContentBlock = {
          id: generateId(),
          type,
          content: type === 'text' ? '<p>New text block</p>' :
                   type === 'heading' ? '<h2>Heading</h2>' :
                   type === 'divider' ? '' :
                   type === 'code' ? '<pre><code>// Code here</code></pre>' :
                   type === 'callout' ? '<p>Important information goes here.</p>' :
                   '',
          alt: '',
          caption: '',
          data: type === 'flip-card' ? {
            flipCards: [
              { id: generateId(), front: 'Front side', back: 'Back side', frontImage: '', backImage: '' },
              { id: generateId(), front: 'Term', back: 'Definition', frontImage: '', backImage: '' },
            ],
          } : type === 'hotspot' ? {
            hotspotImage: '',
            hotspotMarkers: [],
          } : type === 'accordion' ? {
            accordionItems: [
              { id: generateId(), title: 'Section 1', content: '<p>Content for section 1</p>' },
              { id: generateId(), title: 'Section 2', content: '<p>Content for section 2</p>' },
            ],
          } : type === 'tabs' ? {
            tabItems: [
              { id: generateId(), title: 'Tab 1', content: '<p>Content for tab 1</p>' },
              { id: generateId(), title: 'Tab 2', content: '<p>Content for tab 2</p>' },
            ],
          } : type === 'timeline' ? {
            timelineEvents: [
              { id: generateId(), date: 'Step 1', title: 'First Event', description: 'Description of the first event', icon: '' },
              { id: generateId(), date: 'Step 2', title: 'Second Event', description: 'Description of the second event', icon: '' },
            ],
          } : type === 'callout' ? {
            calloutStyle: 'info' as const,
            calloutTitle: 'Did you know?',
          } : type === 'table' ? {
            tableHeaders: ['Column 1', 'Column 2', 'Column 3'],
            tableRows: [['Cell 1', 'Cell 2', 'Cell 3'], ['Cell 4', 'Cell 5', 'Cell 6']],
            tableStriped: true,
          } : type === 'button' ? {
            buttonText: 'Learn More',
            buttonUrl: '',
            buttonStyle: 'primary' as const,
            buttonNewTab: true,
          } : type === 'audio' ? {
            audioUrl: '',
          } : type === 'embed' ? {
            embedUrl: '',
            embedHeight: 400,
          } : type === 'gallery' ? {
            galleryImages: [],
            galleryColumns: 3,
          } : type === 'labeled-graphic' ? {
            labeledImage: '',
            labeledMarkers: [],
          } : type === 'image-top' || type === 'image-bottom' || type === 'image-left' || type === 'image-right' ? {
            layoutText: '<p>Add your description text here...</p>',
            layoutImages: [{ url: '', caption: '', alt: '' }],
          } : type === 'two-images' ? {
            layoutImages: [{ url: '', caption: 'Image 1', alt: '' }, { url: '', caption: 'Image 2', alt: '' }],
          } : type === 'three-images' ? {
            layoutImages: [{ url: '', caption: 'Image 1', alt: '' }, { url: '', caption: 'Image 2', alt: '' }, { url: '', caption: 'Image 3', alt: '' }],
          } : type === 'scenario' ? (() => {
            const endSuccess = generateId();
            const endFail = generateId();
            const step1 = generateId();
            return {
              scenarioTitle: 'Decision Scenario',
              scenarioDescription: 'Make choices to navigate through the scenario.',
              scenarioImage: '',
              scenarioSteps: [
                { id: step1, text: 'You encounter a situation. What do you do?', choices: [
                  { id: generateId(), text: 'Option A — Take action', nextStepId: endSuccess, feedback: 'Good choice!' },
                  { id: generateId(), text: 'Option B — Wait and see', nextStepId: endFail, feedback: 'Not the best approach.' },
                ] },
                { id: endSuccess, text: '', choices: [], isEnd: true, endMessage: 'Great job! You made the right decision.', endType: 'success' as const },
                { id: endFail, text: '', choices: [], isEnd: true, endMessage: 'That could have gone better. Review the material and try again.', endType: 'failure' as const },
              ],
            };
          })() : type === 'checklist' ? {
            checklistTitle: 'Action Checklist',
            checklistItems: [
              { id: generateId(), title: 'Checklist Item 1', description: 'Description of the first item...' },
              { id: generateId(), title: 'Checklist Item 2', description: 'Description of the second item...' },
              { id: generateId(), title: 'Checklist Item 3', description: 'Description of the third item...' },
            ],
          } : type === 'card-sorting' ? {
            cardSortCategories: ['Category 1', 'Category 2'],
            cardSortCards: [
              { id: generateId(), text: 'Card A', correctCategory: 'Category 1' },
              { id: generateId(), text: 'Card B', correctCategory: 'Category 2' },
              { id: generateId(), text: 'Card C', correctCategory: 'Category 1' },
              { id: generateId(), text: 'Card D', correctCategory: 'Category 2' },
            ],
          } : undefined,
        };
        set(state => ({
          courses: state.courses.map(c => {
            if (c.id !== courseId) return c;
            return {
              ...c,
              modules: c.modules.map(m => {
                if (m.id !== moduleId) return m;
                return {
                  ...m,
                  lessons: m.lessons.map(l => {
                    if (l.id !== lessonId) return l;
                    return {
                      ...l,
                      slides: l.slides.map(s => {
                        if (s.id !== slideId) return s;
                        return { ...s, content: [...s.content, block] };
                      }),
                    };
                  }),
                };
              }),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      updateContentBlock: (courseId, moduleId, lessonId, slideId, blockId, updates) => {
        set(state => ({
          courses: state.courses.map(c => {
            if (c.id !== courseId) return c;
            return {
              ...c,
              modules: c.modules.map(m => {
                if (m.id !== moduleId) return m;
                return {
                  ...m,
                  lessons: m.lessons.map(l => {
                    if (l.id !== lessonId) return l;
                    return {
                      ...l,
                      slides: l.slides.map(s => {
                        if (s.id !== slideId) return s;
                        return {
                          ...s,
                          content: s.content.map(b => (b.id === blockId ? { ...b, ...updates } : b)),
                        };
                      }),
                    };
                  }),
                };
              }),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      deleteContentBlock: (courseId, moduleId, lessonId, slideId, blockId) => {
        set(state => ({
          courses: state.courses.map(c => {
            if (c.id !== courseId) return c;
            return {
              ...c,
              modules: c.modules.map(m => {
                if (m.id !== moduleId) return m;
                return {
                  ...m,
                  lessons: m.lessons.map(l => {
                    if (l.id !== lessonId) return l;
                    return {
                      ...l,
                      slides: l.slides.map(s => {
                        if (s.id !== slideId) return s;
                        return { ...s, content: s.content.filter(b => b.id !== blockId) };
                      }),
                    };
                  }),
                };
              }),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      addQuestion: (courseId, moduleId, lessonId, slideId, type = 'multiple-choice') => {
        const question = createDefaultQuestion(type);
        set(state => ({
          courses: state.courses.map(c => {
            if (c.id !== courseId) return c;
            return {
              ...c,
              modules: c.modules.map(m => {
                if (m.id !== moduleId) return m;
                return {
                  ...m,
                  lessons: m.lessons.map(l => {
                    if (l.id !== lessonId) return l;
                    return {
                      ...l,
                      slides: l.slides.map(s => {
                        if (s.id !== slideId) return s;
                        return { ...s, questions: [...s.questions, question], layout: 'quiz' as const };
                      }),
                    };
                  }),
                };
              }),
              updatedAt: new Date().toISOString(),
            };
          }),
          editor: { ...state.editor, selectedQuestionId: question.id, rightPanelTab: 'quiz' },
        }));
      },

      updateQuestion: (courseId, moduleId, lessonId, slideId, questionId, updates) => {
        set(state => ({
          courses: state.courses.map(c => {
            if (c.id !== courseId) return c;
            return {
              ...c,
              modules: c.modules.map(m => {
                if (m.id !== moduleId) return m;
                return {
                  ...m,
                  lessons: m.lessons.map(l => {
                    if (l.id !== lessonId) return l;
                    return {
                      ...l,
                      slides: l.slides.map(s => {
                        if (s.id !== slideId) return s;
                        return {
                          ...s,
                          questions: s.questions.map(q =>
                            q.id === questionId ? { ...q, ...updates } : q
                          ),
                        };
                      }),
                    };
                  }),
                };
              }),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      deleteQuestion: (courseId, moduleId, lessonId, slideId, questionId) => {
        set(state => ({
          courses: state.courses.map(c => {
            if (c.id !== courseId) return c;
            return {
              ...c,
              modules: c.modules.map(m => {
                if (m.id !== moduleId) return m;
                return {
                  ...m,
                  lessons: m.lessons.map(l => {
                    if (l.id !== lessonId) return l;
                    return {
                      ...l,
                      slides: l.slides.map(s => {
                        if (s.id !== slideId) return s;
                        return { ...s, questions: s.questions.filter(q => q.id !== questionId) };
                      }),
                    };
                  }),
                };
              }),
              updatedAt: new Date().toISOString(),
            };
          }),
          editor: state.editor.selectedQuestionId === questionId
            ? { ...state.editor, selectedQuestionId: null }
            : state.editor,
        }));
      },

      selectModule: (moduleId) => set(state => ({
        editor: { ...state.editor, selectedModuleId: moduleId, selectedLessonId: null, selectedSlideId: null, selectedQuestionId: null },
      })),

      selectLesson: (lessonId) => set(state => ({
        editor: { ...state.editor, selectedLessonId: lessonId, selectedSlideId: null, selectedQuestionId: null },
      })),

      selectSlide: (slideId) => set(state => ({
        editor: { ...state.editor, selectedSlideId: slideId, selectedQuestionId: null },
      })),

      selectQuestion: (questionId) => set(state => ({
        editor: { ...state.editor, selectedQuestionId: questionId },
      })),

      navigateToSlide: (moduleId, lessonId, slideId) => set(state => ({
        editor: {
          ...state.editor,
          selectedModuleId: moduleId,
          selectedLessonId: lessonId,
          selectedSlideId: slideId,
          selectedQuestionId: null,
        },
      })),

      navigateToLesson: (moduleId, lessonId) => set(state => ({
        editor: {
          ...state.editor,
          selectedModuleId: moduleId,
          selectedLessonId: lessonId,
          selectedSlideId: null,
          selectedQuestionId: null,
        },
      })),

      toggleSidebar: () => set(state => ({
        editor: { ...state.editor, sidebarCollapsed: !state.editor.sidebarCollapsed },
      })),

      setRightPanelTab: (tab) => set(state => ({
        editor: { ...state.editor, rightPanelTab: tab },
      })),

      setShowExportDialog: (show) => set({ showExportDialog: show }),

      setPreviewSlideIndex: (index) => set({ previewSlideIndex: index }),

      getActiveCourse: () => {
        const state = get();
        return state.activeCourseId ? findCourse(state.courses, state.activeCourseId) ?? null : null;
      },

      getSelectedSlide: () => {
        const state = get();
        const course = state.activeCourseId ? findCourse(state.courses, state.activeCourseId) : undefined;
        if (!course || !state.editor.selectedModuleId || !state.editor.selectedLessonId || !state.editor.selectedSlideId) return null;
        const mod = findModule(course, state.editor.selectedModuleId);
        if (!mod) return null;
        const lesson = findLesson(mod, state.editor.selectedLessonId);
        if (!lesson) return null;
        return findSlide(lesson, state.editor.selectedSlideId) ?? null;
      },
    }),
    {
      name: 'elearning-studio-storage',
      partialize: (state) => ({
        courses: state.courses,
      }),
      merge: (persistedState, currentState) => {
        const merged = { ...currentState, ...(persistedState as object) } as AppState;
        if (typeof window !== 'undefined' && !window.localStorage.getItem(SEED_FLAG_KEY)) {
          merged.courses = [...buildSeedCourses(), ...(merged.courses || [])];
          window.localStorage.setItem(SEED_FLAG_KEY, '1');
        }
        return merged;
      },
    }
  )
);
