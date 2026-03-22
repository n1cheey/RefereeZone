async function postAi<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('AI request failed.');
  }

  return response.json() as Promise<T>;
}

export async function generateRefTips(category: string) {
  try {
    const response = await postAi<{ text: string }>('/api/ai/tips', { category });
    return response.text || 'Keep focusing on positioning and clear communication with the crew.';
  } catch {
    return 'Keep focusing on positioning and clear communication with the crew.';
  }
}

export async function summarizeReports(reportsCount: number, avgScore: number) {
  try {
    const response = await postAi<{ text: string }>('/api/ai/summary', { reportsCount, avgScore });
    return response.text || 'Your consistency in game management is highly valued by the league committee.';
  } catch {
    return 'Your consistency in game management is highly valued by the league committee.';
  }
}

export async function generateRefereeLogo() {
  try {
    const response = await postAi<{ imageUrl: string | null }>('/api/ai/logo', {});
    return response.imageUrl;
  } catch {
    return null;
  }
}
