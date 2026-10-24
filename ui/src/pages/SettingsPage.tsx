import { useQuery } from "@apollo/client";
import { IconSettings } from "@tabler/icons-react";
import manifest from "../../../erxes.json" with { type: "json" };
import { ErrorBlock, LoadingBlock, Shell } from "../components/Shell";
import { STATUS_QUERY } from "../graphql";

const IDENTITY: [string, string][] = [
  ["Name", manifest.name],
  ["Route", `/${manifest.ui.path}`],
  ["Remote", manifest.ui.remote],
  ["API", `:${manifest.api.port}${manifest.api.graphql}`],
  ["Version", manifest.version],
];

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="edu-between" style={{ borderTop: "1px solid var(--edu-line)", padding: "10px 0" }}>
    <span className="edu-muted">{label}</span>
    <span style={{ fontWeight: 700 }}>{children}</span>
  </div>
);

export const SettingsPage = () => {
  const { data, loading, error, refetch } = useQuery(STATUS_QUERY);
  const status = data?.educationStatus;

  return (
    <Shell title="Тохиргоо" icon={IconSettings}>
      <section className="edu-glass">
        <h2 className="edu-h2" style={{ marginBottom: 8 }}>
          erxes холболт
        </h2>
        {loading ? (
          <LoadingBlock height={120} />
        ) : error || !status ? (
          <ErrorBlock message={error?.message ?? "No data"} onRetry={() => refetch()} />
        ) : (
          <>
            <Row label="API">🟢 Federated as {status.plugin} · v{status.version}</Row>
            <Row label="Tenant">{status.subdomain || "—"}</Row>
            <Row label="Нэвтэрсэн">{status.userEmail ?? status.userId ?? "—"}</Row>
            <Row label="Chimege TTS (заавал биш)">
              {status.chimegeEnabled ? "🟢 Монгол дуу хоолой идэвхтэй" : "⚪ Унтраалттай — CHIMEGE_TOKEN тохируулна уу"}
            </Row>
            <Row label="Gemma 4">
              {status.aiEnabled ? `🟢 ${status.aiModel}` : "⚪ Унтраалттай — GEMINI_API_KEY тохируулна уу"}
            </Row>
          </>
        )}
      </section>
      <section className="edu-glass">
        <h2 className="edu-h2" style={{ marginBottom: 8 }}>
          Plugin
        </h2>
        {IDENTITY.map(([label, value]) => (
          <Row key={label} label={label}>
            <code>{value}</code>
          </Row>
        ))}
      </section>
      <section className="edu-glass">
        <h2 className="edu-h2" style={{ marginBottom: 8 }}>
          Эрхийн бүлгүүд
        </h2>
        <p className="edu-muted" style={{ margin: 0 }}>
          erxes Settings → Permissions хэсэгт хэрэглэгчдийг <b>Education · Students</b> (дасгал хийх) эсвэл{" "}
          <b>Education · Teachers</b> (ангийн аналитик, хичээл үүсгэх) бүлэгт нэмнэ. Owner бүх эрхтэй.
        </p>
      </section>
    </Shell>
  );
};
