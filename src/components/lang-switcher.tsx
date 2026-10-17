import { Check, Globe } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getI18nState, LANG_COOKIE, tr, withLangParam } from "@/lib/i18n/core";

/** Header language menu: sets the `lang` cookie and reloads on the matching `?lang=` URL. */
export function LangSwitcher() {
  const st = getI18nState();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  if (st.langs.length < 2) return null;
  const def = st.langs.find((l) => l.isDefault)?.code ?? "ar";
  const choose = (code: string) => {
    document.cookie = `${LANG_COOKIE}=${encodeURIComponent(code)}; path=/; max-age=31536000; samesite=lax`;
    window.location.assign(withLangParam(window.location.href, code, def));
  };
  const cur = st.langs.find((l) => l.code === st.lang);
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        className="btn btn-ghost h-12 gap-1 px-2.5"
        aria-label={tr("تغيير اللغة")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Globe className="size-5" aria-hidden />
        <span className="text-xs font-bold uppercase">{st.lang}</span>
      </button>
      {open ? (
        <div role="menu" className="absolute end-0 top-full z-50 mt-1 min-w-40 rounded-2xl border border-line bg-paper p-1 shadow-xl">
          {st.langs.map((l) => (
            <button
              key={l.code}
              type="button"
              role="menuitemradio"
              aria-checked={l.code === cur?.code}
              lang={l.code}
              dir={l.dir}
              className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-start font-bold hover:bg-primary-soft"
              onClick={() => choose(l.code)}
            >
              {l.flag ? <span aria-hidden>{l.flag}</span> : null}
              <span className="flex-1">{l.name}</span>
              {l.code === cur?.code ? <Check className="size-4" aria-hidden /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
