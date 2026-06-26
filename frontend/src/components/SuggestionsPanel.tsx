import type { LucideIcon } from "lucide-react"
import {
  Sparkles, CheckCircle, Loader2, Flame, Zap, Minus,
  ArrowRight, Info, ThumbsUp,
} from "lucide-react"
import type { Suggestion } from "../types"

interface SuggestionsPanelProps {
  suggestions: Suggestion[]
  acceptedIds: Set<string>
  poppingId: string | null
  rewriteInstruction: string
  isRewriting: boolean
  onToggle: (id: string) => void
  onRewrite: () => void
  onRewriteInstructionChange: (value: string) => void
}

const SECTION_COLORS: Record<string, string> = {
  Summary:    "bg-[#eef2ff] text-[#4f46e5] border-[#c7d2fe]",
  Experience: "bg-[#f5f3ff] text-[#7c3aed] border-[#ddd6fe]",
  Skills:     "bg-[#f0f9ff] text-[#0284c7] border-[#bae6fd]",
  Education:  "bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]",
  Projects:   "bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]",
  Other:      "bg-[#f8fafc] text-[#64748b] border-[#e2e8f0]",
}

const IMPACT_CONFIG: Record<Suggestion["impact"], { icon: LucideIcon; cls: string }> = {
  high:   { icon: Flame, cls: "text-[#dc2626] bg-[#fef2f2] border-[#fecaca]" },
  medium: { icon: Zap,   cls: "text-[#d97706] bg-[#fffbeb] border-[#fde68a]" },
  low:    { icon: Minus, cls: "text-[#16a34a] bg-[#f0fdf4] border-[#bbf7d0]" },
}

const inputCls = "w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-xs text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1]/50 focus:ring-1 focus:ring-[#6366f1]/15 transition-all"

export default function SuggestionsPanel({
  suggestions,
  acceptedIds,
  poppingId,
  rewriteInstruction,
  isRewriting,
  onToggle,
  onRewrite,
  onRewriteInstructionChange,
}: SuggestionsPanelProps) {
  return (
    <div className="flex-1 flex flex-col gap-2 min-h-0">

      {/* AI Rewrite box */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-3 flex-shrink-0">
        <label className="block text-[10px] font-semibold text-[#64748b] uppercase tracking-widest mb-1.5">
          AI Rewrite
        </label>
        <textarea
          value={rewriteInstruction}
          onChange={e => onRewriteInstructionChange(e.target.value)}
          rows={2}
          placeholder="e.g. use stronger action verbs, shorten my summary…"
          className={`${inputCls} resize-none mb-2`}
          disabled={isRewriting}
        />
        <button
          onClick={onRewrite}
          disabled={!rewriteInstruction.trim() || isRewriting}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          {isRewriting
            ? <><Loader2 size={11} className="animate-spin" />Rewriting…</>
            : <><Sparkles size={11} />Rewrite</>
          }
        </button>
      </div>

      {/* Suggestion cards */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 styled-scroll">
        {suggestions.map((s, i) => {
          const accepted = acceptedIds.has(s.id)
          const canAccept = s.location !== null
          const sectionCls = SECTION_COLORS[s.section] ?? SECTION_COLORS["Other"]
          const { icon: ImpactIcon, cls: impactCls } = IMPACT_CONFIG[s.impact]
          return (
            <div
              key={s.id}
              className={`suggestion-card rounded-xl border p-3 slide-in ${accepted ? "border-[#a7f3d0] bg-[#f0fdf4]" : "border-[#e2e8f0] bg-white"}`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-center justify-between mb-2 gap-1">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${sectionCls}`}>{s.section}</span>
                  <span className={`flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${impactCls}`}>
                    <ImpactIcon size={8} />{s.impact}
                  </span>
                </div>
                <button
                  onClick={() => canAccept && onToggle(s.id)}
                  disabled={!canAccept}
                  title={!canAccept ? "Could not locate this text in your resume — edit manually" : undefined}
                  className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-medium transition-all flex-shrink-0 ${poppingId === s.id ? "pop" : ""} ${
                    !canAccept
                      ? "opacity-40 cursor-not-allowed border border-[#e2e8f0] text-[#94a3b8]"
                      : accepted
                        ? "bg-[#6366f1] text-white"
                        : "border border-[#e2e8f0] text-[#6366f1] hover:border-[#6366f1] hover:bg-[#eef2ff]"
                  }`}
                >
                  {accepted
                    ? <><CheckCircle size={9} />Accepted</>
                    : !canAccept
                      ? <>Manual edit</>
                      : <><ThumbsUp size={9} />Accept</>
                  }
                </button>
              </div>

              <div className="mb-1.5">
                <p className="text-[9px] text-[#dc2626]/60 uppercase tracking-widest mb-0.5 flex items-center gap-0.5"><ArrowRight size={7} />Original</p>
                <p className="text-[10px] text-[#64748b] bg-[#fef2f2] border border-[#fecaca]/60 rounded-lg px-2 py-1.5 leading-relaxed">{s.original}</p>
              </div>

              <div className="mb-1.5">
                <p className="text-[9px] text-[#16a34a]/60 uppercase tracking-widest mb-0.5 flex items-center gap-0.5"><Sparkles size={7} />Suggested</p>
                <p className="text-[10px] text-[#166534] bg-[#f0fdf4] border border-[#bbf7d0]/60 rounded-lg px-2 py-1.5 leading-relaxed font-medium">{s.suggested}</p>
              </div>

              <div className="flex items-start gap-1 text-[9px] text-[#64748b] bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-2 py-1.5">
                <Info size={9} className="mt-0.5 flex-shrink-0 text-[#6366f1]" />
                <span className="leading-relaxed">{s.reason}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
