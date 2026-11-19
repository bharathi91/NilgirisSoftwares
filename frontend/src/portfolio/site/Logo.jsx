export const Logo = ({ className = "h-8 w-8", testid = "brand-logo" }) => (
  <svg viewBox="0 0 40 40" className={className} data-testid={testid} aria-hidden="true">
    <rect x="1" y="1" width="38" height="38" rx="11" fill="hsl(var(--foreground))" />
    <path d="M12 10.5h8.2c4 0 6.3 2 6.3 5.1 0 2.1-1.2 3.6-3 4.2 2.4.5 4 2.3 4 4.8 0 3.6-2.7 5.9-7 5.9H12z" fill="none" stroke="hsl(var(--background))" strokeWidth="2.6" strokeLinejoin="round" />
    <path d="M12 20h9.5" stroke="hsl(var(--background))" strokeWidth="2.6" strokeLinecap="round" />
    <circle cx="30.5" cy="29.5" r="3.2" fill="hsl(var(--primary))" />
  </svg>
);
