import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar, AvatarImage, AvatarFallback } from '../../pages/frontOffice/components/ui/avatar.tsx';

describe('Avatar component', () => {
  test('renders avatar fallback content', () => {
    render(
      <Avatar>
        <AvatarImage src="/avatar.png" alt="avatar" />
        <AvatarFallback>AV</AvatarFallback>
      </Avatar>,
    );

    expect(screen.getByText(/AV/i)).toBeDefined();
  });
});
