const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const { kStringMaxLength } = require('buffer');

const app = express();
const port = process.env.PORT || 3000;

const dataDir = path.join(__dirname, 'data');
const usersFile = path.join(dataDir, 'users.json');
const tasksFile = path.join(dataDir, 'tasks.json');

function ensureDataFiles() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

  if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(
      usersFile,
      JSON.stringify([{ id: 1, username: 'aluno', password: 'senha123' }], null, 2)
    );
  }

  if (!fs.existsSync(tasksFile)) {
    fs.writeFileSync(
      tasksFile,
      JSON.stringify(
        [
          { id: 1, title: 'Exemplo: estudar Express', completed: false },
          { id: 2, title: 'Configurar SPA básica', completed: true }
        ],
        null,
        2
      )
    );
  }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

ensureDataFiles();

// Middlewares
app.use(cors()); // mesma origem; pode remover se quiser
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Sessão (cookie) - SEM TOKEN
app.use(
  session({
    secret: 'spa-todo-aula-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true }
  })
);

// Auth middleware (sessão)
function requireAuth(req, res, next) {
  if (req.session?.user?.username) return next();
  return res.status(401).json({ message: 'Não autenticado' });
}

//login - rota
app.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  const users = readJson(usersFile);

  const user = users.find(u => u.username === username && u.password === password);

  if (!user)
    return res.status(401).json({ success: false, message: 'Credenciais Inválidas' });

  req.session.user = { id: user.id, username: user.username };

  return res.json({ success: true, user: { id: user.id, username: user.username } });
});

//rota logout
app.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

//se logado, decidir para onde ir (painel)
app.get('/me', (req, res) => {
  if (!req.session?.user)
    return res.status(401).json({ authenticated: false });

  res.json({ authenticated: true, user: req.session.user });
});

//CRUD para tarefas
// pegar as tarefas

app.get('/tasks', requireAuth, (req, res) => {
  const tasks = readJson(tasksFile);
  res.json(tasks);
});

//incluir nova tarefa

app.post('/tasks', requireAuth, (req, res) => {
  const { title, completed } = req.body || {};

  if (!title)
    return res.status(400).json({ message: 'Título é obrigatório' });

  const tasks = readJson(tasksFile);
  const nextId = tasks.reduce((max, t) => Math.max(max, t.id), 0) + 1;

  const t = { id: nextId, title, completed: !!completed };

  tasks.push(t);
  writeJson(tasksFile, tasks);
  res.json(t);
});

app.put('/tasks/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { title, completed } = req.body || {};

  const tasks = readJson(tasksFile);

  const t = tasks.find(x => x.id === id);

  if (!t)
    return res.status(404).json({ message: 'Tarefa não encontrada!' });

  if (title !== undefined) t.title = title;
  
  if (completed !== undefined) t.completed = !!completed;

  writeJson(tasksFile, tasks);
  res.json(t);
});

// Deletar tarefa

app.delete('/tasks/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const tasks = readJson(tasksFile);

  const idx = tasks.findIndex(x => x.id === id);

  if (idx === -1)
    return res.status(404).json({ message: 'Tarefa não encontrada' });

  const [removed] = tasks.splice(idx, 1);

  writeJson(tasksFile, tasks);
  res.json(removed);
});

//rota para comando desconhecido
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ponto de entrada
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});

//algo