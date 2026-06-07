const express = require('express');
const { getDashboard, getWeeklyStats, getMonthlyStats, getExerciseHistory, getOverview, getLeaderboard } = require('../controllers/stats.controller');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/overview', getOverview);
router.get('/leaderboard', getLeaderboard);
router.get('/dashboard', getDashboard);
router.get('/weekly', getWeeklyStats);
router.get('/monthly', getMonthlyStats);
router.get('/exercises/:id/history', getExerciseHistory);

module.exports = router;
