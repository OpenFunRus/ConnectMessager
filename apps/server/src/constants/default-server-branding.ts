const DEFAULT_SERVER_NAME = 'Мессенджер Коннект';
const DEFAULT_SERVER_DESCRIPTION =
  'Общая группа для обсуждения багов и улучшений.';
const DEFAULT_SERVER_LOGO_FILE_NAME = 'connectmessager-default-logo.svg';

const DEFAULT_SERVER_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill="none">
  <defs>
    <linearGradient id="bg" x1="160" y1="120" x2="864" y2="920" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#2f7fe4" />
      <stop offset="1" stop-color="#1659b8" />
    </linearGradient>
  </defs>

  <circle cx="512" cy="512" r="492" fill="url(#bg)" />
  <circle cx="512" cy="512" r="456" stroke="#62a0ff" stroke-width="36" />

  <g transform="translate(212 212) scale(25)" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 14l-3 -3h-7a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1h9a1 1 0 0 1 1 1v10" />
    <path d="M14 15v2a1 1 0 0 1 -1 1h-7l-3 3v-10a1 1 0 0 1 1 -1h2" />
  </g>
</svg>`;

export {
  DEFAULT_SERVER_DESCRIPTION,
  DEFAULT_SERVER_LOGO_FILE_NAME,
  DEFAULT_SERVER_LOGO_SVG,
  DEFAULT_SERVER_NAME
};
