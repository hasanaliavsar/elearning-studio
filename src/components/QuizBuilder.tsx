import { useState } from 'react';
import { useStore } from '../store';
import type { Course, Question, QuestionType, QuizOption, MatchingPair } from '../types';
import { generateId } from '../utils/helpers';
import {
  Plus, Trash2, CheckCircle2, Circle, GripVertical, HelpCircle,
  ListChecks, ToggleLeft, TextCursorInput, ArrowLeftRight,
  ChevronDown, ChevronUp, Award
} from 'lucide-react';

interface Props {
  course: Course;
  moduleId: string;
  lessonId: string;
  slideId: string;
  questions: Question[];
}

const questionTypeOptions: { type: QuestionType; label: string; icon: React.ReactNode }[] = [
  { type: 'multiple-choice', label: 'Multiple Choice', icon: <ListChecks className="w-4 h-4" /> },
  { type: 'true-false', label: 'True / False', icon: <ToggleLeft className="w-4 h-4" /> },
  { type: 'fill-in-blank', label: 'Fill in the Blank', icon: <TextCursorInput className="w-4 h-4" /> },
  { type: 'matching', label: 'Matching', icon: <ArrowLeftRight className="w-4 h-4" /> },
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
    if (question.type === 'multiple-choice' || question.type === 'true-false') {
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
          <div className="absolute left-0 top-8 bg-white rounded-lg shadow-xl border py-2 min-w-[200px] z-10">
            {questionTypeOptions.map(opt => (
              <button
                key={opt.type}
                onClick={() => {
                  addQuestion(course.id, moduleId, lessonId, slideId, opt.type);
                  setShowAddMenu(false);
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
