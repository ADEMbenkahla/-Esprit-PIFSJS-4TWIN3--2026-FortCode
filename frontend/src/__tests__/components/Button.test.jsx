import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../../pages/frontOffice/components/ui/Button.tsx';

describe('Button component', () => {
  test('renders a button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText(/Click me/i)).toBeDefined();
  });
});
