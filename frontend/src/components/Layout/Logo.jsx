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
 
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 grid-cols-2 grid-rows-2 gap-[4px] text-[10px] font-extrabold text-white select-none">
        <span className="flex items-center justify-center rounded-[4px]" style={{ backgroundColor: "#2f54eb" }}>D</span>
        <span className="flex items-center justify-center rounded-[4px]" style={{ backgroundColor: "#f04f23" }}>S</span>
        <span className="rounded-[4px]" style={{ backgroundColor: "#a04f34" }} />
        <span className="rounded-[4px]" style={{ backgroundColor: "#1b3fb7" }} />
      </div>
      <div>
        <p
          className={`font-display text-[15px] font-semibold leading-tight ${
            theme === "dark" ? "text-ink" : "text-white"
          }`}
        >
          {settings?.companyName ? settings.companyName.split(" ")[0] : "Dynamics"}
        </p>
        <p
          className={`font-display text-[15px] font-semibold leading-tight ${
            theme === "dark" ? "text-ink" : "text-white"
          }`}
        >
          {settings?.companyName ? settings.companyName.split(" ").slice(1).join(" ") : "Square"}
        </p>
      </div>
    </div>
  );
}
