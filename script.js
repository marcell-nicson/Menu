function toggleMode() {
  const html = document.documentElement
  html.classList.toggle("light")
  const img = document.querySelector("#profile-img")
  if (window.api && api.isLoggedIn()) {
    try { api.updateMe({ theme: html.classList.contains("light") ? 'light' : 'dark' }) } catch (_) {}
    // Atualiza avatar a partir do usuário atual (se disponível)
    const user = window.currentUser || {}
    const avatar = html.classList.contains('light')
      ? (user.avatarLight || user.avatar || './assets/avatar-light.png')
      : (user.avatar || './assets/avatar.png')
    if (img) img.setAttribute('src', avatar)
  } else {
    const avatar = html.classList.contains("light") ? "./assets/avatar-light.png" : "./assets/avatar.png"
    img.setAttribute("src", avatar)
  }
}

function renderPublicProfile() {
  const html = document.documentElement
  const accountLink = document.getElementById('account-link')
  const profileImg = document.getElementById('profile-img')
  const profileHandle = document.getElementById('profile-handle')
  const linksUl = document.getElementById('links')
  const socialDiv = document.getElementById('social-links')

  if (!linksUl || !socialDiv) return
  
  if (window.api && api.isLoggedIn()) {
    api.getMe().then(user => {
    window.currentUser = user
    if (accountLink) accountLink.textContent = 'Dashboard'
    if (accountLink) accountLink.href = 'dashboard.html'
    if (user.theme === 'light') {
      html.classList.add('light')
    } else {
      html.classList.remove('light')
    }
    profileImg.src = html.classList.contains('light')
      ? (user.avatarLight || user.avatar || './assets/avatar-light.png')
      : (user.avatar || './assets/avatar.png')
    profileHandle.textContent = user.handle || '@seuUsuario'
    // links
    linksUl.innerHTML = ''
    ;(user.links || []).forEach(link => {
      const li = document.createElement('li')
      const a = document.createElement('a')
      a.href = link.url
      a.target = '_blank'
      a.textContent = link.label || link.url
      li.appendChild(a)
      linksUl.appendChild(li)
    })
    // social
    socialDiv.innerHTML = ''
    const socials = user.socials || {}
    const socialIcons = {
      github: 'logo-github',
      instagram: 'logo-instagram',
      linkedin: 'logo-linkedin',
      twitter: 'logo-twitter'
    }
    Object.keys(socialIcons).forEach(key => {
      const href = socials[key]
      if (!href) return
      const a = document.createElement('a')
      a.href = href
      a.target = '_blank'
      a.setAttribute('alt', key)
      const icon = document.createElement('ion-icon')
      icon.setAttribute('name', socialIcons[key])
      a.appendChild(icon)
      socialDiv.appendChild(a)
    })
    })
  } else {
    if (accountLink) accountLink.textContent = 'Entrar'
    if (accountLink) accountLink.href = 'login.html'
    profileImg.src = html.classList.contains('light') ? './assets/avatar-light.png' : './assets/avatar.png'
    profileHandle.textContent = '@seuUsuario'
    linksUl.innerHTML = ''
    socialDiv.innerHTML = ''
  }
}

document.addEventListener('DOMContentLoaded', renderPublicProfile)