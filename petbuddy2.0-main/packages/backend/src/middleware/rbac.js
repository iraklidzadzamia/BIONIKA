/**
 * Require specific role(s) to access the route
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    // Debug logging
    console.log(
      `RBAC check - User: ${req.user?.id}, Role: ${req.user?.role}, Allowed roles:`,
      allowedRoles
    );

    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.log(`Access denied - User role: ${req.user.role}, Required roles:`, allowedRoles);
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
    }

    console.log(`Access granted - User role: ${req.user.role}`);
    next();
  };
};

/**
 * Require user to be the owner of the resource OR have specific role(s)
 */
export const requireSelfOrRole = (entityOwnerField, ...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    // Check if user has required role
    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    // Check if user is the owner
    const resourceId = req.params.id || req.params.userId;
    if (resourceId && resourceId === req.user.id.toString()) {
      return next();
    }

    // Check if user owns the entity (for nested resources)
    if (entityOwnerField && req.body[entityOwnerField] === req.user.id.toString()) {
      return next();
    }

    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied: insufficient permissions or not the owner',
      },
    });
  };
};

/**
 * Require manager role for company-wide operations
 */
export const requireManager = requireRole('manager');

/**
 * Require manager or receptionist role for customer/pet operations
 */
export const requireManagerOrReceptionist = requireRole('manager', 'receptionist');

/**
 * Require manager or groomer role for appointment operations
 */
export const requireManagerOrGroomer = requireRole('manager', 'groomer');
