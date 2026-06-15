import { loginStyles } from './styles'

export class LoadingOverlay {
  private container: HTMLDivElement | null = null
  private root: ShadowRoot | null = null

  show(title: string, subtitle: string): void {
    if (this.container) {
      const titleEl = this.root?.querySelector('.auth-sdk-title')
      const subtitleEl = this.root?.querySelector('.auth-sdk-subtitle')
      if (titleEl) titleEl.textContent = title
      if (subtitleEl) subtitleEl.textContent = subtitle
      this.container.style.display = ''
      return
    }

    this.container = document.createElement('div')
    this.root = this.container.attachShadow({ mode: 'closed' })

    const styleEl = document.createElement('style')
    styleEl.textContent = loginStyles
    this.root.appendChild(styleEl)

    const wrapper = document.createElement('div')
    wrapper.innerHTML = `
      <div class="auth-sdk-overlay fullscreen">
        <div class="auth-sdk-card auth-sdk-loading-card">
          <div class="auth-sdk-loading-spinner"></div>
          <h2 class="auth-sdk-title">${title}</h2>
          <p class="auth-sdk-subtitle">${subtitle}</p>
        </div>
      </div>
    `
    this.root.appendChild(wrapper)
    document.body.appendChild(this.container)
  }

  hide(): void {
    if (this.container) {
      this.container.style.display = 'none'
    }
  }

  destroy(): void {
    if (this.container?.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }
    this.container = null
    this.root = null
  }
}
