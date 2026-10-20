import React, { useState } from 'react';
import { useStore, defaultUsers } from '../lib/store';
import { Layout } from '../components/ui/Layout';
import { KeyRound, User, GraduationCap } from 'lucide-react';

export default function Login() {
  const { users, login, settings } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername) {
      setError('Please enter your full name or ID');
      return;
    }

    // Combine current cloud users with defaults for ultimate resilience
    const allPossibleUsers = [...users];
    
    // Ensure all default users are represented if missing from cloud
    defaultUsers.forEach(du => {
      if (!allPossibleUsers.find(u => u.id === du.id)) {
        allPossibleUsers.push(du);
      }
    });

    const lowerAttempt = trimmedUsername.toLowerCase();
    const normalizedAttempt = lowerAttempt.replace(/[^a-z0-9]/g, '');

    // 1. Direct name match
    let user = allPossibleUsers.find(u => {
      const uName = (u.name || '').trim().toLowerCase();
      return uName === lowerAttempt;
    });

    // 2. ID match (e.g. admin1, teacher1, student1)
    if (!user) {
      user = allPossibleUsers.find(u => (u.id || '').toLowerCase() === lowerAttempt);
    }

    // 3. Admission number match (e.g. ADM-001)
    if (!user) {
      user = allPossibleUsers.find(u => (u.admissionNumber || '').toLowerCase() === lowerAttempt);
    }

    // 4. Fuzzy / alias match for Campus Admin
    if (!user && (
      normalizedAttempt === 'campusadmin' || 
      normalizedAttempt === 'admin' || 
      normalizedAttempt === 'campus' ||
      lowerAttempt.includes('admin') ||
      lowerAttempt.includes('campus')
    )) {
      user = allPossibleUsers.find(u => u.role === 'admin') || { 
        id: 'admin1', 
        role: 'admin', 
        name: 'Campus Admin', 
        password: 'password123' 
      };
    }
    
    if (!user) {
      setError(`User "${trimmedUsername}" not found. Please check your username.`);
      return;
    }

    const expectedPassword = (user.password || 'password123').trim();
    if (trimmedPassword && trimmedPassword !== expectedPassword) {
      setError('Password is denied');
      return;
    }

    login(user.id);
  };

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-slate-50/50">
        <div className="w-full max-w-md">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-blue-100 border border-slate-200 relative overflow-hidden">
            {/* Design Decor */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 blur-2xl opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-50 rounded-full -ml-16 -mb-16 blur-2xl opacity-50"></div>
            
            <div className="relative z-10">
              <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-slate-900 text-white mb-6 shadow-xl shadow-slate-900/20 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                  <GraduationCap className="w-10 h-10" />
                </div>
                <h2 className="text-[10px] text-blue-600 uppercase font-black tracking-[0.3em] mb-2">{settings.name || "Grand Campus Academy"}</h2>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Portal Access</h3>
                <p className="text-slate-400 mt-2 text-sm font-medium">System identification and secure sign-in</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identity (Name or ID)</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-blue-600 text-slate-300">
                      <User className="w-5 h-5" />
                    </div>
                    <input 
                      type="text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-900 outline-none placeholder:text-slate-300"
                      placeholder="Enter username or ID"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secret Access Key</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-blue-600 text-slate-300">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-900 outline-none placeholder:text-slate-300"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0"></div>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full group bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-black py-4 px-4 rounded-2xl transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-2 uppercase tracking-widest text-[11px]"
                >
                  Authorize Connection
                </button>
              </form>

              <div className="mt-10 pt-8 border-t border-slate-50 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Global Access Control Protocol</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
