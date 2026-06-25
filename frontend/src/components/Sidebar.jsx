import { TbLayoutDashboard, TbRss, TbMessageCircle } from "react-icons/tb";

const SOURCES = [
  { name: "BBC News",     color: "bg-red-500"    },
  { name: "NPR",          color: "bg-orange-500" },
  { name: "New York Times", color: "bg-slate-400" },
  { name: "The Guardian", color: "bg-blue-500"   },
];

export function Sidebar({ selectedSources, onToggleSource }) {
  return (
    <aside className="w-[220px] h-screen bg-[#1e2235] flex flex-col fixed left-0 top-0 z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-[#2e3450]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-bold text-white text-sm shadow">
          N
        </div>
        <div>
          <p className="text-white font-bold text-[15px] leading-tight">News Pulse</p>
          <p className="text-slate-500 text-[10px] font-mono leading-none mt-0.5">Live Dashboard</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-5 px-3 flex flex-col gap-6">
        {/* Navigation */}
        <div>
          <p className="text-[10px] font-mono font-semibold text-slate-600 uppercase tracking-widest px-2 mb-1.5">
            Analytics
          </p>
          <a href="#" className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#2a3048] text-white text-sm font-medium transition-all">
            <TbLayoutDashboard className="text-base text-blue-400 flex-shrink-0" />
            <span>Topics Dashboard</span>
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
          </a>
        </div>

        {/* Active Sources */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5">
            <p className="text-[10px] font-mono font-semibold text-slate-600 uppercase tracking-widest">
              Active Sources
            </p>
            <TbRss className="text-green-400 text-[11px]" />
          </div>
          {SOURCES.map((s) => {
            const isSelected = selectedSources.includes(s.name);
            return (
              <button 
                key={s.name} 
                onClick={() => onToggleSource(s.name)}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all group ${isSelected ? "bg-[#2a3048]" : "hover:bg-[#2a3048]/50"}`}
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${isSelected ? s.color : "bg-slate-600"}`}></div>
                <span className={`text-[13px] transition-colors ${isSelected ? "text-slate-200" : "text-slate-500 group-hover:text-slate-400"}`}>
                  {s.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[#2e3450]">
        <a href="#" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#2a3048] transition-all text-slate-500 hover:text-slate-300">
          <TbMessageCircle className="text-base" />
          <span className="text-[13px]">Feedback</span>
        </a>
      </div>
    </aside>
  );
}
