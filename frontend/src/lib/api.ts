export function getApiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(status: number, message: string, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = getApiUrl(path);

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const headers: Record<string, string> = {
    ...defaultHeaders,
    ...(options.headers instanceof Headers
      ? Object.fromEntries(options.headers.entries())
      : Array.isArray(options.headers)
        ? Object.fromEntries(options.headers)
        : options.headers ?? {}),
  };
  const session = await getSession();
  if (session?.user?.email) {
    headers["X-Creator-Email"] = session.user.email;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");

  let data: unknown = null;
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
    let message = `Request failed with status ${response.status}`;
    if (
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      message = data.message;
    } else if (
      data &&
      typeof data === "object" &&
      "detail" in data &&
      typeof data.detail === "string"
    ) {
      message = data.detail;
    } else if (typeof data === "string" && data.length > 0) {
      message = data;
    }
    throw new ApiError(response.status, message, data);
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
import { getSession } from "next-auth/react";
