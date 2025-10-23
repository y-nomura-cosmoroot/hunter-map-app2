/**
 * パフォーマンス監視ユーティリティ
 * メモリ使用量、レンダリング時間、リソース使用量を監視
 */

interface PerformanceMetrics {
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  renderTime: number;
  componentRenderCount: number;
  lastUpdate: Date;
}

interface ComponentPerformance {
  name: string;
  renderCount: number;
  totalRenderTime: number;
  averageRenderTime: number;
  lastRenderTime: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private componentMetrics: Map<string, ComponentPerformance>;
  private renderStartTimes: Map<string, number>;
  private isMonitoring: boolean;

  constructor() {
    this.metrics = {
      memoryUsage: { used: 0, total: 0, percentage: 0 },
      renderTime: 0,
      componentRenderCount: 0,
      lastUpdate: new Date(),
    };
    this.componentMetrics = new Map();
    this.renderStartTimes = new Map();
    this.isMonitoring = false;
  }

  /**
   * パフォーマンス監視を開始
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // メモリ使用量の定期監視
    setInterval(() => {
      this.updateMemoryMetrics();
    }, 5000); // 5秒ごと

    console.log('Performance monitoring started');
  }

  /**
   * パフォーマンス監視を停止
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('Performance monitoring stopped');
  }

  /**
   * メモリ使用量を更新
   */
  private updateMemoryMetrics(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
        percentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100),
      };
      this.metrics.lastUpdate = new Date();

      // メモリ使用量が90%を超えた場合の警告
      if (this.metrics.memoryUsage.percentage > 90) {
        console.warn(`High memory usage detected: ${this.metrics.memoryUsage.percentage}%`);
        this.triggerMemoryCleanup();
      }
    }
  }

  /**
   * コンポーネントのレンダリング開始を記録
   */
  startRender(componentName: string): void {
    if (!this.isMonitoring) return;
    
    const startTime = performance.now();
    this.renderStartTimes.set(componentName, startTime);
  }

  /**
   * コンポーネントのレンダリング終了を記録
   */
  endRender(componentName: string): void {
    if (!this.isMonitoring) return;
    
    const startTime = this.renderStartTimes.get(componentName);
    if (!startTime) return;

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // コンポーネントメトリクスを更新
    const existing = this.componentMetrics.get(componentName);
    if (existing) {
      existing.renderCount++;
      existing.totalRenderTime += renderTime;
      existing.averageRenderTime = existing.totalRenderTime / existing.renderCount;
      existing.lastRenderTime = renderTime;
    } else {
      this.componentMetrics.set(componentName, {
        name: componentName,
        renderCount: 1,
        totalRenderTime: renderTime,
        averageRenderTime: renderTime,
        lastRenderTime: renderTime,
      });
    }

    // 全体メトリクスを更新
    this.metrics.renderTime = renderTime;
    this.metrics.componentRenderCount++;
    this.metrics.lastUpdate = new Date();

    // 遅いレンダリングの警告
    if (renderTime > 16) { // 60fps = 16.67ms per frame
      console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
    }

    this.renderStartTimes.delete(componentName);
  }

  /**
   * 現在のパフォーマンスメトリクスを取得
   */
  getMetrics(): PerformanceMetrics {
    this.updateMemoryMetrics();
    return { ...this.metrics };
  }

  /**
   * コンポーネント別のパフォーマンスメトリクスを取得
   */
  getComponentMetrics(): ComponentPerformance[] {
    return Array.from(this.componentMetrics.values());
  }

  /**
   * パフォーマンス統計をコンソールに出力
   */
  logPerformanceStats(): void {
    console.group('Performance Statistics');
    
    console.log('Memory Usage:', this.metrics.memoryUsage);
    console.log('Total Component Renders:', this.metrics.componentRenderCount);
    
    const components = this.getComponentMetrics();
    if (components.length > 0) {
      console.table(components);
    }
    
    console.groupEnd();
  }

  /**
   * メモリクリーンアップをトリガー
   */
  private triggerMemoryCleanup(): void {
    // ガベージコレクションを促す（可能な場合）
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }

    // カスタムイベントを発火してアプリケーションにクリーンアップを通知
    window.dispatchEvent(new CustomEvent('memory-cleanup-needed', {
      detail: { memoryUsage: this.metrics.memoryUsage }
    }));
  }

  /**
   * パフォーマンス警告の閾値を設定
   */
  setThresholds(_options: {
    memoryWarningPercentage?: number;
    slowRenderThreshold?: number;
  }): void {
    // 実装は必要に応じて追加
  }
}

// シングルトンインスタンス
export const performanceMonitor = new PerformanceMonitor();

/**
 * パフォーマンス統計をログ出力
 */
export function logPerformanceStats(): void {
  performanceMonitor.logPerformanceStats();
}

/**
 * 現在のメトリクスを取得
 */
export function getCurrentMetrics(): PerformanceMetrics {
  return performanceMonitor.getMetrics();
}

/**
 * コンポーネントメトリクスを取得
 */
export function getComponentStats(): ComponentPerformance[] {
  return performanceMonitor.getComponentMetrics();
}

// 開発環境でのみ監視を開始
if (import.meta.env.DEV) {
  performanceMonitor.startMonitoring();
}

export default performanceMonitor;