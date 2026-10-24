import type { ComponentType, ReactNode } from "react";
import { IconSchool } from "@tabler/icons-react";
// Root imports on purpose: core-ui shares `erxes-ui`/`ui-modules` as Module
// Federation singletons keyed on the bare specifier.
import { Breadcrumb, Button, Separator } from "erxes-ui";
import { PageHeader } from "ui-modules";
import { Link } from "react-router";
import manifest from "../../../erxes.json" with { type: "json" };

export const BASE = `/${manifest.ui.path}`;

interface IShellProps {
  title: string;
  icon?: ComponentType;
  actions?: ReactNode;
  children: ReactNode;
}

/** erxes page header + the plugin's playful canvas. */
export const Shell = ({ title, icon: Icon = IconSchool, actions, children }: IShellProps) => (
  <div className="education:flex education:h-full education:flex-col">
    <PageHeader>
      <PageHeader.Start>
        <Breadcrumb>
          <Breadcrumb.List className="education:gap-1">
            <Breadcrumb.Item>
              <Button variant="ghost" asChild>
                <Link to={BASE}>
                  <IconSchool />
                  {manifest.title}
                </Link>
              </Button>
            </Breadcrumb.Item>
            {title !== manifest.title && (
              <>
                <Breadcrumb.Separator />
                <Breadcrumb.Item>
                  <Button variant="ghost" className="education:pointer-events-none">
                    <Icon />
                    {title}
                  </Button>
                </Breadcrumb.Item>
              </>
            )}
          </Breadcrumb.List>
        </Breadcrumb>
        <Separator.Inline />
        <PageHeader.FavoriteToggleButton breadcrumb={[manifest.title, title]} icon="IconSchool" />
      </PageHeader.Start>
      {actions && <PageHeader.End>{actions}</PageHeader.End>}
    </PageHeader>
    <div className="edu-app education:flex-1 education:overflow-auto">
      <div className="edu-page">{children}</div>
    </div>
  </div>
);

export const LoadingBlock = ({ height = 160 }: { height?: number }) => (
  <div className="edu-skel" style={{ height }} role="status" aria-label="Ачаалж байна" />
);

export const ErrorBlock = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="edu-glass edu-between" role="alert">
    <div>
      <p className="edu-h2">Алдаа гарлаа 😕</p>
      <p className="edu-muted">{message}</p>
    </div>
    {onRetry && (
      <button type="button" className="edu-btn edu-btn--ghost edu-btn--sm" onClick={onRetry}>
        Дахин оролдох
      </button>
    )}
  </div>
);

export const EmptyBlock = ({ emoji, title, children }: { emoji: string; title: string; children?: ReactNode }) => (
  <div className="edu-glass edu-stage">
    <div style={{ fontSize: 56 }}>{emoji}</div>
    <p className="edu-h2">{title}</p>
    {children}
  </div>
);
