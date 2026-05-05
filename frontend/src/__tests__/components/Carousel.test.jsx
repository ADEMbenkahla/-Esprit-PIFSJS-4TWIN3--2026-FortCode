import React from 'react';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockApi = {
  scrollPrev: vi.fn(),
  scrollNext: vi.fn(),
  canScrollPrev: vi.fn(() => true),
  canScrollNext: vi.fn(() => true),
  on: vi.fn(),
  off: vi.fn(),
};

vi.mock('embla-carousel-react', () => ({
  __esModule: true,
  default: vi.fn(() => [vi.fn(), mockApi]),
  useEmblaCarousel: vi.fn(() => [vi.fn(), mockApi]),
}));

vi.mock('../../pages/frontOffice/components/ui/button.tsx', () => ({
  __esModule: true,
  Button: ({ children, ...props }) => (
    <button type="button" {...props}>{children}</button>
  ),
}));

let Carousel;

describe('Carousel Component', () => {
  beforeAll(async () => {
    ({ Carousel } = await import('../../pages/frontOffice/components/ui/carousel.tsx'));
  });

  beforeEach(() => {
    mockApi.scrollPrev.mockClear();
    mockApi.scrollNext.mockClear();
    mockApi.canScrollPrev.mockClear();
    mockApi.canScrollNext.mockClear();
    mockApi.on.mockClear();
    mockApi.off.mockClear();
  });

  test('rend le carousel et son contenu', () => {
    render(
      <Carousel>
        <div data-testid="carousel-child">Slide</div>
      </Carousel>
    );

    expect(screen.getByRole('region')).toBeDefined();
    expect(screen.getByTestId('carousel-child')).toBeDefined();
  });
});
