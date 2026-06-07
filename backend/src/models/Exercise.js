const { pool } = require('../database/connection');

const MUSCLE_GROUPS = ['peito', 'costas', 'pernas', 'ombros', 'braços', 'core', 'cardio', 'outro'];

const Exercise = {
  async findAll({ userId, search, muscleGroup }) {
    const params = [userId];
    let where = `WHERE (e.is_system = TRUE OR e.created_by = $1)`;
    let idx = 2;

    if (muscleGroup) {
      where += ` AND e.muscle_group = $${idx++}`;
      params.push(muscleGroup);
    }
    if (search) {
      where += ` AND e.name ILIKE $${idx++}`;
      params.push(`%${search}%`);
    }

    const { rows } = await pool.query(
      `SELECT e.id, e.name, e.muscle_group AS "muscleGroup",
              e.description, e.is_system AS "isSystem",
              e.created_by AS "createdBy", e.created_at AS "createdAt"
       FROM exercises e
       ${where}
       ORDER BY e.is_system DESC, e.name ASC`,
      params
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT id, name, muscle_group AS "muscleGroup",
              description, is_system AS "isSystem",
              created_by AS "createdBy", created_at AS "createdAt"
       FROM exercises WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async findDuplicate({ name, userId }) {
    const { rows } = await pool.query(
      `SELECT id FROM exercises
       WHERE LOWER(name) = LOWER($1)
         AND (is_system = TRUE OR created_by = $2)`,
      [name, userId]
    );
    return rows[0] || null;
  },

  async create({ name, muscleGroup, description, userId }) {
    const { rows } = await pool.query(
      `INSERT INTO exercises (name, muscle_group, description, is_system, created_by)
       VALUES ($1, $2, $3, FALSE, $4)
       RETURNING id, name, muscle_group AS "muscleGroup",
                 description, is_system AS "isSystem",
                 created_by AS "createdBy", created_at AS "createdAt"`,
      [name.trim(), muscleGroup, description.trim(), userId]
    );
    return rows[0];
  },

  async update(id, { name, muscleGroup, description }) {
    const fields = [];
    const params = [];
    let idx = 1;

    if (name)        { fields.push(`name = $${idx++}`);         params.push(name.trim()); }
    if (muscleGroup) { fields.push(`muscle_group = $${idx++}`); params.push(muscleGroup); }
    if (description) { fields.push(`description = $${idx++}`);  params.push(description.trim()); }
    fields.push(`updated_at = NOW()`);
    params.push(id);

    const { rows } = await pool.query(
      `UPDATE exercises SET ${fields.join(', ')}
       WHERE id = $${idx}
       RETURNING id, name, muscle_group AS "muscleGroup",
                 description, is_system AS "isSystem",
                 created_by AS "createdBy"`,
      params
    );
    return rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM exercises WHERE id = $1', [id]);
  },
};

module.exports = Exercise;
module.exports.MUSCLE_GROUPS = MUSCLE_GROUPS;
