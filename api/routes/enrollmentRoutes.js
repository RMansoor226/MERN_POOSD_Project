const express = require('express');
const { requireAuth } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validateObjectId = require('../middleware/validateObjectId');
const validate = require('../middleware/validate');
const validateQuery = require('../middleware/validateQuery');
const {
    createEnrollmentSchema, updateEnrollmentSchema, enrollmentQuerySchema
} = require('../schemas/enrollmentSchemas');
const enrollments = require('../controllers/enrollmentController');

const router = express.Router();

router.use(requireAuth);                 // every route below needs a valid token
router.param('id', validateObjectId);    // every :id route gets the format check

// per-role access rules live in the controller (students see their own, instructors their rosters)
router.get('/', validateQuery(enrollmentQuerySchema), enrollments.listEnrollments);
router.get('/:id', enrollments.getEnrollment);
router.post('/', validate(createEnrollmentSchema), enrollments.createEnrollment);
router.patch('/:id', validate(updateEnrollmentSchema), enrollments.updateEnrollment);
router.delete('/:id', requireRole('admin'), enrollments.deleteEnrollment);

module.exports = router;
