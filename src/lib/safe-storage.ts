/**
 * Safe localStorage wrapper to prevent QuotaExceededError
 *
 * This utility provides safe methods for localStorage operations with:
 * - Quota checking before writes
 * - Automatic cleanup of old data when quota is exceeded
 * - Graceful error handling
 * - User notification for storage issues
 */

interface StorageQuota {
  available: boolean;
  percentage: number;
  used: number;
  limit: number;
}

export class SafeStorage {
  private static readonly STORAGE_LIMIT = 5 * 1024 * 1024; // 5MB typical limit
  private static readonly QUOTA_WARNING_THRESHOLD = 80; // Warn at 80% usage
  private static readonly QUOTA_CRITICAL_THRESHOLD = 90; // Critical at 90%

  /**
   * Check current localStorage quota usage
   */
  private static checkQuota(): StorageQuota {
    try {
      // Test if localStorage is available
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);

      // Calculate current usage
      let totalBytes = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalBytes += (localStorage[key].length + key.length) * 2; // UTF-16 = 2 bytes per char
        }
      }

      const percentage = (totalBytes / this.STORAGE_LIMIT) * 100;

      return {
        available: percentage < this.QUOTA_CRITICAL_THRESHOLD,
        percentage,
        used: totalBytes,
        limit: this.STORAGE_LIMIT,
      };
    } catch {
      return {
        available: false,
        percentage: 100,
        used: this.STORAGE_LIMIT,
        limit: this.STORAGE_LIMIT,
      };
    }
  }

  /**
   * Get human-readable size
   */
  private static formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  /**
   * Cleanup old data to free space
   * Priority: Remove least important data first
   */
  private static cleanup(currentKey: string): boolean {
    const cleanupPriority = [
      'anchorViewPoints', // Can be reloaded from server
      'anchorViewTests', // Can be reloaded from server
      'anchorViewProjects', // Can be reloaded from server
      'anchorViewLocations', // Can be reloaded from server
      'anchor-projects', // Old format (legacy)
      'anchor-points', // Old format (legacy)
      'anchor-tests', // Old format (legacy)
    ];

    console.warn(`[SafeStorage] 🧹 Starting cleanup to free space (protecting: ${currentKey})`);

    for (const key of cleanupPriority) {
      if (key === currentKey) continue; // Don't delete what we're trying to save

      try {
        const itemSize = localStorage.getItem(key)?.length || 0;
        if (itemSize > 0) {
          localStorage.removeItem(key);
          console.log(`[SafeStorage] ✅ Removed ${key} (freed ${this.formatSize(itemSize * 2)})`);
          return true;
        }
      } catch (error) {
        console.error(`[SafeStorage] ❌ Failed to remove ${key}:`, error);
      }
    }

    console.error('[SafeStorage] ❌ No more data to cleanup');
    return false;
  }

  /**
   * Safely set item in localStorage with quota management
   */
  static setItem(key: string, value: string): boolean {
    try {
      const quota = this.checkQuota();
      const itemSize = (value.length + key.length) * 2; // UTF-16

      // Log warnings
      if (quota.percentage > this.QUOTA_WARNING_THRESHOLD) {
        console.warn(
          `[SafeStorage] ⚠️ Storage usage: ${quota.percentage.toFixed(1)}% ` +
          `(${this.formatSize(quota.used)} / ${this.formatSize(quota.limit)})`
        );
      }

      // If quota is critical, try cleanup
      if (!quota.available) {
        console.error(
          `[SafeStorage] 🔴 Storage quota critical: ${quota.percentage.toFixed(1)}%`
        );

        const cleanupSuccess = this.cleanup(key);

        if (!cleanupSuccess) {
          // Notify user
          this.notifyUser(
            'Armazenamento local cheio',
            'Por favor, sincronize seus dados e limpe o cache do navegador.'
          );
          return false;
        }
      }

      // Attempt to save
      localStorage.setItem(key, value);

      console.log(
        `[SafeStorage] ✅ Saved ${key} (${this.formatSize(itemSize)})`
      );

      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('[SafeStorage] 🔴 QuotaExceededError after cleanup attempt');

        // Try one more aggressive cleanup
        const freed = this.cleanup(key);

        if (freed) {
          try {
            localStorage.setItem(key, value);
            console.log('[SafeStorage] ✅ Saved after aggressive cleanup');
            return true;
          } catch (retryError) {
            console.error('[SafeStorage] ❌ Still failed after cleanup');
          }
        }

        this.notifyUser(
          'Erro ao salvar dados',
          'Armazenamento local está cheio. Sincronize seus dados ou limpe o cache.'
        );
      } else {
        console.error('[SafeStorage] ❌ Unexpected error:', error);
      }

      return false;
    }
  }

  /**
   * Safely get item from localStorage
   */
  static getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`[SafeStorage] ❌ Error reading ${key}:`, error);
      return null;
    }
  }

  /**
   * Safely remove item from localStorage
   */
  static removeItem(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`[SafeStorage] ❌ Error removing ${key}:`, error);
      return false;
    }
  }

  /**
   * Get storage statistics
   */
  static getStats(): StorageQuota {
    return this.checkQuota();
  }

  /**
   * Clear all AnchorView data (emergency cleanup)
   */
  static clearAll(): void {
    const keys = [
      'anchorViewPoints',
      'anchorViewTests',
      'anchorViewProjects',
      'anchorViewLocations',
      'anchorViewCurrentUserId',
      'anchorViewCurrentProjectId',
      'anchorViewShowArchived',
      'anchorViewLastUsedLocation',
      'anchor-projects',
      'anchor-points',
      'anchor-tests',
    ];

    for (const key of keys) {
      this.removeItem(key);
    }

    console.log('[SafeStorage] 🧹 Cleared all AnchorView data');
  }

  /**
   * Notify user about storage issues
   */
  private static notifyUser(title: string, message: string): void {
    if (typeof window !== 'undefined') {
      // Try to use toast if available
      if ((window as any).toast) {
        (window as any).toast({
          variant: 'destructive',
          title,
          description: message,
        });
      } else {
        // Fallback to alert
        alert(`${title}\n\n${message}`);
      }
    }
  }

  /**
   * Check if localStorage is available
   */
  static isAvailable(): boolean {
    try {
      const test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }
}

// Export convenience functions
export const safeLocalStorage = {
  setItem: (key: string, value: string) => SafeStorage.setItem(key, value),
  getItem: (key: string) => SafeStorage.getItem(key),
  removeItem: (key: string) => SafeStorage.removeItem(key),
  getStats: () => SafeStorage.getStats(),
  clearAll: () => SafeStorage.clearAll(),
  isAvailable: () => SafeStorage.isAvailable(),
};
