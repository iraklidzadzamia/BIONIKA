import { connectDB, disconnectDB } from '../config/database.js';
;
;
;
;
;
;
import Resource from '../models/Resource.js';
import ResourceReservation from '../models/ResourceReservation.js';
import StaffSchedule from '../models/StaffSchedule.js';
;
import { AuthService } from '../services/authService.js';
import { seedAIPrompts } from './aiPrompts.js';
import logger from '../utils/logger.js';
;
import ResourceType from '../models/ResourceType.js';
import { CompanySetupService } from '../services/companySetupService.js';
import { Appointment, Contact, Pet, Company, Location, ServiceCategory, ServiceItem, User } from '@petbuddy/shared';

const seedData = async () => {
  try {
    logger.info('Starting database seeding...');

    await connectDB();

    await Promise.all([
      Company.deleteMany({}),
      User.deleteMany({}),
      Contact.deleteMany({}),
      Pet.deleteMany({}),
      ServiceCategory.deleteMany({}),
      ServiceItem.deleteMany({}),
      Resource.deleteMany({}),
      ResourceReservation.deleteMany({}),
      StaffSchedule.deleteMany({}),
      Appointment.deleteMany({}),
      Location.deleteMany({}),
      ResourceType.deleteMany({}),
    ]);

    logger.info('Cleared existing data');

    await seedAIPrompts();
    logger.info('AI prompts seeded');

    const company = new Company({
      name: 'PetBuddy Grooming Salon',
      email: 'info@petbuddy.com',
      phone: '+995 32 123 4567',
      address: '123 Rustaveli Avenue, Tbilisi, Georgia',
      timezone: 'Asia/Tbilisi',
      businessTypes: ['grooming'],
    });
    await company.save();

    // Ensure at least one location
    const mainLocation = await Location.create({
      companyId: company._id,
      label: 'Main',
      address: 'Main',
      isMain: true,
      timezone: company.timezone,
    });

    // Run unified default setup (resources, services, items, AI prompt)
    await CompanySetupService.setupDefaults(company._id);

    const passwordHash = await AuthService.hashPassword('password123');

    const manager = new User({
      companyId: company._id,
      email: 'manager@petbuddy.com',
      passwordHash,
      fullName: 'Giorgi Petrov',
      role: 'manager',
      isActive: true,
    });

    const receptionist = new User({
      companyId: company._id,
      email: 'reception@petbuddy.com',
      passwordHash,
      fullName: 'Nino Ivanova',
      role: 'receptionist',
      isActive: true,
    });

    const groomer1 = new User({
      companyId: company._id,
      email: 'groomer1@petbuddy.com',
      passwordHash,
      fullName: 'Mariam Sidamonidze',
      role: 'groomer',
      isActive: true,
    });

    const groomer2 = new User({
      companyId: company._id,
      email: 'groomer2@petbuddy.com',
      passwordHash,
      fullName: 'Levan Kapanadze',
      role: 'groomer',
      isActive: true,
    });

    await Promise.all([manager.save(), receptionist.save(), groomer1.save(), groomer2.save()]);
    logger.info('Users created');

    // Fetch created services
    const services = await ServiceCategory.find({ companyId: company._id }).sort({ name: 1 });

    // Staff schedules
    const schedules = [];
    for (let weekday = 0; weekday < 7; weekday++) {
      if (weekday === 0) {
        schedules.push(
          new StaffSchedule({
            companyId: company._id,
            userId: groomer1._id,
            weekday,
            startTime: '10:00',
            endTime: '15:00',
            breakWindows: [{ start: '12:00', end: '12:30' }],
          }),
          new StaffSchedule({
            companyId: company._id,
            userId: groomer2._id,
            weekday,
            startTime: '10:00',
            endTime: '15:00',
            breakWindows: [{ start: '12:00', end: '12:30' }],
          })
        );
      } else if (weekday === 6) {
        schedules.push(
          new StaffSchedule({
            companyId: company._id,
            userId: groomer1._id,
            weekday,
            startTime: '09:00',
            endTime: '16:00',
            breakWindows: [{ start: '12:00', end: '12:30' }],
          }),
          new StaffSchedule({
            companyId: company._id,
            userId: groomer2._id,
            weekday,
            startTime: '09:00',
            endTime: '16:00',
            breakWindows: [{ start: '12:00', end: '12:30' }],
          })
        );
      } else {
        schedules.push(
          new StaffSchedule({
            companyId: company._id,
            userId: groomer1._id,
            weekday,
            startTime: '09:00',
            endTime: '18:00',
            breakWindows: [
              { start: '12:00', end: '12:30' },
              { start: '15:00', end: '15:15' },
            ],
          }),
          new StaffSchedule({
            companyId: company._id,
            userId: groomer2._id,
            weekday,
            startTime: '09:00',
            endTime: '18:00',
            breakWindows: [
              { start: '12:00', end: '12:30' },
              { start: '15:00', end: '15:15' },
            ],
          })
        );
      }
    }
    await StaffSchedule.insertMany(schedules);
    logger.info('Staff schedules created');

    // Create sample appointments using created services/items
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const fullGroom = services.find(s => s.name === 'Full Groom');
    const basicGroom = services.find(s => s.name === 'Basic Groom');

    const appt1Start = new Date(tomorrow);
    const appt1End = new Date(tomorrow.getTime() + 120 * 60 * 1000);
    await Appointment.create({
      companyId: company._id,
      locationId: mainLocation._id,
      customerId: (
        await Contact.create({
          fullName: 'Ana Garcia',
          companyId: company._id,
          contactStatus: 'customer',
        })
      )._id,
      staffId: groomer1._id,
      petId: (
        await Pet.create({ name: 'Buddy', species: 'dog', size: 'L', companyId: company._id })
      )._id,
      serviceId: fullGroom?._id || services[0]._id,
      start: appt1Start,
      end: appt1End,
      status: 'scheduled',
      notes: 'First time customer',
    });

    const appt2Start = new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000);
    const appt2End = new Date(tomorrow.getTime() + 3.5 * 60 * 60 * 1000);
    await Appointment.create({
      companyId: company._id,
      locationId: mainLocation._id,
      customerId: (
        await Contact.create({
          fullName: 'David Brown',
          companyId: company._id,
          contactStatus: 'customer',
        })
      )._id,
      staffId: groomer2._id,
      petId: (
        await Pet.create({ name: 'Bella', species: 'dog', size: 'M', companyId: company._id })
      )._id,
      serviceId: basicGroom?._id || services[0]._id,
      start: appt2Start,
      end: appt2End,
      status: 'scheduled',
      notes: 'Regular customer',
    });

    logger.info('Database seeding completed successfully!');
    logger.info('Company ID:', company._id);
    logger.info('Manager email: manager@petbuddy.com, password: password123');
    logger.info('Receptionist email: reception@petbuddy.com, password: password123');
    logger.info('Groomer 1 email: groomer1@petbuddy.com, password: password123');
    logger.info('Groomer 2 email: groomer2@petbuddy.com, password: password123');
  } catch (error) {
    logger.error('Seeding failed:', error);
    throw error;
  } finally {
    await disconnectDB();
  }
};

// Run seeding if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedData()
    .then(() => {
      logger.info('Seeding completed');
    })
    .catch(error => {
      logger.error('Seeding failed:', error);
    });
}

export default seedData;
