import type { KnowledgeSection } from "../../lib/aiPresentation";

interface AiKnowledgeViewProps {
  sections: KnowledgeSection[];
  previewHint: string;
  isRefreshing?: boolean;
  statusBanner?: {
    tone: "processing" | "updated";
    title: string;
    description?: string;
  } | null;
}

interface AiKnowledgeSkeletonProps {
  sectionTitles: string[];
  title: string;
  description: string;
}

export function AiKnowledgeSkeleton({ sectionTitles, title, description }: AiKnowledgeSkeletonProps) {
  return (
    <div className="space-y-4" data-testid="ai-knowledge-skeleton">
      <div className="rounded-2xl border border-sky-200 bg-sky-50/85 px-4 py-4 text-sm text-sky-800">
        <div className="flex items-center gap-3">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />
          <div>
            <p className="font-medium">{title}</p>
            <p className="mt-1 text-xs text-sky-700">{description}</p>
          </div>
        </div>
      </div>

      {sectionTitles.map((sectionTitle, index) => (
        <section
          key={`${sectionTitle}-${index}`}
          className="rounded-3xl border border-slate-200/90 bg-white/95 px-4 py-4 shadow-subtle"
        >
          <div className="h-4 w-32 rounded-full bg-slate-200" />
          <p className="mt-3 text-sm font-semibold text-slate-900">{sectionTitle}</p>
          <div className="mt-4 space-y-3">
            {[0, 1].map((row) => (
              <div
                key={`${sectionTitle}-${row}`}
                className="rounded-2xl border border-slate-200/80 bg-slate-50/65 px-4 py-3"
              >
                <div className="h-3 w-full animate-pulse rounded-full bg-slate-200" />
                <div className="mt-2 h-3 w-4/5 animate-pulse rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function AiKnowledgeView({
  sections,
  previewHint,
  isRefreshing = false,
  statusBanner = null
}: AiKnowledgeViewProps) {
  return (
    <div className="space-y-4">
      {statusBanner ? (
        <div
          data-testid="learning-loading-notice"
          className={`rounded-2xl border px-4 py-3 text-sm ${
            statusBanner.tone === "processing"
              ? "border-sky-200 bg-sky-50/85 text-sky-800"
              : "border-emerald-200 bg-emerald-50/85 text-emerald-800"
          }`}
        >
          <div className="flex items-center gap-3">
            {statusBanner.tone === "processing" ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />
            ) : (
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                ✓
              </span>
            )}
            <div>
              <p className="font-medium">{statusBanner.title}</p>
              {statusBanner.description ? (
                <p className="mt-1 text-xs opacity-90">{statusBanner.description}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/85 px-4 py-3 text-sm text-slate-600">
        <p>{previewHint}</p>
      </div>

      <div className={`space-y-3 transition-opacity ${isRefreshing ? "opacity-80" : "opacity-100"}`}>
        {sections.map((section) => (
          <section
            key={section.key}
            className="rounded-3xl border border-slate-200/90 bg-white/95 px-4 py-4 shadow-subtle"
            data-testid="learning-section-card"
          >
            <h4 className="text-sm font-semibold text-slate-900">{section.title}</h4>
            <ul className="mt-3 space-y-2">
              {section.items.map((item, index) => {
                return (
                  <li
                    key={`${section.key}-${index}`}
                    className="rounded-2xl border border-slate-200/80 bg-slate-50/65 px-4 py-3 text-sm leading-7 text-slate-700"
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 text-slate-400">{index + 1}.</span>
                      <p className="min-w-0 flex-1 text-sm leading-7 text-slate-700">{item.sentence}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
