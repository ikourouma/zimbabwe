export interface MeProfile {
  authenticated: boolean;
  isSuperAdmin?: boolean;
  isAdmin?: boolean;
  isQualified?: boolean;
  email?: string;
  name?: string;
  role?: string;
}

export async function fetchMeWithRetry(maxAttempts = 4, delayMs = 150): Promise<MeProfile | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch("/api/me", { credentials: "include", cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as MeProfile;
      if (data.authenticated) return data;
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return null;
}
