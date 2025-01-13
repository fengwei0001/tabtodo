document.addEventListener('DOMContentLoaded', () => {
    const newTodoInput = document.getElementById('newTodo');
    const activeTodoList = document.getElementById('activeTodoList');
    const completedTodoList = document.getElementById('completedTodoList');
    const todoCount = document.getElementById('todoCount');
    const doneCount = document.getElementById('doneCount');
    const activeTodosSection = document.getElementById('activeTodos');
    const completedTodosSection = document.getElementById('completedTodos');

    //移动端不显示安装插件的引导
    function isDesktopChrome() {
        const userAgent = navigator.userAgent;
        
        // 检查是否是 Chrome
        const isChrome = /Chrome/i.test(userAgent) && !/Chromium|EdgeHTML|Edge/i.test(userAgent);
        
        // 检查是否是桌面操作系统
        const isMac = /Macintosh|MacIntel|MacPPC|Mac68K/i.test(userAgent);
        const isWindows = /Win32|Win64|Windows|WinCE/i.test(userAgent);
        const isLinux = /Linux/i.test(userAgent) && !/Android/i.test(userAgent); // 排除 Android
        
        // 返回是否是桌面版 Chrome
        return isChrome && (isMac || isWindows || isLinux);
    }
    
    // 使用示例
    const installButtonWrapper = document.querySelector('.install-button-wrapper');
    if (isDesktopChrome()) {
        // 如果是桌面版 Chrome，显示安装按钮
        installButtonWrapper.style.display = 'block';
    } else {
        // 如果不是桌面版 Chrome，隐藏安装按钮
        installButtonWrapper.style.display = 'none';
    }
    
    // 设置拖拽排序
    setupDragAndDrop(activeTodoList);
    setupDragAndDrop(completedTodoList);

    // 加载保存的待办事项
    loadTodos();
    updateCounts();

    // 添加页面可见性变化监听
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            loadTodos();
        }
    });

    // 添加焦点变化监听
    window.addEventListener('focus', () => {
        loadTodos();
    });

    // 添加回车键监听
    newTodoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTodo();
        }
    });

    // 获取下一个order值
    async function getNextOrder() {
        const todos = getTodosFromStorage();
        if (todos.length === 0) {
            return 1000;
        }
        const maxOrder = Math.max(...todos.map(todo => todo.order || 0));
        return maxOrder + 1000;
    }

    // 从localStorage获取todos
    function getTodosFromStorage() {
        const todosJson = localStorage.getItem('todos');
        return todosJson ? JSON.parse(todosJson) : [];
    }

    // 保存todos到localStorage
    function saveTodosToStorage(todos) {
        localStorage.setItem('todos', JSON.stringify(todos));
    }

    // 添加新待办事项的函数
    async function addTodo() {
        const todoText = newTodoInput.value.trim();
        if (todoText) {
            const nextOrder = await getNextOrder();
            const todo = {
                id: Date.now(),
                text: todoText,
                completed: false,
                createdAt: Date.now(),
                order: nextOrder
            };

            saveTodo(todo);
            renderTodo(todo);
            newTodoInput.value = '';
        }
    }

    function renderTodo(todo) {
        const li = document.createElement('li');
        li.className = 'todo-item';
        li.dataset.id = todo.id;
        li.dataset.order = todo.order;
        if (todo.completed) {
            li.classList.add('completed');
        }

        // 添加拖拽相关属性
        li.draggable = true;

        const moreButtonSvg = `<svg t="1736482183592" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5150" width="200" height="200"><path d="M203.1 599.3c-48.9 0-88.6-39.6-88.6-88.5s39.6-88.5 88.6-88.5c48.9 0 88.6 39.6 88.6 88.5-0.1 48.9-39.7 88.5-88.6 88.5z m309.9 0c-48.9 0-88.6-39.6-88.6-88.5s39.6-88.5 88.6-88.5c48.9 0 88.6 39.6 88.6 88.5s-39.7 88.5-88.6 88.5z m309.9 0c-48.9 0-88.6-39.6-88.6-88.5s39.6-88.5 88.6-88.5c48.9 0 88.6 39.6 88.6 88.5s-39.6 88.5-88.6 88.5z" fill="#333333" p-id="5151"></path></svg>`;

        li.innerHTML = `
            <input type="checkbox" ${todo.completed ? 'checked' : ''}>
            <span class="todo-text">${todo.text}</span>
            <button class="more-button">${moreButtonSvg}</button>
        `;

        // 添加复选框事件监听器
        li.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
            toggleTodo(todo.id, e.target.checked);
            li.classList.toggle('completed');
            
            // 移动到对应列表
            const targetList = e.target.checked ? completedTodoList : activeTodoList;
            targetList.insertBefore(li, getInsertPosition(targetList, todo.order));
            
            // 检查列表状态并更新显示
            updateListsVisibility();
        });

        // 添加更多按钮事件监听器
        li.querySelector('.more-button').addEventListener('click', (e) => {
            showDropdownMenu(e, todo.id);
        });

        // 根据完成状态添加到对应列表
        const targetList = todo.completed ? completedTodoList : activeTodoList;
        targetList.insertBefore(li, getInsertPosition(targetList, todo.order));
        
        // 检查列表状态并更新显示
        updateListsVisibility();

        return li;
    }

    // 获取插入位置
    function getInsertPosition(list, order) {
        const items = Array.from(list.children);
        return items.find(item => Number(item.dataset.order) < order) || null;
    }

    function showDropdownMenu(event, todoId) {
        event.stopPropagation();
        
        // 移除任何已存在的下拉菜单
        const existingMenu = document.querySelector('.dropdown-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const menu = document.createElement('div');
        menu.className = 'dropdown-menu';
        menu.innerHTML = `
            <button class="delete-btn" style="color: red;">Delete</button>
        `;

        // 计算位置
        const rect = event.target.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = `${rect.bottom + 5}px`;
        menu.style.left = `${rect.left - 120}px`;

        // 添加删除事件监听器
        menu.querySelector('.delete-btn').addEventListener('click', () => {
            deleteTodo(todoId);
            document.querySelector(`[data-id="${todoId}"]`).remove();
            menu.remove();
            updateCounts();
            updateListsVisibility();
        });

        // 点击其他地方关闭菜单
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });

        document.body.appendChild(menu);
    }

    function updateListsVisibility() {
        // 检查激活列表是否为空
        if (activeTodoList.children.length === 0) {
            activeTodosSection.style.display = 'none';
        } else {
            activeTodosSection.style.display = 'block';
        }

        // 检查完成列表是否为空
        if (completedTodoList.children.length === 0) {
            completedTodosSection.style.display = 'none';
        } else {
            completedTodosSection.style.display = 'block';
        }
    }

    function loadTodos() {
        // 清空现有列表
        activeTodoList.innerHTML = '';
        completedTodoList.innerHTML = '';

        const todos = getTodosFromStorage();

        // 对待办事项进行排序
        const sortedTodos = todos.sort((a, b) => {
            if (a.completed === b.completed) {
                return b.order - a.order;
            }
            return a.completed ? 1 : -1;
        });

        sortedTodos.forEach(todo => renderTodo(todo));
        updateListsVisibility();
        updateCounts();
    }

    function updateCounts() {
        const todos = getTodosFromStorage();
        const activeCount = todos.filter(todo => !todo.completed).length;
        const completedCount = todos.filter(todo => todo.completed).length;
        
        todoCount.textContent = `(${activeCount})`;
        doneCount.textContent = `(${completedCount})`;
    }

    function saveTodo(todo) {
        const todos = getTodosFromStorage();
        todos.push(todo);
        saveTodosToStorage(todos);
        updateCounts();
        updateListsVisibility();
    }

    function toggleTodo(id, completed) {
        const todos = getTodosFromStorage();
        const updatedTodos = todos.map(todo => {
            if (todo.id === id) {
                return { ...todo, completed };
            }
            return todo;
        });
        
        saveTodosToStorage(updatedTodos);
        updateCounts();
        updateListsVisibility();
    }

    function deleteTodo(id) {
        const todos = getTodosFromStorage();
        const updatedTodos = todos.filter(todo => todo.id !== id);
        saveTodosToStorage(updatedTodos);
        updateCounts();
        updateListsVisibility();
    }

    function normalizeOrders() {
        const todos = getTodosFromStorage();
        const sortedTodos = todos.sort((a, b) => a.order - b.order);
        
        const updatedTodos = sortedTodos.map((todo, index) => ({
            ...todo,
            order: (index + 1) * 1000
        }));

        saveTodosToStorage(updatedTodos);
    }

    // 安装按钮相关逻辑
    const installBtn = document.getElementById('installBtn');
    const installModal = document.getElementById('installModal');
    const closeBtn = installModal.querySelector('.close-button');

    installBtn.addEventListener('click', () => {
        installModal.classList.add('show');
    });

    closeBtn.addEventListener('click', () => {
        installModal.classList.remove('show');
    });

    // 点击模态框外部关闭
    installModal.addEventListener('click', (e) => {
        if (e.target === installModal) {
            installModal.classList.remove('show');
        }
    });

    // ESC 键关闭模态框
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && installModal.classList.contains('show')) {
            installModal.classList.remove('show');
        }
    });

});

function setupDragAndDrop(list) {
    let draggedItem = null;
    let placeholder = null;

    list.addEventListener('dragstart', (e) => {
        draggedItem = e.target;
        if (!draggedItem.classList.contains('todo-item')) return;

        // 创建占位元素
        placeholder = draggedItem.cloneNode(true);
        placeholder.classList.add('placeholder');
        placeholder.style.visibility = 'hidden';

        // 延迟添加拖动样式，解决 Firefox 的拖动图像问题
        setTimeout(() => {
            draggedItem.classList.add('dragging');
        }, 0);
    });

    list.addEventListener('dragend', (e) => {
        if (!draggedItem) return;
        draggedItem.classList.remove('dragging');
        if (placeholder) {
            placeholder.remove();
        }
        draggedItem = null;
        placeholder = null;

        // 更新所有项目的顺序
        updateTodoOrders(list);
    });

    list.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!draggedItem) return;

        const afterElement = getDragAfterElement(list, e.clientY);
        if (afterElement) {
            list.insertBefore(draggedItem, afterElement);
        } else {
            list.appendChild(draggedItem);
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.todo-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updateTodoOrders(list) {
    const items = Array.from(list.children);
    const baseOrder = list.id === 'completedTodoList' ? 0 : 1000;
    const updatedOrders = [];

    items.forEach((item, index) => {
        const todoId = Number(item.dataset.id);
        const newOrder = baseOrder + ((items.length - index) * 1000);
        updatedOrders.push({ id: todoId, order: newOrder });
        item.dataset.order = newOrder;
    });

    // 更新存储
    const todos = JSON.parse(localStorage.getItem('todos') || '[]');
    const updatedTodos = todos.map(todo => {
        const orderUpdate = updatedOrders.find(update => update.id === todo.id);
        if (orderUpdate) {
            return { ...todo, order: orderUpdate.order };
        }
        return todo;
    });

    localStorage.setItem('todos', JSON.stringify(updatedTodos));
}
