"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronIcon } from "@/components/Icons";
import { editorialCategories } from "@/lib/content";

/** The form posts every checked box under this name. */
export const CATEGORY_INPUT_NAME = "categories";

const NAMES_SHOWN_IN_TRIGGER = 3;

export default function CategorySelect() {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const selectedCategories = editorialCategories.filter((category) => selected.includes(category.slug));
  const summary = selectedCategories.length === 0
    ? "Select one or more"
    : selectedCategories.length <= NAMES_SHOWN_IN_TRIGGER
      ? selectedCategories.map((category) => category.title).join(", ")
      : `${selectedCategories.length} categories selected`;

  function toggle(slug: string) {
    setSelected((current) => current.includes(slug)
      ? current.filter((item) => item !== slug)
      : [...current, slug]);
  }

  return (
    <div className="category-select full-field" ref={containerRef}>
      <button
        type="button"
        className="category-select-trigger"
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className={selectedCategories.length ? "category-select-value" : "category-select-value category-select-placeholder"}>
          {summary}
        </span>
        <ChevronIcon className={isOpen ? "category-select-chevron is-open" : "category-select-chevron"} />
      </button>
      <div className={isOpen ? "category-select-menu is-open" : "category-select-menu"} role="group" aria-label="Editorial categories">
        {editorialCategories.map((category) => (
          <label className="category-select-option" key={category.slug}>
            <input
              type="checkbox"
              name={CATEGORY_INPUT_NAME}
              value={category.slug}
              checked={selected.includes(category.slug)}
              onChange={() => toggle(category.slug)}
            />
            <span>{category.title}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
