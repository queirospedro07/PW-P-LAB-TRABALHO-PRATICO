const { validationResult } = require('express-validator');
const Exercise = require('../models/Exercise');

const getExercises = async (req, res) => {
  try {
    const { search, muscleGroup } = req.query;
    const exercises = await Exercise.findAll({ userId: req.user.id, search, muscleGroup });
    return res.json(exercises);
  } catch (err) {
    console.error('getExercises:', err.message);
    return res.status(500).json({ message: 'Erro ao obter exercícios.' });
  }
};

const getMuscleGroups = (req, res) => {
  return res.json(Exercise.MUSCLE_GROUPS);
};

const getExercise = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) return res.status(404).json({ message: 'Exercício não encontrado.' });
    return res.json(exercise);
  } catch (err) {
    return res.status(404).json({ message: 'Exercício não encontrado.' });
  }
};

const createExercise = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, muscleGroup, description } = req.body;
    const userId = req.user.id;

    const existing = await Exercise.findDuplicate({ name, userId });
    if (existing) return res.status(409).json({ message: 'Já existe um exercício com esse nome.' });

    const exercise = await Exercise.create({ name, muscleGroup, description, userId });
    return res.status(201).json(exercise);
  } catch (err) {
    console.error('createExercise:', err.message);
    return res.status(500).json({ message: 'Erro ao criar exercício.' });
  }
};

const updateExercise = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) return res.status(404).json({ message: 'Exercício não encontrado.' });

    if (exercise.isSystem || exercise.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Sem permissão para editar este exercício.' });
    }

    const updated = await Exercise.update(req.params.id, req.body);
    return res.json(updated);
  } catch (err) {
    console.error('updateExercise:', err.message);
    return res.status(500).json({ message: 'Erro ao atualizar exercício.' });
  }
};

const deleteExercise = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) return res.status(404).json({ message: 'Exercício não encontrado.' });

    if (exercise.isSystem || exercise.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Sem permissão para eliminar este exercício.' });
    }

    await Exercise.delete(req.params.id);
    return res.status(204).send();
  } catch (err) {
    console.error('deleteExercise:', err.message);
    if (err.code === '23503') {
      return res.status(409).json({
        message: 'Não é possível eliminar este exercício porque está a ser usado em sessões ou planos de treino.',
      });
    }
    return res.status(500).json({ message: 'Erro ao eliminar exercício.' });
  }
};

module.exports = { getExercises, getExercise, createExercise, updateExercise, deleteExercise, getMuscleGroups };
