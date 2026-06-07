const express = require('express');
const { body } = require('express-validator');
const { getPlans, getPlan, createPlan, updatePlan, deletePlan } = require('../controllers/plan.controller');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

const exerciseValidation = [
  body('exercises').optional().isArray().withMessage('Exercícios devem ser uma lista'),
  body('exercises.*.exerciseId').notEmpty().withMessage('ID do exercício é obrigatório'),
  body('exercises.*.sets').isInt({ min: 1 }).withMessage('Séries devem ser pelo menos 1'),
  body('exercises.*.reps').isInt({ min: 1 }).withMessage('Repetições devem ser pelo menos 1'),
  body('exercises.*.weight').isFloat({ min: 0 }).withMessage('Peso não pode ser negativo'),
];

router.get('/', getPlans);
router.get('/:id', getPlan);

router.post('/', [
  body('name').trim().notEmpty().withMessage('Nome é obrigatório'),
  body('description').optional().isString(),
  ...exerciseValidation,
], createPlan);

router.put('/:id', [
  body('name').optional().trim().notEmpty().withMessage('Nome não pode ser vazio'),
  body('description').optional().isString(),
  ...exerciseValidation,
], updatePlan);

router.delete('/:id', deletePlan);

module.exports = router;
