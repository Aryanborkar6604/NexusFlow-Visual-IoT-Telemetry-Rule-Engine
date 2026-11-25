import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { MachineProvider, useMachines } from './context/MachineContext.jsx';
import { Navbar } from './components/common/Navbar.jsx';
import { MachineSlideMenu } from './components/common/MachineSlideMenu.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { WorkflowBuilderPage } from './pages/WorkflowBuilderPage.jsx';
import { HistoryPage } from './pages/HistoryPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';

function AppLayout({ children }) {
  const { isMenuOpen, isMenuPinned } = useMachines();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />
      <MachineSlideMenu />
      <main
        className={`flex-1 overflow-x-hidden transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isMenuOpen && isMenuPinned ? 'lg:pl-[360px]' : ''
        }`}
      >
        {children}
      </main>
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
