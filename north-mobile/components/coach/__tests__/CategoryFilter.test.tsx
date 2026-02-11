/**
 * CategoryFilter Component Tests
 * 
 * Unit tests for the CategoryFilter component.
 * Tests rendering, interaction, and accessibility.
 * 
 * Validates: Requirements 5.2, 5.4
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CategoryFilter } from '../CategoryFilter';
import { CoachCategory } from '@/types';

describe('CategoryFilter', () => {
  const mockOnSelectCategory = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all categories plus "All" option', () => {
    const { getByTestId } = render(
      <CategoryFilter
        selectedCategory={null}
        onSelectCategory={mockOnSelectCategory}
      />
    );

    // Check that all category buttons exist
    expect(getByTestId('category-filter-all')).toBeTruthy();
    expect(getByTestId(`category-filter-${CoachCategory.PRODUCTIVITY}`)).toBeTruthy();
    expect(getByTestId(`category-filter-${CoachCategory.LEARNING}`)).toBeTruthy();
    expect(getByTestId(`category-filter-${CoachCategory.HEALTH}`)).toBeTruthy();
    expect(getByTestId(`category-filter-${CoachCategory.ENTERTAINMENT}`)).toBeTruthy();
    expect(getByTestId(`category-filter-${CoachCategory.BUSINESS}`)).toBeTruthy();
    expect(getByTestId(`category-filter-${CoachCategory.CREATIVE}`)).toBeTruthy();
    expect(getByTestId(`category-filter-${CoachCategory.GENERAL}`)).toBeTruthy();
  });

  it('highlights the selected category', () => {
    const { getByTestId } = render(
      <CategoryFilter
        selectedCategory={CoachCategory.PRODUCTIVITY}
        onSelectCategory={mockOnSelectCategory}
      />
    );

    const productivityButton = getByTestId(`category-filter-${CoachCategory.PRODUCTIVITY}`);
    
    // Check accessibility state
    expect(productivityButton.props.accessibilityState.selected).toBe(true);
  });

  it('highlights "All" when no category is selected', () => {
    const { getByTestId } = render(
      <CategoryFilter
        selectedCategory={null}
        onSelectCategory={mockOnSelectCategory}
      />
    );

    const allButton = getByTestId('category-filter-all');
    
    // Check accessibility state
    expect(allButton.props.accessibilityState.selected).toBe(true);
  });

  it('calls onSelectCategory when a category is pressed', () => {
    const { getByTestId } = render(
      <CategoryFilter
        selectedCategory={null}
        onSelectCategory={mockOnSelectCategory}
      />
    );

    const productivityButton = getByTestId(`category-filter-${CoachCategory.PRODUCTIVITY}`);
    fireEvent.press(productivityButton);

    expect(mockOnSelectCategory).toHaveBeenCalledWith(CoachCategory.PRODUCTIVITY);
    expect(mockOnSelectCategory).toHaveBeenCalledTimes(1);
  });

  it('calls onSelectCategory with null when "All" is pressed', () => {
    const { getByTestId } = render(
      <CategoryFilter
        selectedCategory={CoachCategory.PRODUCTIVITY}
        onSelectCategory={mockOnSelectCategory}
      />
    );

    const allButton = getByTestId('category-filter-all');
    fireEvent.press(allButton);

    expect(mockOnSelectCategory).toHaveBeenCalledWith(null);
    expect(mockOnSelectCategory).toHaveBeenCalledTimes(1);
  });

  it('has proper accessibility labels', () => {
    const { getByTestId } = render(
      <CategoryFilter
        selectedCategory={null}
        onSelectCategory={mockOnSelectCategory}
      />
    );

    const allButton = getByTestId('category-filter-all');
    const productivityButton = getByTestId(`category-filter-${CoachCategory.PRODUCTIVITY}`);

    expect(allButton.props.accessibilityLabel).toBe('Filter by All');
    expect(productivityButton.props.accessibilityLabel).toBe('Filter by Productivity');
  });

  it('renders as a horizontal scrollable list', () => {
    const { getByTestId } = render(
      <CategoryFilter
        selectedCategory={null}
        onSelectCategory={mockOnSelectCategory}
      />
    );

    const scrollView = getByTestId('category-filter-scroll');
    expect(scrollView.props.horizontal).toBe(true);
    expect(scrollView.props.showsHorizontalScrollIndicator).toBe(false);
  });

  it('supports custom testID', () => {
    const { getByTestId } = render(
      <CategoryFilter
        selectedCategory={null}
        onSelectCategory={mockOnSelectCategory}
        testID="custom-filter"
      />
    );

    expect(getByTestId('custom-filter')).toBeTruthy();
    expect(getByTestId('custom-filter-all')).toBeTruthy();
  });
});
