// Funkcija za formatiranje datuma na srpskom jeziku (latinica)
export function formatDate(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  const months = [
    'januar', 'februar', 'mart', 'april', 'maj', 'jun',
    'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar',
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}. ${month} ${year}. u ${hours}:${minutes}h`;
}
