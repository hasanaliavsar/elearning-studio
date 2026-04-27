import { useState } from 'react';
import { useStore } from '../store';
import { exportScorm } from '../utils/scorm-exporter';
import type { ScormVersion } from '../types';
import { getSlideCount, getQuestionCount } from '../utils/helpers';
import {
  X, Download, Package, CheckCircle2, AlertCircle, Loader2,
  FileArchive, Settings
} from 'lucide-react';

export function ExportDialog() {
  const course = useStore(s => s.getActiveCourse());
  const setShowExportDialog = useStore(s => s.setShowExportDialog);

  const [scormVersion, setScormVersion] = useState<ScormVersion>('1.2');
  const [packageName, setPackageName] = useState(course?.title.replace(/[^a-z0-9]/gi, '_') || 'course');
  const [isExporting, setIsExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!course) return null;

  const slideCount = getSlideCount(course);
  const questionCount = getQuestionCount(course);
  const moduleCount = course.modules.length;
  const lessonCount = course.modules.reduce((t, m) => t + m.lessons.length, 0);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    try {
      await exportScorm(course, scormVersion, packageName);
      setExportDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    setShowExportDialog(false);
    setExportDone(false);
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-brand-700">
          <div className="flex items-center gap-3">
            <FileArchive className="w-5 h-5 text-white" />
            <h2 className="text-base font-semibold text-white tracking-wide">Export SCORM Package</h2>
          </div>
          <button onClick={handleClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Success state */}
          {exportDone ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Export Successful!</h3>
              <p className="text-sm text-gray-500 mb-4">
                Your SCORM {scormVersion} package has been downloaded.
              </p>
              <p className="text-xs text-gray-400 mb-6">
                Upload the ZIP file to your LMS (Moodle, Canvas, Blackboard, etc.)
              </p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setExportDone(false)} className="btn-secondary">
                  Export Again
                </button>
                <button onClick={handleClose} className="btn-primary">
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Course summary */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">{course.title}</h3>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="font-display text-2xl text-brand-700" style={{ fontWeight: 400 }}>{moduleCount}</p>
                    <p className="text-xs text-gray-500">Modules</p>
                  </div>
                  <div>
                    <p className="font-display text-2xl text-brand-700" style={{ fontWeight: 400 }}>{lessonCount}</p>
                    <p className="text-xs text-gray-500">Lessons</p>
                  </div>
                  <div>
                    <p className="font-display text-2xl text-brand-700" style={{ fontWeight: 400 }}>{slideCount}</p>
                    <p className="text-xs text-gray-500">Slides</p>
                  </div>
                  <div>
                    <p className="font-display text-2xl text-brand-700" style={{ fontWeight: 400 }}>{questionCount}</p>
                    <p className="text-xs text-gray-500">Questions</p>
                  </div>
                </div>
              </div>

              {/* Export options */}
              <div className="space-y-4">
                {/* SCORM Version */}
                <div>
                  <label className="label">SCORM Version</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setScormVersion('1.2')}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        scormVersion === '1.2'
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-semibold text-sm">SCORM 1.2</p>
                      <p className="text-xs text-gray-500 mt-0.5">Widest LMS compatibility</p>
                    </button>
                    <button
                      onClick={() => setScormVersion('2004')}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        scormVersion === '2004'
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-semibold text-sm">SCORM 2004</p>
                      <p className="text-xs text-gray-500 mt-0.5">Advanced sequencing</p>
                    </button>
                  </div>
                </div>

                {/* Package name */}
                <div>
                  <label className="label">Package Name</label>
                  <input
                    type="text"
                    className="input"
                    value={packageName}
                    onChange={e => setPackageName(e.target.value)}
                    placeholder="my-course"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Output: {packageName || 'course'}_SCORM_{scormVersion}.zip
                  </p>
                </div>

                {/* Warnings */}
                {slideCount === 0 && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700">Your course has no slides. Add content before exporting.</p>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button onClick={handleClose} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  className="btn-primary"
                  disabled={isExporting || slideCount === 0}
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Export SCORM {scormVersion}
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
