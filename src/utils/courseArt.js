const themes = {
  guitar: { start: '#3f2419', end: '#c97e43', accent: '#f4d6b0', glyph: 'G' },
  piano: { start: '#101114', end: '#4a4d57', accent: '#f2eee6', glyph: 'P' },
  flute: { start: '#29586c', end: '#88b7c4', accent: '#eff8fb', glyph: 'F' },
  violin: { start: '#5b2d17', end: '#d58c47', accent: '#fff0d6', glyph: 'V' },
  default: { start: '#3a2a23', end: '#b76a2f', accent: '#fff4e8', glyph: 'M' },
};

const encode = (value) => encodeURIComponent(value);

export const buildCourseArtwork = (course) => {
  const theme = themes[course?.instrument] || themes.default;
  const title = course?.title || 'Music Course';
  const instrument = (course?.instrument || 'music').toUpperCase();

  return `data:image/svg+xml;charset=UTF-8,${encode(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${theme.start}" />
          <stop offset="100%" stop-color="${theme.end}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="900" fill="url(#bg)" rx="48" />
      <circle cx="1000" cy="180" r="180" fill="rgba(255,255,255,0.08)" />
      <circle cx="250" cy="710" r="220" fill="rgba(0,0,0,0.12)" />
      <rect x="86" y="78" width="1028" height="744" rx="42" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.16)" />
      <rect x="126" y="118" width="948" height="664" rx="34" fill="rgba(17,13,10,0.16)" stroke="rgba(255,255,255,0.1)" />
      <text x="150" y="190" fill="${theme.accent}" font-family="Arial, Helvetica, sans-serif" font-size="30" letter-spacing="8">MELODY. CONSERVATORY</text>
      <text x="146" y="578" fill="rgba(255,255,255,0.96)" font-family="Georgia, serif" font-size="102" font-weight="700">${title}</text>
      <text x="152" y="640" fill="rgba(255,255,255,0.7)" font-family="Arial, Helvetica, sans-serif" font-size="28" letter-spacing="7">${instrument} STUDIES</text>
      <rect x="150" y="680" width="198" height="54" rx="27" fill="rgba(255,255,255,0.14)" />
      <text x="210" y="715" fill="${theme.accent}" font-family="Arial, Helvetica, sans-serif" font-size="24" letter-spacing="4">MASTERCLASS</text>
      <circle cx="936" cy="386" r="144" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.24)" stroke-width="3" />
      <circle cx="936" cy="386" r="110" fill="rgba(17,13,10,0.18)" stroke="rgba(255,255,255,0.18)" stroke-width="2" />
      <text x="888" y="424" fill="${theme.accent}" font-family="Arial, Helvetica, sans-serif" font-size="108" font-weight="700">${theme.glyph}</text>
    </svg>
  `)}`;
};
