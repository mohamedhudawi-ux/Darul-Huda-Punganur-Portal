import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { Layout } from '../components/ui/Layout';
import { GraduationCap, Building2, User, Mail, Lock, Phone, MapPin, CheckCircle, ArrowRight, AlertTriangle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

export default function CampusRegistration() {
  const { registerCampus, subscriptionPlans, campuses } = useStore();
  const navigate = useNavigate();
  const { slug: routeSlug } = useParams<{ slug?: string }>();

  const existingCampus = routeSlug ? campuses.find(c => c.slug === routeSlug) : null;

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [collegeType, setCollegeType] = useState('Engineering & Technology');
  const [address, setAddress] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState(subscriptionPlans[0]?.id || 'plan_starter');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleNameChange = (val: string) => {
    setName(val);
    const generatedSlug = val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    setSlug(generatedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await registerCampus({
        name,
        slug,
        domain: `${slug}.grandcampus.edu`,
        collegeType,
        address,
        adminName,
        adminEmail,
        phone,
        password,
        subscriptionPlanId: selectedPlanId
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to register campus. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Layout>
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-200 text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle className="w-10 h-10" />
            </div>
            <div>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block mb-2">
                Tenant Isolation Active
              </span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{name}</h2>
              <p className="text-xs text-slate-500 leading-relaxed font-medium mt-2">
                Your campus has been provisioned with its own independent database. As requested, your dashboard is initially empty so you can add your own student roster.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-left space-y-2 text-xs">
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Your College Domain:</span>
                <span className="font-mono text-indigo-700 font-black text-sm">{slug}.grandcampus.edu</span>
              </div>
              <div className="pt-1 border-t border-indigo-200/50 flex justify-between">
                <span className="text-slate-500">Admin Account:</span>
                <span className="font-mono font-bold text-slate-800">{adminEmail}</span>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <button
                onClick={() => navigate(`/login?campus=${slug}`)}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <span>Open {name} Sign-In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <span>← Back to Platform Login</span>
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (existingCampus) {
    if (existingCampus.status === 'suspended' || existingCampus.status === 'deactivated') {
      return (
        <Layout>
          <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
            <div className="max-w-md w-full bg-slate-900 border border-rose-500/40 p-8 rounded-[2.5rem] shadow-2xl text-center space-y-6 text-white">
              <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-3xl flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-block">
                Campus Suspended by Super Admin
              </span>
              <h2 className="text-2xl font-black">{existingCampus.name}</h2>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                This campus has been suspended by the platform Super Admin. Portal access cannot be opened. Please contact platform administration.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3.5 bg-white text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
              >
                Return to Platform Login
              </button>
            </div>
          </div>
        </Layout>
      );
    }

    return (
      <Layout>
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-200 text-center space-y-6">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/10">
              <Building2 className="w-10 h-10" />
            </div>
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block">
              Active Educational Campus
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{existingCampus.name}</h2>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Welcome to the official portal for <strong>{existingCampus.name}</strong>.
            </p>
            <div className="space-y-3 pt-2">
              <button
                onClick={() => navigate(`/login?campus=${existingCampus.slug}`)}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <span>Open Campus Sign-In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/register')}
                className="w-full py-3 bg-slate-100 text-slate-700 rounded-2xl text-xs font-bold hover:bg-slate-200 transition-all"
              >
                Register a Different Campus
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-slate-50/50">
        <div className="max-w-2xl w-full bg-white p-8 sm:p-12 rounded-[2.5rem] shadow-2xl border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-60"></div>

          <div className="relative z-10 space-y-8">
            <div className="flex justify-between items-center pb-2">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <span>← Back to Login</span>
                </button>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                  New Campus Registration
                </span>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white mb-4 shadow-xl shadow-indigo-200 transform -rotate-2">
                  <Building2 className="w-8 h-8" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Register Your College / Campus</h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                  Launch your dedicated multi-tenant institution domain with isolated database.
                </p>
              </div>

              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">College / Institution Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="E.g. St. Xavier's College of Engineering"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">College Type</label>
                    <select
                      value={collegeType}
                      onChange={(e) => setCollegeType(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="Engineering & Technology">Engineering & Technology</option>
                      <option value="Medical & Healthcare">Medical & Healthcare</option>
                      <option value="Arts, Science & Commerce">Arts, Science & Commerce</option>
                      <option value="Polytechnic & Diploma">Polytechnic & Diploma</option>
                      <option value="School & Academy">School & Academy</option>
                      <option value="University / Multi-Faculty">University / Multi-Faculty</option>
                    </select>
                  </div>
                </div>

                {/* DOMAIN PREVIEW BOX */}
                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">Dedicated Portal Domain</span>
                    <span className="text-[10px] text-slate-500 font-mono">Auto-generated</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-indigo-900 font-black text-sm">
                      {slug ? `${slug}.grandcampus.edu` : 'your-college-name.grandcampus.edu'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Your college will have exclusive access to this isolated domain. Other colleges cannot see your student roster or portal.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Campus Physical Address</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street address, City, State, Pin Code"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Admin Full Name</label>
                    <input
                      type="text"
                      required
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="Dr. K. Sharma"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Admin Official Email</label>
                    <input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="principal@college.edu"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Phone Number</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Admin Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">Select Subscription Plan (All amounts in Rupees ₹ INR)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {subscriptionPlans.map(plan => (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                          selectedPlanId === plan.id
                            ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600 shadow-md'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <h4 className="font-black text-slate-900 text-sm">{plan.name}</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2">{plan.description}</p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-baseline justify-between">
                          <span className="text-xs font-black text-emerald-700">₹{plan.priceMonthly.toLocaleString('en-IN')}/mo</span>
                          <span className="text-[9px] text-slate-400 font-bold">₹{plan.priceAnnual.toLocaleString('en-IN')}/yr</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? 'Provisioning Isolated College Portal...' : 'Register College & Start 14-Day Trial'}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    <span>← Back to Login</span>
                  </button>
                </div>
              </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
