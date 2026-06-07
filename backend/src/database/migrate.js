require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { pool } = require('./connection');

const migrate = async () => {
  const client = await pool.connect();
  try {
    console.log('A executar migrações...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        email      VARCHAR(255) NOT NULL UNIQUE,
        password   VARCHAR(255) NOT NULL,
        is_admin   BOOLEAN      NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS exercises (
        id           SERIAL PRIMARY KEY,
        name         VARCHAR(255) NOT NULL,
        muscle_group VARCHAR(50)  NOT NULL,
        description  TEXT         NOT NULL,
        is_system    BOOLEAN      NOT NULL DEFAULT FALSE,
        created_by   INTEGER      REFERENCES users(id) ON DELETE SET NULL,
        created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date       DATE         NOT NULL,
        notes      TEXT         NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS session_exercises (
        id          SERIAL  PRIMARY KEY,
        session_id  INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
        sort_order  INTEGER NOT NULL DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sets (
        id                  SERIAL  PRIMARY KEY,
        session_exercise_id INTEGER NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
        reps                INTEGER NOT NULL CHECK (reps >= 1),
        weight              NUMERIC(8,2) NOT NULL CHECK (weight >= 0),
        sort_order          INTEGER NOT NULL DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS workout_plans (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER      REFERENCES users(id) ON DELETE CASCADE,
        name        VARCHAR(255) NOT NULL,
        description TEXT         NOT NULL DEFAULT '',
        is_system   BOOLEAN      NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS plan_exercises (
        id          SERIAL  PRIMARY KEY,
        plan_id     INTEGER NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
        exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
        sort_order  INTEGER NOT NULL DEFAULT 0,
        sets        INTEGER NOT NULL DEFAULT 3 CHECK (sets >= 1),
        reps        INTEGER NOT NULL DEFAULT 10 CHECK (reps >= 1),
        weight      NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (weight >= 0)
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_user_date   ON sessions(user_id, date DESC);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_date        ON sessions(date DESC);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_exercises_muscle     ON exercises(muscle_group);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_exercises_created_by ON exercises(created_by);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sets_se_id           ON sets(session_exercise_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_plans_user_id        ON workout_plans(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_plan_exercises_plan  ON plan_exercises(plan_id);`);

    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT FALSE;`);
    await client.query(`ALTER TABLE workout_plans ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT FALSE;`);

    await client.query(`ALTER TABLE workout_plans ALTER COLUMN user_id DROP NOT NULL;`);

    console.log('Migrações concluídas com sucesso.');
  } catch (err) {
    console.error('Erro nas migrações:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

migrate().then(() => process.exit(0)).catch(() => process.exit(1));
