interface ChevronProps {
  open?: boolean;
}

export function Chevron({ open = false }: ChevronProps) {
  return (
    <span className={"chev" + (open ? " open" : "")} aria-hidden="true">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path
          d="M3.5 2L6.5 5L3.5 8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
