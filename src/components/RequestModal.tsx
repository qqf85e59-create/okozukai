"use client";

import { useState, useRef } from "react";

type Props = {
  itemId: string;
  itemName: string;
  effectiveMin: number;
  category: string;
  onClose: () => void;
  onSuccess: () => void;
};

const CATEGORY_COLOR: Record<string, { header: string; border: string; bg: string }> = {
  chore:   { header: "var(--expo-blue)", border: "#005699", bg: "var(--expo-light-blue)" },
  study:   { header: "var(--expo-green)", border: "#008039", bg: "#dcfce7" },
  penalty: { header: "var(--expo-red)", border: "#b3000e", bg: "#fee2e2" },
};

function formatMin(min: number) {
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = min < 0 ? "-" : "+";
  if (h === 0) return `${sign}${m}分`;
  return `${sign}${h}時間${m > 0 ? m + "分" : ""}`;
}

export function RequestModal({ itemId, itemName, effectiveMin, category, onClose, onSuccess }: Props) {
  const [note, setNote] = useState("");
  const [studyActualMin, setStudyActualMin] = useState("");
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isStudyFree = category === "study" && effectiveMin === 0;
  const isPenalty = category === "penalty";
  const cfg = CATEGORY_COLOR[category] ?? CATEGORY_COLOR.chore;

  const totalMin = isStudyFree ? (Number(studyActualMin) || 0) : effectiveMin * count;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const maxFiles = 3;
    const maxSize = 5 * 1024 * 1024; // 5MB

    const valid = selected.filter((f) => f.size <= maxSize).slice(0, maxFiles - files.length);
    if (valid.length < selected.length) {
      setError("5MB以下のファイルを最大3枚まで添付できます");
    }
    setFiles((prev) => [...prev, ...valid].slice(0, maxFiles));
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPenalty && !note.trim()) {
      setError("マイナス申請の内容を入力してください（正直に！）");
      return;
    }
    setLoading(true);
    setError("");

    try {
      if (files.length > 0) {
        const formData = new FormData();
        formData.append("itemId", itemId);
        formData.append("count", String(count));
        if (note.trim()) formData.append("note", note.trim());
        if (isStudyFree && studyActualMin) formData.append("studyActualMin", studyActualMin);
        files.forEach((f) => formData.append("files", f));

        const res = await fetch("/api/requests", { method: "POST", body: formData });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "エラーが発生しました");
          setLoading(false);
          return;
        }
      } else {
        const body: Record<string, unknown> = { itemId, count, note: note.trim() || undefined };
        if (isStudyFree && studyActualMin) body.studyActualMin = Number(studyActualMin);

        const res = await fetch("/api/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "エラーが発生しました");
          setLoading(false);
          return;
        }
      }

      onSuccess();
      onClose();
    } catch {
      setError("送信に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[rgba(26,26,26,0.6)] flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div
        className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
      >
        {/* ヘッダー */}
        <div
          className="px-6 py-5 text-white flex items-center gap-3"
          style={{ background: cfg.header }}
        >
          <div className="w-2.5 h-2.5 myaku-eye shrink-0" style={{ border: "2px solid white", background: "white" }} />
          <div>
            <p className="font-display text-lg tracking-wider leading-tight">申請する</p>
            <p className="text-xs font-bold opacity-90 mt-0.5">{itemName}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {isStudyFree && (
            <div>
              <label className="block text-xs font-black mb-2 text-gray-600 dark:text-gray-300 tracking-wider">
                活動時間（分）
              </label>
              <input
                type="number"
                min="1"
                max="480"
                value={studyActualMin}
                onChange={(e) => setStudyActualMin(e.target.value)}
                required
                className="w-full rounded-2xl px-4 py-3 text-base font-bold transition-all bg-gray-50 dark:bg-gray-800 dark:text-gray-100 border-2 border-transparent focus:bg-white dark:focus:bg-gray-700"
                style={{ outline: "none" }}
                onFocus={(e) => (e.target.style.borderColor = cfg.header)}
                onBlur={(e) => (e.target.style.borderColor = "transparent")}
                placeholder="例: 30"
              />
            </div>
          )}

          {!isStudyFree && (
            <div>
              <label className="block text-xs font-black mb-2 text-gray-600 dark:text-gray-300 tracking-wider">
                活動回数
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCount(Math.max(1, count - 1))}
                  className="w-12 h-12 rounded-2xl font-black text-xl flex items-center justify-center transition-all active:scale-95 bg-gray-100 text-gray-600"
                >
                  -
                </button>
                <span className="flex-1 text-center font-display text-3xl" style={{ color: cfg.header }}>
                  {count}
                </span>
                <button
                  type="button"
                  onClick={() => setCount(Math.min(20, count + 1))}
                  className="w-12 h-12 rounded-2xl font-black text-xl flex items-center justify-center transition-all active:scale-95 text-white pulse-beat"
                  style={{ background: cfg.header }}
                >
                  +
                </button>
              </div>

              {/* プレビュー */}
              <div
                className="mt-4 rounded-2xl px-4 py-3 text-center font-black text-sm"
                style={{ background: cfg.bg, color: cfg.header }}
              >
                {count > 1
                  ? `${count}回 × ${formatMin(effectiveMin)} = ${formatMin(totalMin)}`
                  : formatMin(totalMin)}
              </div>
            </div>
          )}

          {/* 内容欄 */}
          <div>
            <label className="block text-xs font-black mb-2 text-gray-600 dark:text-gray-300 tracking-wider">
              {isPenalty ? "マイナス申請の内容" : "コメント"}
              {isPenalty
                ? <span className="ml-2 text-[10px] font-bold text-[var(--expo-red)]">※ 正直に報告</span>
                : <span className="ml-2 text-[10px] font-bold text-gray-400">（任意）</span>
              }
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              required={isPenalty}
              className="w-full rounded-2xl px-4 py-3 text-sm font-bold resize-none transition-all bg-gray-50 dark:bg-gray-800 dark:text-gray-100 border-2 border-transparent focus:bg-white dark:focus:bg-gray-700"
              style={{ outline: "none" }}
              onFocus={(e) => (e.target.style.borderColor = isPenalty ? "var(--expo-red)" : cfg.header)}
              onBlur={(e) => (e.target.style.borderColor = "transparent")}
              placeholder={
                isPenalty
                  ? "例: 宿題をやらなかった…"
                  : "特記事項があれば入力"
              }
            />
          </div>

          {/* 写真添付 */}
          <div>
            <label className="block text-xs font-black mb-2 text-gray-600 dark:text-gray-300 tracking-wider">
              証拠写真 <span className="text-[10px] font-bold text-gray-400">（任意・最大3枚）</span>
            </label>
            {files.length > 0 && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {files.map((f, i) => (
                  <div key={i} className="relative group">
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200">
                      <img
                        src={URL.createObjectURL(f)}
                        alt={`添付${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[var(--expo-red)] text-white text-xs flex items-center justify-center font-black shadow-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {files.length < 3 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 rounded-2xl text-sm font-bold transition-all active:scale-95 border-2 border-dashed"
                style={{ borderColor: "rgba(0,104,183,0.3)", color: "var(--expo-blue)", background: "var(--expo-light-blue)" }}
              >
                + 写真を追加する
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {error && (
            <div className="rounded-xl px-3 py-2 bg-red-50 text-xs font-bold text-[var(--expo-red)] flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-[var(--expo-red)] text-white flex items-center justify-center">!</span>
              {error}
            </div>
          )}

          {/* ボタン */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-full font-black text-gray-500 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 transition-all active:scale-95"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading || (isStudyFree && !studyActualMin)}
              className="flex-1 py-3.5 rounded-full font-black text-white transition-all disabled:opacity-50 pulse-beat shadow-md"
              style={{ background: cfg.header }}
            >
              {loading ? "送信中..." : "申請する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
