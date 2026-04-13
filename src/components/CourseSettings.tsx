import { useStore } from '../store';
import type { Course, CourseSettings as CourseSettingsType } from '../types';
import { X, Save } from 'lucide-react';
import { useState } from 'react';

interface Props {
  course: Course;
  onClose: () => void;
}

export function CourseSettings({ course, onClose }: Props) {
  const updateCourse = useStore(s => s.updateCourse);
  const [settings, setSettings] = useState<CourseSettingsType>(course.settings);
  const [meta, setMeta] = useState({
    title: course.title,
    description: course.description,
    author: course.author,
    version: course.version,
    language: course.language,
    tags: course.tags.join(', '),
  });

  const handleSave = () => {
    updateCourse(course.id, {
      ...meta,
      tags: meta.tags.split(',').map(t => t.trim()).filter(Boolean),
      settings,
    });
    onClose();
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Course Settings</h2>
        <button onClick={onClose} className="btn-icon">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-8">
        {/* General Info */}
        <section className="card p-6">
          <h3 className="text-lg font-semibold mb-4">General Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Course Title</label>
              <input
                type="text"
                className="input"
                value={meta.title}
                onChange={e => setMeta({ ...meta, title: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <textarea
                className="input resize-none"
                rows={3}
                value={meta.description}
                onChange={e => setMeta({ ...meta, description: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Author</label>
              <input
                type="text"
                className="input"
                value={meta.author}
                onChange={e => setMeta({ ...meta, author: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Version</label>
              <input
                type="text"
                className="input"
                value={meta.version}
                onChange={e => setMeta({ ...meta, version: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Language</label>
              <select
                className="input"
                value={meta.language}
                onChange={e => setMeta({ ...meta, language: e.target.value })}
              >
                <option value="en">English</option>
                <option value="de">German</option>
                <option value="fr">French</option>
                <option value="es">Spanish</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="nl">Dutch</option>
                <option value="ja">Japanese</option>
                <option value="zh">Chinese</option>
              </select>
            </div>
            <div>
              <label className="label">Tags (comma-separated)</label>
              <input
                type="text"
                className="input"
                value={meta.tags}
                onChange={e => setMeta({ ...meta, tags: e.target.value })}
                placeholder="e.g., onboarding, compliance"
              />
            </div>
          </div>
        </section>

        {/* Quiz Settings */}
        <section className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Quiz & Assessment</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Passing Score (%)</label>
              <input
                type="number"
                className="input"
                min={0}
                max={100}
                value={settings.passingScore}
                onChange={e => setSettings({ ...settings, passingScore: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="label">Max Attempts</label>
              <input
                type="number"
                className="input"
                min={1}
                max={99}
                value={settings.maxAttempts}
                onChange={e => setSettings({ ...settings, maxAttempts: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <label className="label">Completion Criteria</label>
              <select
                className="input"
                value={settings.completionCriteria}
                onChange={e => setSettings({ ...settings, completionCriteria: e.target.value as CourseSettingsType['completionCriteria'] })}
              >
                <option value="all-slides">View all slides</option>
                <option value="passing-score">Pass quiz</option>
                <option value="both">View all slides AND pass quiz</option>
              </select>
            </div>
            <div className="flex flex-col justify-end gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.showFeedback}
                  onChange={e => setSettings({ ...settings, showFeedback: e.target.checked })}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                Show answer feedback
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.allowRetry}
                  onChange={e => setSettings({ ...settings, allowRetry: e.target.checked })}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                Allow quiz retry
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.shuffleQuestions}
                  onChange={e => setSettings({ ...settings, shuffleQuestions: e.target.checked })}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                Shuffle questions
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.showProgress}
                  onChange={e => setSettings({ ...settings, showProgress: e.target.checked })}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                Show progress bar
              </label>
            </div>
          </div>
        </section>

        {/* Branding */}
        <section className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Branding & Appearance</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Primary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={e => setSettings({ ...settings, primaryColor: e.target.value })}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  className="input"
                  value={settings.primaryColor}
                  onChange={e => setSettings({ ...settings, primaryColor: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="label">Accent Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={e => setSettings({ ...settings, accentColor: e.target.value })}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  className="input"
                  value={settings.accentColor}
                  onChange={e => setSettings({ ...settings, accentColor: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="label">Font Family</label>
              <select
                className="input"
                value={settings.fontFamily}
                onChange={e => setSettings({ ...settings, fontFamily: e.target.value })}
              >
                <option value="Inter">Inter</option>
                <option value="Roboto">Roboto</option>
                <option value="Open Sans">Open Sans</option>
                <option value="Lato">Lato</option>
                <option value="Poppins">Poppins</option>
                <option value="Source Sans Pro">Source Sans Pro</option>
                <option value="Georgia">Georgia (Serif)</option>
                <option value="Merriweather">Merriweather (Serif)</option>
              </select>
            </div>
            <div>
              <label className="label">Logo URL</label>
              <input
                type="text"
                className="input"
                placeholder="https://..."
                value={settings.logoUrl}
                onChange={e => setSettings({ ...settings, logoUrl: e.target.value })}
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} className="btn-primary">
            <Save className="w-4 h-4" />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
