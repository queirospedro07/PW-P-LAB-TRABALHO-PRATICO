const { validationResult } = require('express-validator');
const WorkoutPlan = require('../models/WorkoutPlan');

const getPlans = async (req, res) => {
  try {
    const plans = await WorkoutPlan.findAll(req.user.id);
    return res.json(plans);
  } catch (err) {
    console.error('getPlans:', err.message);
    return res.status(500).json({ message: 'Erro ao obter planos.' });
  }
};

const getPlan = async (req, res) => {
  try {
    const plan = await WorkoutPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: 'Plano não encontrado.' });
    if (!plan.isSystem && plan.userId !== req.user.id) return res.status(403).json({ message: 'Sem permissão.' });
    return res.json(plan);
  } catch (err) {
    return res.status(404).json({ message: 'Plano não encontrado.' });
  }
};

const createPlan = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, description, exercises } = req.body;
    const plan = await WorkoutPlan.create({ userId: req.user.id, name, description, exercises });
    return res.status(201).json(plan);
  } catch (err) {
    console.error('createPlan:', err.message);
    if (err.code === '23503') return res.status(400).json({ message: 'Exercício referenciado não existe.' });
    return res.status(500).json({ message: 'Erro ao criar plano.' });
  }
};

const updatePlan = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const plan = await WorkoutPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: 'Plano não encontrado.' });
    if (plan.isSystem) return res.status(403).json({ message: 'Planos do sistema não podem ser editados.' });
    if (plan.userId !== req.user.id) return res.status(403).json({ message: 'Sem permissão.' });

    const { name, description, exercises } = req.body;
    const updated = await WorkoutPlan.update(req.params.id, { name, description, exercises });
    return res.json(updated);
  } catch (err) {
    console.error('updatePlan:', err.message);
    return res.status(500).json({ message: 'Erro ao atualizar plano.' });
  }
};

const deletePlan = async (req, res) => {
  try {
    const plan = await WorkoutPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: 'Plano não encontrado.' });
    if (plan.isSystem) return res.status(403).json({ message: 'Planos do sistema não podem ser eliminados.' });
    if (plan.userId !== req.user.id) return res.status(403).json({ message: 'Sem permissão.' });

    await WorkoutPlan.delete(req.params.id);
    return res.status(204).send();
  } catch (err) {
    console.error('deletePlan:', err.message);
    return res.status(500).json({ message: 'Erro ao eliminar plano.' });
  }
};

module.exports = { getPlans, getPlan, createPlan, updatePlan, deletePlan };
