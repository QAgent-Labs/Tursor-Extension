import tursorPng from "../assets/Tursor.png";

type TursorLogoProps = {
  className?: string;
  alt?: string;
};

/**
 * Brand mark from `src/assets/Tursor.png`. Pass Tailwind size via `className`
 * (e.g. `h-10 w-10 object-contain`).
 */
export function TursorLogo({
  className = "h-full w-full object-contain",
  alt = "Tursor",
}: TursorLogoProps) {
  return (
    <img src={tursorPng} alt={alt} className={className} draggable={false} />
  );
}
