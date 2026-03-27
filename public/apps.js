function show(panel) {
    document.getElementById('loginPanel').style.display = panel === 'login' ? 'block' : 'none';
    document.getElementById('appPanel').style.display = panel === 'app' ? 'block' : 'none';
}

//funcao para mostrar as tarefas 
function renderTasks(list) {
    const ul = document.getElementById('taskList');
    ul.innerHTML = '';

    // Ordena em ordem alfabética
    const sortedList = [...list].sort((a, b) => a.title.localeCompare(b.title));

    // Aplica o filtro
    const filter = document.getElementById('filter').value;

    const filteredList = sortedList.filter(t => {
        if (filter === 'pendentes') return !t.completed;
        if (filter === 'concluidas') return t.completed;
        return true; 
    });

    filteredList.forEach(t => {
        const li = document.createElement('li');

        const title = document.createElement('span');
        title.className = 'task-title';
        title.textContent = t.title;
        title.style.cursor = 'pointer';
        title.title = 'Clique duas vezes para editar';

        // Duplo clique para editar
        title.addEventListener('dblclick', () => editTask(t.id, t.title));

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = t.completed;  

        cb.addEventListener('change', async () => {
            await fetch(`/tasks/${t.id}`, {
                method: 'PUT',
                headers: { 'Content-type': 'application/json' },
                body: JSON.stringify({ completed: cb.checked })
            });
            await fetchTasks();
        });

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Editar';
        editBtn.style.marginRight = '5px';
        editBtn.addEventListener('click', () => editTask(t.id, t.title));

        const del = document.createElement('button');
        del.textContent = 'Excluir';
        del.style.width = 'auto';
        del.style.marginTop = '0';
        del.style.padding = '8px 10px';
        del.addEventListener('click', async () => {
            if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
                await fetch(`/tasks/${t.id}`, { method: 'DELETE' });
                await fetchTasks();
            }
        });

        const actions = document.createElement('span');
        actions.className = 'task-cta';
        actions.appendChild(cb);
        actions.appendChild(editBtn);
        actions.appendChild(del);

        li.appendChild(title);
        li.appendChild(actions);
        ul.appendChild(li); 
    });
}

async function fetchTasks() {
    const res = await fetch('/tasks');

    if (res.status === 401) {
        show('login');
        return;
    }

    const data = await res.json();
    renderTasks(data);
}

async function checkAuthAndInit() {
    const me = await fetch('/me');

    if (me.ok) {
        show('app');
        await fetchTasks();
    } else {
        show('login');
    }
}

// Função para editar tarefa
async function editTask(id, currentTitle) {
    const newTitle = prompt('Editar tarefa:', currentTitle);
    if (newTitle === null || newTitle.trim() === '' || newTitle === currentTitle) return;

    await fetch(`/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() })
    });
    await fetchTasks();
}

//listener para quando
//carregar o html
document.addEventListener('DOMContentLoaded', async () => {

    const btnLogin = document.getElementById('btnLogin');
    const btnAdd = document.getElementById('btnAdd');
    const btnLogout = document.getElementById('btnLogout');

    const username = document.getElementById('username');
    const password = document.getElementById('password');
    const loginMsg = document.getElementById('loginMsg');
    const newTask = document.getElementById('newTask');

    btnLogin.addEventListener('click', async () => {
        loginMsg.style.display = 'none';
        loginMsg.textContent = '';

        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-type': 'application/json' },
            body: JSON.stringify({
                username: (username.value || '').trim(),
                password: (password.value || '').trim()
            })
        });

        if (!res.ok) {
            loginMsg.textContent = 'Credenciais Inválidas';
            loginMsg.style.display = 'block';
            return;
        }

        show('app');
        await fetchTasks();
    });

    btnLogout.addEventListener('click', async () => {
        await fetch('/logout', { method: 'POST' });
        show('login');
    });

    btnAdd.addEventListener('click', async () => {
        const title = (newTask.value || '').trim();

        if (!title) return;

        const res = await fetch('/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, completed: false })
        });

        if (res.status === 401) {
            show('login');
            return;
        }

        newTask.value = '';
        await fetchTasks();
    });


    await checkAuthAndInit();
});