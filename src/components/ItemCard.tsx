"use client";

type Props = {
  id: string;
  name: string;
  category: string;
  effectiveMin: number;
  onRequest: (itemId: string, name: string, effectiveMin: number, category: string) => void;
};

const CATEGORY_CONFIG: Record<string, {
  label: string;
  borderColor: string;
  badgeBg: string;
  badgeColor: string;
  bg: string;
  btnBg: string;
  btnBorder: string;
  timeColor: string;
}> = {
  chore: {
    label: "おてつだい",
    borderColor: "#f59e0b",
    badgeBg: "#fef3c7",
    badgeColor: "#92400e",
    bg: "white",
    btnBg: "#f59e0b",
    btnBorder: "#92400e",
    timeColor: "#d97706",
  },
  study: {
    label: "べんきょう",
    borderColor: "#3B4CCA",
    badgeBg: "#eef2ff",
    badgeColor: "#1e40af",
    bg: "white",
    btnBg: "#3B4CCA",
    btnBorder: "#1a1e4e",
    timeColor: "#3B4CCA",
  },
  penalty: {
    label: "マイナス",
    borderColor: "#CC0000",
    badgeBg: "#fff0f0",
    badgeColor: "#991b1b",
    bg: "#fff8f8",
    btnBg: "#CC0000",
    btnBorder: "#7f1d1d",
    timeColor: "#CC0000",
  },
};

function formatMin(min: number) {
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = min < 0 ? "-" : "+";
  if (h === 0) return `${sign}${m}分`;
  return `${sign}${h}時間${m > 0 ? m + "分" : ""}`;
}

export function ItemCard({ id, name, category, effectiveMin, onRequest }: Props) {
  const cfg = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.chore;

  return (
    <div
      className="rounded-2xl flex items-center justify-between gap-3 p-4 shadow-sm bg-white dark:bg-gray-900"
      style={{
        borderLeft: `5px solid ${cfg.borderColor}`,
        border: `1px solid ${cfg.borderColor}33`,
        borderLeftWidth: "5px",
        borderLeftColor: cfg.borderColor,
      }}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {/* カテゴリバッジ */}
        <span
          className="shrink-0 text-xs font-black px-2 py-1 rounded-lg mt-0.5"
          style={{ background: cfg.badgeBg, color: cfg.badgeColor }}
        >
          {cfg.label}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-black text-gray-800 dark:text-gray-100 text-sm leading-snug line-clamp-2">{name}</p>
          <p className="text-sm font-black mt-0.5" style={{ color: cfg.timeColor }}>
            {formatMin(effectiveMin)}
          </p>
        </div>
      </div>

      <button
        onClick={() => onRequest(id, name, effectiveMin, category)}
        className="shrink-0 px-4 py-2 rounded-xl font-black text-sm text-white min-h-[44px] min-w-[64px] transition-all active:scale-95"
        style={{
          background: cfg.btnBg,
          border: `2px solid ${cfg.btnBorder}`,
          boxShadow: `0 3px 0 ${cfg.btnBorder}`,
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(3px)")}
        onMouseUp={(e) => (e.currentTarget.style.transform = "")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
      >
        申請
      </button>
    </div>
  );
}
