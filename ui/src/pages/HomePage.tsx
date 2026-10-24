import { useQuery } from "@apollo/client";
import { Link } from "react-router";
import { IconSchool } from "@tabler/icons-react";
import { Heatmap } from "../components/Heatmap";
import { BASE, EmptyBlock, ErrorBlock, LoadingBlock, Shell } from "../components/Shell";
import { LESSONS_QUERY, ME_QUERY } from "../graphql";

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Өглөөний мэнд";
  if (hour < 18) return "Өдрийн мэнд";
  return "Оройн мэнд";
};

const Hero = () => {
  const { data, loading, error, refetch } = useQuery(ME_QUERY);
  if (loading) return <LoadingBlock height={190} />;
  if (error || !data) return <ErrorBlock message={error?.message ?? "No data"} onRetry={() => refetch()} />;
  const me = data.educationMe;

  return (
    <section className="edu-glass edu-rise">
      <div className="edu-between" style={{ alignItems: "flex-start" }}>
        <div className="edu-row" style={{ gap: 18, alignItems: "flex-start" }}>
          <Link to={`${BASE}/shop`} className="edu-avatar" title="Аватар солих">
            {me.avatar}
          </Link>
          <div className="education:flex education:flex-col education:gap-2">
            <span className="edu-muted" style={{ fontWeight: 700 }}>
              {greeting()},
            </span>
            <h1 className="edu-h1">{me.name} 👋</h1>
            <div className="edu-row" style={{ gap: 8 }}>
              <span className="edu-pill edu-pill--fire">
                <span className="edu-flame">🔥</span> {me.streak} өдөр
              </span>
              <span className="edu-pill edu-pill--gem">💎 {me.points} оноо</span>
              <span className="edu-pill edu-pill--mint">🎯 {me.accuracy ?? "–"}%</span>
              <span className="edu-pill edu-pill--ice">🧊 {me.freezes}</span>
            </div>
          </div>
        </div>
        <div style={{ minWidth: 240, flex: "1 1 240px", maxWidth: 360 }}>
          <div className="edu-between" style={{ marginBottom: 8, fontWeight: 800 }}>
            <span>Түвшин {me.level}</span>
            <span className="edu-muted">
              {me.levelXp}/{me.levelSize} XP
            </span>
          </div>
          <div className="edu-bar edu-bar--indigo">
            <span style={{ width: `${(me.levelXp / me.levelSize) * 100}%` }} />
          </div>
          <p className="edu-muted" style={{ marginTop: 10, fontSize: 14 }}>
            {me.practicedToday
              ? "✅ Өнөөдрийн дасгалаа хийлээ. Streak хадгалагдсан!"
              : "⏳ Өнөөдөр нэг дасгал хийгээд streak-ээ үргэлжлүүлээрэй."}
          </p>
        </div>
      </div>
      <div style={{ marginTop: 22 }}>
        <div className="edu-between" style={{ marginBottom: 10 }}>
          <h2 className="edu-h2">Идэвхийн график</h2>
          <span className="edu-muted" style={{ fontSize: 13 }}>
            Хамгийн урт streak: {me.bestStreak} өдөр
          </span>
        </div>
        <Heatmap days={me.heatmap} />
      </div>
    </section>
  );
};

const Tiles = () => {
  const { data } = useQuery(ME_QUERY);
  const mistakes = data?.educationMe.mistakes.length ?? 0;
  const canTeach = data?.educationMe.canTeach ?? false;

  const tiles = [
    { to: "cards", emoji: "ᠮ", bg: "#ece9ff", title: "Монгол бичиг · Галиг", text: "Сонгох эсвэл кириллээр бичих" },
    { to: "literature", emoji: "📚", bg: "#e7f0ff", title: "Уран зохиол · ЭЕШ", text: "Гол санааг өөрийн үгээр" },
    {
      to: "review",
      emoji: "🔁",
      bg: "#fff2d6",
      title: "Алдаа засах",
      text: mistakes ? `${mistakes} үг давтах` : "Алдаа алга 🎉",
    },
    { to: "ai", emoji: "✨", bg: "#dcfaf0", title: "AI туслах", text: "Gemma 4 засварлагч" },
    { to: "shop", emoji: "🛍️", bg: "#ffe3e3", title: "Онооны дэлгүүр", text: "Аватар, хамгаалалт" },
    ...(canTeach
      ? [{ to: "teacher", emoji: "🧑‍🏫", bg: "#e7f0ff", title: "Багшийн самбар", text: "Ангийн ахиц" }]
      : []),
  ];

  return (
    <div className="edu-grid">
      {tiles.map((tile) => (
        <Link key={tile.to} to={`${BASE}/${tile.to}`} className="edu-glass edu-tile">
          <span className="edu-tile__icon" style={{ background: tile.bg }}>
            {tile.emoji}
          </span>
          <span>
            <strong>{tile.title}</strong>
            <br />
            <span className="edu-muted" style={{ fontSize: 14 }}>
              {tile.text}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
};

const Lessons = () => {
  const { data, loading, error, refetch } = useQuery(LESSONS_QUERY);
  if (loading) return <LoadingBlock height={180} />;
  if (error || !data) return <ErrorBlock message={error?.message ?? "No data"} onRetry={() => refetch()} />;
  if (data.educationLessons.length === 0) {
    return <EmptyBlock emoji="📭" title="Хичээл алга. Багш шинэ хичээл нэмэх хэрэгтэй." />;
  }

  return (
    <div className="edu-grid">
      {data.educationLessons.map((lesson) => (
        <article key={lesson._id} className={`edu-glass edu-lesson edu-accent--${lesson.color}`}>
          <div className="edu-between">
            <span className="edu-lesson__emoji">{lesson.emoji}</span>
            {lesson.bestScore !== null && lesson.bestScore !== undefined ? (
              <span className={`edu-tag ${lesson.bestScore === 100 ? "edu-tag--mint" : ""}`}>
                {lesson.bestScore === 100 ? "⭐ 100%" : `Шилдэг ${lesson.bestScore}%`}
              </span>
            ) : (
              <span className="edu-tag edu-tag--amber">Шинэ</span>
            )}
          </div>
          <h3 className="edu-h2">{lesson.title}</h3>
          <p className="edu-muted" style={{ margin: 0, fontSize: 14 }}>
            {lesson.description}
          </p>
          <div className="edu-between" style={{ marginTop: "auto" }}>
            <span className="edu-muted" style={{ fontSize: 13 }}>
              {lesson.itemCount} өгүүлбэр{lesson.source === "gemma" ? " · ✨ Gemma" : ""}
            </span>
            <Link to={`${BASE}/dictation/${lesson._id}`} className="edu-btn edu-btn--sm">
              ▶ Эхлэх
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
};

export const HomePage = () => (
  <Shell title="Монгол бичиг ба цээж бичиг" icon={IconSchool}>
    <Hero />
    <div className="edu-between">
      <h2 className="edu-h2">🎧 Онлайн цээж бичиг</h2>
      <span className="edu-muted" style={{ fontSize: 14 }}>
        Зөв хариулт бүр +10 XP
      </span>
    </div>
    <Lessons />
    <Tiles />
  </Shell>
);
