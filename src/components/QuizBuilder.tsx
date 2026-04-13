import { useState } from 'react';
import { useStore } from '../store';
import type { Course, Question, QuestionType, QuizOption, MatchingPair, MatrixRow, HotspotZone } from '../types';
import { generateId } from '../utils/helpers';
import {
  Plus, Trash2, CheckCircle2, Circle, GripVertical, HelpCircle,
  ListChecks, ToggleLeft, TextCursorInput, ArrowLeftRight,
  ChevronDown, ChevronUp, Award, BarChart3, Star, SlidersHorizontal,
  Image, Grid3x3, ChevronsUpDown, MessageSquare, ListOrdered, Target
} from 'lucide-react';

interface Props {
  course: Course;
  moduleId: string;
  lessonId: string;
  slideId: string;
  questions: Question[];
}

const questionTypeOptions: { type: QuestionType; label: string; icon: React.ReactNode; category: string }[] = [
  // Basic
  { type: 'multiple-choice', label: 'Multiple Choice', icon: <ListChecks className="w-4 h-4" />, category: 'Basic' },
  { type: 'true-false', label: 'True / False', icon: <ToggleLeft className="w-4 h-4" />, category: 'Basic' },
  { type: 'fill-in-blank', label: 'Fill in the Blank', icon: <TextCursorInput className="w-4 h-4" />, category: 'Basic' },
  { type: 'dropdown', label: 'Dropdown', icon: <ChevronsUpDown className="w-4 h-4" />, category: 'Basic' },
  // Scale & Rating
  { type: 'likert', label: 'Likert Scale', icon: <BarChart3 className="w-4 h-4" />, category: 'Scale & Rating' },
  { type: 'rating', label: 'Rating', icon: <Star className="w-4 h-4" />, category: 'Scale & Rating' },
  { type: 'slider', label: 'Slider', icon: <SlidersHorizontal className="w-4 h-4" />, category: 'Scale & Rating' },
  // Interactive
  { type: 'matching', label: 'Matching', icon: <ArrowLeftRight className="w-4 h-4" />, category: 'Interactive' },
  { type: 'drag-sort', label: 'Drag & Sort', icon: <GripVertical className="w-4 h-4" />, category: 'Interactive' },
  { type: 'ranking', label: 'Ranking', icon: <ListOrdered className="w-4 h-4" />, category: 'Interactive' },
  { type: 'image-choice', label: 'Image Choice', icon: <Image className="w-4 h-4" />, category: 'Interactive' },
  { type: 'hotspot-question', label: 'Hotspot', icon: <Target className="w-4 h-4" />, category: 'Interactive' },
  // Advanced
  { type: 'matrix', label: 'Matrix', icon: <Grid3x3 className="w-4 h-4" />, category: 'Advanced' },
  { type: 'open-ended', label: 'Open-ended', icon: <MessageSquare className="w-4 h-4" />, category: 'Advanced' },
];

export function QuizBuilder({ course, moduleId, lessonId, slideId, questions }: Props) {
  const updateQuestion = useStore(s => s.updateQuestion);
  const deleteQuestion = useStore(s => s.deleteQuestion);
  const addQuestion = useStore(s => s.addQuestion);
  const editor = useStore(s => s.editor);
  const selectQuestion = useStore(s => s.selectQuestion);

  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(
    new Set(questions.map(q => q.id))
  );
  const [showAddMenu, setShowAddMenu] = useState(false);

  const toggleExpand = (id: string) => {
    const next = new Set(expandedQuestions);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedQuestions(next);
  };

  const handleUpdate = (questionId: string, updates: Partial<Question>) => {
    updateQuestion(course.id, moduleId, lessonId, slideId, questionId, updates);
  };

  const handleOptionUpdate = (question: Question, optionId: string, updates: Partial<QuizOption>) => {
    const newOptions = question.options.map(o =>
      o.id === optionId ? { ...o, ...updates } : o
    );
    handleUpdate(question.id, { options: newOptions });
  };

  const handleSetCorrect = (question: Question, optionId: string) => {
    if (question.type === 'multiple-choice' || question.type === 'true-false' || question.type === 'image-choice' || question.type === 'dropdown') {
      const newOptions = question.options.map(o => ({
        ...o,
        isCorrect: o.id === optionId,
      }));
      handleUpdate(question.id, { options: newOptions });
    }
  };

  const handleAddOption = (question: Question) => {
    const newOption: QuizOption = {
      id: generateId(),
      text: `Option ${question.options.length + 1}`,
      isCorrect: false,
    };
    handleUpdate(question.id, { options: [...question.options, newOption] });
  };

  const handleDeleteOption = (question: Question, optionId: string) => {
    handleUpdate(question.id, {
      options: question.options.filter(o => o.id !== optionId),
    });
  };

  const handleAddPair = (question: Question) => {
    const newPair: MatchingPair = {
      id: generateId(),
      left: `Term ${question.matchingPairs.length + 1}`,
      right: `Definition ${question.matchingPairs.length + 1}`,
    };
    handleUpdate(question.id, {
      matchingPairs: [...question.matchingPairs, newPair],
    });
  };

  const handlePairUpdate = (question: Question, pairId: string, updates: Partial<MatchingPair>) => {
    const newPairs = question.matchingPairs.map(p =>
      p.id === pairId ? { ...p, ...updates } : p
    );
    handleUpdate(question.id, { matchingPairs: newPairs });
  };

  const handleDeletePair = (question: Question, pairId: string) => {
    handleUpdate(question.id, {
      matchingPairs: question.matchingPairs.filter(p => p.id !== pairId),
    });
  };

  const renderQuestion = (question: Question, idx: number) => {
    const isExpanded = expandedQuestions.has(question.id);
    const isSelected = editor.selectedQuestionId === question.id;

    return (
      <div
        key={question.id}
        className={`border rounded-xl overflow-hidden transition-all ${
          isSelected ? 'border-brand-300 ring-2 ring-brand-100' : 'border-gray-200'
        }`}
        onClick={() => selectQuestion(question.id)}
      >
        {/* Question header */}
        <div
          className="flex items-center gap-3 px-4 py-3 bg-gray-50 cursor-pointer"
          onClick={() => toggleExpand(question.id)}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex-shrink-0">
              {idx + 1}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 flex-shrink-0">
              {question.type.replace('-', ' ')}
            </span>
            <span className="text-sm font-medium text-gray-700 truncate">{question.text}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Award className="w-3 h-3" />
              {question.points} pts
            </span>
            <button
              onClick={e => { e.stopPropagation(); deleteQuestion(course.id, moduleId, lessonId, slideId, question.id); }}
              className="btn-icon w-7 h-7 text-gray-400 hover:text-red-500"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </div>

        {/* Question body */}
        {isExpanded && (
          <div className="p-4 space-y-4">
            {/* Question text */}
            <div>
              <label className="label">Question</label>
              <textarea
                className="input resize-none"
                rows={2}
                value={question.text}
                onChange={e => handleUpdate(question.id, { text: e.target.value })}
                placeholder="Enter your question..."
              />
            </div>

            {/* Points */}
            <div className="flex items-center gap-4">
              <div className="w-32">
                <label className="label">Points</label>
                <input
                  type="number"
                  className="input"
                  min={1}
                  max={100}
                  value={question.points}
                  onChange={e => handleUpdate(question.id, { points: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            {/* Multiple Choice Options */}
            {question.type === 'multiple-choice' && (
              <div>
                <label className="label">Answer Options</label>
                <div className="space-y-2">
                  {question.options.map((option, optIdx) => (
                    <div key={option.id} className="flex items-center gap-2">
                      <button
                        onClick={() => handleSetCorrect(question, option.id)}
                        className={`flex-shrink-0 transition-colors ${
                          option.isCorrect ? 'text-emerald-500' : 'text-gray-300 hover:text-gray-400'
                        }`}
                        title={option.isCorrect ? 'Correct answer' : 'Mark as correct'}
                      >
                        {option.isCorrect ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>
                      <input
                        type="text"
                        className={`input flex-1 ${option.isCorrect ? 'border-emerald-300 bg-emerald-50' : ''}`}
                        value={option.text}
                        onChange={e => handleOptionUpdate(question, option.id, { text: e.target.value })}
                        placeholder={`Option ${optIdx + 1}`}
                      />
                      {question.options.length > 2 && (
                        <button
                          onClick={() => handleDeleteOption(question, option.id)}
                          className="btn-icon w-7 h-7 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => handleAddOption(question)}
                    className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 mt-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Option
                  </button>
                </div>
              </div>
            )}

            {/* True/False Options */}
            {question.type === 'true-false' && (
              <div>
                <label className="label">Correct Answer</label>
                <div className="flex gap-3">
                  {question.options.map(option => (
                    <button
                      key={option.id}
                      onClick={() => handleSetCorrect(question, option.id)}
                      className={`flex-1 py-3 rounded-lg border-2 font-medium transition-all ${
                        option.isCorrect
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {option.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Fill in the Blank */}
            {question.type === 'fill-in-blank' && (
              <div>
                <label className="label">Correct Answer</label>
                <input
                  type="text"
                  className="input border-emerald-300 bg-emerald-50"
                  value={question.correctAnswer}
                  onChange={e => handleUpdate(question.id, { correctAnswer: e.target.value })}
                  placeholder="Type the correct answer..."
                />
                <p className="text-xs text-gray-400 mt-1">Case-insensitive matching will be used</p>
              </div>
            )}

            {/* Matching Pairs */}
            {question.type === 'matching' && (
              <div>
                <label className="label">Matching Pairs</label>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs font-medium text-gray-500 px-1">
                    <span>Term</span>
                    <span>Definition</span>
                  </div>
                  {question.matchingPairs.map(pair => (
                    <div key={pair.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        className="input flex-1"
                        value={pair.left}
                        onChange={e => handlePairUpdate(question, pair.id, { left: e.target.value })}
                        placeholder="Term"
                      />
                      <ArrowLeftRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <input
                        type="text"
                        className="input flex-1"
                        value={pair.right}
                        onChange={e => handlePairUpdate(question, pair.id, { right: e.target.value })}
                        placeholder="Definition"
                      />
                      {question.matchingPairs.length > 2 && (
                        <button
                          onClick={() => handleDeletePair(question, pair.id)}
                          className="btn-icon w-7 h-7 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => handleAddPair(question)}
                    className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 mt-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Pair
                  </button>
                </div>
              </div>
            )}

            {/* Likert Scale */}
            {question.type === 'likert' && (
              <div>
                <label className="label">Likert Labels</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(question.likertLabels ?? []).map((label, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <button
                        onClick={() => handleUpdate(question.id, { likertCorrectIndex: i })}
                        className={`flex-shrink-0 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${
                          question.likertCorrectIndex === i
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="text"
                          className="bg-transparent border-none outline-none text-center w-24 text-sm"
                          value={label}
                          onClick={e => e.stopPropagation()}
                          onChange={e => {
                            const newLabels = [...(question.likertLabels ?? [])];
                            newLabels[i] = e.target.value;
                            handleUpdate(question.id, { likertLabels: newLabels });
                          }}
                        />
                      </button>
                      {(question.likertLabels ?? []).length > 2 && (
                        <button
                          onClick={() => {
                            const newLabels = (question.likertLabels ?? []).filter((_, idx) => idx !== i);
                            const newCorrect = question.likertCorrectIndex !== undefined && question.likertCorrectIndex >= i && question.likertCorrectIndex > 0
                              ? question.likertCorrectIndex - 1 : question.likertCorrectIndex;
                            handleUpdate(question.id, { likertLabels: newLabels, likertCorrectIndex: newCorrect });
                          }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleUpdate(question.id, { likertLabels: [...(question.likertLabels ?? []), `Label ${(question.likertLabels ?? []).length + 1}`] })}
                  className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700"
                >
                  <Plus className="w-4 h-4" /> Add Label
                </button>
                <p className="text-xs text-gray-400 mt-2">Click a label button to mark it as the correct answer. Click the text to edit.</p>
              </div>
            )}

            {/* Rating */}
            {question.type === 'rating' && (
              <div className="space-y-3">
                <div className="flex gap-4">
                  <div className="w-40">
                    <label className="label">Style</label>
                    <select
                      className="input"
                      value={question.ratingStyle ?? 'stars'}
                      onChange={e => handleUpdate(question.id, { ratingStyle: e.target.value as 'stars' | 'numbers' | 'emoji' })}
                    >
                      <option value="stars">Stars</option>
                      <option value="numbers">Numbers</option>
                      <option value="emoji">Emoji</option>
                    </select>
                  </div>
                  <div className="w-32">
                    <label className="label">Max Rating</label>
                    <select
                      className="input"
                      value={question.ratingMax ?? 5}
                      onChange={e => handleUpdate(question.id, { ratingMax: parseInt(e.target.value) })}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                    </select>
                  </div>
                  <div className="w-40">
                    <label className="label">Min Accepted</label>
                    <input
                      type="number"
                      className="input"
                      min={1}
                      max={question.ratingMax ?? 5}
                      value={question.ratingCorrect ?? 4}
                      onChange={e => handleUpdate(question.id, { ratingCorrect: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Preview</label>
                  <div className="flex gap-1">
                    {Array.from({ length: question.ratingMax ?? 5 }, (_, i) => {
                      const active = i < (question.ratingCorrect ?? 4);
                      const style = question.ratingStyle ?? 'stars';
                      return (
                        <span key={i} className={`text-xl ${active ? 'opacity-100' : 'opacity-30'}`}>
                          {style === 'stars' ? '★' : style === 'emoji' ? '😊' : (i + 1)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Slider */}
            {question.type === 'slider' && (
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-3">
                  <div>
                    <label className="label">Min</label>
                    <input type="number" className="input" value={question.sliderMin ?? 0}
                      onChange={e => handleUpdate(question.id, { sliderMin: parseFloat(e.target.value) })} />
                  </div>
                  <div>
                    <label className="label">Max</label>
                    <input type="number" className="input" value={question.sliderMax ?? 100}
                      onChange={e => handleUpdate(question.id, { sliderMax: parseFloat(e.target.value) })} />
                  </div>
                  <div>
                    <label className="label">Step</label>
                    <input type="number" className="input" min={0.1} value={question.sliderStep ?? 1}
                      onChange={e => handleUpdate(question.id, { sliderStep: parseFloat(e.target.value) || 1 })} />
                  </div>
                  <div>
                    <label className="label">Unit</label>
                    <input type="text" className="input" value={question.sliderUnit ?? ''}
                      onChange={e => handleUpdate(question.id, { sliderUnit: e.target.value })} placeholder="%, pts..." />
                  </div>
                  <div>
                    <label className="label">Correct</label>
                    <input type="number" className="input border-emerald-300 bg-emerald-50"
                      value={question.sliderCorrect ?? 0}
                      onChange={e => handleUpdate(question.id, { sliderCorrect: parseFloat(e.target.value) })} />
                  </div>
                </div>
                <div>
                  <label className="label">Preview</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{question.sliderMin ?? 0}{question.sliderUnit}</span>
                    <input type="range" className="flex-1"
                      min={question.sliderMin ?? 0} max={question.sliderMax ?? 100}
                      step={question.sliderStep ?? 1} value={question.sliderCorrect ?? 0} readOnly />
                    <span className="text-xs text-gray-500">{question.sliderMax ?? 100}{question.sliderUnit}</span>
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-1">Correct: {question.sliderCorrect ?? 0}{question.sliderUnit}</p>
                </div>
              </div>
            )}

            {/* Image Choice */}
            {question.type === 'image-choice' && (
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <label className="label mb-0">Columns</label>
                  <select className="input w-20" value={question.imageChoiceColumns ?? 3}
                    onChange={e => handleUpdate(question.id, { imageChoiceColumns: parseInt(e.target.value) })}>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                  </select>
                </div>
                <div className={`grid gap-3 grid-cols-${question.imageChoiceColumns ?? 3}`} style={{ gridTemplateColumns: `repeat(${question.imageChoiceColumns ?? 3}, minmax(0, 1fr))` }}>
                  {question.options.map((option, optIdx) => (
                    <div key={option.id} className={`border-2 rounded-lg p-2 cursor-pointer transition-all ${
                      option.isCorrect ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                    }`} onClick={() => handleSetCorrect(question, option.id)}>
                      <div className="aspect-video bg-gray-100 rounded mb-2 flex items-center justify-center overflow-hidden">
                        {option.imageUrl ? (
                          <img src={option.imageUrl} alt={option.text} className="w-full h-full object-cover" />
                        ) : (
                          <Image className="w-6 h-6 text-gray-300" />
                        )}
                      </div>
                      <input type="text" className="input text-xs mb-1" value={option.text} placeholder={`Label ${optIdx + 1}`}
                        onClick={e => e.stopPropagation()}
                        onChange={e => handleOptionUpdate(question, option.id, { text: e.target.value })} />
                      <input type="url" className="input text-xs" value={option.imageUrl ?? ''} placeholder="Image URL..."
                        onClick={e => e.stopPropagation()}
                        onChange={e => handleOptionUpdate(question, option.id, { imageUrl: e.target.value })} />
                      {option.isCorrect && <span className="text-xs text-emerald-600 font-medium mt-1 block">Correct</span>}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => handleAddOption(question)}
                    className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700">
                    <Plus className="w-4 h-4" /> Add Option
                  </button>
                  {question.options.length > 2 && (
                    <button onClick={() => handleDeleteOption(question, question.options[question.options.length - 1]!.id)}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500">
                      <Trash2 className="w-4 h-4" /> Remove Last
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Matrix */}
            {question.type === 'matrix' && (
              <div className="space-y-3">
                <div className="flex items-center gap-4 mb-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={question.matrixGraded ?? false}
                      onChange={e => handleUpdate(question.id, { matrixGraded: e.target.checked })}
                      className="rounded border-gray-300" />
                    Graded (each row has a correct column)
                  </label>
                </div>
                {/* Column headers */}
                <div>
                  <label className="label">Column Headers</label>
                  <div className="flex gap-2 flex-wrap">
                    {(question.matrixColumns ?? []).map((col, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <input type="text" className="input w-28 text-sm" value={col}
                          onChange={e => {
                            const cols = [...(question.matrixColumns ?? [])];
                            cols[i] = e.target.value;
                            handleUpdate(question.id, { matrixColumns: cols });
                          }} />
                        {(question.matrixColumns ?? []).length > 2 && (
                          <button onClick={() => {
                            const cols = (question.matrixColumns ?? []).filter((_, idx) => idx !== i);
                            const rows = (question.matrixRows ?? []).map(r => ({
                              ...r, correctColumn: r.correctColumn !== undefined && r.correctColumn >= i ? Math.max(0, r.correctColumn - 1) : r.correctColumn
                            }));
                            handleUpdate(question.id, { matrixColumns: cols, matrixRows: rows });
                          }} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => handleUpdate(question.id, { matrixColumns: [...(question.matrixColumns ?? []), `Col ${(question.matrixColumns ?? []).length + 1}`] })}
                      className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {/* Row labels */}
                <div>
                  <label className="label">Rows</label>
                  <div className="space-y-2">
                    {(question.matrixRows ?? []).map(row => (
                      <div key={row.id} className="flex items-center gap-2">
                        <input type="text" className="input flex-1 text-sm" value={row.label}
                          onChange={e => {
                            const rows = (question.matrixRows ?? []).map(r => r.id === row.id ? { ...r, label: e.target.value } : r);
                            handleUpdate(question.id, { matrixRows: rows });
                          }} placeholder="Row label" />
                        {question.matrixGraded && (
                          <select className="input w-32 text-sm" value={row.correctColumn ?? 0}
                            onChange={e => {
                              const rows = (question.matrixRows ?? []).map(r => r.id === row.id ? { ...r, correctColumn: parseInt(e.target.value) } : r);
                              handleUpdate(question.id, { matrixRows: rows });
                            }}>
                            {(question.matrixColumns ?? []).map((col, ci) => (
                              <option key={ci} value={ci}>{col}</option>
                            ))}
                          </select>
                        )}
                        {(question.matrixRows ?? []).length > 1 && (
                          <button onClick={() => handleUpdate(question.id, { matrixRows: (question.matrixRows ?? []).filter(r => r.id !== row.id) })}
                            className="text-gray-400 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => handleUpdate(question.id, { matrixRows: [...(question.matrixRows ?? []), { id: generateId(), label: `Row ${(question.matrixRows ?? []).length + 1}`, correctColumn: 0 }] })}
                      className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700">
                      <Plus className="w-4 h-4" /> Add Row
                    </button>
                  </div>
                </div>
                {/* Mini grid preview */}
                <div>
                  <label className="label">Preview</label>
                  <div className="overflow-x-auto">
                    <table className="text-xs border-collapse w-full">
                      <thead>
                        <tr>
                          <th className="border border-gray-200 p-1 bg-gray-50"></th>
                          {(question.matrixColumns ?? []).map((col, i) => (
                            <th key={i} className="border border-gray-200 p-1 bg-gray-50 text-center">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(question.matrixRows ?? []).map(row => (
                          <tr key={row.id}>
                            <td className="border border-gray-200 p-1 font-medium">{row.label}</td>
                            {(question.matrixColumns ?? []).map((_, ci) => (
                              <td key={ci} className="border border-gray-200 p-1 text-center">
                                {question.matrixGraded && row.correctColumn === ci ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500 mx-auto" />
                                ) : (
                                  <Circle className="w-3 h-3 text-gray-300 mx-auto" />
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Dropdown */}
            {question.type === 'dropdown' && (
              <div>
                <div className="mb-3">
                  <label className="label">Placeholder Text</label>
                  <input type="text" className="input" value={question.dropdownPlaceholder ?? 'Choose an answer...'}
                    onChange={e => handleUpdate(question.id, { dropdownPlaceholder: e.target.value })} />
                </div>
                <label className="label">Options (one will render as a dropdown)</label>
                <div className="space-y-2">
                  {question.options.map((option, optIdx) => (
                    <div key={option.id} className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const newOptions = question.options.map(o => ({ ...o, isCorrect: o.id === option.id }));
                          handleUpdate(question.id, { options: newOptions });
                        }}
                        className={`flex-shrink-0 transition-colors ${
                          option.isCorrect ? 'text-emerald-500' : 'text-gray-300 hover:text-gray-400'
                        }`}
                      >
                        {option.isCorrect ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                      </button>
                      <input type="text" className={`input flex-1 ${option.isCorrect ? 'border-emerald-300 bg-emerald-50' : ''}`}
                        value={option.text} onChange={e => handleOptionUpdate(question, option.id, { text: e.target.value })}
                        placeholder={`Option ${optIdx + 1}`} />
                      {question.options.length > 2 && (
                        <button onClick={() => handleDeleteOption(question, option.id)}
                          className="btn-icon w-7 h-7 text-gray-400 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => handleAddOption(question)}
                    className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 mt-1">
                    <Plus className="w-4 h-4" /> Add Option
                  </button>
                </div>
                <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                  <label className="label text-xs mb-1">Preview</label>
                  <select className="input text-sm" disabled>
                    <option>{question.dropdownPlaceholder ?? 'Choose an answer...'}</option>
                    {question.options.map(o => <option key={o.id}>{o.text}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Open-ended */}
            {question.type === 'open-ended' && (
              <div className="space-y-3">
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Open-ended questions are typically 0 points and not auto-graded.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Max Length</label>
                    <input type="number" className="input" min={50} max={5000}
                      value={question.openEndedMaxLength ?? 500}
                      onChange={e => handleUpdate(question.id, { openEndedMaxLength: parseInt(e.target.value) || 500 })} />
                  </div>
                  <div>
                    <label className="label">Placeholder</label>
                    <input type="text" className="input" value={question.openEndedPlaceholder ?? ''}
                      onChange={e => handleUpdate(question.id, { openEndedPlaceholder: e.target.value })}
                      placeholder="Type your answer here..." />
                  </div>
                </div>
                <div>
                  <label className="label">Keywords (comma-separated, for optional auto-grading)</label>
                  <input type="text" className="input"
                    value={(question.openEndedKeywords ?? []).join(', ')}
                    onChange={e => handleUpdate(question.id, { openEndedKeywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean) })}
                    placeholder="keyword1, keyword2, keyword3..." />
                  <p className="text-xs text-gray-400 mt-1">Responses containing these keywords can receive partial credit</p>
                </div>
              </div>
            )}

            {/* Ranking */}
            {question.type === 'ranking' && (
              <div>
                <label className="label">Ranking Items (drag to set correct order)</label>
                <div className="space-y-2">
                  {question.options.map((option, optIdx) => {
                    const correctPos = question.correctOrder.indexOf(option.id);
                    return (
                      <div key={option.id} className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {correctPos >= 0 ? correctPos + 1 : optIdx + 1}
                        </span>
                        <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0 cursor-grab" />
                        <input type="text" className="input flex-1"
                          value={option.text}
                          onChange={e => handleOptionUpdate(question, option.id, { text: e.target.value })}
                          placeholder={`Item ${optIdx + 1}`} />
                        <div className="flex gap-1">
                          {optIdx > 0 && (
                            <button onClick={() => {
                              const newOrder = [...question.correctOrder];
                              const idx = newOrder.indexOf(option.id);
                              if (idx > 0) { const tmp = newOrder[idx - 1]!; newOrder[idx - 1] = newOrder[idx]!; newOrder[idx] = tmp; }
                              const reorderedOpts = newOrder.map(id => question.options.find(o => o.id === id)).filter((o): o is typeof question.options[number] => !!o);
                              handleUpdate(question.id, { options: reorderedOpts, correctOrder: newOrder });
                            }} className="btn-icon w-7 h-7 text-gray-400 hover:text-brand-600">
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {optIdx < question.options.length - 1 && (
                            <button onClick={() => {
                              const newOrder = [...question.correctOrder];
                              const idx = newOrder.indexOf(option.id);
                              if (idx < newOrder.length - 1) { const tmp = newOrder[idx]!; newOrder[idx] = newOrder[idx + 1]!; newOrder[idx + 1] = tmp; }
                              const reorderedOpts = newOrder.map(id => question.options.find(o => o.id === id)).filter((o): o is typeof question.options[number] => !!o);
                              handleUpdate(question.id, { options: reorderedOpts, correctOrder: newOrder });
                            }} className="btn-icon w-7 h-7 text-gray-400 hover:text-brand-600">
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {question.options.length > 2 && (
                          <button onClick={() => {
                            const newOpts = question.options.filter(o => o.id !== option.id);
                            const newOrder = question.correctOrder.filter(id => id !== option.id);
                            handleUpdate(question.id, { options: newOpts, correctOrder: newOrder });
                          }} className="btn-icon w-7 h-7 text-gray-400 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <button onClick={() => {
                    const newOpt: QuizOption = { id: generateId(), text: `Item ${question.options.length + 1}`, isCorrect: false };
                    handleUpdate(question.id, { options: [...question.options, newOpt], correctOrder: [...question.correctOrder, newOpt.id] });
                  }} className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 mt-1">
                    <Plus className="w-4 h-4" /> Add Item
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">Use arrows to reorder. The order shown is the expected correct ranking.</p>
              </div>
            )}

            {/* Hotspot Question */}
            {question.type === 'hotspot-question' && (
              <div className="space-y-3">
                <div>
                  <label className="label">Hotspot Image URL</label>
                  <input type="url" className="input" value={question.hotspotImage ?? ''}
                    onChange={e => handleUpdate(question.id, { hotspotImage: e.target.value })}
                    placeholder="https://example.com/image.png" />
                </div>
                {question.hotspotImage && (
                  <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ maxHeight: 200 }}>
                    <img src={question.hotspotImage} alt="Hotspot" className="w-full h-auto object-contain" style={{ maxHeight: 200 }} />
                  </div>
                )}
                <div>
                  <label className="label">Zones</label>
                  <div className="space-y-2">
                    {(question.hotspotZones ?? []).map((zone, zi) => (
                      <div key={zone.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <input type="text" className="input w-24 text-xs" value={zone.label}
                          onChange={e => {
                            const zones = (question.hotspotZones ?? []).map(z => z.id === zone.id ? { ...z, label: e.target.value } : z);
                            handleUpdate(question.id, { hotspotZones: zones });
                          }} placeholder="Label" />
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <span>X:</span>
                          <input type="number" className="input w-16 text-xs" min={0} max={100} value={zone.x}
                            onChange={e => {
                              const zones = (question.hotspotZones ?? []).map(z => z.id === zone.id ? { ...z, x: parseFloat(e.target.value) } : z);
                              handleUpdate(question.id, { hotspotZones: zones });
                            }} />
                          <span>Y:</span>
                          <input type="number" className="input w-16 text-xs" min={0} max={100} value={zone.y}
                            onChange={e => {
                              const zones = (question.hotspotZones ?? []).map(z => z.id === zone.id ? { ...z, y: parseFloat(e.target.value) } : z);
                              handleUpdate(question.id, { hotspotZones: zones });
                            }} />
                          <span>R:</span>
                          <input type="number" className="input w-16 text-xs" min={1} max={50} value={zone.radius}
                            onChange={e => {
                              const zones = (question.hotspotZones ?? []).map(z => z.id === zone.id ? { ...z, radius: parseFloat(e.target.value) } : z);
                              handleUpdate(question.id, { hotspotZones: zones });
                            }} />
                        </div>
                        <label className="flex items-center gap-1 text-xs">
                          <input type="checkbox" checked={zone.isCorrect}
                            onChange={e => {
                              const zones = (question.hotspotZones ?? []).map(z => z.id === zone.id ? { ...z, isCorrect: e.target.checked } : z);
                              handleUpdate(question.id, { hotspotZones: zones });
                            }}
                            className="rounded border-gray-300" />
                          Correct
                        </label>
                        {(question.hotspotZones ?? []).length > 1 && (
                          <button onClick={() => handleUpdate(question.id, { hotspotZones: (question.hotspotZones ?? []).filter(z => z.id !== zone.id) })}
                            className="text-gray-400 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => handleUpdate(question.id, {
                      hotspotZones: [...(question.hotspotZones ?? []), { id: generateId(), x: 50, y: 50, radius: 10, label: `Zone ${(question.hotspotZones ?? []).length + 1}`, isCorrect: false }]
                    })} className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700">
                      <Plus className="w-4 h-4" /> Add Zone
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">X, Y, and Radius are percentages (0-100) of image dimensions.</p>
                </div>
              </div>
            )}

            {/* Explanation */}
            <div>
              <label className="label">Explanation (shown after answering)</label>
              <textarea
                className="input resize-none"
                rows={2}
                value={question.explanation}
                onChange={e => handleUpdate(question.id, { explanation: e.target.value })}
                placeholder="Explain why this is the correct answer..."
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-500" />
          Questions ({questions.length})
        </h3>
      </div>

      {questions.map((q, idx) => renderQuestion(q, idx))}

      {/* Add question button */}
      <div className="relative">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Question
        </button>

        {showAddMenu && (
          <div className="absolute left-0 top-8 bg-white rounded-lg shadow-xl border py-3 z-10 w-[480px]">
            <div className="grid grid-cols-2 gap-x-4 px-3">
              {['Basic', 'Scale & Rating', 'Interactive', 'Advanced'].map(category => {
                const items = questionTypeOptions.filter(o => o.category === category);
                return (
                  <div key={category} className="mb-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 px-1">{category}</p>
                    {items.map(opt => (
                      <button
                        key={opt.type}
                        onClick={() => {
                          addQuestion(course.id, moduleId, lessonId, slideId, opt.type);
                          setShowAddMenu(false);
                        }}
                        className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 w-full rounded"
                      >
                        {opt.icon}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
