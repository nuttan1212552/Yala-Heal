const common = { fill: 'none', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function SosIcon({ color, size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...common}>
      <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Z" />
      <path d="M12 6v4" />
      <path d="M12 13h.01" />
    </svg>
  );
}

export function MindIcon({ color, size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...common}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
      <path d="M9.5 10h5" />
      <path d="M12 8v4" />
    </svg>
  );
}

export function ShareIcon({ color, size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...common}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function ReliefIcon({ color, size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...common}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}

export function DashboardIcon({ color = '#fff', size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...common}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}
