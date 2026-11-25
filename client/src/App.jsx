import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { MachineProvider, useMachines } from './context/MachineContext.jsx';
import { Navbar } from './components/common/Navbar.jsx';
import { MachineSlideMenu } from './components/common/MachineSlideMenu.jsx';
import { ToastContainer } from './components/common/ToastContainer.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { WorkflowBuilderPage } from './pages/WorkflowBuilderPage.jsx';
import { HistoryPage } from './pages/HistoryPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';

function AppLayout({ children }) {
  const { isMenuOpen, isMenuPinned } = useMachines();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative">
      {/* Subtle Ambient Cyber-Physical Backdrop */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b18_1px,transparent_1px),linear-gradient(to_bottom,#1e293b18_1px,transparent_1px)] bg-[size:36px_36px] pointer-events-none z-0" />
      <div className="fixed -top-24 left-1/3 w-[480px] h-[260px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="fixed bottom-0 right-1/4 w-[420px] h-[240px] bg-indigo-600/8 rounded-full blur-3xl pointer-events-none z-0" />

      <Navbar />
      <MachineSlideMenu />
      <main
        className={`flex-1 relative z-10 overflow-x-hidden transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isMenuOpen && isMenuPinned ? 'lg:pl-[360px]' : ''
        }`}
      >
        {children}
      </main>
      <ToastContainer />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <MachineProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <AppLayout>
                    <DashboardPage />
                  </AppLayout>
                }
              />
              <Route
                path="/builder"
                element={
                  <AppLayout>
                    <WorkflowBuilderPage />
                  </AppLayout>
                }
              />
              <Route
                path="/history"
                element={
                  <AppLayout>
                    <HistoryPage />
                  </AppLayout>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </MachineProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
