const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const toIsoDate = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '';

  const raw = String(value).trim();
  const serial = Number(raw);
  if (Number.isFinite(serial) && serial > 40000 && serial < 60000) {
    return new Date((serial - 25569) * 86400 * 1000).toISOString().slice(0, 10);
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const year = slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3];
    return `${year}-${slashMatch[1].padStart(2, '0')}-${slashMatch[2].padStart(2, '0')}`;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};

export const formatAppDate = (value: string | number | null | undefined): string => {
  const isoDate = toIsoDate(value);
  if (!isoDate) return value ? String(value) : '';

  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return `${MONTHS[month - 1]}-${String(day).padStart(2, '0')}-${DAYS[date.getUTCDay()]}`;
};

export const formatAmount = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '';
  const numericValue = Number(String(value).replace(/,/g, ''));
  if (!Number.isFinite(numericValue)) return String(value);

  return numericValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const parseFormattedNumber = (value: string): number | undefined => {
  if (!value.trim()) return undefined;
  const numericValue = Number(value.replace(/,/g, ''));
  return Number.isFinite(numericValue) ? numericValue : undefined;
};
