# Workout Tracker

> Aplicacao web full-stack para registo e acompanhamento de treinos de ginasio com modo de treino ao vivo, estatisticas detalhadas e leaderboard entre utilizadores.

**Disciplina:** Programacao Web | **Curso:** CTeSP TPSI - IPVC

---

## Funcionalidades

### Para Utilizadores

| Funcionalidade | Descricao |
|----------------|-----------|
| Treino ao vivo | Inicia um treino, confirma cada serie com um check a medida que completas e ve o progresso em tempo real |
| Registar treino passado | Adiciona um treino ja realizado com exercicios, series, peso e repeticoes |
| Exercicios | Biblioteca com 24 exercicios do sistema + criacao de exercicios pessoais |
| Planos de treino | Cria planos reutilizaveis e inicia sessoes pre-preenchidas com um clique |
| Dashboard | Resumo semanal, grafico de atividade, top exercicios e ultimo treino |
| Historico | Grafico de evolucao do peso por exercicio ao longo do tempo |
| Leaderboard | Ranking publico em 4 categorias: volume, sessoes, peso maximo e cardio |

### Para Administradores

| Funcionalidade | Descricao |
|----------------|-----------|
| Graficos | Sessoes diarias/mensais, crescimento de utilizadores, top exercicios |
| Gestao de utilizadores | Promover/remover admin, suspender/reativar contas |
| Gestao de exercicios | Criar/eliminar exercicios do sistema com estatisticas detalhadas |
| Estatisticas globais | Volume total, repeticoes, medias, utilizadores ativos |

---

## Tecnologias

### Backend

| Tecnologia | Funcao |
|------------|--------|
| Node.js + Express | API REST |
| PostgreSQL | Base de dados relacional |
| jsonwebtoken | Autenticacao JWT |
| bcryptjs | Hashing de passwords |
| express-validator | Validacao de dados |

### Frontend

| Tecnologia | Funcao |
|------------|--------|
| React 18 + Vite | Interface reativa com build rapido |
| react-router-dom | Navegacao SPA |
| Axios | Pedidos HTTP com interceptors |
| Recharts | Graficos interativos |
| react-icons | Icones (Feather Icons) |

---

## Como Executar

### Pre-requisitos

- Node.js 18+
- PostgreSQL 14+

### 1. Base de dados

```sql
CREATE DATABASE workout_tracker;
```

### 2. Backend

```bash
cd backend
cp .env.example .env
```

Editar `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/workout_tracker
JWT_SECRET=uma_chave_secreta_longa
JWT_EXPIRES_IN=24h
PORT=5000
FRONTEND_URL=http://localhost:5173
```

```bash
npm install
npm run migrate
npm run seed
npm run dev
```

O backend fica disponivel em `http://localhost:5000`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

A aplicacao fica disponivel em `http://localhost:5173`

---

## Estrutura do Projeto

## 12. Estrutura de Ficheiros Completa

```
projeto/
├── .env.example                    (variaveis de ambiente de exemplo)
├── .gitignore                      (ficheiros ignorados pelo git)
├── backend/
│   ├── .env                        (variaveis de ambiente reais - nao commitado)
│   ├── .env.example                (exemplo de configuracao)
│   ├── package.json                (dependencias e scripts npm)
│   ├── package-lock.json           (versoes exatas das dependencias)
│   └── src/
│       ├── server.js               (ponto de entrada - inicia servidor)
│       ├── app.js                  (configuracao Express - middleware e rotas)
│       ├── database/
│       │   ├── connection.js       (pool PostgreSQL e funcao connectDB)
│       │   ├── migrate.js          (criacao de tabelas, indices e colunas)
│       │   └── seed.js             (exercicios e planos iniciais do sistema)
│       ├── middleware/
│       │   ├── auth.js             (middleware protect - valida JWT)
│       │   └── admin.js            (middleware requireAdmin - verifica is_admin)
│       ├── models/
│       │   ├── User.js             (findByEmail, findById, create, comparePassword)
│       │   ├── Exercise.js         (findAll, findById, findDuplicate, create, update, delete)
│       │   ├── Session.js          (findAll, findById, create, update, delete, toggleSet, updateSet, completeSession)
│       │   └── WorkoutPlan.js      (findAll, findById, create, update, delete)
│       ├── controllers/
│       │   ├── auth.controller.js      (register, login, getMe)
│       │   ├── exercise.controller.js  (getExercises, getExercise, createExercise, updateExercise, deleteExercise, getMuscleGroups)
│       │   ├── session.controller.js   (getSessions, getSession, createSession, updateSession, deleteSession, toggleSet, updateSet, completeSession)
│       │   ├── plan.controller.js      (getPlans, getPlan, createPlan, updatePlan, deletePlan)
│       │   ├── stats.controller.js     (getDashboard, getWeeklyStats, getMonthlyStats, getExerciseHistory, getOverview, getLeaderboard)
│       │   └── admin.controller.js     (getAdminStats, getSessionsOverTime, getUserGrowth, getTopExercises, getVolumeOverTime, getDetailedStats, getExerciseStats, createSystemExercise, deleteSystemExercise, toggleAdmin, toggleSuspend)
│       └── routes/
│           ├── auth.routes.js          (POST /register, POST /login, GET /me)
│           ├── exercise.routes.js      (GET, POST, PUT, DELETE /exercises)
│           ├── session.routes.js       (CRUD + PATCH para live workout)
│           ├── plan.routes.js          (GET, POST, PUT, DELETE /plans)
│           ├── stats.routes.js         (GET /dashboard, /weekly, /monthly, /exercises/:id/history, /overview, /leaderboard)
│           └── admin.routes.js         (todas as rotas admin com requireAdmin)
├── frontend/
│   ├── index.html                  (HTML base com link para Google Fonts)
│   ├── package.json                (dependencias frontend)
│   ├── package-lock.json           (versoes exatas)
│   ├── public/
│   │   └── favicon.svg            (icone da aplicacao)
│   └── src/
│       ├── main.jsx               (ponto de entrada React - monta App no DOM)
│       ├── App.jsx                (BrowserRouter + AuthProvider + Routes)
│       ├── index.css              (design system global - cores, botoes, inputs, utilitarios)
│       ├── services/
│       │   └── api.js             (instancia Axios com interceptors)
│       ├── context/
│       │   └── AuthContext.jsx    (Provider com login, register, logout, user, loading)
│       ├── constants/
│       │   └── muscleGroups.js    (array de {value, label} para dropdowns)
│       ├── utils/
│       │   └── date.js            (formatDate e formatShortDate)
│       ├── components/
│       │   ├── Layout/            (Layout.jsx + Layout.css + index.js)
│       │   ├── Dropdown/          (Dropdown.jsx + Dropdown.css + index.js)
│       │   ├── ExercisePicker/    (ExercisePicker.jsx + ExercisePicker.css + index.js)
│       │   ├── ConfirmModal/      (ConfirmModal.jsx + index.js)
│       │   ├── Pagination/        (Pagination.jsx + index.js)
│       │   ├── PageLoader/        (PageLoader.jsx + index.js)
│       │   └── EmptyState/        (EmptyState.jsx + index.js)
│       └── pages/
│           ├── LoginPage/             (LoginPage.jsx + AuthPage.css + index.js)
│           ├── RegisterPage/          (RegisterPage.jsx + index.js)
│           ├── DashboardPage/         (DashboardPage.jsx + DashboardPage.css + index.js)
│           ├── SessionsPage/          (SessionsPage.jsx + SessionsPage.css + index.js)
│           ├── NewSessionPage/        (NewSessionPage.jsx + NewSessionPage.css + index.js)
│           ├── SessionDetailPage/     (SessionDetailPage.jsx + SessionDetailPage.css + index.js)
│           ├── LiveWorkoutPage/       (LiveWorkoutPage.jsx + LiveWorkoutPage.css + index.js)
│           ├── ExercisesPage/         (ExercisesPage.jsx + ExercisesPage.css + index.js)
│           ├── ExerciseHistoryPage/   (ExerciseHistoryPage.jsx + ExerciseHistoryPage.css + index.js)
│           ├── PlansPage/             (PlansPage.jsx + PlansPage.css + index.js)
│           ├── PlanFormPage/          (PlanFormPage.jsx + PlanFormPage.css + index.js)
│           └── AdminPage/             (AdminPage.jsx + AdminPage.css + index.js)
│
└── README.md                   (Instrucoes de instalacao)
```

---

## Base de Dados

7 tabelas com integridade referencial:

```
users ──1:N──> sessions ──1:N──> session_exercises ──1:N──> sets
users ──1:N──> workout_plans ──1:N──> plan_exercises
users ──1:N──> exercises (pessoais)
```

Campos especiais:
- `sessions.status` — `'in_progress'` (live) ou `'completed'` (finalizada)
- `sets.completed` — marca cada serie como feita no treino ao vivo
- Apenas sessoes `completed` contam para stats e leaderboard

---

## Scripts Disponiveis

### Backend

| Comando | Descricao |
|---------|-----------|
| `npm run dev` | Servidor com auto-restart (nodemon) |
| `npm start` | Servidor em producao |
| `npm run migrate` | Criar/atualizar tabelas |
| `npm run seed` | Popular exercicios e planos do sistema |

### Frontend

| Comando | Descricao |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento com HMR |
| `npm run build` | Build otimizado para producao |
| `npm run preview` | Pre-visualizar build |

---

## Seguranca

- Passwords hashadas com bcrypt (10 salt rounds)
- Autenticacao stateless com JWT (expiracao 24h)
- Queries SQL parametrizadas (previne SQL injection)
- Validacao de input em todas as rotas de escrita
- Verificacao de propriedade em operacoes de escrita
- CORS restrito a origem do frontend
- Contas suspensas bloqueadas no login

---

## Responsividade

- Desktop: topbar com navegacao horizontal
- Mobile: bottom navigation com touch targets de 48px
- Inputs adaptados (16px para evitar zoom no iOS)
- Leaderboard e tabelas adaptam-se a ecras pequenos
