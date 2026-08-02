import { HomeIcon } from "lucide-react";
import { TursorLogo } from "./TursorLogo";
import {
  tursorWordmarkGradientClassName,
  tursorWordmarkTextGradientClassName,
} from "./tursorWordmarkClasses";
import { useNavigate } from "react-router-dom";

export default function TursorHeader({
  showHomeButton = true,
}: {
  showHomeButton?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[5rem] shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-700 px-3 py-4 sm:mb-5 sm:min-h-[5.25rem] sm:px-5 sm:py-5">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <div className="relative shrink-0">
          <TursorLogo className="h-8 w-8 object-contain sm:h-10 sm:w-10" />
        </div>
        <h1
          className={`min-w-0 truncate text-2xl font-bold sm:text-4xl ${tursorWordmarkTextGradientClassName}`}
        >
          Tursor
        </h1>
      </div>
      {showHomeButton ? (
        <button
          onClick={() => navigate("/")}
          className={`flex shrink-0 flex-row items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-bold sm:gap-2 sm:px-4 ${tursorWordmarkGradientClassName}`}
        >
          <HomeIcon className="h-5 w-5 shrink-0 text-cyan-500 sm:h-5" />
          <span className="text-sm sm:text-base">Home</span>
        </button>
      ) : null}
    </div>
  );
}
