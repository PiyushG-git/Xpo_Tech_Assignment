import { useState } from "react";
import dayjs from "dayjs";
import { TbActivity, TbLayoutList } from "react-icons/tb";

export function Timeline({ data, onClusterSelect, selectedClusterId }) {
  const [hoveredId, setHoveredId] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <TbActivity className="text-primary-600 text-lg" />
          <h3 className="font-semibold text-slate-800 text-[15px]">Activity Timeline</h3>
        </div>
        <div className="h-48 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-lg gap-2">
          <TbLayoutList className="text-4xl opacity-30" />
          <p className="text-sm font-medium text-slate-500">No clusters found</p>
          <p className="text-xs text-slate-400">Click "Refresh Data" to fetch the latest news</p>
        </div>
      </div>
    );
  }

  const validClusters = data.filter(c => c.start && c.end);
  if (validClusters.length === 0) return null;

  const minTime = Math.min(...validClusters.map(c => dayjs(c.start).valueOf()));
  const maxTime = Math.max(...validClusters.map(c => dayjs(c.end).valueOf()));
  const pad = Math.max((maxTime - minTime) * 0.04, 3_600_000);
  const globalStart = minTime - pad;
  const globalEnd   = maxTime + pad;
  const totalDuration = globalEnd - globalStart;

  const toPercent = (t) => ((dayjs(t).valueOf() - globalStart) / totalDuration) * 100;

  // Build 7 evenly-spaced axis tick values
  const ticks = Array.from({ length: 7 }, (_, i) =>
    globalStart + (i / 6) * totalDuration
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      {/* Card header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <TbActivity className="text-primary-600 text-lg" />
          <h3 className="font-semibold text-slate-800 text-[15px]">Activity Timeline</h3>
        </div>
        <div className="flex items-center gap-5 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary-600"></div>
            <span>Earliest Article</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full border-2 border-slate-400 bg-white"></div>
            <span>Latest Update</span>
          </div>
        </div>
      </div>

      {/* Chart grid */}
      <div className="relative overflow-x-auto">
        {/* --- Time axis (top) --- */}
        <div className="flex ml-[160px] mb-1">
          {ticks.map((t, i) => (
            <div key={i} className="flex-1 text-[10px] font-mono text-slate-400 text-center first:text-left last:text-right">
              {dayjs(t).format("HH:mm")}
            </div>
          ))}
        </div>

        {/* --- Rows --- */}
        <div className="relative border border-slate-100 rounded-lg overflow-hidden">
          {/* Vertical grid lines */}
          <div className="absolute inset-0 flex pointer-events-none" style={{ marginLeft: 160 }}>
            {ticks.map((_, i) => (
              <div key={i} className="flex-1 border-l border-slate-100 last:border-r h-full" />
            ))}
          </div>

          {validClusters.map((cluster, idx) => {
            const leftPct   = toPercent(cluster.start);
            const rightPct  = toPercent(cluster.end);
            let widthPct    = rightPct - leftPct;
            if (widthPct < 3) widthPct = 3;

            const isSelected = selectedClusterId === cluster.id;
            const isHovered  = hoveredId === cluster.id;
            const isActive   = isSelected || isHovered;

            return (
              <div
                key={cluster.id}
                className={`flex items-center border-b border-slate-50 last:border-b-0 transition-colors ${isSelected ? "bg-primary-50/60" : "hover:bg-slate-50/60"}`}
                style={{ minHeight: 48 }}
                onClick={() => onClusterSelect(isSelected ? null : cluster.id)}
                onMouseEnter={() => setHoveredId(cluster.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Cluster label — fixed left column */}
                <div className="w-[160px] flex-shrink-0 px-3 py-3">
                  <p className={`text-[12.5px] font-semibold truncate leading-tight ${isSelected ? "text-primary-700" : "text-slate-700"}`}>
                    {cluster.label}
                  </p>
                </div>

                {/* Gantt bar area */}
                <div className="flex-1 py-3 relative cursor-pointer pr-3" style={{ minHeight: 48 }}>
                  {/* The bar */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-[26px] rounded-full flex items-center transition-all duration-200"
                    style={{
                      left: `${Math.max(0, leftPct)}%`,
                      width: `${Math.min(100 - leftPct, widthPct)}%`,
                      backgroundColor: isActive ? "#bfdbfe" : "#dbeafe",
                      border: `1px solid ${isActive ? "#93c5fd" : "#bfdbfe"}`,
                    }}
                  >
                    {/* Article count text inside bar */}
                    <span className="whitespace-nowrap px-3 text-[10px] font-mono font-semibold text-primary-700 tracking-wider uppercase select-none">
                      {cluster.intensity} Articles
                    </span>
                  </div>

                  {/* Hollow circle at end of bar (Latest Update marker) */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-slate-400 bg-white z-10 -translate-x-1/2 transition-all"
                    style={{ left: `${Math.min(99, rightPct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-slate-400 mt-3">
        Click any row to explore articles in that cluster
      </p>
    </div>
  );
}
