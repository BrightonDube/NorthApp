import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';

/**
 * Custom render function that wraps components with necessary providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  // For now, we don't have any global providers
  // This can be extended later when we add context providers
  return render(ui, options);
}

/**
 * Re-export everything from React Native Testing Library
 */
export * from '@testing-library/react-native';

/**
 * Custom render as default export
 */
export { renderWithProviders as render };
