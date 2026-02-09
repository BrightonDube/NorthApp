# Design System Scripts

This directory contains scripts for managing and validating the calm design system.

## Available Scripts

### Token Validation

The token validation system ensures all design tokens meet the calm design system requirements.

**Location**: `design-system/__tests__/token-validation.test.ts`

**Usage**:
```bash
# Run validation
npm run validate:tokens

# Run validation in CI/CD with JSON output
npm run validate:tokens:ci
```

**Documentation**: See [validation-script.md](../docs/validation-script.md) for detailed documentation.

## Script Files

### validate-tokens.ts

TypeScript implementation of the validation script. This file defines the validation configuration and runs comprehensive checks on all design tokens.

**Features**:
- Validates colors (saturation, contrast, warmth)
- Validates spacing (increase, minimums)
- Validates animations (duration, easing, stagger)
- Validates border radius (increase, minimums)
- Validates shadows (softness, opacity)
- Validates touch targets (size, spacing)
- Validates gradients (subtlety, darkness)

**Exit Codes**:
- `0` - All validations passed
- `1` - Critical violations found

### validate-tokens-runner.js

Node.js runner that loads and executes the TypeScript validation script using ts-node.

**Note**: This file is currently not used as we're using Jest to run the validation instead. It's kept for reference in case we need a standalone runner in the future.

## Adding New Scripts

When adding new scripts to this directory:

1. Create the script file (`.ts` or `.js`)
2. Add documentation to this README
3. Add NPM script to `package.json`
4. Add detailed documentation to `docs/` directory
5. Add tests if applicable

## Development

### Running Scripts Locally

All scripts can be run via NPM scripts defined in `package.json`:

```bash
# List all available scripts
npm run

# Run a specific script
npm run <script-name>
```

### Testing Scripts

Scripts should be tested before committing:

1. Run the script locally
2. Verify output is correct
3. Test error cases
4. Test in CI/CD environment

### Script Guidelines

When creating new scripts:

- Use TypeScript for type safety
- Include comprehensive error handling
- Provide clear error messages
- Support both CLI and programmatic usage
- Include usage documentation
- Add exit codes for CI/CD integration
- Support JSON output for automation

## CI/CD Integration

Scripts are integrated into the build process via `package.json` hooks:

```json
{
  "scripts": {
    "prebuild": "npm run validate:tokens"
  }
}
```

This ensures validation runs automatically before builds.

## Related Documentation

- [Validation Script Documentation](../docs/validation-script.md)
- [Design System README](../README.md)
- [Calm Design Refresh Spec](../../../.kiro/specs/calm-design-refresh/design.md)
