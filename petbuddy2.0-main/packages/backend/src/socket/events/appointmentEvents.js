import logger from '../../utils/logger.js';

export const emitAppointmentCreated = (io, companyId, payload) => {
  try {
    const room = `company:${companyId}`;
    io.to(room).emit('appointment:created', payload);
  } catch (error) {
    logger.error('Error emitting appointment:created', { companyId, error: error.message });
  }
};

export const emitAppointmentUpdated = (io, companyId, payload) => {
  try {
    const room = `company:${companyId}`;
    io.to(room).emit('appointment:updated', payload);
  } catch (error) {
    logger.error('Error emitting appointment:updated', { companyId, error: error.message });
  }
};

export const emitAppointmentCanceled = (io, companyId, payload) => {
  try {
    const room = `company:${companyId}`;
    io.to(room).emit('appointment:canceled', payload);
  } catch (error) {
    logger.error('Error emitting appointment:canceled', { companyId, error: error.message });
  }
};
