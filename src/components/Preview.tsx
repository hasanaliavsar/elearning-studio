import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useStore } from '../store';
import type { Slide, Question, Course, ContentBlock, EntranceAnimation, SlideTransition } from '../types';
import {
  ArrowLeft, ArrowRight, X, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Award, RotateCcw, Home,
  ChevronDown, ChevronUp, Info, AlertTriangle, Lightbulb, CheckCircle,
  ExternalLink, Volume2, VolumeX, GripVertical, Download, Star, MapPin,
  PanelLeftClose, PanelLeftOpen, FileText, Trophy, Circle
} from 'lucide-react';
import { CourseLandingPage } from './CourseLandingPage';
import { GamificationBar } from './Gamification';

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

  // Scenario state: current step index per block
  const [scenarioCurrentStep, setScenarioCurrentStep] = useState<Record<string, number>>({});
  const [scenarioFeedback, setScenarioFeedback] = useState<Record<string, string | null>>({});

  // Checklist state: checked item IDs per block
  const [checkedItems, setCheckedItems] = useState<Record<string, Set<string>>>({});

  // Card sorting state: card assignments per block (cardId -> category)
  const [cardAssignments, setCardAssignments] = useState<Record<string, Record<string, string>>>({});
  const [cardSortChecked, setCardSortChecked] = useState<Record<string, 'correct' | 'incorrect' | null>>({});

  // Text-to-speech narration state
  const [isNarrating, setIsNarrating] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

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

  // Extract plain text from a slide for TTS narration
  const extractSlideText = useCallback((slide: Slide): string => {
    const parts: string[] = [];
    if (slide.title) parts.push(slide.title);
    if (slide.learningObjectives && slide.learningObjectives.length > 0) {
      parts.push('Learning objectives.');
      slide.learningObjectives.forEach(obj => {
        if (obj.text) parts.push(obj.text);
      });
    }
    slide.content.forEach(block => {
      if (block.content) {
        // Strip HTML tags to get plain text
        const text = block.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        if (text) parts.push(text);
      }
    });
    slide.questions.forEach(q => {
      if (q.text) parts.push(q.text);
    });
    return parts.join('. ');
  }, []);

  const stopNarration = useCallback(() => {
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setIsNarrating(false);
  }, []);

  const startNarration = useCallback((slide: Slide, lang: string) => {
    window.speechSynthesis.cancel();
    const text = extractSlideText(slide);
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.lang = lang || 'en';
    utterance.onend = () => setIsNarrating(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsNarrating(true);
  }, [extractSlideText]);

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
    if (question.type === 'matching') {
      try {
        const selections = JSON.parse(answer) as Record<string, string>;
        return question.matchingPairs.every(pair => selections[pair.id] === pair.right);
      } catch { return false; }
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

  // Gamification stats
  const correctAnswerCount = useMemo(() => {
    return allQuestions.filter(q => submittedQuizzes.has(q.id) && isCorrect(q)).length;
  }, [submittedQuizzes.size]);

  const handleClose = () => {
    stopNarration();
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

  // Auto-narrate on slide change (if narration was active)
  useEffect(() => {
    if (isNarrating && currentSlide) {
      startNarration(currentSlide, course.language || 'en');
    }
  }, [previewSlideIndex]);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

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

  const primaryColor = course.settings.primaryColor || '#171D97';

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

          {/* Completion Certificate — Moonfare premium (sketch #6) */}
          {course.settings.showCertificate && passed && (() => {
            // Bindings (preserved from original): course.title is the program,
            // date is today, certificateOrg doubles as the recipient name when set.
            const recipientName = course.settings.certificateOrg || 'Course Participant';
            const programTitle = course.title;
            const issuedDate = new Date();
            const dateStr = issuedDate.toLocaleDateString('en-GB', {
              day: 'numeric', month: 'long', year: 'numeric'
            });
            // Stable certificate number derived from course id + year
            const courseKey = (course.id || course.title || 'course');
            let h = 0;
            for (let i = 0; i < courseKey.length; i++) {
              h = ((h << 5) - h + courseKey.charCodeAt(i)) | 0;
            }
            const certificateNo = `MF-${issuedDate.getFullYear()}-${String(Math.abs(h) % 99999).padStart(5, '0')}`;
            const eyebrow = (course.settings.certificateTitle || 'Certificate of Completion').toUpperCase();

            return (
              <div className="mt-8 w-full flex flex-col items-center">
                <div
                  style={{
                    width: 760, height: 540, background: '#FFFFFF', position: 'relative',
                    boxShadow: '0 20px 60px -20px rgba(16,18,88,0.25), 0 0 0 1px rgba(16,18,88,0.06)',
                    overflow: 'hidden', fontFamily: "'Inter', system-ui, sans-serif", color: '#1A1A1F',
                  }}
                >
                  {/* Sand + ivory double frame */}
                  <div style={{ position: 'absolute', inset: 16, border: '1px solid #D4A574', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', inset: 22, border: '1px solid #E8E5DE', pointerEvents: 'none' }} />

                  {/* Watermark monogram, bottom-right */}
                  <img
                    src={`${import.meta.env.BASE_URL}moonfare-monogram-blue.png`}
                    alt=""
                    aria-hidden="true"
                    style={{ position: 'absolute', right: 40, bottom: 40, height: 200, opacity: 0.04 }}
                  />

                  <div style={{ position: 'absolute', inset: 60, display: 'flex', flexDirection: 'column' }}>
                    {/* Header: wordmark · cert number */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <img src={`${import.meta.env.BASE_URL}moonfare-wordmark-blue.png`} alt="Moonfare" style={{ height: 22 }} />
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 9, letterSpacing: '0.15em', color: '#5C5A57', fontWeight: 600 }}>
                          CERTIFICATE NO.
                        </div>
                        <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 14, color: '#0A0C3F', marginTop: 2 }}>
                          {certificateNo}
                        </div>
                      </div>
                    </div>

                    {/* Center stack */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, letterSpacing: '0.2em', color: '#D4A574', fontWeight: 600 }}>
                        {eyebrow}
                      </div>
                      <div style={{ marginTop: 24, fontSize: 13, color: '#5C5A57' }}>This is to certify that</div>
                      <div style={{
                        fontFamily: "'Fraunces', Georgia, serif",
                        fontSize: 44, fontWeight: 400, color: '#0A0C3F',
                        margin: '12px 0', letterSpacing: '-0.01em', fontStyle: 'italic',
                        textWrap: 'balance' as any,
                      }}>
                        {recipientName}
                      </div>
                      <div style={{ fontSize: 13, color: '#5C5A57', lineHeight: 1.6, maxWidth: 480, alignSelf: 'center' }}>
                        has successfully completed the Moonfare program
                      </div>
                      <div style={{
                        fontFamily: "'Fraunces', Georgia, serif",
                        fontSize: 22, color: '#171D97', fontWeight: 500, marginTop: 8,
                        textWrap: 'balance' as any,
                      }}>
                        {programTitle}
                      </div>
                    </div>

                    {/* Footer: signatory · monogram seal · date */}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                      borderTop: '1px solid #E8E5DE', paddingTop: 16,
                    }}>
                      <div>
                        <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 18, color: '#0A0C3F', fontStyle: 'italic' }}>
                          Steffen Pauls
                        </div>
                        <div style={{ fontSize: 9, color: '#5C5A57', letterSpacing: '0.08em', marginTop: 2 }}>
                          CO-FOUNDER &amp; CEO
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{
                          width: 56, height: 56, borderRadius: '50%', border: '2px solid #D4A574',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
                        }}>
                          <img src={`${import.meta.env.BASE_URL}moonfare-monogram-blue.png`} alt="" style={{ height: 28 }} />
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, color: '#0A0C3F' }}>
                          {dateStr}
                        </div>
                        <div style={{ fontSize: 9, color: '#5C5A57', letterSpacing: '0.08em', marginTop: 2 }}>
                          ISSUED · BERLIN
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => window.print()}
                  className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-colors"
                  style={{ background: '#171D97', color: '#fff' }}
                >
                  <Download className="w-4 h-4" />
                  Download Certificate
                </button>
              </div>
            );
          })()}
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

        /* Narration pulse animation */
        @keyframes narration-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        .narration-pulse { animation: narration-pulse 1.5s ease-in-out infinite; }
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
          <button
            onClick={() => {
              if (isNarrating) {
                stopNarration();
              } else {
                startNarration(currentSlide, course.language || 'en');
              }
            }}
            className={`p-1.5 rounded-lg transition-colors ${
              isNarrating
                ? 'text-white narration-pulse'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
            style={isNarrating ? { backgroundColor: primaryColor } : undefined}
            title={isNarrating ? 'Stop narration' : 'Read aloud'}
          >
            {isNarrating ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
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

              {/* Gamification bar */}
              {course.settings.enableGamification && (
              <div className="border-t border-gray-100 px-4 py-3">
                <GamificationBar
                  totalSlides={flatSlides.length}
                  visitedSlides={visitedSlides.size}
                  correctAnswers={correctAnswerCount}
                  totalQuestions={allQuestions.length}
                  currentStreak={0}
                  primaryColor={primaryColor}
                />
              </div>
              )}

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
                backgroundColor: currentSlide.backgroundColor || '#171D97',
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
              <div className="mb-6 rounded-md p-5" style={{ backgroundColor: '#FAF8F4', borderLeft: '3px solid #171D97' }}>
                <h3 className="text-[11px] font-semibold uppercase mb-3 flex items-center gap-2" style={{ color: '#171D97', letterSpacing: '0.12em' }}>
                  <Lightbulb className="w-4 h-4" />
                  Learning Objectives
                </h3>
                <ul className="space-y-1.5">
                  {currentSlide.learningObjectives.map((obj) => (
                    <li key={obj.id} className="flex items-start gap-2 text-sm" style={{ color: '#1A1A1F' }}>
                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#171D97' }} />
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
                  currentSlide.backgroundColor === '#0f172a' || currentSlide.backgroundColor === '#1e293b' || currentSlide.backgroundColor === '#171D97' || currentSlide.backgroundColor === '#0A0C3F' || currentSlide.backgroundColor === '#101258'
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
                      className={`prose prose-lg max-w-none [&>h1]:font-display [&>h1]:font-normal [&>h1]:tracking-[-0.02em] [&>h1]:text-[44px] [&>h1]:leading-[1.08] [&>h2]:font-display [&>h2]:font-normal [&>h2]:tracking-[-0.01em] [&>h3]:font-display [&>h3]:font-medium ${
                        currentSlide.backgroundColor === '#0f172a' || currentSlide.backgroundColor === '#1e293b' || currentSlide.backgroundColor === '#171D97' || currentSlide.backgroundColor === '#0A0C3F' || currentSlide.backgroundColor === '#101258'
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
                                className="absolute inset-0 rounded-xl border-2 border-brand-400 bg-brand-50 shadow-md flex flex-col items-center justify-center p-4 text-center"
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
                            className="w-6 h-6 rounded-full bg-brand-600 border-2 border-white shadow-lg text-white text-xs font-bold hover:scale-125 transition-transform focus:outline-none"
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
                                  ? 'border-brand-600 text-brand-600 bg-white'
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
                              className="absolute -left-5 top-1 w-4 h-4 rounded-full border-2 border-brand-600 bg-white z-10"
                              style={{ left: '-1.25rem' }}
                            />
                            <div className="bg-white rounded-lg border p-4 shadow-sm ml-2">
                              {event.date && (
                                <span className="text-xs font-semibold text-brand-600 uppercase tracking-wide">
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

                  {/* Pull Quote */}
                  {block.type === 'pull-quote' && (() => {
                    const d = block.data || {};
                    const mode = d.pqAvatarMode || 'auto';
                    const name = d.pqName || '';
                    const deriveInit = (n: string) => {
                      if (!n) return '?';
                      const parts = n.trim().split(/\s+/).filter(Boolean);
                      if (parts.length === 0) return '?';
                      if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
                      return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
                    };
                    const initials =
                      mode === 'initials' && d.pqInitialsOverride
                        ? d.pqInitialsOverride.slice(0, 3).toUpperCase()
                        : deriveInit(name);
                    const useImage = mode === 'image' && d.pqPortraitUrl;
                    return (
                      <div
                        className="relative rounded-md p-8 md:p-12"
                        style={{ backgroundColor: '#FAF8F4' }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 32,
                            bottom: 32,
                            width: 3,
                            backgroundColor: '#171D97',
                          }}
                        />
                        <div className="grid gap-6 md:gap-8" style={{ gridTemplateColumns: 'auto 1fr', alignItems: 'start' }}>
                          {useImage ? (
                            <img
                              src={d.pqPortraitUrl}
                              alt={name}
                              className="rounded-full object-cover flex-shrink-0"
                              style={{ width: 96, height: 96, boxShadow: '0 6px 18px rgba(10,12,63,0.18)' }}
                            />
                          ) : (
                            <div
                              className="rounded-full flex items-center justify-center flex-shrink-0"
                              style={{
                                width: 96,
                                height: 96,
                                background: 'linear-gradient(135deg, #171D97 0%, #0A0C3F 100%)',
                                color: '#D4A574',
                                fontFamily: "'Fraunces', Georgia, serif",
                                fontSize: 34,
                                fontWeight: 500,
                                letterSpacing: '-0.02em',
                                boxShadow: '0 6px 18px rgba(10,12,63,0.18)',
                              }}
                            >
                              {initials}
                            </div>
                          )}
                          <div>
                            <div
                              style={{
                                fontFamily: "'Fraunces', Georgia, serif",
                                fontSize: 64,
                                lineHeight: 0.5,
                                color: '#D4A574',
                                marginBottom: 6,
                              }}
                            >
                              &ldquo;
                            </div>
                            <p
                              className="m-0"
                              style={{
                                fontFamily: "'Fraunces', Georgia, serif",
                                fontSize: 22,
                                lineHeight: 1.4,
                                color: '#0A0C3F',
                                fontWeight: 300,
                                letterSpacing: '-0.005em',
                                textWrap: 'pretty',
                                marginBottom: 22,
                              }}
                            >
                              {d.pqQuote || 'Your quotation will appear here.'}
                            </p>
                            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                              <div style={{ fontWeight: 600, color: '#0A0C3F', fontSize: 14 }}>{name || 'Name'}</div>
                              <div style={{ color: '#5C5A57', marginTop: 2, fontSize: 12 }}>
                                {d.pqRole}
                                {d.pqRole && d.pqOrg && ' · '}
                                {d.pqOrg && <b style={{ color: '#171D97', fontWeight: 600 }}>{d.pqOrg}</b>}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Comparison */}
                  {block.type === 'comparison' && block.data?.cmpColumns && block.data.cmpColumns.length > 0 && (() => {
                    const d = block.data;
                    const cols = d.cmpColumns!;
                    return (
                      <div className="rounded-md overflow-hidden border" style={{ borderColor: '#E8E5DE', backgroundColor: '#FFFFFF' }}>
                        {(d.cmpEyebrow || d.cmpTitle) && (
                          <div style={{ padding: '24px 28px 18px' }}>
                            {d.cmpEyebrow && (
                              <div
                                style={{
                                  fontSize: 11,
                                  letterSpacing: '0.14em',
                                  textTransform: 'uppercase',
                                  color: '#171D97',
                                  fontWeight: 700,
                                }}
                              >
                                {d.cmpEyebrow}
                              </div>
                            )}
                            {d.cmpTitle && (
                              <div
                                style={{
                                  fontFamily: "'Fraunces', Georgia, serif",
                                  fontWeight: 400,
                                  fontSize: 24,
                                  color: '#0A0C3F',
                                  letterSpacing: '-0.01em',
                                  marginTop: 6,
                                }}
                              >
                                {d.cmpTitle}
                              </div>
                            )}
                          </div>
                        )}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${cols.length}, 1fr)`,
                          }}
                        >
                          {cols.map((col, ci) => (
                            <div
                              key={col.id}
                              style={{
                                position: 'relative',
                                padding: '28px 22px',
                                borderLeft: ci === 0 ? '0' : '1px solid #E8E5DE',
                                background: col.featured
                                  ? 'linear-gradient(180deg, rgba(212,165,116,0.10) 0%, rgba(212,165,116,0.02) 100%)'
                                  : '#FFFFFF',
                              }}
                            >
                              {col.featured && (
                                <>
                                  <div
                                    style={{
                                      position: 'absolute',
                                      top: 0,
                                      left: -1,
                                      right: -1,
                                      height: 3,
                                      backgroundColor: '#D4A574',
                                    }}
                                  />
                                  {col.ribbonLabel && (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        top: -1,
                                        right: 18,
                                        backgroundColor: '#171D97',
                                        color: '#FFFFFF',
                                        fontSize: 9,
                                        letterSpacing: '0.14em',
                                        fontWeight: 700,
                                        padding: '5px 10px',
                                        borderRadius: '0 0 3px 3px',
                                      }}
                                    >
                                      {col.ribbonLabel.toUpperCase()}
                                    </div>
                                  )}
                                </>
                              )}
                              {col.eyebrow && (
                                <div
                                  style={{
                                    fontSize: 10,
                                    letterSpacing: '0.16em',
                                    textTransform: 'uppercase',
                                    color: col.featured ? '#171D97' : '#5C5A57',
                                    fontWeight: 600,
                                    marginBottom: 8,
                                  }}
                                >
                                  {col.eyebrow}
                                </div>
                              )}
                              {col.title && (
                                <h4
                                  style={{
                                    fontFamily: "'Fraunces', Georgia, serif",
                                    fontWeight: 400,
                                    fontSize: 24,
                                    color: '#0A0C3F',
                                    margin: '0 0 4px',
                                    letterSpacing: '-0.01em',
                                    lineHeight: 1,
                                  }}
                                >
                                  {col.title}
                                </h4>
                              )}
                              {col.subtitle && (
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: '#5C5A57',
                                    marginBottom: 16,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    letterSpacing: '0.02em',
                                  }}
                                >
                                  {col.subtitle}
                                </div>
                              )}
                              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {col.bullets.map((b) => (
                                  <li
                                    key={b.id}
                                    style={{
                                      display: 'flex',
                                      gap: 10,
                                      fontSize: 12.5,
                                      lineHeight: 1.45,
                                      color: b.included ? '#1A1A1F' : '#9A9893',
                                    }}
                                  >
                                    {b.included ? (
                                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 2, color: col.featured ? '#D4A574' : '#171D97' }}>
                                        <path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    ) : (
                                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 2, color: '#9A9893', opacity: 0.5 }}>
                                        <path d="M3.5 3.5l7 7m0-7l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                      </svg>
                                    )}
                                    <span>{b.text || <span style={{ opacity: 0.4 }}>Bullet text</span>}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

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
                              ? 'border-2 border-brand-600 text-brand-600 hover:bg-brand-50'
                              : block.data.buttonStyle === 'link'
                                ? 'text-brand-600 underline hover:text-brand-800'
                                : 'bg-brand-600 text-white hover:bg-brand-700'
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
                            style={{ backgroundColor: marker.color || '#171D97' }}
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

                  {/* Image Top Layout */}
                  {block.type === 'image-top' && (() => {
                    const img = block.data?.layoutImages?.[0];
                    return (
                      <div>
                        {img?.url ? (
                          <img src={img.url} alt={img.alt || ''} className="w-full rounded-xl object-cover" />
                        ) : (
                          <div className="w-full h-48 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm">No image</div>
                        )}
                        {img?.caption && <p className="text-xs text-gray-500 mt-1 text-center">{img.caption}</p>}
                        {block.data?.layoutText && (
                          <div className="mt-3 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{block.data.layoutText}</div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Image Bottom Layout */}
                  {block.type === 'image-bottom' && (() => {
                    const img = block.data?.layoutImages?.[0];
                    return (
                      <div>
                        {block.data?.layoutText && (
                          <div className="mb-3 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{block.data.layoutText}</div>
                        )}
                        {img?.url ? (
                          <img src={img.url} alt={img.alt || ''} className="w-full rounded-xl object-cover" />
                        ) : (
                          <div className="w-full h-48 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm">No image</div>
                        )}
                        {img?.caption && <p className="text-xs text-gray-500 mt-1 text-center">{img.caption}</p>}
                      </div>
                    );
                  })()}

                  {/* Image Left Layout */}
                  {block.type === 'image-left' && (() => {
                    const img = block.data?.layoutImages?.[0];
                    return (
                      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                        <div style={{ width: '40%', flexShrink: 0 }}>
                          {img?.url ? (
                            <img src={img.url} alt={img.alt || ''} className="w-full rounded-xl object-cover" />
                          ) : (
                            <div className="w-full h-48 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm">No image</div>
                          )}
                          {img?.caption && <p className="text-xs text-gray-500 mt-1 text-center">{img.caption}</p>}
                        </div>
                        <div style={{ width: '60%' }} className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                          {block.data?.layoutText || ''}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Image Right Layout */}
                  {block.type === 'image-right' && (() => {
                    const img = block.data?.layoutImages?.[0];
                    return (
                      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                        <div style={{ width: '60%' }} className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                          {block.data?.layoutText || ''}
                        </div>
                        <div style={{ width: '40%', flexShrink: 0 }}>
                          {img?.url ? (
                            <img src={img.url} alt={img.alt || ''} className="w-full rounded-xl object-cover" />
                          ) : (
                            <div className="w-full h-48 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm">No image</div>
                          )}
                          {img?.caption && <p className="text-xs text-gray-500 mt-1 text-center">{img.caption}</p>}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Two Images Layout */}
                  {block.type === 'two-images' && block.data?.layoutImages && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {block.data.layoutImages.slice(0, 2).map((img, idx) => (
                        <div key={idx}>
                          {img.url ? (
                            <img src={img.url} alt={img.alt || ''} className="w-full rounded-xl object-cover" />
                          ) : (
                            <div className="w-full h-48 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm">No image</div>
                          )}
                          {img.caption && <p className="text-xs text-gray-500 mt-1 text-center">{img.caption}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Three Images Layout */}
                  {block.type === 'three-images' && block.data?.layoutImages && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                      {block.data.layoutImages.slice(0, 3).map((img, idx) => (
                        <div key={idx}>
                          {img.url ? (
                            <img src={img.url} alt={img.alt || ''} className="w-full rounded-xl object-cover" />
                          ) : (
                            <div className="w-full h-48 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm">No image</div>
                          )}
                          {img.caption && <p className="text-xs text-gray-500 mt-1 text-center">{img.caption}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Scenario (branching decisions) */}
                  {block.type === 'scenario' && block.data?.scenarioSteps && block.data.scenarioSteps.length > 0 && (() => {
                    const steps = block.data!.scenarioSteps!;
                    const currentIdx = scenarioCurrentStep[block.id] ?? 0;
                    const step = steps[currentIdx];
                    if (!step) return null;

                    const feedback = scenarioFeedback[block.id] ?? null;

                    return (
                      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        {block.data!.scenarioTitle && (
                          <h3 className="text-lg font-bold text-gray-900 mb-1">{block.data!.scenarioTitle}</h3>
                        )}
                        {block.data!.scenarioDescription && currentIdx === 0 && (
                          <p className="text-sm text-gray-500 mb-3">{block.data!.scenarioDescription}</p>
                        )}
                        {block.data!.scenarioImage && currentIdx === 0 && (
                          <img src={block.data!.scenarioImage} alt="" className="w-full max-h-48 object-cover rounded-lg mb-3" />
                        )}

                        <p className="text-xs text-gray-400 mb-2">Step {currentIdx + 1} of {steps.length}</p>

                        {step.isEnd ? (
                          <div className={`rounded-lg p-5 text-center ${
                            step.endType === 'success' ? 'bg-emerald-50 border border-emerald-200' :
                            step.endType === 'failure' ? 'bg-red-50 border border-red-200' :
                            'bg-gray-50 border border-gray-200'
                          }`}>
                            <p className={`text-lg font-semibold mb-2 ${
                              step.endType === 'success' ? 'text-emerald-700' :
                              step.endType === 'failure' ? 'text-red-700' :
                              'text-gray-700'
                            }`}>
                              {step.endType === 'success' ? 'Success!' : step.endType === 'failure' ? 'Failed' : 'The End'}
                            </p>
                            <p className="text-sm text-gray-600">{step.endMessage || step.text}</p>
                            <button
                              onClick={() => {
                                setScenarioCurrentStep(prev => ({ ...prev, [block.id]: 0 }));
                                setScenarioFeedback(prev => ({ ...prev, [block.id]: null }));
                              }}
                              className="mt-4 px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              Restart
                            </button>
                          </div>
                        ) : (
                          <div>
                            <p className="text-base text-gray-800 mb-4">{step.text}</p>

                            {feedback && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">
                                {feedback}
                              </div>
                            )}

                            <div className="space-y-2">
                              {step.choices.map(choice => (
                                <button
                                  key={choice.id}
                                  onClick={() => {
                                    if (choice.feedback) {
                                      setScenarioFeedback(prev => ({ ...prev, [block.id]: choice.feedback! }));
                                      setTimeout(() => {
                                        setScenarioFeedback(prev => ({ ...prev, [block.id]: null }));
                                        const nextIdx = steps.findIndex(s => s.id === choice.nextStepId);
                                        if (nextIdx >= 0) {
                                          setScenarioCurrentStep(prev => ({ ...prev, [block.id]: nextIdx }));
                                        }
                                      }, 2000);
                                    } else {
                                      const nextIdx = steps.findIndex(s => s.id === choice.nextStepId);
                                      if (nextIdx >= 0) {
                                        setScenarioCurrentStep(prev => ({ ...prev, [block.id]: nextIdx }));
                                      }
                                    }
                                  }}
                                  className="w-full text-left px-4 py-3 rounded-lg border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 transition-all text-sm font-medium text-gray-700"
                                >
                                  {choice.text}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Checklist */}
                  {block.type === 'checklist' && block.data?.checklistItems && block.data.checklistItems.length > 0 && (() => {
                    const items = block.data!.checklistItems!;
                    const checked = checkedItems[block.id] ?? new Set<string>();
                    const toggleItem = (itemId: string) => {
                      setCheckedItems(prev => {
                        const set = new Set(prev[block.id] || []);
                        if (set.has(itemId)) set.delete(itemId); else set.add(itemId);
                        return { ...prev, [block.id]: set };
                      });
                    };

                    return (
                      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        {block.data!.checklistTitle && (
                          <h3 className="text-lg font-bold text-gray-900 mb-4">{block.data!.checklistTitle}</h3>
                        )}
                        <div className="space-y-3">
                          {items.map(item => {
                            const isChecked = checked.has(item.id);
                            return (
                              <div
                                key={item.id}
                                className="flex items-start gap-3 cursor-pointer group"
                                onClick={() => toggleItem(item.id)}
                              >
                                <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                  isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 group-hover:border-gray-400'
                                }`}>
                                  {isChecked && (
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                                <div>
                                  <p className={`text-sm font-medium transition-all ${isChecked ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                    {item.title}
                                  </p>
                                  {item.description && (
                                    <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-gray-400 mt-4">
                          {checked.size} of {items.length} completed
                        </p>
                      </div>
                    );
                  })()}

                  {/* Card Sorting */}
                  {block.type === 'card-sorting' && block.data?.cardSortCategories && block.data?.cardSortCards && (() => {
                    const categories = block.data!.cardSortCategories!;
                    const cards = block.data!.cardSortCards!;
                    const assignments = cardAssignments[block.id] ?? {};
                    const checkResult = cardSortChecked[block.id] ?? null;

                    const unsorted = cards.filter(c => !assignments[c.id]);

                    const assignCard = (cardId: string, category: string) => {
                      setCardAssignments(prev => ({
                        ...prev,
                        [block.id]: { ...(prev[block.id] || {}), [cardId]: category },
                      }));
                      setCardSortChecked(prev => ({ ...prev, [block.id]: null }));
                    };

                    const unassignCard = (cardId: string) => {
                      setCardAssignments(prev => {
                        const updated = { ...(prev[block.id] || {}) };
                        delete updated[cardId];
                        return { ...prev, [block.id]: updated };
                      });
                      setCardSortChecked(prev => ({ ...prev, [block.id]: null }));
                    };

                    const checkAnswers = () => {
                      const allCorrect = cards.every(c => assignments[c.id] === c.correctCategory);
                      setCardSortChecked(prev => ({ ...prev, [block.id]: allCorrect ? 'correct' : 'incorrect' }));
                    };

                    const resetSort = () => {
                      setCardAssignments(prev => ({ ...prev, [block.id]: {} }));
                      setCardSortChecked(prev => ({ ...prev, [block.id]: null }));
                    };

                    return (
                      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Sort the Cards</h3>

                        {/* Unsorted pile */}
                        {unsorted.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Unsorted ({unsorted.length})</p>
                            <div className="flex flex-wrap gap-2">
                              {unsorted.map(card => (
                                <div key={card.id} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
                                  <span>{card.text}</span>
                                  <div className="flex gap-1 mt-1">
                                    {categories.filter(c => c.trim()).map((cat, ci) => (
                                      <button
                                        key={ci}
                                        onClick={() => assignCard(card.id, cat)}
                                        className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
                                      >
                                        {cat}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Category bins */}
                        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(categories.length, 3)}, 1fr)` }}>
                          {categories.filter(c => c.trim()).map((cat, ci) => {
                            const catCards = cards.filter(c => assignments[c.id] === cat);
                            return (
                              <div key={ci} className="border-2 border-dashed border-gray-200 rounded-lg p-3 min-h-[80px]">
                                <p className="text-xs font-bold text-gray-600 mb-2">{cat}</p>
                                {catCards.length === 0 && (
                                  <p className="text-[10px] text-gray-300 italic">Drop cards here</p>
                                )}
                                {catCards.map(card => (
                                  <div key={card.id} className={`rounded px-2 py-1.5 text-xs mb-1 flex items-center justify-between ${
                                    checkResult === 'correct' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' :
                                    checkResult === 'incorrect' && card.correctCategory !== cat ? 'bg-red-50 border border-red-200 text-red-700' :
                                    checkResult === 'incorrect' && card.correctCategory === cat ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' :
                                    'bg-blue-50 border border-blue-200 text-blue-700'
                                  }`}>
                                    <span>{card.text}</span>
                                    {!checkResult && (
                                      <button onClick={() => unassignCard(card.id)} className="text-gray-400 hover:text-red-500 ml-1 text-[10px]">
                                        &times;
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>

                        {/* Result feedback */}
                        {checkResult && (
                          <div className={`mt-3 text-sm font-medium text-center p-2 rounded-lg ${
                            checkResult === 'correct' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {checkResult === 'correct' ? 'All cards are in the correct categories!' : 'Some cards are in the wrong category. Try again!'}
                          </div>
                        )}

                        {/* Buttons */}
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={checkAnswers}
                            disabled={unsorted.length > 0}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Check
                          </button>
                          <button
                            onClick={resetSort}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    );
                  })()}
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
                      {question.type === 'matching' && (() => {
                        // Parse stored answers: JSON map of { leftPairId: selectedRight }
                        let selections: Record<string, string> = {};
                        try { selections = quizAnswers[question.id] ? JSON.parse(quizAnswers[question.id] ?? '{}') : {}; } catch { /* empty */ }
                        const updateMatch = (pairId: string, rightValue: string) => {
                          const next = { ...selections, [pairId]: rightValue };
                          handleAnswer(question.id, JSON.stringify(next));
                        };
                        // Shuffled right-side options (shuffle once based on question id as seed)
                        const rightOptions = question.matchingPairs.map(p => p.right);
                        const shuffledRight = [...rightOptions].sort((a, b) => {
                          const ha = Array.from(a + question.id).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
                          const hb = Array.from(b + question.id).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
                          return ha - hb;
                        });
                        const allMatched = question.matchingPairs.every(p => selections[p.id]);

                        return (
                          <div className="ml-10 space-y-3">
                            {question.matchingPairs.map((pair, pIdx) => {
                              const selected = selections[pair.id] || '';
                              const isCorrectMatch = selected === pair.right;
                              let rowClass = '';
                              if (isSubmitted) {
                                rowClass = isCorrectMatch ? 'ring-2 ring-emerald-300 bg-emerald-50' : 'ring-2 ring-red-300 bg-red-50';
                              }
                              return (
                                <div key={pair.id} className={`flex items-center gap-3 p-2 rounded-lg transition-all ${rowClass}`}>
                                  <span className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium flex-1 min-w-0">
                                    {pair.left}
                                  </span>
                                  <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  {isSubmitted ? (
                                    <span className={`px-3 py-2 rounded-lg text-sm flex-1 min-w-0 ${isCorrectMatch ? 'bg-emerald-100 text-emerald-800 font-medium' : 'bg-red-100 text-red-800'}`}>
                                      {selected || '—'}
                                      {!isCorrectMatch && <span className="block text-xs text-emerald-600 mt-0.5">Correct: {pair.right}</span>}
                                    </span>
                                  ) : (
                                    <select
                                      value={selected}
                                      onChange={(e) => updateMatch(pair.id, e.target.value)}
                                      className="flex-1 min-w-0 px-3 py-2 border-2 rounded-lg text-sm transition-colors focus:outline-none"
                                      style={{
                                        borderColor: selected ? primaryColor : '#e5e7eb',
                                        backgroundColor: selected ? `${primaryColor}08` : '#ffffff',
                                      }}
                                    >
                                      <option value="">Select a match...</option>
                                      {shuffledRight.map((right, ri) => (
                                        <option key={ri} value={right}>{right}</option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              );
                            })}
                            {!isSubmitted && allMatched && !quizAnswers[question.id] && (
                              <p className="text-xs text-gray-400 italic">Select a match for each item, then check your answers.</p>
                            )}
                          </div>
                        );
                      })()}

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
