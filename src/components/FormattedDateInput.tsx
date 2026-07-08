import React from 'react';
import { CalendarDays } from 'lucide-react';
import { formatAppDate } from '../utils/formatters';

interface FormattedDateInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  focusColor?: 'blue' | 'green';
}

const FormattedDateInput: React.FC<FormattedDateInputProps> = ({
  value,
  onChange,
  disabled = false,
  focusColor = 'blue',
}) => (
  <div className="relative">
    <div className={`w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus-within:ring-2 ${
      disabled ? 'opacity-50' : ''
    } ${focusColor === 'green' ? 'focus-within:ring-green-500' : 'focus-within:ring-blue-500'}`}>
      {formatAppDate(value) || <span className="text-gray-400">Select date</span>}
    </div>
    <CalendarDays
      size={17}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
    />
    <input
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      aria-label="Select date"
      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
    />
  </div>
);

export default FormattedDateInput;
