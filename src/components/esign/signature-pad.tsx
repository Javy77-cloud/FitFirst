"use client";

import { useEffect, useRef, useState } from "react";
import { completeInDeskSignature } from "@/app/actions/in-desk-esign";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InDeskSignerRole } from "@/lib/esign/in-desk";

export function SignaturePad({
  token,
  role,
  defaultName,
}: {
  token: string;
  role: InDeskSignerRole;
  defaultName: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [kind, setKind] = useState<"typed" | "drawn">("typed");
  const [typedName, setTypedName] = useState(defaultName);
  const [drawn, setDrawn] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = 560 * ratio;
    canvas.height = 160 * ratio;
    canvas.style.width = "100%";
    canvas.style.height = "160px";
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0c2340";
    ctx.fillStyle = "#fffcf7";
    ctx.fillRect(0, 0, 560, 160);
  }, []);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const box = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * 560,
      y: ((event.clientY - box.top) / box.height) * 160,
    };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    canvas?.setPointerCapture(event.pointerId);
    const { x, y } = point(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = point(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function end() {
    drawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDrawn(canvas.toDataURL("image/png"));
    setKind("drawn");
  }

  function clearPad() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fffcf7";
    ctx.fillRect(0, 0, 560, 160);
    setDrawn("");
    setKind("typed");
  }

  return (
    <form action={completeInDeskSignature} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="signatureKind" value={kind} />
      <input type="hidden" name="signatureData" value={drawn} />
      <div>
        <Label htmlFor="typedName">Type the legal name</Label>
        <Input
          id="typedName"
          name="typedName"
          value={typedName}
          onChange={(event) => setTypedName(event.target.value)}
          className="mt-1"
          required
        />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <Label>Or draw a signature</Label>
          <Button type="button" size="xs" variant="outline" onClick={clearPad}>
            Clear drawing
          </Button>
        </div>
        <canvas
          ref={canvasRef}
          className="h-40 w-full touch-none rounded-md border border-border bg-card"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Drawing is optional. Type the name either way. This is the in-desk stub — not DocuSign.
        </p>
      </div>
      <Button type="submit">{role === "agent_demo" ? "Mark signed (agent demo)" : "Mark signed"}</Button>
    </form>
  );
}
