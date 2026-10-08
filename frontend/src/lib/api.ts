export function getApiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = getApiUrl(path);

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const headers = {
    ...defaultHeaders,
    ...(options.headers ?? {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");

  let data: any = null;
  if (isJson) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && "message" in data && data.message) ||
      (typeof data === "string" && data.length > 0 && data) ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  get<T>(path: string, opts: Omit<RequestInit, "method"> = {}): Promise<T> {
    return request<T>(path, { ...opts, method: "GET" });
  },

  post<T>(path: string, body?: unknown, opts: Omit<RequestInit, "method" | "body"> = {}): Promise<T> {
    return request<T>(path, {
      ...opts,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(path: string, body?: unknown, opts: Omit<RequestInit, "method" | "body"> = {}): Promise<T> {
    return request<T>(path, {
      ...opts,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  patch<T>(path: string, body?: unknown, opts: Omit<RequestInit, "method" | "body"> = {}): Promise<T> {
    return request<T>(path, {
      ...opts,
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(path: string, opts: Omit<RequestInit, "method"> = {}): Promise<T> {
    return request<T>(path, { ...opts, method: "DELETE" });
  },
};
