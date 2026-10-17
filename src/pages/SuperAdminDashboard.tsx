import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { Layout } from '../components/ui/Layout';
import { 
  Building2, Users, CreditCard, ShieldCheck, CheckCircle2, AlertTriangle, 
  Search, Plus, Trash2, Edit, Send, History, DollarSign, Globe, Check, X, ArrowUpRight 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SuperAdminDashboard() {
  const { 
    campuses, 
    updateCampusStatus, 
    updateCampusSubscription, 
    subscriptionPlans, 
    addSubscriptionPlan, 
    updateSubscriptionPlan,
    payments, 
    auditLogs, 
    platformAnnouncements, 
    sendPlatformAnnouncement,
    users 
  } = useStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'campuses' | 'plans' | 'payments' | 'announcements' | 'logs'>('campuses');
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Plan Modal State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planName, setPlanName] = useState('');
  const [priceMonthly, setPriceMonthly] = useState('');
  const [priceAnnual, setPriceAnnual] = useState('');
  const [maxStudents, setMaxStudents] = useState('500');
  const [maxStaff, setMaxStaff] = useState('50');
  const [description, setDescription] = useState('');

  // Edit Plan State
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [editPriceMonthly, setEditPriceMonthly] = useState('');
  const [editPriceAnnual, setEditPriceAnnual] = useState('');

  // Announcement Modal State
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annTarget, setAnnTarget] = useState('all');

  const filteredCampuses = campuses.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.adminEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalStudents = users.filter(u => u.role === 'student').length * (campuses.length || 1);
  const totalStaff = users.filter(u => u.role === 'teacher' || u.role === 'admin').length * (campuses.length || 1);
  const totalRevenue = payments.reduce((acc, p) => acc + (p.status === 'success' ? p.amount : 0), 12500); // Base mock revenue

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    addSubscriptionPlan({
      name: planName,
      priceMonthly: parseFloat(priceMonthly) || 49,
      priceAnnual: parseFloat(priceAnnual) || 490,
      maxStudents: parseInt(maxStudents) || 500,
      maxStaff: parseInt(maxStaff) || 50,
      storageLimitGb: 50,
      features: ['All core modules', 'Isolated database', 'Standard support'],
      description
    });
    setPlanName('');
    setPriceMonthly('');
    setPriceAnnual('');
    setIsPlanModalOpen(false);
    alert('Subscription plan created successfully!');
  };

  const handleUpdatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    updateSubscriptionPlan(editingPlan.id, {
      priceMonthly: parseFloat(editPriceMonthly) || editingPlan.priceMonthly,
      priceAnnual: parseFloat(editPriceAnnual) || editingPlan.priceAnnual
    });
    setEditingPlan(null);
    alert('Subscription plan amount updated successfully!');
  };

  const handleSendAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    sendPlatformAnnouncement({
      title: annTitle,
      message: annMessage,
      targetCampusId: annTarget,
      author: 'Super Admin'
    });
    setAnnTitle('');
    setAnnMessage('');
    setIsAnnouncementModalOpen(false);
    alert('Platform announcement broadcasted successfully!');
  };

  return (
    <Layout>
      <div className="space-y-8 max-w-7xl mx-auto pb-16">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-white/10">
          <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" /> Platform Owner Control Center
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-500/30 border border-emerald-400/30 text-emerald-200 text-[11px] font-bold">
                  SaaS Multi-Tenant Engine
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Super Admin Dashboard
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm font-medium mt-1">
                Manage registered campuses, subscriptions, pricing plans, platform announcements, and system health.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all"
              >
                <span>← Back to Login</span>
              </button>
              <button
                onClick={() => setIsAnnouncementModalOpen(true)}
                className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-500/30 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Broadcast Announcement</span>
              </button>
            </div>
          </div>
        </div>

        {/* Platform Metric Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Campuses</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{campuses.length}</h3>
              <p className="text-[11px] text-emerald-600 font-bold mt-1">+{campuses.filter(c => c.status === 'active').length} Active tenants</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Building2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Students</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{totalStudents}</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-1">Across all tenants</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Platform Revenue</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">${totalRevenue.toLocaleString()}</h3>
              <p className="text-[11px] text-emerald-600 font-bold mt-1">+18% this month</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Active Plans</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{subscriptionPlans.length}</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-1">Configured tiers</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 bg-slate-200/70 p-1.5 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('campuses')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'campuses' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Campuses ({campuses.length})
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'plans' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Subscription Plans ({subscriptionPlans.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'payments' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Billing & Payments
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'announcements' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Announcements
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'logs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Audit Logs
          </button>
        </div>

        {/* TAB 1: CAMPUSES MANAGEMENT */}
        {activeTab === 'campuses' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden space-y-4">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Registered Campuses & Tenants</h3>
                <p className="text-xs text-slate-500">Approve, suspend, or manage subscription statuses for independent campus accounts.</p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search campus or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Institution & Slug</th>
                    <th className="px-6 py-4">Administrator</th>
                    <th className="px-6 py-4">Plan & Subscription</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {filteredCampuses.map(campus => {
                    const plan = subscriptionPlans.find(p => p.id === campus.subscriptionPlanId);
                    return (
                      <tr key={campus.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-black text-slate-900 text-sm">{campus.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">/campus/{campus.slug}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{campus.adminName}</div>
                          <div className="text-[11px] text-slate-400">{campus.adminEmail}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-indigo-700">{plan?.name || 'Standard Plan'}</div>
                          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">{campus.subscriptionStatus}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-block ${
                            campus.status === 'active' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : campus.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {campus.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {campus.status !== 'active' && (
                            <button
                              onClick={() => updateCampusStatus(campus.id, 'active')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs"
                            >
                              Approve / Activate
                            </button>
                          )}
                          {campus.status === 'active' && (
                            <button
                              onClick={() => updateCampusStatus(campus.id, 'suspended')}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs"
                            >
                              Suspend
                            </button>
                          )}
                          <button
                            onClick={() => {
                              navigate(`/login?campus=${campus.slug}`);
                            }}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs inline-flex items-center gap-1"
                          >
                            <span>Access</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: SUBSCRIPTION PLANS */}
        {activeTab === 'plans' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div>
                <h3 className="text-lg font-black text-slate-900">Subscription Plans & Pricing Tiers</h3>
                <p className="text-xs text-slate-500">Configure pricing limits, features, and quotas for campus tenants.</p>
              </div>
              <button
                onClick={() => setIsPlanModalOpen(true)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Plan</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {subscriptionPlans.map(plan => (
                <div key={plan.id} className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-6">
                  <div>
                    <h4 className="font-black text-slate-900 text-lg mb-1">{plan.name}</h4>
                    <p className="text-xs text-slate-500 mb-4">{plan.description}</p>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-3xl font-black text-slate-900">${plan.priceMonthly}</span>
                      <span className="text-xs text-slate-400 font-bold">/ month (or ${plan.priceAnnual}/yr)</span>
                    </div>

                    <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-4">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Student Limit:</span>
                        <span className="font-bold text-slate-800">{plan.maxStudents === 999999 ? 'Unlimited' : plan.maxStudents}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Staff Limit:</span>
                        <span className="font-bold text-slate-800">{plan.maxStaff === 9999 ? 'Unlimited' : plan.maxStaff}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Storage:</span>
                        <span className="font-bold text-slate-800">{plan.storageLimitGb} GB</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">Active Tier</span>
                    <button 
                      onClick={() => {
                        setEditingPlan(plan);
                        setEditPriceMonthly(plan.priceMonthly.toString());
                        setEditPriceAnnual(plan.priceAnnual.toString());
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      Fix / Edit Price
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: PAYMENTS & BILLING */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden space-y-4">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-black text-slate-900">Payment History & Invoices</h3>
              <p className="text-xs text-slate-500">Verified transactions across all registered campus tenants.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Transaction ID</th>
                    <th className="px-6 py-4">Campus Name</th>
                    <th className="px-6 py-4">Billing Cycle</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {payments.length > 0 ? payments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-mono font-bold text-slate-700">{p.id}</td>
                      <td className="px-6 py-4 font-black text-slate-900">{p.campusName}</td>
                      <td className="px-6 py-4 uppercase font-bold text-slate-600">{p.billingCycle}</td>
                      <td className="px-6 py-4 font-black text-emerald-700">${p.amount} {p.currency}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[10px] uppercase">
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">{p.createdAt}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs font-bold">
                        No transactions recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: ANNOUNCEMENTS */}
        {activeTab === 'announcements' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Platform Announcements</h3>
                <p className="text-xs text-slate-500">Broadcast maintenance updates or news to all campuses.</p>
              </div>
              <button
                onClick={() => setIsAnnouncementModalOpen(true)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider"
              >
                + New Broadcast
              </button>
            </div>

            <div className="space-y-4">
              {platformAnnouncements.map(ann => (
                <div key={ann.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-black text-slate-900 text-sm">{ann.title}</h4>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">
                      {ann.createdAt}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{ann.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT LOGS */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden space-y-4">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-black text-slate-900">Platform Audit Logs & Technical Health</h3>
              <p className="text-xs text-slate-500">Security and tenant action trails.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-mono">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-slate-400">{log.timestamp}</td>
                      <td className="px-6 py-4 font-bold text-indigo-700">{log.action}</td>
                      <td className="px-6 py-4 text-slate-700">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CREATE PLAN MODAL */}
        {isPlanModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">Create Subscription Plan</h3>
                <button onClick={() => setIsPlanModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Plan Name</label>
                  <input type="text" required value={planName} onChange={e => setPlanName(e.target.value)} placeholder="E.g. Enterprise Tier" className="w-full p-2.5 border rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold uppercase text-slate-500 mb-1">Monthly Price ($)</label>
                    <input type="number" required value={priceMonthly} onChange={e => setPriceMonthly(e.target.value)} placeholder="99" className="w-full p-2.5 border rounded-xl" />
                  </div>
                  <div>
                    <label className="block font-bold uppercase text-slate-500 mb-1">Annual Price ($)</label>
                    <input type="number" required value={priceAnnual} onChange={e => setPriceAnnual(e.target.value)} placeholder="990" className="w-full p-2.5 border rounded-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold uppercase text-slate-500 mb-1">Max Students</label>
                    <input type="number" required value={maxStudents} onChange={e => setMaxStudents(e.target.value)} className="w-full p-2.5 border rounded-xl" />
                  </div>
                  <div>
                    <label className="block font-bold uppercase text-slate-500 mb-1">Max Staff</label>
                    <input type="number" required value={maxStaff} onChange={e => setMaxStaff(e.target.value)} className="w-full p-2.5 border rounded-xl" />
                  </div>
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Description</label>
                  <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Plan details..." className="w-full p-2.5 border rounded-xl" />
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t">
                  <button type="button" onClick={() => setIsPlanModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold">Save Plan</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT PLAN / FIX PRICE MODAL */}
        {editingPlan && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">Fix / Edit Subscription Price: {editingPlan.name}</h3>
                <button onClick={() => setEditingPlan(null)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <form onSubmit={handleUpdatePlan} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Monthly Price ($)</label>
                  <input type="number" step="0.01" required value={editPriceMonthly} onChange={e => setEditPriceMonthly(e.target.value)} className="w-full p-2.5 border rounded-xl" />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Annual Price ($)</label>
                  <input type="number" step="0.01" required value={editPriceAnnual} onChange={e => setEditPriceAnnual(e.target.value)} className="w-full p-2.5 border rounded-xl" />
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t">
                  <button type="button" onClick={() => setEditingPlan(null)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold">Update Amount</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* BROADCAST ANNOUNCEMENT MODAL */}
        {isAnnouncementModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">Broadcast Platform Announcement</h3>
                <button onClick={() => setIsAnnouncementModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <form onSubmit={handleSendAnnouncement} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Title</label>
                  <input type="text" required value={annTitle} onChange={e => setAnnTitle(e.target.value)} placeholder="Maintenance Notice" className="w-full p-2.5 border rounded-xl" />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Message</label>
                  <textarea rows={3} required value={annMessage} onChange={e => setAnnMessage(e.target.value)} placeholder="Platform will undergo maintenance..." className="w-full p-2.5 border rounded-xl" />
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t">
                  <button type="button" onClick={() => setIsAnnouncementModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold">Broadcast</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
