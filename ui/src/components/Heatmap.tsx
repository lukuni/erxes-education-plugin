interface IDay {
  day: string;
  count: number;
}

const level = (count: number) => (count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count < 10 ? 3 : 4);

// Monday-first weekday of a YYYY-MM-DD key (0 = Monday).
const weekday = (day: string) => (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;

/** GitHub-style contribution grid: one column per week, greener = more practice. */
export const Heatmap = ({ days }: { days: IDay[] }) => {
  const first = days[0];
  const padding = first ? weekday(first.day) : 0;
  const today = days[days.length - 1]?.day;
  const activeDays = days.filter((d) => d.count > 0).length;
  const total = days.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="education:flex education:flex-col education:gap-3">
      <div className="edu-heat" role="img" aria-label={`Сүүлийн ${days.length} хоногт ${activeDays} өдөр идэвхтэй`}>
        {Array.from({ length: padding }, (_, i) => (
          <span key={`pad-${i}`} className="edu-heat__cell" data-pad="true" />
        ))}
        {days.map((d) => (
          <span
            key={d.day}
            className="edu-heat__cell"
            data-l={level(d.count)}
            data-today={d.day === today}
            title={`${d.day}: ${d.count} дасгал`}
          />
        ))}
      </div>
      <div className="edu-between edu-muted" style={{ fontSize: 13 }}>
        <span>
          {activeDays} идэвхтэй өдөр · нийт {total} дасгал
        </span>
        <span className="edu-row" style={{ gap: 4 }}>
          Бага
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className="edu-heat__cell" data-l={l} />
          ))}
          Их
        </span>
      </div>
    </div>
  );
};
