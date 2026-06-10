import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { InputField, PrimaryButton, Chip } from '../Inputs';

describe('InputField', () => {
  it('renders its label and current value', () => {
    const { getByText, getByDisplayValue } = render(
      <InputField label="Weight" value="68.5" onChangeText={() => {}} />
    );
    expect(getByText('Weight')).toBeTruthy();
    expect(getByDisplayValue('68.5')).toBeTruthy();
  });

  it('shows the unit and error text when provided', () => {
    const { getByText } = render(
      <InputField label="Weight" value="" onChangeText={() => {}} unit="kg" error="Required" />
    );
    expect(getByText('kg')).toBeTruthy();
    expect(getByText('Required')).toBeTruthy();
  });

  it('emits typed text through onChangeText', () => {
    const onChangeText = jest.fn();
    const { getByDisplayValue } = render(
      <InputField label="Weight" value="68" onChangeText={onChangeText} />
    );
    fireEvent.changeText(getByDisplayValue('68'), '68.');
    expect(onChangeText).toHaveBeenCalledWith('68.');
  });
});

describe('PrimaryButton', () => {
  it('fires onPress when enabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<PrimaryButton label="Save" onPress={onPress} />);
    fireEvent.press(getByText('Save'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows "Saving..." and does not fire onPress while loading', () => {
    const onPress = jest.fn();
    const { getByText, queryByText } = render(
      <PrimaryButton label="Save" onPress={onPress} loading />
    );
    expect(getByText('Saving...')).toBeTruthy();
    expect(queryByText('Save')).toBeNull();
    fireEvent.press(getByText('Saving...'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not fire onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<PrimaryButton label="Save" onPress={onPress} disabled />);
    fireEvent.press(getByText('Save'));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Chip', () => {
  it('renders its label and responds to taps', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Chip label="Breakfast" selected={false} onPress={onPress} />);
    fireEvent.press(getByText('Breakfast'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
