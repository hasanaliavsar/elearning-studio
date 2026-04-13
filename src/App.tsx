import { useStore } from './store';
import { Dashboard } from './components/Dashboard';
import { CourseEditor } from './components/CourseEditor';
import { CoursePreview } from './components/Preview';
import { ExportDialog } from './components/ExportDialog';

export default function App() {
  const viewMode = useStore(s => s.viewMode);
  const showExportDialog = useStore(s => s.showExportDialog);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {viewMode === 'dashboard' && <Dashboard />}
      {viewMode === 'editor' && <CourseEditor />}
      {viewMode === 'preview' && <CoursePreview />}
      {showExportDialog && <ExportDialog />}
    </div>
  );
}
