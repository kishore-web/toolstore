class MultiCounterApp {
  constructor() {
    this.counters = this.loadCounters();
    this.currentCounterId = this.loadCurrentCounterId();
    this.showFavoritesOnly = false;
    this.draggedElement = null;
    this.init();
  }

  init() {
    this.cacheElements();
    this.bindEvents();
    this.render();
  }

  cacheElements() {
    this.container = document.getElementById('counters-container');
    this.emptyState = document.getElementById('empty-state');
    this.addCounterBtn = document.getElementById('add-counter');
    this.toggleFavoritesBtn = document.getElementById('toggle-favorites');
    this.resetAllBtn = document.getElementById('reset-all');
    this.exportBtn = document.getElementById('export-data');
    this.counterCount = document.getElementById('counter-count');
    this.favoriteCount = document.getElementById('favorite-count');
    this.template = document.getElementById('counter-template');
  }

  bindEvents() {
    this.addCounterBtn.addEventListener('click', () => this.addNewCounter());
    this.toggleFavoritesBtn.addEventListener('click', () => this.toggleFavorites());
    this.resetAllBtn.addEventListener('click', () => this.resetAllCounters());
    this.exportBtn.addEventListener('click', () => this.exportData());
    
    // Drag and drop events for container
    this.container.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.container.addEventListener('drop', (e) => this.handleDrop(e));
  }

  addNewCounter() {
    const counter = {
      id: Date.now(),
      title: `Counter ${this.counters.length + 1}`,
      value: 0,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      position: this.counters.length
    };
    
    this.counters.push(counter);
    this.setCurrentCounter(counter.id);
    this.saveCounters();
    this.render();
  }

  deleteCounter(id) {
    if (confirm('Are you sure you want to delete this counter?')) {
      this.counters = this.counters.filter(c => c.id !== id);
      
      // If deleted counter was current, set a new one
      if (this.currentCounterId === id && this.counters.length > 0) {
        this.setCurrentCounter(this.counters[0].id);
      } else if (this.counters.length === 0) {
        this.currentCounterId = null;
        this.saveCurrentCounterId(null);
      }
      
      this.saveCounters();
      this.render();
    }
  }

  incrementCounter(id) {
    const counter = this.findCounter(id);
    if (counter) {
      counter.value++;
      this.setCurrentCounter(id);
      this.saveCounters();
      this.render();
    }
  }

  decrementCounter(id) {
    const counter = this.findCounter(id);
    if (counter && counter.value > 0) {
      counter.value--;
      this.setCurrentCounter(id);
      this.saveCounters();
      this.render();
    }
  }

  resetCounter(id) {
    const counter = this.findCounter(id);
    if (counter) {
      counter.value = 0;
      this.setCurrentCounter(id);
      this.saveCounters();
      this.render();
    }
  }

  toggleFavorite(id) {
    const counter = this.findCounter(id);
    if (counter) {
      counter.isFavorite = !counter.isFavorite;
      this.saveCounters();
      this.render();
    }
  }

  updateCounterTitle(id, title) {
    const counter = this.findCounter(id);
    if (counter) {
      counter.title = title.trim() || 'Untitled Counter';
      this.saveCounters();
      this.updateStats();
    }
  }

  setCurrentCounter(id) {
    this.currentCounterId = id;
    this.saveCurrentCounterId(id);
  }

  resetAllCounters() {
    if (confirm('Are you sure you want to reset all counters to 0?')) {
      this.counters.forEach(counter => {
        counter.value = 0;
      });
      this.saveCounters();
      this.render();
    }
  }

  toggleFavorites() {
    this.showFavoritesOnly = !this.showFavoritesOnly;
    document.body.classList.toggle('favorites-only', this.showFavoritesOnly);
    
    // Update button state
    this.toggleFavoritesBtn.classList.toggle('active', this.showFavoritesOnly);
    
    // Update empty state message
    if (this.showFavoritesOnly) {
      const hasFavorites = this.counters.some(c => c.isFavorite);
      this.emptyState.querySelector('h2').textContent = 'No favorite counters';
      this.emptyState.querySelector('p').textContent = 'Mark some counters as favorites to see them here!';
    } else {
      this.emptyState.querySelector('h2').textContent = 'No counters yet';
      this.emptyState.querySelector('p').textContent = 'Create your first counter to get started!';
    }
    
    this.render();
  }

  exportData() {
    const data = {
      counters: this.counters,
      currentCounterId: this.currentCounterId,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `counters-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Drag and drop methods
  handleDragStart(e, counterId) {
    this.draggedElement = e.target;
    this.draggedElement.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
    this.draggedCounterId = counterId;
  }

  handleDragEnd(e) {
    e.target.classList.remove('dragging');
    this.draggedElement = null;
    this.draggedCounterId = null;
  }

  handleDragOver(e) {
    if (e.preventDefault) {
      e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    
    const afterElement = this.getDragAfterElement(this.container, e.clientY);
    if (afterElement == null) {
      this.container.appendChild(this.draggedElement);
    } else {
      this.container.insertBefore(this.draggedElement, afterElement);
    }
    
    return false;
  }

  handleDrop(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    
    // Update positions based on new DOM order
    const counterElements = this.container.querySelectorAll('.counter');
    counterElements.forEach((element, index) => {
      const counterId = parseInt(element.dataset.counterId);
      const counter = this.findCounter(counterId);
      if (counter) {
        counter.position = index;
      }
    });
    
    // Sort counters by position
    this.counters.sort((a, b) => a.position - b.position);
    this.saveCounters();
    
    return false;
  }

  getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.counter:not(.dragging)')];
    
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

  // Utility methods
  findCounter(id) {
    return this.counters.find(c => c.id === id);
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes <= 1 ? 'just now' : `${minutes} minutes ago`;
      }
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    } else if (days === 1) {
      return 'yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  // Rendering
  render() {
    const countersToRender = this.showFavoritesOnly 
      ? this.counters.filter(c => c.isFavorite)
      : this.counters;
    
    // Sort by position
    countersToRender.sort((a, b) => a.position - b.position);
    
    if (countersToRender.length === 0) {
      this.container.style.display = 'none';
      this.emptyState.style.display = 'block';
    } else {
      this.container.style.display = 'grid';
      this.emptyState.style.display = 'none';
      this.container.innerHTML = countersToRender.map(counter => this.renderCounter(counter)).join('');
    }
    
    this.updateStats();
  }

  renderCounter(counter) {
    const isCurrent = counter.id === this.currentCounterId;
    const createdDate = this.formatDate(counter.createdAt);
    
    return `
      <div class="counter ${isCurrent ? 'current' : ''} ${counter.isFavorite ? 'favorite' : ''}" 
           data-counter-id="${counter.id}"
           draggable="true"
           ondragstart="app.handleDragStart(event, ${counter.id})"
           ondragend="app.handleDragEnd(event)">
        
        <div class="counter__header">
          <div class="counter__title-section">
            <input type="text" 
                   class="counter__title" 
                   value="${this.escapeHtml(counter.title)}"
                   placeholder="Counter title"
                   maxlength="50"
                   onchange="app.updateCounterTitle(${counter.id}, this.value)"
                   onclick="app.setCurrentCounter(${counter.id})">
            <button class="counter__favorite ${counter.isFavorite ? 'active' : ''}" 
                    onclick="app.toggleFavorite(${counter.id})"
                    title="${counter.isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
              <i class="${counter.isFavorite ? 'fas' : 'far'} fa-star"></i>
            </button>
          </div>
          <button class="counter__delete" 
                  onclick="app.deleteCounter(${counter.id})"
                  title="Delete counter">
            <i class="fas fa-trash"></i>
          </button>
        </div>
        
        <div class="counter__value-section">
          <div class="counter__value">${counter.value}</div>
          <div class="counter__controls">
            <button class="counter__btn counter__decrement" 
                    onclick="app.decrementCounter(${counter.id})"
                    title="Decrement">
              <i class="fas fa-minus"></i>
            </button>
            <button class="counter__btn counter__reset" 
                    onclick="app.resetCounter(${counter.id})"
                    title="Reset">
              <i class="fas fa-redo"></i>
            </button>
            <button class="counter__btn counter__increment" 
                    onclick="app.incrementCounter(${counter.id})"
                    title="Increment">
              <i class="fas fa-plus"></i>
            </button>
          </div>
        </div>
        
        <div class="counter__meta">
          <span class="counter__created">Created: ${createdDate}</span>
          ${isCurrent ? '<span class="counter__current-indicator"><i class="fas fa-dot-circle"></i> Current</span>' : ''}
        </div>
      </div>
    `;
  }

  updateStats() {
    const total = this.counters.length;
    const favorites = this.counters.filter(c => c.isFavorite).length;
    
    this.counterCount.textContent = `${total} counter${total !== 1 ? 's' : ''}`;
    this.favoriteCount.textContent = `${favorites} favorite${favorites !== 1 ? 's' : ''}`;
  }

  // Storage methods
  saveCounters() {
    localStorage.setItem('multi-counters', JSON.stringify(this.counters));
  }

  loadCounters() {
    try {
      const stored = localStorage.getItem('multi-counters');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading counters:', error);
      return [];
    }
  }

  saveCurrentCounterId(id) {
    localStorage.setItem('current-counter-id', id ? id.toString() : '');
  }

  loadCurrentCounterId() {
    try {
      const stored = localStorage.getItem('current-counter-id');
      return stored ? parseInt(stored) : null;
    } catch (error) {
      console.error('Error loading current counter ID:', error);
      return null;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize the app
const app = new MultiCounterApp();
