"use client";

/**
 * Safe State Management Hooks
 * ===========================
 *
 * These hooks prevent common React issues:
 * - State updates on unmounted components
 * - Memory leaks from lingering timeouts
 * - Race conditions with async operations
 *
 * Usage:
 *   import { useSafeState, useSafeTimeout } from '@/hooks/use-safe-state';
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ============================================
// useSafeState Hook
// ============================================

/**
 * A useState hook that prevents updates after component unmount
 *
 * This prevents the React warning:
 * "Can't perform a React state update on an unmounted component"
 *
 * The hook tracks whether the component is mounted and only
 * allows state updates while mounted.
 *
 * @param initialValue - Initial state value
 * @returns Tuple of [state, setSafeState] similar to useState
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const [data, setData] = useSafeState(null);
 *
 *   useEffect(() => {
 *     fetchData().then(result => {
 *       // Safe even if component unmounts before fetch completes
 *       setData(result);
 *     });
 *   }, []);
 *
 *   return <div>{data}</div>;
 * }
 * ```
 */
export function useSafeState<T>(
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // The actual state
  const [state, setState] = useState<T>(initialValue);

  // Ref to track if component is mounted
  // Using ref so it doesn't cause re-renders
  const isMountedRef = useRef(true);

  // Set up mount tracking
  useEffect(() => {
    // Mark as mounted when effect runs
    isMountedRef.current = true;

    // Mark as unmounted on cleanup
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Safe setState that checks mount status
  const setSafeState = useCallback((value: T | ((prev: T) => T)) => {
    // Only update if still mounted
    if (isMountedRef.current) {
      setState(value);
    }
  }, []);

  return [state, setSafeState];
}

// ============================================
// useSafeTimeout Hook
// ============================================

/**
 * A timeout hook that automatically clears on unmount
 *
 * This prevents memory leaks and stale state updates from
 * timeouts that fire after a component unmounts.
 *
 * @returns Object with setSafeTimeout and clearSafeTimeout functions
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { setSafeTimeout, clearSafeTimeout } = useSafeTimeout();
 *   const [isVisible, setIsVisible] = useState(true);
 *
 *   const hideAfterDelay = () => {
 *     setSafeTimeout(() => {
 *       setIsVisible(false);
 *     }, 3000);
 *   };
 *
 *   return (
 *     <button onClick={hideAfterDelay}>
 *       Hide after 3 seconds
 *     </button>
 *   );
 * }
 * ```
 */
export function useSafeTimeout() {
  // Store the current timeout ID
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Store mounted state
  const isMountedRef = useRef(true);

  // Track mount status and clear timeout on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      // Clear any pending timeout when component unmounts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  /**
   * Set a timeout that will be automatically cleared on unmount
   * Also clears any previous timeout before setting a new one
   */
  const setSafeTimeout = useCallback((
    callback: () => void,
    delay: number
  ) => {
    // Clear any existing timeout first
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set the new timeout
    timeoutRef.current = setTimeout(() => {
      // Only execute if still mounted
      if (isMountedRef.current) {
        callback();
      }
      // Clear the ref after execution
      timeoutRef.current = null;
    }, delay);
  }, []);

  /**
   * Manually clear the current timeout
   */
  const clearSafeTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return {
    setSafeTimeout,
    clearSafeTimeout,
  };
}

// ============================================
// useSafeInterval Hook
// ============================================

/**
 * An interval hook that automatically clears on unmount
 *
 * @returns Object with setSafeInterval and clearSafeInterval functions
 *
 * @example
 * ```typescript
 * function Timer() {
 *   const [count, setCount] = useState(0);
 *   const { setSafeInterval, clearSafeInterval } = useSafeInterval();
 *
 *   useEffect(() => {
 *     setSafeInterval(() => setCount(c => c + 1), 1000);
 *     return () => clearSafeInterval();
 *   }, []);
 *
 *   return <div>{count}</div>;
 * }
 * ```
 */
export function useSafeInterval() {
  // Store the current interval ID
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Store mounted state
  const isMountedRef = useRef(true);

  // Track mount status and clear interval on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  /**
   * Set an interval that will be automatically cleared on unmount
   */
  const setSafeInterval = useCallback((
    callback: () => void,
    delay: number
  ) => {
    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set the new interval
    intervalRef.current = setInterval(() => {
      // Only execute if still mounted
      if (isMountedRef.current) {
        callback();
      }
    }, delay);
  }, []);

  /**
   * Manually clear the current interval
   */
  const clearSafeInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return {
    setSafeInterval,
    clearSafeInterval,
  };
}

// ============================================
// useIsMounted Hook
// ============================================

/**
 * Simple hook to check if component is mounted
 *
 * Useful for async operations where you need to check
 * mount status before updating state.
 *
 * @returns Function that returns true if mounted
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const isMounted = useIsMounted();
 *   const [data, setData] = useState(null);
 *
 *   useEffect(() => {
 *     fetchData().then(result => {
 *       if (isMounted()) {
 *         setData(result);
 *       }
 *     });
 *   }, []);
 * }
 * ```
 */
export function useIsMounted(): () => boolean {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return useCallback(() => isMountedRef.current, []);
}
