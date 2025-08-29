import { useState, useEffect } from 'react';

/**
 * Hook that delays updating a value until after a specified delay period has passed
 * without the value changing. Useful for search inputs to avoid excessive API calls.
 * 
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set a timeout to update the debounced value after the delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function that will cancel the timeout if value changes before delay
    // This is the key to the debouncing behavior
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;