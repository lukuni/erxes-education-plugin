import "./styles.css";
import "./game.css";
import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router";
import { AppLayout } from "erxes-ui";
import manifest from "../../erxes.json" with { type: "json" };
import { Navigation } from "./modules/Navigation";

const page = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) =>
  lazy(() => load().then((module) => ({ default: module[name] })));

const HomePage = page(() => import("./pages/HomePage"), "HomePage");
const DictationPage = page(() => import("./pages/DictationPage"), "DictationPage");
const ReviewPage = page(() => import("./pages/ReviewPage"), "ReviewPage");
const CardsPage = page(() => import("./pages/CardsPage"), "CardsPage");
const LiteraturePage = page(() => import("./pages/LiteraturePage"), "LiteraturePage");
const ShopPage = page(() => import("./pages/ShopPage"), "ShopPage");
const AiPage = page(() => import("./pages/AiPage"), "AiPage");
const TeacherPage = page(() => import("./pages/TeacherPage"), "TeacherPage");
const SettingsPage = page(() => import("./pages/SettingsPage"), "SettingsPage");

// core-ui mounts this component at `/<path>/*`; routes below are relative to
// it. It resolves the component by the PascalCase expose name.
export const Education = () => (
  <AppLayout id={manifest.name} title={manifest.title} sidebar={<Navigation />}>
    <Suspense fallback={<div role="status" className="edu-app" style={{ height: "100%" }} />}>
      <Routes>
        <Route index element={<HomePage />} />
        <Route path="dictation/:lessonId" element={<DictationPage />} />
        <Route path="review" element={<ReviewPage />} />
        <Route path="cards" element={<CardsPage />} />
        <Route path="literature" element={<LiteraturePage />} />
        <Route path="literature/:workId" element={<LiteraturePage />} />
        <Route path="shop" element={<ShopPage />} />
        <Route path="ai" element={<AiPage />} />
        <Route path="teacher" element={<TeacherPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Routes>
    </Suspense>
  </AppLayout>
);
