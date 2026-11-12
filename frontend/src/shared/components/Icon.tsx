const PATHS = {
  tooth:
    'M12 5.5c-1.6-1.2-3.4-2-5-1.5-2.2.6-3.5 2.8-3.5 5.5 0 2.2.8 3.8 1.3 5.8.5 2 .7 5.2 2.4 5.2 2 0 1.6-5.5 4.8-5.5s2.8 5.5 4.8 5.5c1.7 0 1.9-3.2 2.4-5.2.5-2 1.3-3.6 1.3-5.8 0-2.7-1.3-4.9-3.5-5.5-1.6-.5-3.4.3-5 1.5Z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5',
  users:
    'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20c.6-3.4 3.2-5.2 6.5-5.2s5.9 1.8 6.5 5.2M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.9c1.9.7 3.2 2.5 3.5 5.1',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  logout: 'M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15M10 8l-4 4 4 4M6 12h9',
  plus: 'M12 5v14M5 12h14',
  back: 'M19 12H5M11 6l-6 6 6 6',
  calendar:
    'M5 5.5h14A1.5 1.5 0 0 1 20.5 7v12a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V7A1.5 1.5 0 0 1 5 5.5ZM3.5 10h17M8 3.5v4M16 3.5v4',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3.5 2',
  tag: 'M3.5 12.5V5A1.5 1.5 0 0 1 5 3.5h7.5L21 12l-8.5 8.5-9-8ZM8 8h.01',
  alert: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 8v5M12 16.5h.01',
  check: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8 12.5l2.7 2.7L16 9.5',
  tick: 'M5 12.5l4.5 4.5L19 7.5',
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-left': 'M15 6l-6 6 6 6',
  'chevron-right': 'M9 6l6 6-6 6',
  close: 'M6 6l12 12M18 6 6 18',
  copy: 'M9 9h9.5A1.5 1.5 0 0 1 20 10.5V19a1.5 1.5 0 0 1-1.5 1.5H10A1.5 1.5 0 0 1 8.5 19V9.5M15.5 5.5V5A1.5 1.5 0 0 0 14 3.5H5.5A1.5 1.5 0 0 0 4 5v8.5A1.5 1.5 0 0 0 5.5 15H6',
  refresh: 'M20 12a8 8 0 1 1-2.4-5.7M20 4.5v4h-4',
} as const;

export type IconName = keyof typeof PATHS;

type Props = { name: IconName };

// Iconos decorativos: el texto de al lado da el significado, por eso quedan ocultos a lectores.
export function Icon({ name }: Props) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
