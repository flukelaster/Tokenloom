import React from 'react';

export interface IconProps {
  size?: number;
  className?: string;
}

export const IconSparkles: React.FC<IconProps> = ({ size = 15, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M8 1.75L9.45 5.55L13.25 7L9.45 8.45L8 12.25L6.55 8.45L2.75 7L6.55 5.55L8 1.75Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <path
      d="M12.75 11.25L13.3 12.7L14.75 13.25L13.3 13.8L12.75 15.25L12.2 13.8L10.75 13.25L12.2 12.7L12.75 11.25Z"
      fill="currentColor"
    />
  </svg>
);

export const IconLayers: React.FC<IconProps> = ({ size = 15, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M8 2L14 5.25L8 8.5L2 5.25L8 2Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <path
      d="M2 8.25L8 11.5L14 8.25"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M2 11.25L8 14.5L14 11.25"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconShieldCheck: React.FC<IconProps> = ({ size = 15, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M8 1.75L13.25 3.75V7.6C13.25 10.95 11.02 13.38 8 14.35C4.98 13.38 2.75 10.95 2.75 7.6V3.75L8 1.75Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <path
      d="M5.75 8.1L7.25 9.6L10.45 6.4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconSliders: React.FC<IconProps> = ({ size = 15, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M2.5 4.5H13.5M2.5 8H13.5M2.5 11.5H13.5"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
    <circle cx="5.5" cy="4.5" r="1.6" fill="var(--dsf-bg-surface)" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="10.5" cy="8" r="1.6" fill="var(--dsf-bg-surface)" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="6.5" cy="11.5" r="1.6" fill="var(--dsf-bg-surface)" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

export const IconSearch: React.FC<IconProps> = ({ size = 14, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <circle cx="7.25" cy="7.25" r="4.5" stroke="currentColor" strokeWidth="1.45" />
    <path d="M10.75 10.75L13.75 13.75" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
  </svg>
);

export const IconSun: React.FC<IconProps> = ({ size = 13, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="2.75" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="M8 1.75V3M8 13V14.25M1.75 8H3M13 8H14.25M3.58 3.58L4.46 4.46M11.54 11.54L12.42 12.42M12.42 3.58L11.54 4.46M4.46 11.54L3.58 12.42"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

export const IconMoon: React.FC<IconProps> = ({ size = 13, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M13.15 9.85A5.5 5.5 0 0 1 6.15 2.85A5.5 5.5 0 1 0 13.15 9.85Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconDownload: React.FC<IconProps> = ({ size = 14, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M8 2.5V10.25M8 10.25L5.25 7.5M8 10.25L10.75 7.5"
      stroke="currentColor"
      strokeWidth="1.45"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M2.75 11.75V12.5C2.75 13.05 3.2 13.5 3.75 13.5H12.25C12.8 13.5 13.25 13.05 13.25 12.5V11.75"
      stroke="currentColor"
      strokeWidth="1.45"
      strokeLinecap="round"
    />
  </svg>
);

export const IconRefresh: React.FC<IconProps> = ({ size = 14, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M13.25 8A5.25 5.25 0 1 1 11.7 4.28L13.25 5.75M13.25 2.75V5.75H10.25"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconDiff: React.FC<IconProps> = ({ size = 14, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <circle cx="4.5" cy="4" r="1.75" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="4.5" cy="12" r="1.75" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="11.5" cy="12" r="1.75" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="M4.5 5.75V10.25M11.5 10.25V7C11.5 5.62 10.38 4.5 9 4.5H7.25"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

export const IconCompass: React.FC<IconProps> = ({ size = 14, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="5.75" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="M10.35 5.65L9.1 9.1L5.65 10.35L6.9 6.9L10.35 5.65Z"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconTrash: React.FC<IconProps> = ({ size = 14, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M3 4.5H13M6.25 4.5V3.25C6.25 2.84 6.59 2.5 7 2.5H9C9.41 2.5 9.75 2.84 9.75 3.25V4.5M4.25 4.5L4.75 12.5C4.78 13.06 5.24 13.5 5.8 13.5H10.2C10.76 13.5 11.22 13.06 11.25 12.5L11.75 4.5"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconCheck: React.FC<IconProps> = ({ size = 12, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M3.5 8.3L6.5 11.3L12.5 4.8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconChevronRight: React.FC<IconProps> = ({ size = 13, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M6 3.75L10.25 8L6 12.25"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconCopy: React.FC<IconProps> = ({ size = 13, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <rect x="5.5" y="5.5" width="7.5" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.35" />
    <path
      d="M10.5 5.5V4C10.5 3.17 9.83 2.5 9 2.5H4C3.17 2.5 2.5 3.17 2.5 4V9C2.5 9.83 3.17 10.5 4 10.5H5.5"
      stroke="currentColor"
      strokeWidth="1.35"
    />
  </svg>
);
