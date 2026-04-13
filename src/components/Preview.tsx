import { useState, useMemo, useCallback } from 'react';
import { useStore } from '../store';
import type { Slide, Question, Course } from '../types';
import {
  ArrowLeft, ArrowRight, X, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Award, RotateCcw, Home
} from 'lucide-react';

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

  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [submittedQuizzes, setSubmittedQuizzes] = useState<Set<string>>(new Set());
  const [showResults, setShowResults] = useState(false);

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
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
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

  const goNext = () => {
    if (isLastSlide) {
      setShowResults(true);
    } else {
      setPreviewSlideIndex(previewSlideIndex + 1);
    }
  };

  const goPrev = () => {
    if (previewSlideIndex > 0) {
      setPreviewSlideIndex(previewSlideIndex - 1);
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
  };

  const handleRestart = () => {
    setPreviewSlideIndex(0);
    setQuizAnswers({});
    setSubmittedQuizzes(new Set());
    setShowResults(false);
  };

  const primaryColor = course.settings.primaryColor || '#4f46e5';

  // Results screen
  if (showResults) {
    return (
      <div className="h-full flex flex-col bg-gray-900">
        <header className="flex items-center justify-between px-6 py-3 bg-gray-800">
          <span className="text-white font-medium">{course.title}</span>
          <button onClick={handleClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
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
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 bg-gray-800 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div>
            <span className="text-white font-medium text-sm">{course.title}</span>
            <span className="text-gray-500 text-xs ml-3">
              {currentFlat.moduleTitle} &gt; {currentFlat.lessonTitle}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">
            {previewSlideIndex + 1} / {flatSlides.length}
          </span>
        </div>
      </header>

      {/* Progress bar */}
      {course.settings.showProgress && (
        <div className="h-1 bg-gray-800">
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${progress}%`, backgroundColor: primaryColor }}
          />
        </div>
      )}

      {/* Slide content */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        <div
          className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden"
          style={{ minHeight: '500px' }}
        >
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
              {currentSlide.content.map(block => (
                <div key={block.id}>
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
                </div>
              ))}
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
        </div>
      </div>

      {/* Bottom navigation */}
      <footer className="flex items-center justify-between px-8 py-4 bg-gray-800 flex-shrink-0">
        <button
          onClick={goPrev}
          disabled={previewSlideIndex === 0}
          className="flex items-center gap-2 text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Previous
        </button>

        {/* Slide dots */}
        <div className="flex items-center gap-1.5 max-w-md overflow-hidden">
          {flatSlides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setPreviewSlideIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === previewSlideIndex
                  ? 'w-6 bg-white'
                  : idx < previewSlideIndex
                    ? 'bg-gray-500'
                    : 'bg-gray-700'
              }`}
            />
          ))}
        </div>

        <button
          onClick={goNext}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
        >
          {isLastSlide ? 'Finish' : 'Next'}
          <ChevronRight className="w-5 h-5" />
        </button>
      </footer>
    </div>
  );
}
