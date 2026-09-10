import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils.ts";

type Props = {
  content: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export default function RichTextEditor({ content, onChange, placeholder, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const lastHtml = useRef(content);

  // Sync external content changes only when the value actually differs
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== content) {
      ref.current.innerHTML = content;
      lastHtml.current = content;
    }
  }, [content]);

  const handleInput = () => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    if (html !== lastHtml.current) {
      lastHtml.current = html;
      onChange(html);
    }
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      data-placeholder={placeholder}
      className={cn(
        "px-5 py-2 text-sm text-gray-800 outline-none overflow-y-auto",
        "[&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-gray-500",
        "min-h-[80px]",
        className
      )}
      style={{ wordBreak: "break-word" }}
    />
  );
}
