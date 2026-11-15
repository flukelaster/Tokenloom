import type { ComponentRecipe } from '@schema';
import { HELPER_ICON_IDS } from './icons';
import type { AdapterTokenBindings, EcosystemRecipeOptions } from './recipe-types';

export function buildControlComponentRecipes(
  t: AdapterTokenBindings,
  opts: EcosystemRecipeOptions,
): ComponentRecipe[] {
  const badgeRadiusToken = opts.pillBadges !== false ? t.radiusFull : t.radiusSm;

  // 1. BUTTON (Technical Slice)
  const button: ComponentRecipe = {
    logicalId: 'button',
    name: 'Button',
    displayName: { en: 'Button', th: 'ปุ่มกด (Button)' },
    tier: 'technical-slice',
    pageOrder: 1,
    dependencies: ['icon.plus', 'icon.chevron-down', ...HELPER_ICON_IDS],
    properties: [
      {
        logicalKey: 'label',
        name: 'Label',
        type: 'TEXT',
        defaultValue: 'Continue',
        localizedDefaultText: { en: 'Continue', th: 'ดำเนินการต่อ' },
        description: {
          en: 'Action verb displayed inside the button.',
          th: 'คำกริยาแสดงการกระทำภายในปุ่ม',
        },
      },
      {
        logicalKey: 'showLeadingIcon',
        name: 'Leading Icon',
        type: 'BOOLEAN',
        defaultValue: false,
        description: {
          en: 'Toggles visibility of the leading icon slot.',
          th: 'เปิด/ปิดการแสดงไอคอนด้านหน้าข้อความ',
        },
      },
      {
        logicalKey: 'leadingIcon',
        name: 'Start Icon',
        type: 'INSTANCE_SWAP',
        defaultValue: 'icon.plus',
        preferredInstanceLogicalIds: HELPER_ICON_IDS,
        description: {
          en: 'Swappable leading icon component instance.',
          th: 'สลับไอคอนด้านหน้าจากชุด Icon component',
        },
      },
      {
        logicalKey: 'showTrailingIcon',
        name: 'Trailing Icon',
        type: 'BOOLEAN',
        defaultValue: false,
        description: {
          en: 'Toggles visibility of the trailing icon slot.',
          th: 'เปิด/ปิดการแสดงไอคอนด้านหลังข้อความ',
        },
      },
      {
        logicalKey: 'trailingIcon',
        name: 'End Icon',
        type: 'INSTANCE_SWAP',
        defaultValue: 'icon.chevron-down',
        preferredInstanceLogicalIds: HELPER_ICON_IDS,
        description: {
          en: 'Swappable trailing icon component instance.',
          th: 'สลับไอคอนด้านหลังจากชุด Icon component',
        },
      },
    ],
    variantAxes: [
      {
        name: 'Variant',
        values: ['Primary', 'Secondary', 'Outline', 'Ghost', 'Destructive'],
        defaultValue: 'Primary',
        description: {
          en: 'Visual emphasis role of the button.',
          th: 'ลำดับความสำคัญทางสายตาของปุ่ม',
        },
      },
      {
        name: 'Size',
        values: ['Small', 'Medium', 'Large'],
        defaultValue: 'Medium',
        description: {
          en: 'Control height and horizontal padding.',
          th: 'ขนาดความสูงและระยะขอบแนวนอนของปุ่ม',
        },
      },
      {
        name: 'State',
        values: ['Default', 'Hover', 'Pressed', 'Focus', 'Disabled'],
        defaultValue: 'Default',
        description: {
          en: 'Visual interaction state (design representation).',
          th: 'สถานะทางสายตาเมื่อโต้ตอบ',
        },
      },
    ],
    // Keep variant matrix crisp & under budget: omit Pressed on Small/Large non-primary if desired, or keep clean 5*3*5=75? Let's prune redundant Pressed on Secondary/Ghost Small to keep fast ~45 variants!
    excludeVariantMatches: [
      { Size: 'Small', State: 'Pressed' },
      { Size: 'Large', State: 'Pressed' },
    ],
    baseNode: {
      id: 'root',
      name: 'Button',
      kind: 'frame',
      layoutMode: 'HORIZONTAL',
      primaryAxisSizingMode: 'AUTO',
      counterAxisSizingMode: 'FIXED',
      primaryAxisAlignItems: 'CENTER',
      counterAxisAlignItems: 'CENTER',
      height: 36,
      paddingLeft: 16,
      paddingRight: 16,
      paddingTop: 8,
      paddingBottom: 8,
      itemSpacing: 8,
      cornerRadius: opts.sharpCornersByDefault ? 0 : 6,
      effectStyleLogicalId: 'effectstyle.shadow.xs',
      bindings: {
        fill: t.buttonPrimaryBg,
        cornerRadius: t.buttonRadius,
        height: t.controlMd,
        paddingX: t.space4,
        paddingY: t.space2,
        gap: t.space2,
        opacity: t.opacitySolid,
      },
      children: [
        {
          id: 'leading-icon',
          name: 'Leading Icon',
          kind: 'component-instance',
          visible: false,
          componentLogicalId: 'icon.plus',
          propertyRef: {
            visible: 'showLeadingIcon',
            mainComponent: 'leadingIcon',
          },
        },
        {
          id: 'label',
          name: 'Label',
          kind: 'text',
          characters: { en: 'Continue', th: 'ดำเนินการต่อ' },
          textStyleLogicalId: 'textstyle.label.md',
          fontWeight: 'Medium',
          fontSize: 14,
          lineHeightPx: 20,
          bindings: {
            textFill: t.buttonPrimaryFg,
          },
          propertyRef: {
            characters: 'label',
          },
        },
        {
          id: 'trailing-icon',
          name: 'Trailing Icon',
          kind: 'component-instance',
          visible: false,
          componentLogicalId: 'icon.chevron-down',
          propertyRef: {
            visible: 'showTrailingIcon',
            mainComponent: 'trailingIcon',
          },
        },
      ],
    },
    variantOverrides: [
      // Sizes
      {
        match: { Size: 'Small' },
        nodePatches: {
          root: {
            height: 32,
            paddingLeft: 12,
            paddingRight: 12,
            bindings: { height: t.controlSm, paddingX: t.space3, gap: t.space1_5 },
          },
          label: { textStyleLogicalId: 'textstyle.label.sm', fontSize: 12, lineHeightPx: 16 },
        },
      },
      {
        match: { Size: 'Large' },
        nodePatches: {
          root: {
            height: 40,
            paddingLeft: 20,
            paddingRight: 20,
            bindings: { height: t.controlLg, paddingX: t.space5, gap: t.space2 },
          },
        },
      },
      // Variants
      {
        match: { Variant: 'Secondary' },
        nodePatches: {
          root: { bindings: { fill: t.buttonSecondaryBg }, effectStyleLogicalId: null },
          label: { bindings: { textFill: t.textPrimary } },
        },
      },
      {
        match: { Variant: 'Outline' },
        nodePatches: {
          root: {
            strokeWeight: 1,
            bindings: { fill: t.surfaceCard, stroke: t.borderDefault, strokeWeight: t.border1 },
          },
          label: { bindings: { textFill: t.textPrimary } },
        },
      },
      {
        match: { Variant: 'Ghost' },
        nodePatches: {
          root: {
            transparentFill: true,
            clearBindings: ['fill'],
            effectStyleLogicalId: null,
          },
          label: { bindings: { textFill: t.textPrimary } },
        },
      },
      {
        match: { Variant: 'Destructive' },
        nodePatches: {
          root: { bindings: { fill: t.destructiveBg } },
          label: { bindings: { textFill: t.destructiveFg } },
        },
      },
      // States
      {
        match: { Variant: 'Primary', State: 'Hover' },
        nodePatches: { root: { bindings: { fill: t.buttonPrimaryHover } } },
      },
      {
        match: { Variant: 'Primary', State: 'Pressed' },
        nodePatches: { root: { bindings: { fill: t.buttonPrimaryPressed } } },
      },
      {
        match: { Variant: 'Secondary', State: 'Hover' },
        nodePatches: { root: { bindings: { fill: t.actionSecondaryHover } } },
      },
      {
        match: { Variant: 'Outline', State: 'Hover' },
        nodePatches: { root: { bindings: { fill: t.surfaceAccent } } },
      },
      {
        match: { Variant: 'Ghost', State: 'Hover' },
        nodePatches: { root: { transparentFill: false, bindings: { fill: t.surfaceAccent } } },
      },
      {
        match: { State: 'Focus' },
        nodePatches: {
          root: {
            strokeWeight: 2,
            bindings: { stroke: t.borderFocus, strokeWeight: t.border2 },
            effectStyleLogicalId: 'effectstyle.focus.ring',
          },
        },
      },
      {
        match: { State: 'Disabled' },
        nodePatches: {
          root: {
            opacity: 0.5,
            bindings: { opacity: t.opacityDisabled },
            effectStyleLogicalId: null,
          },
        },
      },
    ],
    nonBindableExceptions: [],
    contrastPairs: [
      {
        id: 'button-primary-text',
        label: 'Primary Button Label vs Fill',
        foregroundTokenId: t.buttonPrimaryFg,
        backgroundTokenId: t.buttonPrimaryBg,
        minRatio: 4.5,
      },
      {
        id: 'button-secondary-text',
        label: 'Secondary Button Label vs Fill',
        foregroundTokenId: t.textPrimary,
        backgroundTokenId: t.buttonSecondaryBg,
        minRatio: 4.5,
      },
    ],
    documentation: {
      purpose: {
        en: `Triggers an immediate action, form submission, or workflow step using ${opts.libraryLabel} emphasis hierarchy.`,
        th: `ใช้เริ่มต้นคำสั่ง ส่งข้อมูลฟอร์ม หรือดำเนินการขั้นตอนสำคัญตามลำดับความสำคัญของ ${opts.libraryLabel}`,
      },
      usageScenarios: [
        {
          en: 'Primary CTA in forms, dialogs, and page headers (use one Primary button per view section).',
          th: 'ปุ่มคำสั่งหลักในฟอร์ม หน้าต่างโต้ตอบ และส่วนหัวของหน้า (ควรมี Primary เพียงปุ่มเดียวต่อส่วน)',
        },
        {
          en: 'Secondary or Outline buttons for cancel, filter, or auxiliary toolbar actions.',
          th: 'ใช้ Secondary หรือ Outline สำหรับปุ่มยกเลิก ตัวกรอง หรือคำสั่งเสริมบนแถบเครื่องมือ',
        },
      ],
      whenNotToUse: [
        {
          en: 'Do not use Button for in-sentence navigation to external URLs — use a semantic Link pattern instead.',
          th: 'ไม่ควรใช้ปุ่มแทนลิงก์แทรกในประโยคเพื่อเปิดหน้าเว็บภายนอก ควรใช้รูปแบบ Link แทน',
        },
      ],
      anatomy: [
        {
          nodeId: 'root',
          partName: { en: 'Container', th: 'กรอบปุ่ม (Container)' },
          roleDescription: {
            en: 'Horizontal Auto Layout frame bound to height, padding, radius, and semantic fill tokens.',
            th: 'เฟรม Auto Layout แนวนอนที่ผูกกับความสูง ระยะขอบ มุมโค้ง และตัวแปรสีพื้น',
          },
          required: true,
        },
        {
          nodeId: 'leading-icon',
          partName: { en: 'Leading Icon Slot', th: 'ช่องไอคอนด้านหน้า' },
          roleDescription: {
            en: 'Optional 16px swappable icon instance controlled by Boolean + Instance Swap properties.',
            th: 'ไอคอนขนาด 16px ที่เปิด/ปิดและสลับ Instance ได้ผ่าน Component Properties',
          },
          required: false,
        },
        {
          nodeId: 'label',
          partName: { en: 'Action Label', th: 'ป้ายข้อความคำสั่ง' },
          roleDescription: {
            en: 'Single-line action text bound to Label MD/SM typography and foreground token.',
            th: 'ข้อความคำสั่งบรรทัดเดียวที่ผูกกับสไตล์ตัวอักษรและสีตัวอักษร',
          },
          required: true,
        },
        {
          nodeId: 'trailing-icon',
          partName: { en: 'Trailing Icon Slot', th: 'ช่องไอคอนด้านหลัง' },
          roleDescription: {
            en: 'Optional trailing affordance icon such as chevron or directional indicator.',
            th: 'ไอคอนด้านหลังสำหรับบอกทิศทางหรือเมนูย่อย เช่น ลูกศรชี้ลง',
          },
          required: false,
        },
      ],
      stateMatrix: [
        {
          state: 'Default',
          visualSummary: { en: 'Resting fill and crisp label contrast.', th: 'สีพื้นเริ่มต้นและความคมชัดปกติ' },
          runtimeNote: { en: 'Ready for pointer or keyboard activation.', th: 'พร้อมรับการคลิกหรือกดปุ่มบนคีย์บอร์ด' },
        },
        {
          state: 'Hover',
          visualSummary: { en: 'Darkened/lightened brand step or accent surface.', th: 'ปรับระดับความเข้มสีพื้นเมื่อวางเมาส์' },
          runtimeNote: { en: 'Visual state preview; CSS :hover handles runtime.', th: 'ตัวอย่างหน้าตาในงานออกแบบ ส่วนโค้ดจริงควบคุมด้วย :hover' },
        },
        {
          state: 'Focus',
          visualSummary: { en: '2px focus border + Accessible Focus Ring effect.', th: 'แสดงขอบโฟกัส 2px พร้อมวงแหวน Focus Ring' },
          runtimeNote: { en: 'Represents :focus-visible keyboard navigation in web code.', th: 'แทนสถานะ :focus-visible เมื่อเลื่อนโฟกัสด้วยแป้นพิมพ์' },
        },
        {
          state: 'Disabled',
          visualSummary: { en: '50% opacity via disabled token, shadow removed.', th: 'ลดความทึบเหลือ 50% ผ่านตัวแปร opacity และตัดเงาออก' },
          runtimeNote: { en: 'Non-interactive; avoid relying solely on disabled buttons without explanation.', th: 'กดไม่ได้ ควรแจ้งเหตุผลหากผู้ใช้ต้องกรอกข้อมูลก่อน' },
        },
      ],
      examples: [
        {
          id: 'btn-primary-cta',
          title: { en: 'Primary Call to Action', th: 'ปุ่มคำสั่งหลัก' },
          description: { en: 'Standard medium primary button.', th: 'ปุ่มหลักขนาดมาตรฐาน' },
          variantProps: { Variant: 'Primary', Size: 'Medium', State: 'Default' },
          componentProps: { label: 'Save changes', showLeadingIcon: true },
        },
        {
          id: 'btn-outline-secondary',
          title: { en: 'Outline Secondary Action', th: 'ปุ่มขอบเส้นคำสั่งรอง' },
          description: { en: 'Pairs alongside Primary button in footers.', th: 'วางคู่กับปุ่มหลักในส่วนท้ายฟอร์มหรือหน้าต่าง' },
          variantProps: { Variant: 'Outline', Size: 'Medium', State: 'Default' },
          componentProps: { label: 'Cancel' },
        },
        {
          id: 'btn-destructive',
          title: { en: 'Destructive Confirmation', th: 'ปุ่มยืนยันการลบข้อมูล' },
          description: { en: 'Used inside confirmation dialogs for irreversible actions.', th: 'ใช้ในหน้าต่างยืนยันการลบที่ไม่สามารถย้อนกลับได้' },
          variantProps: { Variant: 'Destructive', Size: 'Medium', State: 'Default' },
          componentProps: { label: 'Delete project' },
        },
      ],
      doAndDont: [
        {
          kind: 'do',
          title: { en: 'Use concise action verbs (1–3 words)', th: 'ใช้คำกริยาสั้นกระชับชัดเจน (1–3 คำ)' },
          rationale: {
            en: 'Clear verbs like "Create token" or "บันทึกการตั้งค่า" help users predict outcomes.',
            th: 'ช่วยให้ผู้ใช้เข้าใจผลลัพธ์ทันทีและไม่ทำให้ปุ่มยาวเกินจำเป็น',
          },
          exampleVariantProps: { Variant: 'Primary', Size: 'Medium', State: 'Default' },
        },
        {
          kind: 'dont',
          title: { en: 'Do not place two Primary buttons side by side', th: 'ห้ามวางปุ่ม Primary สองปุ่มติดกัน' },
          rationale: {
            en: 'Pair Primary with Outline or Ghost to preserve visual hierarchy.',
            th: 'ควรจับคู่ปุ่ม Primary กับ Outline หรือ Ghost เพื่อให้ลำดับความสำคัญชัดเจน',
          },
          exampleVariantProps: { Variant: 'Destructive', Size: 'Medium', State: 'Default' },
        },
      ],
      accessibility: {
        labelGuidance: {
          en: 'Icon-only buttons in production code must provide aria-label.',
          th: 'หากใช้ปุ่มที่มีเฉพาะไอคอนในโค้ดจริง ต้องกำหนด aria-label เสมอ',
        },
        contrastNotes: {
          en: 'Primary foreground/background pair is checked against 4.5:1 WCAG AA in both Light and Dark modes.',
          th: 'ตรวจสอบอัตราส่วนความคมชัด 4.5:1 ตามเกณฑ์ WCAG AA ทั้งโหมดสว่างและมืด',
        },
        focusVisibility: {
          en: 'State=Focus demonstrates visible 2px ring separate from fill color.',
          th: 'สถานะ Focus แสดงวงแหวนชัดเจนแยกจากสีพื้นปุ่ม',
        },
        keyboardExpectations: {
          en: 'Activates on Enter and Space keys in runtime HTML <button>.',
          th: 'ในโค้ดจริงรองรับการกดด้วยปุ่ม Enter และ Space',
        },
      },
      responsiveGuidance: {
        en: 'Uses hug-contents width by default; set Horizontal Resizing = Fill Container on mobile stacked footers.',
        th: 'ค่าเริ่มต้นปรับความกว้างตามข้อความ สามารถเปลี่ยนเป็น Fill Container เมื่อเรียงซ้อนบนมือถือ',
      },
      contentGuidelines: {
        en: 'Use sentence case without trailing punctuation. Keep labels under 24 characters.',
        th: 'ภาษาไทยควรใช้คำกริยาตรงไปตรงมา เช่น "บันทึก", "สร้างโปรเจกต์" และเผื่อความสูงบรรทัดไม่ให้สระบน-ล่างถูกตัด',
      },
      sourceLinks: [{ label: `${opts.libraryLabel} Button`, url: `${opts.docsBaseUrl}/button` }],
      differencesFromSource: [
        {
          en: 'Hover, Pressed, and Focus states are modeled as static Figma Variants rather than CSS pseudo-classes.',
          th: 'จำลองสถานะ Hover, Pressed และ Focus เป็น Figma Variants แทน CSS pseudo-classes ของเว็บจริง',
        },
      ],
    },
  };

  // 2. INPUT (Technical Slice)
  const input: ComponentRecipe = {
    logicalId: 'input',
    name: 'Input',
    displayName: { en: 'Input', th: 'ช่องกรอกข้อความ (Input)' },
    tier: 'technical-slice',
    pageOrder: 2,
    dependencies: ['icon.search', 'icon.alert-circle', ...HELPER_ICON_IDS],
    properties: [
      {
        logicalKey: 'valueText',
        name: 'Text / Placeholder',
        type: 'TEXT',
        defaultValue: 'name@company.com',
        localizedDefaultText: { en: 'name@company.com', th: 'กรอกอีเมลของคุณ' },
        description: {
          en: 'Displayed input value or placeholder string.',
          th: 'ข้อความค่าที่กรอกหรือข้อความตัวอย่างในช่อง',
        },
      },
      {
        logicalKey: 'showLeadingIcon',
        name: 'Leading Icon',
        type: 'BOOLEAN',
        defaultValue: false,
        description: {
          en: 'Displays an icon before the text value.',
          th: 'แสดงไอคอนนำหน้าข้อความในช่องกรอก',
        },
      },
      {
        logicalKey: 'leadingIcon',
        name: 'Start Icon',
        type: 'INSTANCE_SWAP',
        defaultValue: 'icon.search',
        preferredInstanceLogicalIds: HELPER_ICON_IDS,
        description: {
          en: 'Swappable leading icon inside input.',
          th: 'สลับไอคอนด้านหน้าภายในช่อง Input',
        },
      },
      {
        logicalKey: 'showTrailingIcon',
        name: 'Trailing Icon',
        type: 'BOOLEAN',
        defaultValue: false,
        description: {
          en: 'Displays status or action icon on the right.',
          th: 'แสดงไอคอนสถานะหรือปุ่มย่อยด้านขวา',
        },
      },
      {
        logicalKey: 'trailingIcon',
        name: 'End Icon',
        type: 'INSTANCE_SWAP',
        defaultValue: 'icon.alert-circle',
        preferredInstanceLogicalIds: HELPER_ICON_IDS,
        description: {
          en: 'Swappable trailing icon inside input.',
          th: 'สลับไอคอนด้านหลังภายในช่อง Input',
        },
      },
    ],
    variantAxes: [
      {
        name: 'Size',
        values: ['Small', 'Medium', 'Large'],
        defaultValue: 'Medium',
        description: { en: 'Input field height.', th: 'ขนาดความสูงของช่องกรอกข้อมูล' },
      },
      {
        name: 'State',
        values: ['Default', 'Hover', 'Focus', 'Error', 'Disabled'],
        defaultValue: 'Default',
        description: { en: 'Validation and interaction state.', th: 'สถานะการโต้ตอบและตรวจสอบข้อมูล' },
      },
    ],
    baseNode: {
      id: 'root',
      name: 'Input',
      kind: 'frame',
      layoutMode: 'HORIZONTAL',
      primaryAxisSizingMode: 'FIXED',
      counterAxisSizingMode: 'FIXED',
      primaryAxisAlignItems: 'MIN',
      counterAxisAlignItems: 'CENTER',
      width: 260,
      height: 36,
      paddingLeft: 12,
      paddingRight: 12,
      paddingTop: 8,
      paddingBottom: 8,
      itemSpacing: 8,
      cornerRadius: opts.sharpCornersByDefault ? 0 : 6,
      strokeWeight: 1,
      effectStyleLogicalId: 'effectstyle.shadow.xs',
      bindings: {
        fill: t.inputBg,
        stroke: t.inputBorder,
        strokeWeight: t.border1,
        cornerRadius: t.inputRadius,
        height: t.controlMd,
        paddingX: t.space3,
        paddingY: t.space2,
        gap: t.space2,
        opacity: t.opacitySolid,
      },
      children: [
        {
          id: 'leading-icon',
          name: 'Leading Icon',
          kind: 'component-instance',
          visible: false,
          componentLogicalId: 'icon.search',
          propertyRef: { visible: 'showLeadingIcon', mainComponent: 'leadingIcon' },
        },
        {
          id: 'value',
          name: 'Value Text',
          kind: 'text',
          layoutGrow: 1,
          characters: { en: 'name@company.com', th: 'กรอกอีเมลของคุณ' },
          textStyleLogicalId: 'textstyle.body.md',
          fontSize: 14,
          lineHeightPx: 20,
          bindings: { textFill: t.textMuted },
          propertyRef: { characters: 'valueText' },
        },
        {
          id: 'trailing-icon',
          name: 'Trailing Icon',
          kind: 'component-instance',
          visible: false,
          componentLogicalId: 'icon.alert-circle',
          propertyRef: { visible: 'showTrailingIcon', mainComponent: 'trailingIcon' },
        },
      ],
    },
    variantOverrides: [
      {
        match: { Size: 'Small' },
        nodePatches: {
          root: { height: 32, bindings: { height: t.controlSm, paddingX: t.space2 } },
          value: { textStyleLogicalId: 'textstyle.body.sm', fontSize: 12, lineHeightPx: 18 },
        },
      },
      {
        match: { Size: 'Large' },
        nodePatches: {
          root: { height: 40, bindings: { height: t.controlLg, paddingX: t.space4 } },
        },
      },
      {
        match: { State: 'Hover' },
        nodePatches: {
          root: { bindings: { stroke: t.textMuted } },
        },
      },
      {
        match: { State: 'Focus' },
        nodePatches: {
          root: {
            strokeWeight: 2,
            bindings: { stroke: t.borderFocus, strokeWeight: t.border2 },
            effectStyleLogicalId: 'effectstyle.focus.ring',
          },
          value: { bindings: { textFill: t.textPrimary } },
        },
      },
      {
        match: { State: 'Error' },
        nodePatches: {
          root: {
            strokeWeight: 2,
            bindings: { stroke: t.destructiveBg, strokeWeight: t.border2 },
          },
          value: { bindings: { textFill: t.textPrimary } },
        },
      },
      {
        match: { State: 'Disabled' },
        nodePatches: {
          root: {
            opacity: 0.5,
            bindings: { fill: t.surfaceMuted, opacity: t.opacityDisabled },
            effectStyleLogicalId: null,
          },
        },
      },
    ],
    nonBindableExceptions: [],
    contrastPairs: [
      {
        id: 'input-value-text',
        label: 'Active Input Text vs Field Background',
        foregroundTokenId: t.textPrimary,
        backgroundTokenId: t.inputBg,
        minRatio: 4.5,
      },
    ],
    documentation: {
      purpose: {
        en: 'Single-line text field enabling users to enter or edit short freeform text, emails, numbers, or search queries.',
        th: 'ช่องกรอกข้อความบรรทัดเดียวสำหรับรับข้อมูลสั้น เช่น ชื่อ อีเมล ตัวเลข หรือคำค้นหา',
      },
      usageScenarios: [
        { en: 'Login credentials, profile settings, and search bars.', th: 'ฟอร์มเข้าสู่ระบบ หน้าตั้งค่าโปรไฟล์ และช่องค้นหาข้อมูล' },
      ],
      whenNotToUse: [
        { en: 'Use Textarea for multi-line paragraphs or Select for fixed option lists.', th: 'ใช้ Textarea หากเป็นข้อความหลายบรรทัด หรือใช้ Select เมื่อมีตัวเลือกตายตัว' },
      ],
      anatomy: [
        { nodeId: 'root', partName: { en: 'Field Container', th: 'กรอบช่องกรอกข้อมูล' }, roleDescription: { en: 'Bordered container bound to input background, border, and radius tokens.', th: 'เฟรมมีเส้นขอบผูกกับตัวแปรพื้นหลัง เส้นขอบ และมุมโค้ง' }, required: true },
        { nodeId: 'leading-icon', partName: { en: 'Leading Icon', th: 'ไอคอนนำหน้า' }, roleDescription: { en: 'Optional prefix icon such as Search.', th: 'ไอคอนด้านหน้า เช่น แว่นขยายค้นหา' }, required: false },
        { nodeId: 'value', partName: { en: 'Value / Placeholder', th: 'ข้อความหรือ Placeholder' }, roleDescription: { en: 'Flex-growing text slot supporting Thai and English copy.', th: 'พื้นที่ข้อความยืดหยุ่นรองรับทั้งภาษาไทยและอังกฤษ' }, required: true },
        { nodeId: 'trailing-icon', partName: { en: 'Trailing Icon', th: 'ไอคอนด้านท้าย' }, roleDescription: { en: 'Optional validation or clear indicator.', th: 'ไอคอนแสดงสถานะตรวจสอบหรือล้างข้อความ' }, required: false },
      ],
      stateMatrix: [
        { state: 'Default', visualSummary: { en: '1px input border with placeholder/value text.', th: 'เส้นขอบปกติ 1px พร้อมข้อความตัวอย่าง' }, runtimeNote: { en: 'Idle editable input.', th: 'พร้อมคลิกเพื่อพิมพ์ข้อมูล' } },
        { state: 'Focus', visualSummary: { en: '2px focus ring and primary foreground text.', th: 'เส้นขอบโฟกัส 2px พร้อมวงแหวนและข้อความสีเข้ม' }, runtimeNote: { en: 'Active caret in browser <input>.', th: 'แสดงเคอร์เซอร์พิมพ์ข้อความในเว็บจริง' } },
        { state: 'Error', visualSummary: { en: '2px destructive red border.', th: 'เส้นขอบสีแดงแจ้งเตือนข้อมูลไม่ถูกต้อง' }, runtimeNote: { en: 'Pair with visible error message text and aria-invalid="true".', th: 'ควรแสดงข้อความอธิบายข้อผิดพลาดใต้ช่องควบคู่กันเสมอ' } },
        { state: 'Disabled', visualSummary: { en: 'Muted surface and 50% opacity.', th: 'พื้นหลังสีเทาอ่อนและความทึบ 50%' }, runtimeNote: { en: 'Read-only/disabled in form state.', th: 'ปิดการแก้ไขข้อมูล' } },
      ],
      examples: [
        { id: 'input-default', title: { en: 'Standard Email Input', th: 'ช่องกรอกอีเมลมาตรฐาน' }, description: { en: 'Default resting state.', th: 'สถานะเริ่มต้นปกติ' }, variantProps: { Size: 'Medium', State: 'Default' }, componentProps: { valueText: 'alex@acme.io' } },
        { id: 'input-search', title: { en: 'Search Input with Icon', th: 'ช่องค้นหาพร้อมไอคอน' }, description: { en: 'Leading search icon enabled.', th: 'เปิดแสดงไอคอนค้นหาด้านหน้า' }, variantProps: { Size: 'Medium', State: 'Focus' }, componentProps: { valueText: 'Search components...', showLeadingIcon: true } },
        { id: 'input-error', title: { en: 'Validation Error State', th: 'สถานะข้อมูลไม่ถูกต้อง' }, description: { en: 'Highlights invalid input with trailing alert icon.', th: 'เน้นขอบสีแดงพร้อมไอคอนเตือนด้านท้าย' }, variantProps: { Size: 'Medium', State: 'Error' }, componentProps: { valueText: 'invalid-email@', showTrailingIcon: true } },
      ],
      doAndDont: [
        { kind: 'do', title: { en: 'Always pair with a visible label in forms', th: 'วางคู่กับป้ายชื่อช่อง (Label) ที่มองเห็นชัดเจนเสมอ' }, rationale: { en: 'Placeholders disappear once typing starts and fail as standalone labels.', th: 'Placeholder จะหายไปเมื่อเริ่มพิมพ์ จึงไม่ควรใช้แทนหัวข้อช่อง' }, exampleVariantProps: { Size: 'Medium', State: 'Default' } },
        { kind: 'dont', title: { en: 'Do not rely on red border color alone for errors', th: 'อย่าพึ่งเฉพาะสีขอบแดงอย่างเดียวเมื่อเกิด Error' }, rationale: { en: 'Include an icon or descriptive error caption below the field.', th: 'ควรมีไอคอนหรือข้อความระบุสาเหตุใต้ช่องเพื่อช่วยผู้ที่มีข้อจำกัดด้านการมองเห็นสี' }, exampleVariantProps: { Size: 'Medium', State: 'Error' } },
      ],
      accessibility: {
        labelGuidance: { en: 'Associate <label for="..."> with every <input>.', th: 'ผูก <label> เข้ากับช่องกรอกทุกช่องในโค้ดจริง' },
        contrastNotes: { en: 'Value text meets 4.5:1 AA against input surface.', th: 'ข้อความที่กรอกมีความคมชัดผ่านเกณฑ์ 4.5:1 บนพื้นช่อง' },
        focusVisibility: { en: 'High-visibility focus border + outer focus ring.', th: 'แสดงขอบและวงแหวนโฟกัสชัดเจนเมื่อเลื่อนด้วยปุ่ม Tab' },
        keyboardExpectations: { en: 'Standard text entry, Tab focus traversal.', th: 'รองรับการเลื่อนโฟกัสด้วยปุ่ม Tab และการพิมพ์มาตรฐาน' },
      },
      responsiveGuidance: { en: 'Set Horizontal Resizing to Fill Container inside form columns.', th: 'ตั้งค่าเป็น Fill Container เมื่อวางในคอลัมน์ของฟอร์มเพื่อให้ยืดตามความกว้างหน้าจอ' },
      contentGuidelines: { en: 'Write specific examples in placeholders (e.g., "081-234-5678").', th: 'ระบุตัวอย่างรูปแบบข้อมูลที่ชัดเจนใน Placeholder เช่น "เช่น สมชาย ใจดี"' },
      sourceLinks: [{ label: `${opts.libraryLabel} Input`, url: `${opts.docsBaseUrl}/input` }],
      differencesFromSource: [{ en: 'Text overflow and live cursor selection are runtime browser behaviors.', th: 'เคอร์เซอร์กะพริบและการเลื่อนข้อความยาวเป็นพฤติกรรมของเบราว์เซอร์ตอนรันจริง' }],
    },
  };

  // 3. CHECKBOX (Technical Slice)
  const checkbox: ComponentRecipe = {
    logicalId: 'checkbox',
    name: 'Checkbox',
    displayName: { en: 'Checkbox', th: 'กล่องตัวเลือก (Checkbox)' },
    tier: 'technical-slice',
    pageOrder: 3,
    dependencies: ['icon.check'],
    properties: [
      {
        logicalKey: 'label',
        name: 'Label',
        type: 'TEXT',
        defaultValue: 'Accept terms and privacy policy',
        localizedDefaultText: { en: 'Accept terms and privacy policy', th: 'ยอมรับเงื่อนไขการใช้งานและนโยบายความเป็นส่วนตัว' },
        description: { en: 'Primary checkbox label.', th: 'ข้อความหัวข้อตัวเลือก' },
      },
      {
        logicalKey: 'showLabel',
        name: 'Show Label',
        type: 'BOOLEAN',
        defaultValue: true,
        description: { en: 'Hides label for standalone table-row checkboxes.', th: 'ซ่อนข้อความเมื่อใช้ในตารางข้อมูล' },
      },
      {
        logicalKey: 'showDescription',
        name: 'Show Description',
        type: 'BOOLEAN',
        defaultValue: false,
        description: { en: 'Shows supporting helper text underneath label.', th: 'แสดงคำอธิบายเสริมใต้หัวข้อตัวเลือก' },
      },
      {
        logicalKey: 'descriptionText',
        name: 'Description',
        type: 'TEXT',
        defaultValue: 'You can update notification preferences at any time.',
        localizedDefaultText: {
          en: 'You can update notification preferences at any time.',
          th: 'คุณสามารถเปลี่ยนแปลงการตั้งค่าการแจ้งเตือนได้ตลอดเวลา',
        },
        description: { en: 'Optional secondary caption.', th: 'คำอธิบายเพิ่มเติมใต้ตัวเลือก' },
      },
    ],
    variantAxes: [
      {
        name: 'Checked',
        values: ['Unchecked', 'Checked', 'Indeterminate'],
        defaultValue: 'Unchecked',
        description: { en: 'Selection state of the checkbox box.', th: 'สถานะการเลือกของช่องสี่เหลี่ยม' },
      },
      {
        name: 'State',
        values: ['Default', 'Hover', 'Focus', 'Error', 'Disabled'],
        defaultValue: 'Default',
        description: { en: 'Visual interaction state.', th: 'สถานะการโต้ตอบทางสายตา' },
      },
    ],
    baseNode: {
      id: 'root',
      name: 'Checkbox',
      kind: 'frame',
      layoutMode: 'HORIZONTAL',
      primaryAxisSizingMode: 'AUTO',
      counterAxisSizingMode: 'AUTO',
      primaryAxisAlignItems: 'MIN',
      counterAxisAlignItems: 'MIN',
      itemSpacing: 10,
      transparentFill: true,
      bindings: { gap: t.space2, opacity: t.opacitySolid },
      children: [
        {
          id: 'box',
          name: 'Control Box',
          kind: 'frame',
          layoutMode: 'HORIZONTAL',
          primaryAxisSizingMode: 'FIXED',
          counterAxisSizingMode: 'FIXED',
          primaryAxisAlignItems: 'CENTER',
          counterAxisAlignItems: 'CENTER',
          width: 18,
          height: 18,
          cornerRadius: opts.sharpCornersByDefault ? 0 : 4,
          strokeWeight: 1,
          bindings: {
            fill: t.inputBg,
            stroke: t.borderInput,
            strokeWeight: t.border1,
            cornerRadius: t.radiusSm,
          },
          children: [
            {
              id: 'check-glyph',
              name: 'Checkmark',
              kind: 'component-instance',
              visible: false,
              componentLogicalId: 'icon.check',
            },
            {
              id: 'indeterminate-bar',
              name: 'Indeterminate Dash',
              kind: 'rectangle',
              visible: false,
              width: 10,
              height: 2,
              cornerRadius: 1,
              bindings: { fill: t.actionPrimaryFg },
            },
          ],
        },
        {
          id: 'text-group',
          name: 'Label Stack',
          kind: 'frame',
          layoutMode: 'VERTICAL',
          primaryAxisSizingMode: 'AUTO',
          counterAxisSizingMode: 'AUTO',
          itemSpacing: 2,
          transparentFill: true,
          propertyRef: { visible: 'showLabel' },
          children: [
            {
              id: 'label',
              name: 'Label',
              kind: 'text',
              characters: { en: 'Accept terms and privacy policy', th: 'ยอมรับเงื่อนไขการใช้งานและนโยบายความเป็นส่วนตัว' },
              textStyleLogicalId: 'textstyle.label.md',
              fontWeight: 'Medium',
              fontSize: 14,
              lineHeightPx: 20,
              bindings: { textFill: t.textPrimary },
              propertyRef: { characters: 'label' },
            },
            {
              id: 'description',
              name: 'Description',
              kind: 'text',
              visible: false,
              characters: {
                en: 'You can update notification preferences at any time.',
                th: 'คุณสามารถเปลี่ยนแปลงการตั้งค่าการแจ้งเตือนได้ตลอดเวลา',
              },
              textStyleLogicalId: 'textstyle.body.sm',
              fontSize: 12,
              lineHeightPx: 18,
              bindings: { textFill: t.textMuted },
              propertyRef: { visible: 'showDescription', characters: 'descriptionText' },
            },
          ],
        },
      ],
    },
    variantOverrides: [
      {
        match: { Checked: 'Checked' },
        nodePatches: {
          box: { bindings: { fill: t.actionPrimaryBg, stroke: t.actionPrimaryBg } },
          'check-glyph': { visible: true },
        },
      },
      {
        match: { Checked: 'Indeterminate' },
        nodePatches: {
          box: { bindings: { fill: t.actionPrimaryBg, stroke: t.actionPrimaryBg } },
          'indeterminate-bar': { visible: true },
        },
      },
      {
        match: { Checked: 'Unchecked', State: 'Hover' },
        nodePatches: { box: { bindings: { stroke: t.actionPrimaryBg } } },
      },
      {
        match: { Checked: 'Checked', State: 'Hover' },
        nodePatches: { box: { bindings: { fill: t.actionPrimaryHover, stroke: t.actionPrimaryHover } } },
      },
      {
        match: { State: 'Focus' },
        nodePatches: {
          box: {
            strokeWeight: 2,
            bindings: { stroke: t.borderFocus, strokeWeight: t.border2 },
            effectStyleLogicalId: 'effectstyle.focus.ring',
          },
        },
      },
      {
        match: { State: 'Error' },
        nodePatches: {
          box: { strokeWeight: 2, bindings: { stroke: t.destructiveBg, strokeWeight: t.border2 } },
        },
      },
      {
        match: { State: 'Disabled' },
        nodePatches: {
          root: { opacity: 0.5, bindings: { opacity: t.opacityDisabled } },
        },
      },
    ],
    nonBindableExceptions: [],
    contrastPairs: [
      {
        id: 'checkbox-label-canvas',
        label: 'Checkbox Label vs Surface',
        foregroundTokenId: t.textPrimary,
        backgroundTokenId: t.surfaceBackground,
        minRatio: 4.5,
      },
    ],
    documentation: {
      purpose: {
        en: 'Lets users toggle one or more independent boolean options or select rows in bulk.',
        th: 'ใช้เลือกหรือยกเลิกตัวเลือกอิสระหนึ่งรายการขึ้นไป รวมถึงการเลือกแถวข้อมูลแบบกลุ่ม',
      },
      usageScenarios: [
        { en: 'Multi-select filter facets, consent checkboxes, and data table batch selection.', th: 'ตัวกรองหลายรายการ การยืนยันข้อตกลง และการเลือกหลายแถวในตาราง' },
      ],
      whenNotToUse: [
        { en: 'Use Radio Group for mutually exclusive choices or Switch for instant live toggles.', th: 'ใช้ Radio Group เมื่อเลือกได้เพียงข้อเดียว หรือใช้ Switch เมื่อเปิด/ปิดที่มีผลทันที' },
      ],
      anatomy: [
        { nodeId: 'box', partName: { en: 'Checkbox Indicator', th: 'กรอบช่องเครื่องหมาย' }, roleDescription: { en: '18×18px indicator supporting Unchecked, Checked, and Indeterminate.', th: 'กล่องขนาด 18×18px รองรับสถานะว่าง เลือกแล้ว และเลือกบางส่วน' }, required: true },
        { nodeId: 'label', partName: { en: 'Option Label', th: 'ข้อความตัวเลือก' }, roleDescription: { en: 'Clickable text label aligned with control box.', th: 'ข้อความอธิบายตัวเลือกที่วางคู่กับกล่อง' }, required: false },
        { nodeId: 'description', partName: { en: 'Helper Description', th: 'คำอธิบายเสริม' }, roleDescription: { en: 'Optional secondary guidance toggled via Boolean property.', th: 'ข้อความขยายความเพิ่มเติมที่เปิด/ปิดผ่าน Boolean property' }, required: false },
      ],
      stateMatrix: [
        { state: 'Default', visualSummary: { en: 'Clear border when unchecked; primary fill when checked.', th: 'ขอบชัดเมื่อยังไม่เลือก และเติมสีหลักเมื่อเลือกแล้ว' }, runtimeNote: { en: 'aria-checked="false" | "true" | "mixed".', th: 'สอดคล้องกับ aria-checked ในโค้ดจริง' } },
        { state: 'Focus', visualSummary: { en: 'Accessible focus ring around indicator box.', th: 'วงแหวนโฟกัสรอบกล่องสี่เหลี่ยม' }, runtimeNote: { en: 'Toggled via Space key.', th: 'กดสลับค่าด้วยปุ่ม Space' } },
        { state: 'Disabled', visualSummary: { en: '50% opacity across box and label.', th: 'ลดความทึบ 50% ทั้งกล่องและข้อความ' }, runtimeNote: { en: 'Non-interactive.', th: 'ไม่สามารถคลิกเปลี่ยนค่าได้' } },
      ],
      examples: [
        { id: 'chk-checked', title: { en: 'Checked with Description', th: 'สถานะเลือกพร้อมคำอธิบาย' }, description: { en: 'Shows primary indicator and helper subtext.', th: 'แสดงเครื่องหมายถูกพร้อมคำอธิบายย่อย' }, variantProps: { Checked: 'Checked', State: 'Default' }, componentProps: { showDescription: true } },
        { id: 'chk-indeterminate', title: { en: 'Indeterminate Parent Row', th: 'สถานะเลือกบางส่วน (Indeterminate)' }, description: { en: 'Used for "Select all" table headers when some rows are selected.', th: 'ใช้กับหัวตาราง "เลือกทั้งหมด" เมื่อมีการเลือกข้อมูลเพียงบางแถว' }, variantProps: { Checked: 'Indeterminate', State: 'Default' }, componentProps: { label: 'Select all 12 items' } },
      ],
      doAndDont: [
        { kind: 'do', title: { en: 'Phrase labels positively', th: 'เขียนข้อความตัวเลือกในเชิงบวกเข้าใจง่าย' }, rationale: { en: '"Send weekly summary" is clearer than "Do not disable summary".', th: 'หลีกเลี่ยงประโยคปฏิเสธซ้อนที่ทำให้ผู้ใช้สับสนว่าต้องติ๊กหรือไม่' }, exampleVariantProps: { Checked: 'Checked', State: 'Default' } },
        { kind: 'dont', title: { en: 'Do not use Checkbox when only one option may be chosen', th: 'ห้ามใช้ Checkbox เมื่ออนุญาตให้เลือกได้เพียงข้อเดียว' }, rationale: { en: 'Use Radio Group so exclusive behavior is obvious.', th: 'ควรใช้ Radio Group เพื่อให้ผู้ใช้ทราบทันทีว่าเลือกได้เพียงตัวเลือกเดียว' }, exampleVariantProps: { Checked: 'Unchecked', State: 'Default' } },
      ],
      accessibility: {
        labelGuidance: { en: 'Ensure standalone table checkboxes provide row-specific aria-label.', th: 'หากซ่อนข้อความในตาราง ต้องระบุ aria-label ประจำแถวในโค้ดจริง' },
        contrastNotes: { en: 'Checked fill and label contrast verified in Light/Dark modes.', th: 'ตรวจสอบความคมชัดทั้งโหมดสว่างและมืด' },
        focusVisibility: { en: 'Visible ring on control box.', th: 'แสดงวงแหวนโฟกัสรอบกล่องตัวเลือก' },
        keyboardExpectations: { en: 'Space toggles checked state.', th: 'กดปุ่ม Space เพื่อติ๊กเลือกหรือยกเลิก' },
      },
      responsiveGuidance: { en: 'Wrap multi-line labels cleanly while keeping indicator top-aligned.', th: 'จัดตำแหน่งกล่องชิดบน (Top-aligned) เมื่อข้อความยาวหลายบรรทัด' },
      contentGuidelines: { en: 'Keep primary option label concise; move caveats into Description.', th: 'เขียนหัวข้อให้กระชับ และแยกเงื่อนไขเพิ่มเติมไว้ในช่อง Description' },
      sourceLinks: [{ label: `${opts.libraryLabel} Checkbox`, url: `${opts.docsBaseUrl}/checkbox` }],
      differencesFromSource: [{ en: 'Checkmark animation is omitted in static design variants.', th: 'แอนิเมชันตอนติ๊กถูกเป็นพฤติกรรมฝั่งโค้ด ไม่ได้แสดงในเฟรมคงที่' }],
    },
  };

  // 4. TEXTAREA (Core)
  const textarea: ComponentRecipe = {
    logicalId: 'textarea',
    name: 'Textarea',
    displayName: { en: 'Textarea', th: 'กล่องข้อความหลายบรรทัด (Textarea)' },
    tier: 'core',
    pageOrder: 4,
    dependencies: [],
    properties: [
      {
        logicalKey: 'content',
        name: 'Value / Placeholder',
        type: 'TEXT',
        defaultValue: 'Write release notes or implementation context...',
        localizedDefaultText: {
          en: 'Write release notes or implementation context...',
          th: 'กรอกรายละเอียดเพิ่มเติมหรือบันทึกการใช้งาน...',
        },
        description: { en: 'Multi-line text content.', th: 'ข้อความหลายบรรทัดภายในกล่อง' },
      },
      {
        logicalKey: 'showHelper',
        name: 'Show Helper Count',
        type: 'BOOLEAN',
        defaultValue: true,
        description: { en: 'Toggles helper/character count row.', th: 'เปิด/ปิดบรรทัดข้อความช่วยเหลือด้านล่าง' },
      },
      {
        logicalKey: 'helperText',
        name: 'Helper Text',
        type: 'TEXT',
        defaultValue: '0 / 280 characters',
        localizedDefaultText: { en: '0 / 280 characters', th: 'สูงสุดไม่เกิน 280 ตัวอักษร' },
        description: { en: 'Footer helper caption.', th: 'คำแนะนำหรือจำนวนตัวอักษรด้านล่าง' },
      },
    ],
    variantAxes: [
      {
        name: 'State',
        values: ['Default', 'Hover', 'Focus', 'Error', 'Disabled'],
        defaultValue: 'Default',
        description: { en: 'Interaction and validation state.', th: 'สถานะการโต้ตอบและตรวจสอบความถูกต้อง' },
      },
    ],
    baseNode: {
      id: 'root',
      name: 'Textarea',
      kind: 'frame',
      layoutMode: 'VERTICAL',
      primaryAxisSizingMode: 'AUTO',
      counterAxisSizingMode: 'FIXED',
      width: 300,
      itemSpacing: 6,
      transparentFill: true,
      bindings: { gap: t.space1_5, opacity: t.opacitySolid },
      children: [
        {
          id: 'field',
          name: 'Field Surface',
          kind: 'frame',
          layoutMode: 'VERTICAL',
          primaryAxisSizingMode: 'FIXED',
          counterAxisSizingMode: 'FIXED',
          layoutAlign: 'STRETCH',
          width: 300,
          height: 88,
          paddingLeft: 12,
          paddingRight: 12,
          paddingTop: 10,
          paddingBottom: 10,
          cornerRadius: opts.sharpCornersByDefault ? 0 : 6,
          strokeWeight: 1,
          bindings: {
            fill: t.inputBg,
            stroke: t.inputBorder,
            strokeWeight: t.border1,
            cornerRadius: t.inputRadius,
            paddingX: t.space3,
            paddingY: t.space2,
          },
          children: [
            {
              id: 'content',
              name: 'Content Text',
              kind: 'text',
              layoutAlign: 'STRETCH',
              characters: {
                en: 'Write release notes or implementation context...',
                th: 'กรอกรายละเอียดเพิ่มเติมหรือบันทึกการใช้งาน...',
              },
              textStyleLogicalId: 'textstyle.body.md',
              fontSize: 14,
              lineHeightPx: 20,
              bindings: { textFill: t.textMuted },
              propertyRef: { characters: 'content' },
            },
          ],
        },
        {
          id: 'helper',
          name: 'Helper Caption',
          kind: 'text',
          characters: { en: '0 / 280 characters', th: 'สูงสุดไม่เกิน 280 ตัวอักษร' },
          textStyleLogicalId: 'textstyle.body.sm',
          fontSize: 12,
          lineHeightPx: 18,
          bindings: { textFill: t.textMuted },
          propertyRef: { visible: 'showHelper', characters: 'helperText' },
        },
      ],
    },
    variantOverrides: [
      { match: { State: 'Hover' }, nodePatches: { field: { bindings: { stroke: t.textMuted } } } },
      {
        match: { State: 'Focus' },
        nodePatches: {
          field: {
            strokeWeight: 2,
            bindings: { stroke: t.borderFocus, strokeWeight: t.border2 },
            effectStyleLogicalId: 'effectstyle.focus.ring',
          },
          content: { bindings: { textFill: t.textPrimary } },
        },
      },
      {
        match: { State: 'Error' },
        nodePatches: {
          field: { strokeWeight: 2, bindings: { stroke: t.destructiveBg, strokeWeight: t.border2 } },
          helper: { bindings: { textFill: t.destructiveBg } },
        },
      },
      {
        match: { State: 'Disabled' },
        nodePatches: {
          root: { opacity: 0.5, bindings: { opacity: t.opacityDisabled } },
          field: { bindings: { fill: t.surfaceMuted } },
        },
      },
    ],
    nonBindableExceptions: [],
    contrastPairs: [
      {
        id: 'textarea-text-bg',
        label: 'Textarea Content vs Field Background',
        foregroundTokenId: t.textPrimary,
        backgroundTokenId: t.inputBg,
        minRatio: 4.5,
      },
    ],
    documentation: {
      purpose: { en: 'Captures multi-line comments, descriptions, bios, or feedback.', th: 'ใช้รับข้อความยาวหลายบรรทัด เช่น ความคิดเห็น คำอธิบาย หรือหมายเหตุ' },
      usageScenarios: [{ en: 'Support ticket details, project descriptions, and review comments.', th: 'ฟอร์มแจ้งปัญหา คำอธิบายโปรเจกต์ และกล่องแสดงความคิดเห็น' }],
      whenNotToUse: [{ en: 'Use Input when answers are single-line values such as names or emails.', th: 'ใช้ Input ปกติหากข้อมูลเป็นบรรทัดเดียว เช่น ชื่อหรืออีเมล' }],
      anatomy: [
        { nodeId: 'field', partName: { en: 'Multi-line Box', th: 'กรอบข้อความหลายบรรทัด' }, roleDescription: { en: '88px min-height surface with border & focus tokens.', th: 'พื้นที่กรอกข้อความความสูงเริ่มต้น 88px ผูกกับตัวแปรสีพื้นและเส้นขอบ' }, required: true },
        { nodeId: 'content', partName: { en: 'Body Text', th: 'เนื้อหาข้อความ' }, roleDescription: { en: 'Multi-line wrapped text node.', th: 'ข้อความที่ตัดบรรทัดอัตโนมัติตามความกว้างกล่อง' }, required: true },
        { nodeId: 'helper', partName: { en: 'Helper / Counter', th: 'ข้อความแนะนำหรือตัวนับคำ' }, roleDescription: { en: 'Optional character limit or error hint.', th: 'บรรทัดแจ้งจำนวนตัวอักษรหรือคำแนะนำใต้กล่อง' }, required: false },
      ],
      stateMatrix: [
        { state: 'Default', visualSummary: { en: 'Resting input border.', th: 'เส้นขอบปกติ' }, runtimeNote: { en: 'Resizable vertically in HTML unless CSS resize:none.', th: 'ในเว็บจริงสามารถลากปรับความสูงได้ตามการตั้งค่า CSS' } },
        { state: 'Focus', visualSummary: { en: '2px focus ring and active ink.', th: 'แสดงวงแหวนโฟกัสและสีข้อความเข้ม' }, runtimeNote: { en: 'Enter inserts newline rather than submitting form.', th: 'การกดปุ่ม Enter จะเป็นการขึ้นบรรทัดใหม่' } },
        { state: 'Error', visualSummary: { en: 'Destructive border and red helper text.', th: 'เส้นขอบและข้อความช่วยเหลือเปลี่ยนเป็นสีแดง' }, runtimeNote: { en: 'Communicate character overflow or missing required field.', th: 'ใช้แจ้งเมื่อพิมพ์เกินจำนวนที่กำหนดหรือเว้นว่างข้อมูลสำคัญ' } },
      ],
      examples: [
        { id: 'ta-default', title: { en: 'Feedback Prompt', th: 'กล่องรับความคิดเห็น' }, description: { en: 'Default multi-line box with character count.', th: 'กล่องข้อความพร้อมตัวนับจำนวนตัวอักษร' }, variantProps: { State: 'Default' } },
        { id: 'ta-error', title: { en: 'Exceeded Character Limit', th: 'แจ้งเตือนพิมพ์เกินกำหนด' }, description: { en: 'Error state highlighting helper caption.', th: 'แสดงขอบสีแดงและข้อความเตือนด้านล่าง' }, variantProps: { State: 'Error' }, componentProps: { helperText: '294 / 280 characters (limit exceeded)' } },
      ],
      doAndDont: [
        { kind: 'do', title: { en: 'Size initial height proportional to expected response length', th: 'กำหนดความสูงเริ่มต้นให้เหมาะกับปริมาณข้อความที่คาดหวัง' }, rationale: { en: 'Reduces unnecessary scrolling while writing.', th: 'ช่วยให้ผู้ใช้อ่านทวนข้อความที่พิมพ์ได้สะดวกโดยไม่ต้องเลื่อนขึ้นลงบ่อย' }, exampleVariantProps: { State: 'Default' } },
        { kind: 'dont', title: { en: 'Do not truncate multi-line user input with ellipsis', th: 'ห้ามตัดข้อความของผู้ใช้ด้วยจุดไข่ปลา (...)' }, rationale: { en: 'Users must be able to review full multi-line text.', th: 'ผู้ใช้ต้องตรวจสอบเนื้อหาทั้งหมดที่พิมพ์ได้ครบถ้วน' }, exampleVariantProps: { State: 'Focus' } },
      ],
      accessibility: {
        labelGuidance: { en: 'Link helper/counter text via aria-describedby.', th: 'เชื่อมข้อความตัวนับคำเข้ากับกล่องด้วย aria-describedby' },
        contrastNotes: { en: 'Meets 4.5:1 text contrast in Light and Dark themes.', th: 'ผ่านเกณฑ์ความคมชัด 4.5:1 ทั้งโหมดสว่างและมืด' },
        focusVisibility: { en: '2px focus border + ring.', th: 'แสดงเส้นขอบโฟกัสชัดเจน' },
        keyboardExpectations: { en: 'Tab focuses field; Enter adds line break.', th: 'กด Tab เพื่อเข้าสู่ช่อง และกด Enter เพื่อขึ้นบรรทัดใหม่' },
      },
      responsiveGuidance: { en: 'Stretches full width of parent form container.', th: 'ปรับความกว้างเต็มพื้นที่คอลัมน์ของฟอร์มโดยอัตโนมัติ' },
      contentGuidelines: { en: 'State maximum character or word limits upfront in helper text.', th: 'แจ้งจำนวนตัวอักษรสูงสุดล่วงหน้าหากระบบมีข้อจำกัดความยาว' },
      sourceLinks: [{ label: `${opts.libraryLabel} Textarea`, url: `${opts.docsBaseUrl}/textarea` }],
      differencesFromSource: [{ en: 'Browser drag-resize handle is not rendered inside design frame.', th: 'ไม่แสดงมุมลากย่อขยายของเบราว์เซอร์ในคอมโพเนนต์ออกแบบ' }],
    },
  };

  // 5. RADIO GROUP ITEM (Core)
  const radioGroup: ComponentRecipe = {
    logicalId: 'radio-group',
    name: 'Radio Group',
    displayName: { en: 'Radio Group', th: 'ปุ่มตัวเลือกเดี่ยว (Radio Group)' },
    tier: 'core',
    pageOrder: 5,
    dependencies: [],
    properties: [
      {
        logicalKey: 'optionLabel',
        name: 'Option Label',
        type: 'TEXT',
        defaultValue: 'Standard delivery (2–3 business days)',
        localizedDefaultText: {
          en: 'Standard delivery (2–3 business days)',
          th: 'จัดส่งมาตรฐาน (2–3 วันทำการ)',
        },
        description: { en: 'Radio option title.', th: 'ชื่อตัวเลือกของปุ่ม Radio' },
      },
      {
        logicalKey: 'showDescription',
        name: 'Show Description',
        type: 'BOOLEAN',
        defaultValue: false,
        description: { en: 'Shows secondary option detail.', th: 'แสดงคำอธิบายย่อยใต้ตัวเลือก' },
      },
      {
        logicalKey: 'optionDescription',
        name: 'Description',
        type: 'TEXT',
        defaultValue: 'Included free with all team plans.',
        localizedDefaultText: {
          en: 'Included free with all team plans.',
          th: 'ไม่มีค่าใช้จ่ายเพิ่มเติมสำหรับแพ็กเกจทีม',
        },
        description: { en: 'Supporting option metadata.', th: 'รายละเอียดเสริมของตัวเลือก' },
      },
    ],
    variantAxes: [
      {
        name: 'Selected',
        values: ['False', 'True'],
        defaultValue: 'False',
        description: { en: 'Whether this option is currently active.', th: 'สถานะว่าตัวเลือกนี้ถูกเลือกอยู่หรือไม่' },
      },
      {
        name: 'State',
        values: ['Default', 'Hover', 'Focus', 'Disabled'],
        defaultValue: 'Default',
        description: { en: 'Visual interaction state.', th: 'สถานะการโต้ตอบทางสายตา' },
      },
    ],
    baseNode: {
      id: 'root',
      name: 'Radio Option',
      kind: 'frame',
      layoutMode: 'HORIZONTAL',
      primaryAxisSizingMode: 'AUTO',
      counterAxisSizingMode: 'AUTO',
      counterAxisAlignItems: 'MIN',
      itemSpacing: 10,
      transparentFill: true,
      bindings: { gap: t.space2, opacity: t.opacitySolid },
      children: [
        {
          id: 'circle',
          name: 'Radio Circle',
          kind: 'frame',
          layoutMode: 'HORIZONTAL',
          primaryAxisSizingMode: 'FIXED',
          counterAxisSizingMode: 'FIXED',
          primaryAxisAlignItems: 'CENTER',
          counterAxisAlignItems: 'CENTER',
          width: 18,
          height: 18,
          cornerRadius: 9999,
          strokeWeight: 1,
          bindings: {
            fill: t.inputBg,
            stroke: t.borderInput,
            strokeWeight: t.border1,
            cornerRadius: t.radiusFull,
          },
          children: [
            {
              id: 'dot',
              name: 'Inner Dot',
              kind: 'ellipse',
              visible: false,
              width: 8,
              height: 8,
              bindings: { fill: t.actionPrimaryBg },
            },
          ],
        },
        {
          id: 'copy',
          name: 'Option Copy',
          kind: 'frame',
          layoutMode: 'VERTICAL',
          primaryAxisSizingMode: 'AUTO',
          counterAxisSizingMode: 'AUTO',
          itemSpacing: 2,
          transparentFill: true,
          children: [
            {
              id: 'label',
              name: 'Option Label',
              kind: 'text',
              characters: {
                en: 'Standard delivery (2–3 business days)',
                th: 'จัดส่งมาตรฐาน (2–3 วันทำการ)',
              },
              textStyleLogicalId: 'textstyle.label.md',
              fontWeight: 'Medium',
              fontSize: 14,
              lineHeightPx: 20,
              bindings: { textFill: t.textPrimary },
              propertyRef: { characters: 'optionLabel' },
            },
            {
              id: 'desc',
              name: 'Option Description',
              kind: 'text',
              visible: false,
              characters: {
                en: 'Included free with all team plans.',
                th: 'ไม่มีค่าใช้จ่ายเพิ่มเติมสำหรับแพ็กเกจทีม',
              },
              textStyleLogicalId: 'textstyle.body.sm',
              fontSize: 12,
              lineHeightPx: 18,
              bindings: { textFill: t.textMuted },
              propertyRef: { visible: 'showDescription', characters: 'optionDescription' },
            },
          ],
        },
      ],
    },
    variantOverrides: [
      {
        match: { Selected: 'True' },
        nodePatches: {
          circle: { strokeWeight: 2, bindings: { stroke: t.actionPrimaryBg, strokeWeight: t.border2 } },
          dot: { visible: true },
        },
      },
      {
        match: { State: 'Hover' },
        nodePatches: { circle: { bindings: { stroke: t.actionPrimaryBg } } },
      },
      {
        match: { State: 'Focus' },
        nodePatches: {
          circle: {
            strokeWeight: 2,
            bindings: { stroke: t.borderFocus, strokeWeight: t.border2 },
            effectStyleLogicalId: 'effectstyle.focus.ring',
          },
        },
      },
      {
        match: { State: 'Disabled' },
        nodePatches: { root: { opacity: 0.5, bindings: { opacity: t.opacityDisabled } } },
      },
    ],
    nonBindableExceptions: [],
    contrastPairs: [
      {
        id: 'radio-label-surface',
        label: 'Radio Label vs Canvas',
        foregroundTokenId: t.textPrimary,
        backgroundTokenId: t.surfaceBackground,
        minRatio: 4.5,
      },
    ],
    documentation: {
      purpose: { en: 'Presents 2–5 mutually exclusive options where all choices benefit from immediate visibility.', th: 'แสดงตัวเลือก 2–5 ข้อที่เลือกได้เพียงข้อเดียว โดยเห็นตัวเลือกทั้งหมดพร้อมกันทันที' },
      usageScenarios: [{ en: 'Billing cadence, shipping tier, or access permission level.', th: 'รอบบิลรายเดือน/รายปี รูปแบบการจัดส่ง หรือระดับสิทธิ์ผู้ใช้งาน' }],
      whenNotToUse: [{ en: 'Use Select when there are more than 6 options, or Checkbox when multiple options apply.', th: 'ใช้ Select หากมีตัวเลือกมากกว่า 6 ข้อ หรือใช้ Checkbox หากเลือกได้หลายข้อพร้อมกัน' }],
      anatomy: [
        { nodeId: 'circle', partName: { en: 'Outer Ring', th: 'วงกลมด้านนอก' }, roleDescription: { en: '18px circular frame bound to input/brand border.', th: 'กรอบวงกลมขนาด 18px ผูกกับสีขอบช่องและสีหลัก' }, required: true },
        { nodeId: 'dot', partName: { en: 'Selection Dot', th: 'จุดแสดงการเลือก' }, roleDescription: { en: '8px inner brand dot visible when Selected=True.', th: 'จุดวงกลมด้านในขนาด 8px แสดงเมื่อถูกเลือก' }, required: true },
        { nodeId: 'label', partName: { en: 'Option Label', th: 'ข้อความตัวเลือก' }, roleDescription: { en: 'Primary label text.', th: 'ชื่อหลักของตัวเลือก' }, required: true },
      ],
      stateMatrix: [
        { state: 'Default', visualSummary: { en: 'Unselected neutral ring or Selected brand ring + inner dot.', th: 'วงแหวนปกติเมื่อยังไม่เลือก และแสดงจุดสีแบรนด์เมื่อเลือก' }, runtimeNote: { en: 'Grouped inside role="radiogroup".', th: 'จัดกลุ่มภายใต้ role="radiogroup" ในโค้ดจริง' } },
        { state: 'Focus', visualSummary: { en: 'Visible focus halo around radio circle.', th: 'แสดงวงแหวนโฟกัสรอบปุ่มกลม' }, runtimeNote: { en: 'Arrow keys move selection within group.', th: 'ใช้ปุ่มลูกศรขึ้น/ลงเพื่อเลื่อนเปลี่ยนตัวเลือกภายในกลุ่ม' } },
      ],
      examples: [
        { id: 'radio-selected', title: { en: 'Selected Plan Option', th: 'ตัวเลือกที่ถูกเลือกอยู่' }, description: { en: 'Active radio item with supporting description.', th: 'ตัวเลือกที่เปิดใช้งานพร้อมคำอธิบายเสริม' }, variantProps: { Selected: 'True', State: 'Default' }, componentProps: { showDescription: true } },
        { id: 'radio-unselected', title: { en: 'Unselected Option', th: 'ตัวเลือกที่ไม่ได้เลือก' }, description: { en: 'Sibling option in radio stack.', th: 'ตัวเลือกอื่นในกลุ่มเดียวกัน' }, variantProps: { Selected: 'False', State: 'Default' }, componentProps: { optionLabel: 'Express courier (Next day)' } },
      ],
      doAndDont: [
        { kind: 'do', title: { en: 'Pre-select a safe default option when appropriate', th: 'กำหนดค่าเริ่มต้นที่เหมาะสมและปลอดภัยไว้หนึ่งข้อ' }, rationale: { en: 'Speeds up completion and prevents accidental invalid states.', th: 'ช่วยลดขั้นตอนการกรอกและป้องกันสถานะค้างเมื่อผู้ใช้ต้องการใช้ค่ามาตรฐาน' }, exampleVariantProps: { Selected: 'True', State: 'Default' } },
        { kind: 'dont', title: { en: 'Do not lay out long radio labels horizontally', th: 'ห้ามเรียงตัวเลือกที่ข้อความยาวในแนวนอนต่อกัน' }, rationale: { en: 'Vertical stacking makes scanning which circle belongs to which label unambiguous.', th: 'การเรียงแนวตั้งช่วยให้ดูง่ายว่าปุ่มกลมคู่กับข้อความใดโดยไม่สับสน' }, exampleVariantProps: { Selected: 'False', State: 'Default' } },
      ],
      accessibility: {
        labelGuidance: { en: 'Wrap options in <fieldset> + <legend> or role="radiogroup" with aria-labelledby.', th: 'ครอบกลุ่มตัวเลือกด้วย fieldset/legend หรือ aria-labelledby' },
        contrastNotes: { en: '4.5:1 label contrast verified.', th: 'ผ่านเกณฑ์ความคมชัดข้อความ 4.5:1' },
        focusVisibility: { en: 'Focus ring on active radio item.', th: 'แสดงวงแหวนโฟกัสชัดเจน' },
        keyboardExpectations: { en: 'Tab enters group; Arrow keys change selected option.', th: 'กด Tab เพื่อเข้ากลุ่ม และใช้ปุ่มลูกศรเปลี่ยนตัวเลือก' },
      },
      responsiveGuidance: { en: 'Stack radio options vertically with 8–12px spacing.', th: 'เรียงซ้อนแนวตั้งโดยเว้นระยะห่าง 8–12px' },
      contentGuidelines: { en: 'Keep option labels parallel in grammatical structure.', th: 'เขียนตัวเลือกทุกข้อด้วยโครงสร้างคำที่สอดคล้องกัน' },
      sourceLinks: [{ label: `${opts.libraryLabel} Radio Group`, url: `${opts.docsBaseUrl}/radio-group` }],
      differencesFromSource: [{ en: 'Each instance represents a Radio item; stack multiple instances vertically to compose a group.', th: 'แต่ละ Instance แทนตัวเลือกย่อยหนึ่งข้อ นำมาวางเรียงใน Auto Layout แนวตั้งเพื่อสร้างกลุ่มตัวเลือก' }],
    },
  };

  // 6. SWITCH (Core)
  const switchComp: ComponentRecipe = {
    logicalId: 'switch',
    name: 'Switch',
    displayName: { en: 'Switch', th: 'สวิตช์เปิด-ปิด (Switch)' },
    tier: 'core',
    pageOrder: 6,
    dependencies: [],
    properties: [
      {
        logicalKey: 'label',
        name: 'Label',
        type: 'TEXT',
        defaultValue: 'Automatic dark mode sync',
        localizedDefaultText: { en: 'Automatic dark mode sync', th: 'ซิงก์โหมดมืดตามระบบอัตโนมัติ' },
        description: { en: 'Setting label next to switch.', th: 'ชื่อการตั้งค่าข้างสวิตช์' },
      },
      {
        logicalKey: 'showLabel',
        name: 'Show Label',
        type: 'BOOLEAN',
        defaultValue: true,
        description: { en: 'Toggle inline label visibility.', th: 'เปิด/ปิดป้ายข้อความด้านข้าง' },
      },
    ],
    variantAxes: [
      {
        name: 'Checked',
        values: ['Off', 'On'],
        defaultValue: 'Off',
        description: { en: 'Binary on/off state.', th: 'สถานะปิดหรือเปิดของสวิตช์' },
      },
      {
        name: 'Size',
        values: ['Small', 'Medium'],
        defaultValue: 'Medium',
        description: { en: 'Track dimensions.', th: 'ขนาดความกว้างและความสูงของรางสวิตช์' },
      },
      {
        name: 'State',
        values: ['Default', 'Hover', 'Focus', 'Disabled'],
        defaultValue: 'Default',
        description: { en: 'Visual interaction state.', th: 'สถานะการโต้ตอบทางสายตา' },
      },
    ],
    baseNode: {
      id: 'root',
      name: 'Switch',
      kind: 'frame',
      layoutMode: 'HORIZONTAL',
      primaryAxisSizingMode: 'AUTO',
      counterAxisSizingMode: 'AUTO',
      counterAxisAlignItems: 'CENTER',
      itemSpacing: 10,
      transparentFill: true,
      bindings: { gap: t.space2, opacity: t.opacitySolid },
      children: [
        {
          id: 'track',
          name: 'Switch Track',
          kind: 'frame',
          layoutMode: 'HORIZONTAL',
          primaryAxisSizingMode: 'FIXED',
          counterAxisSizingMode: 'FIXED',
          primaryAxisAlignItems: 'MIN',
          counterAxisAlignItems: 'CENTER',
          width: 40,
          height: 22,
          paddingLeft: 2,
          paddingRight: 2,
          paddingTop: 2,
          paddingBottom: 2,
          cornerRadius: 9999,
          bindings: {
            fill: t.surfaceMuted,
            cornerRadius: t.radiusFull,
          },
          children: [
            {
              id: 'thumb',
              name: 'Thumb',
              kind: 'ellipse',
              width: 18,
              height: 18,
              effectStyleLogicalId: 'effectstyle.shadow.xs',
              bindings: { fill: t.surfaceCard },
            },
          ],
        },
        {
          id: 'label',
          name: 'Label',
          kind: 'text',
          characters: { en: 'Automatic dark mode sync', th: 'ซิงก์โหมดมืดตามระบบอัตโนมัติ' },
          textStyleLogicalId: 'textstyle.label.md',
          fontWeight: 'Medium',
          fontSize: 14,
          lineHeightPx: 20,
          bindings: { textFill: t.textPrimary },
          propertyRef: { visible: 'showLabel', characters: 'label' },
        },
      ],
    },
    variantOverrides: [
      {
        match: { Checked: 'On' },
        nodePatches: {
          track: {
            primaryAxisAlignItems: 'MAX',
            bindings: { fill: t.actionPrimaryBg },
          },
          thumb: { bindings: { fill: t.actionPrimaryFg } },
        },
      },
      {
        match: { Size: 'Small' },
        nodePatches: {
          track: { width: 32, height: 18 },
          thumb: { width: 14, height: 14 },
          label: { textStyleLogicalId: 'textstyle.label.sm', fontSize: 12, lineHeightPx: 16 },
        },
      },
      {
        match: { Checked: 'On', State: 'Hover' },
        nodePatches: { track: { bindings: { fill: t.actionPrimaryHover } } },
      },
      {
        match: { State: 'Focus' },
        nodePatches: {
          track: {
            strokeWeight: 2,
            bindings: { stroke: t.borderFocus, strokeWeight: t.border2 },
            effectStyleLogicalId: 'effectstyle.focus.ring',
          },
        },
      },
      {
        match: { State: 'Disabled' },
        nodePatches: { root: { opacity: 0.5, bindings: { opacity: t.opacityDisabled } } },
      },
    ],
    nonBindableExceptions: [],
    contrastPairs: [
      {
        id: 'switch-label-canvas',
        label: 'Switch Label vs Canvas',
        foregroundTokenId: t.textPrimary,
        backgroundTokenId: t.surfaceBackground,
        minRatio: 4.5,
      },
    ],
    documentation: {
      purpose: { en: 'Toggles a single system preference between On and Off with immediate effect.', th: 'สลับเปิดหรือปิดการตั้งค่าเดี่ยวที่มีผลทำงานทันทีโดยไม่ต้องกดปุ่มบันทึก' },
      usageScenarios: [{ en: 'Settings panels, feature flags, and live notification toggles.', th: 'หน้าตั้งค่าระบบ การเปิดฟีเจอร์ และการแจ้งเตือน' }],
      whenNotToUse: [{ en: 'Use Checkbox inside forms that require clicking a Submit button before changes apply.', th: 'ใช้ Checkbox แทนหากอยู่ในฟอร์มที่ต้องกดปุ่มยืนยันหรือบันทึกก่อนจึงจะมีผล' }],
      anatomy: [
        { nodeId: 'track', partName: { en: 'Pill Track', th: 'รางสวิตช์ทรงแคปซูล' }, roleDescription: { en: 'Pill-shaped container shifting alignment from MIN (Off) to MAX (On).', th: 'รางโค้งมนที่เลื่อนปุ่มกลมจากซ้าย (Off) ไปขวา (On)' }, required: true },
        { nodeId: 'thumb', partName: { en: 'Sliding Thumb', th: 'ปุ่มกลมเลื่อน' }, roleDescription: { en: 'Circular thumb with subtle shadow.', th: 'ปุ่มกลมพร้อมเงาบางเพื่อแยกชั้นจากราง' }, required: true },
        { nodeId: 'label', partName: { en: 'Setting Label', th: 'ป้ายชื่อการตั้งค่า' }, roleDescription: { en: 'Describes the feature controlled by the switch.', th: 'ข้อความระบุชื่อฟีเจอร์ที่ควบคุมด้วยสวิตช์' }, required: false },
      ],
      stateMatrix: [
        { state: 'Default', visualSummary: { en: 'Muted track when Off; brand primary track when On.', th: 'รางสีเทาเมื่อปิด และเปลี่ยนเป็นสีหลักแบรนด์เมื่อเปิด' }, runtimeNote: { en: 'role="switch" aria-checked="true|false".', th: 'ใช้ role="switch" และ aria-checked ในโค้ดจริง' } },
        { state: 'Focus', visualSummary: { en: 'Focus ring around pill track.', th: 'วงแหวนโฟกัสรอบรางสวิตช์' }, runtimeNote: { en: 'Space or Enter toggles switch.', th: 'กดปุ่ม Space หรือ Enter เพื่อเปิด/ปิด' } },
      ],
      examples: [
        { id: 'sw-on', title: { en: 'Enabled Feature Toggle', th: 'สวิตช์สถานะเปิดใช้งาน' }, description: { en: 'Active switch in Medium size.', th: 'สวิตช์ขนาดมาตรฐานที่เปิดอยู่' }, variantProps: { Checked: 'On', Size: 'Medium', State: 'Default' } },
        { id: 'sw-off', title: { en: 'Compact Off Toggle', th: 'สวิตช์ขนาดเล็กสถานะปิด' }, description: { en: 'Small switch suitable for dense toolbars.', th: 'ขนาดกะทัดรัดเหมาะสำหรับแถบเครื่องมือ' }, variantProps: { Checked: 'Off', Size: 'Small', State: 'Default' } },
      ],
      doAndDont: [
        { kind: 'do', title: { en: 'Keep label text static regardless of On/Off state', th: 'ใช้ชื่อหัวข้อคงที่ ไม่เปลี่ยนข้อความไปมาตามสถานะเปิด/ปิด' }, rationale: { en: 'Prevents confusion about whether the label shows current state or target action.', th: 'ป้องกันความสับสนว่าข้อความหมายถึงสถานะปัจจุบันหรือสิ่งที่จะเกิดขึ้นเมื่อกด' }, exampleVariantProps: { Checked: 'On', Size: 'Medium', State: 'Default' } },
        { kind: 'dont', title: { en: 'Do not require a Save button for standalone Switches', th: 'อย่าใช้ Switch กับตัวเลือกที่ยังไม่มีผลจนกว่าจะกดบันทึก' }, rationale: { en: 'Switches imply instant physical activation.', th: 'ผู้ใช้คาดหวังว่าการสับสวิตช์จะมีผลทันทีเหมือนสวิตช์ไฟจริง' }, exampleVariantProps: { Checked: 'Off', Size: 'Medium', State: 'Default' } },
      ],
      accessibility: {
        labelGuidance: { en: 'Bind label via id/aria-labelledby on role="switch".', th: 'ผูกป้ายชื่อเข้ากับ role="switch" ด้วย aria-labelledby' },
        contrastNotes: { en: 'Thumb and track maintain clear position & contrast difference.', th: 'แยกสถานะเปิด/ปิดด้วยตำแหน่งปุ่มกลมควบคู่กับสี ไม่พึ่งสีเพียงอย่างเดียว' },
        focusVisibility: { en: 'Outer focus ring around track.', th: 'แสดงวงแหวนโฟกัสรอบราง' },
        keyboardExpectations: { en: 'Space toggles switch.', th: 'กด Space เพื่อสลับเปิด/ปิด' },
      },
      responsiveGuidance: { en: 'In Settings rows, place label on the left and standalone Switch (Show Label = false) on the right.', th: 'ในแถวหน้าตั้งค่า สามารถซ่อนข้อความของตัวสวิตช์แล้ววางชิดขวาคู่กับหัวข้อด้านซ้ายได้' },
      contentGuidelines: { en: 'Describe what is turned on (e.g., "Email notifications").', th: 'ระบุชื่อฟีเจอร์ตรงๆ เช่น "รับการแจ้งเตือนทางอีเมล"' },
      sourceLinks: [{ label: `${opts.libraryLabel} Switch`, url: `${opts.docsBaseUrl}/switch` }],
      differencesFromSource: [{ en: 'Thumb slide transition is a runtime CSS animation.', th: 'การเลื่อนปุ่มกลมแบบสมูทเป็นแอนิเมชันฝั่งโค้ด' }],
    },
  };

  // 7. SELECT (Core)
  const selectComp: ComponentRecipe = {
    logicalId: 'select',
    name: 'Select',
    displayName: { en: 'Select', th: 'เมนูเลือกข้อมูล (Select)' },
    tier: 'core',
    pageOrder: 7,
    dependencies: ['icon.chevron-down', 'icon.sparkles', ...HELPER_ICON_IDS],
    properties: [
      {
        logicalKey: 'selectedLabel',
        name: 'Selected Value',
        type: 'TEXT',
        defaultValue: 'Thailand (GMT+7)',
        localizedDefaultText: { en: 'Thailand (GMT+7)', th: 'ประเทศไทย (GMT+7)' },
        description: { en: 'Currently chosen option or placeholder.', th: 'ค่าตัวเลือกปัจจุบันหรือข้อความเริ่มต้น' },
      },
      {
        logicalKey: 'showLeadingIcon',
        name: 'Leading Icon',
        type: 'BOOLEAN',
        defaultValue: false,
        description: { en: 'Optional prefix icon.', th: 'เปิด/ปิดไอคอนด้านหน้า' },
      },
      {
        logicalKey: 'leadingIcon',
        name: 'Start Icon',
        type: 'INSTANCE_SWAP',
        defaultValue: 'icon.sparkles',
        preferredInstanceLogicalIds: HELPER_ICON_IDS,
        description: { en: 'Swappable prefix icon.', th: 'สลับไอคอนด้านหน้า' },
      },
    ],
    variantAxes: [
      {
        name: 'Size',
        values: ['Small', 'Medium', 'Large'],
        defaultValue: 'Medium',
        description: { en: 'Trigger control height.', th: 'ขนาดความสูงของปุ่มเลือก' },
      },
      {
        name: 'State',
        values: ['Default', 'Hover', 'Focus', 'Error', 'Disabled'],
        defaultValue: 'Default',
        description: { en: 'Trigger state.', th: 'สถานะของปุ่มเปิดเมนูตัวเลือก' },
      },
    ],
    baseNode: {
      id: 'root',
      name: 'Select Trigger',
      kind: 'frame',
      layoutMode: 'HORIZONTAL',
      primaryAxisSizingMode: 'FIXED',
      counterAxisSizingMode: 'FIXED',
      primaryAxisAlignItems: 'SPACE_BETWEEN',
      counterAxisAlignItems: 'CENTER',
      width: 240,
      height: 36,
      paddingLeft: 12,
      paddingRight: 12,
      paddingTop: 8,
      paddingBottom: 8,
      itemSpacing: 8,
      cornerRadius: opts.sharpCornersByDefault ? 0 : 6,
      strokeWeight: 1,
      effectStyleLogicalId: 'effectstyle.shadow.xs',
      bindings: {
        fill: t.inputBg,
        stroke: t.inputBorder,
        strokeWeight: t.border1,
        cornerRadius: t.inputRadius,
        height: t.controlMd,
        paddingX: t.space3,
        paddingY: t.space2,
        gap: t.space2,
        opacity: t.opacitySolid,
      },
      children: [
        {
          id: 'leading-icon',
          name: 'Leading Icon',
          kind: 'component-instance',
          visible: false,
          componentLogicalId: 'icon.sparkles',
          propertyRef: { visible: 'showLeadingIcon', mainComponent: 'leadingIcon' },
        },
        {
          id: 'value',
          name: 'Selected Value',
          kind: 'text',
          layoutGrow: 1,
          characters: { en: 'Thailand (GMT+7)', th: 'ประเทศไทย (GMT+7)' },
          textStyleLogicalId: 'textstyle.body.md',
          fontSize: 14,
          lineHeightPx: 20,
          bindings: { textFill: t.textPrimary },
          propertyRef: { characters: 'selectedLabel' },
        },
        {
          id: 'chevron',
          name: 'Chevron Indicator',
          kind: 'component-instance',
          componentLogicalId: 'icon.chevron-down',
        },
      ],
    },
    variantOverrides: [
      {
        match: { Size: 'Small' },
        nodePatches: {
          root: { height: 32, bindings: { height: t.controlSm, paddingX: t.space2 } },
          value: { textStyleLogicalId: 'textstyle.body.sm', fontSize: 12, lineHeightPx: 18 },
        },
      },
      {
        match: { Size: 'Large' },
        nodePatches: { root: { height: 40, bindings: { height: t.controlLg, paddingX: t.space4 } } },
      },
      { match: { State: 'Hover' }, nodePatches: { root: { bindings: { stroke: t.textMuted } } } },
      {
        match: { State: 'Focus' },
        nodePatches: {
          root: {
            strokeWeight: 2,
            bindings: { stroke: t.borderFocus, strokeWeight: t.border2 },
            effectStyleLogicalId: 'effectstyle.focus.ring',
          },
        },
      },
      {
        match: { State: 'Error' },
        nodePatches: {
          root: { strokeWeight: 2, bindings: { stroke: t.destructiveBg, strokeWeight: t.border2 } },
        },
      },
      {
        match: { State: 'Disabled' },
        nodePatches: {
          root: {
            opacity: 0.5,
            bindings: { fill: t.surfaceMuted, opacity: t.opacityDisabled },
            effectStyleLogicalId: null,
          },
        },
      },
    ],
    nonBindableExceptions: [],
    contrastPairs: [
      {
        id: 'select-value-bg',
        label: 'Select Value Text vs Trigger Fill',
        foregroundTokenId: t.textPrimary,
        backgroundTokenId: t.inputBg,
        minRatio: 4.5,
      },
    ],
    documentation: {
      purpose: { en: 'Compact trigger button that opens a single-choice listbox popover.', th: 'ปุ่มเลือกค่าจากรายการตัวเลือกแบบดรอปดาวน์เมื่อมีตัวเลือกจำนวนมาก' },
      usageScenarios: [{ en: 'Country/timezone pickers, sort order selectors, and role assignment.', th: 'การเลือกประเทศ โซนเวลา การเรียงลำดับข้อมูล หรือบทบาทสมาชิก' }],
      whenNotToUse: [{ en: 'Prefer Radio Group when there are 2–4 options and vertical space allows.', th: 'หากมีตัวเลือกเพียง 2–4 ข้อและพื้นที่พอ ควรใช้ Radio Group เพื่อลดการคลิก' }],
      anatomy: [
        { nodeId: 'root', partName: { en: 'Select Trigger', th: 'กรอบปุ่มตัวเลือก' }, roleDescription: { en: 'Input-styled trigger frame.', th: 'เฟรมลักษณะเดียวกับช่อง Input เพื่อให้เข้าชุดในฟอร์ม' }, required: true },
        { nodeId: 'value', partName: { en: 'Selected Text', th: 'ข้อความค่าที่เลือก' }, roleDescription: { en: 'Displays active selection.', th: 'แสดงชื่อรายการที่เลือกไว้ปัจจุบัน' }, required: true },
        { nodeId: 'chevron', partName: { en: 'Disclosure Chevron', th: 'ไอคอนลูกศรชี้ลง' }, roleDescription: { en: 'Signals popup menu affordance.', th: 'บ่งบอกว่าคลิกเพื่อเปิดรายการตัวเลือกย่อยได้' }, required: true },
      ],
      stateMatrix: [
        { state: 'Default', visualSummary: { en: 'Closed trigger showing current option.', th: 'แสดงค่าที่เลือกในสถานะปิดเมนู' }, runtimeNote: { en: 'aria-expanded="false".', th: 'aria-expanded="false"' } },
        { state: 'Focus', visualSummary: { en: 'Focus ring indicating keyboard/open state.', th: 'แสดงวงแหวนโฟกัสเมื่อเลือกใช้งาน' }, runtimeNote: { en: 'Enter, Space, or ArrowDown opens listbox.', th: 'กด Enter, Space หรือลูกศรลงเพื่อเปิดรายการ' } },
      ],
      examples: [
        { id: 'sel-default', title: { en: 'Timezone Selector', th: 'ตัวเลือกโซนเวลา' }, description: { en: 'Default closed select trigger.', th: 'ปุ่มตัวเลือกในสถานะปกติ' }, variantProps: { Size: 'Medium', State: 'Default' } },
        { id: 'sel-focus', title: { en: 'Focused Filter Select', th: 'ตัวเลือกสถานะโฟกัสพร้อมไอคอน' }, description: { en: 'With leading icon enabled.', th: 'เปิดไอคอนนำหน้าพร้อมวงแหวนโฟกัส' }, variantProps: { Size: 'Small', State: 'Focus' }, componentProps: { showLeadingIcon: true, selectedLabel: 'Status: Active' } },
      ],
      doAndDont: [
        { kind: 'do', title: { en: 'Order options logically (alphabetical, frequency, or numeric)', th: 'เรียงลำดับรายการอย่างมีเหตุผล เช่น ตามตัวอักษรหรือความถี่ใช้งาน' }, rationale: { en: 'Helps users scan predictable lists quickly.', th: 'ช่วยให้ผู้ใช้กวาดสายตาหาตัวเลือกที่ต้องการได้เร็ว' }, exampleVariantProps: { Size: 'Medium', State: 'Default' } },
        { kind: 'dont', title: { en: 'Do not use Select for binary Yes/No choices', th: 'อย่าใช้ Select กับคำถามที่มีแค่ ใช่/ไม่ใช่' }, rationale: { en: 'Checkbox or Switch requires one click instead of two.', th: 'การใช้ Checkbox หรือ Switch ใช้การคลิกเพียงครั้งเดียว' }, exampleVariantProps: { Size: 'Medium', State: 'Error' } },
      ],
      accessibility: {
        labelGuidance: { en: 'Provide visible <label> or aria-label for toolbar filter selects.', th: 'มีป้ายชื่อชัดเจน หรือระบุ aria-label หากวางบนแถบเครื่องมือ' },
        contrastNotes: { en: '4.5:1 text contrast on input surface.', th: 'ข้อความคมชัดไม่ต่ำกว่า 4.5:1' },
        focusVisibility: { en: '2px focus border + ring.', th: 'แสดงขอบโฟกัสชัดเจน' },
        keyboardExpectations: { en: 'Arrow keys navigate options; Escape closes menu.', th: 'เลื่อนด้วยปุ่มลูกศรและกด Escape เพื่อปิดเมนู' },
      },
      responsiveGuidance: { en: 'Matches adjacent Input height and Fill Container behavior in forms.', th: 'มีความสูงเท่ากับช่อง Input ทำให้วางเรียงในแถวเดียวกันได้สมดุล' },
      contentGuidelines: { en: 'Use "Select <noun>..." when no default value applies.', th: 'ใช้ข้อความเช่น "เลือกหมวดหมู่..." เมื่อยังไม่มีค่าเริ่มต้น' },
      sourceLinks: [{ label: `${opts.libraryLabel} Select`, url: `${opts.docsBaseUrl}/select` }],
      differencesFromSource: [{ en: 'Floating portal menu list is separate from the trigger component.', th: 'เมนูรายการที่ลอยทับหน้าจอทำงานในชั้น Portal ตอนรันจริง' }],
    },
  };

  // 8. BADGE (Core)
  const badge: ComponentRecipe = {
    logicalId: 'badge',
    name: 'Badge',
    displayName: { en: 'Badge', th: 'ป้ายสถานะ (Badge)' },
    tier: 'core',
    pageOrder: 8,
    dependencies: [],
    properties: [
      {
        logicalKey: 'badgeText',
        name: 'Label',
        type: 'TEXT',
        defaultValue: 'Ready',
        localizedDefaultText: { en: 'Ready', th: 'พร้อมใช้งาน' },
        description: { en: 'Short status keyword or count.', th: 'คำระบุสถานะสั้นๆ หรือตัวเลขจำนวน' },
      },
      {
        logicalKey: 'showDot',
        name: 'Status Dot',
        type: 'BOOLEAN',
        defaultValue: false,
        description: { en: 'Displays a 6px status indicator dot.', th: 'แสดงจุดสีขนาด 6px หน้าข้อความ' },
      },
    ],
    variantAxes: [
      {
        name: 'Variant',
        values: ['Default', 'Secondary', 'Outline', 'Success', 'Destructive'],
        defaultValue: 'Default',
        description: { en: 'Semantic color tone of the badge.', th: 'โทนสีตามความหมายของสถานะ' },
      },
    ],
    baseNode: {
      id: 'root',
      name: 'Badge',
      kind: 'frame',
      layoutMode: 'HORIZONTAL',
      primaryAxisSizingMode: 'AUTO',
      counterAxisSizingMode: 'AUTO',
      primaryAxisAlignItems: 'CENTER',
      counterAxisAlignItems: 'CENTER',
      paddingLeft: 10,
      paddingRight: 10,
      paddingTop: 2,
      paddingBottom: 2,
      itemSpacing: 6,
      cornerRadius: opts.pillBadges !== false ? 9999 : 4,
      bindings: {
        fill: t.actionPrimaryBg,
        cornerRadius: badgeRadiusToken,
        paddingX: t.space2,
        gap: t.space1,
      },
      children: [
        {
          id: 'dot',
          name: 'Dot',
          kind: 'ellipse',
          visible: false,
          width: 6,
          height: 6,
          bindings: { fill: t.actionPrimaryFg },
          propertyRef: { visible: 'showDot' },
        },
        {
          id: 'label',
          name: 'Badge Label',
          kind: 'text',
          characters: { en: 'Ready', th: 'พร้อมใช้งาน' },
          textStyleLogicalId: 'textstyle.label.sm',
          fontWeight: 'Medium',
          fontSize: 12,
          lineHeightPx: 16,
          bindings: { textFill: t.actionPrimaryFg },
          propertyRef: { characters: 'badgeText' },
        },
      ],
    },
    variantOverrides: [
      {
        match: { Variant: 'Secondary' },
        nodePatches: {
          root: { bindings: { fill: t.actionSecondaryBg } },
          label: { bindings: { textFill: t.textPrimary } },
          dot: { bindings: { fill: t.textMuted } },
        },
      },
      {
        match: { Variant: 'Outline' },
        nodePatches: {
          root: {
            strokeWeight: 1,
            bindings: { fill: t.surfaceCard, stroke: t.borderDefault, strokeWeight: t.border1 },
          },
          label: { bindings: { textFill: t.textPrimary } },
          dot: { bindings: { fill: t.actionPrimaryBg } },
        },
      },
      {
        match: { Variant: 'Success' },
        nodePatches: {
          root: {
            strokeWeight: 1,
            bindings: { fill: t.successSubtle, stroke: t.successBg, strokeWeight: t.border1 },
          },
          label: { bindings: { textFill: t.textPrimary } },
          dot: { bindings: { fill: t.successBg } },
        },
      },
      {
        match: { Variant: 'Destructive' },
        nodePatches: {
          root: { bindings: { fill: t.destructiveBg } },
          label: { bindings: { textFill: t.destructiveFg } },
          dot: { bindings: { fill: t.destructiveFg } },
        },
      },
    ],
    nonBindableExceptions: [],
    contrastPairs: [
      {
        id: 'badge-default-contrast',
        label: 'Default Badge Text vs Primary Fill',
        foregroundTokenId: t.actionPrimaryFg,
        backgroundTokenId: t.actionPrimaryBg,
        minRatio: 4.5,
      },
      {
        id: 'badge-secondary-contrast',
        label: 'Secondary Badge Text vs Secondary Fill',
        foregroundTokenId: t.textPrimary,
        backgroundTokenId: t.actionSecondaryBg,
        minRatio: 4.5,
      },
    ],
    documentation: {
      purpose: { en: 'Compact non-interactive label highlighting status, category, version, or count.', th: 'ป้ายขนาดเล็กสำหรับแสดงสถานะ หมวดหมู่ รุ่นเวอร์ชัน หรือจำนวนรายการ' },
      usageScenarios: [{ en: 'Release tags ("v0.1.0"), status pills ("Ready", "Beta"), and table row categories.', th: 'ป้ายบอกรุ่น ป้ายสถานะ Ready/Beta และหมวดหมู่ในตารางข้อมูล' }],
      whenNotToUse: [{ en: 'Do not use Badge as a clickable primary button — use Small Button instead.', th: 'ห้ามใช้ป้าย Badge แทนปุ่มกดคำสั่ง ควรใช้ Button ขนาด Small แทนหากต้องการให้ผู้ใช้คลิก' }],
      anatomy: [
        { nodeId: 'root', partName: { en: 'Pill Container', th: 'กรอบป้ายสถานะ' }, roleDescription: { en: 'Auto-sized pill or rounded tag.', th: 'กรอบขนาดกะทัดรัดปรับความกว้างตามคำอัตโนมัติ' }, required: true },
        { nodeId: 'dot', partName: { en: 'Status Dot', th: 'จุดสีบอกสถานะ' }, roleDescription: { en: 'Optional 6px indicator dot.', th: 'จุดกลมขนาด 6px ช่วยเน้นสถานะ' }, required: false },
        { nodeId: 'label', partName: { en: 'Badge Text', th: 'ข้อความบนป้าย' }, roleDescription: { en: '12px Medium label.', th: 'ตัวอักษรขนาด 12px น้ำหนัก Medium' }, required: true },
      ],
      stateMatrix: [
        { state: 'Static', visualSummary: { en: 'Five semantic variants adapting across Light & Dark modes.', th: '5 โทนสีตามความหมายที่เปลี่ยนตามโหมดสว่างและมืดอัตโนมัติ' }, runtimeNote: { en: 'Read-only status metadata.', th: 'เป็นองค์ประกอบแสดงข้อมูล ไม่รับโฟกัสคีย์บอร์ด' } },
      ],
      examples: [
        { id: 'bdg-ready', title: { en: 'Success Status Badge', th: 'ป้ายสถานะพร้อมใช้งาน' }, description: { en: 'With leading status dot.', th: 'เปิดจุดสีเขียวด้านหน้าข้อความ' }, variantProps: { Variant: 'Success' }, componentProps: { badgeText: 'Ready', showDot: true } },
        { id: 'bdg-version', title: { en: 'Version Outline Tag', th: 'ป้ายระบุเวอร์ชัน' }, description: { en: 'Subtle outline tag for metadata.', th: 'ป้ายขอบเส้นบางสำหรับข้อมูลรุ่น' }, variantProps: { Variant: 'Outline' }, componentProps: { badgeText: 'v2.3.0' } },
      ],
      doAndDont: [
        { kind: 'do', title: { en: 'Keep badge text to 1–2 words', th: 'ใช้คำสั้นกระชับเพียง 1–2 คำ' }, rationale: { en: 'Badges are meant to be scanned at a glance.', th: 'ป้ายสถานะควรอ่านเข้าใจได้ทันทีจากการกวาดสายตา' }, exampleVariantProps: { Variant: 'Default' } },
        { kind: 'dont', title: { en: 'Do not communicate status by dot color alone without text', th: 'อย่าแสดงเฉพาะจุดสีโดยไม่มีข้อความกำกับ' }, rationale: { en: 'Text ensures clarity for color-vision-deficient users.', th: 'ข้อความช่วยให้ทุกคนเข้าใจความหมายชัดเจนโดยไม่ต้องเดาจากสีอย่างเดียว' }, exampleVariantProps: { Variant: 'Destructive' } },
      ],
      accessibility: {
        labelGuidance: { en: 'Readable inline text requires no extra ARIA role.', th: 'ข้อความจริงภายในป้ายช่วยให้โปรแกรมอ่านหน้าจออ่านได้โดยตรง' },
        contrastNotes: { en: '4.5:1 AA contrast verified.', th: 'ผ่านเกณฑ์ความคมชัด 4.5:1' },
        focusVisibility: { en: 'Non-interactive element.', th: 'ไม่ได้รับโฟกัสเนื่องจากไม่ใช่ปุ่มโต้ตอบ' },
        keyboardExpectations: { en: 'None (informational).', th: 'ไม่มีการกดคีย์บอร์ด' },
      },
      responsiveGuidance: { en: 'Hugs text width; place inside wrapping horizontal stacks when multiple tags appear.', th: 'ปรับขนาดพอดีคำ ควรวางใน Auto Layout แบบ Wrap หากมีหลายป้ายเรียงกัน' },
      contentGuidelines: { en: 'Use title or sentence case consistently across all status badges.', th: 'ใช้คำนามหรือคำบอกสถานะรูปแบบเดียวกันทั้งระบบ เช่น "สำเร็จ", "รอดำเนินการ", "ล้มเหลว"' },
      sourceLinks: [{ label: `${opts.libraryLabel} Badge`, url: `${opts.docsBaseUrl}/badge` }],
      differencesFromSource: [{ en: 'Includes built-in Success variant with status dot for enterprise tables.', th: 'เพิ่มตัวเลือก Success พร้อมจุดสถานะสำหรับใช้งานในตารางข้อมูล' }],
    },
  };

  return [button, input, checkbox, textarea, radioGroup, switchComp, selectComp, badge];
}
