const express = require('express');
const { body } = require('express-validator');
const {
  getSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession,
  toggleSet,
  updateSet,
  completeSession,
} = require('../controllers/session.controller');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

const setValidation = [
  body('exercises').optional().isArray().withMessage('Exercícios devem ser uma lista'),
  body('exercises.*.exercise').notEmpty().withMessage('ID do exercício é obrigatório'),
  body('exercises.*.sets').isArray({ min: 1 }).withMessage('Deve ter pelo menos uma série'),
  body('exercises.*.sets.*.reps').isInt({ min: 1 }).withMessage('Repetições devem ser pelo menos 1'),
  body('exercises.*.sets.*.weight').isFloat({ min: 0 }).withMessage('Peso não pode ser negativo'),
];

router.get('/', getSessions);

router.patch('/sets/:setId/toggle', toggleSet);
router.patch('/sets/:setId', updateSet);

router.get('/:id', getSession);

router.post('/', [
  body('date').notEmpty().withMessage('Data é obrigatória').isISO8601().withMessage('Data inválida'),
  body('notes').optional().isString(),
  ...setValidation,
], createSession);

router.put('/:id', [
  body('date').optional().isISO8601().withMessage('Data inválida'),
  body('notes').optional().isString(),
  ...setValidation,
], updateSession);

router.delete('/:id', deleteSession);
router.patch('/:id/complete', completeSession);

module.exports = router;
