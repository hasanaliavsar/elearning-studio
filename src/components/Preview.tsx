import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useStore } from '../store';
import type { Slide, Question, Course, ContentBlock, EntranceAnimation, SlideTransition } from '../types';
import {
  ArrowLeft, ArrowRight, X, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Award, RotateCcw, Home,
  ChevronDown, ChevronUp, Info, AlertTriangle, Lightbulb, CheckCircle,
  ExternalLink, Volume2, GripVertical, Download, Star, MapPin,
  PanelLeftClose, PanelLeftOpen, FileText, Trophy, Circle
} from 'lucide-react';
import { CourseLandingPage } from './CourseLandingPage';

interface FlatSlide {
  slide: Slide;
  moduleTitle: string;
  lessonTitle: string;
  moduleIdx: number;
  lessonIdx: number;
  slideIdx: number;
}

export function CoursePreview() {
  const course = useStore(s => s.getActiveCourse());
  const setViewMode = useStore(s => s.setViewMode);
  const previewSlideIndex = useStore(s => s.previewSlideIndex);
  const setPreviewSlideIndex = useStore(s => s.setPreviewSlideIndex);

  const [showLanding, setShowLanding] = useState(
    course ? course.settings.landingPage.enabled : false
  );
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [submittedQuizzes, setSubmittedQuizzes] = useState<Set<string>>(new Set());
  const [showResults, setShowResults] = useState(false);

  // Slide transition state
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');
  const [transitioning, setTransitioning] = useState(false);
  const slideContentRef = useRef<HTMLDivElement>(null);

  // Scroll-reveal: track which blocks have been revealed
  const [revealedBlocks, setRevealedBlocks] = useState<Set<string>>(new Set());
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Interactive block state keyed by block ID
  const [flippedCards, setFlippedCards] = useState<Record<string, Set<string>>>({});
  const [openAccordions, setOpenAccordions] = useState<Record<string, Set<string>>>({});
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>({});
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [galleryLightbox, setGalleryLightbox] = useState<{ blockId: string; imageUrl: string } | null>(null);

  // LMS sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [visitedSlides, setVisitedSlides] = useState<Set<number>>(new Set([0]));
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set([0]));

  const toggleFlipCard = useCallback((blockId: string, cardId: string) => {
    setFlippedCards(prev => {
      const set = new Set(prev[blockId] || []);
      if (set.has(cardId)) set.delete(cardId); else set.add(cardId);
      return { ...prev, [blockId]: set };
    });
  }, []);

  const toggleAccordion = useCallback((blockId: string, itemId: string) => {
    setOpenAccordions(prev => {
      const set = new Set(prev[blockId] || []);
      if (set.has(itemId)) set.delete(itemId); else set.add(itemId);
      return { ...prev, [blockId]: set };
    });
  }, []);

  const setActiveTab = useCallback((blockId: string, tabId: string) => {
    setActiveTabs(prev => ({ ...prev, [blockId]: tabId }));
  }, []);

  const flatSlides = useMemo<FlatSlide[]>(() => {
    if (!course) return [];
    const slides: FlatSlide[] = [];
    course.modules.forEach((mod, mi) => {
      mod.lessons.forEach((lesson, li) => {
        lesson.slides.forEach((slide, si) => {
          slides.push({
            slide,
            moduleTitle: mod.title,
            lessonTitle: lesson.title,
            moduleIdx: mi,
            lessonIdx: li,
            slideIdx: si,
          });
        });
      });
    });
    return slides;
  }, [course]);

  if (!course || flatSlides.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-600">
          <p className="text-lg mb-4">No slides to preview</p>
          <button onClick={() => setViewMode('editor')} className="btn-primary">
            Back to Editor
          </button>
        </div>
      </div>
    );
  }

  const currentFlat = flatSlides[previewSlideIndex] ?? flatSlides[0]!;
  const currentSlide = currentFlat.slide;
  const progress = ((previewSlideIndex + 1) / flatSlides.length) * 100;
  const isLastSlide = previewSlideIndex === flatSlides.length - 1;

  const resolvedTransition: SlideTransition = currentSlide.transition || course.settings.defaultTransition || 'none';

  const goNext = () => {
    if (isLastSlide) {
      setShowResults(true);
    } else {
      setSlideDirection('next');
      if (resolvedTransition !== 'none') {
        setTransitioning(true);
        setTimeout(() => {
          setPreviewSlideIndex(previewSlideIndex + 1);
          setTransitioning(false);
          setRevealedBlocks(new Set());
        }, 350);
      } else {
        setPreviewSlideIndex(previewSlideIndex + 1);
        setRevealedBlocks(new Set());
      }
    }
  };

  const goPrev = () => {
    if (previewSlideIndex > 0) {
      setSlideDirection('prev');
      if (resolvedTransition !== 'none') {
        setTransitioning(true);
        setTimeout(() => {
          setPreviewSlideIndex(previewSlideIndex - 1);
          setTransitioning(false);
          setRevealedBlocks(new Set());
        }, 350);
      } else {
        setPreviewSlideIndex(previewSlideIndex - 1);
        setRevealedBlocks(new Set());
      }
    }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setQuizAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmitQuiz = (questionId: string) => {
    setSubmittedQuizzes(prev => new Set([...prev, questionId]));
  };

  const isCorrect = (question: Question): boolean => {
    const answer = quizAnswers[question.id];
    if (!answer) return false;
    if (question.type === 'multiple-choice' || question.type === 'true-false') {
      const correctOption = question.options.find(o => o.isCorrect);
      return correctOption?.id === answer;
    }
    if (question.type === 'fill-in-blank') {
      return answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
    }
    if (question.type === 'likert') {
      return question.likertCorrectIndex !== undefined && Number(answer) === question.likertCorrectIndex;
    }
    if (question.type === 'rating') {
      return question.ratingCorrect !== undefined && Number(answer) >= question.ratingCorrect;
    }
    if (question.type === 'slider') {
      return question.sliderCorrect !== undefined && Number(answer) >= question.sliderCorrect;
    }
    if (question.type === 'image-choice' || question.type === 'dropdown') {
      const correctOption = question.options.find(o => o.isCorrect);
      return correctOption?.id === answer;
    }
    if (question.type === 'matrix') {
      if (!question.matrixGraded) return true; // ungraded always "correct"
      try {
        const selections = JSON.parse(answer) as Record<string, number>;
        return (question.matrixRows || []).every(row =>
          row.correctColumn !== undefined && selections[row.id] === row.correctColumn
        );
      } catch { return false; }
    }
    if (question.type === 'open-ended') {
      const keywords = question.openEndedKeywords || [];
      if (keywords.length === 0) return true; // no keywords = always accepted
      const lowerAnswer = answer.toLowerCase();
      const matched = keywords.filter(kw => lowerAnswer.includes(kw.toLowerCase()));
      return matched.length > 0;
    }
    if (question.type === 'ranking') {
      try {
        const userOrder = JSON.parse(answer) as string[];
        return JSON.stringify(userOrder) === JSON.stringify(question.correctOrder);
      } catch { return false; }
    }
    if (question.type === 'hotspot-question') {
      try {
        const click = JSON.parse(answer) as { x: number; y: number };
        return (question.hotspotZones || []).some(zone => {
          if (!zone.isCorrect) return false;
          const dist = Math.sqrt((click.x - zone.x) ** 2 + (click.y - zone.y) ** 2);
          return dist <= zone.radius;
        });
      } catch { return false; }
    }
    return false;
  };

  // Calculate total score
  const allQuestions = flatSlides.flatMap(fs => fs.slide.questions);
  const totalPoints = allQuestions.reduce((t, q) => t + q.points, 0);
  const earnedPoints = allQuestions.reduce((t, q) => t + (isCorrect(q) ? q.points : 0), 0);
  const scorePercent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 100;
  const passed = scorePercent >= (course.settings.passingScore || 70);

  const handleClose = () => {
    setViewMode('editor');
    setPreviewSlideIndex(0);
    setShowLanding(course.settings.landingPage.enabled);
  };

  const handleRestart = () => {
    setPreviewSlideIndex(0);
    setQuizAnswers({});
    setSubmittedQuizzes(new Set());
    setShowResults(false);
  };

  const handleJumpToModule = (moduleIdx: number) => {
    // Calculate the flat slide index for the first slide of that module
    let targetIndex = 0;
    for (let mi = 0; mi < course.modules.length && mi < moduleIdx; mi++) {
      for (const lesson of course.modules[mi]!.lessons) {
        targetIndex += lesson.slides.length;
      }
    }
    setPreviewSlideIndex(targetIndex);
    setShowLanding(false);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!course.settings.enableKeyboardNav || showResults) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Track visited slides and auto-expand current module
  useEffect(() => {
    setVisitedSlides(prev => new Set([...prev, previewSlideIndex]));
    if (currentFlat) {
      setExpandedModules(prev => new Set([...prev, currentFlat.moduleIdx]));
    }
  }, [previewSlideIndex]);

  // Scroll-reveal: Intersection Observer for content block animations
  // Uses a MutationObserver to catch refs that mount after the effect runs
  useEffect(() => {
    if (!course.settings.enableScrollReveal) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const blockId = entry.target.getAttribute('data-block-id');
            if (blockId) setRevealedBlocks((prev) => new Set([...prev, blockId]));
          }
        });
      },
      { threshold: 0.05, rootMargin: '100px' }
    );

    // Observe existing refs
    const observeAll = () => {
      Object.values(blockRefs.current).forEach((el) => {
        if (el) observer.observe(el);
      });
    };

    // Initial observe + retry after a tick (handles landing→slide transition)
    observeAll();
    const t1 = setTimeout(observeAll, 150);
    const t2 = setTimeout(observeAll, 500);

    return () => {
      observer.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [previewSlideIndex, course.settings.enableScrollReveal, showLanding]);

  // Resolve animation for a block
  const getBlockAnimation = (block: ContentBlock, index: number): { animName: EntranceAnimation; delay: number } => {
    const animName: EntranceAnimation = block.animation || course.settings.defaultAnimation || 'none';
    const delay = block.animationDelay ?? index * 150;
    return { animName, delay };
  };

  // Should a block be visible (for scroll-reveal gating)
  const isBlockVisible = (block: ContentBlock): boolean => {
    if (!course.settings.enableScrollReveal) return true;
    return revealedBlocks.has(block.id);
  };

  // Transition CSS class for slide card
  const getSlideTransitionClass = (): string => {
    if (!transitioning) return 'preview-slide-enter';
    if (resolvedTransition === 'fade') return 'preview-slide-fade-exit';
    if (resolvedTransition === 'slide-left') return slideDirection === 'next' ? 'preview-slide-left-exit' : 'preview-slide-right-exit';
    if (resolvedTransition === 'slide-up') return 'preview-slide-up-exit';
    if (resolvedTransition === 'zoom') return 'preview-slide-zoom-exit';
    return '';
  };

  const primaryColor = course.settings.primaryColor || '#4f46e5';

  // Build sidebar module tree with flat indices
  const sidebarModules = useMemo(() => {
    let flatIdx = 0;
    return course.modules.map((mod, mi) => {
      const lessons = mod.lessons.map((lesson, li) => {
        const slides = lesson.slides.map((slide, si) => {
          const idx = flatIdx++;
          return { slide, slideIdx: si, flatIndex: idx, title: slide.title || `Slide ${si + 1}` };
        });
        return { lesson, lessonIdx: li, slides, title: lesson.title };
      });
      return { module: mod, moduleIdx: mi, lessons, title: mod.title };
    });
  }, [course.modules]);

  // Calculate progress per module
  const getModuleProgress = (moduleIdx: number): { visited: number; total: number } => {
    const mod = sidebarModules[moduleIdx];
    if (!mod) return { visited: 0, total: 0 };
    let total = 0;
    let visited = 0;
    for (const lesson of mod.lessons) {
      for (const slide of lesson.slides) {
        total++;
        if (visitedSlides.has(slide.flatIndex)) visited++;
      }
    }
    return { visited, total };
  };

  const toggleModule = (moduleIdx: number) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleIdx)) next.delete(moduleIdx); else next.add(moduleIdx);
      return next;
    });
  };

  const handleSidebarNavigate = (flatIndex: number) => {
    setSlideDirection(flatIndex > previewSlideIndex ? 'next' : 'prev');
    if (resolvedTransition !== 'none') {
      setTransitioning(true);
      setTimeout(() => {
        setPreviewSlideIndex(flatIndex);
        setTransitioning(false);
        setRevealedBlocks(new Set());
      }, 350);
    } else {
      setPreviewSlideIndex(flatIndex);
      setRevealedBlocks(new Set());
    }
  };

  // Landing page screen
  if (showLanding && course.settings.landingPage.enabled) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <header className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={handleClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
            <span className="text-gray-800 font-medium text-sm">{course.title}</span>
          </div>
          <span className="text-gray-400 text-sm">Landing Page</span>
        </header>
        <div className="flex-1 overflow-auto">
          <CourseLandingPage
            course={course}
            onStartCourse={() => { setShowLanding(false); setPreviewSlideIndex(0); }}
            onJumpToModule={handleJumpToModule}
          />
        </div>
      </div>
    );
  }

  // Results screen
  if (showResults) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <header className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button onClick={handleClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
            <span className="text-gray-800 font-medium text-sm">{course.title}</span>
          </div>
          <span className="text-gray-400 text-sm">Results</span>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
              passed ? 'bg-emerald-100' : 'bg-red-100'
            }`}>
              {passed ? (
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              ) : (
                <XCircle className="w-10 h-10 text-red-500" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {passed ? 'Congratulations!' : 'Keep Trying!'}
            </h2>
            <p className="text-gray-500 mb-6">
              {passed
                ? 'You have successfully completed this course.'
                : `You need ${course.settings.passingScore}% to pass. Try again!`}
            </p>

            {allQuestions.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <div className="text-4xl font-bold mb-1" style={{ color: passed ? '#059669' : '#dc2626' }}>
                  {scorePercent}%
                </div>
                <p className="text-sm text-gray-500">
                  {earnedPoints} / {totalPoints} points
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${scorePercent}%`,
                      backgroundColor: passed ? '#059669' : '#dc2626'
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button onClick={handleRestart} className="btn-secondary">
                <RotateCcw className="w-4 h-4" />
                Restart
              </button>
              <button onClick={handleClose} className="btn-primary">
                <Home className="w-4 h-4" />
                Back to Editor
              </button>
            </div>
          </div>

          {/* Completion Certificate */}
          {course.settings.showCertificate && passed && (
            <div className="mt-8 max-w-lg w-full">
              <div
                className="rounded-2xl p-1"
                style={{
                  background: 'linear-gradient(135deg, #d4af37, #6366f1, #d4af37)',
                }}
              >
                <div className="bg-white rounded-xl p-8 text-center relative overflow-hidden">
                  {/* Decorative corner accents */}
                  <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-amber-400 rounded-tl-lg" />
                  <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-amber-400 rounded-tr-lg" />
                  <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-amber-400 rounded-bl-lg" />
                  <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-amber-400 rounded-br-lg" />

                  <Award className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {course.settings.certificateTitle || 'Certificate of Completion'}
                  </h3>
                  <div className="w-16 h-0.5 bg-amber-400 mx-auto my-3" />
                  <p className="text-sm text-gray-500 mb-2">This certifies that</p>
                  <p className="text-lg font-semibold text-indigo-700 mb-2">{course.title}</p>
                  <p className="text-sm text-gray-500 mb-4">has been successfully completed</p>
                  <div className="flex justify-center gap-8 text-sm text-gray-600 mb-4">
                    <div>
                      <p className="font-semibold">{scorePercent}%</p>
                      <p className="text-xs text-gray-400">Score</p>
                    </div>
                    <div>
                      <p className="font-semibold">{new Date().toLocaleDateString()}</p>
                      <p className="text-xs text-gray-400">Date</p>
                    </div>
                  </div>
                  {course.settings.certificateOrg && (
                    <p className="text-sm text-gray-500 italic">{course.settings.certificateOrg}</p>
                  )}
                  <button
                    onClick={() => window.print()}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download Certificate
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Animation & transition CSS */}
      <style>{`
        /* Entrance animations for content blocks */
        @keyframes anim-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes anim-slide-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes anim-slide-left { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes anim-slide-right { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes anim-zoom-in { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
        @keyframes anim-bounce-in { 0% { opacity: 0; transform: scale(0.5); } 60% { opacity: 1; transform: scale(1.08); } 100% { transform: scale(1); } }

        .block-anim-fade-in { animation: anim-fade-in 0.5s ease-out both; }
        .block-anim-slide-up { animation: anim-slide-up 0.5s ease-out both; }
        .block-anim-slide-left { animation: anim-slide-left 0.5s ease-out both; }
        .block-anim-slide-right { animation: anim-slide-right 0.5s ease-out both; }
        .block-anim-zoom-in { animation: anim-zoom-in 0.45s ease-out both; }
        .block-anim-bounce-in { animation: anim-bounce-in 0.6s ease-out both; }
        .block-anim-hidden { opacity: 0; }

        /* Slide transitions */
        @keyframes slide-enter { from { opacity: 0; transform: translateX(0); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slide-fade-exit { to { opacity: 0; } }
        @keyframes slide-left-exit { to { opacity: 0; transform: translateX(-60px); } }
        @keyframes slide-right-exit { to { opacity: 0; transform: translateX(60px); } }
        @keyframes slide-up-exit { to { opacity: 0; transform: translateY(-40px); } }
        @keyframes slide-zoom-exit { to { opacity: 0; transform: scale(0.9); } }

        .preview-slide-enter { animation: slide-enter 0.35s ease-out both; }
        .preview-slide-fade-exit { animation: slide-fade-exit 0.35s ease-in both; }
        .preview-slide-left-exit { animation: slide-left-exit 0.35s ease-in both; }
        .preview-slide-right-exit { animation: slide-right-exit 0.35s ease-in both; }
        .preview-slide-up-exit { animation: slide-up-exit 0.35s ease-in both; }
        .preview-slide-zoom-exit { animation: slide-zoom-exit 0.35s ease-in both; }
      `}</style>

      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={handleClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
          {course.settings.landingPage.enabled && (
            <button
              onClick={() => setShowLanding(true)}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              title="Back to landing page"
            >
              <Home className="w-4 h-4" />
            </button>
          )}
          <div className="border-l border-gray-200 pl-3">
            <span className="text-gray-800 font-medium text-sm">{course.title}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-500 text-sm">
            Page {previewSlideIndex + 1} of {flatSlides.length}
          </span>
        </div>
      </header>

      {/* Progress bar */}
      {course.settings.showProgress && (
        <div className="h-0.5 bg-gray-200">
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${progress}%`, backgroundColor: primaryColor }}
          />
        </div>
      )}

      {/* Body: Sidebar + Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <aside
          className={`bg-white border-r border-gray-200 flex-shrink-0 flex flex-col transition-all duration-200 ${
            sidebarOpen ? 'w-72' : 'w-0'
          } overflow-hidden`}
        >
          {sidebarOpen && (
            <>
              {/* Sidebar header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-800 truncate">{course.title}</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors flex-shrink-0"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>

              {/* Module tree */}
              <div className="flex-1 overflow-y-auto py-2">
                {sidebarModules.map((mod) => {
                  const isExpanded = expandedModules.has(mod.moduleIdx);
                  const modProgress = getModuleProgress(mod.moduleIdx);
                  const allVisited = modProgress.visited === modProgress.total && modProgress.total > 0;
                  return (
                    <div key={mod.moduleIdx} className="mb-1">
                      {/* Module header */}
                      <button
                        onClick={() => toggleModule(mod.moduleIdx)}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-400 uppercase tracking-wide">Section {mod.moduleIdx + 1}</p>
                          <p className="text-sm font-semibold text-gray-800 truncate">{mod.title}</p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                      </button>

                      {/* Slide list */}
                      {isExpanded && (
                        <div className="ml-2">
                          {mod.lessons.map((lesson) => (
                            <div key={lesson.lessonIdx}>
                              {mod.lessons.length > 1 && (
                                <p className="px-4 py-1 text-xs text-gray-400 font-medium truncate">{lesson.title}</p>
                              )}
                              {lesson.slides.map((slideItem) => {
                                const isCurrent = slideItem.flatIndex === previewSlideIndex;
                                const isVisited = visitedSlides.has(slideItem.flatIndex);
                                return (
                                  <button
                                    key={slideItem.flatIndex}
                                    onClick={() => handleSidebarNavigate(slideItem.flatIndex)}
                                    className={`w-full flex items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors ${
                                      isCurrent
                                        ? 'font-medium bg-gray-50'
                                        : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                    style={isCurrent ? {
                                      color: primaryColor,
                                      borderLeft: `3px solid ${primaryColor}`,
                                      paddingLeft: '13px',
                                    } : {
                                      borderLeft: '3px solid transparent',
                                      paddingLeft: '13px',
                                    }}
                                  >
                                    {isCurrent ? (
                                      <div
                                        className="w-2 h-2 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: primaryColor }}
                                      />
                                    ) : isVisited ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                    ) : (
                                      <Circle className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                                    )}
                                    <span className="truncate">{slideItem.title}</span>
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                          <p className="px-4 py-1.5 text-xs text-gray-400">
                            {allVisited ? 'Completed' : `${modProgress.visited} / ${modProgress.total} viewed`}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Results link */}
              <div className="border-t border-gray-100 px-4 py-3">
                <button
                  onClick={() => setShowResults(true)}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors w-full"
                >
                  <Trophy className="w-4 h-4" />
                  Results
                </button>
              </div>
            </>
          )}
        </aside>

        {/* Sidebar toggle (when collapsed) */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 rounded-r-lg p-1.5 text-gray-400 hover:text-gray-600 shadow-sm transition-colors"
            title="Open sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}

        {/* Main content area */}
        <div className="flex-1 overflow-y-auto bg-white">
          {/* Page indicator */}
          <div className="px-10 pt-6 pb-2">
            <span className="text-xs text-gray-400">Page {previewSlideIndex + 1} of {flatSlides.length}</span>
          </div>
          <div
            ref={slideContentRef}
            className={`${getSlideTransitionClass()}`}
            key={`slide-${previewSlideIndex}`}
          >
          {/* Cover slide layout */}
          {currentSlide.isCoverSlide ? (
            <div
              className="relative flex flex-col items-center justify-center text-center"
              style={{
                minHeight: 'calc(100vh - 12rem)',
                backgroundColor: currentSlide.backgroundColor || '#1e293b',
                backgroundImage: currentSlide.backgroundImage ? `url(${currentSlide.backgroundImage})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                fontFamily: course.settings.fontFamily || 'Inter',
              }}
            >
              {/* Semi-transparent overlay for background images */}
              {currentSlide.backgroundImage && (
                <div className="absolute inset-0 bg-black/50" />
              )}
              <div className="relative z-10 px-12 py-16">
                {currentSlide.title && (
                  <h1 className="text-5xl font-extrabold text-white mb-4 drop-shadow-lg">
                    {currentSlide.title}
                  </h1>
                )}
                {currentSlide.coverSubtitle && (
                  <p className="text-xl text-white/80 font-light max-w-2xl mx-auto">
                    {currentSlide.coverSubtitle}
                  </p>
                )}
              </div>
            </div>
          ) : (
          <div
            className="p-10"
            style={{
              backgroundColor: currentSlide.backgroundColor,
              backgroundImage: currentSlide.backgroundImage ? `url(${currentSlide.backgroundImage})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              fontFamily: course.settings.fontFamily || 'Inter',
            }}
          >
            {/* Learning objectives */}
            {currentSlide.learningObjectives && currentSlide.learningObjectives.length > 0 && (
              <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50/60 p-5">
                <h3 className="text-sm font-semibold text-indigo-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Learning Objectives
                </h3>
                <ul className="space-y-1.5">
                  {currentSlide.learningObjectives.map((obj) => (
                    <li key={obj.id} className="flex items-start gap-2 text-sm text-indigo-900">
                      <CheckCircle className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <span>{obj.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Slide title */}
            {currentSlide.title && (
              <h1
                className={`text-3xl font-bold mb-6 ${
                  currentSlide.backgroundColor === '#0f172a' || currentSlide.backgroundColor === '#1e293b'
                    ? 'text-white'
                    : 'text-gray-900'
                }`}
              >
                {currentSlide.title}
              </h1>
            )}

            {/* Content blocks */}
            <div className={`space-y-4 ${currentSlide.layout === 'two-column' ? 'grid grid-cols-2 gap-8 space-y-0' : ''}`}>
              {currentSlide.content.map((block, blockIndex) => {
                const { animName, delay } = getBlockAnimation(block, blockIndex);
                const visible = isBlockVisible(block);
                const animClass = animName !== 'none' && visible
                  ? `block-anim-${animName}`
                  : animName !== 'none' && !visible && course.settings.enableScrollReveal
                    ? 'block-anim-hidden'
                    : '';
                return (
                <div
                  key={block.id}
                  ref={(el) => { blockRefs.current[block.id] = el; }}
                  data-block-id={block.id}
                  className={animClass}
                  style={animName !== 'none' && visible ? { animationDelay: `${delay}ms` } : undefined}
                >
                  {(block.type === 'text' || block.type === 'heading' || block.type === 'list') && (
                    <div
                      className={`prose prose-lg max-w-none ${
                        currentSlide.backgroundColor === '#0f172a' || currentSlide.backgroundColor === '#1e293b'
                          ? 'prose-invert'
                          : ''
                      }`}
                      dangerouslySetInnerHTML={{ __html: block.content }}
                    />
                  )}
                  {block.type === 'image' && block.content && (
                    <div className="text-center">
                      <img
                        src={block.content}
                        alt={block.alt || ''}
                        className="max-w-full rounded-xl shadow-lg inline-block"
                      />
                      {block.caption && (
                        <p className="text-sm text-gray-500 mt-2 italic">{block.caption}</p>
                      )}
                    </div>
                  )}
                  {block.type === 'video' && block.content && (
                    <div className="aspect-video rounded-xl overflow-hidden shadow-lg">
                      <iframe
                        src={block.content.replace('watch?v=', 'embed/')}
                        className="w-full h-full"
                        allowFullScreen
                        title="Video content"
                      />
                    </div>
                  )}
                  {block.type === 'code' && (
                    <div
                      className="prose max-w-none"
                      dangerouslySetInnerHTML={{ __html: block.content }}
                    />
                  )}
                  {block.type === 'divider' && (
                    <hr className="my-6 border-gray-300" />
                  )}

                  {/* Flip Cards */}
                  {block.type === 'flip-card' && block.data?.flipCards && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {block.data.flipCards.map(card => {
                        const isFlipped = flippedCards[block.id]?.has(card.id) ?? false;
                        return (
                          <div
                            key={card.id}
                            className="cursor-pointer"
                            style={{ perspective: '1000px', minHeight: '180px' }}
                            onClick={() => toggleFlipCard(block.id, card.id)}
                          >
                            <div
                              className="relative w-full h-full transition-transform duration-500"
                              style={{
                                transformStyle: 'preserve-3d',
                                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                                minHeight: '180px',
                              }}
                            >
                              {/* Front */}
                              <div
                                className="absolute inset-0 rounded-xl border-2 border-gray-200 bg-white shadow-md flex flex-col items-center justify-center p-4 text-center"
                                style={{ backfaceVisibility: 'hidden' }}
                              >
                                {card.frontImage && (
                                  <img src={card.frontImage} alt="" className="max-h-20 rounded mb-2" />
                                )}
                                <p className="text-sm font-medium text-gray-800">{card.front}</p>
                                <p className="text-xs text-gray-400 mt-2">Click to flip</p>
                              </div>
                              {/* Back */}
                              <div
                                className="absolute inset-0 rounded-xl border-2 border-indigo-300 bg-indigo-50 shadow-md flex flex-col items-center justify-center p-4 text-center"
                                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                              >
                                {card.backImage && (
                                  <img src={card.backImage} alt="" className="max-h-20 rounded mb-2" />
                                )}
                                <p className="text-sm text-gray-700">{card.back}</p>
                                <p className="text-xs text-gray-400 mt-2">Click to flip back</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Hotspot */}
                  {block.type === 'hotspot' && block.data?.hotspotImage && (
                    <div className="relative inline-block w-full">
                      <img
                        src={block.data.hotspotImage}
                        alt="Hotspot image"
                        className="w-full rounded-xl"
                      />
                      {block.data.hotspotMarkers?.map(marker => (
                        <div
                          key={marker.id}
                          className="absolute"
                          style={{ left: `${marker.x}%`, top: `${marker.y}%`, transform: 'translate(-50%, -50%)' }}
                        >
                          <button
                            className="w-6 h-6 rounded-full bg-indigo-500 border-2 border-white shadow-lg text-white text-xs font-bold hover:scale-125 transition-transform focus:outline-none"
                            onClick={(e) => { e.stopPropagation(); setActiveTooltip(activeTooltip === marker.id ? null : marker.id); }}
                            onMouseEnter={() => setActiveTooltip(marker.id)}
                            onMouseLeave={() => setActiveTooltip(null)}
                          >
                            &bull;
                          </button>
                          {activeTooltip === marker.id && (
                            <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl pointer-events-none">
                              <p className="font-bold mb-1">{marker.label}</p>
                              <p>{marker.description}</p>
                              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Accordion */}
                  {block.type === 'accordion' && block.data?.accordionItems && (
                    <div className="border rounded-xl overflow-hidden divide-y">
                      {block.data.accordionItems.map(item => {
                        const isOpen = openAccordions[block.id]?.has(item.id) ?? false;
                        return (
                          <div key={item.id}>
                            <button
                              onClick={() => toggleAccordion(block.id, item.id)}
                              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                            >
                              <span className="font-medium text-gray-900">{item.title}</span>
                              {isOpen ? (
                                <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              )}
                            </button>
                            {isOpen && (
                              <div className="px-5 pb-4 text-sm text-gray-600">
                                <div dangerouslySetInnerHTML={{ __html: item.content }} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Tabs */}
                  {block.type === 'tabs' && block.data?.tabItems && block.data.tabItems.length > 0 && (() => {
                    const activeTabId = activeTabs[block.id] || block.data!.tabItems![0]!.id;
                    const activeTabContent = block.data!.tabItems!.find(t => t.id === activeTabId);
                    return (
                      <div className="border rounded-xl overflow-hidden">
                        <div className="flex border-b bg-gray-50">
                          {block.data!.tabItems!.map(tab => (
                            <button
                              key={tab.id}
                              onClick={() => setActiveTab(block.id, tab.id)}
                              className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                                tab.id === activeTabId
                                  ? 'border-indigo-500 text-indigo-600 bg-white'
                                  : 'border-transparent text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              {tab.title}
                            </button>
                          ))}
                        </div>
                        <div className="p-5 text-sm text-gray-700">
                          {activeTabContent && (
                            <div dangerouslySetInnerHTML={{ __html: activeTabContent.content }} />
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Timeline */}
                  {block.type === 'timeline' && block.data?.timelineEvents && (
                    <div className="relative pl-8">
                      {/* Vertical line */}
                      <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-300" />
                      <div className="space-y-6">
                        {block.data.timelineEvents.map((event, idx) => (
                          <div key={event.id} className="relative">
                            {/* Dot */}
                            <div
                              className="absolute -left-5 top-1 w-4 h-4 rounded-full border-2 border-indigo-500 bg-white z-10"
                              style={{ left: '-1.25rem' }}
                            />
                            <div className="bg-white rounded-lg border p-4 shadow-sm ml-2">
                              {event.date && (
                                <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">
                                  {event.date}
                                </span>
                              )}
                              <h4 className="font-medium text-gray-900 mt-1">{event.title}</h4>
                              {event.description && (
                                <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Callout */}
                  {block.type === 'callout' && (() => {
                    const style = block.data?.calloutStyle || 'info';
                    const styleMap = {
                      info: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-800', icon: <Info className="w-5 h-5 text-blue-500" /> },
                      warning: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-800', icon: <AlertTriangle className="w-5 h-5 text-amber-500" /> },
                      tip: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-800', icon: <Lightbulb className="w-5 h-5 text-green-500" /> },
                      success: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-800', icon: <CheckCircle className="w-5 h-5 text-emerald-500" /> },
                    };
                    const s = styleMap[style] || styleMap.info;
                    return (
                      <div className={`${s.bg} ${s.border} border-l-4 rounded-lg p-4`}>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">{s.icon}</div>
                          <div>
                            {block.data?.calloutTitle && (
                              <p className={`font-semibold ${s.text} mb-1`}>{block.data.calloutTitle}</p>
                            )}
                            <div className={`text-sm ${s.text}`} dangerouslySetInnerHTML={{ __html: block.content }} />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Table */}
                  {block.type === 'table' && block.data?.tableHeaders && (
                    <div className="overflow-x-auto rounded-xl border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-100">
                            {block.data.tableHeaders.map((header, i) => (
                              <th key={i} className="px-4 py-3 text-left font-semibold text-gray-700 border-b">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {block.data.tableRows?.map((row, ri) => (
                            <tr
                              key={ri}
                              className={block.data!.tableStriped && ri % 2 === 1 ? 'bg-gray-50' : ''}
                            >
                              {row.map((cell, ci) => (
                                <td key={ci} className="px-4 py-3 border-b text-gray-600">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Button */}
                  {block.type === 'button' && block.data?.buttonText && (
                    <div className="text-center">
                      <a
                        href={block.data.buttonUrl || '#'}
                        target={block.data.buttonNewTab ? '_blank' : undefined}
                        rel={block.data.buttonNewTab ? 'noopener noreferrer' : undefined}
                        className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-colors ${
                          block.data.buttonStyle === 'secondary'
                            ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                            : block.data.buttonStyle === 'outline'
                              ? 'border-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50'
                              : block.data.buttonStyle === 'link'
                                ? 'text-indigo-600 underline hover:text-indigo-800'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                        style={
                          !block.data.buttonStyle || block.data.buttonStyle === 'primary'
                            ? { backgroundColor: primaryColor }
                            : undefined
                        }
                      >
                        {block.data.buttonText}
                        {block.data.buttonNewTab && <ExternalLink className="w-4 h-4" />}
                      </a>
                    </div>
                  )}

                  {/* Audio */}
                  {block.type === 'audio' && block.data?.audioUrl && (
                    <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
                      <Volume2 className="w-5 h-5 text-gray-500 flex-shrink-0" />
                      <audio controls className="w-full" preload="metadata">
                        <source src={block.data.audioUrl} />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}

                  {/* Embed */}
                  {block.type === 'embed' && block.data?.embedUrl && (
                    <div
                      className="rounded-xl overflow-hidden shadow-lg border"
                      style={{ height: block.data.embedHeight || 400 }}
                    >
                      <iframe
                        src={block.data.embedUrl}
                        className="w-full h-full"
                        allowFullScreen
                        title="Embedded content"
                        sandbox="allow-scripts allow-same-origin allow-popups"
                      />
                    </div>
                  )}

                  {/* Gallery */}
                  {block.type === 'gallery' && block.data?.galleryImages && (
                    <div
                      className="grid gap-3"
                      style={{ gridTemplateColumns: `repeat(${block.data.galleryColumns || 3}, minmax(0, 1fr))` }}
                    >
                      {block.data.galleryImages.map(img => (
                        <div
                          key={img.id}
                          className="cursor-pointer group overflow-hidden rounded-lg border hover:shadow-lg transition-shadow"
                          onClick={() => setGalleryLightbox({ blockId: block.id, imageUrl: img.url })}
                        >
                          <img
                            src={img.url}
                            alt={img.alt || ''}
                            className="w-full h-40 object-cover group-hover:scale-105 transition-transform"
                          />
                          {img.caption && (
                            <p className="text-xs text-gray-500 px-2 py-1.5 bg-white">{img.caption}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Labeled Graphic */}
                  {block.type === 'labeled-graphic' && block.data?.labeledImage && (
                    <div className="relative inline-block w-full">
                      <img
                        src={block.data.labeledImage}
                        alt="Labeled graphic"
                        className="w-full rounded-xl"
                      />
                      {block.data.labeledMarkers?.map((marker, idx) => (
                        <div
                          key={marker.id}
                          className="absolute"
                          style={{ left: `${marker.x}%`, top: `${marker.y}%`, transform: 'translate(-50%, -50%)' }}
                        >
                          <button
                            className="w-6 h-6 rounded-full text-white text-xs font-bold shadow-lg hover:scale-125 transition-transform focus:outline-none border-2 border-white"
                            style={{ backgroundColor: marker.color || '#6366f1' }}
                            onClick={(e) => { e.stopPropagation(); setActiveTooltip(activeTooltip === marker.id ? null : marker.id); }}
                            onMouseEnter={() => setActiveTooltip(marker.id)}
                            onMouseLeave={() => setActiveTooltip(null)}
                          >
                            {idx + 1}
                          </button>
                          {activeTooltip === marker.id && (
                            <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl pointer-events-none">
                              <p className="font-bold mb-1">{marker.label}</p>
                              <p>{marker.description}</p>
                              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                );
              })}
            </div>

            {/* Quiz questions */}
            {currentSlide.questions.length > 0 && (
              <div className="mt-8 space-y-6">
                {currentSlide.questions.map((question, qIdx) => {
                  const isSubmitted = submittedQuizzes.has(question.id);
                  const correct = isCorrect(question);

                  return (
                    <div key={question.id} className="bg-white rounded-xl p-6 shadow-sm border">
                      <div className="flex items-start gap-3 mb-4">
                        <span className="flex items-center justify-center w-7 h-7 rounded-full text-white text-sm font-bold flex-shrink-0"
                          style={{ backgroundColor: primaryColor }}>
                          {qIdx + 1}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">{question.text}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{question.points} points</p>
                        </div>
                      </div>

                      {/* Multiple choice */}
                      {(question.type === 'multiple-choice' || question.type === 'true-false') && (
                        <div className="space-y-2 ml-10">
                          {question.options.map(option => {
                            const isSelected = quizAnswers[question.id] === option.id;
                            let optionClass = 'border-gray-200 hover:border-gray-300';
                            if (isSubmitted) {
                              if (option.isCorrect) optionClass = 'border-emerald-500 bg-emerald-50';
                              else if (isSelected && !option.isCorrect) optionClass = 'border-red-500 bg-red-50';
                            } else if (isSelected) {
                              optionClass = 'border-brand-500 bg-brand-50';
                            }

                            return (
                              <button
                                key={option.id}
                                onClick={() => !isSubmitted && handleAnswer(question.id, option.id)}
                                disabled={isSubmitted}
                                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all text-sm ${optionClass}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                    isSelected ? 'border-brand-500' : 'border-gray-300'
                                  }`}>
                                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-brand-500" />}
                                  </div>
                                  <span>{option.text}</span>
                                  {isSubmitted && option.isCorrect && (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />
                                  )}
                                  {isSubmitted && isSelected && !option.isCorrect && (
                                    <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Fill in blank */}
                      {question.type === 'fill-in-blank' && (
                        <div className="ml-10">
                          <input
                            type="text"
                            className={`input ${
                              isSubmitted
                                ? correct
                                  ? 'border-emerald-500 bg-emerald-50'
                                  : 'border-red-500 bg-red-50'
                                : ''
                            }`}
                            placeholder="Type your answer..."
                            value={quizAnswers[question.id] || ''}
                            onChange={e => handleAnswer(question.id, e.target.value)}
                            disabled={isSubmitted}
                          />
                          {isSubmitted && !correct && (
                            <p className="text-sm text-emerald-600 mt-1">
                              Correct answer: {question.correctAnswer}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Matching */}
                      {question.type === 'matching' && (
                        <div className="ml-10 space-y-2">
                          {question.matchingPairs.map(pair => (
                            <div key={pair.id} className="flex items-center gap-3">
                              <span className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium min-w-[120px]">
                                {pair.left}
                              </span>
                              <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="px-3 py-2 bg-brand-50 rounded-lg text-sm min-w-[120px]" style={{ borderColor: primaryColor }}>
                                {pair.right}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Drag-sort (preview: show as numbered list in correct order) */}
                      {question.type === 'drag-sort' && (
                        <div className="ml-10 space-y-2">
                          <p className="text-xs text-gray-500 mb-2 italic">
                            Put the items in the correct order (drag-and-drop in live mode):
                          </p>
                          {(question.correctOrder.length > 0
                            ? question.correctOrder.map(optId => question.options.find(o => o.id === optId)).filter(Boolean)
                            : question.options
                          ).map((option, idx) => (
                            <div
                              key={option!.id}
                              className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200"
                            >
                              <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span
                                className="flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold flex-shrink-0"
                                style={{ backgroundColor: primaryColor }}
                              >
                                {idx + 1}
                              </span>
                              <span className="text-sm text-gray-700">{option!.text}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Likert scale */}
                      {question.type === 'likert' && (
                        <div className="ml-10">
                          <div className="flex items-center gap-2 flex-wrap">
                            {(question.likertLabels || ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']).map((label, idx) => {
                              const isSelected = quizAnswers[question.id] === String(idx);
                              const isCorrectChoice = isSubmitted && question.likertCorrectIndex === idx;
                              const isWrongChoice = isSubmitted && isSelected && question.likertCorrectIndex !== idx;
                              let btnClass = 'border-gray-200 hover:border-gray-300 bg-white';
                              if (isSubmitted) {
                                if (isCorrectChoice) btnClass = 'border-emerald-500 bg-emerald-50';
                                else if (isWrongChoice) btnClass = 'border-red-500 bg-red-50';
                              } else if (isSelected) {
                                btnClass = 'border-2 bg-opacity-10';
                              }
                              return (
                                <button
                                  key={idx}
                                  onClick={() => !isSubmitted && handleAnswer(question.id, String(idx))}
                                  disabled={isSubmitted}
                                  className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${btnClass}`}
                                  style={isSelected && !isSubmitted ? { borderColor: primaryColor, backgroundColor: `${primaryColor}15` } : undefined}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Rating */}
                      {question.type === 'rating' && (() => {
                        const max = question.ratingMax || 5;
                        const selected = quizAnswers[question.id] ? Number(quizAnswers[question.id]) : 0;
                        const style = question.ratingStyle || 'stars';
                        const emojis = ['😞', '😕', '😐', '🙂', '😄', '🤩', '🥳', '😎', '🤗', '🌟'];
                        return (
                          <div className="ml-10">
                            <div className="flex items-center gap-2 flex-wrap">
                              {Array.from({ length: max }, (_, i) => i + 1).map(val => {
                                const isActive = val <= selected;
                                if (style === 'stars') {
                                  return (
                                    <button
                                      key={val}
                                      onClick={() => !isSubmitted && handleAnswer(question.id, String(val))}
                                      disabled={isSubmitted}
                                      className="transition-transform hover:scale-110"
                                    >
                                      <Star
                                        className="w-8 h-8"
                                        fill={isActive ? (primaryColor) : 'none'}
                                        stroke={isActive ? primaryColor : '#d1d5db'}
                                        strokeWidth={1.5}
                                      />
                                    </button>
                                  );
                                }
                                if (style === 'emoji') {
                                  return (
                                    <button
                                      key={val}
                                      onClick={() => !isSubmitted && handleAnswer(question.id, String(val))}
                                      disabled={isSubmitted}
                                      className={`text-2xl p-1 rounded-lg border-2 transition-all ${
                                        val === selected ? 'border-current scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                                      }`}
                                      style={val === selected ? { borderColor: primaryColor } : undefined}
                                    >
                                      {emojis[val - 1] || '⭐'}
                                    </button>
                                  );
                                }
                                // numbers
                                return (
                                  <button
                                    key={val}
                                    onClick={() => !isSubmitted && handleAnswer(question.id, String(val))}
                                    disabled={isSubmitted}
                                    className={`w-10 h-10 rounded-lg border-2 text-sm font-bold transition-all ${
                                      val === selected
                                        ? 'text-white'
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                    }`}
                                    style={val === selected ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}
                                  >
                                    {val}
                                  </button>
                                );
                              })}
                            </div>
                            {isSubmitted && question.ratingCorrect !== undefined && (
                              <p className={`text-sm mt-2 ${selected >= question.ratingCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                                {selected >= question.ratingCorrect
                                  ? 'Your rating meets the threshold.'
                                  : `Minimum required: ${question.ratingCorrect}`}
                              </p>
                            )}
                          </div>
                        );
                      })()}

                      {/* Slider */}
                      {question.type === 'slider' && (() => {
                        const min = question.sliderMin ?? 0;
                        const max = question.sliderMax ?? 100;
                        const step = question.sliderStep ?? 1;
                        const unit = question.sliderUnit || '';
                        const currentVal = quizAnswers[question.id] !== undefined ? Number(quizAnswers[question.id]) : min;
                        return (
                          <div className="ml-10">
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-gray-400 w-10 text-right">{min}</span>
                              <input
                                type="range"
                                min={min}
                                max={max}
                                step={step}
                                value={currentVal}
                                onChange={e => !isSubmitted && handleAnswer(question.id, e.target.value)}
                                disabled={isSubmitted}
                                className="flex-1 accent-brand-500 h-2"
                                style={{ accentColor: primaryColor }}
                              />
                              <span className="text-xs text-gray-400 w-10">{max}</span>
                            </div>
                            <div className="text-center mt-2">
                              <span className="inline-block px-3 py-1 rounded-full text-sm font-bold text-white" style={{ backgroundColor: primaryColor }}>
                                {currentVal}{unit ? ` ${unit}` : ''}
                              </span>
                            </div>
                            {isSubmitted && question.sliderCorrect !== undefined && (
                              <p className={`text-sm mt-2 text-center ${currentVal >= question.sliderCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                                {currentVal >= question.sliderCorrect
                                  ? 'Correct!'
                                  : `Expected at least ${question.sliderCorrect}${unit ? ` ${unit}` : ''}`}
                              </p>
                            )}
                          </div>
                        );
                      })()}

                      {/* Image choice */}
                      {question.type === 'image-choice' && (
                        <div
                          className="ml-10 grid gap-3"
                          style={{ gridTemplateColumns: `repeat(${question.imageChoiceColumns || 2}, minmax(0, 1fr))` }}
                        >
                          {question.options.map(option => {
                            const isSelected = quizAnswers[question.id] === option.id;
                            let cardClass = 'border-gray-200 hover:border-gray-300';
                            if (isSubmitted) {
                              if (option.isCorrect) cardClass = 'border-emerald-500 ring-2 ring-emerald-200';
                              else if (isSelected && !option.isCorrect) cardClass = 'border-red-500 ring-2 ring-red-200';
                            } else if (isSelected) {
                              cardClass = 'ring-2';
                            }
                            return (
                              <button
                                key={option.id}
                                onClick={() => !isSubmitted && handleAnswer(question.id, option.id)}
                                disabled={isSubmitted}
                                className={`rounded-xl border-2 overflow-hidden transition-all text-left ${cardClass}`}
                                style={isSelected && !isSubmitted ? { borderColor: primaryColor } : undefined}
                              >
                                {option.imageUrl && (
                                  <img src={option.imageUrl} alt={option.text} className="w-full h-32 object-cover" />
                                )}
                                <div className="p-3 flex items-center gap-2">
                                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                    isSelected ? '' : 'border-gray-300'
                                  }`} style={isSelected ? { borderColor: primaryColor } : undefined}>
                                    {isSelected && (
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                                    )}
                                  </div>
                                  <span className="text-sm font-medium text-gray-700">{option.text}</span>
                                  {isSubmitted && option.isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />}
                                  {isSubmitted && isSelected && !option.isCorrect && <XCircle className="w-4 h-4 text-red-500 ml-auto" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Matrix */}
                      {question.type === 'matrix' && (() => {
                        const columns = question.matrixColumns || [];
                        const rows = question.matrixRows || [];
                        let selections: Record<string, number> = {};
                        try { selections = quizAnswers[question.id] ? JSON.parse(quizAnswers[question.id] ?? '{}') : {}; } catch { /* empty */ }
                        const updateMatrix = (rowId: string, colIdx: number) => {
                          const next = { ...selections, [rowId]: colIdx };
                          handleAnswer(question.id, JSON.stringify(next));
                        };
                        return (
                          <div className="ml-10 overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                              <thead>
                                <tr>
                                  <th className="text-left p-2 border-b border-gray-200" />
                                  {columns.map((col, ci) => (
                                    <th key={ci} className="text-center p-2 border-b border-gray-200 font-medium text-gray-600 min-w-[80px]">
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map(row => {
                                  const selectedCol = selections[row.id];
                                  return (
                                    <tr key={row.id} className="border-b border-gray-100">
                                      <td className="p-2 font-medium text-gray-700">{row.label}</td>
                                      {columns.map((_, ci) => {
                                        const isSel = selectedCol === ci;
                                        const isRowCorrect = isSubmitted && question.matrixGraded && row.correctColumn === ci;
                                        const isRowWrong = isSubmitted && question.matrixGraded && isSel && row.correctColumn !== ci;
                                        return (
                                          <td key={ci} className="text-center p-2">
                                            <button
                                              onClick={() => !isSubmitted && updateMatrix(row.id, ci)}
                                              disabled={isSubmitted}
                                              className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center transition-all ${
                                                isRowCorrect ? 'border-emerald-500' : isRowWrong ? 'border-red-500' : isSel ? '' : 'border-gray-300'
                                              }`}
                                              style={isSel && !isSubmitted ? { borderColor: primaryColor } : undefined}
                                            >
                                              {isSel && (
                                                <div
                                                  className="w-2.5 h-2.5 rounded-full"
                                                  style={{ backgroundColor: isSubmitted ? (isRowWrong ? '#ef4444' : isRowCorrect ? '#10b981' : primaryColor) : primaryColor }}
                                                />
                                              )}
                                              {isRowCorrect && !isSel && (
                                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                              )}
                                            </button>
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}

                      {/* Dropdown */}
                      {question.type === 'dropdown' && (
                        <div className="ml-10">
                          <select
                            value={quizAnswers[question.id] || ''}
                            onChange={e => handleAnswer(question.id, e.target.value)}
                            disabled={isSubmitted}
                            className={`input w-full max-w-xs ${
                              isSubmitted
                                ? correct ? 'border-emerald-500 bg-emerald-50' : 'border-red-500 bg-red-50'
                                : ''
                            }`}
                          >
                            <option value="">{question.dropdownPlaceholder || 'Select an answer...'}</option>
                            {question.options.map(option => (
                              <option key={option.id} value={option.id}>{option.text}</option>
                            ))}
                          </select>
                          {isSubmitted && !correct && (
                            <p className="text-sm text-emerald-600 mt-1">
                              Correct answer: {question.options.find(o => o.isCorrect)?.text}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Open-ended */}
                      {question.type === 'open-ended' && (() => {
                        const maxLen = question.openEndedMaxLength || 500;
                        const currentLen = (quizAnswers[question.id] || '').length;
                        const keywords = question.openEndedKeywords || [];
                        const matchedKeywords = isSubmitted && keywords.length > 0
                          ? keywords.filter(kw => (quizAnswers[question.id] || '').toLowerCase().includes(kw.toLowerCase()))
                          : [];
                        return (
                          <div className="ml-10">
                            <textarea
                              value={quizAnswers[question.id] || ''}
                              onChange={e => {
                                if (e.target.value.length <= maxLen) handleAnswer(question.id, e.target.value);
                              }}
                              disabled={isSubmitted}
                              placeholder={question.openEndedPlaceholder || 'Type your answer...'}
                              rows={4}
                              className={`input w-full resize-y ${
                                isSubmitted
                                  ? correct ? 'border-emerald-500 bg-emerald-50' : keywords.length > 0 ? 'border-red-500 bg-red-50' : 'border-emerald-500 bg-emerald-50'
                                  : ''
                              }`}
                            />
                            <div className="flex items-center justify-between mt-1">
                              <span className={`text-xs ${currentLen >= maxLen ? 'text-red-500' : 'text-gray-400'}`}>
                                {currentLen} / {maxLen}
                              </span>
                              {isSubmitted && keywords.length > 0 && (
                                <span className="text-xs text-gray-500">
                                  Keywords matched: {matchedKeywords.length} / {keywords.length}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Ranking */}
                      {question.type === 'ranking' && (() => {
                        let currentOrder: string[];
                        try {
                          currentOrder = quizAnswers[question.id] ? JSON.parse(quizAnswers[question.id] ?? '[]') : question.options.map(o => o.id);
                        } catch { currentOrder = question.options.map(o => o.id); }
                        // Ensure we have an answer stored
                        if (!quizAnswers[question.id]) {
                          // Initialize with default order on first render
                          setTimeout(() => handleAnswer(question.id, JSON.stringify(currentOrder)), 0);
                        }
                        const moveItem = (idx: number, direction: -1 | 1) => {
                          if (isSubmitted) return;
                          const newIdx = idx + direction;
                          if (newIdx < 0 || newIdx >= currentOrder.length) return;
                          const next = [...currentOrder];
                          [next[idx], next[newIdx]] = [next[newIdx]!, next[idx]!];
                          handleAnswer(question.id, JSON.stringify(next));
                        };
                        return (
                          <div className="ml-10 space-y-2">
                            <p className="text-xs text-gray-500 mb-2 italic">
                              Use the arrows to rank items in the correct order:
                            </p>
                            {currentOrder.map((optId, idx) => {
                              const option = question.options.find(o => o.id === optId);
                              if (!option) return null;
                              const isCorrectPos = isSubmitted && question.correctOrder[idx] === optId;
                              const isWrongPos = isSubmitted && question.correctOrder[idx] !== optId;
                              return (
                                <div
                                  key={optId}
                                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
                                    isCorrectPos ? 'border-emerald-500 bg-emerald-50' : isWrongPos ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50'
                                  }`}
                                >
                                  <span
                                    className="flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold flex-shrink-0"
                                    style={{ backgroundColor: primaryColor }}
                                  >
                                    {idx + 1}
                                  </span>
                                  <span className="text-sm text-gray-700 flex-1">{option.text}</span>
                                  {!isSubmitted && (
                                    <div className="flex flex-col gap-0.5">
                                      <button
                                        onClick={() => moveItem(idx, -1)}
                                        disabled={idx === 0}
                                        className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                      >
                                        <ChevronUp className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => moveItem(idx, 1)}
                                        disabled={idx === currentOrder.length - 1}
                                        className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                      >
                                        <ChevronDown className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )}
                                  {isSubmitted && isCorrectPos && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                  {isSubmitted && isWrongPos && <XCircle className="w-4 h-4 text-red-500" />}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {/* Hotspot question */}
                      {question.type === 'hotspot-question' && (() => {
                        let clickPos: { x: number; y: number } | null = null;
                        try { clickPos = quizAnswers[question.id] ? JSON.parse(quizAnswers[question.id] ?? 'null') : null; } catch { /* empty */ }
                        const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
                          if (isSubmitted) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = ((e.clientX - rect.left) / rect.width) * 100;
                          const y = ((e.clientY - rect.top) / rect.height) * 100;
                          handleAnswer(question.id, JSON.stringify({ x, y }));
                        };
                        return (
                          <div className="ml-10">
                            <p className="text-xs text-gray-500 mb-2 italic">
                              Click on the correct area of the image:
                            </p>
                            <div
                              className="relative inline-block cursor-crosshair rounded-lg overflow-hidden border border-gray-200"
                              onClick={handleImageClick}
                            >
                              {question.hotspotImage ? (
                                <img src={question.hotspotImage} alt="Hotspot" className="max-w-full h-auto block" />
                              ) : (
                                <div className="w-full h-64 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                                  No image set
                                </div>
                              )}
                              {/* Show click marker */}
                              {clickPos && (
                                <div
                                  className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-3 border-white shadow-lg flex items-center justify-center"
                                  style={{
                                    left: `${clickPos.x}%`,
                                    top: `${clickPos.y}%`,
                                    backgroundColor: primaryColor,
                                    borderWidth: '3px',
                                  }}
                                >
                                  <MapPin className="w-3 h-3 text-white" />
                                </div>
                              )}
                              {/* Show zones after submission */}
                              {isSubmitted && (question.hotspotZones || []).map(zone => (
                                <div
                                  key={zone.id}
                                  className={`absolute rounded-full border-2 ${
                                    zone.isCorrect ? 'border-emerald-500 bg-emerald-500/20' : 'border-gray-400 bg-gray-400/10'
                                  }`}
                                  style={{
                                    left: `${zone.x - zone.radius}%`,
                                    top: `${zone.y - zone.radius}%`,
                                    width: `${zone.radius * 2}%`,
                                    height: `${zone.radius * 2}%`,
                                  }}
                                  title={zone.label}
                                />
                              ))}
                            </div>
                            {isSubmitted && (
                              <p className={`text-sm mt-2 ${correct ? 'text-emerald-600' : 'text-red-600'}`}>
                                {correct ? 'You clicked the correct zone!' : 'Incorrect area. The correct zones are highlighted above.'}
                              </p>
                            )}
                          </div>
                        );
                      })()}

                      {/* Submit / Feedback */}
                      <div className="ml-10 mt-4">
                        {!isSubmitted && quizAnswers[question.id] && (
                          <button
                            onClick={() => handleSubmitQuiz(question.id)}
                            className="btn-primary text-sm"
                          >
                            Check Answer
                          </button>
                        )}
                        {isSubmitted && course.settings.showFeedback && question.explanation && (
                          <div className={`mt-3 p-3 rounded-lg text-sm ${
                            correct ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            <p className="font-medium mb-0.5">{correct ? 'Correct!' : 'Incorrect'}</p>
                            <p>{question.explanation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          )}
          </div>

          {/* Inline navigation buttons */}
          <div className="flex items-center justify-between px-10 py-6 border-t border-gray-100">
            <button
              onClick={goPrev}
              disabled={previewSlideIndex === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <button
              onClick={goNext}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
              style={{ backgroundColor: primaryColor }}
            >
              {isLastSlide ? 'Finish' : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Gallery lightbox overlay */}
      {galleryLightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
          onClick={() => setGalleryLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            onClick={() => setGalleryLightbox(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={galleryLightbox.imageUrl}
            alt="Gallery preview"
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

    </div>
  );
}
