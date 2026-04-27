import { useMemo } from 'react';
import type { Course, Module } from '../types';
import { getSlideCount, getQuestionCount } from '../utils/helpers';
import { ChevronRight } from 'lucide-react';

interface Props {
  course: Course;
  onStartCourse: () => void;
  onJumpToModule: (moduleIndex: number) => void;
}

function getModuleSlideCount(mod: Module): number {
  return mod.lessons.reduce((t, l) => t + l.slides.length, 0);
}

function getModuleDuration(mod: Module): number {
  return mod.lessons.reduce((t, l) => t + l.slides.reduce((st, s) => st + s.duration, 0), 0);
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
  const totalSlides = useMemo(() => getSlideCount(course), [course]);
  const totalQuestions = useMemo(() => getQuestionCount(course), [course]);
  const totalDuration = useMemo(
    () => course.modules.reduce((t, m) => t + getModuleDuration(m), 0),
    [course]
  );

  const totalDurationLabel = totalDuration > 0 ? formatDuration(totalDuration) : 'Self-paced';

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full" style={{ backgroundColor: '#FAF8F4' }}>
      {/* ===== LEFT HERO PANEL ===== */}
      <div
        className="relative flex flex-col justify-between w-full lg:w-[46%] min-h-[50vh] lg:min-h-screen overflow-hidden"
        style={{ backgroundColor: '#171D97', color: '#FFFFFF', padding: '56px' }}
      >
        {/* Watermark monogram */}
        <img
          src={`${import.meta.env.BASE_URL}moonfare-monogram-white.png`}
          alt=""
          aria-hidden
          className="absolute pointer-events-none"
          style={{ right: '-60px', bottom: '-80px', height: '380px', opacity: 0.07 }}
        />

        {/* Top: Moonfare wordmark */}
        <div className="relative z-10">
          <img
            src={course.settings.logoUrl || '/moonfare-logo-white.png'}
            alt="Moonfare"
            className="h-6 w-auto object-contain"
          />
        </div>

        {/* Center */}
        <div className="relative z-10 flex flex-col justify-center py-8" style={{ flex: 1 }}>
          <div className="eyebrow mb-5" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Internal training
          </div>

          <h1
            className="font-display mb-6"
            style={{
              fontSize: 'clamp(40px, 5vw, 60px)',
              fontWeight: 400,
              letterSpacing: '-0.025em',
              lineHeight: 1.02,
              color: '#FFFFFF',
              textWrap: 'balance' as any,
            }}
          >
            {course.title}
          </h1>

          {course.settings.landingPage.tagline ? (
            <p className="text-lg leading-relaxed mb-9 max-w-[460px]" style={{ color: 'rgba(255,255,255,0.78)' }}>
              {course.settings.landingPage.tagline}
            </p>
          ) : course.description ? (
            <p className="text-lg leading-relaxed mb-9 max-w-[460px]" style={{ color: 'rgba(255,255,255,0.78)' }}>
              {course.description}
            </p>
          ) : null}

          {/* Stats row */}
          <div className="flex gap-9 mb-9">
            <Stat n={String(course.modules.length)} l={course.modules.length === 1 ? 'module' : 'modules'} />
            <Stat n={String(totalSlides)} l="slides" />
            <Stat n={totalDurationLabel} l="estimated" />
            {totalQuestions > 0 && <Stat n={String(totalQuestions)} l="questions" />}
          </div>

          <button
            onClick={onStartCourse}
            className="inline-flex items-center gap-2.5 self-start font-semibold text-sm transition-colors"
            style={{
              backgroundColor: '#FFFFFF',
              color: '#171D97',
              padding: '14px 28px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FAF8F4')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
          >
            Start course
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Bottom: meta */}
        <div className="relative z-10 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {course.author ? `Owner · ${course.author}` : 'Powered by Moonfare Learning Studio'}
          {course.settings.landingPage.companyName ? ` · ${course.settings.landingPage.companyName}` : ''}
        </div>
      </div>

      {/* ===== RIGHT MODULE LIST PANEL ===== */}
      <div className="flex-1 flex flex-col w-full lg:w-[54%] bg-white p-12 lg:p-14 overflow-auto">
        <div className="mb-7">
          <h2 className="font-display text-[22px]" style={{ fontWeight: 400, color: '#0A0C3F', letterSpacing: '-0.01em' }}>
            What you'll cover
          </h2>
          <p className="text-[13px] text-ink-muted mt-1">
            {course.modules.length} {course.modules.length === 1 ? 'module' : 'modules'}
            {totalQuestions > 0 ? ` · finishes with ${totalQuestions} ${totalQuestions === 1 ? 'question' : 'questions'}` : ''}
          </p>
        </div>

        <div className="flex flex-col gap-3.5">
          {course.modules.map((mod, idx) => (
            <ModuleRow
              key={mod.id}
              module={mod}
              index={idx}
              onJumpToModule={onJumpToModule}
            />
          ))}

          {course.modules.length === 0 && (
            <div className="py-16 text-center text-ink-faint">
              <p className="font-display text-xl" style={{ fontWeight: 400 }}>No modules yet</p>
              <p className="text-sm mt-2">Add modules to your course to see them here.</p>
            </div>
          )}
        </div>

        <div className="mt-auto pt-7 text-right text-[11px] text-ink-faint">
          Powered by Moonfare Learning Studio
        </div>
      </div>
    </div>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div className="font-display" style={{ fontSize: 28, fontWeight: 400, color: '#FFFFFF', lineHeight: 1 }}>{n}</div>
      <div className="text-[11px] uppercase tracking-[0.08em] mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>{l}</div>
    </div>
  );
}

interface ModuleRowProps {
  module: Module;
  index: number;
  onJumpToModule: (moduleIndex: number) => void;
}

function ModuleRow({ module, index, onJumpToModule }: ModuleRowProps) {
  const slideCount = getModuleSlideCount(module);
  const duration = getModuleDuration(module);

  return (
    <button
      onClick={() => onJumpToModule(index)}
      className="group w-full text-left bg-white border border-ivory-200 rounded-md transition-all hover:border-brand-200 hover:shadow-raise focus:outline-none focus:ring-2 focus:ring-brand-600"
      style={{ padding: '20px 22px' }}
    >
      <div className="flex items-start gap-5">
        <div
          className="font-display flex-shrink-0"
          style={{ fontSize: 28, fontWeight: 400, color: '#171D97', lineHeight: 1, minWidth: 38 }}
        >
          {String(index + 1).padStart(2, '0')}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold mb-1" style={{ color: '#0A0C3F' }}>
            {module.title}
          </h3>
          {module.description && (
            <p className="text-[13.5px] text-ink-muted leading-[1.5] line-clamp-2 m-0">
              {module.description}
            </p>
          )}
          <div className="mt-2.5 text-[11.5px] text-ink-faint tracking-wide">
            {module.lessons.length} {module.lessons.length === 1 ? 'lesson' : 'lessons'}
            {slideCount > 0 ? ` · ${slideCount} slides` : ''}
            {duration > 0 ? ` · ${formatDuration(duration)}` : ''}
          </div>
        </div>
        <ChevronRight
          size={18}
          className="text-ink-faint flex-shrink-0 mt-1 group-hover:translate-x-0.5 group-hover:text-brand-600 transition-all"
        />
      </div>
    </button>
  );
}
