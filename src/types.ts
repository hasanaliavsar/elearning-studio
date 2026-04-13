export type SlideLayout = 'title' | 'content' | 'two-column' | 'image-text' | 'video' | 'quiz' | 'blank';

export type QuestionType = 'multiple-choice' | 'true-false' | 'fill-in-blank' | 'matching';

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options: QuizOption[];
  matchingPairs: MatchingPair[];
  correctAnswer: string; // for fill-in-blank
  explanation: string;
  points: number;
}

export interface ContentBlock {
  id: string;
  type: 'text' | 'image' | 'video' | 'heading' | 'list' | 'divider' | 'code';
  content: string; // HTML for text, URL for image/video
  alt?: string;
  caption?: string;
}

export interface Slide {
  id: string;
  title: string;
  layout: SlideLayout;
  content: ContentBlock[];
  questions: Question[];
  notes: string;
  backgroundColor: string;
  backgroundImage: string;
  duration: number; // estimated minutes
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  slides: Slide[];
  order: number;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
  order: number;
}

export interface CourseSettings {
  passingScore: number; // percentage
  showFeedback: boolean;
  allowRetry: boolean;
  maxAttempts: number;
  shuffleQuestions: boolean;
  showProgress: boolean;
  completionCriteria: 'all-slides' | 'passing-score' | 'both';
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  logoUrl: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  author: string;
  version: string;
  language: string;
  thumbnail: string;
  modules: Module[];
  settings: CourseSettings;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export type ScormVersion = '1.2' | '2004';

export interface ExportOptions {
  scormVersion: ScormVersion;
  includeNotes: boolean;
  optimizeImages: boolean;
  packageName: string;
}

export type ViewMode = 'dashboard' | 'editor' | 'preview';

export interface EditorState {
  selectedModuleId: string | null;
  selectedLessonId: string | null;
  selectedSlideId: string | null;
  selectedQuestionId: string | null;
  sidebarCollapsed: boolean;
  rightPanelTab: 'properties' | 'notes' | 'quiz';
}
