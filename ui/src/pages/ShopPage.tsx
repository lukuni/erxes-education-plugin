import { useMutation, useQuery } from "@apollo/client";
import { IconShoppingBag } from "@tabler/icons-react";
import { toast } from "erxes-ui";
import { ErrorBlock, LoadingBlock, Shell } from "../components/Shell";
import { ME_QUERY, SET_AVATAR, SHOP_BUY, SHOP_QUERY } from "../graphql";
import { confettiFrom, sound } from "../lib/fx";

const KIND_LABEL: Record<string, string> = {
  avatar: "Аватар",
  freeze: "Хамгаалалт",
  pack: "Картын багц",
  reward: "Урамшуулал",
};

export const ShopPage = () => {
  const me = useQuery(ME_QUERY);
  const shop = useQuery(SHOP_QUERY);
  const [buy, buyState] = useMutation(SHOP_BUY, { refetchQueries: ["educationMe", "educationCards"] });
  const [setAvatar] = useMutation(SET_AVATAR, { refetchQueries: ["educationMe"] });

  const loading = me.loading || shop.loading;
  const error = me.error ?? shop.error;
  const progress = me.data?.educationMe;
  const items = shop.data?.educationShopItems ?? [];

  const purchase = async (code: string, title: string, element: HTMLElement) => {
    try {
      await buy({ variables: { code } });
      sound("win");
      confettiFrom(element);
      toast({ title: `${title} 🎉`, description: "Амжилттай авлаа!" });
    } catch (e) {
      sound("bad");
      toast({ title: "Авч чадсангүй", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  return (
    <Shell title="Онооны дэлгүүр" icon={IconShoppingBag}>
      {loading ? (
        <LoadingBlock height={300} />
      ) : error || !progress ? (
        <ErrorBlock
          message={error?.message ?? "No data"}
          onRetry={() => {
            void me.refetch();
            void shop.refetch();
          }}
        />
      ) : (
        <>
          <section className="edu-glass edu-between edu-rise">
            <div className="edu-row" style={{ gap: 16 }}>
              <span className="edu-avatar" aria-hidden>
                {progress.avatar}
              </span>
              <div>
                <span className="edu-muted" style={{ fontWeight: 700 }}>
                  Таны оноо
                </span>
                <div className="edu-h1">💎 {progress.points}</div>
              </div>
            </div>
            <div className="edu-row">
              <span className="edu-pill edu-pill--ice">🧊 {progress.freezes} хамгаалалт</span>
              <span className="edu-pill">🏅 {progress.teacherRewards} урамшуулал</span>
            </div>
          </section>

          <div className="edu-grid">
            {items.map((item) => {
              const owned = !item.repeatable && progress.owned.includes(item.code);
              const affordable = progress.points >= item.cost;
              const isAvatar = item.kind === "avatar";
              const wearing = isAvatar && progress.avatar === item.emoji;
              return (
                <article key={item.code} className="edu-glass edu-lesson edu-accent--amber">
                  <div className="edu-between">
                    <span className="edu-lesson__emoji">{item.emoji}</span>
                    <span className="edu-tag edu-tag--amber">{KIND_LABEL[item.kind] ?? item.kind}</span>
                  </div>
                  <h3 className="edu-h2">{item.title}</h3>
                  <p className="edu-muted" style={{ margin: 0, fontSize: 14 }}>
                    {item.description}
                  </p>
                  <div className="edu-between" style={{ marginTop: "auto" }}>
                    <span style={{ fontWeight: 900 }}>💎 {item.cost}</span>
                    {owned && isAvatar ? (
                      <button
                        type="button"
                        className="edu-btn edu-btn--sm edu-btn--mint"
                        disabled={wearing}
                        onClick={() => void setAvatar({ variables: { code: item.code } })}
                      >
                        {wearing ? "Зүүсэн" : "Зүүх"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="edu-btn edu-btn--sm"
                        disabled={owned || !affordable || buyState.loading}
                        onClick={(e) => void purchase(item.code, item.title, e.currentTarget)}
                      >
                        {owned ? "✓ Нээсэн" : affordable ? "Авах" : `${item.cost - progress.points} дутуу`}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <p className="edu-muted" style={{ fontSize: 13, margin: 0 }}>
            Оноо цуглуулах: цээж бичгийн зөв хариулт +10, хичээл дуусгах +20, төгс дүн +30, алдаа бататгах +5, карт +2.
          </p>
        </>
      )}
    </Shell>
  );
};
