import { useState } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import { usePersona } from '../context/PersonaContext';
import { 
  Search, Bell, ShieldCheck, Zap, ExternalLink, 
  Calendar, CheckCircle2, ArrowRight
} from 'lucide-react';
import AccentureLogo from './AccentureLogo';

export default function Layout() {
  const { persona } = usePersona();
  const [timeRange, setTimeRange] = useState('Q3 2026');
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const notifications = [
    { title: 'P1 Incident Detected', desc: 'Revenue in East Region shifted -11.6%', time: '10m ago', unread: true, link: '/case/East%20Region/2026-08-11' },
    { title: 'Data Feed Stale', desc: 'North Region ticket sync gap > 24h', time: '1h ago', unread: true, link: '/case/North%20Region/2026-08-18' },
    { title: 'Calibration Rebalanced', desc: 'Checkout Error weight reinforced to 0.85', time: '3h ago', unread: false, link: '/calibration' },
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.toLowerCase().includes('north')) {
      navigate('/case/North%20Region/2026-08-18');
    } else if (searchQuery.toLowerCase().includes('graph')) {
      navigate('/knowledge-graph');
    } else if (searchQuery.toLowerCase().includes('connect') || searchQuery.toLowerCase().includes('csv')) {
      navigate('/connectors');
    } else if (searchQuery.toLowerCase().includes('sim') || searchQuery.toLowerCase().includes('what')) {
      navigate('/simulator');
    } else {
      navigate('/case/East%20Region/2026-08-11');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100/60 font-sans">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between z-10 shrink-0 shadow-xs">
          
          {/* Global Quick Search & Accenture Sub-brand */}
          <div className="flex items-center gap-6">
            <form onSubmit={handleSearchSubmit} className="relative w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input 
                type="text"
                placeholder="Search metrics, regions, or drivers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 outline-none focus:bg-white focus:border-[#a100ff] focus:ring-2 focus:ring-[#a100ff]/10 transition-all font-medium"
              />
            </form>
          </div>

          {/* Center / Right Header Badges & Actions */}
          <div className="flex items-center gap-4">
            
            {/* Time Window Selector */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
              <Calendar size={13} className="text-slate-400 ml-1.5" />
              {['7 Days', '30 Days', 'Q3 2026', 'YTD'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeRange(t)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    timeRange === t 
                      ? 'bg-white text-[#a100ff] shadow-xs font-bold' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Accenture AI Trust Status Pill */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[#a100ff]/10 rounded-xl border border-[#a100ff]/20 text-[11px] font-bold text-[#7a00c2]">
              <span className="w-2 h-2 rounded-full bg-[#a100ff] animate-pulse"></span>
              <span>Accenture Responsible AI Fenced</span>
            </div>

            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors relative"
              >
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
              </button>

              {/* Notification Popover */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-3xl shadow-2xl border border-slate-200 p-4 space-y-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Live System Events</h3>
                    <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full">2 New</span>
                  </div>

                  <div className="space-y-2">
                    {notifications.map((n, i) => (
                      <Link
                        key={i}
                        to={n.link}
                        onClick={() => setShowNotifications(false)}
                        className={`block p-3 rounded-2xl transition-colors text-xs border ${
                          n.unread ? 'bg-[#a100ff]/5 border-[#a100ff]/20 hover:bg-[#a100ff]/10' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex justify-between items-start font-bold text-slate-900">
                          <span>{n.title}</span>
                          <span className="text-[10px] text-slate-400 font-normal">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">{n.desc}</p>
                      </Link>
                    ))}
                  </div>

                  <Link 
                    to="/alerts" 
                    onClick={() => setShowNotifications(false)}
                    className="block text-center text-xs font-bold text-[#a100ff] hover:text-[#7a00c2] pt-1"
                  >
                    View All Active Alerts &rarr;
                  </Link>
                </div>
              )}
            </div>

            {/* Persona Avatar Badge */}
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#a100ff] to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs uppercase">
                {persona[0]}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-bold text-slate-800 uppercase leading-none">{persona}</div>
                <span className="text-[10px] text-slate-400 font-medium">Enterprise Client</span>
              </div>
            </div>

          </div>
        </header>

        {/* Dynamic Page Outlet */}
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
          
          {/* Subtle Enterprise Footer */}
          <footer className="mt-12 pt-6 border-t border-slate-200/60 flex flex-col sm:flex-row justify-between items-center gap-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <AccentureLogo className="h-3.5 opacity-60" variant="dark" />
              <span>• Applied Intelligence & AI Strategy Practice</span>
            </div>
            <div>© 2026 Accenture. All rights reserved. Confidential & Governed.</div>
          </footer>
        </main>
      </div>
    </div>
  );
}
