import { useMemo } from 'react';
import type { Course, Module } from '../types';
import { getSlideCount, getQuestionCount } from '../utils/helpers';
import { BookOpen, Play, ChevronRight, Award, Clock, Layers } from 'lucide-react';

interface Props {
  course: Course;
  onStartCourse: () => void;
  onJumpToModule: (moduleIndex: number) => void;
}

// Palette of placeholder colors for module thumbnails when none is provided
const PLACEHOLDER_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#ef4444', // red
  '#14b8a6', // teal
];

function getModuleLessonCount(mod: Module): number {
  return mod.lessons.length;
}

function getModuleSlideCount(mod: Module): number {
  return mod.lessons.reduce((total, lesson) => total + lesson.slides.length, 0);
}

function getModuleDuration(mod: Module): number {
  return mod.lessons.reduce(
    (total, lesson) =>
      total + lesson.slides.reduce((st, slide) => st + slide.duration, 0),
    0
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}

export function CourseLandingPage({ course, onStartCourse, onJumpToModule }: Props) {
  const { settings } = course;
  const lp = settings.landingPage;
  const primaryColor = settings.primaryColor || '#6366f1';

  const totalSlides = useMemo(() => getSlideCount(course), [course]);
  const totalQuestions = useMemo(() => getQuestionCount(course), [course]);
  const completionPercent = 0; // Preview mode: always 0

  // Build the left panel background style
  const leftPanelStyle = useMemo(() => {
    const style: React.CSSProperties = { position: 'relative', overflow: 'hidden' };

    if (lp.heroImageUrl) {
      style.backgroundImage = `url(${lp.heroImageUrl})`;
      style.backgroundSize = 'cover';
      style.backgroundPosition = 'center';
    } else if (lp.backgroundGradient) {
      style.background = lp.backgroundGradient;
    } else {
      style.backgroundColor = lp.backgroundColor || '#1e1b4b';
    }

    return style;
  }, [lp.heroImageUrl, lp.backgroundGradient, lp.backgroundColor]);

  const textColor = lp.textColor || '#ffffff';

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full bg-gray-50">
      {/* ===== LEFT HERO PANEL ===== */}
      <div
        className="relative flex flex-col justify-between w-full lg:w-[40%] min-h-[50vh] lg:min-h-screen p-8 lg:p-12"
        style={leftPanelStyle}
      >
        {/* Color overlay when hero image is set */}
        {lp.heroImageUrl && (
          <div
            className="absolute inset-0 z-0"
            style={{
              backgroundColor: lp.backgroundColor || '#1e1b4b',
              opacity: 0.82,
            }}
          />
        )}

        {/* Decorative blob */}
        <div
          className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-10 z-0 pointer-events-none"
          style={{ backgroundColor: textColor }}
        />
        <div
          className="absolute -top-16 -left-16 w-48 h-48 rounded-full opacity-[0.06] z-0 pointer-events-none"
          style={{ backgroundColor: textColor }}
        />

        {/* Top section: logo */}
        <div className="relative z-10">
          {settings.logoUrl && (
            <img
              src={settings.logoUrl}
              alt="Course logo"
              className="h-10 w-auto object-contain mb-6"
            />
          )}
        </div>

        {/* Center section: title, tagline, stats */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-8">
          <h1
            className="text-3xl lg:text-4xl xl:text-5xl font-bold leading-tight mb-4"
            style={{ color: textColor }}
          >
            {course.title}
          </h1>

          {lp.tagline && (
            <p
              className="text-lg lg:text-xl opacity-80 mb-6 leading-relaxed"
              style={{ color: textColor }}
            >
              {lp.tagline}
            </p>
          )}

          {course.description && !lp.tagline && (
            <p
              className="text-base opacity-70 mb-6 leading-relaxed line-clamp-3"
              style={{ color: textColor }}
            >
              {course.description}
            </p>
          )}

          {/* Course stats row */}
          <div className="flex flex-wrap gap-4 mb-8">
            <div
              className="flex items-center gap-2 text-sm opacity-75"
              style={{ color: textColor }}
            >
              <Layers size={16} />
              <span>{course.modules.length} module{course.modules.length !== 1 ? 's' : ''}</span>
            </div>
            <div
              className="flex items-center gap-2 text-sm opacity-75"
              style={{ color: textColor }}
            >
              <BookOpen size={16} />
              <span>{totalSlides} slide{totalSlides !== 1 ? 's' : ''}</span>
            </div>
            {totalQuestions > 0 && (
              <div
                className="flex items-center gap-2 text-sm opacity-75"
                style={{ color: textColor }}
              >
                <Award size={16} />
                <span>{totalQuestions} question{totalQuestions !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {lp.showProgress && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-xs font-semibold uppercase tracking-wider opacity-70"
                  style={{ color: textColor }}
                >
                  You completed {completionPercent}%
                </span>
              </div>
              <div
                className="w-full h-1.5 rounded-full overflow-hidden"
                style={{ backgroundColor: `${textColor}20` }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${completionPercent}%`,
                    backgroundColor: primaryColor,
                  }}
                />
              </div>
            </div>
          )}

          {/* Start Course button */}
          <button
            onClick={onStartCourse}
            className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-base
                       shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200
                       active:translate-y-0 w-fit"
            style={{
              backgroundColor: primaryColor,
              color: '#ffffff',
            }}
          >
            <Play size={20} className="group-hover:scale-110 transition-transform" />
            Start Course
            <ChevronRight size={18} className="opacity-60 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Bottom section: company branding */}
        <div className="relative z-10">
          {(lp.showCompanyLogo && lp.companyLogoUrl) || lp.companyName ? (
            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              {lp.showCompanyLogo && lp.companyLogoUrl && (
                <img
                  src={lp.companyLogoUrl}
                  alt={lp.companyName || 'Company logo'}
                  className="h-8 w-auto object-contain"
                />
              )}
              {lp.companyName && (
                <span
                  className="text-sm font-medium opacity-60"
                  style={{ color: textColor }}
                >
                  {lp.companyName}
                </span>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* ===== RIGHT MODULE LIST PANEL ===== */}
      <div className="flex-1 flex flex-col w-full lg:w-[60%] bg-white lg:bg-gray-50/80">
        {/* Header */}
        <div className="px-8 lg:px-12 pt-8 lg:pt-12 pb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Course Content</h2>
          <p className="text-sm text-gray-500">
            {course.modules.length} module{course.modules.length !== 1 ? 's' : ''}
            {' \u00b7 '}
            {totalSlides} slide{totalSlides !== 1 ? 's' : ''}
            {totalQuestions > 0 && (
              <>
                {' \u00b7 '}
                {totalQuestions} question{totalQuestions !== 1 ? 's' : ''}
              </>
            )}
          </p>
        </div>

        {/* Scrollable module list */}
        <div className="flex-1 overflow-y-auto px-8 lg:px-12 pb-8 lg:pb-12">
          <div className="flex flex-col gap-4">
            {course.modules.map((mod, idx) => (
              <ModuleCard
                key={mod.id}
                module={mod}
                index={idx}
                primaryColor={primaryColor}
                onJumpToModule={onJumpToModule}
              />
            ))}
          </div>

          {/* Empty state */}
          {course.modules.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <BookOpen size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-medium">No modules yet</p>
              <p className="text-sm">Add modules to your course to see them here.</p>
            </div>
          )}
        </div>

        {/* Footer: Powered by */}
        <div className="px-8 lg:px-12 py-4 text-right">
          <span className="text-xs text-gray-300 select-none">
            Powered by eLearning Studio
          </span>
        </div>
      </div>
    </div>
  );
}

/* ===== Module Card Sub-component ===== */

interface ModuleCardProps {
  module: Module;
  index: number;
  primaryColor: string;
  onJumpToModule: (moduleIndex: number) => void;
}

function ModuleCard({ module, index, primaryColor, onJumpToModule }: ModuleCardProps) {
  const placeholderColor = module.color || PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length];
  const lessonCount = getModuleLessonCount(module);
  const slideCount = getModuleSlideCount(module);
  const duration = getModuleDuration(module);

  return (
    <button
      onClick={() => onJumpToModule(index)}
      className="group w-full text-left bg-white rounded-2xl shadow-sm hover:shadow-lg
                 border border-gray-100 hover:border-gray-200
                 transform hover:-translate-y-0.5 transition-all duration-200
                 focus:outline-none focus:ring-2 focus:ring-offset-2 overflow-hidden"
      style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
    >
      <div className="flex items-stretch">
        {/* Thumbnail / Placeholder */}
        <div className="relative w-32 sm:w-40 flex-shrink-0">
          {module.thumbnail ? (
            <img
              src={module.thumbnail}
              alt={module.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ backgroundColor: placeholderColor }}
            >
              <BookOpen size={32} className="text-white/80" />
            </div>
          )}
          {/* Module number badge */}
          <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-sm text-white text-xs font-bold
                          px-2 py-1 rounded-md">
            {String(index + 1).padStart(2, '0')}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col justify-between min-h-[120px]">
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-gray-700 transition-colors line-clamp-1">
              {module.title}
            </h3>
            {module.description && (
              <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                {module.description}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between mt-3">
            {/* Meta info */}
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <BookOpen size={12} />
                {lessonCount} lesson{lessonCount !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1">
                <Layers size={12} />
                {slideCount} slide{slideCount !== 1 ? 's' : ''}
              </span>
              {duration > 0 && (
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {formatDuration(duration)}
                </span>
              )}
            </div>

            {/* Status & details link */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 font-medium hidden sm:inline">
                Not started
              </span>
              <span
                className="flex items-center gap-0.5 text-xs font-semibold uppercase tracking-wide
                           opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ color: primaryColor }}
              >
                Details
                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
