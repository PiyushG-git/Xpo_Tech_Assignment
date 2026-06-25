import { useState } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Sidebar } from "./components/Sidebar";
import { TopHeader } from "./components/TopHeader";
import { Timeline } from "./components/Timeline";
import { ClusterDetails } from "./components/ClusterDetails";
import { api } from "./services/api";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

function Dashboard() {
  const [selectedClusterId, setSelectedClusterId] = useState(null);
  const [selectedSources, setSelectedSources] = useState([
    "BBC News", "NPR", "The Guardian", "New York Times"
  ]);

  const { data: timelineData, isLoading, isError } = useQuery({
    queryKey: ["timeline"],
    queryFn: api.getTimeline,
    staleTime: 60_000,
  });

  return (
    <div className="min-h-screen flex bg-[#f0f2f8]">
      <Sidebar 
        selectedSources={selectedSources} 
        onToggleSource={(source) => {
          setSelectedSources(prev => 
            prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
          );
        }}
      />

      {/* Main area — offset by sidebar */}
      <div className="flex-1 ml-[220px] flex flex-col min-h-screen">
        <TopHeader />

        <main className="flex-1 px-7 py-6 max-w-[1400px] mx-auto w-full">

          {/* Page header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-[22px] font-bold text-slate-900 tracking-tight leading-tight">
                Topic Analytics
              </h1>
              <p className="text-[13px] text-slate-500 mt-0.5">
                Auto-clustered news topics from last 24 hours
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {timelineData && (
                <span className="text-[11px] font-mono text-slate-400 mr-1">
                  {timelineData.length} cluster{timelineData.length !== 1 ? "s" : ""} loaded
                </span>
              )}
              <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-[12px] font-medium text-slate-600 bg-white hover:bg-slate-50 transition-colors shadow-sm">
                ⇅ Filter
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-[12px] font-medium text-slate-600 bg-white hover:bg-slate-50 transition-colors shadow-sm">
                ↓ Export
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="mb-6">
            {isLoading ? (
              <div className="h-72 bg-white rounded-xl border border-slate-200 shadow-sm animate-pulse flex flex-col p-6 gap-3">
                <div className="h-4 bg-slate-100 rounded w-36"></div>
                {[1,2,3,4].map(i => <div key={i} className="h-8 bg-slate-100 rounded"></div>)}
              </div>
            ) : isError ? (
              <div className="h-48 flex flex-col items-center justify-center bg-red-50 border border-red-200 rounded-xl text-red-600 text-center gap-2">
                <p className="font-semibold">⚠ Failed to load timeline</p>
                <p className="text-sm text-red-400">Is the backend server running?</p>
              </div>
            ) : (
              <Timeline
                data={timelineData.filter(c => 
                  c.sources && c.sources.some(s => selectedSources.includes(s))
                )}
                onClusterSelect={setSelectedClusterId}
                selectedClusterId={selectedClusterId}
              />
            )}
          </div>

          {/* Cluster details */}
          <ClusterDetails 
            clusterId={selectedClusterId} 
            selectedSources={selectedSources}
          />
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}

export default App;
