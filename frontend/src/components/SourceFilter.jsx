import { cn } from "../lib/utils";

const ALL_SOURCES = [
  "BBC News",
  "NPR",
  "The Guardian",
  "New York Times"
];

export function SourceFilter({ selectedSources, onChange }) {
  const toggleSource = (source) => {
    if (selectedSources.includes(source)) {
      onChange(selectedSources.filter(s => s !== source));
    } else {
      onChange([...selectedSources, source]);
    }
  };

  return (
    <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">
      <span className="text-sm font-medium text-slate-400 mr-2 uppercase tracking-wider">Sources</span>
      {ALL_SOURCES.map((source) => {
        const isSelected = selectedSources.includes(source);
        return (
          <button
            key={source}
            onClick={() => toggleSource(source)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border whitespace-nowrap",
              isSelected
                ? "bg-brand-500/10 text-brand-400 border-brand-500/50 shadow-sm"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-300"
            )}
          >
            {isSelected ? "☑" : "☐"} {source}
          </button>
        );
      })}
    </div>
  );
}
