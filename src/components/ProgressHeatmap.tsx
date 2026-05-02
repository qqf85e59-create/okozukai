import { useMemo } from "react";

type RequestData = {
  status: string;
  minutes: number;
  requestedAt: string;
  item: { category: string };
};

export function ProgressHeatmap({ requests }: { requests: RequestData[] }) {
  const data = useMemo(() => {
    // Generate last 14 days
    const days: { date: string; studyMin: number; choreMin: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit" });
      days.push({ date: ds, studyMin: 0, choreMin: 0 });
    }

    requests.forEach((req) => {
      if (req.status !== "approved" && req.status !== "pending") return;
      if (req.minutes <= 0) return;

      const d = new Date(req.requestedAt);
      const ds = d.toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit" });

      const day = days.find((x) => x.date === ds);
      if (day) {
        if (req.item.category === "study") day.studyMin += req.minutes;
        if (req.item.category === "chore") day.choreMin += req.minutes;
      }
    });

    return days;
  }, [requests]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 mt-5">
      <h3 className="text-xs font-black text-gray-500 dark:text-gray-300 mb-3 tracking-wider">最近の活動ヒートマップ（14日間）</h3>
      <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
        {data.map((day, i) => {
          const total = day.studyMin + day.choreMin;
          let bg = "bg-gray-100";
          if (total > 0) bg = "bg-blue-200";
          if (total >= 30) bg = "bg-blue-400";
          if (total >= 60) bg = "bg-blue-600";
          
          return (
            <div key={i} className="flex flex-col items-center gap-1 shrink-0">
              <div 
                className={`w-7 h-7 rounded-md ${bg} transition-colors duration-300`}
                title={`${day.date}: ${total}分`}
              />
              {i % 3 === 0 || i === data.length - 1 ? (
                <span className="text-[9px] font-bold text-gray-400 dark:text-gray-300">{day.date.split('/')[1]}</span>
              ) : (
                <span className="text-[9px] text-transparent">{day.date.split('/')[1]}</span>
              )}
            </div>
          );
        })}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
