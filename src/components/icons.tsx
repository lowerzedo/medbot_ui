import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function SettingsIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path
        d="M4 6h16M4 12h16M4 18h16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M8 3.5v5M16 9.5v5M10 15.5v5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </IconFrame>
  );
}

function IconFrame({ children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ReferralsIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path
        d="M7 3.75h7l3 3v13.5H7V3.75Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M14 3.75v3h3M9.75 11h4.5M9.75 14.5h4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </IconFrame>
  );
}

export function ReviewIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path
        d="M5.25 4.25h13.5v15.5H5.25z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <path
        d="m8.5 12 2 2 5-5M8.5 7.5h3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </IconFrame>
  );
}

export function AuditIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <circle
        cx="12"
        cy="12"
        r="7.75"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M12 7.75v4.75l3 1.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </IconFrame>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path
        d="M12 15.5V5.25m0 0L8.5 8.75M12 5.25l3.5 3.5M5.25 15.75v3h13.5v-3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </IconFrame>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <circle
        cx="10.75"
        cy="10.75"
        r="5.75"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="m15 15 4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </IconFrame>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path
        d="M5 12h13.5m-4.25-4.25L18.5 12l-4.25 4.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </IconFrame>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path
        d="m7.25 9.5 4.75 4.75 4.75-4.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </IconFrame>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path
        d="m14.5 5.75-6.25 6.25 6.25 6.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </IconFrame>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path
        d="m5.5 12.5 4 4 9-9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </IconFrame>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path
        d="M12 4.5 20 19H4L12 4.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <path
        d="M12 9v4.25M12 16.25h.01"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </IconFrame>
  );
}

export function EvidenceIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path
        d="M5.25 6.25h13.5v11.5H5.25z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <path
        d="M8.25 9.5h7.5M8.25 12.25h5.5M8.25 15h3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </IconFrame>
  );
}

export function ExternalLinkIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path
        d="M13.25 5.25h5.5v5.5M18.5 5.5l-7.25 7.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <path
        d="M10.25 6.25h-5v12.5h12.5v-5"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </IconFrame>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path
        d="m6.75 6.75 10.5 10.5m0-10.5-10.5 10.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </IconFrame>
  );
}
