import { useMutation, useQuery } from "@apollo/client";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { IconRepeat } from "@tabler/icons-react";
import { ReviewRun, type PlayItem } from "../components/Exercise";
import { BASE, EmptyBlock, ErrorBlock, LoadingBlock, Shell } from "../components/Shell";
import { ME_QUERY, REVIEW_COMPLETE } from "../graphql";
import { confetti, sound } from "../lib/fx";

export const ReviewPage = () => {
  const { data, loading, error, refetch } = useQuery(ME_QUERY);
  const [complete, completeState] = useMutation(REVIEW_COMPLETE, {
    refetchQueries: ["educationMe"],
    awaitRefetchQueries: false,
  });
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState<number | null>(null);

  // Freeze the list when the run starts so refetches don't reshuffle it.
  const mistakes = data?.educationMe.mistakes;
  const items: PlayItem[] = useMemo(
    () =>
      (mistakes ?? [])
        .filter((m) => m.wrong && m.wrong !== m.word)
        .slice(0, 12)
        .map((m) => ({
          __typename: "EducationLessonItem" as const,
          mode: "pick",
          sentence: m.sentence.includes(m.word) ? m.sentence : m.word,
          target: m.word,
          wrongForms: [m.wrong],
          ruleTitle: m.ruleTitle,
          rule: m.rule,
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [running],
  );

  const finish = async (words: string[]) => {
    setRunning(false);
    setFinished(words.length);
    sound("win");
    confetti(undefined, 160);
    await complete({ variables: { words } }).catch(() => undefined);
  };

  return (
    <Shell title="Алдаа засах" icon={IconRepeat}>
      {loading ? (
        <LoadingBlock height={260} />
      ) : error || !data ? (
        <ErrorBlock message={error?.message ?? "No data"} onRetry={() => refetch()} />
      ) : finished !== null ? (
        <EmptyBlock emoji="🏅" title={`${finished} үгийг 100% бататгалаа!`}>
          {completeState.data && <div className="edu-xp-burst">+{finished * 5} XP</div>}
          <Link to={BASE} className="edu-btn edu-btn--mint">
            Нүүр хуудас
          </Link>
        </EmptyBlock>
      ) : running && items.length > 0 ? (
        <ReviewRun items={items} onFinish={(words) => void finish(words)} />
      ) : data.educationMe.mistakes.length === 0 ? (
        <EmptyBlock emoji="🎉" title="Давтах алдаа алга!">
          <p className="edu-muted" style={{ margin: 0 }}>
            Цээж бичигт алдсан үгс энд цуглардаг.
          </p>
          <Link to={BASE} className="edu-btn">
            Цээж бичиг рүү
          </Link>
        </EmptyBlock>
      ) : (
        <section className="edu-glass edu-stage edu-rise">
          <div style={{ fontSize: 64 }}>🔁</div>
          <h1 className="edu-h1">Алдаан дээрээ ажиллах</h1>
          <p className="edu-muted" style={{ margin: 0, maxWidth: 520 }}>
            Алдсан үг бүр дүрмийн сануулгатай дахин гарна. Бүгдийг нь зөв хариултал үргэлжилнэ — 100% бататгана.
          </p>
          <div className="edu-row" style={{ justifyContent: "center" }}>
            {data.educationMe.mistakes.slice(0, 12).map((m) => (
              <span key={m.word} className="edu-tag edu-tag--coral">
                {m.word} ×{m.count}
              </span>
            ))}
          </div>
          <button type="button" className="edu-btn edu-btn--amber edu-btn--lg" onClick={() => setRunning(true)}>
            ▶ Давтаж эхлэх
          </button>
        </section>
      )}
    </Shell>
  );
};
