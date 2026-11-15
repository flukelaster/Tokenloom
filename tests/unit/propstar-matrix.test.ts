import { describe, expect, it } from 'vitest';
import { shadcnLibrary } from '../../libraries/shadcn';
import {
  formatVariantAxisValueLabel,
  planPropstarAxes,
} from '../../src/plugin/propstar-matrix';

describe('Propstar 2D Property Matrix Axis Planner', () => {
  it('reproduces Propstar Button 6-column x 50-row layout (Leading Icon + Variant + State on Y, Trailing Icon + Size on X)', () => {
    const button = shadcnLibrary.components.find((c) => c.logicalId === 'button')!;
    const propKeyMap = new Map<string, string>([
      ['showLeadingIcon', 'Leading Icon#1:1'],
      ['showTrailingIcon', 'Trailing Icon#1:2'],
    ]);

    const plan = planPropstarAxes(button.variantAxes, button.properties, propKeyMap, 112);

    expect(plan.yAxes.map((a) => a.name)).toEqual(['Leading Icon', 'Variant', 'State']);
    expect(plan.xAxes.map((a) => a.name)).toEqual(['Trailing Icon', 'Size']);

    // Default boolean values MUST come first (index 0) so Quadrant (0, 0) is 100% the native ComponentSet!
    expect(plan.yBoolAxes[0].values).toEqual(['Leading Icon: False', 'Leading Icon: True']);
    expect(plan.xBoolAxes[0].values).toEqual(['Trailing Icon: False', 'Trailing Icon: True']);
  });

  it('orders true-default Boolean properties with True first so Quadrant (0, 0) matches native Card defaults', () => {
    const card = shadcnLibrary.components.find((c) => c.logicalId === 'card')!;
    const propKeyMap = new Map<string, string>([
      ['showBadge', 'Show Header Badge#2:1'],
      ['showFooter', 'Show Action Footer#2:2'],
    ]);

    const plan = planPropstarAxes(card.variantAxes, card.properties, propKeyMap, 340);

    expect(plan.yBoolAxes[0].boolValues).toEqual([true, false]);
    expect(plan.yBoolAxes[0].values).toEqual([
      'Show Header Badge: True',
      'Show Header Badge: False',
    ]);
    expect(plan.xBoolAxes[0].boolValues).toEqual([true, false]);
    expect(plan.xBoolAxes[0].values).toEqual([
      'Show Action Footer: True',
      'Show Action Footer: False',
    ]);
    expect(plan.yVarAxes.map((a) => a.name)).toEqual(['Variant']);
    expect(plan.xVarAxes.map((a) => a.name)).toEqual(['Padding']);
  });

  it('keeps wide Dialog components (>= 340px) compact horizontally when 1 Boolean property is present', () => {
    const dialog = shadcnLibrary.components.find((c) => c.logicalId === 'dialog')!;
    const propKeyMap = new Map<string, string>([
      ['showCancel', 'Show Cancel Button#3:1'],
    ]);

    const plan = planPropstarAxes(dialog.variantAxes, dialog.properties, propKeyMap, 420);

    // Size stays on X (2 columns) while Show Cancel Button stacks on Y above Intent!
    expect(plan.xAxes.map((a) => a.name)).toEqual(['Size']);
    expect(plan.yAxes.map((a) => a.name)).toEqual(['Show Cancel Button', 'Intent']);
  });

  it('formats concise variant labels cleanly and prefixes ambiguous/positional axis values', () => {
    expect(formatVariantAxisValueLabel('Variant', 'Primary')).toBe('Primary');
    expect(formatVariantAxisValueLabel('Size', 'Medium')).toBe('Medium');
    expect(formatVariantAxisValueLabel('State', 'Hover')).toBe('Hover');
    expect(formatVariantAxisValueLabel('Padding', 'Compact')).toBe('Padding: Compact');
    expect(formatVariantAxisValueLabel('ActiveTab', 'First')).toBe('ActiveTab: First');
    expect(formatVariantAxisValueLabel('Selected', 'True')).toBe('Selected: True');
  });
});
