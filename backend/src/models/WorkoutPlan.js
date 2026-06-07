const { pool } = require('../database/connection');

const buildPlan = (rows) => {
  if (!rows.length) return null;
  const first = rows[0];
  const plan = {
    id: first.plan_id,
    name: first.plan_name,
    description: first.plan_description,
    userId: first.user_id,
    isSystem: first.is_system || false,
    createdAt: first.created_at,
    exercises: [],
  };

  const seen = new Map();
  for (const row of rows) {
    if (!row.pe_id) continue;
    if (!seen.has(row.pe_id)) {
      seen.set(row.pe_id, {
        id: row.pe_id,
        exercise: {
          id: row.ex_id,
          name: row.ex_name,
          muscleGroup: row.ex_muscle_group,
          description: row.ex_description,
        },
        sets: row.pe_sets,
        reps: row.pe_reps,
        weight: parseFloat(row.pe_weight),
        order: row.pe_order,
      });
    }
  }

  plan.exercises = [...seen.values()].sort((a, b) => a.order - b.order);
  return plan;
};

const PLAN_QUERY = `
  SELECT
    wp.id          AS plan_id,
    wp.name        AS plan_name,
    wp.description AS plan_description,
    wp.user_id,
    wp.is_system,
    wp.created_at,
    pe.id          AS pe_id,
    pe.sort_order  AS pe_order,
    pe.sets        AS pe_sets,
    pe.reps        AS pe_reps,
    pe.weight      AS pe_weight,
    e.id           AS ex_id,
    e.name         AS ex_name,
    e.muscle_group AS ex_muscle_group,
    e.description  AS ex_description
  FROM workout_plans wp
  LEFT JOIN plan_exercises pe ON pe.plan_id = wp.id
  LEFT JOIN exercises e       ON e.id = pe.exercise_id
`;

const WorkoutPlan = {
  async findAll(userId) {
    const { rows } = await pool.query(
      `${PLAN_QUERY} WHERE wp.user_id = $1 OR wp.is_system = TRUE ORDER BY wp.is_system DESC, wp.created_at DESC, pe.sort_order`,
      [userId]
    );

    const planMap = new Map();
    for (const row of rows) {
      if (!planMap.has(row.plan_id)) planMap.set(row.plan_id, []);
      planMap.get(row.plan_id).push(row);
    }

    return [...planMap.values()].map(buildPlan).filter(Boolean);
  },

  async findById(id) {
    const { rows } = await pool.query(
      `${PLAN_QUERY} WHERE wp.id = $1 ORDER BY pe.sort_order`,
      [id]
    );
    return buildPlan(rows);
  },

  async create({ userId, name, description, exercises }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: [plan] } = await client.query(
        `INSERT INTO workout_plans (user_id, name, description)
         VALUES ($1, $2, $3) RETURNING id`,
        [userId, name.trim(), (description || '').trim()]
      );

      await WorkoutPlan._insertExercises(plan.id, exercises || [], client);
      await client.query('COMMIT');
      return WorkoutPlan.findById(plan.id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async update(id, { name, description, exercises }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const fields = [];
      const params = [];
      let idx = 1;
      if (name        !== undefined) { fields.push(`name = $${idx++}`);        params.push(name.trim()); }
      if (description !== undefined) { fields.push(`description = $${idx++}`); params.push(description.trim()); }
      fields.push(`updated_at = NOW()`);
      params.push(id);

      await client.query(
        `UPDATE workout_plans SET ${fields.join(', ')} WHERE id = $${idx}`,
        params
      );

      if (exercises !== undefined) {
        await client.query('DELETE FROM plan_exercises WHERE plan_id = $1', [id]);
        await WorkoutPlan._insertExercises(id, exercises, client);
      }

      await client.query('COMMIT');
      return WorkoutPlan.findById(id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async delete(id) {
    await pool.query('DELETE FROM workout_plans WHERE id = $1', [id]);
  },

  async _insertExercises(planId, exercises, client) {
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      const exId = ex.exerciseId || ex.exercise_id || ex.exercise;
      await client.query(
        `INSERT INTO plan_exercises (plan_id, exercise_id, sort_order, sets, reps, weight)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [planId, exId, ex.order ?? i, ex.sets || 3, ex.reps || 10, ex.weight || 0]
      );
    }
  },
};

module.exports = WorkoutPlan;
