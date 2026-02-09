/**
 * Design Token Validation Utilities
 * 
 * Utilities for validating design tokens against the calm design system requirements
 */

import { getContrastRatio, hexToHsl, hasWarmUndertones, isDarker, isGradientSubtle, hasNaturalGradientDirection } from './color-utils';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  token: string;
  rule: string;
  message: string;
  currentValue: any;
  expectedValue?: any;
}

export interface ValidationWarning {
  token: string;
  message: string;
  suggestion: string;
}

// ============================================================================
// COLOR VALIDATION
// ============================================================================

/**
 * Validate that a color has reduced saturation compared to another
 */
export function validateColorSaturation(
  newColor: string,
  oldColor: string,
  colorName: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const newHsl = hexToHsl(newColor);
  const oldHsl = hexToHsl(oldColor);

  if (newHsl.s >= oldHsl.s) {
    errors.push({
      token: colorName,
      rule: 'Color Saturation Reduction',
      message: `New color saturation (${newHsl.s}%) should be less than old color saturation (${oldHsl.s}%)`,
      currentValue: newHsl.s,
      expectedValue: `< ${oldHsl.s}`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate WCAG AA contrast ratio
 */
export function validateContrastRatio(
  foreground: string,
  background: string,
  minRatio: number,
  tokenName: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const ratio = getContrastRatio(foreground, background);

  if (ratio < minRatio) {
    errors.push({
      token: tokenName,
      rule: 'WCAG AA Contrast',
      message: `Contrast ratio ${ratio.toFixed(2)}:1 is below minimum ${minRatio}:1`,
      currentValue: ratio.toFixed(2),
      expectedValue: `>= ${minRatio}`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate that a color has warm undertones
 */
export function validateColorWarmth(
  color: string,
  colorName: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!hasWarmUndertones(color)) {
    errors.push({
      token: colorName,
      rule: 'Color Warmth',
      message: `Color should have warm undertones (red/yellow >= blue)`,
      currentValue: color,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// SPACING VALIDATION
// ============================================================================

/**
 * Validate that spacing has increased by minimum percentage
 */
export function validateSpacingIncrease(
  newValue: number,
  oldValue: number,
  minIncrease: number,
  tokenName: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const expectedMinimum = oldValue * (1 + minIncrease);

  if (newValue < expectedMinimum) {
    errors.push({
      token: tokenName,
      rule: 'Spacing Increase',
      message: `New spacing ${newValue}px should be at least ${minIncrease * 100}% more than old spacing ${oldValue}px`,
      currentValue: newValue,
      expectedValue: `>= ${expectedMinimum}`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate minimum spacing value
 */
export function validateMinimumSpacing(
  value: number,
  minimum: number,
  tokenName: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (value < minimum) {
    errors.push({
      token: tokenName,
      rule: 'Minimum Spacing',
      message: `Spacing ${value}px is below minimum ${minimum}px`,
      currentValue: value,
      expectedValue: `>= ${minimum}`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// ANIMATION VALIDATION
// ============================================================================

/**
 * Validate animation duration bounds
 */
export function validateAnimationDuration(
  duration: number,
  min: number,
  max: number,
  tokenName: string,
  isSpecialAnimation: boolean = false
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Special animations (like breathing) can exceed normal max
  if (isSpecialAnimation) {
    if (duration < 2000 || duration > 3000) {
      errors.push({
        token: tokenName,
        rule: 'Special Animation Duration',
        message: `Special animation duration ${duration}ms should be between 2000-3000ms`,
        currentValue: duration,
        expectedValue: '2000-3000',
      });
    }
  } else {
    if (duration < min || duration > max) {
      errors.push({
        token: tokenName,
        rule: 'Animation Duration Bounds',
        message: `Animation duration ${duration}ms should be between ${min}-${max}ms`,
        currentValue: duration,
        expectedValue: `${min}-${max}`,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate easing curve (cubic-bezier format)
 */
export function validateEasingCurve(
  easing: string,
  tokenName: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check if it's a cubic-bezier curve (handle negative numbers)
  const cubicBezierRegex = /cubic-bezier\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/;
  const match = easing.match(cubicBezierRegex);

  if (!match) {
    errors.push({
      token: tokenName,
      rule: 'Easing Curve Format',
      message: `Easing should be a cubic-bezier curve`,
      currentValue: easing,
      expectedValue: 'cubic-bezier(x1, y1, x2, y2)',
    });
    return { isValid: false, errors, warnings };
  }

  // Check that control points create slow start and end
  const [, x1, y1, x2, y2] = match.map(Number);

  // For gentle easing, y1 and y2 should be between 0 and 1
  if (y1 < 0 || y1 > 1 || y2 < 0 || y2 > 1) {
    warnings.push({
      token: tokenName,
      message: `Easing curve may not provide gentle start/end`,
      suggestion: 'Consider using y-values between 0 and 1 for smoother transitions',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate stagger delay range
 */
export function validateStaggerDelay(
  delay: number,
  min: number,
  max: number,
  tokenName: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (delay < min || delay > max) {
    errors.push({
      token: tokenName,
      rule: 'Stagger Delay Range',
      message: `Stagger delay ${delay}ms should be between ${min}-${max}ms`,
      currentValue: delay,
      expectedValue: `${min}-${max}`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// BORDER RADIUS VALIDATION
// ============================================================================

/**
 * Validate that border radius has increased
 */
export function validateBorderRadiusIncrease(
  newValue: number,
  oldValue: number,
  tokenName: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (newValue <= oldValue) {
    errors.push({
      token: tokenName,
      rule: 'Border Radius Increase',
      message: `New border radius ${newValue}px should be greater than old border radius ${oldValue}px`,
      currentValue: newValue,
      expectedValue: `> ${oldValue}`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate minimum border radius
 */
export function validateMinimumBorderRadius(
  value: number,
  minimum: number,
  tokenName: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (value < minimum) {
    errors.push({
      token: tokenName,
      rule: 'Minimum Border Radius',
      message: `Border radius ${value}px is below minimum ${minimum}px`,
      currentValue: value,
      expectedValue: `>= ${minimum}`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// SHADOW VALIDATION
// ============================================================================

/**
 * Validate shadow softness (opacity and blur)
 */
export function validateShadowSoftness(
  newOpacity: number,
  oldOpacity: number,
  newBlur: number,
  oldBlur: number,
  maxOpacity: number,
  tokenName: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check opacity is lower
  if (newOpacity >= oldOpacity) {
    errors.push({
      token: tokenName,
      rule: 'Shadow Opacity Reduction',
      message: `New shadow opacity ${newOpacity} should be less than old opacity ${oldOpacity}`,
      currentValue: newOpacity,
      expectedValue: `< ${oldOpacity}`,
    });
  }

  // Check opacity doesn't exceed maximum
  if (newOpacity > maxOpacity) {
    errors.push({
      token: tokenName,
      rule: 'Maximum Shadow Opacity',
      message: `Shadow opacity ${newOpacity} exceeds maximum ${maxOpacity}`,
      currentValue: newOpacity,
      expectedValue: `<= ${maxOpacity}`,
    });
  }

  // Check blur radius is larger
  if (newBlur <= oldBlur) {
    errors.push({
      token: tokenName,
      rule: 'Shadow Blur Increase',
      message: `New shadow blur ${newBlur}px should be greater than old blur ${oldBlur}px`,
      currentValue: newBlur,
      expectedValue: `> ${oldBlur}`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate dark mode shadow uses light color (glow effect)
 */
export function validateDarkModeShadowGlow(
  shadowColor: string,
  tokenName: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const hsl = hexToHsl(shadowColor);

  // Light colors have high lightness (>= 80%)
  if (hsl.l < 80) {
    errors.push({
      token: tokenName,
      rule: 'Dark Mode Shadow Glow',
      message: `Dark mode shadow should use light color (lightness >= 80%) for glow effect`,
      currentValue: `${hsl.l}%`,
      expectedValue: '>= 80%',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate border color subtlety (low contrast with background)
 */
export function validateBorderSubtlety(
  borderColor: string,
  backgroundColor: string,
  maxContrast: number,
  tokenName: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const contrast = getContrastRatio(borderColor, backgroundColor);

  if (contrast > maxContrast) {
    errors.push({
      token: tokenName,
      rule: 'Border Color Subtlety',
      message: `Border contrast ${contrast.toFixed(2)}:1 exceeds maximum ${maxContrast}:1`,
      currentValue: contrast.toFixed(2),
      expectedValue: `<= ${maxContrast}`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// TOUCH TARGET VALIDATION
// ============================================================================

/**
 * Validate minimum touch target size
 */
export function validateTouchTargetSize(
  width: number,
  height: number,
  minimum: number,
  tokenName: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (width < minimum || height < minimum) {
    errors.push({
      token: tokenName,
      rule: 'Minimum Touch Target',
      message: `Touch target ${width}x${height} is below minimum ${minimum}x${minimum}`,
      currentValue: `${width}x${height}`,
      expectedValue: `>= ${minimum}x${minimum}`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate touch target spacing
 */
export function validateTouchTargetSpacing(
  spacing: number,
  minimum: number,
  tokenName: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (spacing < minimum) {
    errors.push({
      token: tokenName,
      rule: 'Touch Target Spacing',
      message: `Touch target spacing ${spacing}px is below minimum ${minimum}px`,
      currentValue: spacing,
      expectedValue: `>= ${minimum}`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// GRADIENT VALIDATION
// ============================================================================

/**
 * Validate gradient subtlety
 */
export function validateGradientSubtlety(
  gradient: string,
  maxLuminosityDiff: number,
  tokenName: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!isGradientSubtle(gradient, maxLuminosityDiff)) {
    errors.push({
      token: tokenName,
      rule: 'Gradient Subtlety',
      message: `Gradient luminosity difference exceeds maximum ${maxLuminosityDiff}%`,
      currentValue: gradient,
      expectedValue: `<= ${maxLuminosityDiff}% difference`,
    });
  }

  if (!hasNaturalGradientDirection(gradient)) {
    warnings.push({
      token: tokenName,
      message: 'Gradient direction may not feel natural',
      suggestion: 'Consider using 180deg (top-to-bottom) or radial direction',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate dark mode gradient is darker than light mode
 */
export function validateDarkModeGradientDarkness(
  darkGradient: string,
  lightGradient: string,
  tokenName: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // This is a simplified check - in practice, you'd compare average luminance
  // For now, we'll just check if the dark gradient contains darker colors
  const darkHsl = hexToHsl(darkGradient.match(/#[0-9A-Fa-f]{6}/)?.[0] || '#000000');
  const lightHsl = hexToHsl(lightGradient.match(/#[0-9A-Fa-f]{6}/)?.[0] || '#FFFFFF');

  if (darkHsl.l >= lightHsl.l) {
    errors.push({
      token: tokenName,
      rule: 'Dark Mode Gradient Darkness',
      message: `Dark mode gradient should be darker than light mode gradient`,
      currentValue: `${darkHsl.l}%`,
      expectedValue: `< ${lightHsl.l}%`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// COMPREHENSIVE VALIDATION
// ============================================================================

export interface TokenValidationConfig {
  colors?: {
    old: Record<string, string>;
    new: Record<string, string>;
    textBackgroundPairs?: Array<{ text: string; background: string; minRatio: number }>;
    warmthRequired?: string[];
  };
  spacing?: {
    old: Record<string, number>;
    new: Record<string, number>;
    minIncrease: number;
  };
  componentSpacing?: {
    components: Record<string, { padding?: number; margin?: number; spacing?: number }>;
    minPadding: number;
    minMargin: number;
  };
  animations?: {
    durations: Record<string, number>;
    min: number;
    max: number;
    specialAnimations?: string[];
  };
  easingCurves?: Record<string, string>;
  staggerDelays?: {
    delays: Record<string, number>;
    min: number;
    max: number;
  };
  borderRadius?: {
    old: Record<string, number>;
    new: Record<string, number>;
    componentMinimums?: Record<string, number>;
  };
  shadows?: {
    old: Record<string, { opacity: number; blur: number }>;
    new: Record<string, { opacity: number; blur: number }>;
    maxOpacity: number;
    mode: 'light' | 'dark';
  };
  borders?: {
    colors: Record<string, string>;
    backgrounds: Record<string, string>;
    maxContrast: number;
  };
  touchTargets?: {
    components: Record<string, { width: number; height: number }>;
    minimum: number;
    spacing?: number;
  };
  gradients?: {
    light: Record<string, string>;
    dark: Record<string, string>;
    maxLuminosityDiff: number;
  };
}

export interface ComprehensiveValidationResult {
  isValid: boolean;
  totalErrors: number;
  totalWarnings: number;
  results: {
    colors?: ValidationResult[];
    spacing?: ValidationResult[];
    componentSpacing?: ValidationResult[];
    animations?: ValidationResult[];
    easingCurves?: ValidationResult[];
    staggerDelays?: ValidationResult[];
    borderRadius?: ValidationResult[];
    shadows?: ValidationResult[];
    borders?: ValidationResult[];
    touchTargets?: ValidationResult[];
    gradients?: ValidationResult[];
  };
  summary: {
    passed: string[];
    failed: string[];
    warnings: string[];
  };
}

/**
 * Validate all design tokens comprehensively
 */
export function validateAllTokens(config: TokenValidationConfig): ComprehensiveValidationResult {
  const results: ComprehensiveValidationResult['results'] = {};
  const summary = {
    passed: [] as string[],
    failed: [] as string[],
    warnings: [] as string[],
  };

  // Validate colors
  if (config.colors) {
    results.colors = [];

    // Validate saturation reduction
    Object.keys(config.colors.new).forEach((key) => {
      if (config.colors!.old[key]) {
        const result = validateColorSaturation(
          config.colors!.new[key],
          config.colors!.old[key],
          key
        );
        results.colors!.push(result);
        if (result.isValid) {
          summary.passed.push(`Color saturation: ${key}`);
        } else {
          summary.failed.push(`Color saturation: ${key}`);
        }
      }
    });

    // Validate contrast ratios
    if (config.colors.textBackgroundPairs) {
      config.colors.textBackgroundPairs.forEach((pair) => {
        const result = validateContrastRatio(
          pair.text,
          pair.background,
          pair.minRatio,
          `${pair.text} on ${pair.background}`
        );
        results.colors!.push(result);
        if (result.isValid) {
          summary.passed.push(`Contrast ratio: ${pair.text} on ${pair.background}`);
        } else {
          summary.failed.push(`Contrast ratio: ${pair.text} on ${pair.background}`);
        }
      });
    }

    // Validate warmth
    if (config.colors.warmthRequired) {
      config.colors.warmthRequired.forEach((key) => {
        const colorValue = config.colors!.new[key];
        if (colorValue) {
          const result = validateColorWarmth(colorValue, key);
          results.colors!.push(result);
          if (result.isValid) {
            summary.passed.push(`Color warmth: ${key}`);
          } else {
            summary.failed.push(`Color warmth: ${key}`);
          }
        }
      });
    }
  }

  // Validate spacing
  if (config.spacing) {
    results.spacing = [];
    Object.keys(config.spacing.new).forEach((key) => {
      if (config.spacing!.old[key]) {
        const result = validateSpacingIncrease(
          config.spacing!.new[key],
          config.spacing!.old[key],
          config.spacing!.minIncrease,
          key
        );
        results.spacing!.push(result);
        if (result.isValid) {
          summary.passed.push(`Spacing increase: ${key}`);
        } else {
          summary.failed.push(`Spacing increase: ${key}`);
        }
      }
    });
  }

  // Validate component spacing
  if (config.componentSpacing) {
    results.componentSpacing = [];
    Object.entries(config.componentSpacing.components).forEach(([name, values]) => {
      if (values.padding !== undefined) {
        const result = validateMinimumSpacing(
          values.padding,
          config.componentSpacing!.minPadding,
          `${name}.padding`
        );
        results.componentSpacing!.push(result);
        if (result.isValid) {
          summary.passed.push(`Component padding: ${name}`);
        } else {
          summary.failed.push(`Component padding: ${name}`);
        }
      }
      if (values.margin !== undefined) {
        const result = validateMinimumSpacing(
          values.margin,
          config.componentSpacing!.minMargin,
          `${name}.margin`
        );
        results.componentSpacing!.push(result);
        if (result.isValid) {
          summary.passed.push(`Component margin: ${name}`);
        } else {
          summary.failed.push(`Component margin: ${name}`);
        }
      }
    });
  }

  // Validate animations
  if (config.animations) {
    results.animations = [];
    Object.entries(config.animations.durations).forEach(([key, duration]) => {
      const isSpecial = config.animations!.specialAnimations?.includes(key) || false;
      const result = validateAnimationDuration(
        duration,
        config.animations!.min,
        config.animations!.max,
        key,
        isSpecial
      );
      results.animations!.push(result);
      if (result.isValid) {
        summary.passed.push(`Animation duration: ${key}`);
      } else {
        summary.failed.push(`Animation duration: ${key}`);
      }
    });
  }

  // Validate easing curves
  if (config.easingCurves) {
    results.easingCurves = [];
    Object.entries(config.easingCurves).forEach(([key, easing]) => {
      const result = validateEasingCurve(easing, key);
      results.easingCurves!.push(result);
      if (result.isValid) {
        summary.passed.push(`Easing curve: ${key}`);
      } else {
        summary.failed.push(`Easing curve: ${key}`);
      }
      if (result.warnings.length > 0) {
        summary.warnings.push(`Easing curve: ${key}`);
      }
    });
  }

  // Validate stagger delays
  if (config.staggerDelays) {
    results.staggerDelays = [];
    Object.entries(config.staggerDelays.delays).forEach(([key, delay]) => {
      const result = validateStaggerDelay(
        delay,
        config.staggerDelays!.min,
        config.staggerDelays!.max,
        key
      );
      results.staggerDelays!.push(result);
      if (result.isValid) {
        summary.passed.push(`Stagger delay: ${key}`);
      } else {
        summary.failed.push(`Stagger delay: ${key}`);
      }
    });
  }

  // Validate border radius
  if (config.borderRadius) {
    results.borderRadius = [];
    Object.keys(config.borderRadius.new).forEach((key) => {
      if (config.borderRadius!.old[key]) {
        const result = validateBorderRadiusIncrease(
          config.borderRadius!.new[key],
          config.borderRadius!.old[key],
          key
        );
        results.borderRadius!.push(result);
        if (result.isValid) {
          summary.passed.push(`Border radius increase: ${key}`);
        } else {
          summary.failed.push(`Border radius increase: ${key}`);
        }
      }
    });

    // Validate component minimums
    if (config.borderRadius.componentMinimums) {
      Object.entries(config.borderRadius.componentMinimums).forEach(([name, minimum]) => {
        const result = validateMinimumBorderRadius(
          config.borderRadius!.new[name] || 0,
          minimum,
          name
        );
        results.borderRadius!.push(result);
        if (result.isValid) {
          summary.passed.push(`Border radius minimum: ${name}`);
        } else {
          summary.failed.push(`Border radius minimum: ${name}`);
        }
      });
    }
  }

  // Validate shadows
  if (config.shadows) {
    results.shadows = [];
    Object.keys(config.shadows.new).forEach((key) => {
      if (config.shadows!.old[key]) {
        const result = validateShadowSoftness(
          config.shadows!.new[key].opacity,
          config.shadows!.old[key].opacity,
          config.shadows!.new[key].blur,
          config.shadows!.old[key].blur,
          config.shadows!.maxOpacity,
          key
        );
        results.shadows!.push(result);
        if (result.isValid) {
          summary.passed.push(`Shadow softness: ${key}`);
        } else {
          summary.failed.push(`Shadow softness: ${key}`);
        }
      }
    });
  }

  // Validate borders
  if (config.borders) {
    results.borders = [];
    Object.entries(config.borders.colors).forEach(([key, borderColor]) => {
      const backgroundColor = config.borders!.backgrounds[key];
      if (backgroundColor) {
        const result = validateBorderSubtlety(
          borderColor,
          backgroundColor,
          config.borders!.maxContrast,
          key
        );
        results.borders!.push(result);
        if (result.isValid) {
          summary.passed.push(`Border subtlety: ${key}`);
        } else {
          summary.failed.push(`Border subtlety: ${key}`);
        }
      }
    });
  }

  // Validate touch targets
  if (config.touchTargets) {
    results.touchTargets = [];
    Object.entries(config.touchTargets.components).forEach(([name, dimensions]) => {
      const result = validateTouchTargetSize(
        dimensions.width,
        dimensions.height,
        config.touchTargets!.minimum,
        name
      );
      results.touchTargets!.push(result);
      if (result.isValid) {
        summary.passed.push(`Touch target: ${name}`);
      } else {
        summary.failed.push(`Touch target: ${name}`);
      }
    });

    // Validate spacing
    if (config.touchTargets.spacing !== undefined) {
      const result = validateTouchTargetSpacing(
        config.touchTargets.spacing,
        8,
        'touchTargetSpacing'
      );
      results.touchTargets!.push(result);
      if (result.isValid) {
        summary.passed.push('Touch target spacing');
      } else {
        summary.failed.push('Touch target spacing');
      }
    }
  }

  // Validate gradients
  if (config.gradients) {
    results.gradients = [];
    Object.entries(config.gradients.light).forEach(([key, gradient]) => {
      const result = validateGradientSubtlety(
        gradient,
        config.gradients!.maxLuminosityDiff,
        `${key}.light`
      );
      results.gradients!.push(result);
      if (result.isValid) {
        summary.passed.push(`Gradient subtlety: ${key}.light`);
      } else {
        summary.failed.push(`Gradient subtlety: ${key}.light`);
      }
      if (result.warnings.length > 0) {
        summary.warnings.push(`Gradient direction: ${key}.light`);
      }
    });

    Object.entries(config.gradients.dark).forEach(([key, gradient]) => {
      const result = validateGradientSubtlety(
        gradient,
        config.gradients!.maxLuminosityDiff,
        `${key}.dark`
      );
      results.gradients!.push(result);
      if (result.isValid) {
        summary.passed.push(`Gradient subtlety: ${key}.dark`);
      } else {
        summary.failed.push(`Gradient subtlety: ${key}.dark`);
      }
      if (result.warnings.length > 0) {
        summary.warnings.push(`Gradient direction: ${key}.dark`);
      }
    });

    // Validate dark mode is darker
    Object.keys(config.gradients.light).forEach((key) => {
      if (config.gradients!.dark[key]) {
        const result = validateDarkModeGradientDarkness(
          config.gradients!.dark[key],
          config.gradients!.light[key],
          key
        );
        results.gradients!.push(result);
        if (result.isValid) {
          summary.passed.push(`Gradient darkness: ${key}`);
        } else {
          summary.failed.push(`Gradient darkness: ${key}`);
        }
      }
    });
  }

  // Calculate totals
  const allResults = Object.values(results).flat();
  const totalErrors = allResults.reduce((sum, r) => sum + r.errors.length, 0);
  const totalWarnings = allResults.reduce((sum, r) => sum + r.warnings.length, 0);

  return {
    isValid: totalErrors === 0,
    totalErrors,
    totalWarnings,
    results,
    summary,
  };
}

/**
 * Format validation results for display
 */
export function formatValidationResults(result: ComprehensiveValidationResult): string {
  const lines: string[] = [];

  lines.push('='.repeat(80));
  lines.push('DESIGN TOKEN VALIDATION REPORT');
  lines.push('='.repeat(80));
  lines.push('');

  lines.push(`Status: ${result.isValid ? '✓ PASSED' : '✗ FAILED'}`);
  lines.push(`Total Errors: ${result.totalErrors}`);
  lines.push(`Total Warnings: ${result.totalWarnings}`);
  lines.push('');

  if (result.summary.passed.length > 0) {
    lines.push(`✓ Passed (${result.summary.passed.length}):`);
    result.summary.passed.forEach((item) => {
      lines.push(`  ✓ ${item}`);
    });
    lines.push('');
  }

  if (result.summary.failed.length > 0) {
    lines.push(`✗ Failed (${result.summary.failed.length}):`);
    result.summary.failed.forEach((item) => {
      lines.push(`  ✗ ${item}`);
    });
    lines.push('');
  }

  if (result.summary.warnings.length > 0) {
    lines.push(`⚠ Warnings (${result.summary.warnings.length}):`);
    result.summary.warnings.forEach((item) => {
      lines.push(`  ⚠ ${item}`);
    });
    lines.push('');
  }

  // Detailed errors
  if (result.totalErrors > 0) {
    lines.push('='.repeat(80));
    lines.push('DETAILED ERRORS');
    lines.push('='.repeat(80));
    lines.push('');

    Object.entries(result.results).forEach(([category, results]) => {
      const categoryErrors = results.filter((r) => r.errors.length > 0);
      if (categoryErrors.length > 0) {
        lines.push(`${category.toUpperCase()}:`);
        categoryErrors.forEach((r) => {
          r.errors.forEach((error) => {
            lines.push(`  Token: ${error.token}`);
            lines.push(`  Rule: ${error.rule}`);
            lines.push(`  Message: ${error.message}`);
            lines.push(`  Current: ${error.currentValue}`);
            if (error.expectedValue) {
              lines.push(`  Expected: ${error.expectedValue}`);
            }
            lines.push('');
          });
        });
      }
    });
  }

  // Detailed warnings
  if (result.totalWarnings > 0) {
    lines.push('='.repeat(80));
    lines.push('DETAILED WARNINGS');
    lines.push('='.repeat(80));
    lines.push('');

    Object.entries(result.results).forEach(([category, results]) => {
      const categoryWarnings = results.filter((r) => r.warnings.length > 0);
      if (categoryWarnings.length > 0) {
        lines.push(`${category.toUpperCase()}:`);
        categoryWarnings.forEach((r) => {
          r.warnings.forEach((warning) => {
            lines.push(`  Token: ${warning.token}`);
            lines.push(`  Message: ${warning.message}`);
            lines.push(`  Suggestion: ${warning.suggestion}`);
            lines.push('');
          });
        });
      }
    });
  }

  lines.push('='.repeat(80));

  return lines.join('\n');
}
