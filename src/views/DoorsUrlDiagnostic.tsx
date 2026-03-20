import { useEffect } from "react";

/** AnyDoor URL diagnostic runs on the Next.js AnyDoor app — redirect preserves a single implementation. */
function getAnyDoorOrigin(): string {
  const env = import.meta.env.VITE_ANYDOOR_ORIGIN as string | undefined;
  if (env) return env.replace(/\/$/, "");
  if (import.meta.env.DEV) return "http://localhost:3002";
  return "https://socialutely-any-door-engine.vercel.app";
}

const DoorsUrlDiagnostic = () => {
  useEffect(() => {
    window.location.replace(`${getAnyDoorOrigin()}/`);
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "#07080d", color: "#e8eef5", fontFamily: "Archivo, system-ui, sans-serif" }}
    >
      <p className="text-sm text-white/60">
        Opening AnyDoor Engine…
      </p>
    </div>
  );
};

export default DoorsUrlDiagnostic;
