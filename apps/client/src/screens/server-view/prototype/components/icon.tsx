const Icon = ({ name, className = '' }: { name: string; className?: string }) => (
  <img
    src={`/icons/tabler/${name}.svg`}
    alt=""
    aria-hidden="true"
    className={`cmx-icon ${className}`.trim()}
  />
);

export { Icon };
