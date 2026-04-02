function show(panel) {
    document.getElementById('loginPanel').style.display = panel === 'login' ? 'block' : 'none';
    document.getElementById('appPanel').style.display = panel === 'app' ? 'block' : 'none';
}

function getCurrentFilter() {
    return document.getElementById('filter')?.value || 'todas';
}

function setCurrentFilter(filter) {
    const filterInput = document.getElementById('filter');

    if (filterInput) {
        filterInput.value = filter;
    }

    document.querySelectorAll('.filter-chip').forEach(button => {
        const isActive = button.dataset.filter === filter;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
    });
}

function updateFilterButtons(list) {
    const counts = {
        todas: list.length,
        pendentes: list.filter(task => !task.completed).length,
        concluidas: list.filter(task => task.completed).length
    };

    document.querySelectorAll('.filter-chip').forEach(button => {
        const filter = button.dataset.filter;
        const label = button.dataset.label || button.textContent;
        button.textContent = `${label} (${counts[filter] || 0})`;
    });
}

function renderTasks(list) {
    const ul = document.getElementById('taskList');
    ul.innerHTML = '';

    updateFilterButtons(list);

    const sortedList = [...list].sort((a, b) =>
        a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' })
    );

    const filter = getCurrentFilter();
    const filteredList = sortedList.filter(task => {
        if (filter === 'pendentes') return !task.completed;
        if (filter === 'concluidas') return task.completed;
        return true;
    });

    if (!filteredList.length) {
        const emptyState = document.createElement('li');
        emptyState.className = 'task-empty';
        emptyState.textContent =
            filter === 'todas'
                ? 'Nenhuma tarefa cadastrada ainda.'
                : 'Nenhuma tarefa encontrada para esse filtro.';

        ul.appendChild(emptyState);
        return;
    }

    filteredList.forEach(task => {
        const li = document.createElement('li');
        li.className = 'task-item';

        const title = document.createElement('span');
        title.className = 'task-title';
        title.textContent = task.title;
        title.title = 'Clique duas vezes para editar';

        if (task.completed) {
            li.classList.add('is-completed');
            title.classList.add('is-completed');
        }

        title.addEventListener('dblclick', () => editTask(task.id, task.title));

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'task-status';
        cb.checked = task.completed;
        cb.setAttribute(
            'aria-label',
            task.completed ? 'Marcar tarefa como pendente' : 'Marcar tarefa como concluida'
        );

        cb.addEventListener('change', async () => {
            await fetch(`/tasks/${task.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: cb.checked })
            });

            await fetchTasks();
        });

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'task-button';
        editBtn.textContent = 'Editar';
        editBtn.addEventListener('click', () => editTask(task.id, task.title));

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'task-button task-button-danger';
        delBtn.textContent = 'Excluir';
        delBtn.addEventListener('click', async () => {
            if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;

            await fetch(`/tasks/${task.id}`, { method: 'DELETE' });
            await fetchTasks();
        });

        const actions = document.createElement('div');
        actions.className = 'task-cta';
        actions.append(cb, editBtn, delBtn);

        li.append(title, actions);
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
        return;
    }

    show('login');
}

async function editTask(id, currentTitle) {
    const newTitle = prompt('Editar tarefa:', currentTitle);
    const trimmedTitle = (newTitle || '').trim();

    if (!trimmedTitle || trimmedTitle === currentTitle) return;

    await fetch(`/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmedTitle })
    });

    await fetchTasks();
}

document.addEventListener('DOMContentLoaded', async () => {
    const btnLogin = document.getElementById('btnLogin');
    const btnAdd = document.getElementById('btnAdd');
    const btnLogout = document.getElementById('btnLogout');

    const username = document.getElementById('username');
    const password = document.getElementById('password');
    const loginMsg = document.getElementById('loginMsg');
    const newTask = document.getElementById('newTask');

    document.querySelectorAll('.filter-chip').forEach(button => {
        button.addEventListener('click', async () => {
            const nextFilter = button.dataset.filter || 'todas';

            if (nextFilter === getCurrentFilter()) return;

            setCurrentFilter(nextFilter);
            await fetchTasks();
        });
    });

    setCurrentFilter(getCurrentFilter());

    btnLogin.addEventListener('click', async () => {
        loginMsg.style.display = 'none';
        loginMsg.textContent = '';

        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: (username.value || '').trim(),
                password: (password.value || '').trim()
            })
        });

        if (!res.ok) {
            loginMsg.textContent = 'Credenciais invalidas';
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

    async function handleAddTask() {
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
    }

    btnAdd.addEventListener('click', handleAddTask);

    newTask.addEventListener('keydown', async event => {
        if (event.key !== 'Enter') return;

        event.preventDefault();
        await handleAddTask();
    });

    await checkAuthAndInit();
});
