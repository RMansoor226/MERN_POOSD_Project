const express = require('express');
const { requireAuth } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validateObjectId = require('../middleware/validateObjectId');
const validate = require('../middleware/validate');
const validateQuery = require('../middleware/validateQuery');
const { department: departmentSchemas } = require('../schemas/catalogSchemas');
const departments = require('../controllers/departmentController');

const router = express.Router();

router.use(requireAuth);                 // every route below needs a valid token
router.param('id', validateObjectId);    // every :id route gets the format check

// reads: any logged-in user
router.get('/', validateQuery(departmentSchemas.query), departments.listDepartments);
router.get('/:id', departments.getDepartment);

// writes: admin only
router.post('/', requireRole('admin'), validate(departmentSchemas.create), departments.createDepartment);
router.patch('/:id', requireRole('admin'), validate(departmentSchemas.update), departments.updateDepartment);
router.delete('/:id', requireRole('admin'), departments.deleteDepartment);

module.exports = router;
