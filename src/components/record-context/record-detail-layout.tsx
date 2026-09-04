import type { ReactNode } from "react";

export function RecordDetailLayout({
  main,
  rail,
}: {
  main: ReactNode;
  rail: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1 lg:w-[72%]">{main}</div>
      <aside className="w-full shrink-0 lg:sticky lg:top-4 lg:w-[300px]">{rail}</aside>
    </div>
  );
}
