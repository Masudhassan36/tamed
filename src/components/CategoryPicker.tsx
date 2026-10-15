"use client";

import { useState } from "react";
import { theTen } from "@/lib/content";

export const CATEGORY_INPUT_NAME = "categories";
export const SUBSECTION_INPUT_NAME = "subcategories";

export default function CategoryPicker() {
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  function toggleField(slug: string) {
    setSelectedFields((current) => {
      if (current.includes(slug)) return current.filter((item) => item !== slug);
      return current.length < 2 ? [...current, slug] : current;
    });
  }

  return (
    <div className="full-field category-picker">
      <p className="category-picker-label">Editorial fields</p>
      <div className="category-select-wrap">
        <button className="category-select-trigger" type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {selectedFields.length ? `${selectedFields.length} selected` : "Choose one or more fields"}<span aria-hidden="true">⌄</span>
        </button>
        {open && <div className="category-options" role="listbox" aria-multiselectable="true">
          {theTen.map((field) => {
            const selected = selectedFields.includes(field.slug);
            return <button className={`category-option${selected ? " is-selected" : ""}`} type="button" role="option" aria-selected={selected} aria-disabled={!selected && selectedFields.length >= 3} key={field.slug} onClick={() => toggleField(field.slug)}>
              <span className="category-option-number">{field.number}</span><span>{field.title}</span><span className="category-option-mark" aria-hidden="true">{selected ? "✓" : ""}</span>
            </button>;
          })}
        </div>}
      </div>
      <div className="category-chips" aria-live="polite">
        {selectedFields.map((slug) => {
          const field = theTen.find((item) => item.slug === slug);
          return field ? <span className="category-chip" key={slug}>{field.title}<button type="button" aria-label={`Remove ${field.title}`} onClick={() => toggleField(slug)}>×</button><input type="hidden" name={CATEGORY_INPUT_NAME} value={slug} /></span> : null;
        })}
      </div>
      <span className="field-note">Choose up to two fields.</span>
    </div>
  );
}
