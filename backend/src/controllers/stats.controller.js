const { pool } = require('../database/connection');
const Exercise = require('../models/Exercise');

const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    const weekStart = getWeekStart(now);
    const weekStartISO = weekStart.toISOString().split('T')[0];
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndISO = weekEnd.toISOString().split('T')[0];

    const { rows: [{ count: weekSessions }] } = await pool.query(
      `SELECT COUNT(*) FROM sessions WHERE user_id = $1 AND date >= $2 AND date < $3`,
      [userId, weekStartISO, weekEndISO]
    );

    const { rows: lastRows } = await pool.query(
      `SELECT s.id, s.date, se.id AS se_id, e.name AS ex_name,
              (SELECT COUNT(*) FROM sets WHERE session_exercise_id = se.id) AS set_count
       FROM sessions s
       LEFT JOIN session_exercises se ON se.session_id = s.id
       LEFT JOIN exercises e ON e.id = se.exercise_id
       WHERE s.user_id = $1
       ORDER BY s.date DESC, se.sort_order
       LIMIT 20`,
      [userId]
    );

    let lastSession = null;
    if (lastRows.length > 0) {
      const firstSessionId = lastRows[0].id;
      const exs = lastRows
        .filter((r) => r.id === firstSessionId && r.se_id)
        .map((r) => ({ name: r.ex_name, sets: parseInt(r.set_count, 10) }));
      lastSession = { date: lastRows[0].date, exercises: exs };
    }

    const sortBy = req.query.sortBy || 'volume';
    const timeframe = req.query.timeframe || 'week';

    let rangeStart, rangeEnd;
    rangeEnd = new Date(now);
    rangeEnd.setDate(rangeEnd.getDate() + 1);

    switch (timeframe) {
      case 'month':
        rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        rangeStart = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all':
        rangeStart = new Date('2000-01-01');
        break;
      default:
        rangeStart = weekStart;
        rangeEnd = weekEnd;
        break;
    }

    const rangeStartISO = rangeStart.toISOString().split('T')[0];
    const rangeEndISO   = rangeEnd.toISOString().split('T')[0];

    let selectExpr;
    let extraWhere = '';
    switch (sortBy) {
      case 'reps':
        selectExpr = 'SUM(st.reps)';
        break;
      case 'weight':
        selectExpr = 'MAX(st.weight)';
        break;
      case 'count':
        selectExpr = 'COUNT(DISTINCT s.id)';
        break;
      case 'cardio':
        selectExpr = 'SUM(st.weight)';
        extraWhere = ` AND e.muscle_group = 'cardio'`;
        break;
      default:
        selectExpr = 'SUM(CASE WHEN st.weight = 0 THEN st.reps ELSE st.weight * st.reps END)';
        break;
    }

    const { rows: topRows } = await pool.query(
      `SELECT e.name, ${selectExpr} AS metric
       FROM sessions s
       JOIN session_exercises se ON se.session_id = s.id
       JOIN exercises e ON e.id = se.exercise_id
       JOIN sets st ON st.session_exercise_id = se.id
       WHERE s.user_id = $1 AND s.date >= $2 AND s.date < $3${extraWhere}
       GROUP BY e.id, e.name
       ORDER BY metric DESC
       LIMIT 3`,
      [userId, rangeStartISO, rangeEndISO]
    );

    const units = { volume: 'vol', reps: 'reps', weight: 'kg', count: 'x', cardio: 'km' };
    const topExercises = topRows.map((r) => ({
      name: r.name,
      value: parseFloat(parseFloat(r.metric).toFixed(1)),
      unit: units[sortBy],
    }));

    return res.json({
      weekSessions: parseInt(weekSessions, 10),
      lastSession,
      topExercises,
    });
  } catch (err) {
    console.error('getDashboard:', err.message);
    return res.status(500).json({ message: 'Erro ao obter dados do dashboard.' });
  }
};

const getWeeklyStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const result = [];

    for (let i = 11; i >= 0; i--) {
      const weekStart = getWeekStart(new Date(now));
      weekStart.setDate(weekStart.getDate() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const wsISO = weekStart.toISOString().split('T')[0];
      const weISO = weekEnd.toISOString().split('T')[0];

      let count = 0;
      try {
        const { rows: [{ count: c }] } = await pool.query(
          `SELECT COUNT(*) FROM sessions WHERE user_id = $1 AND date >= $2 AND date < $3`,
          [userId, wsISO, weISO]
        );
        count = parseInt(c, 10);
      } catch (_) { count = 0; }

      result.push({ weekStart: wsISO, weekEnd: weISO, count });
    }

    return res.json(result);
  } catch (err) {
    console.error('getWeeklyStats:', err.message);
    return res.status(500).json({ message: 'Erro ao obter estatísticas semanais.' });
  }
};

const getMonthlyStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const result = [];

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const msISO = monthStart.toISOString().split('T')[0];
      const meISO = monthEnd.toISOString().split('T')[0];

      let volume = 0;
      try {
        const { rows: [row] } = await pool.query(
          `SELECT COALESCE(SUM(CASE WHEN st.weight = 0 THEN st.reps ELSE st.weight * st.reps END), 0) AS vol
           FROM sessions s
           JOIN session_exercises se ON se.session_id = s.id
           JOIN sets st ON st.session_exercise_id = se.id
           WHERE s.user_id = $1 AND s.date >= $2 AND s.date < $3`,
          [userId, msISO, meISO]
        );
        volume = parseFloat(parseFloat(row.vol).toFixed(2));
      } catch (_) { volume = 0; }

      result.push({ month: msISO.slice(0, 7), volume });
    }

    return res.json(result);
  } catch (err) {
    console.error('getMonthlyStats:', err.message);
    return res.status(500).json({ message: 'Erro ao obter estatísticas mensais.' });
  }
};

const getExerciseHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const exercise = await Exercise.findById(id);
    if (!exercise) return res.status(404).json({ message: 'Exercício não encontrado.' });

    const params = [userId, id];
    let dateWhere = '';
    let idx = 3;
    if (startDate) { dateWhere += ` AND s.date >= $${idx++}`; params.push(startDate); }
    if (endDate)   { dateWhere += ` AND s.date <= $${idx++}`; params.push(endDate); }

    const { rows } = await pool.query(
      `SELECT s.id AS session_id, s.date,
              st.reps, st.weight, st.sort_order
       FROM sessions s
       JOIN session_exercises se ON se.session_id = s.id
       JOIN sets st ON st.session_exercise_id = se.id
       WHERE s.user_id = $1 AND se.exercise_id = $2 ${dateWhere}
       ORDER BY s.date ASC, st.sort_order`,
      params
    );

    if (rows.length === 0) {
      return res.json({ exercise, history: [], maxWeight: 0 });
    }

    const sessionMap = new Map();
    for (const row of rows) {
      if (!sessionMap.has(row.session_id)) {
        sessionMap.set(row.session_id, { sessionId: row.session_id, date: row.date, sets: [] });
      }
      sessionMap.get(row.session_id).sets.push({
        reps: parseInt(row.reps, 10),
        weight: parseFloat(row.weight),
        order: row.sort_order,
      });
    }

    let maxWeight = 0;
    const history = [...sessionMap.values()].map((s) => {
      let sessionMaxWeight = 0;
      let sessionVolume = 0;
      for (const set of s.sets) {
        if (set.weight > sessionMaxWeight) sessionMaxWeight = set.weight;
        if (set.weight > maxWeight) maxWeight = set.weight;
        sessionVolume += set.weight === 0 ? set.reps : set.weight * set.reps;
      }
      return {
        sessionId: s.sessionId,
        date: s.date,
        maxWeight: sessionMaxWeight,
        volume: parseFloat(sessionVolume.toFixed(2)),
        sets: s.sets,
      };
    });

    return res.json({ exercise, history, maxWeight });
  } catch (err) {
    console.error('getExerciseHistory:', err.message);
    return res.status(500).json({ message: 'Erro ao obter histórico do exercício.' });
  }
};

module.exports = { getDashboard, getWeeklyStats, getMonthlyStats, getExerciseHistory, getOverview, getLeaderboard };

async function getOverview(req, res) {
  try {
    const { rows: [data] } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE is_suspended = FALSE)   AS total_users,
        (SELECT COUNT(*) FROM exercises WHERE is_system = TRUE)   AS total_system_exercises,
        (SELECT COUNT(*) FROM exercises WHERE is_system = FALSE)  AS total_custom_exercises,
        (SELECT COUNT(*) FROM sessions s JOIN users u ON u.id = s.user_id WHERE u.is_suspended = FALSE) AS total_sessions,
        (SELECT COUNT(*) FROM workout_plans wp LEFT JOIN users u ON u.id = wp.user_id WHERE wp.is_system = TRUE OR u.is_suspended = FALSE) AS total_plans,
        (SELECT COALESCE(SUM(
          CASE WHEN st.weight = 0 THEN st.reps ELSE st.weight * st.reps END
        ), 0)
         FROM sets st
         JOIN session_exercises se ON se.id = st.session_exercise_id
         JOIN sessions s ON s.id = se.session_id
         JOIN users u ON u.id = s.user_id
         WHERE u.is_suspended = FALSE) AS total_volume
    `);

    return res.json({
      totalUsers:           parseInt(data.total_users, 10),
      totalExercises:       parseInt(data.total_system_exercises, 10) + parseInt(data.total_custom_exercises, 10),
      totalSystemExercises: parseInt(data.total_system_exercises, 10),
      totalCustomExercises: parseInt(data.total_custom_exercises, 10),
      totalSessions:        parseInt(data.total_sessions, 10),
      totalPlans:           parseInt(data.total_plans, 10),
      totalVolume:          parseFloat(parseFloat(data.total_volume).toFixed(2)),
    });
  } catch (err) {
    console.error('getOverview:', err.message);
    return res.status(500).json({ message: 'Erro ao obter estatísticas globais.' });
  }
}

async function getLeaderboard(req, res) {
  try {
    const { rows: volumeRows } = await pool.query(`
      SELECT u.name,
        COALESCE(SUM(CASE WHEN st.weight = 0 THEN st.reps ELSE st.weight * st.reps END), 0) AS metric
      FROM users u
      LEFT JOIN sessions s ON s.user_id = u.id
      LEFT JOIN session_exercises se ON se.session_id = s.id
      LEFT JOIN sets st ON st.session_exercise_id = se.id
      WHERE u.is_suspended = FALSE
      GROUP BY u.id, u.name ORDER BY metric DESC LIMIT 3
    `);

    const { rows: sessionsRows } = await pool.query(`
      SELECT u.name, COUNT(s.id) AS metric
      FROM users u
      LEFT JOIN sessions s ON s.user_id = u.id
      WHERE u.is_suspended = FALSE
      GROUP BY u.id, u.name ORDER BY metric DESC LIMIT 3
    `);

    const { rows: weightRows } = await pool.query(`
      SELECT u.name, COALESCE(MAX(st.weight), 0) AS metric
      FROM users u
      LEFT JOIN sessions s ON s.user_id = u.id
      LEFT JOIN session_exercises se ON se.session_id = s.id
      LEFT JOIN sets st ON st.session_exercise_id = se.id
      WHERE u.is_suspended = FALSE AND (st.weight IS NULL OR st.weight > 0)
      GROUP BY u.id, u.name ORDER BY metric DESC LIMIT 3
    `);

    const { rows: cardioRows } = await pool.query(`
      SELECT u.name, COALESCE(SUM(st.weight), 0) AS metric
      FROM users u
      LEFT JOIN sessions s ON s.user_id = u.id
      LEFT JOIN session_exercises se ON se.session_id = s.id
      LEFT JOIN exercises e ON e.id = se.exercise_id
      LEFT JOIN sets st ON st.session_exercise_id = se.id
      WHERE u.is_suspended = FALSE AND (e.muscle_group = 'cardio' OR e.muscle_group IS NULL)
      GROUP BY u.id, u.name ORDER BY metric DESC LIMIT 3
    `);

    const fmt = (rows, unit) =>
      rows
        .filter((r) => parseFloat(r.metric) > 0)
        .map((r, i) => ({
          rank: i + 1,
          name: r.name,
          value: parseFloat(parseFloat(r.metric).toFixed(1)),
          unit,
        }));

    return res.json({
      volume:   fmt(volumeRows,   'vol'),
      sessions: fmt(sessionsRows, 'sess'),
      weight:   fmt(weightRows,   'kg'),
      cardio:   fmt(cardioRows,   'km'),
    });
  } catch (err) {
    console.error('getLeaderboard:', err.message);
    return res.status(500).json({ message: 'Erro ao obter leaderboard.' });
  }
}
