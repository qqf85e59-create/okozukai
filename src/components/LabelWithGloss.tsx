export function LabelWithGloss({ main, gloss }: { main: string; gloss: string }) {
  return (
    <span className="inline-flex items-baseline gap-1 flex-wrap">
      <span>{main}</span>
      <span className="text-[0.78em] font-bold opacity-70">（{gloss}）</span>
    </span>
  );
}
