import './SampleSheetExample.css'

type SampleSheetExampleProps = {
  pangram: string
}

/** Stylized mock photo of a structured handwriting sample sheet */
export function SampleSheetExample({ pangram }: SampleSheetExampleProps) {
  const mid = pangram.lastIndexOf(' ', Math.floor(pangram.length / 2))
  const line1 = mid > 0 ? pangram.slice(0, mid) : pangram
  const line2 = mid > 0 ? pangram.slice(mid + 1) : ''

  return (
    <svg
      className="sample-sheet"
      viewBox="0 0 320 220"
      role="img"
      aria-label="Example structured handwriting sample sheet"
    >
      <defs>
        <filter id="sheet-soft" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodOpacity="0.12" />
        </filter>
      </defs>

      <rect
        x="18"
        y="14"
        width="284"
        height="192"
        rx="4"
        fill="#fbfcfb"
        stroke="rgba(26,39,68,0.12)"
        filter="url(#sheet-soft)"
      />

      <g transform="rotate(-1.2 160 110)" fill="#2c3540" opacity="0.82">
        <text
          x="36"
          y="48"
          fontFamily="Allura, cursive"
          fontSize="15"
          letterSpacing="1.5"
        >
          ABCDEFGHIJKLM
        </text>
        <text
          x="36"
          y="70"
          fontFamily="Allura, cursive"
          fontSize="15"
          letterSpacing="1.5"
        >
          NOPQRSTUVWXYZ
        </text>

        <text
          x="36"
          y="104"
          fontFamily="Allura, cursive"
          fontSize="15"
          letterSpacing="1.2"
        >
          abcdefghijklm
        </text>
        <text
          x="36"
          y="126"
          fontFamily="Allura, cursive"
          fontSize="15"
          letterSpacing="1.2"
        >
          nopqrstuvwxyz
        </text>

        <text x="36" y="162" fontFamily="Allura, cursive" fontSize="15">
          {line1}
        </text>
        {line2 ? (
          <text x="36" y="182" fontFamily="Allura, cursive" fontSize="15">
            {line2}
          </text>
        ) : null}
      </g>
    </svg>
  )
}
