/**
 * BufferMetrics - Metrics collection and reporting for work buffer
 *
 * Provides structured metrics collection, aggregation, and export
 * for monitoring and alerting on buffer health.
 *
 * @module workbuffer/utils/BufferMetrics
 */

import { EventEmitter } from 'events';
import logger from '../../utils/logger.js';

/**
 * BufferMetrics class
 *
 * @extends EventEmitter
 * @emits metric - When a new metric is recorded
 * @emits alert - When a metric crosses a threshold
 */
export class BufferMetrics extends EventEmitter {
  constructor(options = {}) {
    super();

    this.logPrefix = '[BufferMetrics]';
    this.alertThresholds = options.alertThresholds || {
      queueDepthWarning: 1000,
      queueDepthCritical: 5000,
      processingTimeWarning: 10000, // 10 seconds
      processingTimeCritical: 30000, // 30 seconds
      errorRateWarning: 0.1, // 10%
      errorRateCritical: 0.25, // 25%
      dlqSizeWarning: 100,
      dlqSizeCritical: 500,
      oldestMessageAgeWarning: 300000, // 5 minutes
      oldestMessageAgeCritical: 900000, // 15 minutes
    };

    // Time-series data (last hour, 1-minute buckets)
    this.timeSeries = {
      enqueued: new Array(60).fill(0),
      processed: new Array(60).fill(0),
      failed: new Array(60).fill(0),
      processingTimes: new Array(60).fill([]),
      currentBucket: 0,
      lastRotation: Date.now(),
    };

    // Cumulative counters
    this.counters = {
      totalEnqueued: 0,
      totalProcessed: 0,
      totalFailed: 0,
      totalRetries: 0,
      totalDLQ: 0,
      totalErrors: 0,
    };

    // Current state
    this.state = {
      queueDepth: 0,
      activeWorkers: 0,
      dlqSize: 0,
      oldestPendingAge: 0,
    };

    // Performance metrics
    this.performance = {
      avgProcessingTimeMs: 0,
      p50ProcessingTimeMs: 0,
      p95ProcessingTimeMs: 0,
      p99ProcessingTimeMs: 0,
      maxProcessingTimeMs: 0,
    };

    // Handler-specific metrics
    this.handlerMetrics = new Map(); // type -> metrics

    // Start rotation timer
    this.rotationTimer = setInterval(() => this.rotateBucket(), 60000); // 1 minute
  }

  /**
   * Record a message enqueued event
   * @param {Object} data - Event data
   */
  recordEnqueued(data) {
    this.counters.totalEnqueued++;
    this.timeSeries.enqueued[this.timeSeries.currentBucket]++;

    // Track by handler type
    this.incrementHandlerMetric(data.type, 'enqueued');

    this.emit('metric', {
      type: 'enqueued',
      ...data,
      timestamp: new Date(),
    });
  }

  /**
   * Record a message completed event
   * @param {Object} data - Event data with processingTime
   */
  recordCompleted(data) {
    this.counters.totalProcessed++;
    this.timeSeries.processed[this.timeSeries.currentBucket]++;

    // Record processing time
    if (data.processingTime) {
      this.timeSeries.processingTimes[this.timeSeries.currentBucket].push(
        data.processingTime
      );
      this.updateProcessingTimeMetrics();
    }

    // Track by handler type
    this.incrementHandlerMetric(data.type, 'completed');
    if (data.processingTime) {
      this.addHandlerProcessingTime(data.type, data.processingTime);
    }

    this.emit('metric', {
      type: 'completed',
      ...data,
      timestamp: new Date(),
    });
  }

  /**
   * Record a message failed event
   * @param {Object} data - Event data
   */
  recordFailed(data) {
    if (data.willRetry) {
      this.counters.totalRetries++;
    } else {
      this.counters.totalFailed++;
    }

    this.timeSeries.failed[this.timeSeries.currentBucket]++;

    // Track by handler type
    this.incrementHandlerMetric(data.type, 'failed');

    this.emit('metric', {
      type: 'failed',
      ...data,
      timestamp: new Date(),
    });

    // Check error rate threshold
    this.checkErrorRateThreshold();
  }

  /**
   * Record a DLQ event
   * @param {Object} data - Event data
   */
  recordDLQ(data) {
    this.counters.totalDLQ++;

    // Track by handler type
    this.incrementHandlerMetric(data.type, 'dlq');

    this.emit('metric', {
      type: 'dlq',
      ...data,
      timestamp: new Date(),
    });
  }

  /**
   * Update queue state metrics
   * @param {Object} stats - Queue statistics
   */
  updateQueueStats(stats) {
    this.state.queueDepth = stats.pending || 0;
    this.state.activeWorkers = stats.activeWorkers || 0;
    this.state.dlqSize = stats.dlq || 0;
    this.state.oldestPendingAge = stats.oldestPendingAge || 0;

    // Check thresholds
    this.checkQueueDepthThreshold();
    this.checkDLQSizeThreshold();
    this.checkOldestMessageAgeThreshold();
  }

  /**
   * Get current metrics snapshot
   * @returns {Object}
   */
  getSnapshot() {
    const now = Date.now();
    const lastMinute = this.timeSeries.enqueued[this.timeSeries.currentBucket];
    const lastMinuteProcessed = this.timeSeries.processed[this.timeSeries.currentBucket];
    const lastMinuteFailed = this.timeSeries.failed[this.timeSeries.currentBucket];

    // Calculate rates (per second)
    const enqueueRate = lastMinute / 60;
    const processRate = lastMinuteProcessed / 60;
    const errorRate =
      lastMinuteProcessed + lastMinuteFailed > 0
        ? lastMinuteFailed / (lastMinuteProcessed + lastMinuteFailed)
        : 0;

    return {
      timestamp: now,
      counters: { ...this.counters },
      state: { ...this.state },
      performance: { ...this.performance },
      rates: {
        enqueueRate,
        processRate,
        errorRate,
      },
      timeSeries: {
        lastMinute: {
          enqueued: lastMinute,
          processed: lastMinuteProcessed,
          failed: lastMinuteFailed,
        },
        lastHour: {
          enqueued: this.sumArray(this.timeSeries.enqueued),
          processed: this.sumArray(this.timeSeries.processed),
          failed: this.sumArray(this.timeSeries.failed),
        },
      },
      handlerMetrics: this.getHandlerMetricsSnapshot(),
    };
  }

  /**
   * Get metrics formatted for logging
   * @returns {Object}
   */
  getLogFormat() {
    const snapshot = this.getSnapshot();
    return {
      queue_depth: snapshot.state.queueDepth,
      active_workers: snapshot.state.activeWorkers,
      dlq_size: snapshot.state.dlqSize,
      oldest_pending_age_ms: snapshot.state.oldestPendingAge,
      enqueue_rate: snapshot.rates.enqueueRate.toFixed(2),
      process_rate: snapshot.rates.processRate.toFixed(2),
      error_rate: (snapshot.rates.errorRate * 100).toFixed(2) + '%',
      avg_processing_time_ms: snapshot.performance.avgProcessingTimeMs.toFixed(0),
      p95_processing_time_ms: snapshot.performance.p95ProcessingTimeMs.toFixed(0),
      total_enqueued: snapshot.counters.totalEnqueued,
      total_processed: snapshot.counters.totalProcessed,
      total_failed: snapshot.counters.totalFailed,
    };
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.counters = {
      totalEnqueued: 0,
      totalProcessed: 0,
      totalFailed: 0,
      totalRetries: 0,
      totalDLQ: 0,
      totalErrors: 0,
    };

    this.timeSeries.enqueued.fill(0);
    this.timeSeries.processed.fill(0);
    this.timeSeries.failed.fill(0);
    this.timeSeries.processingTimes.fill([]);

    this.handlerMetrics.clear();

    logger.info(`${this.logPrefix} Metrics reset`);
  }

  /**
   * Rotate time-series bucket (called every minute)
   * @private
   */
  rotateBucket() {
    this.timeSeries.currentBucket = (this.timeSeries.currentBucket + 1) % 60;
    this.timeSeries.enqueued[this.timeSeries.currentBucket] = 0;
    this.timeSeries.processed[this.timeSeries.currentBucket] = 0;
    this.timeSeries.failed[this.timeSeries.currentBucket] = 0;
    this.timeSeries.processingTimes[this.timeSeries.currentBucket] = [];
    this.timeSeries.lastRotation = Date.now();
  }

  /**
   * Update processing time percentiles
   * @private
   */
  updateProcessingTimeMetrics() {
    // Collect all processing times from last hour
    const allTimes = this.timeSeries.processingTimes.flat().filter((t) => t > 0);

    if (allTimes.length === 0) {
      return;
    }

    allTimes.sort((a, b) => a - b);

    this.performance.avgProcessingTimeMs =
      allTimes.reduce((sum, t) => sum + t, 0) / allTimes.length;
    this.performance.p50ProcessingTimeMs = this.percentile(allTimes, 0.5);
    this.performance.p95ProcessingTimeMs = this.percentile(allTimes, 0.95);
    this.performance.p99ProcessingTimeMs = this.percentile(allTimes, 0.99);
    this.performance.maxProcessingTimeMs = allTimes[allTimes.length - 1];
  }

  /**
   * Calculate percentile
   * @private
   */
  percentile(sorted, p) {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Sum array values
   * @private
   */
  sumArray(arr) {
    return arr.reduce((sum, val) => sum + val, 0);
  }

  /**
   * Increment handler-specific metric
   * @private
   */
  incrementHandlerMetric(type, metric) {
    if (!this.handlerMetrics.has(type)) {
      this.handlerMetrics.set(type, {
        enqueued: 0,
        completed: 0,
        failed: 0,
        dlq: 0,
        processingTimes: [],
      });
    }

    const metrics = this.handlerMetrics.get(type);
    metrics[metric]++;
  }

  /**
   * Add processing time for handler
   * @private
   */
  addHandlerProcessingTime(type, time) {
    const metrics = this.handlerMetrics.get(type);
    if (metrics) {
      metrics.processingTimes.push(time);
      // Keep only last 100 times
      if (metrics.processingTimes.length > 100) {
        metrics.processingTimes.shift();
      }
    }
  }

  /**
   * Get handler metrics snapshot
   * @private
   */
  getHandlerMetricsSnapshot() {
    const snapshot = {};
    for (const [type, metrics] of this.handlerMetrics.entries()) {
      const avgTime =
        metrics.processingTimes.length > 0
          ? metrics.processingTimes.reduce((sum, t) => sum + t, 0) /
            metrics.processingTimes.length
          : 0;

      snapshot[type] = {
        enqueued: metrics.enqueued,
        completed: metrics.completed,
        failed: metrics.failed,
        dlq: metrics.dlq,
        avgProcessingTimeMs: avgTime,
        errorRate:
          metrics.completed + metrics.failed > 0
            ? metrics.failed / (metrics.completed + metrics.failed)
            : 0,
      };
    }
    return snapshot;
  }

  /**
   * Check queue depth threshold
   * @private
   */
  checkQueueDepthThreshold() {
    const depth = this.state.queueDepth;
    if (depth >= this.alertThresholds.queueDepthCritical) {
      this.emitAlert('critical', 'queue_depth', {
        current: depth,
        threshold: this.alertThresholds.queueDepthCritical,
      });
    } else if (depth >= this.alertThresholds.queueDepthWarning) {
      this.emitAlert('warning', 'queue_depth', {
        current: depth,
        threshold: this.alertThresholds.queueDepthWarning,
      });
    }
  }

  /**
   * Check error rate threshold
   * @private
   */
  checkErrorRateThreshold() {
    const snapshot = this.getSnapshot();
    const errorRate = snapshot.rates.errorRate;

    if (errorRate >= this.alertThresholds.errorRateCritical) {
      this.emitAlert('critical', 'error_rate', {
        current: errorRate,
        threshold: this.alertThresholds.errorRateCritical,
      });
    } else if (errorRate >= this.alertThresholds.errorRateWarning) {
      this.emitAlert('warning', 'error_rate', {
        current: errorRate,
        threshold: this.alertThresholds.errorRateWarning,
      });
    }
  }

  /**
   * Check DLQ size threshold
   * @private
   */
  checkDLQSizeThreshold() {
    const size = this.state.dlqSize;
    if (size >= this.alertThresholds.dlqSizeCritical) {
      this.emitAlert('critical', 'dlq_size', {
        current: size,
        threshold: this.alertThresholds.dlqSizeCritical,
      });
    } else if (size >= this.alertThresholds.dlqSizeWarning) {
      this.emitAlert('warning', 'dlq_size', {
        current: size,
        threshold: this.alertThresholds.dlqSizeWarning,
      });
    }
  }

  /**
   * Check oldest message age threshold
   * @private
   */
  checkOldestMessageAgeThreshold() {
    const age = this.state.oldestPendingAge;
    if (age >= this.alertThresholds.oldestMessageAgeCritical) {
      this.emitAlert('critical', 'oldest_message_age', {
        current: age,
        threshold: this.alertThresholds.oldestMessageAgeCritical,
      });
    } else if (age >= this.alertThresholds.oldestMessageAgeWarning) {
      this.emitAlert('warning', 'oldest_message_age', {
        current: age,
        threshold: this.alertThresholds.oldestMessageAgeWarning,
      });
    }
  }

  /**
   * Emit an alert
   * @private
   */
  emitAlert(severity, metric, data) {
    const alert = {
      severity,
      metric,
      ...data,
      timestamp: new Date(),
    };

    logger.warn(`${this.logPrefix} Alert: ${severity} - ${metric}`, alert);
    this.emit('alert', alert);
  }

  /**
   * Close metrics (cleanup)
   */
  close() {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
  }
}

export default BufferMetrics;
