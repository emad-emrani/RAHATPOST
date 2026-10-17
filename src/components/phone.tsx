import { useState } from "react";
import { tr, trv } from "@/lib/i18n/core";

export function RevealPhone({ phone }: { phone: string }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" className="btn" onClick={() => setOpen(true)}>
        {tr("إظهار الرقم")}
      </button>
    );
  }
  return (
    <a className="btn" href={`tel:${phone.replaceAll("-", "")}`}>
      {trv(phone)}
    </a>
  );
}
