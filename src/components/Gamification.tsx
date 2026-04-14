import { useState, useEffect, useCallback, useMemo } from 'react';
import { Sparkles, Flame, Trophy, Target, Lock, Star, Zap, Award } from 'lucide-react';
import type { Question } from '../types';

// ---------------------------------------------------------------------------
// Helper: calculateGamification
// ---------------------------------------------------------------------------

export interface Badge {
  id: string;
  name: string;
  icon: string;
  earned: boolean;
}

export interface GamificationResult {
  xp: number;
  level: string;
  levelColor: string;
  badges: Badge[];
  progress: number;
}

export function calculateGamification(
  visitedSlides: number,
  totalSlides: number,
  correctAnswers: number,
  totalQuestions: number,
): GamificationResult {
  const xp = visitedSlides * 10 + correctAnswers * 25;
  const level =
    xp <= 50
      ? 'Beginner'
      : xp <= 150
        ? 'Explorer'
        : xp <= 300
          ? 'Achiever'
          : xp <= 500
            ? 'Expert'
            : 'Master';
  const levelColor = (
    {
      Beginner: '#94a3b8',
      Explorer: '#3b82f6',
      Achiever: '#8b5cf6',
      Expert: '#f59e0b',
      Master: '#ef4444',
    } as Record<string, string>
  )[level]!;

  const badges: Badge[] = [
    { id: 'first-steps', name: 'First Steps', icon: '🎯', earned: visitedSlides >= 1 },
    { id: 'quiz-taker', name: 'Quiz Taker', icon: '📝', earned: correctAnswers >= 1 },
    { id: 'half-way', name: 'Half Way', icon: '⭐', earned: visitedSlides >= totalSlides / 2 },
    {
      id: 'perfect',
      name: 'Perfect Score',
      icon: '✅',
      earned: correctAnswers === totalQuestions && totalQuestions > 0,
    },
    { id: 'complete', name: 'Complete', icon: '🏆', earned: visitedSlides >= totalSlides },
  ];

  return {
    xp,
    level,
    levelColor,
    badges,
    progress: totalSlides > 0 ? visitedSlides / totalSlides : 0,
  };
}

// ---------------------------------------------------------------------------
// 1. GamificationBar
// ---------------------------------------------------------------------------

interface GamificationBarProps {
  totalSlides: number;
  visitedSlides: number;
  correctAnswers: number;
  totalQuestions: number;
  currentStreak: number;
  primaryColor: string;
}

export function GamificationBar({
  totalSlides,
  visitedSlides,
  correctAnswers,
  totalQuestions,
  currentStreak,
  primaryColor,
}: GamificationBarProps) {
  const { xp, level, levelColor, badges, progress } = calculateGamification(
    visitedSlides,
    totalSlides,
    correctAnswers,
    totalQuestions,
  );

  // Animate XP counter
  const [displayXp, setDisplayXp] = useState(xp);
  useEffect(() => {
    if (displayXp === xp) return;
    const diff = xp - displayXp;
    const step = Math.max(1, Math.abs(Math.ceil(diff / 15)));
    const timer = setTimeout(() => {
      setDisplayXp((prev) => {
        if (diff > 0) return Math.min(prev + step, xp);
        return Math.max(prev - step, xp);
      });
    }, 30);
    return () => clearTimeout(timer);
  }, [displayXp, xp]);

  // On Fire badge check
  const streakBadgeEarned = currentStreak >= 3;

  // Progress ring
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div className="flex flex-col gap-2 p-3 bg-gray-50 border-t border-gray-200 text-sm select-none">
      {/* Top row: XP, Level, Progress Ring, Streak */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* XP Counter */}
        <div className="flex items-center gap-1 font-bold text-gray-800">
          <Sparkles size={14} className="text-yellow-500" />
          <span
            className="tabular-nums"
            style={{ transition: 'all 0.3s ease-out' }}
          >
            {displayXp}
          </span>
          <span className="text-gray-500 font-normal text-xs">XP</span>
        </div>

        {/* Level Badge */}
        <span
          className="px-2 py-0.5 rounded-full text-xs font-semibold text-white"
          style={{ backgroundColor: levelColor }}
        >
          {level}
        </span>

        {/* Progress Ring */}
        <div className="relative" title={`${Math.round(progress * 100)}% complete`}>
          <svg width="40" height="40" viewBox="0 0 40 40">
            <circle
              cx="20"
              cy="20"
              r={radius}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="3"
            />
            <circle
              cx="20"
              cy="20"
              r={radius}
              fill="none"
              stroke={primaryColor || '#3b82f6'}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 20 20)"
              style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-600">
            {Math.round(progress * 100)}%
          </span>
        </div>

        {/* Streak Fire */}
        {currentStreak >= 2 && (
          <div className="flex items-center gap-1 text-orange-500 font-semibold animate-pulse">
            <Flame size={14} />
            <span className="text-xs">{currentStreak} streak!</span>
          </div>
        )}
      </div>

      {/* Badges Row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs ${
              badge.earned
                ? 'bg-white border border-gray-200 text-gray-700'
                : 'bg-gray-100 text-gray-400'
            }`}
            title={badge.earned ? badge.name : `${badge.name} (locked)`}
          >
            {badge.earned ? (
              <span>{badge.icon}</span>
            ) : (
              <Lock size={10} className="text-gray-400" />
            )}
            <span className="hidden sm:inline">{badge.name}</span>
          </div>
        ))}
        {/* On Fire badge (separate from standard badges) */}
        <div
          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs ${
            streakBadgeEarned
              ? 'bg-white border border-gray-200 text-gray-700'
              : 'bg-gray-100 text-gray-400'
          }`}
          title={streakBadgeEarned ? 'On Fire' : 'On Fire (locked)'}
        >
          {streakBadgeEarned ? (
            <span>🔥</span>
          ) : (
            <Lock size={10} className="text-gray-400" />
          )}
          <span className="hidden sm:inline">On Fire</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. BranchingIndicator
// ---------------------------------------------------------------------------

interface BranchingIndicatorProps {
  currentSlideIndex: number;
  flatSlides: { slide: any; moduleTitle: string }[];
  branchHistory: number[];
  onJumpToSlide: (index: number) => void;
}

export function BranchingIndicator({
  currentSlideIndex,
  flatSlides,
  branchHistory,
  onJumpToSlide,
}: BranchingIndicatorProps) {
  const visitedSet = useMemo(() => new Set(branchHistory), [branchHistory]);

  // Detect jumps (non-sequential moves) in branchHistory
  const jumps = useMemo(() => {
    const result: { from: number; to: number }[] = [];
    for (let i = 1; i < branchHistory.length; i++) {
      const diff = branchHistory[i]! - branchHistory[i - 1]!;
      if (Math.abs(diff) > 1) {
        result.push({ from: branchHistory[i - 1]!, to: branchHistory[i]! });
      }
    }
    return result;
  }, [branchHistory]);

  const totalDots = flatSlides.length;
  // Scale down if too many slides
  const dotSize = totalDots > 30 ? 6 : totalDots > 15 ? 8 : 10;
  const gap = totalDots > 30 ? 2 : 4;

  return (
    <div className="flex flex-col gap-1 p-2">
      <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">
        Path
      </div>
      <div className="relative">
        {/* SVG for jump arcs */}
        <svg
          className="absolute top-0 left-0 pointer-events-none overflow-visible"
          width={totalDots * (dotSize + gap)}
          height={dotSize + 16}
          style={{ zIndex: 1 }}
        >
          {jumps.map((jump, i) => {
            const x1 = jump.from * (dotSize + gap) + dotSize / 2;
            const x2 = jump.to * (dotSize + gap) + dotSize / 2;
            const midX = (x1 + x2) / 2;
            const arcHeight = -Math.min(20, Math.abs(x2 - x1) * 0.3);
            return (
              <path
                key={i}
                d={`M ${x1} ${dotSize / 2} Q ${midX} ${arcHeight} ${x2} ${dotSize / 2}`}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="3 2"
                opacity={0.7}
              />
            );
          })}
        </svg>

        {/* Dots */}
        <div className="flex items-center flex-wrap" style={{ gap: `${gap}px`, position: 'relative', zIndex: 2 }}>
          {flatSlides.map((_, idx) => {
            const isVisited = visitedSet.has(idx);
            const isCurrent = idx === currentSlideIndex;
            return (
              <button
                key={idx}
                onClick={() => onJumpToSlide(idx)}
                title={`Slide ${idx + 1}${flatSlides[idx]?.moduleTitle ? ` - ${flatSlides[idx].moduleTitle}` : ''}`}
                className="rounded-full flex-shrink-0 transition-all duration-200 hover:scale-125"
                style={{
                  width: dotSize,
                  height: dotSize,
                  backgroundColor: isCurrent
                    ? '#3b82f6'
                    : isVisited
                      ? '#60a5fa'
                      : '#d1d5db',
                  border: isCurrent ? '2px solid #1d4ed8' : 'none',
                  boxShadow: isCurrent ? '0 0 4px rgba(59,130,246,0.5)' : 'none',
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. BranchingConfig (editor component)
// ---------------------------------------------------------------------------

// Branch targets are stored in localStorage keyed by question ID.
// Format: Record<optionId, targetSlideId | 'next' | 'end'>
// NOTE: Ideally the Question type would have a `branchTargets` field. For now
// we persist branch data externally in localStorage to avoid type changes.

const BRANCH_STORAGE_PREFIX = 'elearning-branch-';

function getBranchTargets(questionId: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(`${BRANCH_STORAGE_PREFIX}${questionId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setBranchTargets(questionId: string, targets: Record<string, string>) {
  localStorage.setItem(`${BRANCH_STORAGE_PREFIX}${questionId}`, JSON.stringify(targets));
}

/** Read branch target for a given question + selected option. Used by Preview. */
export function getBranchTarget(
  questionId: string,
  optionId: string,
): string | null {
  const targets = getBranchTargets(questionId);
  const val = targets[optionId];
  if (!val || val === 'next') return null; // null means "just go to next slide"
  return val; // 'end' or a slide ID
}

interface BranchingConfigProps {
  question: Question;
  flatSlides: { id: string; title: string }[];
  onUpdate: (updates: Partial<Question>) => void;
}

export function BranchingConfig({
  question,
  flatSlides,
  onUpdate,
}: BranchingConfigProps) {
  const [targets, setTargets] = useState<Record<string, string>>(() =>
    getBranchTargets(question.id),
  );

  // Re-load if question changes
  useEffect(() => {
    setTargets(getBranchTargets(question.id));
  }, [question.id]);

  const handleChange = useCallback(
    (optionId: string, value: string) => {
      setTargets((prev) => {
        const next = { ...prev, [optionId]: value };
        setBranchTargets(question.id, next);
        return next;
      });
    },
    [question.id],
  );

  // Only show for question types that have discrete options
  const options = question.options;
  if (!options || options.length === 0) {
    return (
      <div className="text-xs text-gray-400 italic py-2">
        Branching is available for questions with answer options.
      </div>
    );
  }

  return (
    <div className="space-y-2 py-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wide">
        <Zap size={12} className="text-amber-500" />
        Branching Paths
      </div>
      <p className="text-[11px] text-gray-500 leading-tight">
        Configure where the learner goes after selecting each answer.
      </p>

      <div className="space-y-1.5">
        {options.map((option) => (
          <div
            key={option.id}
            className="flex items-center gap-2 text-xs bg-gray-50 rounded px-2 py-1.5"
          >
            <span
              className="flex-1 truncate text-gray-700"
              title={option.text}
            >
              {option.text || '(empty option)'}
            </span>
            <select
              className="border border-gray-300 rounded px-1.5 py-0.5 text-xs bg-white text-gray-700 min-w-[140px]"
              value={targets[option.id] || 'next'}
              onChange={(e) => handleChange(option.id, e.target.value)}
            >
              <option value="next">Next slide (default)</option>
              <option value="end">End course</option>
              {flatSlides.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title || 'Untitled slide'}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
