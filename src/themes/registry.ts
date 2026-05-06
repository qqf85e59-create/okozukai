export type ThemeId =
  | "v01" | "v02" | "v03" | "v04" | "v05"
  | "v06" | "v07" | "v08" | "v09" | "v10"
  | "v11" | "v12" | "v13" | "v14" | "v15"
  | "v16" | "v17" | "v18" | "v19" | "v20";

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  nameJp: string;
  audience: string;
  colors: {
    bg: string;
    surface: string;
    primary: string;
    accent: string;
    text: string;
  };
}

export const THEMES: Record<ThemeId, ThemeMeta> = {
  v01: { id: "v01", name: "Pop Candy",        nameJp: "ポップ・キャンディ",      audience: "小学生",          colors: { bg: "#FFF5E1", surface: "#FFFFFF", primary: "#FF4D9D", accent: "#FFD93D", text: "#2C1810" } },
  v02: { id: "v02", name: "Monster Quest",    nameJp: "モンスター・クエスト",    audience: "小学生",          colors: { bg: "#0F1A3D", surface: "#1A2A5C", primary: "#FFD93D", accent: "#06D6A0", text: "#F4E9C7" } },
  v03: { id: "v03", name: "Animal",           nameJp: "どうぶつアニマル",        audience: "小学生",          colors: { bg: "#FAF3DD", surface: "#FFFFFF", primary: "#7BA05B", accent: "#F4D35E", text: "#3D2C1E" } },
  v04: { id: "v04", name: "Sticker Book",     nameJp: "シールコレクション",      audience: "小学生",          colors: { bg: "#F1FAEE", surface: "#FFFFFF", primary: "#E63946", accent: "#F1C453", text: "#1D3557" } },
  v05: { id: "v05", name: "Neon Street",      nameJp: "ネオン・ストリート",      audience: "中学生",          colors: { bg: "#0D0B14", surface: "#1A1625", primary: "#FF006E", accent: "#FFBE0B", text: "#FFFFFF" } },
  v06: { id: "v06", name: "Minimal Mono",     nameJp: "ミニマル・モノクロ",      audience: "中学生",          colors: { bg: "#FAFAFA", surface: "#FFFFFF", primary: "#000000", accent: "#FF3B30", text: "#000000" } },
  v07: { id: "v07", name: "Y2K Nostalgia",    nameJp: "Y2K ノスタルジア",        audience: "中学生",          colors: { bg: "#FEE3F8", surface: "rgba(255,255,255,0.85)", primary: "#9B5DE5", accent: "#00BBF9", text: "#3A2A5C" } },
  v08: { id: "v08", name: "Journal Line",     nameJp: "ジャーナル・ライン",      audience: "中学生",          colors: { bg: "#F4EFE2", surface: "#FBF8EF", primary: "#2D5016", accent: "#D67D3E", text: "#2D2417" } },
  v09: { id: "v09", name: "Cinematic Noir",   nameJp: "シネマティック・ノワール", audience: "高校生",          colors: { bg: "#0E0E0E", surface: "#1A1A1A", primary: "#F5F5F5", accent: "#D4AF37", text: "#F5F5F5" } },
  v10: { id: "v10", name: "Vaporwave",        nameJp: "ヴェイパーウェイブ",      audience: "高校生",          colors: { bg: "#FFE5EC", surface: "#FFFFFF", primary: "#FF8FB1", accent: "#FFC15E", text: "#3D2C5C" } },
  v11: { id: "v11", name: "Editorial Grid",   nameJp: "エディトリアル・グリッド", audience: "高校生",         colors: { bg: "#FBFBFD", surface: "#FFFFFF", primary: "#0071E3", accent: "#0071E3", text: "#1D1D1F" } },
  v12: { id: "v12", name: "Street Graffiti",  nameJp: "ストリート・グラフィティ", audience: "高校生",         colors: { bg: "#FFFFFF", surface: "#000000", primary: "#FFE600", accent: "#FF006E", text: "#000000" } },
  v13: { id: "v13", name: "Japanese Minimal", nameJp: "ジャパニーズ・ミニマル",  audience: "大人",            colors: { bg: "#F7F4ED", surface: "#FFFFFF", primary: "#B7282E", accent: "#B7282E", text: "#1A1A1A" } },
  v14: { id: "v14", name: "Family Warm",      nameJp: "ファミリー・ウォーム",    audience: "大人",            colors: { bg: "#F4F1DE", surface: "#FFFFFF", primary: "#E07A5F", accent: "#F2CC8F", text: "#3D405B" } },
  v15: { id: "v15", name: "Fintech Modern",   nameJp: "フィンテック・モダン",    audience: "大人",            colors: { bg: "#0F0F23", surface: "#1A1B36", primary: "#00D9A3", accent: "#00D9A3", text: "#FFFFFF" } },
  v16: { id: "v16", name: "Craft Paper",      nameJp: "クラフト・ペーパー",      audience: "大人",            colors: { bg: "#E9DFC9", surface: "#FBF7EF", primary: "#C97B4F", accent: "#C97B4F", text: "#3A2817" } },
  v17: { id: "v17", name: "Enterprise Blue",  nameJp: "エンタープライズ・ブルー", audience: "ビジネス",        colors: { bg: "#F8FAFC", surface: "#FFFFFF", primary: "#1E40AF", accent: "#3B82F6", text: "#0F172A" } },
  v18: { id: "v18", name: "Monochrome Doc",   nameJp: "モノクロ・ドキュメント",  audience: "ビジネス",        colors: { bg: "#FFFFFF", surface: "#FFFFFF", primary: "#000000", accent: "#000000", text: "#000000" } },
  v19: { id: "v19", name: "Green Sustainable",nameJp: "グリーン・サステナブル",  audience: "ビジネス",        colors: { bg: "#F0FDF4", surface: "#FFFFFF", primary: "#16A34A", accent: "#0891B2", text: "#14532D" } },
  v20: { id: "v20", name: "Grayscale Command",nameJp: "グレースケール・コマンド", audience: "ビジネス",        colors: { bg: "#0B0F1A", surface: "#1F2937", primary: "#10B981", accent: "#FBBF24", text: "#E5E7EB" } },
};

export const DEFAULT_THEME_ID: ThemeId = "v14";
