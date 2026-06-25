import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { TbExternalLink, TbNews } from "react-icons/tb";

// Extend dayjs to support "2 hours ago" formatting
dayjs.extend(relativeTime);

export function ArticleCard({ article }) {
  // Try to use a specific icon or color based on source
  const sourceColors = {
    "BBC News": "bg-red-500/10 text-red-400 border-red-500/20",
    "NPR": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "The Guardian": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    "New York Times": "bg-stone-500/10 text-stone-400 border-stone-500/20"
  };

  const badgeColor = sourceColors[article.source] || "bg-slate-800 text-slate-300 border-slate-700";

  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badgeColor} flex items-center`}>
          <TbNews className="mr-1.5" />
          {article.source}
        </span>
        <span className="text-xs text-slate-500 font-medium">
          {article.published_at ? dayjs(article.published_at).fromNow() : "Unknown date"}
        </span>
      </div>
      
      <h3 className="font-bold text-slate-200 leading-snug mb-2 group-hover:text-brand-400 transition-colors line-clamp-2">
        {article.title}
      </h3>
      
      <p className="text-sm text-slate-400 line-clamp-3 mb-4 flex-grow">
        {article.summary}
      </p>
      
      <div className="mt-auto pt-3 border-t border-slate-800/60">
        <a 
          href={article.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm font-medium text-brand-400 hover:text-brand-300 transition-colors"
        >
          Read Original <TbExternalLink className="ml-1.5" />
        </a>
      </div>
    </div>
  );
}
