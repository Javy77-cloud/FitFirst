/** Always return an array so `.map` never runs on undefined (Safari TypeError). */
export function asList<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}
