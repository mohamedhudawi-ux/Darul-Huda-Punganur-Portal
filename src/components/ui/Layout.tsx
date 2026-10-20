import React, { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { LogOut, LayoutDashboard, Settings, FileText, CheckSquare, ChevronDown, Download, Menu, X, Smartphone, Sparkles, Cloud, CloudOff, RefreshCw, Users, BookOpen, Printer, History, HelpCircle, Play, ChevronRight, GraduationCap, Trophy, ShieldCheck } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { InstallModal } from './InstallModal';
import { motion, AnimatePresence } from 'motion/react';

export function Layout({ children }: { children: React.ReactNode }) {
  const { currentUser, logout, originalAdminId, stopImpersonating, settings, syncStatus, forceCloudRefresh, lastSyncTime, users } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  const originalAdmin = users?.find(u => u.id === originalAdminId);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      try {
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
          setInstallPrompt(null);
          return;
        }
      } catch (err) {
        console.log("Install prompt error:", err);
      }
    }
    setIsInstallModalOpen(true);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleReturnToAdmin = () => {
    stopImpersonating();
    // Use a small delay to ensure state has started transitioning
    setTimeout(() => {
      navigate('/admin');
    }, 10);
  };

  const NavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
    const fullPath = location.pathname + location.search;
    const isActive = fullPath === to || (to === '/admin' && fullPath.startsWith('/admin?')) || (to === '/teacher' && fullPath.startsWith('/teacher')) || (to === '/student' && fullPath.startsWith('/student'));
    
    // For admin, if we are on /admin without a tab, the first item should be active if it matches the default
    const isActuallyActive = isActive || (to === '/admin?tab=users' && fullPath === '/admin');

    return (
      <button 
        onClick={() => {
          navigate(to);
          setIsSidebarOpen(false);
        }} 
        className={`group w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all mb-1 ${isActuallyActive ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
      >
        <div className="flex items-center">
          <Icon className={`w-5 h-5 mr-3 transition-transform group-hover:scale-110 ${isActuallyActive ? 'text-slate-900' : 'text-slate-500'}`} />
          {label}
        </div>
        {isActuallyActive && <motion.div layoutId="nav-indicator"><ChevronRight className="w-4 h-4 opacity-50" /></motion.div>}
      </button>
    );
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-900 print:bg-white print:block">
      {/* Install App Guidance Modal */}
      <InstallModal 
        isOpen={isInstallModalOpen} 
        onClose={() => setIsInstallModalOpen(false)} 
        installPrompt={installPrompt} 
      />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-72 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 print:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="w-10 h-10 rounded object-cover bg-white p-0.5" />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center font-black text-slate-900 text-lg shadow-sm">
                {settings?.name ? settings.name.charAt(0).toUpperCase() : 'G'}
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <h1 className="text-white font-black leading-tight tracking-tight text-lg truncate" title={settings?.name || "GRAND CAMPUS"}>
                {settings?.name ? settings.name.toUpperCase() : "GRAND CAMPUS"}
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-amber-400 font-bold leading-none mt-1">Assurance Portal</p>
            </div>
            <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 px-4 py-6 overflow-y-auto">
          {currentUser ? (
            <nav className="space-y-1">
              <NavItem to={`/${currentUser.role}`} icon={LayoutDashboard} label="Dashboard" />
              
              {currentUser.role === 'admin' && (
                <>
                  <div className="pt-4 pb-2 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Management</div>
                  <NavItem to="/admin?tab=users" icon={Users} label="User Directory" />
                  <NavItem to="/admin?tab=assessments" icon={CheckSquare} label="Assessment Setup" />
                  <NavItem to="/admin?tab=cce" icon={BookOpen} label="CCE Marks Entry" />
                  <NavItem to="/admin?tab=activities" icon={Trophy} label="Activity Center" />
                  <NavItem to="/admin?tab=reports" icon={Printer} label="Class Reports" />
                  <NavItem to="/admin?tab=mentors" icon={GraduationCap} label="Mentor Assignment" />
                  
                  <div className="pt-4 pb-2 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">System</div>
                  <NavItem to="/admin?tab=logs" icon={History} label="Assessment Logs" />
                  <NavItem to="/admin?tab=settings" icon={Settings} label="Campus Settings" />
                  <NavItem to="/admin?tab=help" icon={HelpCircle} label="Help & Tutorial" />
                </>
              )}
              {currentUser.role === 'teacher' && (
                <>
                  <div className="pt-4 pb-2 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Mentorship</div>
                  <NavItem to="/teacher?tab=assessments" icon={CheckSquare} label="Assessment Grid" />
                  <NavItem to="/teacher?tab=cce" icon={BookOpen} label="CCE Marks Entry" />
                  <NavItem to="/teacher?tab=activities" icon={Trophy} label="Activity Center" />
                  
                  <div className="pt-4 pb-2 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Resources</div>
                  <NavItem to="/teacher?tab=help" icon={HelpCircle} label="Help & FAQ" />
                </>
              )}
              {currentUser.role === 'student' && (
                <>
                  <div className="pt-4 pb-2 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Learning</div>
                  <NavItem to="/student?tab=report" icon={FileText} label="My Report Card" />
                  <NavItem to="/student?tab=spiritual" icon={Sparkles} label="Self-Assessment" />
                </>
              )}

              {originalAdminId && (
                <div className="mt-6 pt-6 border-t border-slate-800">
                  <button 
                    onClick={handleReturnToAdmin}
                    className="w-full flex items-center px-4 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black text-sm transition-all shadow-lg shadow-amber-500/20"
                  >
                    <ShieldCheck className="w-5 h-5 mr-3" />
                    Return to Admin
                  </button>
                </div>
              )}
            </nav>
          ) : (
            <div className="text-sm text-slate-500 font-medium px-4">Please log in to access your portal.</div>
          )}
        </div>

        {/* Bottom Install Card & Profile */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 space-y-3">
          {/* Always Visible Install Button */}
          <button 
            onClick={handleInstallClick}
            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-transparent hover:from-amber-500/25 hover:via-amber-400/20 text-amber-400 rounded-xl text-xs font-bold transition-all border border-amber-500/30 group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Download className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white leading-none">Install Portal App</p>
                <p className="text-[10px] text-amber-400/80 mt-0.5">Phone, Tablet & PC</p>
              </div>
            </div>
            <span className="text-[9px] uppercase tracking-wider font-extrabold bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded">
              PWA
            </span>
          </button>

          <button 
            onClick={() => {
              if (confirm('This will clear local data and re-sync from the cloud. Proceed?')) {
                forceCloudRefresh();
              }
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl text-xs font-bold transition-all"
          >
            <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
              <RefreshCw className="w-3.5 h-3.5" />
            </div>
            Force Cloud Refresh
          </button>

        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden print:overflow-visible print:h-auto">
        {/* Header (Desktop & Mobile) */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 print:hidden shadow-sm px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-slate-600 p-1 -ml-1">
              <Menu className="w-6 h-6" />
            </button>
            <div className="lg:hidden flex items-center gap-3">
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-8 h-8 rounded object-cover border border-slate-100" />
              ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-slate-800 to-slate-900 rounded flex items-center justify-center font-bold text-amber-400 text-xs">
                  {settings?.name ? settings.name.charAt(0).toUpperCase() : 'G'}
                </div>
              )}
              <h1 className="text-slate-900 font-black tracking-tight text-sm truncate max-w-[150px] sm:max-w-xs">
                {settings?.name ? settings.name.toUpperCase() : "GRAND CAMPUS"}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end">
              <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-slate-50 border border-slate-100">
                {syncStatus === 'synced' ? (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-tight">
                    <Cloud className="w-3 h-3" /> Cloud Synced
                  </div>
                ) : syncStatus === 'syncing' ? (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 uppercase tracking-tight animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Syncing...
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-600 uppercase tracking-tight">
                    <CloudOff className="w-3 h-3" /> Offline
                  </div>
                )}
              </div>
              {lastSyncTime && (
                <span className="text-[9px] text-slate-400 font-medium mt-0.5">Last update: {lastSyncTime}</span>
              )}
            </div>

            <button
              onClick={handleInstallClick}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-amber-700" /> Install App
            </button>
            {currentUser && (
              <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-slate-800 leading-tight">{currentUser.name}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{currentUser.role}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-xs font-black uppercase">
                  {currentUser.name.charAt(0)}
                </div>
                <button onClick={handleLogout} className="text-slate-400 hover:text-rose-600 transition-colors p-1.5" title="Logout">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </header>

        {originalAdminId && (
          <div className="bg-amber-500 text-amber-950 px-4 py-3 text-sm font-bold flex flex-col sm:flex-row gap-2 justify-between items-center shrink-0 z-20 print:hidden shadow-sm">
            <span>Viewing portal as: {currentUser?.name} ({currentUser?.role}) | Admin: {originalAdmin?.name || 'Authorized'}</span>
            <button 
              onClick={handleReturnToAdmin} 
              className="bg-amber-950 text-amber-50 px-4 py-1.5 rounded-lg hover:bg-amber-900 transition-colors w-full sm:w-auto text-center"
            >
              Return to Admin
            </button>
          </div>
        )}

        <main className={`flex-1 w-full ${location.pathname.includes('/report/') || (location.pathname.includes('/admin') && location.search.includes('tab=reports')) ? 'max-w-full' : 'max-w-7xl'} mx-auto p-4 sm:p-6 lg:p-8 print:p-0 overflow-y-auto print:overflow-visible`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname + location.search}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="print:transform-none print:opacity-100"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

