import type { ResumeStyle } from "../types"

interface StylePanelProps {
  style: ResumeStyle
  onChange: (updater: (s: ResumeStyle) => ResumeStyle) => void
}

const SLIDERS = [
  { key: "sectionSpacing", label: "Section Spacing", min: 4,   max: 24,  step: 1,    unit: "px" },
  { key: "entrySpacing",   label: "Entry Spacing",   min: 2,   max: 16,  step: 1,    unit: "px" },
  { key: "lineSpacing",    label: "Line Spacing",    min: 1.0, max: 2.0, step: 0.05, unit: ""   },
] as const

export default function StylePanel({ style, onChange }: StylePanelProps) {
  return (
    <div className="flex-1 overflow-y-auto rounded-xl border border-[#e2e8f0] bg-white p-4 styled-scroll">
      <label className="block text-[10px] font-semibold text-[#64748b] uppercase tracking-widest mb-2">Accent Color</label>
      <div className="flex items-center gap-3 mb-2">
        <input
          type="color"
          value={style.accentColor}
          onChange={e => onChange(s => ({ ...s, accentColor: e.target.value }))}
          className="w-10 h-10 rounded-lg cursor-pointer border border-[#e2e8f0] p-0.5"
        />
        <span className="text-xs text-[#64748b] font-mono">{style.accentColor}</span>
      </div>
      <p className="text-[10px] text-[#94a3b8]">Colors section headings in preview and exported PDF.</p>

      <div className="mt-4">
        <label className="block text-[10px] font-semibold text-[#64748b] uppercase tracking-widest mb-2">Header Alignment</label>
        <div className="flex gap-0.5 bg-[#f1f5f9] rounded-lg p-0.5">
          {(["left", "center", "right"] as const).map(align => (
            <button
              key={align}
              onClick={() => onChange(s => ({ ...s, headerAlignment: align }))}
              className={`flex-1 py-1.5 rounded-md text-[10px] font-medium capitalize transition-all ${style.headerAlignment === align ? "bg-white text-[#6366f1] shadow-sm" : "text-[#64748b] hover:text-[#0f172a]"}`}
            >
              {align.charAt(0).toUpperCase() + align.slice(1)}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-[#94a3b8] mt-1.5">Aligns the name and contact header block.</p>
      </div>

      {SLIDERS.map(({ key, label, min, max, step, unit }) => (
        <div key={key} className="mt-4">
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[10px] font-semibold text-[#64748b] uppercase tracking-widest">{label}</label>
            <span className="text-[10px] font-mono text-[#6366f1]">{style[key].toFixed(step < 1 ? 2 : 0)}{unit}</span>
          </div>
          <input
            type="range"
            min={min} max={max} step={step}
            value={style[key]}
            onChange={e => onChange(s => ({ ...s, [key]: parseFloat(e.target.value) }))}
            className="w-full accent-[#6366f1] cursor-pointer"
          />
        </div>
      ))}
    </div>
  )
}
