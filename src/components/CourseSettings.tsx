import { useStore } from '../store';
import type { Course, CourseSettings as CourseSettingsType, ThemeTemplate } from '../types';
import { X, Save, Award, Eye } from 'lucide-react';
import { useState } from 'react';
import { AISettingsSection } from './AIGenerator';

const THEME_OPTIONS: { id: ThemeTemplate; label: string; primary: string; accent: string; swatch: React.CSSProperties }[] = [
  { id: 'modern', label: 'Modern', primary: '#4f46e5', accent: '#ffffff', swatch: { background: 'linear-gradient(135deg, #4f46e5 60%, #ffffff 60%)' } },
  { id: 'corporate', label: 'Corporate', primary: '#1e3a5f', accent: '#6b7280', swatch: { background: 'linear-gradient(135deg, #1e3a5f 60%, #6b7280 60%)' } },
  { id: 'playful', label: 'Playful', primary: '#ec4899', accent: '#8b5cf6', swatch: { background: 'linear-gradient(135deg, #ec4899 50%, #8b5cf6 50%)' } },
  { id: 'dark', label: 'Dark', primary: '#0f172a', accent: '#22d3ee', swatch: { background: 'linear-gradient(135deg, #0f172a 60%, #22d3ee 60%)' } },
  { id: 'minimal', label: 'Minimal', primary: '#18181b', accent: '#f4f4f5', swatch: { background: 'linear-gradient(135deg, #18181b 60%, #f4f4f5 60%)' } },
  { id: 'elegant', label: 'Elegant', primary: '#7f1d1d', accent: '#d97706', swatch: { background: 'linear-gradient(135deg, #7f1d1d 60%, #d97706 60%)' } },
  { id: 'moonfare', label: 'Moonfare', primary: '#171D97', accent: '#101321', swatch: { background: 'linear-gradient(135deg, #101321 30%, #121648 50%, #171D97 70%, #968F83 100%)' } },
];

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
        {/* Course Landing Page */}
        <section className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Course Landing Page</h3>
          <label className="flex items-center gap-2 text-sm mb-4">
            <input
              type="checkbox"
              checked={settings.landingPage.enabled}
              onChange={e => setSettings({ ...settings, landingPage: { ...settings.landingPage, enabled: e.target.checked } })}
              className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            Show landing page when course opens
          </label>
          {settings.landingPage.enabled && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Background Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.landingPage.backgroundColor}
                      onChange={e => setSettings({ ...settings, landingPage: { ...settings.landingPage, backgroundColor: e.target.value } })}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <input
                      type="text"
                      className="input"
                      value={settings.landingPage.backgroundColor}
                      onChange={e => setSettings({ ...settings, landingPage: { ...settings.landingPage, backgroundColor: e.target.value } })}
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Text Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.landingPage.textColor}
                      onChange={e => setSettings({ ...settings, landingPage: { ...settings.landingPage, textColor: e.target.value } })}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <input
                      type="text"
                      className="input"
                      value={settings.landingPage.textColor}
                      onChange={e => setSettings({ ...settings, landingPage: { ...settings.landingPage, textColor: e.target.value } })}
                    />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="label">Background Gradient</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. linear-gradient(135deg, #fdf0e8, #fce7f3)"
                    value={settings.landingPage.backgroundGradient}
                    onChange={e => setSettings({ ...settings, landingPage: { ...settings.landingPage, backgroundGradient: e.target.value } })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="label">Hero Image URL</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="https://..."
                    value={settings.landingPage.heroImageUrl}
                    onChange={e => setSettings({ ...settings, landingPage: { ...settings.landingPage, heroImageUrl: e.target.value } })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="label">Tagline</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Investing is legacy."
                    value={settings.landingPage.tagline}
                    onChange={e => setSettings({ ...settings, landingPage: { ...settings.landingPage, tagline: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="label">Company Logo URL</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="https://..."
                    value={settings.landingPage.companyLogoUrl}
                    onChange={e => setSettings({ ...settings, landingPage: { ...settings.landingPage, companyLogoUrl: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="label">Company Name</label>
                  <input
                    type="text"
                    className="input"
                    value={settings.landingPage.companyName}
                    onChange={e => setSettings({ ...settings, landingPage: { ...settings.landingPage, companyName: e.target.value } })}
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={settings.landingPage.showModuleList}
                      onChange={e => setSettings({ ...settings, landingPage: { ...settings.landingPage, showModuleList: e.target.checked } })}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    Show Module List
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={settings.landingPage.showProgress}
                      onChange={e => setSettings({ ...settings, landingPage: { ...settings.landingPage, showProgress: e.target.checked } })}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    Show Progress Bar
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={settings.landingPage.showCompanyLogo}
                      onChange={e => setSettings({ ...settings, landingPage: { ...settings.landingPage, showCompanyLogo: e.target.checked } })}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    Show Company Logo
                  </label>
                </div>
              </div>

              {/* Live Preview */}
              <div>
                <label className="label mb-2 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  Preview
                </label>
                <div
                  className="relative rounded-lg overflow-hidden border border-gray-200"
                  style={{ height: 200 }}
                >
                  <div className="flex h-full">
                    {/* Left panel */}
                    <div
                      className="flex-1 flex flex-col justify-center px-6 py-4"
                      style={{
                        background: settings.landingPage.backgroundGradient || settings.landingPage.backgroundColor,
                        color: settings.landingPage.textColor,
                      }}
                    >
                      {settings.landingPage.showCompanyLogo && settings.landingPage.companyLogoUrl ? (
                        <img
                          src={settings.landingPage.companyLogoUrl}
                          alt="Logo"
                          className="h-5 w-auto object-contain mb-2"
                          style={{ maxWidth: 80 }}
                        />
                      ) : settings.landingPage.showCompanyLogo && settings.landingPage.companyName ? (
                        <span className="text-[10px] font-semibold opacity-70 mb-2">
                          {settings.landingPage.companyName}
                        </span>
                      ) : null}
                      <div className="text-sm font-bold leading-tight mb-1" style={{ color: settings.landingPage.textColor }}>
                        {meta.title || 'Course Title'}
                      </div>
                      {settings.landingPage.tagline && (
                        <div className="text-[10px] opacity-70" style={{ color: settings.landingPage.textColor }}>
                          {settings.landingPage.tagline}
                        </div>
                      )}
                      {settings.landingPage.showProgress && (
                        <div className="mt-3 w-3/4">
                          <div className="h-1 rounded-full bg-white/30">
                            <div className="h-1 rounded-full bg-white/80" style={{ width: '35%' }} />
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Right panel */}
                    <div className="w-2/5 bg-white flex flex-col justify-center px-4 py-3 border-l border-gray-100">
                      {settings.landingPage.showModuleList ? (
                        <div className="space-y-2">
                          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Modules</div>
                          {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-gray-100 flex items-center justify-center text-[8px] text-gray-400 font-bold">{i}</div>
                              <div className="h-2 rounded bg-gray-100 flex-1" />
                            </div>
                          ))}
                          <div className="text-[9px] text-gray-300 mt-1">{course.modules.length} module{course.modules.length !== 1 ? 's' : ''}</div>
                        </div>
                      ) : settings.landingPage.heroImageUrl ? (
                        <img
                          src={settings.landingPage.heroImageUrl}
                          alt="Hero"
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-300 text-xs">
                          Right panel
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

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

        {/* Theme Templates */}
        <section className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Theme Templates</h3>
          <div className="grid grid-cols-3 gap-3">
            {THEME_OPTIONS.map(theme => (
              <button
                key={theme.id}
                type="button"
                className={`relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  settings.theme === theme.id
                    ? 'border-brand-600 ring-2 ring-brand-200 bg-brand-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
                onClick={() =>
                  setSettings({
                    ...settings,
                    theme: theme.id,
                    primaryColor: theme.primary,
                    accentColor: theme.accent,
                  })
                }
              >
                <div
                  className="w-full h-10 rounded-md border border-gray-200"
                  style={theme.swatch}
                />
                <span className="text-sm font-medium text-gray-700">{theme.label}</span>
                {settings.theme === theme.id && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-brand-600" />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Animations & Transitions */}
        <section className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Animations &amp; Transitions</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Default Slide Transition</label>
              <select
                className="input"
                value={settings.defaultTransition}
                onChange={e =>
                  setSettings({ ...settings, defaultTransition: e.target.value as CourseSettingsType['defaultTransition'] })
                }
              >
                <option value="none">None</option>
                <option value="fade">Fade</option>
                <option value="slide-left">Slide Left</option>
                <option value="slide-up">Slide Up</option>
                <option value="zoom">Zoom</option>
              </select>
            </div>
            <div>
              <label className="label">Default Block Entrance Animation</label>
              <select
                className="input"
                value={settings.defaultAnimation}
                onChange={e =>
                  setSettings({ ...settings, defaultAnimation: e.target.value as CourseSettingsType['defaultAnimation'] })
                }
              >
                <option value="none">None</option>
                <option value="fade-in">Fade In</option>
                <option value="slide-up">Slide Up</option>
                <option value="slide-left">Slide Left</option>
                <option value="slide-right">Slide Right</option>
                <option value="zoom-in">Zoom In</option>
                <option value="bounce-in">Bounce In</option>
              </select>
            </div>
            <div className="col-span-2 flex flex-col gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.enableScrollReveal}
                  onChange={e => setSettings({ ...settings, enableScrollReveal: e.target.checked })}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                Enable scroll-reveal animations
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.enableKeyboardNav}
                  onChange={e => setSettings({ ...settings, enableKeyboardNav: e.target.checked })}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                Enable keyboard navigation
              </label>
            </div>
          </div>
        </section>

        {/* Completion Certificate */}
        <section className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Completion Certificate</h3>
          <label className="flex items-center gap-2 text-sm mb-4">
            <input
              type="checkbox"
              checked={settings.showCertificate}
              onChange={e => setSettings({ ...settings, showCertificate: e.target.checked })}
              className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            Show completion certificate
          </label>
          {settings.showCertificate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Certificate Title</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Certificate of Completion"
                    value={settings.certificateTitle}
                    onChange={e => setSettings({ ...settings, certificateTitle: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Organization Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Your Organization"
                    value={settings.certificateOrg}
                    onChange={e => setSettings({ ...settings, certificateOrg: e.target.value })}
                  />
                </div>
              </div>

              {/* Certificate Preview */}
              <div>
                <label className="label mb-2">Preview</label>
                <div
                  className="relative mx-auto bg-white rounded-lg p-6 text-center"
                  style={{
                    maxWidth: 420,
                    border: `3px double ${settings.primaryColor}`,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  }}
                >
                  <div
                    className="absolute inset-2 rounded pointer-events-none"
                    style={{ border: `1px solid ${settings.accentColor}` }}
                  />
                  <Award className="w-8 h-8 mx-auto mb-2" style={{ color: settings.primaryColor }} />
                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">This certifies that</p>
                  <p className="text-lg font-semibold text-gray-800 mb-1">[Learner Name]</p>
                  <p className="text-xs text-gray-400 mb-3">has successfully completed</p>
                  <p className="text-sm font-bold mb-1" style={{ color: settings.primaryColor }}>
                    {settings.certificateTitle || 'Certificate of Completion'}
                  </p>
                  {settings.certificateOrg && (
                    <p className="text-xs text-gray-500">{settings.certificateOrg}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-3">
                    {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* AI Assistant */}
        <section className="card p-6">
          <h3 className="text-lg font-semibold mb-4">AI Assistant</h3>
          <AISettingsSection />
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
