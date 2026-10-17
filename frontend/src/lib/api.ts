function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') return '/api/v1';
  return (process.env.INTERNAL_BACKEND_URL || 'http://127.0.0.1:4000') + '/api/v1';
}

export class ApiError extends Error {
  status: number;
  details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

let currentAuthToken: string = 'dev-token:admin';

export function setApiAuthToken(token: string) {
  currentAuthToken = token;
}

export function getApiAuthToken(): string {
  return currentAuthToken;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const base = getApiBase();
  const url = `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${currentAuthToken}`,
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/markdown')) {
    return (await response.text()) as unknown as T;
  }

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      json.error?.message || json.message || `Request failed with status ${response.status}`,
      response.status,
      json.error?.details || json
    );
  }

  return json.data !== undefined ? json.data : json;
}
