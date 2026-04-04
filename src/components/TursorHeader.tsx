import { Bot, HomeIcon, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TursorHeader() {
  const navigate = useNavigate();
  return (
    <div className="h-[10%] flex border-b-1 border-gray-700 items-center justify-space-between mb-5">
      <div className="w-full h-full flex items-center ps-5">
        <div className="h-[65%] w-[4%] border-1 relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-2xl justify-center items-center">
          <Bot className="w-10 h-10 text-cyan-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-purple-400" />
        </div>
        <h1 className="text-4xl ms-5 font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
          Tursor
        </h1>
      </div>
      <button
        onClick={() => navigate("/")}
        className="w-[10%] flex flex-row gap-2 align-center justify-center  font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent"
      >
        <HomeIcon className="text-cyan-500" />
        <h1>Home</h1>
      </button>
    </div>
  );
}
