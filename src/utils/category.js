const CATEGORY_LABELS = {
  development: 'Development',
  management: 'Management',
  marketing: 'Marketing',
  ai: 'AI',
  n8n: 'N8N',
  datascience: 'Data Science',
};

export const normalizeCategorySlug = (category = '') => {
  const slug = String(category).trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

  if (slug === 'datascience') return 'datascience';
  if (slug === 'artificialintelligence') return 'ai';

  return slug;
};

export const formatCategoryLabel = (category = '') => {
  const slug = normalizeCategorySlug(category);
  if (CATEGORY_LABELS[slug]) return CATEGORY_LABELS[slug];

  const cleaned = String(category).trim().replace(/[-_]+/g, ' ');
  if (!cleaned) return '';

  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((word) => {
      const lowered = word.toLowerCase();
      if (lowered === 'ai') return 'AI';
      if (lowered === 'n8n') return 'N8N';
      if (lowered === 'lms') return 'LMS';
      return lowered.charAt(0).toUpperCase() + lowered.slice(1);
    })
    .join(' ');
};

export const getCategoryOptions = () => ([
  { value: 'development', label: 'Development' },
  { value: 'management', label: 'Management' },
  { value: 'ai', label: 'AI' },
  { value: 'n8n', label: 'N8N' },
  { value: 'datascience', label: 'Data Science' },
  { value: 'marketing', label: 'Marketing' },
]);

export const formatInrCurrency = (amount) =>
  `₹${Math.round(Number(amount) || 0).toLocaleString('en-IN')}`;
