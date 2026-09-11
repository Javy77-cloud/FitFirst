export function softEmailPhoneDups<T extends { id: string; email?: string | null; phone?: string | null; firstName?: string; lastName?: string }>(
  book: T[],
  self: { id?: string; email?: string | null; phone?: string | null },
): T[] {
  const email = (self.email ?? "").trim().toLowerCase();
  const phone = (self.phone ?? "").replace(/\D/g, "");
  if (!email && phone.length < 7) return [];
  return book.filter((row) => {
    if (self.id && row.id === self.id) return false;
    const rowEmail = (row.email ?? "").trim().toLowerCase();
    const rowPhone = (row.phone ?? "").replace(/\D/g, "");
    if (email && rowEmail && email === rowEmail) return true;
    if (phone.length >= 7 && rowPhone.length >= 7 && phone === rowPhone) return true;
    return false;
  });
}
