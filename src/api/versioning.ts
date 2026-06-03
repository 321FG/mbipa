# src/api/versioning.ts - API Versioning Strategy

/**
 * API Versioning Manager
 * 
 * Handles API version negotiation and backwards compatibility
 * Supports graceful migration from v0 (legacy) to v1+ (current)
 * 
 * Strategy:
 * - All new endpoints use /api/v1/ prefix
 * - Legacy endpoints (/api/) fallback to v0 for compatibility
 * - Version negotiation based on app build number
 * - Graceful degradation if new endpoint fails
 */

import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// Types & Interfaces
// ============================================================================

export enum APIVersion {
  V0 = 'v0',      // Legacy (pre-P0.4)
  V1 = 'v1',      // Current (P0.4+)
  V2 = 'v2'       // Future
}

export interface VersionConfig {
  supportedVersions: APIVersion[];
  preferredVersion: APIVersion;
  fallbackVersion: APIVersion;
  minBuildNumberForV1: number;
  enableMigrationLogging: boolean;
}

export interface VersionContext {
  appBuildNumber: number;
  detectedVersion: APIVersion;
  isLegacyApp: boolean;
  lastSuccessfulVersion: APIVersion;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_VERSION_CONFIG: VersionConfig = {
  supportedVersions: [APIVersion.V1, APIVersion.V0],  // Try V1 first, fallback to V0
  preferredVersion: APIVersion.V1,
  fallbackVersion: APIVersion.V0,
  minBuildNumberForV1: 1,  // V1 available from build 1+
  enableMigrationLogging: true
};

const VERSION_CACHE_KEY = 'api_version_context';
const MIGRATION_LOG_KEY = 'api_version_migration_log';

// ============================================================================
// API Versioning Manager
// ============================================================================

class APIVersioningManager {
  private config: VersionConfig;
  private context: VersionContext | null = null;
  private migrationLog: Array<{ timestamp: string; from: APIVersion; to: APIVersion; reason: string }> = [];

  constructor(config: Partial<VersionConfig> = {}) {
    this.config = { ...DEFAULT_VERSION_CONFIG, ...config };
  }

  /**
   * Initialize versioning context
   * Should be called once on app startup
   */
  async initialize(): Promise<void> {
    try {
      // Try to load cached version context
      const cached = await AsyncStorage.getItem(VERSION_CACHE_KEY);
      if (cached) {
        this.context = JSON.parse(cached);
      }

      // Initialize context if not cached
      if (!this.context) {
        const appBuildNumber = parseInt(
          Constants.expoConfig?.ios?.buildNumber ||
          Constants.expoConfig?.android?.versionCode ||
          '1',
          10
        );

        this.context = {
          appBuildNumber,
          detectedVersion: this.getVersionForBuild(appBuildNumber),
          isLegacyApp: appBuildNumber < this.config.minBuildNumberForV1,
          lastSuccessfulVersion: this.config.preferredVersion
        };

        await this.saveContext();
      }

      // Load migration log
      await this.loadMigrationLog();

      this.log(`Versioning initialized. App Build: ${this.context.appBuildNumber}, Version: ${this.context.detectedVersion}`);
    } catch (error) {
      console.error('Failed to initialize versioning:', error);
      // Fallback to legacy
      this.context = {
        appBuildNumber: 1,
        detectedVersion: APIVersion.V0,
        isLegacyApp: true,
        lastSuccessfulVersion: APIVersion.V0
      };
    }
  }

  /**
   * Get the full API endpoint with version prefix
   * Example: '/api/chat/tts' → '/api/v1/chat/tts'
   */
  getVersionedEndpoint(endpoint: string, preferVersion?: APIVersion): string {
    const version = preferVersion || this.getPreferredVersion();

    // Handle already-versioned endpoints
    if (endpoint.match(/\/api\/v\d+\//)) {
      return endpoint;
    }

    // Remove leading /api/ if present
    const cleanEndpoint = endpoint.replace(/^\/api\//, '');

    // Add versioning
    return `/api/${version}/${cleanEndpoint}`;
  }

  /**
   * Get preferred API version based on app state
   */
  getPreferredVersion(): APIVersion {
    if (!this.context) {
      return this.config.preferredVersion;
    }

    // If legacy app, always use v0
    if (this.context.isLegacyApp) {
      return APIVersion.V0;
    }

    // Use last successful version (handles backend downtime)
    return this.context.lastSuccessfulVersion || this.config.preferredVersion;
  }

  /**
   * Report successful API call with specific version
   * This updates lastSuccessfulVersion for future calls
   */
  async reportSuccess(version: APIVersion, endpoint: string): Promise<void> {
    if (!this.context) return;

    if (this.context.lastSuccessfulVersion !== version) {
      this.log(`API call succeeded with ${version} (endpoint: ${endpoint})`);
      this.context.lastSuccessfulVersion = version;
      await this.saveContext();
    }
  }

  /**
   * Report API call failure and handle version fallback
   * Returns suggested fallback version or null if none available
   */
  async reportFailure(
    version: APIVersion,
    endpoint: string,
    error: Error | string
  ): Promise<APIVersion | null> {
    if (!this.context) return null;

    const errorMsg = String(error);
    this.log(`API call failed with ${version}: ${errorMsg}`);

    // Find fallback version
    const fallbackVersion = this.config.supportedVersions.find(v => v !== version);

    if (fallbackVersion) {
      this.recordMigration(version, fallbackVersion, `Failed: ${errorMsg}`);
      this.context.lastSuccessfulVersion = fallbackVersion;
      await this.saveContext();
      return fallbackVersion;
    }

    return null;
  }

  /**
   * Determine API version based on app build number
   */
  private getVersionForBuild(buildNumber: number): APIVersion {
    if (buildNumber < this.config.minBuildNumberForV1) {
      return APIVersion.V0;
    }
    return this.config.preferredVersion;
  }

  /**
   * Record version migration for debugging
   */
  private recordMigration(from: APIVersion, to: APIVersion, reason: string): void {
    this.migrationLog.push({
      timestamp: new Date().toISOString(),
      from,
      to,
      reason
    });

    // Keep only last 50 migrations
    if (this.migrationLog.length > 50) {
      this.migrationLog = this.migrationLog.slice(-50);
    }

    this.saveMigrationLog();
  }

  /**
   * Get current versioning context (for debugging)
   */
  getContext(): VersionContext | null {
    return this.context;
  }

  /**
   * Get migration history (for debugging)
   */
  getMigrationLog(): typeof this.migrationLog {
    return [...this.migrationLog];
  }

  /**
   * Clear migration log (for testing)
   */
  async clearMigrationLog(): Promise<void> {
    this.migrationLog = [];
    await AsyncStorage.removeItem(MIGRATION_LOG_KEY);
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  private async saveContext(): Promise<void> {
    try {
      if (this.context) {
        await AsyncStorage.setItem(VERSION_CACHE_KEY, JSON.stringify(this.context));
      }
    } catch (error) {
      console.error('Failed to save versioning context:', error);
    }
  }

  private async loadMigrationLog(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(MIGRATION_LOG_KEY);
      if (data) {
        this.migrationLog = JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load migration log:', error);
      this.migrationLog = [];
    }
  }

  private async saveMigrationLog(): Promise<void> {
    try {
      await AsyncStorage.setItem(MIGRATION_LOG_KEY, JSON.stringify(this.migrationLog));
    } catch (error) {
      console.error('Failed to save migration log:', error);
    }
  }

  private log(message: string): void {
    if (this.config.enableMigrationLogging) {
      console.log(`[API Versioning] ${message}`);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let versioningManager: APIVersioningManager | null = null;

export function getVersioningManager(config?: Partial<VersionConfig>): APIVersioningManager {
  if (!versioningManager) {
    versioningManager = new APIVersioningManager(config);
  }
  return versioningManager;
}

// ============================================================================
// HTTP Client Integration
// ============================================================================

/**
 * Axios interceptor for automatic version negotiation
 * Usage: Add to axios instance
 */
export function createVersioningInterceptor(apiClient: any) {
  // Request interceptor: Add version to URL
  apiClient.interceptors.request.use((config: any) => {
    const manager = getVersioningManager();
    config.url = manager.getVersionedEndpoint(config.url);
    return config;
  });

  // Response interceptor: Handle version fallback on failure
  apiClient.interceptors.response.use(
    (response: any) => {
      const manager = getVersioningManager();
      const version = extractVersionFromUrl(response.config.url) || APIVersion.V1;
      manager.reportSuccess(version, response.config.url);
      return response;
    },
    async (error: any) => {
      const manager = getVersioningManager();
      const currentVersion = extractVersionFromUrl(error.config.url) || APIVersion.V1;

      // Only retry once to prevent infinite loops
      if (!error.config._retryWithFallback) {
        const fallbackVersion = await manager.reportFailure(
          currentVersion,
          error.config.url,
          error.message
        );

        if (fallbackVersion && fallbackVersion !== currentVersion) {
          error.config._retryWithFallback = true;
          error.config.url = manager.getVersionedEndpoint(
            error.config.url.replace(/\/api\/v\d+\//, '/api/'),
            fallbackVersion
          );
          return apiClient.request(error.config);
        }
      }

      return Promise.reject(error);
    }
  );
}

/**
 * Extract version from URL
 * Example: '/api/v1/chat/tts' → 'v1'
 */
function extractVersionFromUrl(url: string): APIVersion | null {
  const match = url.match(/\/api\/(v\d+)\//);
  if (match) {
    const version = match[1] as APIVersion;
    if (Object.values(APIVersion).includes(version)) {
      return version;
    }
  }
  return null;
}

// ============================================================================
// Export
// ============================================================================

export default getVersioningManager();
