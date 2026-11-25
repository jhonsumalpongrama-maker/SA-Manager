import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Drawer from './Drawer';
import { Toaster, SkeletonList } from './Feedback';
import { MessageDialog } from './Dialogs';
import { useAppStore } from '../store/useAppStore';

const PrintDialog = lazy(() => import('../features/print/PrintDialog'));

export default function AppShell() {
  const activeDialog = useAppStore((s) => s.activeDialog);
  const setActiveDialog = useAppStore((s) => s.setActiveDialog);

  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl pb-28">
      <Suspense fallback={<div className="p-4"><SkeletonList rows={5} /></div>}>
        <Outlet />
      </Suspense>
      <Drawer />
      <Toaster />
      <Suspense fallback={null}>{activeDialog === 'print' && <PrintDialog onClose={() => setActiveDialog(null)} />}</Suspense>
      <MessageDialog
        open={activeDialog === 'about'}
        title="SA Manager"
        message={`SA Manager v${__APP_VERSION__} - ${__APP_DESCRIPTION__}`}
        onClose={() => setActiveDialog(null)}
      />
    </div>
  );
}
