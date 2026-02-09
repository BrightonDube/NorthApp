# Calm Design System Infrastructure

This directory contains the infrastructure for the Calm Design System Refresh, including backups, test fixtures, validation utilities, and property-based tests.

## Directory Structure

```
design-system/
├── backups/                    # Backups of original design tokens
│   ├── global.css.backup       # Original global.css
│   └── tailwind.config.js.backup # Original tailwind.config.js
├── fixtures/                   # Test fixtures with old and new token values
│   └── design-tokens.fixture.ts # All design token fixtures
├── utils/                      # Validation and utility functions
│   ├── color-utils.ts          # Color conversion and validation
│   └── validation-utils.ts     # Token validation functions
├── __tests__/                  # Property-based and unit tests
│   └── infrastructure.property.test.ts # Infrastructure validation tests
└── README.md                   # This file
```

## Backups

The `backups/` directory contains copies of the original design token files before the calm design refresh:

- **global.css.backup**: Original CSS custom properties
- **tailwind.config.js.backup**: Original Tailwind configuration

These backups serve as:
1. A reference for the old design system
2. A rollback point if needed
3. A source for comparison in property-based tests

## Test Fixtures

The `fixtures/design-tokens.fixture.ts` file contains comprehensive test data:

### Old Design Tokens (Current System)
- `oldColorTokens`: Current color palette (light and dark modes)
- `oldSpacingTokens`: Current spacing scale
- `oldBorderRadiusTokens`: Current border radius values
- `oldAnimationTokens`: Current animation durations
- `oldShadowTokens`: Current shadow definitions
- `oldComponentTokens`: Current component configurations

### New Design Tokens (Calm Design Refresh)
- `newColorTokens`: New warm, muted color palette with nature-inspired accents
- `newSpacingTokens`: Increased spacing values (25-50% more)
- `newBorderRadiusTokens`: Increased border radius for organic shapes
- `newAnimationTokens`: Slower, gentler animation durations
- `newShadowTokens`: Softer shadows with reduced opacity
- `newComponentTokens`: Updated component configurations

### Additional Tokens
- `touchTargetTokens`: Touch target size standards
- `oldEasingTokens`: Current easing curves
- `newEasingTokens`: New gentle easing curves

## Validation Utilities

### Color Utilities (`utils/color-utils.ts`)

Functions for color manipulation and validation:

- `hexToRgb(hex)`: Convert hex color to RGB
- `rgbToHsl(rgb)`: Convert RGB to HSL
- `hexToHsl(hex)`: Convert hex color to HSL
- `getRelativeLuminance(rgb)`: Calculate WCAG relative luminance
- `getContrastRatio(color1, color2)`: Calculate WCAG contrast ratio
- `hasWarmUndertones(hex)`: Check if color has warm undertones
- `isDarker(color1, color2)`: Compare color darkness
- `getAverageLuminance(hex)`: Get average luminance
- `getLuminosityDifference(color1, color2)`: Calculate luminosity difference
- `parseGradient(gradient)`: Extract colors from gradient string
- `isGradientSubtle(gradient, maxDiff)`: Check gradient subtlety
- `hasNaturalGradientDirection(gradient)`: Validate gradient direction

### Validation Utilities (`utils/validation-utils.ts`)

Functions for validating design tokens against requirements:

#### Color Validation
- `validateColorSaturation()`: Verify reduced saturation
- `validateContrastRatio()`: Verify WCAG AA compliance
- `validateColorWarmth()`: Verify warm undertones

#### Spacing Validation
- `validateSpacingIncrease()`: Verify minimum spacing increase
- `validateMinimumSpacing()`: Verify minimum spacing values

#### Animation Validation
- `validateAnimationDuration()`: Verify duration bounds
- `validateEasingCurve()`: Verify gentle easing curves
- `validateStaggerDelay()`: Verify stagger delay range

#### Border Radius Validation
- `validateBorderRadiusIncrease()`: Verify radius increase
- `validateMinimumBorderRadius()`: Verify minimum radius values

#### Shadow Validation
- `validateShadowSoftness()`: Verify reduced opacity and increased blur
- `validateDarkModeShadowGlow()`: Verify light-colored shadows in dark mode
- `validateBorderSubtlety()`: Verify subtle border colors

#### Touch Target Validation
- `validateTouchTargetSize()`: Verify minimum touch target size
- `validateTouchTargetSpacing()`: Verify spacing between touch targets

#### Gradient Validation
- `validateGradientSubtlety()`: Verify subtle luminosity differences
- `validateDarkModeGradientDarkness()`: Verify dark mode gradients are darker

## Property-Based Testing

The infrastructure uses `fast-check` for property-based testing. Property tests validate universal properties across all design tokens.

### Running Tests

```bash
# Run all property-based tests
npm run test:pbt

# Run infrastructure tests specifically
npm test -- infrastructure.property.test

# Run with coverage
npm run test:coverage
```

### Test Structure

Property tests follow this format:

```typescript
describe('Feature: calm-design-refresh, Property X: Property Name', () => {
  it('should validate property across all tokens', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...tokenKeys),
        (tokenKey) => {
          // Validation logic
          return validationResult;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Infrastructure Tests

The `infrastructure.property.test.ts` file validates:

1. **Color Utilities**: Correct conversion and calculation
2. **Test Fixtures**: All required tokens are defined
3. **Validation Utilities**: Functions work correctly
4. **Infrastructure Readiness**: All components are available

## Usage Examples

### Validating a Color Token

```typescript
import { validateColorSaturation } from './utils/validation-utils';
import { newColorTokens, oldColorTokens } from './fixtures/design-tokens.fixture';

const result = validateColorSaturation(
  newColorTokens.light.background,
  oldColorTokens.light.background,
  'background'
);

if (!result.isValid) {
  console.error('Validation errors:', result.errors);
}
```

### Checking Contrast Ratio

```typescript
import { getContrastRatio } from './utils/color-utils';
import { newColorTokens } from './fixtures/design-tokens.fixture';

const ratio = getContrastRatio(
  newColorTokens.light.textPrimary,
  newColorTokens.light.background
);

console.log(`Contrast ratio: ${ratio.toFixed(2)}:1`);
// Should be >= 4.5:1 for WCAG AA
```

### Validating Spacing Increase

```typescript
import { validateSpacingIncrease } from './utils/validation-utils';
import { newSpacingTokens, oldSpacingTokens } from './fixtures/design-tokens.fixture';

const result = validateSpacingIncrease(
  newSpacingTokens.md,
  oldSpacingTokens.md,
  0.25, // 25% minimum increase
  'spacing-md'
);

if (result.isValid) {
  console.log('Spacing increase validated!');
}
```

## Next Steps

With the infrastructure in place, you can now:

1. **Update Design Tokens**: Modify `global.css` and `tailwind.config.js` with new values
2. **Write Property Tests**: Create tests for each correctness property in the design document
3. **Validate Changes**: Run property tests to ensure all requirements are met
4. **Update Components**: Apply new tokens to UI components
5. **Monitor Compliance**: Use validation utilities in CI/CD pipeline

## References

- [Design Document](.kiro/specs/calm-design-refresh/design.md)
- [Requirements Document](.kiro/specs/calm-design-refresh/requirements.md)
- [Tasks Document](.kiro/specs/calm-design-refresh/tasks.md)
- [fast-check Documentation](https://fast-check.dev/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
