/**
 * Parse pagination parameters from query string
 */
export const parsePagination = query => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const size = Math.min(500, Math.max(1, parseInt(query.limit) || parseInt(query.size) || 20));
  const sort = query.sortBy || query.sort || 'createdAt';
  const dir = query.sortOrder || query.dir === 'asc' ? 1 : -1;

  return {
    page,
    size,
    skip: (page - 1) * size,
    sort: { [sort]: dir },
  };
};

/**
 * Create pagination response object
 */
export const createPaginationResponse = (data, total, page, size) => {
  const totalPages = Math.ceil(total / size);

  return {
    items: data,
    pagination: {
      page,
      size,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};

/**
 * Build MongoDB aggregation pipeline for pagination
 */
export const buildPaginationPipeline = (pagination, matchStage = {}) => {
  const pipeline = [];

  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }

  pipeline.push({
    $facet: {
      data: [{ $sort: pagination.sort }, { $skip: pagination.skip }, { $limit: pagination.size }],
      total: [{ $count: 'count' }],
    },
  });

  return pipeline;
};
