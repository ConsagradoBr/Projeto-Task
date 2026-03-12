const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const session = require('express-session');

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

