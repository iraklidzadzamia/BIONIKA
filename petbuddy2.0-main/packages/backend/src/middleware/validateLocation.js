import { Location } from '@petbuddy/shared';

;

export const validateLocationOwnership = async (req, res, next) => {
  try {
    const { companyId } = req.user || {};
    const locationId = req.body?.locationId || req.query?.locationId || req.params?.locationId;
    if (!locationId)
      return res
        .status(400)
        .json({ error: { code: 'MISSING_LOCATION', message: 'locationId is required' } });
    const loc = await Location.findOne({ _id: locationId, companyId }).select('_id').lean();
    if (!loc) {
      return res
        .status(400)
        .json({
          error: { code: 'INVALID_LOCATION', message: 'Invalid locationId for this company' },
        });
    }
    return next();
  } catch (err) {
    return res
      .status(500)
      .json({
        error: { code: 'LOCATION_VALIDATION_FAILED', message: 'Failed to validate location' },
      });
  }
};
