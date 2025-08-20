/**
 * Main Application Logic
 */
class DevLinksApp {
  constructor() {
    this.currentUser = null;
    this.elements = {};
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    this.getElements();
    this.bootstrapByURL();
  }

  getElements() {
    this.elements = {
      handle: document.getElementById('handle'),
      avatar: document.getElementById('avatar'),
      links: document.getElementById('links'),
      socialLinks: document.getElementById('social-links'),
      loginBtn: document.getElementById('login-btn'),
      dashboardBtn: document.getElementById('dashboard-btn'),
    };
  }

  bootstrapByURL() {
    // Support clean URLs like /@usuario
    const path = window.location.pathname || '';
    const match = path.match(/^\/@(.+)$/);
    if (match && match[1]) {
      const handle = decodeURIComponent('@' + match[1]);
      this.loadPublicProfile(handle);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const publicHandle = params.get('u');
    if (publicHandle) return this.loadPublicProfile(publicHandle);
    this.loadUserData();
  }

  async loadUserData() {
    if (!window.api || !api.isLoggedIn()) {
      this.showGuestState();
      return;
    }

    try {
      const user = await api.getMe();
      this.currentUser = user;
      
      // Update theme manager with user data
      if (window.themeManager) {
        themeManager.setCurrentUser(user);
        themeManager.applyTheme(user.theme || 'dark');
      }

      this.renderUserProfile();
      this.showLoggedInState();
    } catch (error) {
      console.error('Failed to load user data:', error);
      this.showGuestState();
    }
  }

  async loadPublicProfile(handle) {
    try {
      const user = await api.getPublicProfile(handle);
      this.currentUser = user;
      // render as read-only
      if (this.elements.loginBtn) this.elements.loginBtn.classList.remove('hidden');
      if (this.elements.dashboardBtn) this.elements.dashboardBtn.classList.add('hidden');
      if (window.themeManager) themeManager.applyTheme(user.theme || 'dark');
      this.renderUserProfile();
    } catch (e) {
      console.error('Perfil público não encontrado', e);
      this.showGuestState();
    }
  }

  renderUserProfile() {
    if (!this.currentUser) return;

    // Update handle
    if (this.elements.handle) {
      this.elements.handle.textContent = this.currentUser.handle || '@seuUsuario';
    }

    // Render links
    this.renderLinks();
    
    // Render social links
    this.renderSocialLinks();
  }

  renderLinks() {
    if (!this.elements.links || !this.currentUser.links) return;

    this.elements.links.innerHTML = '';

    this.currentUser.links.forEach(link => {
      const linkElement = document.createElement('a');
      linkElement.href = link.url;
      linkElement.target = '_blank';
      linkElement.rel = 'noopener noreferrer';
      linkElement.className = 'link-item';
      linkElement.textContent = link.label || link.url;
      
      // Add hover effect
      linkElement.addEventListener('mouseenter', () => {
        linkElement.style.transform = 'translateY(-2px) scale(1.02)';
      });
      
      linkElement.addEventListener('mouseleave', () => {
        linkElement.style.transform = 'translateY(0) scale(1)';
      });

      this.elements.links.appendChild(linkElement);
    });
  }

  renderSocialLinks() {
    if (!this.elements.socialLinks || !this.currentUser.socials) return;

    this.elements.socialLinks.innerHTML = '';

    const socialIcons = {
      github: 'logo-github',
      instagram: 'logo-instagram',
      linkedin: 'logo-linkedin',
      twitter: 'logo-twitter',
    };

    Object.entries(this.currentUser.socials).forEach(([platform, url]) => {
      if (!url || !socialIcons[platform]) return;

      const linkElement = document.createElement('a');
      linkElement.href = url;
      linkElement.target = '_blank';
      linkElement.rel = 'noopener noreferrer';
      linkElement.className = 'social-link';
      linkElement.setAttribute('aria-label', platform);

      const iconElement = document.createElement('ion-icon');
      iconElement.setAttribute('name', socialIcons[platform]);
      
      linkElement.appendChild(iconElement);
      this.elements.socialLinks.appendChild(linkElement);
    });
  }

  showGuestState() {
    if (this.elements.loginBtn) {
      this.elements.loginBtn.classList.remove('hidden');
    }
    if (this.elements.dashboardBtn) {
      this.elements.dashboardBtn.classList.add('hidden');
    }

    // Show default content
    if (this.elements.handle) {
      this.elements.handle.textContent = '@seuUsuario';
    }

    // Clear links and social
    if (this.elements.links) {
      this.elements.links.innerHTML = '';
    }
    if (this.elements.socialLinks) {
      this.elements.socialLinks.innerHTML = '';
    }
  }

  showLoggedInState() {
    if (this.elements.loginBtn) {
      this.elements.loginBtn.classList.add('hidden');
    }
    if (this.elements.dashboardBtn) {
      this.elements.dashboardBtn.classList.remove('hidden');
    }
  }

  // Public method to refresh user data
  async refresh() {
    await this.loadUserData();
  }
}

// Initialize app
window.app = new DevLinksApp();

// Listen for storage events to update UI when user logs in/out in another tab
window.addEventListener('storage', (event) => {
  if (event.key === 'devlinks_token') {
    window.app.refresh();
  }
});
