import dayjs from "dayjs";
import { TbHeartbeat } from "react-icons/tb";

export function Navbar() {
  return (
    <nav className="w-full border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Logo / Title */}
        <div className="flex items-center space-x-3">
          <div className="bg-brand-500/20 p-2 rounded-lg">
            <TbHeartbeat className="text-brand-400 text-2xl" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-tight">News Pulse</h1>
            <p className="text-xs text-slate-400 font-medium tracking-wide">Live Topic Cluster Timeline</p>
          </div>
        </div>

        {/* Right side status */}
        <div className="flex items-center text-sm">
          <span className="text-slate-400 mr-2">Last Updated</span>
          <span className="font-mono font-medium text-slate-200 bg-slate-800/80 px-2 py-1 rounded-md shadow-inner border border-slate-700/50">
            {dayjs().format('h:mm A')}
          </span>
        </div>
      </div>
    </nav>
  );
}
