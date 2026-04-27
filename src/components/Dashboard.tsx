import { useState } from 'react';
import { useStore } from '../store';
import { formatDate, getSlideCount, getQuestionCount, getEstimatedDuration } from '../utils/helpers';
import JSZip from 'jszip';
import {
  Plus, Search, MoreVertical, Copy, Trash2, Upload,
  X, FileArchive, Wand2, FileDown,
} from 'lucide-react';
import { AIGenerateCourseModal } from './AIGenerator';

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
  const [filter, setFilter] = useState<'all' | 'published' | 'drafts'>('all');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importingScorm, setImportingScorm] = useState(false);

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

  // SCORM/EasyGenerator import — full logic preserved from original.
  const MODULE_COLORS = ['#171D97', '#101258', '#0A0C3F', '#2B3AB8', '#5B66CF', '#8C95E1'];

  const extractTextFromLearningContent = (node: any): string => {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (node.text) return node.text;
    if (node.children && Array.isArray(node.children)) {
      return node.children.map((c: any) => extractTextFromLearningContent(c)).filter(Boolean).join('\n');
    }
    return '';
  };

  const parseEasyGeneratorJS = (jsText: string): any => {
    const m1 = jsText.match(/(?:window\.\w+|(?:var|const|let)\s+\w+)\s*=\s*(\{[\s\S]+\});?\s*$/);
    if (m1?.[1]) { try { return JSON.parse(m1[1]); } catch {} }
    const m2 = jsText.match(/(\{[\s\S]+\})\s*[;)]*\s*$/);
    if (m2?.[1]) { try { return JSON.parse(m2[1]); } catch {} }
    try { return JSON.parse(jsText); } catch {}
    return null;
  };

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
          const blocks: any[] = [];
          if (q.learningContents?.length) {
            for (const lc of q.learningContents) {
              const t = extractTextFromLearningContent(lc);
              if (t) blocks.push({ id: crypto.randomUUID(), type: 'text', content: t });
            }
          }
          if (!blocks.length) blocks.push({ id: crypto.randomUUID(), type: 'heading', content: pageTitle });
          slides.push({ id: crypto.randomUUID(), title: pageTitle, layout: 'content', content: blocks, questions: [], notes: voiceOver, backgroundColor: '#FFFFFF', backgroundImage: '', duration: 2 });
        } else if (q.type === 'singleSelectText') {
          const opts = (q.answers || []).map((a: any) => ({ id: a.id || crypto.randomUUID(), text: a.text?.en || a.text || '', isCorrect: !!a.isCorrect }));
          const cf = q.questionCorrectFeedbacks?.en || q.questionCorrectFeedbacks || '';
          const ic = q.questionIncorrectFeedbacks?.en || q.questionIncorrectFeedbacks || '';
          const expl = cf ? `Correct: ${cf}${ic ? ` | Incorrect: ${ic}` : ''}` : '';
          slides.push({ id: crypto.randomUUID(), title: pageTitle, layout: 'quiz', content: [], questions: [{ id: crypto.randomUUID(), type: 'multiple-choice', text: pageTitle, options: opts, matchingPairs: [], correctAnswer: '', correctOrder: [], explanation: expl, points: q.scoringMode === 2 ? 10 : 1 }], notes: voiceOver, backgroundColor: '#FFFFFF', backgroundImage: '', duration: 3 });
        } else {
          slides.push({ id: crypto.randomUUID(), title: pageTitle, layout: 'content', content: [{ id: crypto.randomUUID(), type: 'heading', content: pageTitle }], questions: [], notes: voiceOver, backgroundColor: '#FFFFFF', backgroundImage: '', duration: 2 });
        }
      }
      if (slides.length) {
        modules.push({ id: section.id || crypto.randomUUID(), title: sectionTitle, description: '', order: si, thumbnail: section.imageUrl?.en || '', color: MODULE_COLORS[si % MODULE_COLORS.length], lessons: [{ id: crypto.randomUUID(), title: 'Lesson 1', description: '', order: 0, slides }] });
      }
    }
    return {
      id: '', title: egData.title?.en || egData.title || 'EasyGenerator Import',
      description: egData.description?.en || egData.description || '',
      author: '', version: '1.0', language: 'en', thumbnail: '', tags: ['easygenerator-import'],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      settings: {
        passingScore: 70, showFeedback: true, allowRetry: true, maxAttempts: 3,
        shuffleQuestions: false, showProgress: true, completionCriteria: 'all-slides',
        primaryColor: '#171D97', accentColor: '#0A0C3F', fontFamily: 'Inter', logoUrl: '',
        theme: 'moonfare', defaultTransition: 'fade', defaultAnimation: 'slide-up',
        showCertificate: true, certificateTitle: 'Certificate of Completion', certificateOrg: '',
        enableScrollReveal: false, enableKeyboardNav: true,
        landingPage: { enabled: true, backgroundColor: '#171D97', backgroundGradient: 'linear-gradient(160deg, #0A0C3F 0%, #101258 50%, #171D97 100%)', textColor: '#FFFFFF', showModuleList: true, showProgress: true, showCompanyLogo: false, companyLogoUrl: '', companyName: '', tagline: '', heroImageUrl: '' },
      },
      modules,
    };
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
        let courseDataFile = zip.file('content/course-data.js') || zip.file('course-data.js');
        if (!courseDataFile) zip.forEach((p, ent) => { if (p.endsWith('course-data.js') && !courseDataFile) courseDataFile = ent; });
        if (courseDataFile) {
          const jsContent = await courseDataFile.async('text');
          const m = jsContent.match(/(?:var|const|let)\s+COURSE_DATA\s*=\s*(\{[\s\S]*\});?\s*$/);
          if (!m?.[1]) { setImportError('Could not parse course data from the SCORM package.'); return; }
          const courseData = JSON.parse(m[1]);
          const course: any = {
            id: '', title: courseData.title || 'Imported Course', description: courseData.description || '',
            author: courseData.author || '', version: courseData.version || '1.0', language: courseData.language || 'en',
            thumbnail: '', tags: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            settings: {
              passingScore: 70, showFeedback: true, allowRetry: true, maxAttempts: 3, shuffleQuestions: false,
              showProgress: true, completionCriteria: 'all-slides', primaryColor: '#171D97', accentColor: '#0A0C3F',
              fontFamily: 'Inter', logoUrl: '', theme: 'moonfare', defaultTransition: 'fade', defaultAnimation: 'fade-in',
              showCertificate: true, certificateTitle: 'Certificate of Completion', certificateOrg: '',
              enableScrollReveal: false, enableKeyboardNav: true,
              landingPage: { enabled: true, backgroundColor: '#171D97', backgroundGradient: 'linear-gradient(160deg, #0A0C3F 0%, #101258 50%, #171D97 100%)', textColor: '#FFFFFF', showModuleList: true, showProgress: true, showCompanyLogo: false, companyLogoUrl: '', companyName: '', tagline: '', heroImageUrl: '' },
              ...(courseData.settings || {}),
            },
            modules: [] as any[],
          };
          if (courseData.modules && courseData.slides) {
            let idx = 0; const meta = courseData.modules; const all = courseData.slides;
            for (const mm of meta) {
              const mod: any = { id: mm.id || crypto.randomUUID(), title: mm.title || 'Module', description: mm.description || '', order: 0, thumbnail: mm.thumbnail || '', color: mm.color || '', lessons: [{ id: crypto.randomUUID(), title: 'Lesson 1', description: '', order: 0, slides: [] }] };
              const cnt = mm.slideCount || 0;
              for (let i = 0; i < cnt && idx < all.length; i++) {
                const s = all[idx]!;
                mod.lessons[0].slides.push({ id: crypto.randomUUID(), title: s.title || `Slide ${i+1}`, layout: s.layout || 'content', content: s.content || [], questions: s.questions || [], notes: '', backgroundColor: s.backgroundColor || '#FFFFFF', backgroundImage: s.backgroundImage || '', duration: s.duration || 2, transition: s.transition, isCoverSlide: s.isCoverSlide, coverSubtitle: s.coverSubtitle, learningObjectives: s.learningObjectives });
                idx++;
              }
              course.modules.push(mod);
            }
          }
          if (!course.modules.length) { setImportError('No course content found in the SCORM package.'); return; }
          importCourse(course);
        } else {
          let idx = zip.file('index.html');
          if (!idx) zip.forEach((p, ent) => { if (p.endsWith('index.html') && !idx) idx = ent; });
          if (!idx) { setImportError('Unsupported SCORM package format.'); return; }
          const html = await idx.async('text');
          if (!html.includes('easygenerator.com')) { setImportError('Unsupported SCORM package format.'); return; }
          const um = html.match(/const\s+baseUrl\s*=\s*'(https:\/\/elearning-package\.easygenerator\.com\/[^']+)'/);
          if (!um?.[1]) { setImportError('Could not find course URL in package.'); return; }
          const baseUrl = um[1].split('?')[0]!.replace(/\/$/, '');
          const proxyBase = baseUrl.replace('https://elearning-package.easygenerator.com', '/eg-proxy');
          setImportingScorm(true);
          try {
            const r = await fetch(`${proxyBase}/content/data.js`);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const data = parseEasyGeneratorJS(await r.text());
            if (!data?.sections) { setImportError('Could not parse EasyGenerator course data.'); return; }
            const course = convertEasyGeneratorCourse(data);
            if (!course.modules.length) { setImportError('No content in package.'); return; }
            importCourse(course);
          } catch (err) {
            setImportError(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
          } finally { setImportingScorm(false); }
        }
      } catch (err) {
        setImportError(`Failed to import: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setImportingScorm(false);
      }
    };
    input.click();
  };

  return (
    <div className="h-full flex flex-col bg-ivory-50">
      {/* ─── Header ─── */}
      <header className="bg-white border-b border-ivory-200 px-10 py-5">
        <div className="max-w-[1180px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <img src="/moonfare-wordmark-blue.png" alt="Moonfare" className="h-[22px]" />
            <div className="w-px h-5 bg-ivory-200" />
            <span className="text-sm text-ink-muted tracking-wide">Learning Studio</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button onClick={handleImportSCORM} className="btn-secondary">
              <FileArchive className="w-4 h-4" />
              Import SCORM
            </button>
            <button onClick={handleImportJSON} className="btn-secondary">
              <Upload className="w-4 h-4" />
              Import JSON
            </button>
            <button onClick={() => setShowAIGenerator(true)} className="btn-secondary">
              <Wand2 className="w-4 h-4" />
              AI Generate
            </button>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              New course
            </button>
          </div>
        </div>
      </header>

      {/* ─── Main ─── */}
      <main className="flex-1 overflow-auto px-10 pt-9 pb-16">
        <div className="max-w-[1180px] mx-auto">

          {/* Hero — typographic */}
          <div className="mb-8">
            <h1 className="font-display text-5xl text-brand-800 leading-[1.05] m-0" style={{ fontWeight: 400 }}>
              Courses
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              <span className="text-ink font-medium">{courses.length} {courses.length === 1 ? 'course' : 'courses'}</span>
              <span className="mx-2.5 text-ivory-200">·</span>
              <span>{courses.reduce((s, c) => s + getSlideCount(c), 0)} slides</span>
              <span className="mx-2.5 text-ivory-200">·</span>
              <span>{courses.reduce((s, c) => s + getQuestionCount(c), 0)} questions</span>
              <span className="mx-2.5 text-ivory-200">·</span>
              <span>{courses.reduce((s, c) => s + getEstimatedDuration(c), 0)} min</span>
            </p>
          </div>

          {/* Loading banner */}
          {importingScorm && (
            <div className="mb-4 flex items-center gap-3 p-4 bg-brand-50 border border-brand-100 rounded-md text-sm" style={{ color: '#0A0C3F' }}>
              <svg className="w-5 h-5 animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none" style={{ color: '#171D97' }}>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <div className="flex-1">
                <p className="font-medium">Importing from EasyGenerator…</p>
                <p className="mt-0.5 text-ink-muted">Fetching course data from CDN.</p>
              </div>
            </div>
          )}

          {importError && (
            <div className="mb-4 flex items-start gap-3 p-4 rounded-md text-sm" style={{ backgroundColor: '#F7EFD9', borderColor: '#E0CD9C', color: '#8A6512', borderWidth: 1 }}>
              <div className="flex-1">
                <p className="font-medium">Import notice</p>
                <p className="mt-0.5">{importError}</p>
              </div>
              <button onClick={() => setImportError(null)} className="opacity-60 hover:opacity-100">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Search + filter rail */}
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-ivory-200">
            <div className="relative w-80">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-0 outline-none pl-7 text-sm text-ink placeholder:text-ink-faint"
              />
            </div>
            <div className="flex gap-5 text-[13px]">
              {(['all', 'published', 'drafts'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`pb-1 capitalize transition-colors ${
                    filter === f ? 'text-ink font-medium border-b-[1.5px] border-brand-600' : 'text-ink-muted hover:text-ink'
                  }`}
                  style={filter === f ? { borderColor: '#171D97' } : {}}
                >{f}</button>
              ))}
            </div>
          </div>

          {/* Course grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <h3 className="font-display text-2xl text-brand-800 mb-2" style={{ fontWeight: 400 }}>
                {courses.length === 0 ? 'No courses yet' : 'No matching courses'}
              </h3>
              <p className="text-ink-muted mb-6">
                {courses.length === 0 ? 'Create your first course to get started.' : 'Try a different search term.'}
              </p>
              {courses.length === 0 && (
                <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                  <Plus className="w-4 h-4" />
                  Create course
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6">
              {filtered.map((course, idx) => {
                const isDeep = idx % 2 === 1;
                const bgColor = isDeep ? '#0A0C3F' : '#171D97';
                return (
                  <article
                    key={course.id}
                    className="bg-white rounded-lg border border-ivory-200 overflow-hidden cursor-pointer transition-shadow hover:shadow-raise group"
                    onClick={() => openCourseEditor(course.id)}
                  >
                    {/* Typographic cover */}
                    <div
                      className="h-40 relative px-6 py-5 flex flex-col justify-between"
                      style={{ backgroundColor: bgColor }}
                    >
                      {/* Watermark monogram */}
                      <img
                        src="/moonfare-monogram-white.png"
                        alt=""
                        className="absolute -right-5 -bottom-5 h-40 opacity-[0.08] pointer-events-none"
                      />

                      {/* Top row: meta + menu */}
                      <div className="flex items-start justify-between relative z-10">
                        <div className="text-[11px] uppercase tracking-[0.12em] text-white/60 font-medium">
                          {course.modules.length} {course.modules.length === 1 ? 'module' : 'modules'} · {getSlideCount(course)} slides
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === course.id ? null : course.id); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-md flex items-center justify-center text-white hover:bg-white/15"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Title */}
                      <div
                        className="font-display text-2xl text-white leading-[1.15] relative z-10"
                        style={{ fontWeight: 400, letterSpacing: '-0.01em', textWrap: 'balance' as any }}
                      >
                        {course.title}
                      </div>

                      {/* Dropdown menu */}
                      {menuOpen === course.id && (
                        <div
                          className="absolute top-12 right-3 bg-white rounded-md shadow-lift border border-ivory-200 py-1 min-w-[160px] z-20"
                          onClick={e => e.stopPropagation()}
                        >
                          <button onClick={() => { duplicateCourse(course.id); setMenuOpen(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-ivory-100 w-full">
                            <Copy className="w-4 h-4" /> Duplicate
                          </button>
                          <button onClick={() => handleExportJSON(course.id)} className="flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-ivory-100 w-full">
                            <FileDown className="w-4 h-4" /> Export JSON
                          </button>
                          <hr className="my-1 border-ivory-200" />
                          <button onClick={() => { deleteCourse(course.id); setMenuOpen(null); }} className="flex items-center gap-2 px-3 py-2 text-sm w-full hover:bg-red-50" style={{ color: '#A8341F' }}>
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Body */}
                    <div className="px-5 py-4">
                      <p className="text-[13.5px] text-ink-muted leading-[1.5] m-0 line-clamp-2 min-h-[40px]">
                        {course.description || 'No description.'}
                      </p>
                      <div className="flex justify-between items-center mt-4 text-xs text-ink-faint">
                        <span>Updated {formatDate(course.updatedAt)}</span>
                        <span className="px-2.5 py-0.5 rounded-full font-medium text-[11px] tracking-wide" style={{ backgroundColor: '#E6F2EC', color: '#2D7A50' }}>
                          Published
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Create modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-lg shadow-lift w-full max-w-md p-7" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl text-brand-800" style={{ fontWeight: 400 }}>New course</h2>
              <button onClick={() => setShowCreateModal(false)} className="btn-icon">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Investor Onboarding Standards"
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
            <div className="flex justify-end gap-3 mt-7">
              <button onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreate} className="btn-primary" disabled={!newTitle.trim()}>
                Create course
              </button>
            </div>
          </div>
        </div>
      )}

      <AIGenerateCourseModal open={showAIGenerator} onClose={() => setShowAIGenerator(false)} />
    </div>
  );
}
