import { useState } from 'react';
import { useStore } from '../store';
import { formatDate, getSlideCount, getQuestionCount, getEstimatedDuration } from '../utils/helpers';
import JSZip from 'jszip';
import {
  Plus, Search, BookOpen, Clock, HelpCircle, MoreVertical,
  Copy, Trash2, Download, Upload, GraduationCap, LayoutGrid,
  List, FileDown, FileUp, Settings, X, FileArchive
} from 'lucide-react';

export function Dashboard() {
  const courses = useStore(s => s.courses);
  const createCourse = useStore(s => s.createCourse);
  const deleteCourse = useStore(s => s.deleteCourse);
  const duplicateCourse = useStore(s => s.duplicateCourse);
  const openCourseEditor = useStore(s => s.openCourseEditor);
  const importCourse = useStore(s => s.importCourse);

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [viewStyle, setViewStyle] = useState<'grid' | 'list'>('grid');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const filtered = courses.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    const id = createCourse(newTitle.trim(), newDescription.trim());
    setNewTitle('');
    setNewDescription('');
    setShowCreateModal(false);
    openCourseEditor(id);
  };

  const handleExportJSON = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;
    const blob = new Blob([JSON.stringify(course, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${course.title.replace(/[^a-z0-9]/gi, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMenuOpen(null);
  };

  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const course = JSON.parse(text);
        if (course.title && course.modules) {
          importCourse(course);
        }
      } catch {
        alert('Invalid course file');
      }
    };
    input.click();
  };

  const [importError, setImportError] = useState<string | null>(null);
  const [importingScorm, setImportingScorm] = useState(false);

  const MODULE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

  /**
   * Convert an EasyGenerator data.js course object into our Course format.
   */
  const convertEasyGeneratorCourse = (egData: any): any => {
    const modules: any[] = [];

    const sections = egData.sections || [];
    for (let si = 0; si < sections.length; si++) {
      const section = sections[si];
      const sectionTitle = section.title?.en || section.title || `Section ${si + 1}`;

      const slides: any[] = [];

      const questions = section.questions || [];
      for (let qi = 0; qi < questions.length; qi++) {
        const q = questions[qi];
        const pageTitle = q.title?.en || q.title || `Page ${qi + 1}`;
        const voiceOver = q.voiceOver?.en || '';

        if (q.type === 'informationContent') {
          // Content slide
          const contentBlocks: any[] = [];

          // Extract text from learningContents
          if (q.learningContents && q.learningContents.length > 0) {
            for (const lc of q.learningContents) {
              const htmlText = extractTextFromLearningContent(lc);
              if (htmlText) {
                contentBlocks.push({
                  id: crypto.randomUUID(),
                  type: 'text',
                  content: htmlText,
                });
              }
            }
          }

          // If no content was extracted, add the title as a heading
          if (contentBlocks.length === 0) {
            contentBlocks.push({
              id: crypto.randomUUID(),
              type: 'heading',
              content: pageTitle,
            });
          }

          slides.push({
            id: crypto.randomUUID(),
            title: pageTitle,
            layout: 'content' as const,
            content: contentBlocks,
            questions: [],
            notes: voiceOver,
            backgroundColor: '#ffffff',
            backgroundImage: '',
            duration: 2,
          });
        } else if (q.type === 'singleSelectText') {
          // Multiple-choice quiz slide
          const quizOptions = (q.answers || []).map((a: any) => ({
            id: a.id || crypto.randomUUID(),
            text: a.text?.en || a.text || '',
            isCorrect: !!a.isCorrect,
          }));

          const correctFeedback = q.questionCorrectFeedbacks?.en || q.questionCorrectFeedbacks || '';
          const incorrectFeedback = q.questionIncorrectFeedbacks?.en || q.questionIncorrectFeedbacks || '';
          const explanation = correctFeedback
            ? `Correct: ${correctFeedback}${incorrectFeedback ? ` | Incorrect: ${incorrectFeedback}` : ''}`
            : '';

          slides.push({
            id: crypto.randomUUID(),
            title: pageTitle,
            layout: 'quiz' as const,
            content: [],
            questions: [{
              id: crypto.randomUUID(),
              type: 'multiple-choice',
              text: pageTitle,
              options: quizOptions,
              matchingPairs: [],
              correctAnswer: '',
              correctOrder: [],
              explanation,
              points: q.scoringMode === 2 ? 10 : 1,
            }],
            notes: voiceOver,
            backgroundColor: '#ffffff',
            backgroundImage: '',
            duration: 3,
          });
        } else if (q.type === 'textMatching') {
          // Matching quiz slide
          const matchingPairs = (q.answers || []).map((a: any) => ({
            id: a.id || crypto.randomUUID(),
            left: a.key?.en || a.key || a.text?.en || '',
            right: a.value?.en || a.value || '',
          }));

          slides.push({
            id: crypto.randomUUID(),
            title: pageTitle,
            layout: 'quiz' as const,
            content: [],
            questions: [{
              id: crypto.randomUUID(),
              type: 'matching',
              text: pageTitle,
              options: [],
              matchingPairs,
              correctAnswer: '',
              correctOrder: [],
              explanation: '',
              points: q.scoringMode === 2 ? 10 : 1,
            }],
            notes: voiceOver,
            backgroundColor: '#ffffff',
            backgroundImage: '',
            duration: 3,
          });
        } else if (q.isSurvey) {
          // Survey/Likert slide
          const quizOptions = (q.answers || []).map((a: any) => ({
            id: a.id || crypto.randomUUID(),
            text: a.text?.en || a.text || '',
            isCorrect: false,
          }));

          slides.push({
            id: crypto.randomUUID(),
            title: pageTitle,
            layout: 'quiz' as const,
            content: [],
            questions: [{
              id: crypto.randomUUID(),
              type: 'likert',
              text: pageTitle,
              options: quizOptions,
              matchingPairs: [],
              correctAnswer: '',
              correctOrder: [],
              explanation: '',
              points: 0,
              likertLabels: quizOptions.map((o: any) => o.text),
            }],
            notes: voiceOver,
            backgroundColor: '#ffffff',
            backgroundImage: '',
            duration: 2,
          });
        } else {
          // Unknown question type — import as content slide with title
          slides.push({
            id: crypto.randomUUID(),
            title: pageTitle,
            layout: 'content' as const,
            content: [{
              id: crypto.randomUUID(),
              type: 'heading',
              content: pageTitle,
            }],
            questions: [],
            notes: voiceOver,
            backgroundColor: '#ffffff',
            backgroundImage: '',
            duration: 2,
          });
        }
      }

      if (slides.length > 0) {
        modules.push({
          id: section.id || crypto.randomUUID(),
          title: sectionTitle,
          description: '',
          order: si,
          thumbnail: section.imageUrl?.en || '',
          color: MODULE_COLORS[si % MODULE_COLORS.length],
          lessons: [{
            id: crypto.randomUUID(),
            title: 'Lesson 1',
            description: '',
            order: 0,
            slides,
          }],
        });
      }
    }

    return {
      id: '',
      title: egData.title?.en || egData.title || 'EasyGenerator Import',
      description: egData.description?.en || egData.description || '',
      author: '',
      version: '1.0',
      language: 'en',
      thumbnail: '',
      tags: ['easygenerator-import'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {},
      modules,
    };
  };

  /**
   * Recursively extract text content from EasyGenerator learningContent nodes.
   */
  const extractTextFromLearningContent = (node: any): string => {
    if (!node) return '';

    // If node has direct text
    if (typeof node === 'string') return node;

    // If node has text property
    if (node.text) return node.text;

    // If node has children, recurse
    if (node.children && Array.isArray(node.children)) {
      return node.children.map((child: any) => extractTextFromLearningContent(child)).filter(Boolean).join('\n');
    }

    return '';
  };

  /**
   * Try to parse a JavaScript response from EasyGenerator CDN into a JSON object.
   * The data.js file may contain: window.courseData = {...}, a plain object, or a function wrapper.
   */
  const parseEasyGeneratorJS = (jsText: string): any => {
    // Try 1: Extract JSON from assignment like "window.courseData = {...}" or "var x = {...}"
    const assignmentMatch = jsText.match(/(?:window\.\w+|(?:var|const|let)\s+\w+)\s*=\s*(\{[\s\S]+\});?\s*$/);
    if (assignmentMatch?.[1]) {
      try { return JSON.parse(assignmentMatch[1]); } catch { /* continue */ }
    }

    // Try 2: Extract the largest JSON-like object
    const objectMatch = jsText.match(/(\{[\s\S]+\})\s*[;)]*\s*$/);
    if (objectMatch?.[1]) {
      try { return JSON.parse(objectMatch[1]); } catch { /* continue */ }
    }

    // Try 3: The whole thing might be JSON
    try { return JSON.parse(jsText); } catch { /* continue */ }

    return null;
  };

  const handleImportSCORM = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setImportError(null);
      try {
        const zip = await JSZip.loadAsync(file);

        // Try to find course-data.js in the zip (our format)
        let courseDataFile = zip.file('content/course-data.js') || zip.file('course-data.js');

        // Also search recursively
        if (!courseDataFile) {
          zip.forEach((path, entry) => {
            if (path.endsWith('course-data.js') && !courseDataFile) {
              courseDataFile = entry;
            }
          });
        }

        if (courseDataFile) {
          // --- Our native SCORM format ---
          const jsContent = await courseDataFile.async('text');

          // Extract JSON from "var COURSE_DATA = {...};"
          const match = jsContent.match(/(?:var|const|let)\s+COURSE_DATA\s*=\s*(\{[\s\S]*\});?\s*$/);
          if (!match || !match[1]) {
            setImportError('Could not parse course data from the SCORM package.');
            return;
          }

          const courseData = JSON.parse(match[1]);

          // Reconstruct a full Course object from the SCORM data
          // The SCORM courseData has: title, description, author, version, language, settings, slides[], modules[]
          const course = {
            id: '',
            title: courseData.title || 'Imported Course',
            description: courseData.description || '',
            author: courseData.author || '',
            version: courseData.version || '1.0',
            language: courseData.language || 'en',
            thumbnail: '',
            tags: [] as string[],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            settings: courseData.settings || {},
            modules: [] as any[],
          };

          // If the SCORM data has the full modules structure (our export includes it)
          if (courseData.modules && courseData.slides) {
            // Rebuild modules from flat slides + module metadata
            let slideIdx = 0;
            const modulesMeta = courseData.modules as any[];
            const allSlides = courseData.slides as any[];

            for (const modMeta of modulesMeta) {
              const mod: any = {
                id: modMeta.id || crypto.randomUUID(),
                title: modMeta.title || 'Module',
                description: modMeta.description || '',
                order: 0,
                thumbnail: modMeta.thumbnail || '',
                color: modMeta.color || '',
                lessons: [{
                  id: crypto.randomUUID(),
                  title: 'Lesson 1',
                  description: '',
                  order: 0,
                  slides: [],
                }],
              };

              // Assign slides to this module based on slideCount
              const modSlideCount = modMeta.slideCount || 0;
              for (let i = 0; i < modSlideCount && slideIdx < allSlides.length; i++) {
                const s = allSlides[slideIdx]!;
                mod.lessons[0].slides.push({
                  id: crypto.randomUUID(),
                  title: s.title || `Slide ${i + 1}`,
                  layout: s.layout || 'content',
                  content: s.content || [],
                  questions: s.questions || [],
                  notes: '',
                  backgroundColor: s.backgroundColor || '#ffffff',
                  backgroundImage: s.backgroundImage || '',
                  duration: s.duration || 2,
                  transition: s.transition,
                  isCoverSlide: s.isCoverSlide,
                  coverSubtitle: s.coverSubtitle,
                  learningObjectives: s.learningObjectives,
                });
                slideIdx++;
              }

              course.modules.push(mod);
            }
          }

          if (course.modules.length === 0) {
            setImportError('No course content found in the SCORM package.');
            return;
          }

          importCourse(course as any);
          setImportError(null);
        } else {
          // --- Try EasyGenerator format ---
          // Detect: look for index.html containing easygenerator.com
          let indexHtmlFile = zip.file('index.html');
          if (!indexHtmlFile) {
            zip.forEach((path, entry) => {
              if (path.endsWith('index.html') && !indexHtmlFile) {
                indexHtmlFile = entry;
              }
            });
          }

          if (!indexHtmlFile) {
            setImportError('This SCORM package was not exported from eLearning Studio or EasyGenerator. Only packages from these tools can be imported.');
            return;
          }

          const htmlContent = await indexHtmlFile.async('text');
          if (!htmlContent.includes('easygenerator.com')) {
            setImportError('This SCORM package was not exported from eLearning Studio or EasyGenerator. Only packages from these tools can be imported.');
            return;
          }

          // Extract baseUrl from the HTML
          const baseUrlMatch = htmlContent.match(/const\s+baseUrl\s*=\s*'(https:\/\/elearning-package\.easygenerator\.com\/[^']+)'/);
          if (!baseUrlMatch?.[1]) {
            setImportError('Could not find EasyGenerator course URL in the package. The index.html may use an unsupported format.');
            return;
          }

          const rawBaseUrl = baseUrlMatch[1];
          // Strip query params to get the clean base path
          const baseUrl = rawBaseUrl.split('?')[0]!.replace(/\/$/, '');
          // Convert CDN URL to local proxy URL to bypass CORS
          const proxyBase = baseUrl.replace('https://elearning-package.easygenerator.com', '/eg-proxy');

          // Fetch course data via proxy
          setImportingScorm(true);
          try {
            const dataResponse = await fetch(`${proxyBase}/content/data.js`);
            if (!dataResponse.ok) {
              throw new Error(`Failed to fetch course data (HTTP ${dataResponse.status}). The course may no longer be available on EasyGenerator's servers.`);
            }

            const dataJsText = await dataResponse.text();
            const egCourseData = parseEasyGeneratorJS(dataJsText);

            if (!egCourseData || !egCourseData.sections) {
              setImportError('Could not parse EasyGenerator course data. The data format may have changed.');
              return;
            }

            // Optionally fetch settings for branding
            let egSettings: any = null;
            try {
              const settingsResponse = await fetch(`${proxyBase}/settings.js`);
              if (settingsResponse.ok) {
                const settingsJsText = await settingsResponse.text();
                egSettings = parseEasyGeneratorJS(settingsJsText);
              }
            } catch {
              // Settings are optional, continue without them
            }

            // Convert to our format
            const course = convertEasyGeneratorCourse(egCourseData);

            // Apply branding from settings if available
            if (egSettings) {
              if (!course.settings) course.settings = {};
              if (egSettings.branding?.colors?.mainColor) {
                course.settings.primaryColor = egSettings.branding.colors.mainColor;
              }
              if (egSettings.branding?.colors?.secondaryColor) {
                course.settings.accentColor = egSettings.branding.colors.secondaryColor;
              }
              if (egSettings.branding?.logo?.url) {
                course.settings.logoUrl = egSettings.branding.logo.url;
              }
            }

            if (course.modules.length === 0) {
              setImportError('No course content found in the EasyGenerator package.');
              return;
            }

            importCourse(course as any);
            setImportError(null);
          } catch (fetchErr) {
            const message = fetchErr instanceof Error ? fetchErr.message : 'Unknown error';
            if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('CORS')) {
              setImportError(
                'Could not fetch course data from EasyGenerator. The course may no longer be available on their servers, or you may be offline. ' +
                'Make sure the dev server is running (npm run dev) — the proxy only works in development mode.'
              );
            } else {
              setImportError(`Failed to import EasyGenerator package: ${message}`);
            }
          } finally {
            setImportingScorm(false);
          }
        }
      } catch (err) {
        setImportError(`Failed to import: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setImportingScorm(false);
      }
    };
    input.click();
  };

  const colorPalette = [
    'from-brand-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-red-600',
    'from-blue-500 to-cyan-600',
    'from-pink-500 to-rose-600',
    'from-amber-500 to-yellow-600',
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Top header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">eLearning Studio</h1>
              <p className="text-xs text-gray-500">Professional Course Authoring Tool</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleImportSCORM} className="btn-secondary">
              <FileArchive className="w-4 h-4" />
              Import SCORM
            </button>
            <button onClick={handleImportJSON} className="btn-secondary">
              <Upload className="w-4 h-4" />
              Import JSON
            </button>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              New Course
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{courses.length}</p>
                  <p className="text-xs text-gray-500">Total Courses</p>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <LayoutGrid className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {courses.reduce((t, c) => t + getSlideCount(c), 0)}
                  </p>
                  <p className="text-xs text-gray-500">Total Slides</p>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {courses.reduce((t, c) => t + getQuestionCount(c), 0)}
                  </p>
                  <p className="text-xs text-gray-500">Total Questions</p>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {courses.reduce((t, c) => t + getEstimatedDuration(c), 0)}m
                  </p>
                  <p className="text-xs text-gray-500">Total Duration</p>
                </div>
              </div>
            </div>
          </div>

          {/* EasyGenerator import loading banner */}
          {importingScorm && (
            <div className="mb-4 flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
              <svg className="w-5 h-5 text-blue-500 flex-shrink-0 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <div className="flex-1">
                <p className="font-medium">Importing from EasyGenerator...</p>
                <p className="mt-0.5 text-blue-600">Fetching course data from CDN. This may take a moment.</p>
              </div>
            </div>
          )}

          {/* Import error banner */}
          {importError && (
            <div className="mb-4 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <HelpCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Import Notice</p>
                <p className="mt-0.5">{importError}</p>
              </div>
              <button onClick={() => setImportError(null)} className="text-amber-400 hover:text-amber-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Search and filter bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewStyle('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewStyle === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewStyle('list')}
                className={`p-1.5 rounded-md transition-colors ${viewStyle === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Course grid/list */}
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {courses.length === 0 ? 'No courses yet' : 'No courses found'}
              </h3>
              <p className="text-gray-500 mb-6">
                {courses.length === 0
                  ? 'Create your first course to get started'
                  : 'Try a different search term'}
              </p>
              {courses.length === 0 && (
                <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                  <Plus className="w-4 h-4" />
                  Create Course
                </button>
              )}
            </div>
          ) : viewStyle === 'grid' ? (
            <div className="grid grid-cols-3 gap-6">
              {filtered.map((course, idx) => (
                <div
                  key={course.id}
                  className="card overflow-hidden group hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => openCourseEditor(course.id)}
                >
                  {/* Course thumbnail */}
                  <div className={`h-36 bg-gradient-to-br ${colorPalette[idx % colorPalette.length]} p-6 relative`}>
                    <h3 className="text-white font-bold text-lg leading-tight line-clamp-2">
                      {course.title}
                    </h3>
                    {course.version && (
                      <span className="absolute top-3 right-3 bg-white/20 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
                        v{course.version}
                      </span>
                    )}
                    {/* Menu button */}
                    <button
                      onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === course.id ? null : course.id); }}
                      className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/30"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {/* Dropdown menu */}
                    {menuOpen === course.id && (
                      <div
                        className="absolute bottom-12 right-3 bg-white rounded-lg shadow-xl border py-1 min-w-[160px] z-10"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => { duplicateCourse(course.id); setMenuOpen(null); }}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                        >
                          <Copy className="w-4 h-4" /> Duplicate
                        </button>
                        <button
                          onClick={() => handleExportJSON(course.id)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                        >
                          <FileDown className="w-4 h-4" /> Export JSON
                        </button>
                        <hr className="my-1" />
                        <button
                          onClick={() => { deleteCourse(course.id); setMenuOpen(null); }}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Course info */}
                  <div className="p-4">
                    {course.description && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{course.description}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          {getSlideCount(course)} slides
                        </span>
                        <span className="flex items-center gap-1">
                          <HelpCircle className="w-3.5 h-3.5" />
                          {getQuestionCount(course)} questions
                        </span>
                      </div>
                      <span>{formatDate(course.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card divide-y">
              {filtered.map((course, idx) => (
                <div
                  key={course.id}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer group"
                  onClick={() => openCourseEditor(course.id)}
                >
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorPalette[idx % colorPalette.length]} flex items-center justify-center flex-shrink-0`}>
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{course.title}</h3>
                    <p className="text-sm text-gray-500 truncate">{course.description || 'No description'}</p>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-gray-400">
                    <span>{course.modules.length} modules</span>
                    <span>{getSlideCount(course)} slides</span>
                    <span>{formatDate(course.updatedAt)}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => { e.stopPropagation(); duplicateCourse(course.id); }}
                      className="btn-icon" title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleExportJSON(course.id); }}
                      className="btn-icon" title="Export"
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); deleteCourse(course.id); }}
                      className="btn-icon text-red-500 hover:text-red-700 hover:bg-red-50" title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Course Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Create New Course</h2>
              <button onClick={() => setShowCreateModal(false)} className="btn-icon">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Course Title *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Introduction to Data Science"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="Brief description of the course..."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreate} className="btn-primary" disabled={!newTitle.trim()}>
                Create Course
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
