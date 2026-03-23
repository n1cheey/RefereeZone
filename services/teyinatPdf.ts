import { InstructorNomination } from '../types';

const TEYINAT_API_URL = String(import.meta.env.VITE_TEYINAT_API_URL || '').trim().replace(/\/+$/, '');

export type TeyinatGroup = 'A' | 'B';

export interface TeyinatSelection {
  group: TeyinatGroup;
  nomination: InstructorNomination;
}

const getFileNameFromDisposition = (headerValue: string | null) => {
  if (!headerValue) {
    return null;
  }

  const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) {
    return decodeURIComponent(utf8Match[1]);
  }

  const simpleMatch = headerValue.match(/filename="([^"]+)"/i);
  return simpleMatch ? simpleMatch[1] : null;
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export async function exportTeyinatPdf(selections: TeyinatSelection[]) {
  if (!TEYINAT_API_URL) {
    throw new Error('Teyinat service is not configured. Set VITE_TEYINAT_API_URL.');
  }

  const response = await fetch(`${TEYINAT_API_URL}/teyinat/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ selections }),
  });

  if (!response.ok) {
    let message = 'Failed to generate Teyinat PDF.';

    try {
      const payload = await response.json();
      if (payload?.message) {
        message = payload.message;
      }
    } catch {
      // keep fallback message
    }

    throw new Error(message);
  }

  const blob = await response.blob();
  const fileName = getFileNameFromDisposition(response.headers.get('Content-Disposition')) || 'Teyinat.pdf';
  downloadBlob(blob, fileName);
}
