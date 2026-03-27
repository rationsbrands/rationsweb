import React from "react";

type Props = {
  text?: string;
  className?: string;
};

// Simple, safe URL matcher (http(s) + www + bare domains)
const URL_RE =
  /((https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/[^\s]*)?))/g;

function normalizeHref(raw: string) {
  const t = raw.trim();
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  return `https://${t}`;
}

export default function LinkifyText({ text = "", className }: Props) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  const matches = [...text.matchAll(URL_RE)];
  if (matches.length === 0) {
    return <span className={className}>{text}</span>;
  }

  matches.forEach((m, i) => {
    const match = m[0];
    const index = m.index ?? 0;

    // push text before match
    if (index > lastIndex) {
      parts.push(<React.Fragment key={`t-${i}`}>{text.slice(lastIndex, index)}</React.Fragment>);
    }

    const href = normalizeHref(match);

    parts.push(
      <a
        key={`a-${i}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline break-words"
        onClick={(e) => e.stopPropagation()}     // prevents card Link navigation
        onMouseDown={(e) => e.stopPropagation()} // keeps link clickable
      >
        {match}
      </a>
    );

    lastIndex = index + match.length;
  });

  // trailing text
  if (lastIndex < text.length) {
    parts.push(<React.Fragment key="t-end">{text.slice(lastIndex)}</React.Fragment>);
  }

  return <span className={className}>{parts}</span>;
}
