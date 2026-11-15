import type { PluginToUiMessage, UiToPluginMessage } from '@shared';

export interface FigmaMockOptions {
  fileName?: string;
  maxModesPerCollection?: number;
  availableFonts?: Array<{ family: string; style: string }>;
}

const DEFAULT_AVAILABLE_FONTS: Array<{ family: string; style: string }> = [
  { family: 'Inter', style: 'Regular' },
  { family: 'Inter', style: 'Medium' },
  { family: 'Inter', style: 'Semi Bold' },
  { family: 'Inter', style: 'Bold' },
  { family: 'Plus Jakarta Sans', style: 'Regular' },
  { family: 'Plus Jakarta Sans', style: 'Medium' },
  { family: 'Plus Jakarta Sans', style: 'SemiBold' },
  { family: 'Plus Jakarta Sans', style: 'Bold' },
  { family: 'Roboto', style: 'Regular' },
  { family: 'Roboto', style: 'Medium' },
  { family: 'Roboto', style: 'Bold' },
  { family: 'IBM Plex Sans', style: 'Regular' },
  { family: 'IBM Plex Sans', style: 'Medium' },
  { family: 'IBM Plex Sans', style: 'SemiBold' },
  { family: 'IBM Plex Sans', style: 'Bold' },
  { family: 'Noto Sans Thai', style: 'Regular' },
  { family: 'Noto Sans Thai', style: 'Medium' },
  { family: 'Noto Sans Thai', style: 'SemiBold' },
  { family: 'Noto Sans Thai', style: 'Bold' },
  { family: 'IBM Plex Sans Thai', style: 'Regular' },
  { family: 'IBM Plex Sans Thai', style: 'Medium' },
  { family: 'IBM Plex Sans Thai', style: 'SemiBold' },
  { family: 'IBM Plex Sans Thai', style: 'Bold' },
  { family: 'JetBrains Mono', style: 'Regular' },
  { family: 'Roboto Mono', style: 'Regular' },
  { family: 'IBM Plex Mono', style: 'Regular' },
];

export interface FigmaMockHarness {
  figma: PluginAPI;
  sentToUi: PluginToUiMessage[];
  sendUiMessage: (msg: UiToPluginMessage | unknown) => Promise<void>;
  getStats: () => {
    pages: number;
    collections: number;
    variables: number;
    textStyles: number;
    effectStyles: number;
    componentSets: number;
    standaloneComponents: number;
    totalNodes: number;
    windowSize: { width: number; height: number };
  };
  installGlobals: () => void;
}

export function createFigmaMock(options: FigmaMockOptions = {}): FigmaMockHarness {
  let idCounter = 1;
  const nextId = (prefix: string) => `${prefix}:${idCounter++}`;
  const maxModes = options.maxModesPerCollection ?? 4;
  const availableFonts = options.availableFonts ?? DEFAULT_AVAILABLE_FONTS;
  const loadedFonts = new Set<string>();
  const mixedSymbol = Symbol('figma.mixed');

  const nodesById = new Map<string, MockBaseNode>();
  const collections = new Map<string, MockVariableCollection>();
  const variables = new Map<string, MockVariable>();
  const textStyles = new Map<string, MockTextStyle>();
  const effectStyles = new Map<string, MockEffectStyle>();

  const sentToUi: PluginToUiMessage[] = [];
  let windowSize = { width: 840, height: 680 };

  class MockPluginDataTarget {
    private pluginData = new Map<string, string>();

    getPluginData(key: string): string {
      return this.pluginData.get(key) ?? '';
    }

    setPluginData(key: string, value: string): void {
      if (value === '') {
        this.pluginData.delete(key);
      } else {
        this.pluginData.set(key, value);
      }
    }

    getPluginDataKeys(): string[] {
      return [...this.pluginData.keys()];
    }
  }

  class MockVariableCollection extends MockPluginDataTarget {
    readonly id: string;
    name: string;
    modes: Array<{ modeId: string; name: string }>;
    defaultModeId: string;
    variableIds: string[] = [];
    removed = false;

    constructor(name: string) {
      super();
      this.id = nextId('VariableCollectionId');
      this.name = name;
      const initialModeId = nextId('Mode');
      this.modes = [{ modeId: initialModeId, name: 'Mode 1' }];
      this.defaultModeId = initialModeId;
    }

    addMode(name: string): string {
      if (this.modes.length >= maxModes) {
        throw new Error(
          `Cannot add mode "${name}": collection "${this.name}" reached plan limit (${maxModes} mode).`,
        );
      }
      const modeId = nextId('Mode');
      this.modes.push({ modeId, name });
      return modeId;
    }

    renameMode(modeId: string, newName: string): void {
      const m = this.modes.find((x) => x.modeId === modeId);
      if (!m) throw new Error(`Mode ${modeId} not found in collection ${this.name}`);
      m.name = newName;
    }

    remove(): void {
      this.removed = true;
      for (const vId of [...this.variableIds]) {
        variables.delete(vId);
      }
      this.variableIds = [];
      collections.delete(this.id);
    }
  }

  const VALID_VARIABLE_NAME_RE = /^[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*$/;

  class MockVariable extends MockPluginDataTarget {
    readonly id: string;
    private _name = '';
    readonly variableCollectionId: string;
    readonly resolvedType: VariableResolvedDataType;
    description = '';
    private _scopes: VariableScope[] = ['ALL_SCOPES'];
    codeSyntax: Record<string, string> = {};
    valuesByMode: Record<string, VariableValue> = {};
    removed = false;

    get name(): string {
      return this._name;
    }

    set name(nextName: string) {
      if (!VALID_VARIABLE_NAME_RE.test(nextName)) {
        throw new Error(`in createVariable: invalid variable name "${nextName}"`);
      }
      this._name = nextName;
    }

    get scopes(): VariableScope[] {
      return this._scopes;
    }

    set scopes(nextScopes: VariableScope[]) {
      if (nextScopes.includes('ALL_SCOPES') && nextScopes.length > 1) {
        throw new Error('Figma Desktop error: ALL_SCOPES cannot be combined with specific VariableScopes.');
      }
      if (
        nextScopes.includes('ALL_FILLS') &&
        (nextScopes.includes('FRAME_FILL') ||
          nextScopes.includes('SHAPE_FILL') ||
          nextScopes.includes('TEXT_FILL'))
      ) {
        throw new Error(
          'Figma Desktop error: ALL_FILLS cannot be combined with FRAME_FILL, SHAPE_FILL, or TEXT_FILL.',
        );
      }
      this._scopes = [...nextScopes];
    }

    constructor(
      name: string,
      collection: MockVariableCollection,
      resolvedType: VariableResolvedDataType,
    ) {
      super();
      this.id = nextId('VariableId');
      this.name = name;
      this.variableCollectionId = collection.id;
      this.resolvedType = resolvedType;
      collection.variableIds.push(this.id);
    }

    setValueForMode(modeId: string, newValue: VariableValue): void {
      const col = collections.get(this.variableCollectionId);
      if (!col || !col.modes.some((m) => m.modeId === modeId)) {
        throw new Error(`Invalid modeId "${modeId}" on variable "${this.name}"`);
      }
      this.valuesByMode[modeId] = newValue;
    }

    setVariableCodeSyntax(platform: CodeSyntaxPlatform, value: string): void {
      this.codeSyntax[platform] = value;
    }

    remove(): void {
      this.removed = true;
      const col = collections.get(this.variableCollectionId);
      if (col) {
        col.variableIds = col.variableIds.filter((id) => id !== this.id);
      }
      variables.delete(this.id);
    }
  }

  class MockTextStyle extends MockPluginDataTarget {
    readonly id: string;
    readonly type = 'TEXT';
    name = '';
    description = '';
    fontName: FontName = { family: 'Inter', style: 'Regular' };
    fontSize = 14;
    lineHeight: LineHeight = { unit: 'AUTO' };
    letterSpacing: LetterSpacing = { unit: 'PIXELS', value: 0 };
    boundVariables: Record<string, VariableAlias> = {};

    setBoundVariable(field: string, variable: MockVariable): void {
      if (!variable || typeof variable !== 'object' || !('id' in variable)) {
        throw new Error('dynamic-page requires Variable object in style.setBoundVariable');
      }
      this.boundVariables[field] = { type: 'VARIABLE_ALIAS', id: variable.id };
    }

    remove(): void {
      textStyles.delete(this.id);
    }

    constructor() {
      super();
      this.id = nextId('S:text');
    }
  }

  class MockEffectStyle extends MockPluginDataTarget {
    readonly id: string;
    readonly type = 'EFFECT';
    name = '';
    description = '';
    effects: Effect[] = [];

    remove(): void {
      effectStyles.delete(this.id);
    }

    constructor() {
      super();
      this.id = nextId('S:effect');
    }
  }

  class MockBaseNode extends MockPluginDataTarget {
    readonly id: string;
    readonly type: string;
    name = '';
    parent: MockContainerNode | MockDocumentNode | MockPageNode | null = null;
    removed = false;

    constructor(type: string) {
      super();
      this.id = nextId(`N:${type}`);
      this.type = type;
      nodesById.set(this.id, this);
    }

    remove(): void {
      if (this.removed) return;
      if (this.type === 'PAGE' && rootNode.children.length <= 1) {
        throw new Error('Cannot remove the last remaining page in a Figma document.');
      }
      if (this.type === 'PAGE' && (activePage as MockBaseNode) === this) {
        throw new Error('Cannot remove figma.currentPage without switching active page first.');
      }
      this.removed = true;
      if (this.parent && 'children' in this.parent) {
        const idx = (this.parent.children as MockBaseNode[]).indexOf(this);
        if (idx >= 0) {
          (this.parent.children as MockBaseNode[]).splice(idx, 1);
        }
      }
      if ('children' in this && Array.isArray((this as unknown as { children: MockBaseNode[] }).children)) {
        for (const child of [...(this as unknown as { children: MockBaseNode[] }).children]) {
          child.remove();
        }
      }
      nodesById.delete(this.id);
    }
  }

  class MockSceneNode extends MockBaseNode {
    visible = true;
    locked = false;
    x = 0;
    y = 0;
    width = 100;
    height = 36;
    private _fills: Paint[] = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    private _strokes: Paint[] = [];
    strokeWeight = 0;
    strokeTopWeight = 0;
    strokeRightWeight = 0;
    strokeBottomWeight = 0;
    strokeLeftWeight = 0;
    dashPattern: ReadonlyArray<number> = [];
    strokeAlign: 'INSIDE' | 'OUTSIDE' | 'CENTER' = 'INSIDE';
    cornerRadius = 0;
    topLeftRadius = 0;
    topRightRadius = 0;
    bottomLeftRadius = 0;
    bottomRightRadius = 0;
    opacity = 1;
    effects: Effect[] = [];
    effectStyleId = '';
    layoutAlign: 'INHERIT' | 'STRETCH' | 'MIN' | 'CENTER' | 'MAX' = 'INHERIT';
    layoutGrow = 0;
    boundVariables: Record<string, unknown> = {};
    explicitVariableModes: Record<string, string> = {};
    componentPropertyReferences: Record<string, string> = {};

    get fills(): Paint[] {
      return this._fills;
    }

    set fills(val: Paint[]) {
      this._fills = val;
      const aliases = val
        .map((p) => (p as SolidPaint).boundVariables?.color)
        .filter((a): a is VariableAlias => Boolean(a));
      if (aliases.length > 0) {
        this.boundVariables.fills = aliases;
      } else {
        delete this.boundVariables.fills;
      }
    }

    get strokes(): Paint[] {
      return this._strokes;
    }

    set strokes(val: Paint[]) {
      this._strokes = val;
      const aliases = val
        .map((p) => (p as SolidPaint).boundVariables?.color)
        .filter((a): a is VariableAlias => Boolean(a));
      if (aliases.length > 0) {
        this.boundVariables.strokes = aliases;
      } else {
        delete this.boundVariables.strokes;
      }
    }

    resize(w: number, h: number): void {
      if (w < 0.01 || h < 0.01) {
        throw new Error(`Figma resize error: width (${w}) and height (${h}) must be >= 0.01`);
      }
      this.width = w;
      this.height = h;
    }

    resizeWithoutConstraints(w: number, h: number): void {
      if (w < 0.01 || h < 0.01) {
        throw new Error(
          `Figma resizeWithoutConstraints error: width (${w}) and height (${h}) must be >= 0.01`,
        );
      }
      this.width = w;
      this.height = h;
    }

    async setEffectStyleIdAsync(styleId: string): Promise<void> {
      this.effectStyleId = styleId;
    }

    setBoundVariable(field: string, variable: MockVariable | null): void {
      if (variable !== null && (typeof variable !== 'object' || !('id' in variable))) {
        throw new Error(
          `dynamic-page violation: node.setBoundVariable("${field}", ...) requires Variable object, got ${typeof variable}`,
        );
      }
      if (variable === null) {
        delete this.boundVariables[field];
      } else {
        this.boundVariables[field] = { type: 'VARIABLE_ALIAS', id: variable.id };
      }
    }

    setExplicitVariableModeForCollection(
      collection: MockVariableCollection,
      modeId: string,
    ): void {
      if (!collection || typeof collection !== 'object' || !('id' in collection)) {
        throw new Error(
          'dynamic-page violation: setExplicitVariableModeForCollection requires VariableCollection object, not string ID.',
        );
      }
      this.explicitVariableModes[collection.id] = modeId;
    }

    clearExplicitVariableModeForCollection(collection: MockVariableCollection): void {
      if (!collection || typeof collection !== 'object' || !('id' in collection)) {
        throw new Error(
          'dynamic-page violation: clearExplicitVariableModeForCollection requires VariableCollection object, not string ID.',
        );
      }
      delete this.explicitVariableModes[collection.id];
    }
  }

  class MockContainerNode extends MockSceneNode {
    children: MockSceneNode[] = [];
    // Matches real Figma Desktop default (`figma.createFrame()` / `figma.createComponent()` default to true)
    clipsContent = true;
    layoutMode: 'NONE' | 'HORIZONTAL' | 'VERTICAL' = 'NONE';
    layoutWrap: 'NO_WRAP' | 'WRAP' = 'NO_WRAP';
    primaryAxisSizingMode: 'FIXED' | 'AUTO' = 'AUTO';
    counterAxisSizingMode: 'FIXED' | 'AUTO' = 'AUTO';
    primaryAxisAlignItems: 'MIN' | 'MAX' | 'CENTER' | 'SPACE_BETWEEN' = 'MIN';
    counterAxisAlignItems: 'MIN' | 'MAX' | 'CENTER' | 'BASELINE' = 'MIN';
    paddingTop = 0;
    paddingRight = 0;
    paddingBottom = 0;
    paddingLeft = 0;
    itemSpacing = 0;
    counterAxisSpacing = 0;

    override resize(w: number, h: number): void {
      super.resize(w, h);
      if (this.layoutMode !== 'NONE') {
        this.primaryAxisSizingMode = 'FIXED';
        this.counterAxisSizingMode = 'FIXED';
      }
    }

    appendChild(child: MockSceneNode): void {
      if (child.parent && 'children' in child.parent) {
        const oldIdx = (child.parent.children as MockBaseNode[]).indexOf(child);
        if (oldIdx >= 0) (child.parent.children as MockBaseNode[]).splice(oldIdx, 1);
      }
      child.parent = this;
      this.children.push(child);
    }

    insertChild(index: number, child: MockSceneNode): void {
      if (child.parent && 'children' in child.parent) {
        const oldIdx = (child.parent.children as MockBaseNode[]).indexOf(child);
        if (oldIdx >= 0) (child.parent.children as MockBaseNode[]).splice(oldIdx, 1);
      }
      child.parent = this;
      const clamped = Math.max(0, Math.min(this.children.length, index));
      this.children.splice(clamped, 0, child);
    }
  }

  interface MockPropDef {
    type: ComponentPropertyType;
    defaultValue: string | boolean;
    variantOptions?: string[];
  }

  class MockComponentNode extends MockContainerNode {
    description = '';
    documentationLinks: DocumentationLink[] = [];
    componentPropertyDefinitions: Record<string, MockPropDef> = {};
    private propSeq = 1;

    constructor() {
      super('COMPONENT');
    }

    addComponentProperty(
      propertyName: string,
      type: ComponentPropertyType,
      defaultValue: string | boolean,
    ): string {
      if (this.parent && this.parent.type === 'COMPONENT_SET') {
        throw new Error('Cannot call addComponentProperty on a variant child inside a ComponentSet.');
      }
      const key =
        type === 'VARIANT' ? propertyName : `${propertyName}#${this.id}:${this.propSeq++}`;
      this.componentPropertyDefinitions[key] = { type, defaultValue };
      return key;
    }

    editComponentProperty(
      propertyName: string,
      newValue: { name?: string; defaultValue?: string | boolean },
    ): string {
      const existing = this.componentPropertyDefinitions[propertyName];
      if (!existing) throw new Error(`Component property "${propertyName}" does not exist.`);
      if (newValue.defaultValue !== undefined) {
        existing.defaultValue = newValue.defaultValue;
      }
      if (newValue.name && newValue.name !== propertyName.split('#')[0]) {
        const suffix = propertyName.includes('#') ? `#${propertyName.split('#')[1]}` : '';
        const updatedKey = `${newValue.name}${suffix}`;
        delete this.componentPropertyDefinitions[propertyName];
        this.componentPropertyDefinitions[updatedKey] = existing;
        return updatedKey;
      }
      return propertyName;
    }

    createInstance(): MockInstanceNode {
      return new MockInstanceNode(this);
    }
  }

  class MockComponentSetNode extends MockContainerNode {
    description = '';
    documentationLinks: DocumentationLink[] = [];
    componentPropertyDefinitions: Record<string, MockPropDef> = {};
    private propSeq = 1;

    constructor() {
      super('COMPONENT_SET');
    }

    get defaultVariant(): MockComponentNode {
      const first = this.children.find(
        (c): c is MockComponentNode => c.type === 'COMPONENT',
      );
      if (!first) throw new Error('ComponentSet has no variant children');
      return first;
    }

    addComponentProperty(
      propertyName: string,
      type: ComponentPropertyType,
      defaultValue: string | boolean,
    ): string {
      const key =
        type === 'VARIANT' ? propertyName : `${propertyName}#${this.id}:${this.propSeq++}`;
      this.componentPropertyDefinitions[key] = { type, defaultValue };
      return key;
    }

    editComponentProperty(
      propertyName: string,
      newValue: { name?: string; defaultValue?: string | boolean },
    ): string {
      const existing = this.componentPropertyDefinitions[propertyName];
      if (!existing) throw new Error(`Component property "${propertyName}" does not exist.`);
      if (newValue.defaultValue !== undefined) {
        existing.defaultValue = newValue.defaultValue;
      }
      return propertyName;
    }
  }

  class MockInstanceNode extends MockContainerNode {
    private mainComp: MockComponentNode;
    componentProperties: Record<
      string,
      { type: ComponentPropertyType; value: string | boolean }
    > = {};

    constructor(mainComp: MockComponentNode) {
      super('INSTANCE');
      this.mainComp = mainComp;
      this.name = mainComp.name;
      this.width = mainComp.width;
      this.height = mainComp.height;
      const owner =
        mainComp.parent && mainComp.parent.type === 'COMPONENT_SET'
          ? (mainComp.parent as MockComponentSetNode)
          : mainComp;
      for (const [k, def] of Object.entries(owner.componentPropertyDefinitions)) {
        this.componentProperties[k] = { type: def.type, value: def.defaultValue };
      }
    }

    async getMainComponentAsync(): Promise<MockComponentNode | null> {
      return this.mainComp.removed ? null : this.mainComp;
    }

    setProperties(props: Record<string, string | boolean>): void {
      for (const [k, val] of Object.entries(props)) {
        if (this.componentProperties[k]) {
          this.componentProperties[k].value = val;
        } else {
          this.componentProperties[k] = {
            type: typeof val === 'boolean' ? 'BOOLEAN' : 'TEXT',
            value: val,
          };
        }
      }
    }
  }

  class MockTextNode extends MockSceneNode {
    fontName: FontName | typeof mixedSymbol = { family: 'Inter', style: 'Regular' };
    fontSize = 14;
    lineHeight: LineHeight = { unit: 'AUTO' };
    letterSpacing: LetterSpacing = { unit: 'PIXELS', value: 0 };
    private _characters = '';
    textAlignHorizontal: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED' = 'LEFT';
    textAutoResize: 'NONE' | 'WIDTH_AND_HEIGHT' | 'HEIGHT' | 'TRUNCATE' = 'WIDTH_AND_HEIGHT';
    textStyleId = '';

    constructor() {
      super('TEXT');
    }

    get characters(): string {
      return this._characters;
    }

    set characters(val: string) {
      if (this.fontName === mixedSymbol) {
        throw new Error('Cannot set characters when fontName is figma.mixed without loading fonts');
      }
      const key = `${this.fontName.family}::${this.fontName.style}`;
      if (!loadedFonts.has(key)) {
        throw new Error(
          `Figma font error: must call figma.loadFontAsync({ family: "${this.fontName.family}", style: "${this.fontName.style}" }) before setting characters.`,
        );
      }
      this._characters = val;
      if (this.textAutoResize === 'WIDTH_AND_HEIGHT') {
        const lines = val.split('\n');
        const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
        this.width = Math.max(12, Math.ceil(longest * this.fontSize * 0.58));
        const lh =
          typeof this.lineHeight === 'object' && 'value' in this.lineHeight
            ? this.lineHeight.value
            : Math.ceil(this.fontSize * 1.4);
        this.height = Math.max(14, Math.ceil(lines.length * lh));
      }
    }

    async setTextStyleIdAsync(styleId: string): Promise<void> {
      const style = textStyles.get(styleId);
      if (!style) throw new Error(`TextStyle "${styleId}" does not exist.`);
      this.textStyleId = styleId;
      this.fontName = style.fontName;
      this.fontSize = style.fontSize;
    }
  }

  class MockPageNode extends MockBaseNode {
    children: MockSceneNode[] = [];
    selection: MockSceneNode[] = [];
    loaded = false;

    constructor(name = 'Page 1') {
      super('PAGE');
      this.name = name;
    }

    async loadAsync(): Promise<void> {
      this.loaded = true;
    }

    appendChild(child: MockSceneNode): void {
      if (child.parent && 'children' in child.parent) {
        const idx = (child.parent.children as MockBaseNode[]).indexOf(child);
        if (idx >= 0) (child.parent.children as MockBaseNode[]).splice(idx, 1);
      }
      child.parent = this;
      this.children.push(child);
    }

    insertChild(index: number, child: MockSceneNode): void {
      if (child.parent && 'children' in child.parent) {
        const idx = (child.parent.children as MockBaseNode[]).indexOf(child);
        if (idx >= 0) (child.parent.children as MockBaseNode[]).splice(idx, 1);
      }
      child.parent = this;
      const clamped = Math.max(0, Math.min(this.children.length, index));
      this.children.splice(clamped, 0, child);
    }
  }

  class MockDocumentNode extends MockBaseNode {
    children: MockPageNode[] = [];

    constructor(name: string) {
      super('DOCUMENT');
      this.name = name;
    }

    appendChild(page: MockPageNode): void {
      const existingIdx = this.children.indexOf(page);
      if (existingIdx >= 0) this.children.splice(existingIdx, 1);
      page.parent = this;
      this.children.push(page);
    }

    insertChild(index: number, page: MockPageNode): void {
      const existingIdx = this.children.indexOf(page);
      if (existingIdx >= 0) this.children.splice(existingIdx, 1);
      page.parent = this;
      const clamped = Math.max(0, Math.min(this.children.length, index));
      this.children.splice(clamped, 0, page);
    }
  }

  const rootNode = new MockDocumentNode(options.fileName ?? 'Acme Product Design');
  const initialPage = new MockPageNode('Page 1');
  initialPage.loaded = true;
  rootNode.appendChild(initialPage);
  let activePage: MockPageNode = initialPage;

  const uiBridge: {
    onmessage?: (pluginMessage: unknown) => void | Promise<void>;
    postMessage: (pluginMessage: unknown) => void;
    resize: (width: number, height: number) => void;
  } = {
    onmessage: undefined,
    postMessage(pluginMessage: unknown) {
      sentToUi.push(pluginMessage as PluginToUiMessage);
    },
    resize(width: number, height: number) {
      windowSize = { width, height };
    },
  };

  const mockFigma = {
    mixed: mixedSymbol,
    root: rootNode,
    get currentPage() {
      return activePage;
    },
    set currentPage(_p: MockPageNode) {
      throw new Error(
        'dynamic-page violation: synchronous figma.currentPage setter is forbidden; use await figma.setCurrentPageAsync(page).',
      );
    },
    async setCurrentPageAsync(page: MockPageNode): Promise<void> {
      await page.loadAsync();
      activePage = page;
    },
    showUI(_html: string, opts?: ShowUIOptions) {
      if (opts?.width && opts?.height) {
        windowSize = { width: opts.width, height: opts.height };
      }
    },
    ui: uiBridge,
    viewport: {
      scrollAndZoomIntoView(_nodes: ReadonlyArray<BaseNode>) {
        // no-op in headless test runtime
      },
    },
    async listAvailableFontsAsync() {
      return availableFonts.map((fontName) => ({ fontName }));
    },
    async loadFontAsync(fontName: FontName): Promise<void> {
      const exists = availableFonts.some(
        (f) => f.family === fontName.family && f.style === fontName.style,
      );
      if (!exists) {
        throw new Error(`Font "${fontName.family} ${fontName.style}" is not installed.`);
      }
      loadedFonts.add(`${fontName.family}::${fontName.style}`);
    },
    getNodeById(_id: string): never {
      throw new Error(
        'dynamic-page violation: synchronous figma.getNodeById is forbidden; use await figma.getNodeByIdAsync(id).',
      );
    },
    async getNodeByIdAsync(id: string): Promise<MockBaseNode | null> {
      return nodesById.get(id) ?? null;
    },
    createPage(): MockPageNode {
      const page = new MockPageNode('Page');
      rootNode.appendChild(page);
      return page;
    },
    createFrame(): MockContainerNode {
      const frame = new MockContainerNode('FRAME');
      activePage.appendChild(frame);
      return frame;
    },
    createComponent(): MockComponentNode {
      const comp = new MockComponentNode();
      activePage.appendChild(comp);
      return comp;
    },
    combineAsVariants(
      variants: ReadonlyArray<MockComponentNode>,
      parent: MockContainerNode | MockPageNode,
    ): MockComponentSetNode {
      if (variants.length === 0) {
        throw new Error('combineAsVariants requires at least 1 ComponentNode.');
      }
      const setNode = new MockComponentSetNode();
      parent.appendChild(setNode);

      // Parse variant axes from VariantName="Axis1=Val1, Axis2=Val2"
      const axisValues = new Map<string, Set<string>>();
      for (const v of variants) {
        setNode.appendChild(v);
        for (const part of v.name.split(',')) {
          const [axis, val] = part.split('=').map((s) => s.trim());
          if (axis && val) {
            if (!axisValues.has(axis)) axisValues.set(axis, new Set());
            axisValues.get(axis)!.add(val);
          }
        }
      }
      for (const [axis, vals] of axisValues.entries()) {
        const arr = [...vals];
        setNode.componentPropertyDefinitions[axis] = {
          type: 'VARIANT',
          defaultValue: arr[0],
          variantOptions: arr,
        };
      }
      return setNode;
    },
    createRectangle(): MockSceneNode {
      const rect = new MockSceneNode('RECTANGLE');
      activePage.appendChild(rect);
      return rect;
    },
    createEllipse(): MockSceneNode {
      const ellipse = new MockSceneNode('ELLIPSE');
      activePage.appendChild(ellipse);
      return ellipse;
    },
    createText(): MockTextNode {
      const text = new MockTextNode();
      activePage.appendChild(text);
      return text;
    },
    createNodeFromSvg(_svg: string): MockContainerNode {
      const svgRoot = new MockContainerNode('FRAME');
      svgRoot.name = 'SVG';
      const vectorChild = new MockSceneNode('VECTOR');
      vectorChild.strokes = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }];
      vectorChild.strokeWeight = 1.5;
      svgRoot.appendChild(vectorChild);
      activePage.appendChild(svgRoot);
      return svgRoot;
    },
    createTextStyle(): MockTextStyle {
      const ts = new MockTextStyle();
      textStyles.set(ts.id, ts);
      return ts;
    },
    createEffectStyle(): MockEffectStyle {
      const es = new MockEffectStyle();
      effectStyles.set(es.id, es);
      return es;
    },
    async getLocalTextStylesAsync(): Promise<MockTextStyle[]> {
      return [...textStyles.values()];
    },
    async getLocalEffectStylesAsync(): Promise<MockEffectStyle[]> {
      return [...effectStyles.values()];
    },
    variables: {
      createVariableCollection(name: string): MockVariableCollection {
        const col = new MockVariableCollection(name);
        collections.set(col.id, col);
        return col;
      },
      createVariable(
        name: string,
        collection: MockVariableCollection,
        resolvedType: VariableResolvedDataType,
      ): MockVariable {
        if (!collection || typeof collection !== 'object' || !('id' in collection)) {
          throw new Error(
            'dynamic-page violation: figma.variables.createVariable requires VariableCollection object, not string ID.',
          );
        }
        const v = new MockVariable(name, collection, resolvedType);
        variables.set(v.id, v);
        return v;
      },
      createVariableAlias(variable: MockVariable): VariableAlias {
        if (!variable || typeof variable !== 'object' || !('id' in variable)) {
          throw new Error('createVariableAlias requires a Variable object.');
        }
        return { type: 'VARIABLE_ALIAS', id: variable.id };
      },
      async getLocalVariableCollectionsAsync(): Promise<MockVariableCollection[]> {
        return [...collections.values()];
      },
      async getLocalVariablesAsync(): Promise<MockVariable[]> {
        return [...variables.values()];
      },
      setBoundVariableForPaint(
        paint: SolidPaint,
        field: 'color',
        variable: MockVariable,
      ): SolidPaint {
        if (!variable || typeof variable !== 'object' || !('id' in variable)) {
          throw new Error('setBoundVariableForPaint requires Variable object.');
        }
        return {
          ...paint,
          boundVariables: {
            ...(paint.boundVariables ?? {}),
            [field]: { type: 'VARIABLE_ALIAS', id: variable.id },
          },
        };
      },
      setBoundVariableForEffect(
        effect: Effect,
        field: string,
        variable: MockVariable,
      ): Effect {
        if (!variable || typeof variable !== 'object' || !('id' in variable)) {
          throw new Error('setBoundVariableForEffect requires Variable object.');
        }
        return {
          ...effect,
          boundVariables: {
            ...((effect as DropShadowEffect).boundVariables ?? {}),
            [field]: { type: 'VARIABLE_ALIAS', id: variable.id },
          },
        } as Effect;
      },
    },
  };

  return {
    figma: mockFigma as unknown as PluginAPI,
    sentToUi,
    async sendUiMessage(msg: UiToPluginMessage | unknown) {
      if (!uiBridge.onmessage) {
        throw new Error('figma.ui.onmessage handler has not been registered.');
      }
      await uiBridge.onmessage(msg);
    },
    getStats() {
      let componentSets = 0;
      let standaloneComponents = 0;
      for (const node of nodesById.values()) {
        if (node.type === 'COMPONENT_SET') componentSets += 1;
        if (node.type === 'COMPONENT' && node.parent?.type !== 'COMPONENT_SET') {
          standaloneComponents += 1;
        }
      }
      return {
        pages: rootNode.children.length,
        collections: collections.size,
        variables: variables.size,
        textStyles: textStyles.size,
        effectStyles: effectStyles.size,
        componentSets,
        standaloneComponents,
        totalNodes: nodesById.size,
        windowSize: { ...windowSize },
      };
    },
    installGlobals() {
      (globalThis as unknown as { figma: unknown; __html__: string }).figma = mockFigma;
      (globalThis as unknown as { figma: unknown; __html__: string }).__html__ =
        '<!doctype html><html><body></body></html>';
    },
  };
}
