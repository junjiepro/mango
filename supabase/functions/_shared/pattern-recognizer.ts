/**
 * Pattern Recognizer (Keyword-based)
 * T179: 基于关键词的模式识别（无 embedding）
 */

interface DataPoint {
  id: string;
  category: string;
  value: number;
  keywords?: string[];
}

interface Pattern {
  id: string;
  category: string;
  points: DataPoint[];
  strength: number;
  keywords: string[];
}

export class PatternRecognizer {
  private minPoints: number;

  constructor(minPoints = 3) {
    this.minPoints = minPoints;
  }

  recognize(points: DataPoint[]): Pattern[] {
    if (points.length < this.minPoints) return [];

    // 按类别分组
    const byCategory = new Map<string, DataPoint[]>();
    for (const p of points) {
      const cat = p.category || 'general';
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(p);
    }

    // 创建模式
    let patternId = 0;
    return Array.from(byCategory.entries())
      .filter(([_, pts]) => pts.length >= this.minPoints)
      .map(([category, pts]) =>
        this.createPattern(`pattern_${patternId++}`, category, pts)
      );
  }

  private createPattern(
    id: string,
    category: string,
    points: DataPoint[]
  ): Pattern {
    const strength = points.reduce((s, p) => s + p.value, 0) / points.length;
    const keywords = this.extractKeywords(points);

    return { id, category, points, strength, keywords };
  }

  private extractKeywords(points: DataPoint[]): string[] {
    const allKeywords: string[] = [];
    for (const p of points) {
      if (p.keywords) allKeywords.push(...p.keywords);
    }

    // 统计词频
    const counts = new Map<string, number>();
    for (const k of allKeywords) {
      counts.set(k, (counts.get(k) || 0) + 1);
    }

    // 返回高频词
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([k]) => k);
  }
}
