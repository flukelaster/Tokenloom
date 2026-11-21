import type { EffectStyleDefinition, TextStyleDefinition } from '@schema';

export interface StandardStyleTokenRefs {
  fontSansTokenId: string;
  fontMonoTokenId: string;
  fontWeightRegularTokenId?: string;
  fontWeightMediumTokenId?: string;
  fontWeightSemiboldTokenId?: string;
  fontSizeXsTokenId: string;
  fontSizeSmTokenId: string;
  fontSizeMdTokenId: string;
  fontSizeLgTokenId: string;
  fontSizeXlTokenId: string;
  fontSize2xlTokenId: string;
  lineHeightTightTokenId: string;
  lineHeightNormalTokenId: string;
  lineHeightRelaxedTokenId: string;
  shadowColorTokenId: string;
  focusRingColorTokenId: string;
}

export function buildStandardTextStyles(refs: StandardStyleTokenRefs): TextStyleDefinition[] {
  const weightRegular = refs.fontWeightRegularTokenId ?? 'primitive.font.weight.regular';
  const weightMedium = refs.fontWeightMediumTokenId ?? 'primitive.font.weight.medium';
  const weightSemibold = refs.fontWeightSemiboldTokenId ?? 'primitive.font.weight.semibold';

  return [
    {
      logicalId: 'textstyle.heading.xl',
      name: 'Typography/Heading XL',
      description: {
        en: 'Page titles and hero section headers (24px / 32px SemiBold).',
        th: 'หัวข้อหลักของหน้าและส่วนเริ่มต้น (24px / 32px กึ่งหนา)',
      },
      fontRole: 'sans',
      fontStyle: 'SemiBold',
      fontSize: 24,
      lineHeightPx: 32,
      letterSpacingPx: -0.4,
      boundVariables: {
        fontFamily: refs.fontSansTokenId,
        fontWeight: weightSemibold,
        fontSize: refs.fontSize2xlTokenId,
        lineHeight: refs.lineHeightRelaxedTokenId,
      },
    },
    {
      logicalId: 'textstyle.heading.lg',
      name: 'Typography/Heading LG',
      description: {
        en: 'Section headers and dialog titles (18px / 26px SemiBold).',
        th: 'หัวข้อส่วนย่อยและชื่อหน้าต่างโต้ตอบ (18px / 26px กึ่งหนา)',
      },
      fontRole: 'sans',
      fontStyle: 'SemiBold',
      fontSize: 18,
      lineHeightPx: 26,
      letterSpacingPx: -0.2,
      boundVariables: {
        fontFamily: refs.fontSansTokenId,
        fontWeight: weightSemibold,
        fontSize: refs.fontSizeXlTokenId,
      },
    },
    {
      logicalId: 'textstyle.heading.md',
      name: 'Typography/Heading MD',
      description: {
        en: 'Card titles and subsection headings (16px / 24px SemiBold).',
        th: 'ชื่อการ์ดและหัวข้อย่อย (16px / 24px กึ่งหนา)',
      },
      fontRole: 'sans',
      fontStyle: 'SemiBold',
      fontSize: 16,
      lineHeightPx: 24,
      letterSpacingPx: -0.1,
      boundVariables: {
        fontFamily: refs.fontSansTokenId,
        fontWeight: weightSemibold,
        fontSize: refs.fontSizeLgTokenId,
        lineHeight: refs.lineHeightNormalTokenId,
      },
    },
    {
      logicalId: 'textstyle.body.md',
      name: 'Typography/Body MD',
      description: {
        en: 'Default body copy and form input values (14px / 20px Regular).',
        th: 'ข้อความเนื้อหามาตรฐานและค่าภายในช่องกรอกข้อมูล (14px / 20px ปกติ)',
      },
      fontRole: 'sans',
      fontStyle: 'Regular',
      fontSize: 14,
      lineHeightPx: 20,
      letterSpacingPx: 0,
      boundVariables: {
        fontFamily: refs.fontSansTokenId,
        fontWeight: weightRegular,
        fontSize: refs.fontSizeMdTokenId,
        lineHeight: refs.lineHeightTightTokenId,
      },
    },
    {
      logicalId: 'textstyle.body.sm',
      name: 'Typography/Body SM',
      description: {
        en: 'Helper descriptions, secondary metadata, and captions (12px / 18px Regular).',
        th: 'คำอธิบายประกอบ ข้อมูลรอง และคำบรรยาย (12px / 18px ปกติ)',
      },
      fontRole: 'sans',
      fontStyle: 'Regular',
      fontSize: 12,
      lineHeightPx: 18,
      letterSpacingPx: 0,
      boundVariables: {
        fontFamily: refs.fontSansTokenId,
        fontWeight: weightRegular,
        fontSize: refs.fontSizeSmTokenId,
      },
    },
    {
      logicalId: 'textstyle.label.md',
      name: 'Typography/Label MD',
      description: {
        en: 'Interactive button labels, tabs, and form field labels (14px / 20px Medium).',
        th: 'ป้ายชื่อปุ่ม แท็บ และหัวข้อช่องกรอกข้อมูล (14px / 20px ปานกลาง)',
      },
      fontRole: 'sans',
      fontStyle: 'Medium',
      fontSize: 14,
      lineHeightPx: 20,
      letterSpacingPx: 0,
      boundVariables: {
        fontFamily: refs.fontSansTokenId,
        fontWeight: weightMedium,
        fontSize: refs.fontSizeMdTokenId,
        lineHeight: refs.lineHeightTightTokenId,
      },
    },
    {
      logicalId: 'textstyle.label.sm',
      name: 'Typography/Label SM',
      description: {
        en: 'Badges, compact buttons, and status chips (12px / 16px Medium).',
        th: 'ป้ายสถานะ ปุ่มขนาดเล็ก และชิปข้อมูล (12px / 16px ปานกลาง)',
      },
      fontRole: 'sans',
      fontStyle: 'Medium',
      fontSize: 12,
      lineHeightPx: 16,
      letterSpacingPx: 0.1,
      boundVariables: {
        fontFamily: refs.fontSansTokenId,
        fontWeight: weightMedium,
        fontSize: refs.fontSizeSmTokenId,
      },
    },
    {
      logicalId: 'textstyle.code.sm',
      name: 'Typography/Code SM',
      description: {
        en: 'Token identifiers, CLI snippets, and technical references (12px / 18px Mono).',
        th: 'ชื่อตัวแปร โค้ดอ้างอิง และข้อมูลทางเทคนิค (12px / 18px โมโนสเปซ)',
      },
      fontRole: 'mono',
      fontStyle: 'Regular',
      fontSize: 12,
      lineHeightPx: 18,
      letterSpacingPx: 0,
      boundVariables: {
        fontFamily: refs.fontMonoTokenId,
        fontWeight: weightRegular,
        fontSize: refs.fontSizeXsTokenId,
      },
    },
  ];
}

export function buildStandardEffectStyles(refs: StandardStyleTokenRefs): EffectStyleDefinition[] {
  return [
    {
      logicalId: 'effectstyle.shadow.xs',
      name: 'Elevation/Shadow XS',
      description: {
        en: 'Subtle control elevation for buttons, inputs, and switches.',
        th: 'เงาระดับต่ำสำหรับปุ่ม ช่องกรอกข้อมูล และสวิตช์',
      },
      shadows: [
        {
          offsetX: 0,
          offsetY: 1,
          radius: 2,
          spread: 0,
          fallbackHex: '#09090B',
          fallbackOpacity: 0.06,
          colorTokenLogicalId: refs.shadowColorTokenId,
        },
      ],
    },
    {
      logicalId: 'effectstyle.shadow.md',
      name: 'Elevation/Shadow MD',
      description: {
        en: 'Elevated cards, popovers, and floating toolbars.',
        th: 'เงาระดับกลางสำหรับการ์ด ป๊อปโอเวอร์ และแถบเครื่องมือลอยตัว',
      },
      shadows: [
        {
          offsetX: 0,
          offsetY: 4,
          radius: 10,
          spread: -2,
          fallbackHex: '#09090B',
          fallbackOpacity: 0.1,
          colorTokenLogicalId: refs.shadowColorTokenId,
        },
      ],
    },
    {
      logicalId: 'effectstyle.shadow.lg',
      name: 'Elevation/Shadow LG',
      description: {
        en: 'Modal dialogs, drawers, and high-priority overlays.',
        th: 'เงาระดับสูงสำหรับหน้าต่างโต้ตอบ Modal และเลเยอร์ทับซ้อน',
      },
      shadows: [
        {
          offsetX: 0,
          offsetY: 12,
          radius: 24,
          spread: -4,
          fallbackHex: '#09090B',
          fallbackOpacity: 0.16,
          colorTokenLogicalId: refs.shadowColorTokenId,
        },
      ],
    },
    {
      logicalId: 'effectstyle.focus.ring',
      name: 'Focus/Accessible Ring',
      description: {
        en: 'Visual focus indicator ring demonstrating keyboard focus appearance in Figma.',
        th: 'วงแหวนแสดงสถานะโฟกัสสำหรับจำลองการเข้าถึงด้วยคีย์บอร์ดใน Figma',
      },
      shadows: [
        {
          offsetX: 0,
          offsetY: 0,
          radius: 0,
          spread: 3,
          fallbackHex: '#3B82F6',
          fallbackOpacity: 0.35,
          colorTokenLogicalId: refs.focusRingColorTokenId,
        },
      ],
    },
  ];
}
