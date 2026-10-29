const mongoose = require('mongoose');
const { Schema } = mongoose;

const departmentSchema = new Schema(
  {
    code: {
        type: String,
        required: [true, 'Department code is required'],
        unique: true,
        uppercase: true,
        trim: true
    },
    name: {
        type: String,
        required: [true, 'Department name is required'],
        trim: true
    }
  },
  { collection: 'departments', timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Department', departmentSchema);
