import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';

export interface MultiSelectOption {
  label: string;
  value: string;
  count?: number;
}

interface MultiSelectDropdownProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  maxDisplayTags?: number;
  className?: string;
  disabled?: boolean;
}

export default function MultiSelectDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select options',
  maxDisplayTags = 2,
  className = '',
  disabled = false
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options based on search query
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle option toggle
  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  // Handle remove tag
  const removeValue = (optionValue: string) => {
    onChange(value.filter(v => v !== optionValue));
  };

  // Clear all selections
  const clearAll = () => {
    onChange([]);
    setSearchQuery('');
  };

  // Get label for a value
  const getLabelForValue = (val: string) => {
    return options.find(opt => opt.value === val)?.label || val;
  };

  // Calculate display tags
  const displayTags = value.slice(0, maxDisplayTags);
  const remainingCount = value.length - maxDisplayTags;

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-texas-blue-500/50 cursor-pointer'
        } ${isOpen ? 'ring-2 ring-ring ring-offset-2' : ''}`}
      >
        <div className="flex-1 flex items-center gap-1 flex-wrap min-h-[20px]">
          {value.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            <>
              {displayTags.map(val => (
                <span
                  key={val}
                  className="inline-flex items-center gap-1 rounded-md bg-texas-blue-500/10 px-2 py-0.5 text-xs font-medium text-texas-blue-500"
                >
                  {getLabelForValue(val)}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeValue(val);
                    }}
                    className="hover:bg-texas-blue-500/20 rounded-sm p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {remainingCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  +{remainingCount} more
                </span>
              )}
            </>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-[9999] mt-2 w-full rounded-md border border-border bg-white shadow-lg">
          {/* Search Input */}
          <div className="p-2 border-b border-border">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-md border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-texas-blue-500"
            />
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto p-2">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No options found
              </div>
            ) : (
              <>
                {filteredOptions.map((option) => {
                  const isSelected = value.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleOption(option.value)}
                      className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors text-left"
                    >
                      <div className={`flex h-4 w-4 items-center justify-center rounded border ${
                        isSelected ? 'bg-texas-blue-500 border-texas-blue-500' : 'border-border'
                      }`}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className="flex-1">{option.label}</span>
                      {option.count !== undefined && (
                        <span className="text-xs text-muted-foreground">({option.count})</span>
                      )}
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Footer with Clear All */}
          {value.length > 0 && (
            <div className="p-2 border-t border-border">
              <button
                type="button"
                onClick={clearAll}
                className="w-full rounded-md px-3 py-1.5 text-sm text-texas-blue-500 hover:bg-accent transition-colors"
              >
                Clear all ({value.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
