import mongoose from 'mongoose';

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = x => {
    const v = Math.round(255 * x)
      .toString(16)
      .padStart(2, '0');
    return v;
  };
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function generateRandomPleasantColor() {
  const hue = Math.floor(Math.random() * 360); // any hue
  const saturation = Math.floor(60 + Math.random() * 25); // 60-85%
  const lightness = Math.floor(45 + Math.random() * 20); // 45-65%
  return hslToHex(hue, saturation, lightness);
}

const userSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    picture: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true, // Ensure email is unique across all users
    },
    passwordHash: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    role: {
      type: String,
      enum: ['manager', 'receptionist', 'groomer', 'veterinarian', 'vet_technician', 'trainer'],
      required: true,
    },
    // Multiple roles support - staff can have multiple roles
    roles: {
      type: [String],
      enum: ['manager', 'receptionist', 'groomer', 'veterinarian', 'vet_technician', 'trainer'],
      default: function() {
        return this.role ? [this.role] : [];
      },
    },
    // Location assignments
    locationIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location',
        index: true,
      },
    ],
    primaryLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
    },
    phone: {
      type: String,
      required: false,
      trim: true,
      maxlength: 20,
    },
    color: {
      type: String,
      trim: true,
      maxlength: 7, // Hex color code
      default: generateRandomPleasantColor,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tosAcceptedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    serviceProvider: {
      type: Boolean,
      default: false,
    },
    capacity: {
      type: Number,
      default: 0,
    },
    // Service category assignments - staff can only perform services in assigned categories
    serviceCategoryIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ServiceCategory',
        index: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound index for unique email per company
userSchema.index({ companyId: 1, email: 1 }, { unique: true });

// Helpful for filtering staff by location and activity
userSchema.index({ companyId: 1, locationIds: 1, isActive: 1 });

// Index for filtering staff by service category
userSchema.index({ companyId: 1, serviceCategoryIds: 1, isActive: 1 });

// Ensure virtual fields are serialized
userSchema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    delete ret.passwordHash;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
