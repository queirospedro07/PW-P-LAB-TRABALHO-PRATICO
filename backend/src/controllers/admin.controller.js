const { pool } = require('../database/connection');

const getAdminStats = async (req, res) => {
  try {
    const { rows: [globals] } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users)                                   AS total_users,
        (SELECT COUNT(*) FROM sessions)                                AS total_sessions,
        (SELECT COUNT(*) FROM exercises WHERE is_system = FALSE)       AS total_custom_exercises,
        (SELECT COUNT(*) FROM exercises WHERE is_system = TRUE)        AS total_system_exercises,
        (SELECT COUNT(*) FROM workout_plans)                           AS total_plans,
        (SELECT COALESCE(SUM(
          CASE WHEN st.weight = 0 THEN st.reps ELSE st.weight * st.reps END
        ), 0) FROM sets st)                                            AS total_volume,
        (SELECT COALESCE(SUM(st.reps), 0) FROM sets st)               AS total_reps,
        (SELECT COALESCE(MAX(st.weight), 0) FROM sets st WHERE st.weight > 0) AS max_weight
    `);

    const { rows: users } = await pool.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.is_admin,
        u.is_suspended,
        u.created_at,
        (SELECT COUNT(*) FROM sessions s WHERE s.user_id = u.id) AS sessions,
        (SELECT COUNT(*) FROM exercises e WHERE e.created_by = u.id AND e.is_system = FALSE) AS custom_exercises,
        (SELECT COUNT(*) FROM workout_plans wp WHERE wp.user_id = u.id) AS plans,
        (SELECT COALESCE(SUM(
          CASE WHEN st.weight = 0 THEN st.reps ELSE st.weight * st.reps END
        ), 0) FROM sets st
        JOIN session_exercises se ON se.id = st.session_exercise_id
        JOIN sessions s ON s.id = se.session_id
        WHERE s.user_id = u.id) AS volume
      FROM users u
      ORDER BY (SELECT COUNT(*) FROM sessions s WHERE s.user_id = u.id) DESC, u.name ASC
    `);

    return res.json({
      globals: {
        totalUsers:            parseInt(globals.total_users, 10),
        totalSessions:         parseInt(globals.total_sessions, 10),
        totalCustomExercises:  parseInt(globals.total_custom_exercises, 10),
        totalSystemExercises:  parseInt(globals.total_system_exercises, 10),
        totalPlans:            parseInt(globals.total_plans, 10),
        totalVolume:           parseFloat(parseFloat(globals.total_volume).toFixed(2)),
        totalReps:             parseInt(globals.total_reps, 10),
        maxWeight:             parseFloat(parseFloat(globals.max_weight).toFixed(1)),
      },
      users: users.map((u) => ({
        id:               u.id,
        name:             u.name,
        email:            u.email,
        isAdmin:          u.is_admin,
        isSuspended:      u.is_suspended || false,
        createdAt:        u.created_at,
        sessions:         parseInt(u.sessions, 10),
        customExercises:  parseInt(u.custom_exercises, 10),
        plans:            parseInt(u.plans, 10),
        volume:           parseFloat(parseFloat(u.volume).toFixed(1)),
      })),
    });
  } catch (err) {
    console.error('getAdminStats:', err.message);
    return res.status(500).json({ message: 'Erro ao obter estatísticas de administração.' });
  }
};

const getSessionsOverTime = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT date::text AS day, COUNT(*) AS count
      FROM sessions
      WHERE date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY date
      ORDER BY date ASC
    `);

    const result = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const found = rows.find((r) => r.day === dayStr);
      result.push({ day: dayStr, count: found ? parseInt(found.count, 10) : 0 });
    }

    return res.json(result);
  } catch (err) {
    console.error('getSessionsOverTime:', err.message);
    return res.status(500).json({ message: 'Erro ao obter sessões ao longo do tempo.' });
  }
};

const getMuscleGroupDistribution = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT e.muscle_group AS name, COUNT(*) AS value
      FROM session_exercises se
      JOIN exercises e ON e.id = se.exercise_id
      GROUP BY e.muscle_group
      ORDER BY value DESC
    `);

    return res.json(rows.map((r) => ({
      name: r.name,
      value: parseInt(r.value, 10),
    })));
  } catch (err) {
    console.error('getMuscleGroupDistribution:', err.message);
    return res.status(500).json({ message: 'Erro ao obter distribuição muscular.' });
  }
};

const getUserGrowth = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*) AS count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month ASC
    `);

    const result = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const year = now.getFullYear();
      const month = now.getMonth() - i;
      const d = new Date(year, month, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const monthStr = `${y}-${m}`;
      const found = rows.find((r) => r.month === monthStr);
      result.push({ month: monthStr, count: found ? parseInt(found.count, 10) : 0 });
    }

    return res.json(result);
  } catch (err) {
    console.error('getUserGrowth:', err.message);
    return res.status(500).json({ message: 'Erro ao obter crescimento de utilizadores.' });
  }
};

const getTopExercises = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT e.name, COUNT(se.id) AS usage_count
      FROM session_exercises se
      JOIN exercises e ON e.id = se.exercise_id
      GROUP BY e.id, e.name
      ORDER BY usage_count DESC
      LIMIT 10
    `);

    return res.json(rows.map((r) => ({
      name: r.name,
      count: parseInt(r.usage_count, 10),
    })));
  } catch (err) {
    console.error('getTopExercises:', err.message);
    return res.status(500).json({ message: 'Erro ao obter top exercícios.' });
  }
};

const getVolumeOverTime = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT TO_CHAR(s.date, 'YYYY-MM') AS month,
             COALESCE(SUM(CASE WHEN st.weight = 0 THEN st.reps ELSE st.weight * st.reps END), 0) AS volume,
             COUNT(DISTINCT s.id) AS sessions,
             COALESCE(SUM(st.reps), 0) AS reps
      FROM sessions s
      JOIN session_exercises se ON se.session_id = s.id
      JOIN sets st ON st.session_exercise_id = se.id
      WHERE s.date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(s.date, 'YYYY-MM')
      ORDER BY month ASC
    `);

    const result = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const year = now.getFullYear();
      const month = now.getMonth() - i;
      const d = new Date(year, month, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const monthStr = `${y}-${m}`;
      const found = rows.find((r) => r.month === monthStr);
      result.push({
        month: monthStr,
        volume: found ? parseFloat(parseFloat(found.volume).toFixed(0)) : 0,
        sessions: found ? parseInt(found.sessions, 10) : 0,
        reps: found ? parseInt(found.reps, 10) : 0,
      });
    }

    return res.json(result);
  } catch (err) {
    console.error('getVolumeOverTime:', err.message);
    return res.status(500).json({ message: 'Erro ao obter volume ao longo do tempo.' });
  }
};

const getDetailedStats = async (req, res) => {
  try {
    const { rows: [extra] } = await pool.query(`
      SELECT
        (SELECT COUNT(DISTINCT s.user_id) FROM sessions s WHERE s.date >= CURRENT_DATE - INTERVAL '7 days') AS active_users_7d,
        (SELECT COUNT(DISTINCT s.user_id) FROM sessions s WHERE s.date >= CURRENT_DATE - INTERVAL '30 days') AS active_users_30d,
        (SELECT COUNT(*) FROM sessions WHERE date >= CURRENT_DATE - INTERVAL '7 days') AS sessions_7d,
        (SELECT COUNT(*) FROM sessions WHERE date >= CURRENT_DATE - INTERVAL '30 days') AS sessions_30d,
        (SELECT COALESCE(AVG(sub.ex_count), 0) FROM (SELECT COUNT(se.id) AS ex_count FROM sessions s JOIN session_exercises se ON se.session_id = s.id GROUP BY s.id) sub) AS avg_exercises_per_session,
        (SELECT COALESCE(AVG(sub.set_count), 0) FROM (SELECT COUNT(st.id) AS set_count FROM sessions s JOIN session_exercises se ON se.session_id = s.id JOIN sets st ON st.session_exercise_id = se.id GROUP BY s.id) sub) AS avg_sets_per_session,
        (SELECT COALESCE(AVG(st.weight), 0) FROM sets st WHERE st.weight > 0) AS avg_weight,
        (SELECT COALESCE(AVG(st.reps), 0) FROM sets st) AS avg_reps_per_set,
        (SELECT COUNT(*) FROM exercises WHERE is_system = FALSE AND created_at >= CURRENT_DATE - INTERVAL '30 days') AS new_exercises_30d,
        (SELECT COUNT(*) FROM workout_plans WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AS new_plans_30d
    `);

    return res.json({
      activeUsers7d: parseInt(extra.active_users_7d, 10),
      activeUsers30d: parseInt(extra.active_users_30d, 10),
      sessions7d: parseInt(extra.sessions_7d, 10),
      sessions30d: parseInt(extra.sessions_30d, 10),
      avgExercisesPerSession: parseFloat(parseFloat(extra.avg_exercises_per_session).toFixed(1)),
      avgSetsPerSession: parseFloat(parseFloat(extra.avg_sets_per_session).toFixed(1)),
      avgWeight: parseFloat(parseFloat(extra.avg_weight).toFixed(1)),
      avgRepsPerSet: parseFloat(parseFloat(extra.avg_reps_per_set).toFixed(1)),
      newExercises30d: parseInt(extra.new_exercises_30d, 10),
      newPlans30d: parseInt(extra.new_plans_30d, 10),
    });
  } catch (err) {
    console.error('getDetailedStats:', err.message);
    return res.status(500).json({ message: 'Erro ao obter estatísticas detalhadas.' });
  }
};

const toggleAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const targetId = parseInt(userId, 10);

    if (targetId === req.user.id) {
      return res.status(400).json({ message: 'Não podes alterar o teu próprio estado de admin.' });
    }

    const { rows: [user] } = await pool.query(
      'SELECT id, is_admin FROM users WHERE id = $1',
      [targetId]
    );

    if (!user) {
      return res.status(404).json({ message: 'Utilizador não encontrado.' });
    }

    const newAdminState = !user.is_admin;
    await pool.query(
      'UPDATE users SET is_admin = $1, updated_at = NOW() WHERE id = $2',
      [newAdminState, targetId]
    );

    return res.json({
      id: targetId,
      isAdmin: newAdminState,
      message: newAdminState
        ? 'Utilizador promovido a administrador.'
        : 'Privilégios de administrador removidos.',
    });
  } catch (err) {
    console.error('toggleAdmin:', err.message);
    return res.status(500).json({ message: 'Erro ao alterar estado de admin.' });
  }
};

const createSystemExercise = async (req, res) => {
  try {
    const { name, muscleGroup, description } = req.body;

    if (!name || !muscleGroup || !description) {
      return res.status(400).json({ message: 'Nome, grupo muscular e descricao sao obrigatorios.' });
    }

    const { rows: existing } = await pool.query(
      `SELECT id FROM exercises WHERE LOWER(name) = LOWER($1) AND is_system = TRUE`,
      [name]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Ja existe um exercicio do sistema com esse nome.' });
    }

    const { rows: [exercise] } = await pool.query(
      `INSERT INTO exercises (name, muscle_group, description, is_system)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id, name, muscle_group AS "muscleGroup", description, is_system AS "isSystem", created_at AS "createdAt"`,
      [name.trim(), muscleGroup, description.trim()]
    );

    return res.status(201).json(exercise);
  } catch (err) {
    console.error('createSystemExercise:', err.message);
    return res.status(500).json({ message: 'Erro ao criar exercicio.' });
  }
};

const deleteSystemExercise = async (req, res) => {
  try {
    const { id } = req.params;

    const { rows: [exercise] } = await pool.query(
      `SELECT id, is_system FROM exercises WHERE id = $1`,
      [id]
    );

    if (!exercise) return res.status(404).json({ message: 'Exercicio nao encontrado.' });
    if (!exercise.is_system) return res.status(403).json({ message: 'Este exercicio nao e do sistema.' });

    await pool.query('DELETE FROM exercises WHERE id = $1', [id]);
    return res.status(204).send();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ message: 'Nao e possivel eliminar. Exercicio em uso em sessoes ou planos.' });
    }
    console.error('deleteSystemExercise:', err.message);
    return res.status(500).json({ message: 'Erro ao eliminar exercicio.' });
  }
};

const getExerciseStats = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        e.id,
        e.name,
        e.muscle_group,
        COUNT(DISTINCT se.id) AS times_used,
        COUNT(DISTINCT s.user_id) AS unique_users,
        COALESCE(SUM(st.reps), 0) AS total_reps,
        COALESCE(MAX(st.weight), 0) AS max_weight,
        COALESCE(AVG(CASE WHEN st.weight > 0 THEN st.weight END), 0) AS avg_weight,
        COALESCE(AVG(st.reps), 0) AS avg_reps,
        COALESCE(SUM(CASE WHEN st.weight = 0 THEN st.reps ELSE st.weight * st.reps END), 0) AS total_volume
      FROM exercises e
      LEFT JOIN session_exercises se ON se.exercise_id = e.id
      LEFT JOIN sessions s ON s.id = se.session_id
      LEFT JOIN sets st ON st.session_exercise_id = se.id
      WHERE e.is_system = TRUE
      GROUP BY e.id, e.name, e.muscle_group
      ORDER BY times_used DESC, e.name ASC
    `);

    return res.json(rows.map((r) => ({
      id: r.id,
      name: r.name,
      muscleGroup: r.muscle_group,
      timesUsed: parseInt(r.times_used, 10),
      uniqueUsers: parseInt(r.unique_users, 10),
      totalReps: parseInt(r.total_reps, 10),
      maxWeight: parseFloat(parseFloat(r.max_weight).toFixed(1)),
      avgWeight: parseFloat(parseFloat(r.avg_weight).toFixed(1)),
      avgReps: parseFloat(parseFloat(r.avg_reps).toFixed(1)),
      totalVolume: parseFloat(parseFloat(r.total_volume).toFixed(0)),
    })));
  } catch (err) {
    console.error('getExerciseStats:', err.message);
    return res.status(500).json({ message: 'Erro ao obter estatísticas de exercícios.' });
  }
};

const toggleSuspend = async (req, res) => {
  try {
    const { userId } = req.params;
    const targetId = parseInt(userId, 10);

    if (targetId === req.user.id) {
      return res.status(400).json({ message: 'Não podes suspender a tua própria conta.' });
    }

    const { rows: [user] } = await pool.query(
      'SELECT id, is_suspended FROM users WHERE id = $1',
      [targetId]
    );

    if (!user) {
      return res.status(404).json({ message: 'Utilizador não encontrado.' });
    }

    const newState = !user.is_suspended;
    await pool.query(
      'UPDATE users SET is_suspended = $1, updated_at = NOW() WHERE id = $2',
      [newState, targetId]
    );

    return res.json({
      id: targetId,
      isSuspended: newState,
      message: newState ? 'Conta suspensa.' : 'Conta reativada.',
    });
  } catch (err) {
    console.error('toggleSuspend:', err.message);
    return res.status(500).json({ message: 'Erro ao alterar estado da conta.' });
  }
};

module.exports = {
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
};
