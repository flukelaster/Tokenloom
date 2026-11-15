import type { ComponentRecipe } from '@schema';

interface IconDef {
  logicalId: string;
  name: string;
  labelEn: string;
  labelTh: string;
  svgContent: string;
}

const HELPER_ICONS: IconDef[] = [
  {
    logicalId: 'icon.plus',
    name: 'Icon / Plus',
    labelEn: 'Plus Icon',
    labelTh: 'ไอคอนบวก',
    svgContent:
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 3.333V12.667M3.333 8H12.667" stroke="#18181B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    logicalId: 'icon.search',
    name: 'Icon / Search',
    labelEn: 'Search Icon',
    labelTh: 'ไอคอนค้นหา',
    svgContent:
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="7.333" cy="7.333" r="4.667" stroke="#18181B" stroke-width="1.5"/><path d="M10.667 10.667L13.333 13.333" stroke="#18181B" stroke-width="1.5" stroke-linecap="round"/></svg>',
  },
  {
    logicalId: 'icon.check',
    name: 'Icon / Check',
    labelEn: 'Check Icon',
    labelTh: 'ไอคอนเครื่องหมายถูก',
    svgContent:
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.333 8.333L6.333 11.333L12.667 4.667" stroke="#18181B" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    logicalId: 'icon.chevron-down',
    name: 'Icon / ChevronDown',
    labelEn: 'Chevron Down Icon',
    labelTh: 'ไอคอนลูกศรลง',
    svgContent:
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 6L8 10L12 6" stroke="#18181B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    logicalId: 'icon.alert-circle',
    name: 'Icon / AlertCircle',
    labelEn: 'Alert Circle Icon',
    labelTh: 'ไอคอนแจ้งเตือน',
    svgContent:
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="6" stroke="#18181B" stroke-width="1.5"/><path d="M8 5.333V8.333M8 10.667H8.007" stroke="#18181B" stroke-width="1.5" stroke-linecap="round"/></svg>',
  },
  {
    logicalId: 'icon.close',
    name: 'Icon / Close',
    labelEn: 'Close Icon',
    labelTh: 'ไอคอนปิด',
    svgContent:
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4L12 12M12 4L4 12" stroke="#18181B" stroke-width="1.5" stroke-linecap="round"/></svg>',
  },
  {
    logicalId: 'icon.sparkles',
    name: 'Icon / Sparkles',
    labelEn: 'Sparkles Icon',
    labelTh: 'ไอคอนประกายดาว',
    svgContent:
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2L9.4 6.6L14 8L9.4 9.4L8 14L6.6 9.4L2 8L6.6 6.6L8 2Z" stroke="#18181B" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  },
  {
    logicalId: 'icon.settings',
    name: 'Icon / Settings',
    labelEn: 'Settings Icon',
    labelTh: 'ไอคอนตั้งค่า',
    svgContent:
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="2.2" stroke="#18181B" stroke-width="1.5"/><circle cx="8" cy="8" r="5.5" stroke="#18181B" stroke-width="1.3"/></svg>',
  },
];

export const HELPER_ICON_IDS = HELPER_ICONS.map((i) => i.logicalId);

export function createHelperIconRecipes(strokeTokenLogicalId: string): ComponentRecipe[] {
  return HELPER_ICONS.map((icon, idx) => ({
    logicalId: icon.logicalId,
    name: icon.name,
    displayName: { en: icon.labelEn, th: icon.labelTh },
    tier: 'helper',
    pageOrder: idx,
    dependencies: [],
    properties: [],
    variantAxes: [],
    baseNode: {
      id: 'root',
      name: icon.name,
      kind: 'frame',
      layoutMode: 'HORIZONTAL',
      primaryAxisSizingMode: 'FIXED',
      counterAxisSizingMode: 'FIXED',
      primaryAxisAlignItems: 'CENTER',
      counterAxisAlignItems: 'CENTER',
      width: 16,
      height: 16,
      transparentFill: true,
      children: [
        {
          id: 'glyph',
          name: 'Vector Glyph',
          kind: 'icon-vector',
          width: 16,
          height: 16,
          svgContent: icon.svgContent,
          bindings: {
            stroke: strokeTokenLogicalId,
          },
        },
      ],
    },
    variantOverrides: [],
    nonBindableExceptions: [
      {
        nodeId: 'glyph',
        field: 'svgVectorGeometry',
        reason: {
          en: 'SVG vector path geometry is static by Figma API design; stroke color is bound to semantic icon token.',
          th: 'เส้นทางเวกเตอร์ SVG เป็นโครงสร้างคงที่ตามข้อจำกัดของ Figma API โดยสีเส้นผูกกับตัวแปร Semantic แล้ว',
        },
      },
    ],
    contrastPairs: [],
  }));
}
