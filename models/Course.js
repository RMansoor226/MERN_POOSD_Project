const mongoose = require('mongoose');
const { Schema } = mongoose;

const GRADES = ['A', 'B', 'C', 'D'];

/*
 * Prerequisite expression tree stored in Course.prereqs (Schema.Types.Mixed).
 *   group: { op: 'AND' | 'OR', items: [node, ...] }
 *   leaf:  { courseId: ObjectId, minGrade?: 'A'|'B'|'C'|'D', concurrentOk?: Boolean }
 * A node is a group or a leaf, never both. null / undefined means "no prereqs".
 * Mixed paths are not change-tracked: call doc.markModified('prereqs') after editing in place.
 */
function isValidPrereqNode(node) {
  if (node === null || node === undefined) return true;
  if (typeof node !== 'object' || Array.isArray(node)) return false;

  const isGroup = node.op !== undefined || node.items !== undefined;
  const isLeaf = node.courseId !== undefined;
  if (isGroup === isLeaf) return false; // both or neither

  if (isLeaf) {
    if (!mongoose.isValidObjectId(node.courseId)) return false;
    if (node.minGrade !== undefined && !GRADES.includes(node.minGrade)) return false;
    if (node.concurrentOk !== undefined && typeof node.concurrentOk !== 'boolean') return false;
    return true;
  }
  return (
    ['AND', 'OR'].includes(node.op) &&
    Array.isArray(node.items) &&
    node.items.length > 0 &&
    node.items.every(isValidPrereqNode)
  );
}

const courseSchema = new Schema(
  {
    subject: {
        type: String,
        required: [true, 'subject is required'],
        uppercase: true,
        trim: true // "COP"
    },
    number: {
        type: String,
        required: [true, 'course number is required'],
        trim: true // "4331"
    },
    code: {
        type: String,
        unique: true,
        trim: true // "COP4331", set in pre-validate
    },
    title: {
        type: String,
        required: [true, 'title is required'],
        trim: true
    },
    credits: {
        type: Number,
        required: [true, 'credits is required'],
        min: 0
    },
    description: {
        type: String,
        default: ''
    },
    departmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Department',
        index: true
    },
    attributes: {
        type: [String],
        default: []
    }, // "GenEd-Math", "Writing Intensive"
    prereqs: {
        type: Schema.Types.Mixed,
        default: null,
        validate: {
            validator: isValidPrereqNode,
            message: 'prereqs must be a valid AND/OR tree of course leaves'
        }
    },
    coreqs: [
        { type: Schema.Types.ObjectId, ref: 'Course' }
    ],
    prereqText: {
        type: String,
        default: ''
    } // non-course rules: "Junior standing"
  },
  { collection: 'courses', timestamps: true, versionKey: false }
);

courseSchema.index({ subject: 1, number: 1 });

courseSchema.pre('validate', function () {
  if (this.subject && this.number) {
    this.code = `${this.subject}${this.number}`;
  }
});

module.exports = mongoose.model('Course', courseSchema);
module.exports.isValidPrereqNode = isValidPrereqNode;
