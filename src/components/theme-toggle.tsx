"use client";

// Light/dark switch. The initial theme is set before paint by the script in layout.tsx.
export default function ThemeToggle() {
  const flip = () => {
    const el = document.documentElement;
    const next = el.dataset.theme === "light" ? "dark" : "light";
    el.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch {}
  };
  return (
    <button type="button" onClick={flip} aria-label="Switch light or dark theme"
      className="rounded-md border border-line bg-panel px-3 py-1.5 text-[13px] text-muted hover:text-text">
      <span className="theme-label-dark">Light mode</span>
      <span className="theme-label-light">Dark mode</span>
    </button>
  );
}
