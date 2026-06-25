import { RefreshButton } from "./RefreshButton";
import dayjs from "dayjs";

export function TopHeader() {
  return (
    <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-[11px] font-semibold text-green-700 font-mono">System Live</span>
        </div>
        <span className="text-[11px] text-slate-400 font-mono hidden sm:block">
          {dayjs().format("ddd, D MMM YYYY")}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <RefreshButton />
        <div className="w-px h-5 bg-slate-200"></div>
        <div className="flex items-center gap-2">
          <img
            src="https://ui-avatars.com/api/?name=Admin+User&background=2563eb&color=fff&size=64&bold=true"
            alt="User Profile"
            className="w-7 h-7 rounded-full border border-slate-200 shadow-sm"
          />
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-slate-700 leading-none">Admin</p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Editor</p>
          </div>
        </div>
      </div>
    </header>
  );
}
