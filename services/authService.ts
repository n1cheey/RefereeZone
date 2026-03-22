import { AuthResponse, UserRole } from '../types';

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload extends LoginPayload {
  fullName: string;
  role: UserRole;
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

async function request<T>(url: string, options: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, options);
  } catch {
    throw new Error('Сервер авторизации недоступен. Запустите `npm run server` или `npm run dev:full`.');
  }

  const rawBody = await response.text();
  let data: { message?: string } | null = null;

  if (rawBody) {
    try {
      data = JSON.parse(rawBody) as { message?: string };
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new Error(data?.message || 'Не удалось выполнить запрос.');
  }

  return data as T;
}

export function loginUser(payload: LoginPayload) {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
}

export function registerUser(payload: RegisterPayload) {
  return request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
}
