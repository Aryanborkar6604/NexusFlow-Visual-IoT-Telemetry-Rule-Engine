import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, GitMerge, Bell, Flame, Wifi, WifiOff } from 'lucide-react';
import { useSocket } from '../../context/SocketContext.jsx';
import { alertService } from '../../services/alertService.js';

export function Navbar() {
  const location = useLocation();
  const { isConnected } = useSocket();

  const handleTriggerSpike = async () => {
    try {
      await alertService.triggerTestSpike('TURBINE_001', 89.2);
    } catch (err) {
      console.error('Spike trigger failed:', err);
    }
  };

  const navLinks = [
    { to: '/', label: 'Live Dashboard', icon: Activity },
    { to: '/builder', label: 'Workflow Builder', icon: GitMerge },
    { to: '/history', label: 'Alert History', icon: Bell },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-tight">Nexus<span className="text-blue-400">Flow</span></span>
            <span className="hidden sm:inline-block ml-2 text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">IoT Automation</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Actions & Status */}
        <div className="flex items-center gap-3">
          {/* Quick Demo Spike Trigger */}
          <button
            onClick={handleTriggerSpike}
            title="Inject simulated 89°C turbine spike to trigger alert"
            className="flex items-center gap-1.5 text-xs bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 px-2.5 py-1.5 rounded-md font-medium transition-all shadow-sm active:scale-95"
          >
            <Flame className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span className="hidden sm:inline">Simulate Spike</span>
          </button>

          {/* Socket.IO Connection Pill */}
          <div
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
              isConnected
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                : 'bg-amber-950/60 text-amber-300 border-amber-800/60 animate-pulse'
            }`}
          >
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline font-mono">LIVE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline font-mono">RECONNECTING</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
