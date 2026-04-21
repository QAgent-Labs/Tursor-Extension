import AppRoutes from "./routes";
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <div className="overflow-x-auto">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#0d1117",
            color: "#fff",
            border: "1px solid #30363d",
          },
        }}
      />
      <AppRoutes />
    </div>
  );
}

export default App;
