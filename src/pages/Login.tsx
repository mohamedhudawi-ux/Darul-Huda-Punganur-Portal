import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { Layout } from '../components/ui/Layout';
import { KeyRound, User } from 'lucide-react';

export default function Login() {
  const { users, login } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Find user by name
    const user = users.find(u => u.name.toLowerCase() === username.toLowerCase());
    
    if (!user) {
      setError('Invalid username or password');
      return;
    }

    const expectedPassword = user.password || 'password123';
    if (password !== expectedPassword) {
      setError('Invalid username or password');
      return;
    }

    login(user.id);
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto mt-12">
        <div className="bg-white p-8 rounded-2xl shadow-lg shadow-blue-100 border border-blue-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-blue-600 to-indigo-700"></div>
          <div className="text-center mb-8">
            <h2 className="text-sm text-blue-600 uppercase font-bold tracking-wider mb-2">Grand Campus Academy</h2>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Assurance Portal</h3>
            <p className="text-slate-500 mt-2 text-sm font-medium">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                  placeholder="e.g. Alice Johnson"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-rose-500 text-sm text-center font-bold bg-rose-50 border border-rose-100 p-2.5 rounded-xl">{error}</p>
            )}

            <button
              type="submit"
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md mt-6"
            >
              Sign In to Portal
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
