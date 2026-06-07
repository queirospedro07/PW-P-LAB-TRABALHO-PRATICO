require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { pool } = require('./connection');

const exercises = [
  { name: 'Supino Reto com Barra', muscle_group: 'peito', description: 'Exercicio composto para o peitoral maior. Deitado no banco, desca a barra ao peito e empurre para cima.' },
  { name: 'Supino Inclinado com Halteres', muscle_group: 'peito', description: 'Variante do supino com foco na parte superior do peitoral. Use banco inclinado a 30-45 graus.' },
  { name: 'Flexoes', muscle_group: 'peito', description: 'Exercicio com peso corporal para o peitoral. Mantenha o corpo reto e desca ate o peito quase tocar o chao.' },
  { name: 'Crossover com Cabos', muscle_group: 'peito', description: 'Isolamento do peitoral com cabos. Cruze as maos a frente do corpo contraindo o peito.' },
  { name: 'Puxada Frontal', muscle_group: 'costas', description: 'Exercicio para o grande dorsal. Puxe a barra ate ao peito mantendo os cotovelos apontados para baixo.' },
  { name: 'Remada Curvada com Barra', muscle_group: 'costas', description: 'Exercicio composto para as costas. Incline o tronco e puxe a barra ate ao abdomen.' },
  { name: 'Pulldown com Cabo', muscle_group: 'costas', description: 'Variante da puxada com cabo para maior amplitude de movimento.' },
  { name: 'Remada Unilateral com Halter', muscle_group: 'costas', description: 'Exercicio unilateral para as costas. Apoie um joelho no banco e puxe o halter.' },
  { name: 'Agachamento Livre', muscle_group: 'pernas', description: 'Exercicio composto para quadriceps, gluteos e isquiotibiais. Desca ate as coxas ficarem paralelas ao chao.' },
  { name: 'Leg Press 45', muscle_group: 'pernas', description: 'Exercicio para quadriceps e gluteos na maquina de leg press inclinada.' },
  { name: 'Extensao de Pernas', muscle_group: 'pernas', description: 'Isolamento do quadriceps na maquina de extensao.' },
  { name: 'Curl de Pernas', muscle_group: 'pernas', description: 'Isolamento dos isquiotibiais na maquina de curl.' },
  { name: 'Desenvolvimento com Barra', muscle_group: 'ombros', description: 'Exercicio composto para os deltoides. Empurre a barra acima da cabeca a partir dos ombros.' },
  { name: 'Elevacao Lateral com Halteres', muscle_group: 'ombros', description: 'Isolamento do deltoide medio. Eleve os halteres lateralmente ate a altura dos ombros.' },
  { name: 'Elevacao Frontal', muscle_group: 'ombros', description: 'Isolamento do deltoide anterior. Eleve o halter a frente do corpo.' },
  { name: 'Rosca Direta com Barra', muscle_group: 'bracos', description: 'Exercicio de isolamento para o biceps. Flexione os cotovelos mantendo-os junto ao corpo.' },
  { name: 'Rosca Alternada com Halteres', muscle_group: 'bracos', description: 'Variante da rosca para biceps com alternancia de bracos.' },
  { name: 'Triceps Testa', muscle_group: 'bracos', description: 'Exercicio de isolamento para o triceps. Deitado, desca a barra ate a testa e empurre para cima.' },
  { name: 'Triceps Corda', muscle_group: 'bracos', description: 'Isolamento do triceps com corda no cabo. Estenda os bracos para baixo.' },
  { name: 'Prancha', muscle_group: 'core', description: 'Exercicio isometrico para o core. Mantenha o corpo reto apoiado nos antebracos e pontas dos pes.' },
  { name: 'Abdominais Crunch', muscle_group: 'core', description: 'Exercicio para o reto abdominal. Eleve os ombros do chao contraindo o abdomen.' },
  { name: 'Prancha Lateral', muscle_group: 'core', description: 'Exercicio isometrico para os obliquos. Apoie-se num antebraco lateralmente.' },
  { name: 'Corrida na Passadeira', muscle_group: 'cardio', description: 'Exercicio cardiovascular. Registe a distancia em km como peso e o tempo em minutos como repeticoes.' },
  { name: 'Bicicleta Estatica', muscle_group: 'cardio', description: 'Exercicio cardiovascular de baixo impacto. Registe o tempo em minutos.' },
];

const seed = async () => {
  const client = await pool.connect();
  try {
    console.log('A popular a base de dados...');

    for (const ex of exercises) {
      const { rows: existing } = await client.query(
        `SELECT id FROM exercises WHERE name = $1 AND is_system = TRUE`,
        [ex.name]
      );

      if (existing.length > 0) {
        await client.query(
          `UPDATE exercises SET muscle_group = $1, description = $2 WHERE id = $3`,
          [ex.muscle_group, ex.description, existing[0].id]
        );
      } else {
        await client.query(
          `INSERT INTO exercises (name, muscle_group, description, is_system)
           VALUES ($1, $2, $3, TRUE)`,
          [ex.name, ex.muscle_group, ex.description]
        );
      }
    }
    console.log(`${exercises.length} exercicios sincronizados.`);

    const plans = [
      {
        name: 'Push Day',
        description: 'Treino focado em peito, ombros e triceps',
        exercises: [
          { name: 'Supino Reto com Barra', sets: 4, reps: 8, weight: 70 },
          { name: 'Supino Inclinado com Halteres', sets: 3, reps: 10, weight: 24 },
          { name: 'Crossover com Cabos', sets: 3, reps: 12, weight: 15 },
          { name: 'Desenvolvimento com Barra', sets: 4, reps: 8, weight: 40 },
          { name: 'Elevacao Lateral com Halteres', sets: 3, reps: 12, weight: 10 },
          { name: 'Triceps Testa', sets: 3, reps: 10, weight: 25 },
        ],
      },
      {
        name: 'Pull Day',
        description: 'Treino focado em costas e biceps',
        exercises: [
          { name: 'Puxada Frontal', sets: 4, reps: 10, weight: 55 },
          { name: 'Remada Curvada com Barra', sets: 4, reps: 8, weight: 60 },
          { name: 'Remada Unilateral com Halter', sets: 3, reps: 10, weight: 28 },
          { name: 'Pulldown com Cabo', sets: 3, reps: 12, weight: 40 },
          { name: 'Rosca Direta com Barra', sets: 3, reps: 10, weight: 30 },
          { name: 'Rosca Alternada com Halteres', sets: 3, reps: 12, weight: 14 },
        ],
      },
      {
        name: 'Leg Day',
        description: 'Treino focado em pernas e core',
        exercises: [
          { name: 'Agachamento Livre', sets: 4, reps: 8, weight: 80 },
          { name: 'Leg Press 45', sets: 4, reps: 10, weight: 120 },
          { name: 'Extensao de Pernas', sets: 3, reps: 12, weight: 45 },
          { name: 'Curl de Pernas', sets: 3, reps: 12, weight: 35 },
          { name: 'Abdominais Crunch', sets: 3, reps: 15, weight: 0 },
          { name: 'Prancha', sets: 3, reps: 1, weight: 0 },
        ],
      },
      {
        name: 'Upper Body',
        description: 'Treino completo de tronco',
        exercises: [
          { name: 'Supino Reto com Barra', sets: 3, reps: 10, weight: 60 },
          { name: 'Remada Curvada com Barra', sets: 3, reps: 10, weight: 50 },
          { name: 'Desenvolvimento com Barra', sets: 3, reps: 10, weight: 35 },
          { name: 'Puxada Frontal', sets: 3, reps: 10, weight: 50 },
          { name: 'Rosca Direta com Barra', sets: 3, reps: 12, weight: 25 },
          { name: 'Triceps Corda', sets: 3, reps: 12, weight: 20 },
        ],
      },
      {
        name: 'Cardio e Core',
        description: 'Sessao de cardio com trabalho abdominal',
        exercises: [
          { name: 'Corrida na Passadeira', sets: 1, reps: 30, weight: 8 },
          { name: 'Bicicleta Estatica', sets: 1, reps: 20, weight: 0 },
          { name: 'Prancha', sets: 3, reps: 1, weight: 0 },
          { name: 'Abdominais Crunch', sets: 3, reps: 20, weight: 0 },
          { name: 'Prancha Lateral', sets: 3, reps: 1, weight: 0 },
        ],
      },
    ];

    const { rows: allExercises } = await client.query(
      `SELECT id, name FROM exercises WHERE is_system = TRUE`
    );
    const exMap = new Map(allExercises.map((e) => [e.name, e.id]));

    for (const plan of plans) {
      const { rows: existing } = await client.query(
        `SELECT id FROM workout_plans WHERE name = $1 AND is_system = TRUE`,
        [plan.name]
      );

      let planId;
      if (existing.length > 0) {
        planId = existing[0].id;
        await client.query(`DELETE FROM plan_exercises WHERE plan_id = $1`, [planId]);
        await client.query(
          `UPDATE workout_plans SET description = $1 WHERE id = $2`,
          [plan.description, planId]
        );
      } else {
        const { rows: [newPlan] } = await client.query(
          `INSERT INTO workout_plans (user_id, name, description, is_system)
           VALUES (NULL, $1, $2, TRUE) RETURNING id`,
          [plan.name, plan.description]
        );
        planId = newPlan.id;
      }

      for (let i = 0; i < plan.exercises.length; i++) {
        const pe = plan.exercises[i];
        const exId = exMap.get(pe.name);
        if (!exId) continue;
        await client.query(
          `INSERT INTO plan_exercises (plan_id, exercise_id, sort_order, sets, reps, weight)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [planId, exId, i, pe.sets, pe.reps, pe.weight]
        );
      }
    }
    console.log(`${plans.length} planos do sistema sincronizados.`);

    console.log('Seed concluido.');
  } catch (err) {
    console.error('Erro no seed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

seed().then(() => process.exit(0)).catch(() => process.exit(1));
