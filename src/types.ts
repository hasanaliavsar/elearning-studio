export type SlideLayout = 'title' | 'content' | 'two-column' | 'image-text' | 'video' | 'quiz' | 'blank';

export type QuestionType =
  | 'multiple-choice' | 'true-false' | 'fill-in-blank' | 'matching' | 'drag-sort'
  | 'likert' | 'rating' | 'slider' | 'image-choice' | 'matrix'
  | 'dropdown' | 'open-ended' | 'ranking' | 'hotspot-question';

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
  imageUrl?: string; // for image-choice
}

export interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

export type LikertLabel = 'strongly-disagree' | 'disagree' | 'neutral' | 'agree' | 'strongly-agree';

export interface MatrixRow {
  id: string;
  label: string;
  correctColumn?: number; // index of correct answer column (if graded)
}

export interface HotspotZone {
  id: string;
  x: number; // percentage
  y: number;
  radius: number; // percentage
  label: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options: QuizOption[];
  matchingPairs: MatchingPair[];
  correctAnswer: string;
  correctOrder: string[];
  explanation: string;
  points: number;
  // Likert
  likertLabels?: string[];
  likertCorrectIndex?: number;
  // Rating
  ratingMax?: number; // 5 or 10
  ratingCorrect?: number;
  ratingStyle?: 'stars' | 'numbers' | 'emoji';
  // Slider
  sliderMin?: number;
  sliderMax?: number;
  sliderStep?: number;
  sliderCorrect?: number;
  sliderUnit?: string;
  // Image choice (uses options with imageUrl)
  imageChoiceColumns?: number;
  // Matrix
  matrixRows?: MatrixRow[];
  matrixColumns?: string[];
  matrixGraded?: boolean;
  // Dropdown (uses options)
  dropdownPlaceholder?: string;
  // Open-ended
  openEndedMaxLength?: number;
  openEndedPlaceholder?: string;
  openEndedKeywords?: string[]; // keywords for auto-grading
  // Ranking (uses options, correctOrder)
  // Hotspot question
  hotspotImage?: string;
  hotspotZones?: HotspotZone[];
}

// --- Interactive block sub-types ---

export interface FlipCardItem {
  id: string;
  front: string;
  back: string;
  frontImage: string;
  backImage: string;
}

export interface HotspotMarker {
  id: string;
  x: number; // percentage 0-100
  y: number;
  label: string;
  description: string;
}

export interface AccordionItem {
  id: string;
  title: string;
  content: string;
}

export interface TabItem {
  id: string;
  title: string;
  content: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  icon: string;
}

export interface GalleryImage {
  id: string;
  url: string;
  caption: string;
  alt: string;
}

export interface LabeledMarker {
  id: string;
  x: number;
  y: number;
  label: string;
  description: string;
  color: string;
}

export type CalloutStyle = 'info' | 'warning' | 'tip' | 'success';
export type ButtonStyle = 'primary' | 'secondary' | 'outline' | 'link';

// --- Pull quote ---
export type AvatarMode = 'auto' | 'initials' | 'image';

// --- Comparison ---
export interface ComparisonBullet {
  id: string;
  text: string;
  included: boolean; // true = checkmark, false = muted dash
}

export interface ComparisonColumn {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string; // pricing or amount line, e.g. "From €125,000"
  bullets: ComparisonBullet[];
  featured: boolean;
  ribbonLabel: string; // e.g. "Recommended"
}

export interface ContentBlockData {
  // Flip cards
  flipCards?: FlipCardItem[];
  // Hotspot
  hotspotImage?: string;
  hotspotMarkers?: HotspotMarker[];
  // Accordion
  accordionItems?: AccordionItem[];
  // Tabs
  tabItems?: TabItem[];
  // Timeline
  timelineEvents?: TimelineEvent[];
  // Table
  tableHeaders?: string[];
  tableRows?: string[][];
  tableStriped?: boolean;
  // Button
  buttonText?: string;
  buttonUrl?: string;
  buttonStyle?: ButtonStyle;
  buttonNewTab?: boolean;
  // Callout
  calloutStyle?: CalloutStyle;
  calloutTitle?: string;
  // Audio
  audioUrl?: string;
  // Embed
  embedUrl?: string;
  embedHeight?: number;
  // Gallery
  galleryImages?: GalleryImage[];
  galleryColumns?: number;
  // Labeled Graphic
  labeledImage?: string;
  labeledMarkers?: LabeledMarker[];
  // Image layouts
  layoutText?: string;
  layoutImages?: { url: string; caption: string; alt: string }[];
  // Scenario (branching decisions)
  scenarioTitle?: string;
  scenarioDescription?: string;
  scenarioImage?: string;
  scenarioSteps?: ScenarioStep[];
  // Checklist
  checklistItems?: ChecklistItem[];
  checklistTitle?: string;
  // Card sorting
  cardSortCategories?: string[];
  cardSortCards?: SortCard[];
  // Pull quote
  pqQuote?: string;
  pqName?: string;
  pqRole?: string;
  pqOrg?: string;
  pqAvatarMode?: AvatarMode;
  pqPortraitUrl?: string;
  pqInitialsOverride?: string;
  // Comparison
  cmpEyebrow?: string;
  cmpTitle?: string;
  cmpColumns?: ComparisonColumn[];
}

export interface ScenarioStep {
  id: string;
  text: string;
  choices: ScenarioChoice[];
  isEnd?: boolean;
  endMessage?: string;
  endType?: 'success' | 'failure' | 'neutral';
}

export interface ScenarioChoice {
  id: string;
  text: string;
  nextStepId: string; // ID of the next ScenarioStep
  feedback?: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
}

export interface SortCard {
  id: string;
  text: string;
  correctCategory: string; // must match one of cardSortCategories
}

export type ContentBlockType =
  | 'text' | 'image' | 'video' | 'heading' | 'list' | 'divider' | 'code'
  | 'flip-card' | 'hotspot' | 'accordion' | 'tabs' | 'timeline'
  | 'callout' | 'table' | 'button' | 'audio' | 'embed'
  | 'gallery' | 'labeled-graphic'
  | 'image-top' | 'image-bottom' | 'image-left' | 'image-right'
  | 'two-images' | 'three-images'
  | 'scenario' | 'checklist' | 'card-sorting'
  | 'pull-quote' | 'comparison';

// --- Animation types ---
export type EntranceAnimation = 'none' | 'fade-in' | 'slide-up' | 'slide-left' | 'slide-right' | 'zoom-in' | 'bounce-in';
export type SlideTransition = 'none' | 'fade' | 'slide-left' | 'slide-up' | 'zoom';
export type ThemeTemplate = 'modern' | 'corporate' | 'playful' | 'dark' | 'minimal' | 'elegant' | 'moonfare';

export interface ContentBlock {
  id: string;
  type: ContentBlockType;
  content: string;
  alt?: string;
  caption?: string;
  data?: ContentBlockData;
  animation?: EntranceAnimation;
  animationDelay?: number; // ms
  width?: number; // percentage 20-100, default 100
  align?: 'left' | 'center' | 'right'; // horizontal alignment when width < 100, default 'left'
}

export interface LearningObjective {
  id: string;
  text: string;
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
  duration: number;
  transition?: SlideTransition;
  isCoverSlide?: boolean;
  coverSubtitle?: string;
  learningObjectives?: LearningObjective[];
  fullBleed?: boolean;
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
  thumbnail: string;
  color: string; // card color for landing page
}

export interface LandingPageSettings {
  enabled: boolean;
  backgroundColor: string;
  backgroundGradient: string;
  textColor: string;
  showModuleList: boolean;
  showProgress: boolean;
  showCompanyLogo: boolean;
  companyLogoUrl: string;
  companyName: string;
  tagline: string;
  heroImageUrl: string;
}

export interface CourseSettings {
  passingScore: number;
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
  // Premium features
  theme: ThemeTemplate;
  defaultTransition: SlideTransition;
  defaultAnimation: EntranceAnimation;
  showCertificate: boolean;
  certificateTitle: string;
  certificateOrg: string;
  enableScrollReveal: boolean;
  enableKeyboardNav: boolean;
  enableGamification: boolean;
  landingPage: LandingPageSettings;
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
