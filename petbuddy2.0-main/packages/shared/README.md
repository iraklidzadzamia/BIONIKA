# @petbuddy/shared

Shared models, types, utilities, and constants for PetBuddy services.

## Contents

### Models
Mongoose models shared across backend and meta-bot services:
- `Appointment` - Booking appointments
- `Company` - Business/company information
- `Contact` - Customer and lead contacts
- `Location` - Physical business locations
- `Message` - Chat messages across platforms
- `Pet` - Pet profiles
- `ServiceCategory` - Service categories
- `ServiceItem` - Individual service items
- `User` - Staff users

## Usage

```javascript
// Import all models
import { Appointment, Contact, Pet } from '@petbuddy/shared';

// Or import specific models
import { Appointment } from '@petbuddy/shared/models';
```

## Development

This package is part of the PetBuddy monorepo and uses npm workspaces.
