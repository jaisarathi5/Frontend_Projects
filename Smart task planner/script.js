let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let currentFilter = "all";
let searchQuery = "";

// Enhanced task structure with due dates and categories
function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function renderTasks(filter = "all", search = "") {
  currentFilter = filter;
  searchQuery = search.toLowerCase();

  let list = document.getElementById("taskList");
  list.innerHTML = "";

  let filteredTasks = tasks.filter(task => {
    // Filter by completion status
    if (filter === "completed" && !task.completed) return false;
    if (filter === "pending" && task.completed) return false;

    // Filter by search query
    if (search && !task.name.toLowerCase().includes(search) &&
        !task.category?.toLowerCase().includes(search)) return false;

    return true;
  });

  if (filteredTasks.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <h3>${search ? 'No tasks found' : 'No tasks yet'}</h3>
        <p>${search ? 'Try a different search term' : 'Add your first task to get started!'}</p>
      </div>
    `;
    return;
  }

  filteredTasks.forEach((task, index) => {
    let li = document.createElement("li");
    li.classList.add(task.priority.toLowerCase());
    if (task.completed) li.classList.add("completed");

    const dueDateText = task.dueDate ? formatDueDate(task.dueDate) : '';
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;
    const categoryText = task.category ? ` • ${task.category}` : '';

    li.innerHTML = `
      <div class="task-content">
        <span class="task-text">${escapeHtml(task.name)}${categoryText}</span>
        <div class="task-meta">
          <span class="priority-badge ${task.priority.toLowerCase()}">${task.priority}</span>
          ${dueDateText ? `<span class="due-date ${isOverdue ? 'overdue' : ''}">${dueDateText}</span>` : ''}
        </div>
      </div>
      <div class="task-actions">
        <button onclick="toggleTask(${tasks.indexOf(task)})" title="Mark as ${task.completed ? 'pending' : 'completed'}">
          ${task.completed ? '↩️' : '✔'}
        </button>
        <button onclick="editTask(${tasks.indexOf(task)})" title="Edit task">✏️</button>
        <button onclick="deleteTask(${tasks.indexOf(task)})" title="Delete task">❌</button>
      </div>
    `;

    list.appendChild(li);
  });

  updateTaskStats();
}

function addTask() {
  let input = document.getElementById("taskInput");
  let priority = document.getElementById("priority").value;
  let category = document.getElementById("categoryInput")?.value || '';
  let dueDate = document.getElementById("dueDateInput")?.value || '';

  if (input.value.trim() === "") {
    showNotification("Task cannot be empty", "error");
    input.focus();
    return;
  }

  // Validate due date
  if (dueDate && new Date(dueDate) < new Date().setHours(0,0,0,0)) {
    showNotification("Due date cannot be in the past", "error");
    return;
  }

  // Show loading state
  const form = document.querySelector('.task-form');
  const button = form.querySelector('button');
  const originalText = button.textContent;
  form.classList.add('submitting');
  button.textContent = 'Adding...';
  button.disabled = true;

  // Simulate async operation (remove setTimeout in production)
  setTimeout(() => {
    let task = {
      name: input.value.trim(),
      priority: priority,
      category: category.trim(),
      dueDate: dueDate,
      completed: false,
      createdAt: new Date().toISOString(),
      id: Date.now()
    };

    tasks.push(task);
    saveTasks();
    renderTasks(currentFilter, searchQuery);

    // Reset form
    input.value = "";
    if (document.getElementById("categoryInput")) document.getElementById("categoryInput").value = "";
    if (document.getElementById("dueDateInput")) document.getElementById("dueDateInput").value = "";

    // Reset loading state
    form.classList.remove('submitting');
    button.textContent = originalText;
    button.disabled = false;

    showNotification("Task added successfully!", "success");

    // Focus back to input for quick adding
    input.focus();
  }, 300);
}

function toggleTask(index) {
  tasks[index].completed = !tasks[index].completed;
  if (tasks[index].completed) {
    tasks[index].completedAt = new Date().toISOString();
  } else {
    delete tasks[index].completedAt;
  }
  saveTasks();
  renderTasks(currentFilter, searchQuery);
  showNotification(`Task marked as ${tasks[index].completed ? 'completed' : 'pending'}`, "info");
}

function editTask(index) {
  const task = tasks[index];
  const newName = prompt("Edit task name:", task.name);
  if (newName === null) return;

  if (newName.trim() === "") {
    showNotification("Task name cannot be empty", "error");
    return;
  }

  task.name = newName.trim();
  saveTasks();
  renderTasks(currentFilter, searchQuery);
  showNotification("Task updated successfully!", "success");
}

function deleteTask(index) {
  if (!confirm("Are you sure you want to delete this task?")) return;

  const taskName = tasks[index].name;
  tasks.splice(index, 1);
  saveTasks();
  renderTasks(currentFilter, searchQuery);
  showNotification(`"${taskName}" deleted`, "warning");
}

function filterTasks(type) {
  // Update active filter button
  document.querySelectorAll('.filters button').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  renderTasks(type, searchQuery);
}

function searchTasks() {
  const searchInput = document.getElementById("searchInput");
  renderTasks(currentFilter, searchInput.value);
}

function clearCompleted() {
  if (!confirm("Are you sure you want to delete all completed tasks?")) return;

  const initialCount = tasks.length;
  tasks = tasks.filter(task => !task.completed);
  const deletedCount = initialCount - tasks.length;

  saveTasks();
  renderTasks(currentFilter, searchQuery);
  showNotification(`${deletedCount} completed task(s) deleted`, "info");
}

function updateTaskStats() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = total - completed;
  const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && !t.completed).length;

  // Update stats if element exists
  const statsElement = document.getElementById("taskStats");
  if (statsElement) {
    statsElement.innerHTML = `
      <div class="stat-item">Total: ${total}</div>
      <div class="stat-item">Pending: ${pending}</div>
      <div class="stat-item">Completed: ${completed}</div>
      ${overdue > 0 ? `<div class="stat-item overdue">Overdue: ${overdue}</div>` : ''}
    `;
  }
}

function formatDueDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} day(s)`;
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays < 7) return `Due in ${diffDays} days`;
  return `Due ${date.toLocaleDateString()}`;
}

function showNotification(message, type = "info") {
  // Remove existing notification
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    z-index: 1000;
    animation: slideInRight 0.3s ease-out;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  `;

  const colors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6'
  };

  notification.style.background = colors[type] || colors.info;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Sorting functionality
let currentSort = 'created';

function sortTasks(criteria) {
  currentSort = criteria;

  tasks.sort((a, b) => {
    switch(criteria) {
      case 'priority':
        const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      case 'dueDate':
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      case 'name':
        return a.name.localeCompare(b.name);
      case 'created':
      default:
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  saveTasks();
  renderTasks(currentFilter, searchQuery);
  showNotification(`Sorted by ${criteria}`, "info");
}

// Export/Import functionality
function exportTasks() {
  const dataStr = JSON.stringify(tasks, null, 2);
  const dataBlob = new Blob([dataStr], {type: 'application/json'});

  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `tasks_backup_${new Date().toISOString().split('T')[0]}.json`;
  link.click();

  showNotification("Tasks exported successfully!", "success");
}

function importTasks() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedTasks = JSON.parse(e.target.result);

        if (!Array.isArray(importedTasks)) {
          throw new Error('Invalid file format');
        }

        // Validate task structure
        const validTasks = importedTasks.filter(task =>
          task.name && typeof task.completed === 'boolean'
        );

        if (validTasks.length === 0) {
          throw new Error('No valid tasks found');
        }

        // Confirm import
        if (!confirm(`Import ${validTasks.length} task(s)? This will merge with existing tasks.`)) {
          return;
        }

        // Merge tasks
        tasks = [...tasks, ...validTasks];
        saveTasks();
        renderTasks(currentFilter, searchQuery);

        showNotification(`${validTasks.length} task(s) imported successfully!`, "success");

      } catch (error) {
        showNotification("Error importing tasks: " + error.message, "error");
      }
    };

    reader.readAsText(file);
  };

  input.click();
}

// Theme toggle (light/dark mode)
function toggleTheme() {
  const body = document.body;
  const isDark = body.classList.toggle('dark-theme');

  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  showNotification(`Switched to ${isDark ? 'dark' : 'light'} theme`, "info");
}

// Load theme on startup
function loadTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
  }
}

// Enhanced keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  switch(e.key.toLowerCase()) {
    case 'n':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        document.getElementById('taskInput').focus();
      }
      break;
    case 'f':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        document.getElementById('searchInput')?.focus();
      }
      break;
    case 's':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        sortTasks(currentSort === 'priority' ? 'name' : 'priority');
      }
      break;
    case 't':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        toggleTheme();
      }
      break;
    case 'escape':
      document.getElementById('taskInput').blur();
      document.getElementById('searchInput')?.blur();
      break;
  }
});

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  renderTasks();
});