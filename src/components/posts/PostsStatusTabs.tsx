import Link from "next/link";

const TABS = [
  { value: "published", label: "발행됨" },
  { value: "approved", label: "승인됨" },
  { value: "draft", label: "임시저장" },
  { value: "failed", label: "실패" },
  { value: "all", label: "전체" },
];

export function PostsStatusTabs({
  current,
  basePath = "/posts",
}: {
  current: string;
  basePath?: string;
}) {
  return (
    <div className="flex gap-1 border-b">
      {TABS.map((tab) => {
        const isActive = current === tab.value;
        return (
          <Link
            key={tab.value}
            href={`${basePath}?status=${tab.value}`}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
