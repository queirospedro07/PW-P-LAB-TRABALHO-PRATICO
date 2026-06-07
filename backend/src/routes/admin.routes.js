const express = require('express');
const {
  getAdminStats,
  getSessionsOverTime,
  getMuscleGroupDistribution,
  getUserGrowth,
  getTopExercises,
  getVolumeOverTime,
  getDetailedStats,
  getExerciseStats,
  createSystemExercise,
  deleteSystemExercise,
  toggleAdmin,
  toggleSuspend,
} = require('../controllers/admin.controller');
const { protect } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

const router = express.Router();
router.use(protect);
router.use(requireAdmin);

router.get('/stats', getAdminStats);
router.get('/sessions-over-time', getSessionsOverTime);
router.get('/muscle-distribution', getMuscleGroupDistribution);
router.get('/user-growth', getUserGrowth);
router.get('/top-exercises', getTopExercises);
router.get('/volume-over-time', getVolumeOverTime);
router.get('/detailed-stats', getDetailedStats);
router.get('/exercise-stats', getExerciseStats);
router.post('/exercises', createSystemExercise);
router.delete('/exercises/:id', deleteSystemExercise);
router.patch('/users/:userId/toggle-admin', toggleAdmin);
router.patch('/users/:userId/toggle-suspend', toggleSuspend);

module.exports = router;
