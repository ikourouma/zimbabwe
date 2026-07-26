"use client";

import { createAuthClient } from "@neondatabase/auth/next";

/** Browser-side auth operations (sign-in/up forms, `authClient.useSession()` in client components). */
export const authClient = createAuthClient();
