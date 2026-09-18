"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Recoverable Documents-tab failures must not take over the whole deal page. */
export class DealDocsErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[DealDocsErrorBoundary]", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="rounded-md border border-border bg-card p-3 text-sm text-navy"
          data-ff-deal-docs-soft-error=""
        >
          <p className="font-medium">Could not show documents</p>
          <p className="mt-1 text-muted-foreground">
            The deal is still saved. Try this tab again — nothing was thrown away.
          </p>
          <button
            type="button"
            className="mt-2 rounded-md border px-3 py-1.5 text-sm"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
