// The two status markers. Status is never shown by colour alone:
// "answered locally" is a filled square, "teacher" is an outlined triangle.

import { cn } from "@/lib/utils";

export function LocalMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden width="8" height="8" viewBox="0 0 8 8" className={cn("shrink-0", className)}>
      <rect width="8" height="8" fill="currentColor" />
    </svg>
  );
}

export function TeacherMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden width="10" height="9" viewBox="0 0 10 9" className={cn("shrink-0", className)}>
      <path d="M5 1L9.2 8.2H0.8z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter" />
    </svg>
  );
}

/** Legend row used under strips, meters and charts. */
export function Legend({ local = "Student", teacher = "Teacher" }: { local?: string; teacher?: string }) {
  return (
    <span className="inline-flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem] text-muted">
      <span className="inline-flex items-center gap-1.5">
        <LocalMark className="text-local" /> {local}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <TeacherMark className="text-teacher" /> {teacher}
      </span>
    </span>
  );
}
