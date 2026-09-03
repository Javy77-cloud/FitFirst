"use client";

export function AutoSaveForm({
  action,
  children,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form
      action={action}
      className={className}
      onChange={(event) => {
        const target = event.target as HTMLInputElement;
        if (target.name === "columnIds") event.currentTarget.requestSubmit();
      }}
    >
      {children}
    </form>
  );
}
