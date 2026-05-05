import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert, AlertTitle, AlertDescription } from '../../pages/frontOffice/components/ui/alert.tsx';

describe('Alert component', () => {
  test('renders alert with title and description', () => {
    render(
      <Alert>
        <AlertTitle>Test title</AlertTitle>
        <AlertDescription>Test description</AlertDescription>
      </Alert>,
    );

    expect(screen.getByText(/Test title/i)).toBeDefined();
    expect(screen.getByText(/Test description/i)).toBeDefined();
  });
});
