"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RotateCcw, X, Loader2 } from "lucide-react";

interface Job { id: string; siteId: string; siteName?: string; title?: string; publishStatus?: string; publishError?: string; createdAt?: string; phase?: string }

export function FailedJobsList() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/failed-jobs?limit=100")
      .then((r) => r.json() as Promise<{ jobs: Job[] }>)
      .then((d) => setJobs(d.jobs))
      .finally(() => setLoading(false));
  }, []);

  const action = async (job: Job, act: "retry" | "dismiss") => {
    setProcessing(job.id);
    const res = await fetch("/api/failed-jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId: job.siteId, postId: job.id, action: act }),
    });
    if (res.ok) {
      if (act === "dismiss") {
        setJobs((prev) => prev.filter((j) => j.id !== job.id));
      } else {
        setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, publishStatus: "approved" } : j));
      }
    }
    setProcessing(null);
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (jobs.length === 0) return (
    <Card><CardContent className="flex flex-col items-center py-16">
      <AlertTriangle className="h-10 w-10 text-muted-foreground mb-4" />
      <p className="font-medium">실패한 작업이 없습니다</p>
    </CardContent></Card>
  );

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <Card key={job.id}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-medium text-sm line-clamp-1">{job.title ?? job.id}</p>
                  <Badge variant="secondary" className="text-[10px]">{job.phase ?? "authority"}</Badge>
                  <Badge className="text-[10px] bg-red-100 text-red-700">{job.publishStatus}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{job.siteName ?? job.siteId}</p>
                {job.publishError && (
                  <p className="text-[11px] text-red-500 mt-1 line-clamp-2 font-mono">{job.publishError}</p>
                )}
                {job.createdAt && (
                  <p className="text-[11px] text-muted-foreground mt-1">{new Date(job.createdAt).toLocaleString("ko-KR")}</p>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button size="sm" variant="outline" className="h-7 text-xs" disabled={processing === job.id || job.publishStatus === "approved"} onClick={() => action(job, "retry")}>
                  {processing === job.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RotateCcw className="h-3.5 w-3.5 mr-1" />}
                  재시도
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" disabled={processing === job.id} onClick={() => action(job, "dismiss")}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
