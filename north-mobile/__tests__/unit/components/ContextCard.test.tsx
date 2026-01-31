/**
 * Unit Tests for ContextCard Component
 * 
 * Tests rendering, interactions, and accessibility of the ContextCard component.
 * 
 * Validates: Requirements 14.2, 14.6, 14.7
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ContextCard } from '@/components/context/ContextCard';
import type { UserContext } from '@/types';

describe('ContextCard', () => {
  const mockContext: UserContext = {
    id: '1',
    userId: 'user-1',
    category: 'values',
    content: 'I value transparency over politics',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the context content', () => {
      const { getByText } = render(
        <ContextCard
          context={mockContext}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('I value transparency over politics')).toBeTruthy();
    });

    it('should render the category label', () => {
      const { getByText } = render(
        <ContextCard
          context={mockContext}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Value')).toBeTruthy();
    });

    it('should render different category labels correctly', () => {
      const categories: Array<{ category: UserContext['category']; label: string }> = [
        { category: 'values', label: 'Value' },
        { category: 'goals', label: 'Goal' },
        { category: 'projects', label: 'Project' },
        { category: 'constraints', label: 'Constraint' },
      ];

      categories.forEach(({ category, label }) => {
        const context = { ...mockContext, category };
        const { getByText } = render(
          <ContextCard
            context={context}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        );

        expect(getByText(label)).toBeTruthy();
      });
    });
  });

  describe('Interactions', () => {
    it('should call onEdit when card is pressed', () => {
      const { getByText } = render(
        <ContextCard
          context={mockContext}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      fireEvent.press(getByText('I value transparency over politics'));
      expect(mockOnEdit).toHaveBeenCalledTimes(1);
    });

    it('should call onDelete when delete button is pressed', () => {
      const { getByText } = render(
        <ContextCard
          context={mockContext}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      fireEvent.press(getByText('Delete'));
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByLabelText } = render(
        <ContextCard
          context={mockContext}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(
        getByLabelText('Value: I value transparency over politics')
      ).toBeTruthy();
      expect(getByLabelText('Delete context item')).toBeTruthy();
    });

    it('should have proper accessibility roles', () => {
      const { getAllByRole } = render(
        <ContextCard
          context={mockContext}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // Both the card and delete button should have button role
      const buttons = getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Content Truncation', () => {
    it('should truncate long content to 3 lines', () => {
      const longContext = {
        ...mockContext,
        content: 'This is a very long content that should be truncated to three lines maximum. '.repeat(10),
      };

      const { getByText } = render(
        <ContextCard
          context={longContext}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const contentElement = getByText(longContext.content);
      expect(contentElement.props.numberOfLines).toBe(3);
    });
  });
});
