import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Checkbox } from '../../pages/frontOffice/components/ui/checkbox.tsx';

describe('Checkbox component', () => {
  test('renders a checkbox input', () => {
    render(<Checkbox id="checkbox-test" />);
    expect(screen.getByRole('checkbox')).toBeDefined();
  });
});
