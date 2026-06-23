export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  const localToken = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  if (typeof window !== "undefined") {
    const path = window.location.pathname;
    const isClientPortal = path.startsWith("/portal");

    if (isClientPortal) {
      // Client portal: ONLY use localStorage token
      if (localToken) {
        headers.Authorization = `Bearer ${localToken}`;
      }
      // If no token, request goes unauthenticated → 401 → redirect to /auth/v2/login
    } else {
      // Admin portal: ONLY use next-auth session, ignore localStorage client tokens
      try {
        const { getSession } = await import("next-auth/react");
        const session = await getSession();
        if (session?.accessToken) {
          headers.Authorization = `Bearer ${session.accessToken}`;
        }
      } catch {
        // next-auth not available, skip
      }
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 && typeof window !== "undefined") {
    const path = window.location.pathname;
    if (path.startsWith("/portal")) {
      localStorage.removeItem("access_token");
      window.location.href = "/auth/v2/login";
    } else if (!path.startsWith("/dashboard")) {
      window.location.href = "/auth/v1/login";
    }
  }

  return response;
}
