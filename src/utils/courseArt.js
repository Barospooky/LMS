import { normalizeCategorySlug } from './category';

const categoryImages = {
  development: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
  management: 'https://images.unsplash.com/photo-1507207611509-ec012433ff52?w=800',
  datascience: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
  marketing: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
  default: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
};

export const buildCourseArtwork = (course) => {
  return categoryImages[normalizeCategorySlug(course?.category)] || categoryImages.default;
};
