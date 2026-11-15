export interface AdapterTokenBindings {
  // Surfaces
  surfaceBackground: string;
  surfaceCard: string;
  surfaceMuted: string;
  surfaceAccent: string;
  surfaceInverse: string;

  // Text & Iconography
  textPrimary: string;
  textMuted: string;
  textInverse: string;

  // Primary & Secondary Actions
  actionPrimaryBg: string;
  actionPrimaryHover: string;
  actionPrimaryPressed: string;
  actionPrimaryFg: string;
  actionSecondaryBg: string;
  actionSecondaryHover: string;

  // Borders & Focus
  borderDefault: string;
  borderInput: string;
  borderFocus: string;

  // Feedback
  destructiveBg: string;
  destructiveSubtle: string;
  destructiveFg: string;
  successBg: string;
  successSubtle: string;
  warningBg: string;
  warningSubtle: string;
  infoSubtle: string;

  // Component-tier aliases
  buttonPrimaryBg: string;
  buttonPrimaryHover: string;
  buttonPrimaryPressed: string;
  buttonPrimaryFg: string;
  buttonSecondaryBg: string;
  buttonRadius: string;
  inputBg: string;
  inputBorder: string;
  inputRadius: string;
  cardBg: string;
  cardBorder: string;
  cardRadius: string;

  // Scales
  space0: string;
  space1: string;
  space1_5: string;
  space2: string;
  space3: string;
  space4: string;
  space5: string;
  space6: string;
  controlSm: string;
  controlMd: string;
  controlLg: string;
  iconSm: string;
  radiusNone: string;
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
  radiusFull: string;
  border1: string;
  border2: string;
  opacityDisabled: string;
  opacitySolid: string;
}

export interface EcosystemRecipeOptions {
  libraryLabel: string;
  docsBaseUrl: string;
  pillBadges?: boolean;
  sharpCornersByDefault?: boolean;
}
