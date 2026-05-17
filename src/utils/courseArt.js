const instrumentImages = {
  guitar: 'https://i.pinimg.com/736x/17/cd/83/17cd83e9e5a0bd9812908c222ee46921.jpg',
  piano: 'https://images.pexels.com/photos/1246437/pexels-photo-1246437.jpeg?auto=compress&cs=tinysrgb&w=1200',
  flute: 'https://i.pinimg.com/736x/47/c7/4a/47c74a40ae1c9c85173c228cc4d4fa6f.jpg',
  violin: 'https://i.pinimg.com/1200x/41/c0/c7/41c0c7371e634fb47729339c291ae15e.jpg',
  default: 'https://images.pexels.com/photos/164938/pexels-photo-164938.jpeg?auto=compress&cs=tinysrgb&w=1200',
};

export const buildCourseArtwork = (course) => {
  return instrumentImages[course?.instrument?.toLowerCase()] || instrumentImages.default;
};
