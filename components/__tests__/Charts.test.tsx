import React from 'react';
import { ActivityIndicator } from 'react-native';
import { render } from '@testing-library/react-native';
import { LineChart, BarChart } from '../Charts';
import type { TrendDataPoint } from '@/hooks/useTrends';

describe('LineChart', () => {
  it('shows a loading indicator while loading', () => {
    const { queryByText, UNSAFE_getAllByType } = render(
      <LineChart data={[]} loading label="Weight" />
    );
    // The label/axis render only on the data path, not while loading.
    expect(queryByText('Weight (kg)')).toBeNull();
    expect(queryByText('No data yet')).toBeNull();
    expect(UNSAFE_getAllByType(ActivityIndicator).length).toBeGreaterThan(0);
  });

  it('shows an empty state when there is no data', () => {
    const { getByText } = render(<LineChart data={[]} />);
    expect(getByText('No data yet')).toBeTruthy();
  });

  it('treats all-null values as empty', () => {
    const data: TrendDataPoint[] = [
      { date: '2026-06-01', value: null },
      { date: '2026-06-02', value: null },
    ];
    const { getByText } = render(<LineChart data={data} />);
    expect(getByText('No data yet')).toBeTruthy();
  });

  it('renders the label with unit when data is present', () => {
    const data: TrendDataPoint[] = [
      { date: '2026-06-01', value: 70 },
      { date: '2026-06-02', value: 69 },
    ];
    const { getByText, queryByText } = render(
      <LineChart data={data} label="Weight" unit="kg" />
    );
    expect(getByText('Weight (kg)')).toBeTruthy();
    expect(queryByText('No data yet')).toBeNull();
  });

  it('renders a single data point without crashing (range fallback)', () => {
    const data: TrendDataPoint[] = [{ date: '2026-06-01', value: 42 }];
    const { queryByText } = render(<LineChart data={data} label="Solo" />);
    expect(queryByText('No data yet')).toBeNull();
    expect(queryByText('Solo')).toBeTruthy();
  });

  it('renders a flat line (all equal values) without crashing', () => {
    const data: TrendDataPoint[] = [
      { date: '2026-06-01', value: 50 },
      { date: '2026-06-02', value: 50 },
      { date: '2026-06-03', value: 50 },
    ];
    const { queryByText } = render(<LineChart data={data} label="Flat" />);
    expect(queryByText('Flat')).toBeTruthy();
    expect(queryByText('No data yet')).toBeNull();
  });
});

describe('BarChart', () => {
  it('shows a loading indicator while loading', () => {
    const { queryByText, UNSAFE_getAllByType } = render(<BarChart data={[]} loading />);
    expect(queryByText('No data yet')).toBeNull();
    expect(UNSAFE_getAllByType(ActivityIndicator).length).toBeGreaterThan(0);
  });

  it('shows an empty state when there is no data', () => {
    const { getByText } = render(<BarChart data={[]} />);
    expect(getByText('No data yet')).toBeTruthy();
  });

  it('treats all-null values as empty', () => {
    const data: TrendDataPoint[] = [{ date: '2026-06-01', value: null }];
    const { getByText } = render(<BarChart data={data} />);
    expect(getByText('No data yet')).toBeTruthy();
  });

  it('renders bars and the label when data is present', () => {
    const data: TrendDataPoint[] = [
      { date: '2026-06-01', value: 50 },
      { date: '2026-06-02', value: 80 },
    ];
    const { getByText, queryByText } = render(
      <BarChart data={data} label="Habits" unit="%" />
    );
    expect(getByText('Habits (%)')).toBeTruthy();
    expect(queryByText('No data yet')).toBeNull();
  });

  it('handles an explicit maxValue without crashing', () => {
    const data: TrendDataPoint[] = [{ date: '2026-06-01', value: 25 }];
    const { queryByText } = render(<BarChart data={data} maxValue={100} label="Pct" />);
    expect(queryByText('Pct')).toBeTruthy();
    expect(queryByText('No data yet')).toBeNull();
  });
});
