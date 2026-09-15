import { useAuth } from "../../auth/AuthContext";

export default function Logo({ size = "md", theme = "light" }) {
  const { settings } = useAuth();
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const serverBase = apiBase.endsWith("/api") ? apiBase.slice(0, -4) : apiBase;

  const logoUrl = settings?.customLogo
    ? settings.customLogo.startsWith("http")
      ? settings.customLogo
      : `${serverBase}${settings.customLogo}`
    : null;

  if (logoUrl) {
    return (
      <div className="flex items-center gap-3">
        <img
          src={logoUrl}
          alt={settings?.companyName || "Dynamics Square"}
          className={`object-contain ${
            size === "sm" ? "h-6 max-w-[120px]" : "h-10 max-w-[180px]"
          }`}
        />
      </div>
    );
  }

  const name = settings?.companyName || "Dynamics Square";
  const parts = name.split(" ");
  const first = parts[0]?.toUpperCase() || "DYNAMICS";
  const rest  = parts.slice(1).join(" ").toUpperCase() || "SQUARE";
  const textSize = size === "sm" ? "text-sm" : "text-base";

  return (
    <div className="flex items-center select-none">
      <span className={`font-display ${textSize} font-extrabold tracking-widest ${theme === "dark" ? "text-ink" : "text-white"}`}>
        {first}&nbsp;
      </span>
      <span className={`font-display ${textSize} font-extrabold tracking-widest text-[#e8261a]`}>
        {rest}
      </span>
      <sup className={`ml-0.5 text-[9px] font-bold ${theme === "dark" ? "text-ink/60" : "text-white/60"}`}>™</sup>
    </div>
  );
}
