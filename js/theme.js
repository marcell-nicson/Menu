/**
 * Theme Management
 */
class ThemeManager {
  constructor() {
    this.html = document.documentElement;
    this.switchElement = null;
    this.currentUser = null;
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    this.switchElement = document.getElementById('theme-switch');
    
    if (this.switchElement) {
      this.switchElement.addEventListener('click', () => this.toggle());
    }

    // Apply initial theme
    this.applyInitialTheme();
  }

  async applyInitialTheme() {
    // If user is logged in, use their theme preference
    if (window.api && api.isLoggedIn()) {
      try {
        const user = await api.getMe();
        this.currentUser = user;
        this.applyTheme(user.theme || 'dark');
        return;
      } catch (error) {
        console.warn('Failed to load user theme:', error);
      }
    }

    // Otherwise use system preference or default to dark
    const savedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    this.applyTheme(savedTheme || systemTheme);
  }

  applyTheme(theme) {
    if (theme === 'light') {
      this.html.classList.add('light');
    } else {
      this.html.classList.remove('light');
    }

    // Update avatar if user is logged in
    this.updateAvatar();
    
    // Save theme preference
    localStorage.setItem('theme', theme);
  }

  toggle() {
    const isLight = this.html.classList.contains('light');
    const newTheme = isLight ? 'dark' : 'light';
    
    this.applyTheme(newTheme);

    // Save to user profile if logged in
    if (window.api && api.isLoggedIn()) {
      api.updateMe({ theme: newTheme }).catch(error => {
        console.warn('Failed to save theme preference:', error);
      });
    }
  }

  updateAvatar() {
    const avatarElement = document.getElementById('avatar');
    if (!avatarElement) return;

    const isLight = this.html.classList.contains('light');
    
    if (this.currentUser) {
      // Use user's custom avatars
      const avatar = isLight 
        ? (this.currentUser.avatarLight || this.currentUser.avatar || './assets/avatar-light.png')
        : (this.currentUser.avatar || './assets/avatar.png');
      
      avatarElement.src = avatar;
    } else {
      // Use default avatars
      const avatar = isLight ? './assets/avatar-light.png' : './assets/avatar.png';
      avatarElement.src = avatar;
    }
  }

  setCurrentUser(user) {
    this.currentUser = user;
    this.updateAvatar();
  }
}

// Initialize theme manager
window.themeManager = new ThemeManager();
