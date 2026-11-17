import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Lock,
  Mail,
  User,
  Building2,
  Shield,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  Zap,
  Cpu,
  Flame,
  Radio,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export function LoginPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('manager@nexusflow.io');
  const [password, setPassword] = useState('demo1234');
  const [role, setRole] = useState('manager');
  const [factoryId, setFactoryId] = useState('FACTORY_01');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  // Password strength calculator for registration
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: 'Too short', color: 'bg-slate-700' };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 3) return { score: 2, label: 'Medium', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({ name, email, password, role, factoryId });
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = (demoRole) => {
    setError(null);
    if (demoRole === 'manager') {
      setEmail('manager@nexusflow.io');
      setPassword('demo1234');
    } else if (demoRole === 'engineer') {
      setEmail('engineer@nexusflow.io');
      setPassword('demo1234');
    } else if (demoRole === 'admin') {
      setEmail('admin@nexusflow.io');
      setPassword('demo1234');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 lg:p-8 relative overflow-hidden">
      {/* Background Ambient Glow & Grid */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-5xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl grid grid-cols-1 lg:grid-cols-12 overflow-hidden relative z-10">
        {/* Left Side: Industrial Showcase Panel */}
        <div className="lg:col-span-5 p-8 lg:p-10 bg-gradient-to-br from-slate-900 via-slate-900/95 to-blue-950/40 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col justify-between">
          <div>
            {/* Brand Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25 ring-1 ring-white/20">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-tight">
                  Nexus<span className="text-blue-400">Flow</span>
                </h1>
                <p className="text-[11px] font-mono text-slate-400">IoT Automation Platform</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white tracking-tight leading-snug mb-3">
              Real-time stream orchestration for smart factories.
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Empower plant engineers and floor managers to compose visual automations, smooth noisy telemetry, and trigger instant safety actions.
            </p>

            {/* Platform Metrics */}
            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">&lt; 10ms Reactive Pipeline</div>
                  <div className="text-[10px] text-slate-400">Zero-eval backend stream compiler</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">7 Industrial Machines Connected</div>
                  <div className="text-[10px] text-slate-400">Turbine, Pump, Boiler, Robotic Arm, Compressor</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Cloud MongoDB Atlas Time-Series</div>
                  <div className="text-[10px] text-slate-400">High-throughput micro-batch persistence</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Security Badge */}
          <div className="pt-4 border-t border-slate-800/60 flex items-center gap-2 text-[11px] text-slate-500">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Multi-tenant isolation • JWT authenticated • Production ready</span>
          </div>
        </div>

        {/* Right Side: Interactive Login / Register Form */}
        <div className="lg:col-span-7 p-8 lg:p-10 flex flex-col justify-center">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl mb-6 max-w-sm mx-auto w-full">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="mb-6 text-center">
            <h3 className="text-xl font-bold text-white">
              {mode === 'login' ? 'Welcome Back to NexusFlow' : 'Create Factory Access Account'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {mode === 'login'
                ? 'Sign in to access live sensor streams and workflow canvas'
                : 'Join your plant engineering cluster to start building automations'}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-300 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-white text-xs ml-2">
                ✕
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field (Register Mode Only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Mercer"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Work Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@factory.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-2.5 text-slate-500 hover:text-slate-300 p-0.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Indicator on Register */}
              {mode === 'register' && password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Password Strength:</span>
                    <span className="font-semibold text-slate-300">{strength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex gap-1">
                    <div className={`h-full flex-1 rounded-full ${strength.score >= 1 ? strength.color : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 rounded-full ${strength.score >= 2 ? strength.color : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 rounded-full ${strength.score >= 3 ? strength.color : 'bg-transparent'}`} />
                  </div>
                </div>
              )}
            </div>

            {/* Role & Factory Selectors (Register Mode Only) */}
            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Factory Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="manager">Factory Manager</option>
                    <option value="viewer">Plant Engineer</option>
                    <option value="admin">System Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Factory Plant</label>
                  <div className="relative">
                    <select
                      value={factoryId}
                      onChange={(e) => setFactoryId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="FACTORY_01">FACTORY_01 (Main Plant)</option>
                      <option value="FACTORY_02">FACTORY_02 (Auxiliary Hub)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span>Processing...</span>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In to NexusFlow' : 'Create Free Operator Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Autofill Pills (Login Mode Only) */}
          {mode === 'login' && (
            <div className="mt-6 pt-5 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  1-Click Demo Profiles
                </span>
                <span className="text-[10px] text-blue-400/80 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Quick Switch
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('manager')}
                  className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition-colors cursor-pointer group"
                >
                  <span className="block text-[11px] font-bold text-white group-hover:text-blue-400">Manager</span>
                  <span className="block text-[9px] text-slate-500">FACTORY_01</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('engineer')}
                  className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition-colors cursor-pointer group"
                >
                  <span className="block text-[11px] font-bold text-white group-hover:text-blue-400">Engineer</span>
                  <span className="block text-[9px] text-slate-500">Read-Only</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('admin')}
                  className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition-colors cursor-pointer group"
                >
                  <span className="block text-[11px] font-bold text-white group-hover:text-blue-400">Admin</span>
                  <span className="block text-[9px] text-slate-500">Full Privileges</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
