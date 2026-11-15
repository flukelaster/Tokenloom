import React, { useId } from 'react';

export interface LibraryLogoProps {
  libraryId: string;
  size?: number;
  className?: string;
}

interface TileStyle {
  bg: string;
  border: string;
}

const TILE_THEMES: Record<string, TileStyle> = {
  shadcn: {
    bg: 'linear-gradient(145deg, #27272A 0%, #09090B 100%)',
    border: 'rgba(255, 255, 255, 0.14)',
  },
  antd: {
    bg: 'linear-gradient(145deg, rgba(22, 119, 255, 0.14) 0%, rgba(245, 29, 44, 0.08) 100%)',
    border: 'rgba(22, 119, 255, 0.24)',
  },
  mui: {
    bg: 'linear-gradient(145deg, rgba(0, 127, 255, 0.15) 0%, rgba(0, 89, 178, 0.08) 100%)',
    border: 'rgba(0, 127, 255, 0.25)',
  },
  carbon: {
    bg: 'linear-gradient(145deg, rgba(15, 98, 254, 0.16) 0%, rgba(15, 98, 254, 0.06) 100%)',
    border: 'rgba(15, 98, 254, 0.28)',
  },
  chakra: {
    bg: 'linear-gradient(145deg, rgba(41, 198, 183, 0.16) 0%, rgba(13, 148, 136, 0.08) 100%)',
    border: 'rgba(41, 198, 183, 0.28)',
  },
  mantine: {
    bg: 'linear-gradient(145deg, rgba(51, 154, 240, 0.16) 0%, rgba(34, 139, 230, 0.08) 100%)',
    border: 'rgba(51, 154, 240, 0.28)',
  },
  heroui: {
    bg: 'linear-gradient(145deg, #18181B 0%, #09090B 100%)',
    border: 'rgba(255, 255, 255, 0.14)',
  },
  'radix-themes': {
    bg: 'linear-gradient(145deg, #1E1E24 0%, #111115 100%)',
    border: 'rgba(255, 255, 255, 0.14)',
  },
  'fluent-web': {
    bg: 'linear-gradient(145deg, rgba(15, 108, 189, 0.16) 0%, rgba(71, 158, 245, 0.08) 100%)',
    border: 'rgba(15, 108, 189, 0.26)',
  },
  'material-web': {
    bg: 'linear-gradient(145deg, rgba(103, 80, 164, 0.16) 0%, rgba(103, 80, 164, 0.07) 100%)',
    border: 'rgba(103, 80, 164, 0.28)',
  },
};

export const LibraryLogo: React.FC<LibraryLogoProps> = ({
  libraryId,
  size = 32,
  className,
}) => {
  const rawUid = useId();
  const uid = rawUid.replace(/[^a-zA-Z0-9_-]/g, '');
  const tile = TILE_THEMES[libraryId] ?? {
    bg: 'var(--dsf-bg-elevated)',
    border: 'var(--dsf-border)',
  };
  const glyphSize = Math.round(size * 0.62);
  const radius = Math.max(6, Math.round(size * 0.26));

  const renderGlyph = () => {
    switch (libraryId) {
      case 'shadcn':
        return (
          <svg width={glyphSize} height={glyphSize} viewBox="0 0 256 256" fill="none">
            <path
              stroke="#FFFFFF"
              strokeWidth="26"
              strokeLinecap="round"
              d="M208 128l-80 80M192 40L40 192"
            />
          </svg>
        );

      case 'antd': {
        const gA = `${uid}-antd-a`;
        const gB = `${uid}-antd-b`;
        const gC = `${uid}-antd-c`;
        const gD = `${uid}-antd-d`;
        return (
          <svg width={glyphSize} height={glyphSize} viewBox="0 0 200 200" fill="none">
            <defs>
              <linearGradient id={gA} x1="62.1%" x2="108.2%" y1="0%" y2="37.9%">
                <stop offset="0%" stopColor="#4285EB" />
                <stop offset="100%" stopColor="#2EC7FF" />
              </linearGradient>
              <linearGradient id={gB} x1="69.6%" x2="54.0%" y1="0%" y2="108.5%">
                <stop offset="0%" stopColor="#29CDFF" />
                <stop offset="37.9%" stopColor="#148EFF" />
                <stop offset="100%" stopColor="#0A60FF" />
              </linearGradient>
              <linearGradient id={gC} x1="69.7%" x2="16.7%" y1="-13.0%" y2="117.4%">
                <stop offset="0%" stopColor="#FA816E" />
                <stop offset="41.5%" stopColor="#F74A5C" />
                <stop offset="100%" stopColor="#F51D2C" />
              </linearGradient>
              <linearGradient id={gD} x1="68.1%" x2="30.4%" y1="-35.7%" y2="114.9%">
                <stop offset="0%" stopColor="#FA8E7D" />
                <stop offset="51.3%" stopColor="#F74A5C" />
                <stop offset="100%" stopColor="#F51D2C" />
              </linearGradient>
            </defs>
            <path
              fill={`url(#${gA})`}
              d="M91.588 4.177 4.18 91.513a11.98 11.98 0 0 0 0 16.974l87.408 87.336a12.005 12.005 0 0 0 16.989 0l36.648-36.618c4.209-4.205 4.209-11.023 0-15.228s-11.031-4.205-15.24 0l-27.783 27.76c-1.17 1.169-2.945 1.169-4.114 0l-69.802-69.744c-1.17-1.169-1.17-2.942 0-4.11l69.802-69.745c1.17-1.169 2.944-1.169 4.114 0l27.783 27.76c4.209 4.205 11.032 4.205 15.24 0s4.209-11.022 0-15.227L108.581 4.056c-4.719-4.594-12.312-4.557-16.993.12"
            />
            <path
              fill={`url(#${gB})`}
              d="M91.588 4.177 4.18 91.513a11.98 11.98 0 0 0 0 16.974l87.408 87.336a12.005 12.005 0 0 0 16.989 0l36.648-36.618c4.209-4.205 4.209-11.023 0-15.228s-11.031-4.205-15.24 0l-27.783 27.76c-1.17 1.169-2.945 1.169-4.114 0l-69.802-69.744c-1.17-1.169-1.17-2.942 0-4.11l69.802-69.745c2.912-2.51 7.664-7.596 14.642-8.786q7.778-1.325 17.009 5.837L108.58 4.056c-4.719-4.594-12.312-4.557-16.993.12"
            />
            <path
              fill={`url(#${gC})`}
              d="M153.686 135.855c4.208 4.205 11.031 4.205 15.24 0l27.034-27.012a11.98 11.98 0 0 0 0-16.974l-27.27-27.15c-4.218-4.2-11.043-4.195-15.254.013-4.209 4.205-4.209 11.022 0 15.227l18.418 18.403c1.17 1.169 1.17 2.943 0 4.111l-18.168 18.154c-4.209 4.205-4.209 11.023 0 15.228"
            />
            <ellipse cx="100.519" cy="100.437" fill={`url(#${gD})`} rx="23.6" ry="23.581" />
          </svg>
        );
      }

      case 'mui':
        return (
          <svg width={glyphSize} height={glyphSize} viewBox="0 0 24 24" fill="#007FFF">
            <path d="M20.229 15.793a.666.666 0 0 0 .244-.243.666.666 0 0 0 .09-.333l.012-3.858a.666.666 0 0 1 .09-.333.666.666 0 0 1 .245-.243L23 9.58a.667.667 0 0 1 .333-.088.667.667 0 0 1 .333.09.667.667 0 0 1 .244.243.666.666 0 0 1 .089.333v7.014a.667.667 0 0 1-.335.578l-7.893 4.534a.666.666 0 0 1-.662 0l-6.194-3.542a.667.667 0 0 1-.246-.244.667.667 0 0 1-.09-.335v-3.537c0-.004.004-.006.008-.004s.008 0 .008-.005v-.004c0-.003.002-.005.004-.007l5.102-2.93c.004-.003.002-.01-.003-.01a.005.005 0 0 1-.004-.002.005.005 0 0 1-.001-.004l.01-3.467a.667.667 0 0 0-.333-.58.667.667 0 0 0-.667 0L8.912 9.799a.667.667 0 0 1-.665 0l-3.804-2.19a.667.667 0 0 0-.999.577v6.267a.667.667 0 0 1-.332.577.666.666 0 0 1-.332.09.667.667 0 0 1-.333-.088L.336 13.825a.667.667 0 0 1-.246-.244.667.667 0 0 1-.09-.336L.019 2.292a.667.667 0 0 1 .998-.577l7.23 4.153a.667.667 0 0 0 .665 0l7.228-4.153a.666.666 0 0 1 .333-.088.666.666 0 0 1 .333.09.667.667 0 0 1 .244.244.667.667 0 0 1 .088.333V13.25c0 .117-.03.232-.089.334a.667.667 0 0 1-.245.244l-3.785 2.18a.667.667 0 0 0-.245.245.666.666 0 0 0-.089.334.667.667 0 0 0 .09.334.666.666 0 0 0 .247.244l2.088 1.189a.67.67 0 0 0 .33.087.667.667 0 0 0 .332-.089l4.457-2.56Zm.438-9.828a.666.666 0 0 0 .09.335.666.666 0 0 0 .248.244.667.667 0 0 0 .67-.008l2.001-1.2a.666.666 0 0 0 .237-.243.667.667 0 0 0 .087-.329V2.32a.667.667 0 0 0-.091-.335.667.667 0 0 0-.584-.33.667.667 0 0 0-.334.094l-2 1.2a.666.666 0 0 0-.238.243.668.668 0 0 0-.086.329v2.445Z" />
          </svg>
        );

      case 'carbon':
        return (
          <svg width={glyphSize} height={glyphSize} viewBox="0 0 32 32" fill="none">
            {/* IBM Carbon Design System Hexagonal Lattice Emblem */}
            <path
              d="M16 3L26.5 9V23L16 29L5.5 23V9L16 3Z"
              stroke="#0F62FE"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <path
              d="M16 3V16M16 16L26.5 9M16 16L5.5 23"
              stroke="#4589FF"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="16" cy="16" r="3.2" fill="#0F62FE" />
          </svg>
        );

      case 'chakra': {
        const gChakra = `${uid}-chakra-a`;
        return (
          <svg width={glyphSize} height={glyphSize} viewBox="0 0 257 257" fill="none">
            <defs>
              <linearGradient
                id={gChakra}
                x1="128.5"
                x2="128.5"
                y1="0"
                y2="257"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#63E6BE" />
                <stop offset="1" stopColor="#0D9488" />
              </linearGradient>
            </defs>
            <rect width="257" height="257" rx="128.5" fill={`url(#${gChakra})`} />
            <path
              d="m69.558 133.985 87.592-86.99c1.636-1.624 4.27.353 3.165 2.378l-32.601 59.752c-.728 1.332.237 2.958 1.755 2.958h56.34c1.815 0 2.691 2.223 1.364 3.462l-98.728 92.142c-1.77 1.652-4.405-.676-2.984-2.636l46.736-64.473c.958-1.322.014-3.174-1.619-3.174h-59.61c-1.786 0-2.677-2.161-1.41-3.419z"
              fill="#FFFFFF"
            />
          </svg>
        );
      }

      case 'mantine':
        return (
          <svg width={glyphSize} height={glyphSize} viewBox="0 0 163 163" fill="none">
            <path
              fill="#339AF0"
              d="M162.162 81.5c0-45.011-36.301-81.5-81.08-81.5C36.301 0 0 36.489 0 81.5 0 126.51 36.301 163 81.081 163s81.081-36.49 81.081-81.5z"
            />
            <path
              fill="#FFFFFF"
              d="M65.983 43.049a6.234 6.234 0 00-.336 6.884 6.14 6.14 0 001.618 1.786c9.444 7.036 14.866 17.794 14.866 29.52 0 11.726-5.422 22.484-14.866 29.52a6.145 6.145 0 00-1.616 1.786 6.21 6.21 0 00-.694 4.693 6.21 6.21 0 001.028 2.186 6.151 6.151 0 006.457 2.319 6.154 6.154 0 002.177-1.035 50.083 50.083 0 007.947-7.39h17.493c3.406 0 6.174-2.772 6.174-6.194s-2.762-6.194-6.174-6.194h-9.655a49.165 49.165 0 004.071-19.69 49.167 49.167 0 00-4.07-19.692h9.66c3.406 0 6.173-2.771 6.173-6.194 0-3.422-2.762-6.193-6.173-6.193H82.574a50.112 50.112 0 00-7.952-7.397 6.15 6.15 0 00-4.578-1.153 6.189 6.189 0 00-4.055 2.438h-.006z"
            />
            <path
              fill="#FFFFFF"
              fillRule="evenodd"
              clipRule="evenodd"
              d="M56.236 79.391a9.342 9.342 0 01.632-3.608 9.262 9.262 0 011.967-3.077 9.143 9.143 0 012.994-2.063 9.06 9.06 0 017.103 0 9.145 9.145 0 012.995 2.063 9.262 9.262 0 011.967 3.077 9.339 9.339 0 01-2.125 10.003 9.094 9.094 0 01-6.388 2.63 9.094 9.094 0 01-6.39-2.63 9.3 9.3 0 01-2.755-6.395z"
            />
          </svg>
        );

      case 'heroui':
        return (
          <svg width={glyphSize} height={glyphSize} viewBox="15 15 44 44" fill="none">
            <path
              fill="#FFFFFF"
              d="M50.638 52.566V21.201h5.2v31.365h-5.2ZM30.731 53.22c-2.425 0-4.567-.501-6.425-1.503a11.087 11.087 0 0 1-4.378-4.204c-1.046-1.815-1.569-3.942-1.569-6.382V21.223l5.1-.022v19.604c0 1.48.247 2.773.74 3.877.509 1.089 1.177 1.996 2.005 2.722a8.61 8.61 0 0 0 2.722 1.634 9.039 9.039 0 0 0 2.984.523 8.773 8.773 0 0 0 3.006-.545 8.5 8.5 0 0 0 2.723-1.612c.827-.726 1.488-1.64 1.982-2.744.493-1.104.74-2.389.74-3.855V21.2h5.1v19.93c0 2.425-.53 4.545-1.59 6.36a10.893 10.893 0 0 1-4.356 4.226c-1.859 1.002-4 1.503-6.426 1.503Z"
            />
          </svg>
        );

      case 'radix-themes':
        return (
          <svg width={glyphSize} height={glyphSize} viewBox="2 0 21 25" fill="none">
            <path
              d="M12 25a8 8 0 1 1 0-16v16zM12 0H4v8h8V0zM17 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
              fill="#FFFFFF"
            />
          </svg>
        );

      case 'fluent-web': {
        const gF1 = `${uid}-fl-1`;
        const gF2 = `${uid}-fl-2`;
        return (
          <svg width={glyphSize} height={glyphSize} viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id={gF1} x1="4" y1="4" x2="28" y2="14" gradientUnits="userSpaceOnUse">
                <stop stopColor="#479EF5" />
                <stop offset="1" stopColor="#0F6CBD" />
              </linearGradient>
              <linearGradient id={gF2} x1="6" y1="13" x2="22" y2="28" gradientUnits="userSpaceOnUse">
                <stop stopColor="#2886DE" />
                <stop offset="1" stopColor="#0A467E" />
              </linearGradient>
            </defs>
            {/* Layered Fluent v9 Ribbon F */}
            <rect x="6" y="4" width="20" height="7" rx="2.5" fill={`url(#${gF1})`} />
            <rect x="6" y="13" width="15" height="7" rx="2.5" fill="#2886DE" />
            <rect x="6" y="13" width="7.5" height="15" rx="2.5" fill={`url(#${gF2})`} />
          </svg>
        );
      }

      case 'material-web':
        return (
          <svg width={glyphSize} height={glyphSize} viewBox="0 0 24 24" fill="#6750A4">
            <path d="M11.9998 23.9997c-1.6545 0-3.218-.309-4.691-.927-1.4544-.6364-2.7269-1.4909-3.8179-2.5639-1.073-1.0905-1.9274-2.3634-2.5634-3.8179C.3085 15.2179 0 13.6545 0 12c0-1.6725.309-3.2364.927-4.6909.6365-1.4545 1.491-2.718 2.564-3.791C4.5818 2.4278 5.8543 1.5733 7.3087.9548c1.473-.6365 3.0365-.9545 4.691-.9545 1.673 0 3.2364.318 4.6909.955 1.4544.618 2.7179 1.4725 3.7909 2.563 1.091 1.073 1.945 2.3364 2.5634 3.7909C23.6815 8.7641 24 10.3275 24 12c0 1.655-.3185 3.218-.955 4.6909-.618 1.4545-1.4724 2.7274-2.5634 3.818-1.073 1.0729-2.3365 1.9274-3.791 2.5639-1.455.618-3.0179.927-4.6909.927zm-7.6364-5.8633V5.8636A9.4843 9.4843 0 0 0 2.755 8.7001C2.373 9.7365 2.1825 10.8365 2.1825 12s.1905 2.2725.5724 3.3274a9.5713 9.5713 0 0 0 1.609 2.809zm1.5-13.7727H18.163a9.4848 9.4848 0 0 0-2.836-1.609c-1.0549-.382-2.1639-.5725-3.3273-.5725-1.1635 0-2.2725.1905-3.327.5725a9.5713 9.5713 0 0 0-2.8094 1.609Zm6.1364 10.3637 4.1179-8.1818H7.9088Zm1.091 2.727h4.3633V8.7276Zm-6.5454 0h4.3634L6.5454 8.7276Zm8.7813 3.791c1.0545-.382 2-.918 2.836-1.609H5.8628a9.5713 9.5713 0 0 0 2.8094 1.609c1.0545.3819 2.1635.5724 3.327.5724 1.0543 0 2.1823-.1579 3.3274-.5725zm4.3089-3.109a9.5713 9.5713 0 0 0 1.609-2.809c.382-1.055.5724-2.164.5724-3.3274 0-1.1635-.1905-2.2635-.5724-3.3-.382-1.055-.918-1.9999-1.609-2.8364Z" />
          </svg>
        );

      default:
        return (
          <span style={{ fontWeight: 700, fontSize: Math.round(size * 0.4) }}>
            {libraryId.slice(0, 2).toUpperCase()}
          </span>
        );
    }
  };

  return (
    <span
      className={`dsf-lib-logo ${className ?? ''}`}
      data-testid={`lib-logo-${libraryId}`}
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: tile.bg,
        border: `1px solid ${tile.border}`,
      }}
    >
      {renderGlyph()}
    </span>
  );
};
