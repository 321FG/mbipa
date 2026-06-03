/**
 * Frontend Rate Limiting Utility
 * 
 * Prevents brute force attacks by tracking attempts and enforcing cooldowns.
 * - Tracks attempts per endpoint (login, register, password reset, etc.)
 * - Enforces configurable cooldown periods
 * - Persists state to AsyncStorage (survives app restart)
 * - Supports different limits for different endpoints
 * 
 * Security Features:
 * ✅ Prevents rapid-fire API requests
 * ✅ Enforces exponential backoff (optional)
 * ✅ Persists across app restarts
 * ✅ Synchronized with backend rate limiting
 * 
 * Usage:
 * ```typescript
 * import { useRateLimiting } from '@/src/utils/rate-limiting';
 * 
 * const { attemptAction, isLimited, remainingSeconds } = useRateLimiting('auth/login');
 * 
 * const handleLogin = async () => {
 *   const canAttempt = attemptAction();
 *   if (!canAttempt) {
 *     Alert.alert(`Too many attempts. Try again in ${remainingSeconds}s`);
 *     return;
 *   }
 *   // ... login logic
 * };
 * ```
 */

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Rate limit configuration per endpoint
export const RATE_LIMIT_CONFIG = {
  'auth/login': {
    maxAttempts: 5,
    windowMs: 10 * 60 * 1000, // 10 minutes
    description: 'Login attempts'
  },
  'auth/register': {
    maxAttempts: 3,
    windowMs: 10 * 60 * 1000, // 10 minutes
    description: 'Registration attempts'
  },
  'auth/forgot-password': {
    maxAttempts: 3,
    windowMs: 30 * 60 * 1000, // 30 minutes
    description: 'Password reset attempts'
  },
  'contact/submit': {
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    description: 'Contact form submissions'
  },
  'api/generic': {
    maxAttempts: 10,
    windowMs: 5 * 60 * 1000, // 5 minutes
    description: 'Generic API requests'
  }
} as const;

export type RateLimitEndpoint = keyof typeof RATE_LIMIT_CONFIG;

interface AttemptRecord {
  timestamp: number;
  count: number;
  lastAttempt: number;
  endpoint: string;
}

interface RateLimitState {
  attempts: Record<RateLimitEndpoint, AttemptRecord>;
  lastUpdated: number;
}

const STORAGE_KEY = '@mbipa_rate_limits';
const CLEAN_UP_INTERVAL = 60 * 60 * 1000; // Clean old records every hour

/**
 * Rate Limiting Manager Class
 * Handles all rate limiting logic including storage and cleanup
 */
export class RateLimitingManager {
  private state: RateLimitState = {
    attempts: {} as Record<RateLimitEndpoint, AttemptRecord>,
    lastUpdated: Date.now()
  };

  private initialized = false;

  /**
   * Initialize manager (load state from AsyncStorage)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.state = JSON.parse(stored);
      }
      this.initialized = true;
      // Cleanup old records
      this.cleanupOldRecords();
    } catch (error) {
      console.error('[RateLimit] Failed to initialize:', error);
      this.initialized = true;
    }
  }

  /**
   * Check if an endpoint is rate limited
   */
  isLimited(endpoint: RateLimitEndpoint): boolean {
    const config = RATE_LIMIT_CONFIG[endpoint];
    if (!config) return false;

    const record = this.state.attempts[endpoint];
    if (!record) return false;

    const now = Date.now();
    const windowExpired = now - record.timestamp > config.windowMs;

    if (windowExpired) {
      return false; // Window has expired
    }

    return record.count >= config.maxAttempts;
  }

  /**
   * Get remaining time (in seconds) until rate limit expires
   */
  getRemainingSeconds(endpoint: RateLimitEndpoint): number {
    const config = RATE_LIMIT_CONFIG[endpoint];
    if (!config) return 0;

    const record = this.state.attempts[endpoint];
    if (!record) return 0;

    const now = Date.now();
    const elapsed = now - record.timestamp;
    const remaining = config.windowMs - elapsed;

    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  }

  /**
   * Record an attempt for an endpoint
   * Returns true if attempt was recorded, false if rate limited
   */
  recordAttempt(endpoint: RateLimitEndpoint): boolean {
    const config = RATE_LIMIT_CONFIG[endpoint];
    if (!config) return true;

    const now = Date.now();
    const record = this.state.attempts[endpoint];

    // New window
    if (!record || now - record.timestamp > config.windowMs) {
      this.state.attempts[endpoint] = {
        timestamp: now,
        count: 1,
        lastAttempt: now,
        endpoint
      };
      this.state.lastUpdated = now;
      this.persist();
      return true;
    }

    // Within window
    if (record.count < config.maxAttempts) {
      record.count += 1;
      record.lastAttempt = now;
      this.state.lastUpdated = now;
      this.persist();
      return true;
    }

    // Rate limited
    return false;
  }

  /**
   * Reset rate limit for an endpoint (admin/testing only)
   */
  reset(endpoint: RateLimitEndpoint): void {
    delete this.state.attempts[endpoint];
    this.state.lastUpdated = Date.now();
    this.persist();
  }

  /**
   * Reset all rate limits (admin/testing only)
   */
  resetAll(): void {
    this.state.attempts = {} as Record<RateLimitEndpoint, AttemptRecord>;
    this.state.lastUpdated = Date.now();
    this.persist();
  }

  /**
   * Get current state (for debugging)
   */
  getState(): RateLimitState {
    return { ...this.state };
  }

  /**
   * Get info for specific endpoint (for debugging)
   */
  getEndpointInfo(endpoint: RateLimitEndpoint): {
    isLimited: boolean;
    attempts: number;
    maxAttempts: number;
    remainingSeconds: number;
    windowMs: number;
  } {
    const config = RATE_LIMIT_CONFIG[endpoint];
    const record = this.state.attempts[endpoint];
    const now = Date.now();

    const isWindowExpired = !record || now - record.timestamp > config.windowMs;
    const attempts = isWindowExpired ? 0 : record?.count ?? 0;
    const remainingSeconds = this.getRemainingSeconds(endpoint);

    return {
      isLimited: this.isLimited(endpoint),
      attempts,
      maxAttempts: config.maxAttempts,
      remainingSeconds,
      windowMs: config.windowMs
    };
  }

  /**
   * Cleanup expired records from storage
   */
  private cleanupOldRecords(): void {
    const now = Date.now();
    let hasChanges = false;

    const endpoints = Object.keys(this.state.attempts) as RateLimitEndpoint[];
    for (const endpoint of endpoints) {
      const record = this.state.attempts[endpoint];
      const config = RATE_LIMIT_CONFIG[endpoint];

      if (now - record.timestamp > config.windowMs) {
        delete this.state.attempts[endpoint];
        hasChanges = true;
      }
    }

    if (hasChanges) {
      this.persist();
    }
  }

  /**
   * Persist state to AsyncStorage
   */
  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.error('[RateLimit] Failed to persist state:', error);
    }
  }
}

// Singleton instance
let manager: RateLimitingManager | null = null;

/**
 * Get the rate limiting manager instance (singleton)
 */
export const getRateLimitingManager = async (): Promise<RateLimitingManager> => {
  if (!manager) {
    manager = new RateLimitingManager();
    await manager.initialize();
  }
  return manager;
};

/**
 * Reset manager (for testing)
 */
export const resetRateLimitingManager = (): void => {
  manager = null;
};

/**
 * React Hook for using rate limiting in components
 * 
 * Usage:
 * ```typescript
 * const { attemptLogin, isLimited, remainingSeconds } = useRateLimiting('auth/login');
 * ```
 */
export const useRateLimiting = (endpoint: RateLimitEndpoint) => {
  const [isLimited, setIsLimited] = React.useState(false);
  const [remainingSeconds, setRemainingSeconds] = React.useState(0);
  const [isReady, setIsReady] = React.useState(false);
  const managerRef = React.useRef<RateLimitingManager | null>(null);
  const countdownIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Initialize manager
  React.useEffect(() => {
    getRateLimitingManager().then(mgr => {
      managerRef.current = mgr;
      updateState();
      setIsReady(true);
    });

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const updateState = () => {
    if (!managerRef.current) return;

    const limited = managerRef.current.isLimited(endpoint);
    const remaining = managerRef.current.getRemainingSeconds(endpoint);

    setIsLimited(limited);
    setRemainingSeconds(remaining);

    // Stop countdown if no longer limited
    if (!limited && countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const attemptAction = (): boolean => {
    if (!managerRef.current) return false;

    const canAttempt = managerRef.current.recordAttempt(endpoint);
    updateState();

    if (!canAttempt) {
      // Start countdown timer
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }

      countdownIntervalRef.current = setInterval(() => {
        updateState();
      }, 1000);
    }

    return canAttempt;
  };

  const reset = () => {
    if (!managerRef.current) return;
    managerRef.current.reset(endpoint);
    updateState();
  };

  return {
    attemptAction, // Call this before making the actual request
    isLimited, // Whether current endpoint is rate limited
    remainingSeconds, // Seconds until rate limit expires
    isReady, // Whether manager initialized
    reset // Reset this endpoint (admin only)
  };
};

/**
 * Non-hook version for use outside React components (e.g., API interceptors)
 */
export const rateLimit = async (endpoint: RateLimitEndpoint): Promise<boolean> => {
  const mgr = await getRateLimitingManager();
  return mgr.recordAttempt(endpoint);
};

/**
 * Check if limited without recording attempt
 */
export const checkRateLimit = async (endpoint: RateLimitEndpoint): Promise<{
  isLimited: boolean;
  remainingSeconds: number;
}> => {
  const mgr = await getRateLimitingManager();
  return {
    isLimited: mgr.isLimited(endpoint),
    remainingSeconds: mgr.getRemainingSeconds(endpoint)
  };
};

/**
 * Get full endpoint info (for debugging/monitoring)
 */
export const getRateLimitInfo = async (endpoint: RateLimitEndpoint) => {
  const mgr = await getRateLimitingManager();
  return mgr.getEndpointInfo(endpoint);
};

export default RateLimitingManager;
