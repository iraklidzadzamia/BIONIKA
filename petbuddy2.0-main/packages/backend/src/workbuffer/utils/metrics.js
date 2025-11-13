import { EventEmitter } from 'events';
import logger from '../../utils/logger.js';

export class MetricsCollector extends EventEmitter {
  constructor() {
    super();
    this.metrics = {
      enqueued: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      dlq: 0,
      retries: 0,
      processingTimes: [],
    };
  }

  recordEnqueue() {
    this.metrics.enqueued++;
  }

  recordProcessing() {
    this.metrics.processing++;
  }

  recordCompleted(processingTime) {
    this.metrics.completed++;
    this.metrics.processing--;
    this.metrics.processingTimes.push(processingTime);
    if (this.metrics.processingTimes.length > 1000) {
      this.metrics.processingTimes.shift();
    }
  }

  recordFailed() {
    this.metrics.failed++;
    this.metrics.processing--;
  }

  recordDLQ() {
    this.metrics.dlq++;
  }

  recordRetry() {
    this.metrics.retries++;
  }

  getMetrics() {
    const times = this.metrics.processingTimes;
    const avg = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const p95 = times.length > 0 ? times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)] : 0;

    return {
      ...this.metrics,
      avgProcessingTime: avg,
      p95ProcessingTime: p95,
      timestamp: new Date(),
    };
  }

  reset() {
    this.metrics = {
      enqueued: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      dlq: 0,
      retries: 0,
      processingTimes: [],
    };
  }
}

export default MetricsCollector;
