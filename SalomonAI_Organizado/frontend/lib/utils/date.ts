const LOCALE = 'es-CL';

function parseIso(iso: string): Date | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export const formatDateShort = (iso: string) => {
  const date = parseIso(iso);
  if (!date) {
    return iso;
  }
  return date
    .toLocaleDateString(LOCALE, { day: '2-digit', month: 'short' })
    .replace('.', '');
};

export const formatDateTime = (iso: string) => {
  const date = parseIso(iso);
  if (!date) {
    return iso;
  }
  return date.toLocaleString(LOCALE, { dateStyle: 'medium', timeStyle: 'short' });
};

export const formatShortDate = (iso: string) => {
  const date = parseIso(iso);
  if (!date) {
    return iso;
  }
  return date
    .toLocaleDateString(LOCALE, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    .replace('.', '')
    .toLowerCase();
};
