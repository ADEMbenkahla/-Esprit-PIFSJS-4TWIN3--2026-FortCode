import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AspectRatio } from '../../pages/frontOffice/components/ui/aspect-ratio.tsx';

describe('AspectRatio component', () => {
  test('renders a child inside the aspect ratio wrapper', () => {
    render(
      <AspectRatio ratio={16 / 9}>
        <div>Aspect child</div>
      </AspectRatio>,
    );

    expect(screen.getByText(/Aspect child/i)).toBeDefined();
  });
});
