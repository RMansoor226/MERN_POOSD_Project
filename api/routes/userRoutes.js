const express = require('express');
const { requireAuth, requireSelfOrRole } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validateObjectId = require('../middleware/validateObjectId');
const validate = require('../middleware/validate');
const { updateUserSchema } = require('../schemas/userSchemas');
const users = require('../controllers/userController');

const router = express.Router();

router.use(requireAuth);                 // every route below needs a valid token
router.param('id', validateObjectId);    // every :id route gets the format check

router.get('/', requireRole('admin'), users.listUsers);
router.get('/:id', requireSelfOrRole('admin'), users.getUser);
router.patch('/:id', requireSelfOrRole('admin'), validate(updateUserSchema), users.updateUser);
router.delete('/:id', requireRole('admin'), users.deleteUser);

module.exports = router;
