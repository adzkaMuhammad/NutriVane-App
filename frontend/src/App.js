import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { I18nProvider } from "@/i18n";
import BottomTabBar from "@/components/BottomTabBar";
import Auth from "@/pages/Auth";
import Onboarding from "@/pages/Onboarding";
import Home from "@/pages/Home";
import Scan from "@/pages/Scan";
import Mood from "@/pages/Mood";
import Diet from "@/pages/Diet";
import Journal from "@/pages/Journal";
import WeeklyAnalysis from "@/pages/WeeklyAnalysis";
import History from "@/pages/History";
import Profile from "@/pages/Profile";
import AppMenu from "@/components/AppMenu";

function Protected({ children, hideTab }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <div className="min-h-screen flex items-center justify-center bg-[#F9F9F6] text-[#5C5C5C]">...</div>;
  if (!user) return <Navigate to="/" replace />;
  if (!user.profile_complete && loc.pathname !== "/onboarding") return <Navigate to="/onboarding" replace />;
  return (
    <>
      {children}
      {!hideTab && <AppMenu />}
      {!hideTab && <BottomTabBar />}
    </>
  );
}

function Landing() {
  const { user, ready } = useAuth();
  if (!ready) return <div className="min-h-screen flex items-center justify-center bg-[#F9F9F6] text-[#5C5C5C]">...</div>;
  if (user) return <Navigate to={user.profile_complete ? "/home" : "/onboarding"} replace />;
  return <Auth />;
}

function App() {
  return (
    <div className="phone-frame">
      <I18nProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/onboarding" element={<Protected hideTab><Onboarding /></Protected>} />
              <Route path="/home" element={<Protected><Home /></Protected>} />
              <Route path="/scan" element={<Protected><Scan /></Protected>} />
              <Route path="/mood" element={<Protected><Mood /></Protected>} />
              <Route path="/diet" element={<Protected><Diet /></Protected>} />
              <Route path="/journal" element={<Protected><Journal /></Protected>} />
              <Route path="/weekly" element={<Protected><WeeklyAnalysis /></Protected>} />
              <Route path="/history" element={<Protected><History /></Protected>} />
              <Route path="/profile" element={<Protected><Profile /></Protected>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </I18nProvider>
    </div>
  );
}

export default App;
