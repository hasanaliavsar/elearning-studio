import { useState } from 'react';
import { useStore } from '../store';
import { formatDate, getSlideCount, getQuestionCount, getEstimatedDuration } from '../utils/helpers';
import {
  Plus, Search, BookOpen, Clock, HelpCircle, MoreVertical,
  Copy, Trash2, Download, Upload, GraduationCap, LayoutGrid,
  List, FileDown, FileUp, Settings, X
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
            <button onClick={handleImportJSON} className="btn-secondary">
              <Upload className="w-4 h-4" />
              Import
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
