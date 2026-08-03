import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ErrorPage from "./pages/ErroPage";
import InitialSetupPage from "./pages/InitialSetupPage";
import RunPage from "./pages/RunPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/initial-setup" element={<InitialSetupPage />} />
      <Route path="/setup" element={<Navigate to="/initial-setup" replace />} />
      <Route
        path="/connect"
        element={<Navigate to="/initial-setup?step=connect" replace />}
      />
      <Route path="/run" element={<RunPage />} />
      <Route path="*" element={<ErrorPage />} />
    </Routes>
  );
}
