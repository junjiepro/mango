/**
 * Feedback Clusterer (Keyword-based)
 * T203: 基于关键词和类别的反馈聚类（无 embedding）
 */

interface FeedbackItem {
  id: string;
  category: string;
  rating: 'positive' | 'negative';
  comment?: string;
}

interface Cluster {
  category: string;
  items: FeedbackItem[];
  positiveCount: number;
  negativeCount: number;
  sentiment: 'positive' | 'negative' | 'mixed';
}

export class FeedbackClusterer {
  private minClusterSize: number;

  constructor(minClusterSize = 3) {
    this.minClusterSize = minClusterSize;
  }

  /**
   * 基于类别聚类
   */
  cluster(items: FeedbackItem[]): Cluster[] {
    const byCategory = new Map<string, FeedbackItem[]>();

    for (const item of items) {
      const cat = item.category || 'general';
      if (!byCategory.has(cat)) {
        byCategory.set(cat, []);
      }
      byCategory.get(cat)!.push(item);
    }

    return Array.from(byCategory.entries())
      .filter(([_, items]) => items.length >= this.minClusterSize)
      .map(([category, items]) => this.createCluster(category, items));
  }

  private createCluster(category: string, items: FeedbackItem[]): Cluster {
    const positiveCount = items.filter(i => i.rating === 'positive').length;
    const negativeCount = items.length - positiveCount;
    const ratio = positiveCount / items.length;

    let sentiment: 'positive' | 'negative' | 'mixed';
    if (ratio > 0.7) sentiment = 'positive';
    else if (ratio < 0.3) sentiment = 'negative';
    else sentiment = 'mixed';

    return { category, items, positiveCount, negativeCount, sentiment };
  }
}
