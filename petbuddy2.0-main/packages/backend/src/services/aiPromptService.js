import AIPrompt from '../models/AIPrompt.js';
;
import logger from '../utils/logger.js';
import { Company } from '@petbuddy/shared';

export class AIPromptService {
  /**
   * Get prompts suitable for a specific business type
   */
  static async getPromptsForBusiness(businessType, category = null) {
    try {
      const filter = { isActive: true };

      if (businessType) {
        filter.businessType = { $regex: businessType, $options: 'i' };
      }

      if (category) {
        filter.category = category;
      }

      const prompts = await AIPrompt.find(filter)
        .sort({ isDefault: -1, usageCount: -1, name: 1 })
        .select('name category description businessType tags isDefault')
        .lean();

      return prompts;
    } catch (error) {
      logger.error('Error getting prompts for business:', error);
      throw error;
    }
  }

  /**
   * Get recommended prompts based on company profile
   */
  static async getRecommendedPrompts(companyProfile) {
    try {
      // Analyze company profile to suggest relevant prompts
      const recommendations = [];

      // Get default prompts first
      const defaultPrompts = await AIPrompt.find({
        isDefault: true,
        isActive: true,
      })
        .sort({ category: 1, name: 1 })
        .select('name category description businessType tags')
        .lean();

      recommendations.push(...defaultPrompts);

      // Get category-specific recommendations
      if (companyProfile.category) {
        const categoryPrompts = await AIPrompt.find({
          category: companyProfile.category,
          isActive: true,
          isDefault: false,
        })
          .sort({ usageCount: -1, name: 1 })
          .limit(3)
          .select('name category description businessType tags')
          .lean();

        recommendations.push(...categoryPrompts);
      }

      // Remove duplicates and return
      const uniqueRecommendations = recommendations.filter(
        (prompt, index, self) =>
          index === self.findIndex(p => p._id.toString() === prompt._id.toString())
      );

      return uniqueRecommendations;
    } catch (error) {
      logger.error('Error getting recommended prompts:', error);
      throw error;
    }
  }

  /**
   * Apply a prompt to a company's bot configuration
   */
  static async applyPromptToCompany(promptId, companyId) {
    try {
      const prompt = await AIPrompt.findById(promptId).lean();
      if (!prompt) {
        throw new Error('Prompt not found');
      }

      // Update company bot configuration
      const company = await Company.findByIdAndUpdate(
        companyId,
        {
          $set: {
            'bot.systemInstruction': prompt.systemInstruction,
            'bot.selectedPromptId': prompt._id,
            'bot.selectedPromptName': prompt.name,
            'bot.selectedPromptCategory': prompt.category,
          },
        },
        { new: true }
      );

      if (!company) {
        throw new Error('Company not found');
      }

      // Increment usage count
      await AIPrompt.findByIdAndUpdate(promptId, { $inc: { usageCount: 1 } });

      return {
        success: true,
        prompt: {
          name: prompt.name,
          category: prompt.category,
          systemInstruction: prompt.systemInstruction,
        },
      };
    } catch (error) {
      logger.error('Error applying prompt to company:', error);
      throw error;
    }
  }

  /**
   * Get prompt usage statistics
   */
  static async getPromptUsageStats() {
    try {
      const stats = await AIPrompt.aggregate([
        {
          $group: {
            _id: '$category',
            totalPrompts: { $sum: 1 },
            activePrompts: { $sum: { $cond: ['$isActive', 1, 0] } },
            totalUsage: { $sum: '$usageCount' },
            avgUsage: { $avg: '$usageCount' },
          },
        },
        {
          $sort: { totalUsage: -1 },
        },
      ]);

      const topPrompts = await AIPrompt.find({ isActive: true })
        .sort({ usageCount: -1 })
        .limit(5)
        .select('name category businessType usageCount')
        .lean();

      return {
        categoryStats: stats,
        topPrompts,
        summary: {
          totalPrompts: await AIPrompt.countDocuments(),
          activePrompts: await AIPrompt.countDocuments({ isActive: true }),
          totalUsage: await AIPrompt.aggregate([
            { $group: { _id: null, total: { $sum: '$usageCount' } } },
          ]).then(result => result[0]?.total || 0),
        },
      };
    } catch (error) {
      logger.error('Error getting prompt usage stats:', error);
      throw error;
    }
  }

  /**
   * Search prompts with intelligent ranking
   */
  static async searchPromptsIntelligently(query, filters = {}) {
    try {
      const { category, businessType, tags, limit = 20 } = filters;

      let filter = { isActive: true };

      if (category) filter.category = category;
      if (businessType) filter.businessType = { $regex: businessType, $options: 'i' };
      if (tags && tags.length > 0) filter.tags = { $in: tags };

      let prompts;

      if (query) {
        // Text search with relevance scoring
        const textFilter = {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { role: { $regex: query, $options: 'i' } },
            { tags: { $in: [new RegExp(query, 'i')] } },
          ],
        };

        filter = { ...filter, ...textFilter };

        prompts = await AIPrompt.find(filter)
          .sort({ isDefault: -1, usageCount: -1, name: 1 })
          .limit(limit)
          .select('name category description businessType tags isDefault usageCount')
          .lean();
      } else {
        // No query, return filtered results
        prompts = await AIPrompt.find(filter)
          .sort({ isDefault: -1, usageCount: -1, name: 1 })
          .limit(limit)
          .select('name category description businessType tags isDefault usageCount')
          .lean();
      }

      return prompts;
    } catch (error) {
      logger.error('Error searching prompts intelligently:', error);
      throw error;
    }
  }
}
