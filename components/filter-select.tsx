"use client";

import { useEffect, useId, useRef, useState } from "react";

type Option = { value: string; label: string };

export function FilterSelect({ name, label, defaultValue, options }: { name: string; label: string; defaultValue: string; options: Option[] }) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const labelId = useId();
  const listId = useId();
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  return <div className="filter-select-field" ref={root}>
    <span className="filter-field-label" id={labelId}>{label}</span>
    <input type="hidden" name={name} value={value} />
    <button className="filter-select-trigger" type="button" role="combobox" aria-labelledby={labelId} aria-controls={listId} aria-expanded={open} onClick={() => setOpen((current) => !current)} onKeyDown={(event) => {
      if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); }
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    }} ref={trigger}><span>{selected.label}</span><span className="filter-chevron" aria-hidden="true">⌄</span></button>
    {open ? <div className="filter-select-menu" id={listId} role="listbox" aria-labelledby={labelId}>
      {options.map((option) => <button className={option.value === value ? "is-selected" : ""} type="button" role="option" aria-selected={option.value === value} key={option.value} onClick={() => { setValue(option.value); setOpen(false); trigger.current?.focus(); }}><span>{option.label}</span>{option.value === value ? <span aria-hidden="true">✓</span> : null}</button>)}
    </div> : null}
  </div>;
}
