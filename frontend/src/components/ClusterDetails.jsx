import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { TbExternalLink, TbClick } from "react-icons/tb";

dayjs.extend(relativeTime);

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-5 bg-slate-100 rounded w-40 mb-6"></div>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex gap-6 items-center py-4 border-b border-slate-100">
          <div>
            <div className="h-3.5 bg-slate-100 rounded w-64 mb-2"></div>
            <div className="h-2.5 bg-slate-100 rounded w-32"></div>
          </div>
          <div className="ml-auto flex gap-8">
            <div className="h-3 bg-slate-100 rounded w-20"></div>
            <div className="h-3 bg-slate-100 rounded w-16"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

const SOURCE_DOT = {
  bbc:       "bg-red-500",
  npr:       "bg-orange-500",
  guardian:  "bg-blue-500",
  nyt:       "bg-slate-400",
  york:      "bg-slate-400",
};

const getSourceColor = (source = "") => {
  const s = source.toLowerCase();
  for (const [key, cls] of Object.entries(SOURCE_DOT)) {
    if (s.includes(key)) return cls;
  }
  return "bg-slate-400";
};

export function ClusterDetails({ clusterId, selectedSources = [] }) {
  const { data: cluster, isLoading, isError } = useQuery({
    queryKey: ["cluster", clusterId],
    queryFn: () => api.getClusterById(clusterId),
    enabled: !!clusterId,
    staleTime: 60_000,
  });

  /* ── Empty / error states ── */
  if (!clusterId) {
    return (
      <div className="bg-white border border-dashed border-slate-200 rounded-xl shadow-sm p-12 text-center">
        <TbClick className="text-5xl text-slate-200 mx-auto mb-3" />
        <p className="text-[13px] font-semibold text-slate-400">No cluster selected</p>
        <p className="text-[12px] text-slate-300 mt-1">Click on a row in the timeline above to view its articles.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <LoadingSkeleton />
      </div>
    );
  }

  if (isError || !cluster) {
    return (
      <div className="p-5 bg-red-50 border border-red-100 rounded-xl text-center shadow-sm">
        <p className="text-sm font-medium text-red-600">⚠ Failed to load cluster details</p>
        <p className="text-xs text-red-400 mt-1">Make sure the backend is running and refresh.</p>
      </div>
    );
  }

  const allArticles = cluster.articles || [];
  const articles = allArticles.filter(a => selectedSources.includes(a.source));

  const dates    = articles.map(a => dayjs(a.published_at).valueOf()).filter(v => !isNaN(v));
  const earliest = dates.length ? dayjs(Math.min(...dates)) : null;
  const latest   = dates.length ? dayjs(Math.max(...dates)) : null;

  return (
    <div className="mt-6">
      {/* Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Card header — matches design with left blue accent */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-primary-600 rounded-full flex-shrink-0"></div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-800">Cluster: {cluster.label}</h2>
              {earliest && latest && (
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {earliest.format("MMM D, HH:mm")} → {latest.format("MMM D, HH:mm")}
                </p>
              )}
            </div>
          </div>
          <span className="px-3 py-1 bg-primary-600 text-white text-[10px] font-mono font-semibold rounded-full tracking-widest uppercase">
            {articles.length} Total Articles
          </span>
        </div>

        {/* Table */}
        {articles.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No articles in this cluster.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              {/* Table head */}
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-3 text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-widest">
                    Article Name
                  </th>
                  <th className="px-6 py-3 text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-widest">
                    Source
                  </th>
                  <th className="px-6 py-3 text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-widest">
                    Published
                  </th>
                  <th className="px-6 py-3 text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-widest">
                    Actions
                  </th>
                </tr>
              </thead>

              {/* Table body */}
              <tbody className="divide-y divide-slate-50">
                {articles.map((article) => (
                  <tr key={article._id} className="hover:bg-slate-50 transition-colors group">
                    {/* Article name */}
                    <td className="px-6 py-3.5 max-w-[420px]">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[13px] font-semibold text-primary-700 hover:text-primary-900 transition-colors leading-snug line-clamp-2"
                      >
                        {article.title}
                      </a>
                      {article.summary && (
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{article.summary}</p>
                      )}
                    </td>

                    {/* Source */}
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getSourceColor(article.source)}`}></div>
                        <span className="text-[13px] text-slate-600">{article.source}</span>
                      </div>
                    </td>

                    {/* Published */}
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className="text-[12px] text-slate-500 font-mono">
                        {article.published_at ? dayjs(article.published_at).fromNow() : "—"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-3.5">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-slate-200 hover:border-primary-400 hover:text-primary-600 text-slate-400 transition-all"
                        title="Open article"
                      >
                        <TbExternalLink className="text-base" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
