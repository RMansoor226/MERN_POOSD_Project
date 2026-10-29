const mongoose = require('mongoose');
const { Schema } = mongoose;

const declarationSchema = new Schema(
  {
    programId: { type: Schema.Types.ObjectId, ref: 'Program', required: [true, 'programId is required'] },
    catalogYear: { type: Number, required: [true, 'catalogYear is required'] },
    declaredAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    firstName: {
        type: String,
        default: '',
        trim: true
    },
    lastName: {
        type: String,
        default: '',
        trim: true
    },
    login: {
      type: String,
      required: [true, 'Login username is required'],
      unique: true,
      trim: true
    },
    // bcrypt hash. Excluded from queries by default: use .select('+password') at login
    password: {
        type: String,
        required: [true, 'Password is required'],
        select: false
    },
    // no default: a sparse unique index ignores missing values but not ''
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    role: {
      type: String,
      enum: ['student', 'advisor', 'instructor', 'admin'],
      default: 'student',
      trim: true
    },
    declarations: {
        type: [declarationSchema],
        default: []
    } // replaces the old `major` string
  },
  {
      collection: 'users',
      timestamps: true,
      versionKey: false
  }
);

userSchema.index({ email: 1 }, { unique: true, sparse: true });

userSchema.pre('validate', function () {
  const ids = this.declarations.map((d) => String(d.programId));
  if (new Set(ids).size !== ids.length) {
    this.invalidate('declarations', 'the same program cannot be declared twice');
  }
});

module.exports = mongoose.model('User', userSchema);
