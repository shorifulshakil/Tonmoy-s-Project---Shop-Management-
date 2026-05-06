export function BarChart({
  data,
  formatVal,
}: {
  data: { label: string; value: number }[];
  formatVal?: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2 h-[140px]">
      {data.map((d) => {
        const h = (d.value / max) * 100;
        return (
          <div
            key={d.label}
            className="flex-1 flex flex-col items-center gap-1.5 h-full"
          >
            <div className="text-[0.62rem] font-mono text-gold">
              {formatVal ? formatVal(d.value) : d.value}
            </div>
            <div className="w-full flex-1 flex items-end">
              <div
                className="w-full bg-gradient-bar rounded-t-[3px] transition-all duration-500 hover:brightness-125"
                style={{ height: `${Math.max(2, h)}%` }}
                title={`${d.label}: ${d.value}`}
              />
            </div>
            <div className="text-[0.62rem] font-mono text-muted-foreground">
              {d.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
