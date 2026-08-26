import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { Dashboard } from "./pages/Dashboard";
import { Skeleton } from "./components/ui/Skeleton";

const Landing = lazy(() => import("./pages/Landing").then((m) => ({ default: m.Landing })));
const History = lazy(() => import("./pages/History").then((m) => ({ default: m.History })));
const Alerts = lazy(() => import("./pages/Alerts").then((m) => ({ default: m.Alerts })));
const Devices = lazy(() => import("./pages/Devices").then((m) => ({ default: m.Devices })));
const Settings = lazy(() => import("./pages/Settings").then((m) => ({ default: m.Settings })));

function PageFallback() {
  return <Skeleton className="h-96" />;
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="history" element={<History />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="devices" element={<Devices />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
