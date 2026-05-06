"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SiteCreationData {
  // Step 1: Identity
  name: string;
  siteId: string;
  topic: string;
  language: string;
  description: string;
  keywords: string[];
  metaTitle: string;

  // Step 2: Hosting
  hostingType: "nextjs" | "tistory" | "blogger" | "";

  // Step 3: Hosting Setup
  domain: string;
  vercelProjectId: string;
  tistoryBlogName: string;
  tistoryBlogUrl: string;
  bloggerBlogId: string;
  bloggerBlogUrl: string;

  // Step 4: Content Identity
  persona: string;
  tone: string;
  sections: { name: string; slug: string; publishFrequency: string; enabled: boolean }[];

  // Step 5: Sources + Phase
  phase: "authority" | "ongoing";
  sourceUrls: { url: string; type: string; name: string }[];

  // Step 6: Review (no additional fields)
}

interface SiteCreationStore {
  step: number;
  data: SiteCreationData;
  setStep: (step: number) => void;
  updateData: (patch: Partial<SiteCreationData>) => void;
  reset: () => void;
}

const DEFAULT_DATA: SiteCreationData = {
  name: "",
  siteId: "",
  topic: "",
  language: "ko",
  description: "",
  keywords: [],
  metaTitle: "",
  hostingType: "",
  domain: "",
  vercelProjectId: "",
  tistoryBlogName: "",
  tistoryBlogUrl: "",
  bloggerBlogId: "",
  bloggerBlogUrl: "",
  persona: "friendly_expert",
  tone: "friendly",
  sections: [
    { name: "뉴스", slug: "news", publishFrequency: "daily", enabled: true },
    { name: "분석", slug: "analysis", publishFrequency: "thrice_weekly", enabled: true },
    { name: "가이드", slug: "guide", publishFrequency: "weekly", enabled: true },
  ],
  phase: "authority",
  sourceUrls: [],
};

export const useSiteCreationStore = create<SiteCreationStore>()(
  persist(
    (set) => ({
      step: 1,
      data: DEFAULT_DATA,
      setStep: (step) => set({ step }),
      updateData: (patch) =>
        set((state) => ({ data: { ...state.data, ...patch } })),
      reset: () => set({ step: 1, data: DEFAULT_DATA }),
    }),
    {
      name: "site-creation-draft",
    }
  )
);
