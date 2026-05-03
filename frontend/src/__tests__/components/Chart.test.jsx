import React from 'react';
import { describe, test, expect } from 'vitest';
import { ChartContainer } from '../../pages/frontOffice/components/ui/chart.tsx';

describe('Chart component', () => {
  test('exports ChartContainer', () => {
    expect(ChartContainer).toBeDefined();
  });
});
