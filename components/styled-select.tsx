"use client";

import { useEffect, useId, useRef, useState } from "react";

export type StyledSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type StyledSelectProps = {
  name?: string;
  label: string;
  defaultValue?: string;
  value?: string;
  options: StyledSelectOption[];
  required?: boolean;
  disabled?: boolean;
  helper?: string;
  onValueChange?: (value: string) => void;
};

export function StyledSelect({
  name,
  label,
  defaultValue = "",
  value: controlledValue,
  options,
  required = false,
  disabled = false,
  helper,
  onValueChange,
}: StyledSelectProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const labelId = useId();
  const listId = useId();
  const value = controlledValue ?? internalValue;
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selected = options[selectedIndex] ?? options[0];

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  function choose(nextValue: string) {
    if (controlledValue === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
    setOpen(false);
    trigger.current?.focus();
  }

  function move(direction: 1 | -1) {
    let next = activeIndex;
    do {
      next = (next + direction + options.length) % options.length;
    } while (options[next]?.disabled && next !== activeIndex);
    setActiveIndex(next);
  }

  return (
    <div className="styled-select-field" ref={root}>
      <span className="styled-select-label" id={labelId}>
        {label}
      </span>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        className="styled-select-trigger"
        type="button"
        role="combobox"
        aria-labelledby={labelId}
        aria-controls={listId}
        aria-expanded={open}
        aria-required={required}
        aria-invalid={required && !value}
        disabled={disabled}
        onClick={() => {
          setActiveIndex(selectedIndex);
          setOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) {
              setActiveIndex(selectedIndex);
              setOpen(true);
            } else {
              move(event.key === "ArrowDown" ? 1 : -1);
            }
          }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (open && !options[activeIndex]?.disabled) choose(options[activeIndex].value);
            else setOpen(true);
          }
          if (event.key === "Escape") {
            setOpen(false);
            trigger.current?.focus();
          }
          if (event.key === "Home") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex(options.findIndex((option) => !option.disabled));
          }
          if (event.key === "End") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex(options.findLastIndex((option) => !option.disabled));
          }
        }}
        ref={trigger}
      >
        <span>{selected?.label}</span>
        <span className="styled-select-chevron" aria-hidden="true">
          <i />
        </span>
      </button>
      {open ? (
        <div className="styled-select-menu" id={listId} role="listbox" aria-labelledby={labelId}>
          {options.map((option, index) => (
            <button
              className={`${option.value === value ? "is-selected" : ""} ${index === activeIndex ? "is-active" : ""}`}
              type="button"
              role="option"
              aria-selected={option.value === value}
              disabled={option.disabled}
              key={option.value}
              onPointerMove={() => setActiveIndex(index)}
              onClick={() => choose(option.value)}
            >
              <span>{option.label}</span>
              {option.value === value ? <span aria-hidden="true">✓</span> : null}
            </button>
          ))}
        </div>
      ) : null}
      {helper ? <span className="helper">{helper}</span> : null}
    </div>
  );
}
