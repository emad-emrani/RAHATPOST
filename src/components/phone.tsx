import { useState } from "react";

export function RevealPhone({ phone }: { phone: string }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" className="btn" onClick={() => setOpen(true)}>
        إظهار الرقم
      </button>
    );
  }
  return (
    <a className="btn" href={`tel:${phone.replaceAll("-", "")}`}>
      {phone}
    </a>
  );
}
