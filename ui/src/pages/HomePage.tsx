import { useQuery } from "@apollo/client";
import { Link } from "react-router";
import { IconSchool } from "@tabler/icons-react";
import { Heatmap } from "../components/Heatmap";
import { BASE, ErrorBlock, LoadingBlock, Shell } from "../components/Shell";
import { ME_QUERY } from "../graphql";

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

const MODULES = [
  {
    to: "cards",
    letter: "A",
    glyph: "ᠮ",
    accent: "indigo",
    title: "Монгол бичиг",
    text: "Үсгийн эхэнд, дунд, адагт орох дүрс · галиг → кирилл дасгал",
  },
  {
    to: "language",
    letter: "B",
    glyph: "✍️",
    accent: "coral",
    title: "Монгол хэл",
    text: "Алдаа олох, цээж бичиг, текстээ толь бичгээр шалгах",
  },
  {
    to: "literature",
    letter: "C",
    glyph: "📚",
    accent: "mint",
    title: "Уран зохиол",
    text: "Эхийг уншаад гол санааг өөрийн үгээр · утгын оноо 0–100%",
  },
];

const Modules = () => (
  <div className="edu-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
    {MODULES.map((m) => (
      <Link
        key={m.to}
        to={`${BASE}/${m.to}`}
        className={`edu-glass edu-lesson edu-accent--${m.accent}`}
        style={{ textDecoration: "none", color: "inherit", minHeight: 190 }}
      >
        <div className="edu-between">
          <span className="edu-lesson__emoji" style={{ fontFamily: "'Noto Sans Mongolian', serif" }}>
            {m.glyph}
          </span>
          <span className="edu-tag">Модуль {m.letter}</span>
        </div>
        <h3 className="edu-h1" style={{ fontSize: 22 }}>
          {m.title}
        </h3>
        <p className="edu-muted" style={{ margin: 0, fontSize: 14 }}>
          {m.text}
        </p>
        <span className="edu-btn edu-btn--sm" style={{ marginTop: "auto", alignSelf: "flex-start" }}>
          Нээх →
        </span>
      </Link>
    ))}
  </div>
);

const Tiles = () => {
  const { data } = useQuery(ME_QUERY);
  const canTeach = data?.educationMe.canTeach ?? false;
  const tiles = [
    { to: "shop", emoji: "🛍️", bg: "#ffe3e3", title: "Онооны дэлгүүр", text: "Аватар, streak хамгаалалт" },
    ...(canTeach
      ? [{ to: "teacher", emoji: "🧑‍🏫", bg: "#e7f0ff", title: "Багшийн самбар", text: "Ангийн ахиц, эх нэмэх" }]
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

export const HomePage = () => (
  <Shell title="Нүүр" icon={IconSchool}>
    <Hero />
    <h2 className="edu-h2">Сургалтын 3 модуль</h2>
    <Modules />
    <Tiles />
  </Shell>
);
