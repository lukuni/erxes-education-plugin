import { useMutation, useQuery } from "@apollo/client";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { IconHeadphones } from "@tabler/icons-react";
import { ItemPlayer, ReviewRun, type PlayItem } from "../components/Exercise";
import { BASE, EmptyBlock, ErrorBlock, LoadingBlock, Shell } from "../components/Shell";
import { LESSON_QUERY, REVIEW_COMPLETE, SUBMIT_ATTEMPT } from "../graphql";
import { confetti, sound } from "../lib/fx";
import { useVoice } from "../lib/voice";

type Stage = "intro" | "play" | "result" | "review" | "mastered";

const REFRESH = ["educationMe", "educationLessons"];

export const DictationPage = () => {
  const { lessonId = "" } = useParams();
  const { data, loading, error, refetch } = useQuery(LESSON_QUERY, { variables: { _id: lessonId } });
  const [submit, submitState] = useMutation(SUBMIT_ATTEMPT, { refetchQueries: REFRESH });
  const [reviewComplete, reviewState] = useMutation(REVIEW_COMPLETE, { refetchQueries: REFRESH });
  const { voiceLabel } = useVoice();

  const [stage, setStage] = useState<Stage>("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const lesson = data?.educationLesson;
  const title = lesson?.title ?? "Цээж бичиг";

  if (loading) {
    return (
      <Shell title={title} icon={IconHeadphones}>
        <LoadingBlock height={320} />
      </Shell>
    );
  }
  if (error) {
    return (
      <Shell title={title} icon={IconHeadphones}>
        <ErrorBlock message={error.message} onRetry={() => refetch()} />
      </Shell>
    );
  }
  if (!lesson || lesson.items.length === 0) {
    return (
      <Shell title={title} icon={IconHeadphones}>
        <EmptyBlock emoji="🔎" title="Хичээл олдсонгүй">
          <Link to={BASE} className="edu-btn">
            Нүүр хуудас
          </Link>
        </EmptyBlock>
      </Shell>
    );
  }

  const total = lesson.items.length;
  const missed: PlayItem[] = lesson.items.filter((_, i) => answers[i] === false);
  const result = submitState.data?.educationSubmitAttempt;

  const restart = () => {
    setAnswers([]);
    setIndex(0);
    setSubmitError(null);
    submitState.reset();
    reviewState.reset();
    setStage("play");
  };

  const finish = async (all: boolean[]) => {
    setStage("result");
    try {
      const res = await submit({
        variables: { lessonId: lesson._id, answers: all.map((correct, i) => ({ index: i, correct })) },
      });
      if (res.data?.educationSubmitAttempt.perfect) {
        sound("win");
        confetti(undefined, 140);
      } else {
        sound("good");
      }
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Хадгалж чадсангүй");
    }
  };

  const answer = (correct: boolean) => {
    const next = [...answers];
    next[index] = correct;
    setAnswers(next);
    if (index + 1 < total) setIndex(index + 1);
    else void finish(next);
  };

  const finishReview = async (words: string[]) => {
    setStage("mastered");
    sound("win");
    confetti(undefined, 160);
    try {
      await reviewComplete({ variables: { words } });
    } catch {
      // Mastery still shows; the words stay in the review list for next time.
    }
  };

  const correctCount = answers.filter(Boolean).length;
  const percent = Math.round((correctCount / total) * 100);

  return (
    <Shell title={title} icon={IconHeadphones}>
      {stage === "intro" && (
        <section className="edu-glass edu-stage edu-rise">
          <div className="edu-lesson__emoji" style={{ width: 96, height: 96, fontSize: 52, borderRadius: 32 }}>
            {lesson.emoji}
          </div>
          <h1 className="edu-h1">{lesson.title}</h1>
          <p className="edu-muted" style={{ margin: 0 }}>
            {lesson.description}
          </p>
          <div className="edu-row" style={{ justifyContent: "center" }}>
            <span className="edu-pill">📝 {total} өгүүлбэр</span>
            <span className="edu-pill edu-pill--gem">💎 {total * 10 + 20}+ XP</span>
            <span className="edu-pill">🎧 Чихэвчтэй сонсоорой</span>
          </div>
          <button type="button" className="edu-btn edu-btn--lg edu-btn--mint" onClick={() => setStage("play")}>
            ▶ Цээж бичиг эхлэх
          </button>
          <span className="edu-muted" style={{ fontSize: 12 }}>
            {voiceLabel}
          </span>
        </section>
      )}

      {stage === "play" && (
        <>
          <div className="edu-row" style={{ flexWrap: "nowrap" }}>
            <Link to={BASE} className="edu-btn edu-btn--ghost edu-btn--sm" aria-label="Гарах">
              ✕
            </Link>
            <div className="edu-bar" style={{ flex: 1 }}>
              <span style={{ width: `${(index / total) * 100}%` }} />
            </div>
            <span style={{ fontWeight: 800 }}>
              {index + 1}/{total}
            </span>
          </div>
          <section className="edu-glass">
            <ItemPlayer
              key={index}
              item={lesson.items[index] as PlayItem}
              seed={index + 3}
              onDone={answer}
            />
          </section>
        </>
      )}

      {stage === "result" && (
        <section className="edu-glass edu-stage edu-rise">
          <h1 className="edu-h1">{percent === 100 ? "Төгс! 🏆" : percent >= 60 ? "Сайн байна! 💪" : "Дахиад нэг оролдоё! 🌱"}</h1>
          <div className="edu-score" style={{ ["--p" as string]: percent }}>
            <div>{percent}%</div>
          </div>
          <p style={{ margin: 0, fontWeight: 700 }}>
            {correctCount} / {total} зөв
          </p>
          {submitState.loading && <span className="edu-muted">Оноо тооцож байна…</span>}
          {submitError && <ErrorBlock message={submitError} onRetry={() => void finish(answers)} />}
          {result && (
            <>
              <div className="edu-xp-burst">+{result.xpEarned} XP</div>
              <div className="edu-row" style={{ justifyContent: "center" }}>
                <span className="edu-pill edu-pill--fire">
                  <span className="edu-flame">🔥</span> {result.progress.streak} өдрийн streak
                  {result.streakExtended ? " ↑" : ""}
                </span>
                <span className="edu-pill edu-pill--gem">💎 {result.progress.points} оноо</span>
                <span className="edu-pill">⭐ Түвшин {result.progress.level}</span>
              </div>
              {result.freezeUsed > 0 && (
                <span className="edu-tag">🧊 Streak хамгаалалт {result.freezeUsed} удаа ашиглагдлаа</span>
              )}
            </>
          )}
          <div className="edu-row" style={{ justifyContent: "center" }}>
            {missed.length > 0 && (
              <button type="button" className="edu-btn edu-btn--amber edu-btn--lg" onClick={() => setStage("review")}>
                🔁 Алдаан дээрээ ажиллах ({missed.length})
              </button>
            )}
            <button type="button" className="edu-btn edu-btn--ghost" onClick={restart}>
              Дахин тоглох
            </button>
            <Link to={BASE} className="edu-btn">
              Нүүр хуудас
            </Link>
          </div>
        </section>
      )}

      {stage === "review" && <ReviewRun items={missed} onFinish={(words) => void finishReview(words)} />}

      {stage === "mastered" && (
        <section className="edu-glass edu-stage edu-rise">
          <div style={{ fontSize: 72 }}>🏅</div>
          <h1 className="edu-h1">100% бататгалаа!</h1>
          <p className="edu-muted" style={{ margin: 0 }}>
            Алдсан үг бүрээ дүрэмтэй нь давтаж, зөв бичиж сурлаа.
          </p>
          {reviewState.data && <div className="edu-xp-burst">+{missed.length * 5} XP</div>}
          <div className="edu-row" style={{ justifyContent: "center" }}>
            <button type="button" className="edu-btn edu-btn--ghost" onClick={restart}>
              Дахин тоглох
            </button>
            <Link to={BASE} className="edu-btn edu-btn--mint">
              Нүүр хуудас
            </Link>
          </div>
        </section>
      )}
    </Shell>
  );
};
