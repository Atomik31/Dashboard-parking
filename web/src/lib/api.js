/* Client de l'API : jeton Firebase en Authorization: Bearer. */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch(path, { token, method = 'GET', body, signal } = {}) {
  const res = await fetch(path, {
    method,
    signal,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* réponse non JSON */
  }
  if (!res.ok) throw new ApiError(data?.error || `Erreur ${res.status}`, res.status);
  return data;
}
