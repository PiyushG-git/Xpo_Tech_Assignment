import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TbRefresh, TbLoaderQuarter } from "react-icons/tb";
import { api } from "../services/api";

export function RefreshButton() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [jobId, setJobId] = useState(null);

  // Poll status when jobId is present
  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.getIngestionStatus(jobId);
        if (res.status === "completed" || res.status === "failed") {
          setIsRefreshing(false);
          setJobId(null);
          clearInterval(interval);
          
          // Invalidate queries to reload timeline data
          queryClient.invalidateQueries(["timeline"]);
          queryClient.invalidateQueries(["clusters"]);
        }
      } catch (error) {
        console.error("Failed to poll status", error);
        setIsRefreshing(false);
        setJobId(null);
        clearInterval(interval);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [jobId, queryClient]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      const res = await api.triggerIngestion();
      if (res.jobId) {
        setJobId(res.jobId);
      } else {
        setIsRefreshing(false);
      }
    } catch (error) {
      console.error("Failed to trigger ingestion", error);
      setIsRefreshing(false);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all shadow-sm border
        ${isRefreshing
          ? "bg-slate-50 text-slate-400 border-slate-200 cursor-wait"
          : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400"
        }
      `}
    >
      {isRefreshing ? (
        <>
          <TbLoaderQuarter className="animate-spin text-sm" />
          <span>Refreshing...</span>
        </>
      ) : (
        <>
          <TbRefresh className="text-sm" />
          <span>Refresh Data</span>
        </>
      )}
    </button>
  );
}
