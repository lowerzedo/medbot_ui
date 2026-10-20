export function isTrustedMutationOrigin(
  origin: string | null,
  fetchSite: string | null,
  requestOrigin: string,
): boolean {
  if (fetchSite === "cross-site") return false;
  if (!origin) return true;

  try {
    return new URL(origin).origin === requestOrigin;
  } catch {
    return false;
  }
}
