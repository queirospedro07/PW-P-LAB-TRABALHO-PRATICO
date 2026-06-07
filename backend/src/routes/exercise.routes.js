const express = require('express');
const { body } = require('express-validator');
const {
  getExercises,
  getExercise,
  createExercise,
  updateExercise,
  deleteExercise,
  getMuscleGroups,
} = require('../controllers/exercise.controller');
const { protect } = require('../middleware/auth');
const { MUSCLE_GROUPS } = require('../models/Exercise');

const router = express.Router();

router.use(protect);

router.get('/muscle-groups', getMuscleGroups);
router.get('/', getExercises);
router.get('/:id', getExercise);

router.post('/', [
  body('name').trim().notEmpty().withMessage('Nome é obrigatório'),
  body('muscleGroup').isIn(MUSCLE_GROUPS).withMessage('Grupo muscular inválido'),
  body('description').trim().notEmpty().withMessage('Descrição é obrigatória'),
], createExercise);

router.put('/:id', [
  body('name').optional().trim().notEmpty().withMessage('Nome não pode ser vazio'),
  body('muscleGroup').optional().isIn(MUSCLE_GROUPS).withMessage('Grupo muscular inválido'),
  body('description').optional().trim().notEmpty().withMessage('Descrição não pode ser vazia'),
], updateExercise);

router.delete('/:id', deleteExercise);

module.exports = router;
