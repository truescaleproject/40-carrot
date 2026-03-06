
export const normalizeStat = (value: any, type: 'M' | 'T' | 'SV' | 'INV' | 'W' | 'LD' | 'OC' | 'WS' | 'BS'): string => {
  if (!value) return '-';
  const str = String(value).trim();
  if (str === '-' || str.toLowerCase() === 'n/a' || str === '') return '-';

  // Extract the first number found
  const match = str.match(/(\d+)/);
  if (!match) return '-';

  const num = match[1];

  switch (type) {
      case 'M': return `${num}"`;
      case 'SV':
      case 'INV':
      case 'LD':
      case 'WS':
      case 'BS':
          return `${num}+`;
      case 'T':
      case 'W':
      case 'OC':
          return num;
      default: return str;
  }
};
