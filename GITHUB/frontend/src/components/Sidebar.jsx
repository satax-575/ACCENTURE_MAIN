import { Link, useLocation } from 'react-router-dom';
import { usePersona } from '../context/PersonaContext';
import { 
  BarChart2, Bell, Network, CheckCircle2, MessageSquare, 
  Rocket, ShieldCheck, ExternalLink, Zap, User, Sparkles, Database, Sliders, Target
} from 'lucide-react';
import AccentureLogo, { AccentureSymbol } from './AccentureLogo';
import DriftAlertsPanel from './DriftAlertsPanel';

export default function Sidebar() {
  const { persona, setPersona } = usePersona();
  const location = useLocation();

  const navItems = [
    { name: 'Executive Dashboard', path: '/', icon: BarChart2, badge: null },
    { name: 'Active Alerts', path: '/alerts', icon: Bell, badge: 'Live' },
    { name: 'Knowledge Graph', path: '/knowledge-graph', icon: Network, badge: null },
    { name: 'Data Connectors & CSV', path: '/connectors', icon: Database, badge: 'Zero-ETL' },
    { name: 'Scenario Simulator', path: '/simulator', icon: Sliders, badge: 'What-If' },
    { name: 'Engine Calibration', path: '/calibration', icon: CheckCircle2, badge: null },
    { name: 'Decision Assistant', path: '/chat', icon: MessageSquare, badge: 'Live Web' },
    { name: 'Sparse History', path: '/sparse-history', icon: Rocket, badge: null },
    { name: 'Action Outcomes', path: '/action-outcomes', icon: Target, badge: 'New' },
  ];

  return (
    <div className="w-64 bg-slate-950 text-white flex flex-col h-full shadow-2xl border-r border-slate-800/80 select-none">
      
      {/* Accenture Branded Header */}
      <div className="p-6 border-b border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <AccentureLogo className="h-6" variant="light" />
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#a100ff]/20 text-[#d896ff] border border-[#a100ff]/30">
            AI CORE
          </span>
        </div>
        <div>
          <span className="text-[11px] font-bold tracking-tight text-white block leading-tight">
            Applied Intelligence
          </span>
          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest block mt-0.5">
            KPI Decision Engine
          </span>
        </div>
      </div>
      
      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
        <div className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Enterprise Workspace
        </div>

        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all font-medium text-xs ${
                isActive 
                  ? 'bg-gradient-to-r from-[#a100ff] to-indigo-600 text-white shadow-lg shadow-[#a100ff]/25 font-bold' 
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={17} className={isActive ? 'text-white' : 'text-slate-400'} />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-900 text-[#d896ff] border border-[#a100ff]/40'
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Persona Customizer Card */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/60">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User size={12} className="text-[#a100ff]" /> Active Persona
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#a100ff]/20 text-[#d896ff] font-bold text-[10px] uppercase">
              {persona}
            </span>
          </div>

          <select 
            value={persona} 
            onChange={(e) => setPersona(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 text-white text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:border-[#a100ff] focus:ring-1 focus:ring-[#a100ff] cursor-pointer"
          >
            <option value="ceo">CEO (Executive View)</option>
            <option value="manager">Manager (Operations View)</option>
            <option value="analyst">Analyst (Quantitative View)</option>
          </select>

          <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500">
            <span>Accenture AI Advisory</span>
            <a 
              href="http://localhost:8000/docs" 
              target="_blank" 
              rel="noreferrer" 
              className="text-[#d896ff] hover:text-white flex items-center gap-1 font-semibold"
            >
              Docs <ExternalLink size={9} />
            </a>
          </div>
        </div>
      </div>

      {/* Drift Alerts Panel */}
      <div className="px-4 pb-3">
        <DriftAlertsPanel />
      </div>

    </div>
  );
}
