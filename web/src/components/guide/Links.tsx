// 07: where to go next.

import Section from "./Section";

const BLOB = "https://github.com/Ayush-e4/apprentice/blob/main";

const LINKS = [
  { label: "GitHub repository", path: "github.com/Ayush-e4/apprentice", href: "https://github.com/Ayush-e4/apprentice" },
  { label: "MCP setup and tools", path: "docs/mcp.md", href: `${BLOB}/docs/mcp.md` },
  { label: "Every setting", path: "docs/configuration.md", href: `${BLOB}/docs/configuration.md` },
  { label: "Judges", path: "docs/judges.md", href: `${BLOB}/docs/judges.md` },
  { label: "Contributing", path: "CONTRIBUTING.md", href: `${BLOB}/CONTRIBUTING.md` },
  { label: "MIT License", path: "LICENSE", href: `${BLOB}/LICENSE` },
];

export default function Links() {
  return (
    <Section id="links" index="07" title="Links">
      <ul className="grid border-t border-ink sm:grid-cols-2 lg:grid-cols-3">
        {LINKS.map((l) => (
          <li key={l.href} className="border-b border-rule">
            <a
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="group flex min-h-16 flex-col justify-center gap-0.5 py-3 pr-4 focus-ring"
            >
              <span className="font-medium group-hover:text-local group-hover:underline group-hover:underline-offset-4">
                {l.label}
                <span className="sr-only"> (opens in a new tab)</span>
              </span>
              <span className="break-all font-mono text-xs text-muted">{l.path}</span>
            </a>
          </li>
        ))}
      </ul>
    </Section>
  );
}
