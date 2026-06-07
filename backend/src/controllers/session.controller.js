const { validationResult } = require('express-validator');
const Session = require('../models/Session');

const getSessions = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 20 } = req.query;
    const { sessions, total } = await Session.findAll({
      userId: req.user.id,
      startDate,
      endDate,
      page: Number(page),
      limit: Number(limit),
    });

    return res.json({ sessions, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('getSessions:', err.message);
    return res.status(500).json({ message: 'Erro ao obter sessões.' });
  }
};

const getSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Sessão não encontrada.' });
    if (session.user !== req.user.id) return res.status(403).json({ message: 'Sem permissão para aceder a esta sessão.' });
    return res.json(session);
  } catch (err) {
    return res.status(404).json({ message: 'Sessão não encontrada.' });
  }
};

const createSession = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { date, notes, exercises } = req.body;
    const session = await Session.create({ userId: req.user.id, date, notes, exercises });
    return res.status(201).json(session);
  } catch (err) {
    console.error('createSession:', err.message);
    if (err.code === '23503') {
      return res.status(400).json({ message: 'Exercício referenciado não existe.' });
    }
    return res.status(500).json({ message: 'Erro ao criar sessão.' });
  }
};

const updateSession = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const existing = await Session.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Sessão não encontrada.' });
    if (existing.user !== req.user.id) return res.status(403).json({ message: 'Sem permissão para editar esta sessão.' });

    const { date, notes, exercises } = req.body;
    const session = await Session.update(req.params.id, { date, notes, exercises });
    return res.json(session);
  } catch (err) {
    console.error('updateSession:', err.message);
    return res.status(500).json({ message: 'Erro ao atualizar sessão.' });
  }
};

const deleteSession = async (req, res) => {
  try {
    const existing = await Session.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Sessão não encontrada.' });
    if (existing.user !== req.user.id) return res.status(403).json({ message: 'Sem permissão para eliminar esta sessão.' });

    await Session.delete(req.params.id);
    return res.status(204).send();
  } catch (err) {
    console.error('deleteSession:', err.message);
    return res.status(500).json({ message: 'Erro ao eliminar sessão.' });
  }
};

module.exports = { getSessions, getSession, createSession, updateSession, deleteSession };
