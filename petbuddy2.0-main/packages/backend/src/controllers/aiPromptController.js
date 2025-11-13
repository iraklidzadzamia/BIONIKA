import AIPrompt from '../models/AIPrompt.js';
import logger from '../utils/logger.js';
import { escapeRegex } from '../utils/escapeRegex.js';

export class AIPromptController {
  /**
   * Get all available AI prompts with filtering and pagination
   */
  static async getPrompts(req, res) {
    try {
      const {
        category,
        businessType,
        tags,
        search,
        isActive,
        isDefault,
        page = 1,
        limit = 20,
        sortBy = 'name',
        sortOrder = 'asc'
      } = req.query;

      // Build filter object
      const filter = {};
      
      if (category) filter.category = category;
      if (businessType) filter.businessType = businessType;
      if (isActive !== undefined) filter.isActive = isActive === 'true';
      if (isDefault !== undefined) filter.isDefault = isDefault === 'true';
      
      if (tags) {
        const tagArray = tags.split(',').map(tag => tag.trim());
        filter.tags = { $in: tagArray };
      }
      
      if (search) {
        const escaped = escapeRegex(search);
        filter.$or = [
          { name: { $regex: escaped, $options: 'i' } },
          { description: { $regex: escaped, $options: 'i' } },
          { businessType: { $regex: escaped, $options: 'i' } },
          { tags: { $in: [new RegExp(escaped, 'i')] } }
        ];
      }

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Execute query with pagination
      const [prompts, total] = await Promise.all([
        AIPrompt.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .select('-__v')
          .lean(),
        AIPrompt.countDocuments(filter)
      ]);

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / parseInt(limit));
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      res.json({
        prompts,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNext,
          hasPrev
        }
      });
    } catch (error) {
      logger.error('Get AI prompts error:', error);
      res.status(500).json({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch AI prompts'
        }
      });
    }
  }

  /**
   * Get a specific AI prompt by ID
   */
  static async getPromptById(req, res) {
    try {
      const { id } = req.params;
      
      const prompt = await AIPrompt.findById(id).select('-__v').lean();
      
      if (!prompt) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'AI prompt not found'
          }
        });
      }

      res.json({ prompt });
    } catch (error) {
      logger.error('Get AI prompt by ID error:', error);
      res.status(500).json({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch AI prompt'
        }
      });
    }
  }

  /**
   * Get prompts by category for easy discovery
   */
  static async getPromptsByCategory(req, res) {
    try {
      const { category } = req.params;
      
      const prompts = await AIPrompt.find({
        category,
        isActive: true
      })
        .sort({ name: 1 })
        .select('name description businessType tags isDefault')
        .lean();

      res.json({ prompts });
    } catch (error) {
      logger.error('Get prompts by category error:', error);
      res.status(500).json({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch prompts by category'
        }
      });
    }
  }

  /**
   * Get default prompts for new companies
   */
  static async getDefaultPrompts(req, res) {
    try {
      const prompts = await AIPrompt.find({
        isDefault: true,
        isActive: true
      })
        .sort({ category: 1, name: 1 })
        .select('name category description businessType tags')
        .lean();

      // Group by category for better UX
      const groupedPrompts = prompts.reduce((acc, prompt) => {
        if (!acc[prompt.category]) {
          acc[prompt.category] = [];
        }
        acc[prompt.category].push(prompt);
        return acc;
      }, {});

      res.json({ 
        prompts: groupedPrompts,
        categories: Object.keys(groupedPrompts)
      });
    } catch (error) {
      logger.error('Get default prompts error:', error);
      res.status(500).json({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch default prompts'
        }
      });
    }
  }

  /**
   * Search prompts with advanced filtering
   */
  static async searchPrompts(req, res) {
    try {
      const { q, category, businessType, tags } = req.query;
      
      if (!q && !category && !businessType && !tags) {
        return res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'At least one search parameter is required'
          }
        });
      }

      const filter = { isActive: true };
      
      if (q) {
        const escaped = escapeRegex(q);
        filter.$or = [
          { name: { $regex: escaped, $options: 'i' } },
          { description: { $regex: escaped, $options: 'i' } },
          { role: { $regex: escaped, $options: 'i' } }
        ];
      }

      if (category) filter.category = category;
      if (businessType) {
        const escaped = escapeRegex(businessType);
        filter.businessType = { $regex: escaped, $options: 'i' };
      }
      if (tags) {
        const tagArray = tags.split(',').map(tag => tag.trim());
        filter.tags = { $in: tagArray };
      }

      const prompts = await AIPrompt.find(filter)
        .sort({ isDefault: -1, usageCount: -1, name: 1 })
        .select('name category description businessType tags isDefault usageCount')
        .limit(50)
        .lean();

      res.json({ prompts });
    } catch (error) {
      logger.error('Search prompts error:', error);
      res.status(500).json({
        error: {
          code: 'SEARCH_FAILED',
          message: 'Failed to search prompts'
        }
      });
    }
  }

  /**
   * Get prompt statistics for admin dashboard
   */
  static async getPromptStats(req, res) {
    try {
      const stats = await AIPrompt.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            activeCount: {
              $sum: { $cond: ['$isActive', 1, 0] }
            },
            defaultCount: {
              $sum: { $cond: ['$isDefault', 1, 0] }
            },
            totalUsage: { $sum: '$usageCount' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      const totalPrompts = await AIPrompt.countDocuments();
      const activePrompts = await AIPrompt.countDocuments({ isActive: true });
      const totalUsage = await AIPrompt.aggregate([
        { $group: { _id: null, total: { $sum: '$usageCount' } } }
      ]);

      res.json({
        stats,
        summary: {
          totalPrompts,
          activePrompts,
          totalUsage: totalUsage[0]?.total || 0
        }
      });
    } catch (error) {
      logger.error('Get prompt stats error:', error);
      res.status(500).json({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch prompt statistics'
        }
      });
    }
  }

  /**
   * Increment usage count when a prompt is selected
   */
  static async incrementUsage(req, res) {
    try {
      const { id } = req.params;
      
      const prompt = await AIPrompt.findByIdAndUpdate(
        id,
        { $inc: { usageCount: 1 } },
        { new: true }
      ).select('usageCount');

      if (!prompt) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'AI prompt not found'
          }
        });
      }

      res.json({ usageCount: prompt.usageCount });
    } catch (error) {
      logger.error('Increment usage error:', error);
      res.status(500).json({
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to increment usage count'
        }
      });
    }
  }

  /**
   * Get prompt preview with formatted text
   */
  static async getPromptPreview(req, res) {
    try {
      const { id } = req.params;
      
      const prompt = await AIPrompt.findById(id).lean();
      
      if (!prompt) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'AI prompt not found'
          }
        });
      }

      // Format the full prompt for preview
      const preview = {
        name: prompt.name,
        category: prompt.category,
        businessType: prompt.businessType,
        description: prompt.description,
        fullPrompt: prompt.fullPrompt || prompt.systemInstruction,
        conversationExamples: prompt.conversationExamples,
        tags: prompt.tags
      };

      res.json({ preview });
    } catch (error) {
      logger.error('Get prompt preview error:', error);
      res.status(500).json({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch prompt preview'
        }
      });
    }
  }
}
