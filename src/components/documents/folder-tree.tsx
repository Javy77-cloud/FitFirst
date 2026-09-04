import Link from "next/link";
import { Folder, FolderOpen } from "lucide-react";
import { libraryHref, type FolderTreeNode } from "@/lib/documents/library";
import { cn } from "@/lib/utils";

export function FolderTree({
  nodes,
  library,
  activeId,
  counts,
}: {
  nodes: FolderTreeNode[];
  library: string;
  activeId: string | null;
  counts: Map<string, number>;
}) {
  if (nodes.length === 0) {
    return <p className="px-2 text-xs text-muted-foreground">No folders yet.</p>;
  }
  return (
    <ul className="space-y-0.5">
      {nodes.map((node) => (
        <FolderRow
          key={node.id}
          node={node}
          library={library}
          activeId={activeId}
          counts={counts}
          depth={0}
        />
      ))}
    </ul>
  );
}

function FolderRow({
  node,
  library,
  activeId,
  counts,
  depth,
}: {
  node: FolderTreeNode;
  library: string;
  activeId: string | null;
  counts: Map<string, number>;
  depth: number;
}) {
  const active = node.id === activeId;
  const n = counts.get(node.id) ?? 0;
  const Icon = active ? FolderOpen : Folder;
  return (
    <li>
      <Link
        href={libraryHref({ library, folderId: node.id })}
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
          active ? "bg-fit-check-bg font-semibold text-navy" : "text-navy hover:bg-muted",
        )}
        style={{ paddingLeft: `${0.5 + depth * 0.85}rem` }}
      >
        <Icon className="size-3.5 shrink-0 opacity-80" />
        <span className="min-w-0 flex-1 truncate">{node.name}</span>
        <span className="text-[11px] text-muted-foreground">{n}</span>
      </Link>
      {node.children.length > 0 ? (
        <ul className="mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <FolderRow
              key={child.id}
              node={child}
              library={library}
              activeId={activeId}
              counts={counts}
              depth={depth + 1}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
