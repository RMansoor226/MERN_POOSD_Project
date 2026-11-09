const express = require('express');
const { requireAuth } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validateObjectId = require('../middleware/validateObjectId');
const validate = require('../middleware/validate');
const validateQuery = require('../middleware/validateQuery');
const { program: programSchemas } = require('../schemas/catalogSchemas');
const programs = require('../controllers/programController');

const router = express.Router();

router.use(requireAuth);                 // every route below needs a valid token
router.param('id', validateObjectId);    // every :id route gets the format check

// reads: any logged-in user
router.get('/', validateQuery(programSchemas.query), programs.listPrograms);
router.get('/:id', programs.getProgram);

// writes: admin only
router.post('/', requireRole('admin'), validate(programSchemas.create), programs.createProgram);
router.patch('/:id', requireRole('admin'), validate(programSchemas.update), programs.updateProgram);
router.delete('/:id', requireRole('admin'), programs.deleteProgram);

module.exports = router;
