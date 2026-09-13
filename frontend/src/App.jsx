import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import TopBar from "./components/TopBar";
import DashboardPage from "./pages/DashboardPage";
import ConjunctionsPage from "./pages/ConjunctionsPage";
import ConjunctionDetailPage from "./pages/ConjunctionDetailPage";
import AvoidancePage from "./pages/AvoidancePage";
import VisualizationPage from "./pages/VisualizationPage";
import PredictionPage from "./pages/PredictionPage";
import BootScreen from "./components/BootScreen";
import { WorkspaceContext, useWorkspaceData } from "./lib/workspace";
import { useTheme } from "./lib/theme";
import "./App.css";

/** Scroll back to the top whenever the route changes. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const workspace = useWorkspaceData();

  if (workspace.loading) {
    return <BootScreen />;
  }

  if (workspace.status === "offline") {
    return (
      <BootScreen
        error={workspace.error}
        onRetry={workspace.retry}
      />
    );
  }

  return (
    <WorkspaceContext.Provider value={workspace}>
      <ScrollToTop />
      <div className="app">
        <TopBar theme={theme} onToggleTheme={toggleTheme} />
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/conjunctions" element={<ConjunctionsPage />} />
          <Route
            path="/conjunctions/:satNorad/:debNorad"
            element={<ConjunctionDetailPage />}
          />
          <Route path="/avoidance" element={<AvoidancePage />} />
          <Route path="/visualization" element={<VisualizationPage />} />
          <Route path="/prediction" element={<PredictionPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <footer className="ops-footer">
          <span>Conjex AI · Orbital conjunction intelligence</span>
          <span className="mono">
            SGP4 propagation · AI-assisted risk screening · prototype
          </span>
        </footer>
      </div>
    </WorkspaceContext.Provider>
  );
}
