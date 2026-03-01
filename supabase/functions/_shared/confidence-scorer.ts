/**
 * Confidence Scorer
 * T180: 规则置信度评分
 */

interface Pattern {
  id: string;
  points: Array<{ value: number }>;
  strength: number;
}

interface ScoredRule {
  patternId: string;
  confidence: number;
  factors: ConfidenceFactors;
}

interface ConfidenceFactors {
  sampleSize: number;
  consistency: number;
  recency: number;
  strength: number;
}

export class ConfidenceScorer {
  private weights = {
    sampleSize: 0.3,
    consistency: 0.3,
    recency: 0.2,
    strength: 0.2,
  };

  score(pattern: Pattern): ScoredRule {
    const factors = this.computeFactors(pattern);
    const confidence = this.computeConfidence(factors);

    return {
      patternId: pattern.id,
      confidence,
      factors,
    };
  }

  private computeFactors(pattern: Pattern): ConfidenceFactors {
    const points = pattern.points;

    // 样本量因子 (0-1)
    const sampleSize = Math.min(points.length / 10, 1);

    // 一致性因子
    const values = points.map((p) => p.value);
    const consistency = this.computeConsistency(values);

    // 时效性因子 (简化为1)
    const recency = 1;

    // 强度因子
    const strength = Math.abs(pattern.strength);

    return { sampleSize, consistency, recency, strength };
  }

  private computeConsistency(values: number[]): number {
    if (values.length < 2) return 1;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce(
      (sum, v) => sum + Math.pow(v - mean, 2), 0
    ) / values.length;

    // 低方差 = 高一致性
    return Math.max(0, 1 - Math.sqrt(variance));
  }

  private computeConfidence(factors: ConfidenceFactors): number {
    return (
      factors.sampleSize * this.weights.sampleSize +
      factors.consistency * this.weights.consistency +
      factors.recency * this.weights.recency +
      factors.strength * this.weights.strength
    );
  }
}
