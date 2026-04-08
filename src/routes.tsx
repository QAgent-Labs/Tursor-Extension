import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ErrorPage from "./pages/ErroPage";
import SetupPage from "./pages/SetupPage";
import { ConnectingScreen } from "./pages/ConnectionScreen";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/connect" element={<ConnectingScreen />} />
      <Route path="*" element={<ErrorPage />} />
    </Routes>
  );
}
