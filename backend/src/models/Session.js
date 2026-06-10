const { pool } = require('../database/connection');

const calcVolume = (sets) =>
  sets.reduce((acc, s) => {
    const w = parseFloat(s.weight);
    const r = parseInt(s.reps, 10);
    return acc + (w === 0 ? r : parseFloat((w * r).toFixed(2)));
  }, 0);

const buildSession = (rows) => {
  if (!rows.length) return null;

  const first = rows[0];
  const session = {
    _id: first.session_id,
    id: first.session_id,
    user: first.user_id,
    date: first.date,
    notes: first.notes,
    status: first.status || 'completed',
    createdAt: first.created_at,
    exercises: [],
  };

  const exMap = new Map();

  for (const row of rows) {
    if (!row.se_id) continue;

    if (!exMap.has(row.se_id)) {
      exMap.set(row.se_id, {
        _id: row.se_id,
        exercise: {
          _id: row.ex_id,
          id: row.ex_id,
          name: row.ex_name,
          muscleGroup: row.ex_muscle_group,
          description: row.ex_description,
        },
        order: row.se_order,
        sets: [],
      });
    }

    if (row.set_id) {
      exMap.get(row.se_id).sets.push({
        _id: row.set_id,
        reps: parseInt(row.set_reps, 10),
        weight: parseFloat(row.set_weight),
        order: row.set_order,
        completed: row.set_completed !== false && row.set_completed !== 'f',
      });
    }
  }

  session.exercises = [...exMap.values()].sort((a, b) => a.order - b.order);

  let totalVolume = 0;
  const volumeByExercise = {};
  for (const ex of session.exercises) {
    const vol = parseFloat(calcVolume(ex.sets).toFixed(2));
    volumeByExercise[ex.exercise.id] = vol;
    totalVolume += vol;
  }
  session.totalVolume = parseFloat(totalVolume.toFixed(2));
  session.volumeByExercise = volumeByExercise;

  return session;
};

const SESSION_QUERY = `
  SELECT
    s.id          AS session_id,
    s.user_id,
    s.date,
    s.notes,
    s.status,
    s.created_at,
    se.id         AS se_id,
    se.sort_order AS se_order,
    e.id          AS ex_id,
    e.name        AS ex_name,
    e.muscle_group AS ex_muscle_group,
    e.description  AS ex_description,
    st.id         AS set_id,
    st.reps       AS set_reps,
    st.weight     AS set_weight,
    st.sort_order AS set_order,
    st.completed  AS set_completed
  FROM sessions s
  LEFT JOIN session_exercises se ON se.session_id = s.id
  LEFT JOIN exercises e          ON e.id = se.exercise_id
  LEFT JOIN sets st              ON st.session_exercise_id = se.id
`;

const Session = {
  async findAll({ userId, startDate, endDate, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const params = [userId];
    let dateWhere = '';
    let idx = 2;

    if (startDate) { dateWhere += ` AND s.date >= $${idx++}`; params.push(startDate); }
    if (endDate)   { dateWhere += ` AND s.date <= $${idx++}`; params.push(endDate); }

    const { rows: idRows } = await pool.query(
      `SELECT id FROM sessions s
       WHERE s.user_id = $1 ${dateWhere}
       ORDER BY s.date DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM sessions s WHERE s.user_id = $1 ${dateWhere}`,
      params
    );

    if (!idRows.length) {
      return { sessions: [], total: parseInt(countRows[0].count, 10) };
    }

    const ids = idRows.map((r) => r.id);
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');

    const { rows } = await pool.query(
      `${SESSION_QUERY}
       WHERE s.id IN (${placeholders})
       ORDER BY s.date DESC, se.sort_order, st.sort_order`,
      ids
    );

    const sessionMap = new Map();
    for (const row of rows) {
      if (!sessionMap.has(row.session_id)) sessionMap.set(row.session_id, []);
      sessionMap.get(row.session_id).push(row);
    }

    const sessions = ids
      .map((id) => buildSession(sessionMap.get(id) || []))
      .filter(Boolean);

    return { sessions, total: parseInt(countRows[0].count, 10) };
  },

  async findById(id) {
    const { rows } = await pool.query(
      `${SESSION_QUERY}
       WHERE s.id = $1
       ORDER BY se.sort_order, st.sort_order`,
      [id]
    );
    return buildSession(rows);
  },

  async create({ userId, date, notes, exercises, status }, client) {
    const c = client || pool;

    const { rows: [session] } = await c.query(
      `INSERT INTO sessions (user_id, date, notes, status)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [userId, date, notes || '', status || 'completed']
    );

    await Session._insertExercises(session.id, exercises || [], c);
    return Session.findById(session.id);
  },

  async update(id, { date, notes, exercises, status }, client) {
    const c = client || pool;

    const fields = [];
    const params = [];
    let idx = 1;

    if (date    !== undefined) { fields.push(`date = $${idx++}`);   params.push(date); }
    if (notes   !== undefined) { fields.push(`notes = $${idx++}`);  params.push(notes); }
    if (status  !== undefined) { fields.push(`status = $${idx++}`); params.push(status); }
    fields.push(`updated_at = NOW()`);
    params.push(id);

    if (fields.length > 1) {
      await c.query(
        `UPDATE sessions SET ${fields.join(', ')} WHERE id = $${idx}`,
        params
      );
    }

    if (exercises !== undefined) {
      await c.query('DELETE FROM session_exercises WHERE session_id = $1', [id]);
      await Session._insertExercises(id, exercises, c);
    }

    return Session.findById(id);
  },

  async delete(id) {
    await pool.query('DELETE FROM sessions WHERE id = $1', [id]);
  },

  async _insertExercises(sessionId, exercises, c) {
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      const exId = ex.exercise || ex.exercise_id || ex.exerciseId;
      const completed = ex.completed !== undefined ? ex.completed : true;

      const { rows: [se] } = await c.query(
        `INSERT INTO session_exercises (session_id, exercise_id, sort_order)
         VALUES ($1, $2, $3) RETURNING id`,
        [sessionId, exId, ex.order ?? i]
      );

      const sets = ex.sets || [];
      for (let j = 0; j < sets.length; j++) {
        const s = sets[j];
        await c.query(
          `INSERT INTO sets (session_exercise_id, reps, weight, sort_order, completed)
           VALUES ($1, $2, $3, $4, $5)`,
          [se.id, s.reps, s.weight, s.order ?? j, s.completed !== undefined ? s.completed : true]
        );
      }
    }
  },

  async toggleSet(setId, completed) {
    await pool.query(
      `UPDATE sets SET completed = $1 WHERE id = $2`,
      [completed, setId]
    );
  },

  async updateSet(setId, { reps, weight }) {
    const fields = [];
    const params = [];
    let idx = 1;
    if (reps !== undefined) { fields.push(`reps = $${idx++}`); params.push(reps); }
    if (weight !== undefined) { fields.push(`weight = $${idx++}`); params.push(weight); }
    if (fields.length === 0) return;
    params.push(setId);
    await pool.query(
      `UPDATE sets SET ${fields.join(', ')} WHERE id = $${idx}`,
      params
    );
  },

  async completeSession(id) {
    await pool.query(
      `UPDATE sessions SET status = 'completed', updated_at = NOW() WHERE id = $1`,
      [id]
    );
    return Session.findById(id);
  },
};

module.exports = Session;
