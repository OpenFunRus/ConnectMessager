const AVATAR_FALLBACK_PALETTE = [
  ['#206bc4', '#1b5dab'],
  ['#4263eb', '#364fc7'],
  ['#5f3dc4', '#4c2ca8'],
  ['#ae3ec9', '#8f33a8'],
  ['#d6336c', '#b0255a'],
  ['#e8590c', '#c94f0a'],
  ['#2b8a3e', '#237032'],
  ['#0f766e', '#115e59']
] as const;

const hashString = (value: string) => {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  return hash;
};

const getAvatarFallbackStyle = (name: string) => {
  const safeName = name.trim() || 'Connect Messager';
  const [from, to] =
    AVATAR_FALLBACK_PALETTE[
      hashString(safeName) % AVATAR_FALLBACK_PALETTE.length
    ];

  return {
    background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
    color: '#f8fafc'
  };
};

export { getAvatarFallbackStyle };

