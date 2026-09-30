const philippineDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const getPhilippineIsoDate = (date = new Date()): string => {
  const parts = philippineDateFormatter.formatToParts(date);
  const year = parts.find(part => part.type === 'year')?.value;
  const month = parts.find(part => part.type === 'month')?.value;
  const day = parts.find(part => part.type === 'day')?.value;

  if (!year || !month || !day) throw new Error('Unable to format Philippine date');
  return `${year}-${month}-${day}`;
};
