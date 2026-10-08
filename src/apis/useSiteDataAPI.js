export function useSiteDataAPI() {
  const API_BASE = '/api'

  const getAdminPassword = () => sessionStorage.getItem('admin_password') || ''

  const loadSiteData = async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    try {
      const response = await fetch(`${API_BASE}/site-data`, { signal: controller.signal })
      if (response.status === 404) {
        return null
      }
      if (!response.ok) {
        throw new Error(`加载数据失败: HTTP ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('请求超时，请检查网络连接')
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  const saveSiteData = async (data) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    try {
      const response = await fetch(`${API_BASE}/site-data`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': getAdminPassword()
        },
        body: JSON.stringify(data),
        signal: controller.signal
      })
      if (response.status === 401) {
        const err = await response.json().catch(() => null)
        throw new Error(err?.error || '管理员密码校验失败，请重新登录')
      }
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(err?.error || `保存失败: HTTP ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('保存超时，请检查网络连接')
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  const uploadLogo = async (file) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)
    try {
      const response = await fetch(`${API_BASE}/logo`, {
        method: 'PUT',
        headers: {
          'X-Admin-Password': getAdminPassword()
        },
        body: file,
        signal: controller.signal
      })
      if (response.status === 401) {
        const err = await response.json().catch(() => null)
        throw new Error(err?.error || '管理员密码校验失败，请重新登录')
      }
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(err?.error || `上传失败: HTTP ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('上传超时，请检查网络连接')
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  const verifyConnection = async () => {
    try {
      const response = await fetch(`${API_BASE}/health`, { method: 'GET' })
      if (!response.ok) {
        return { connected: false, error: `HTTP ${response.status}` }
      }
      const data = await response.json()
      return {
        connected: true,
        hasData: data.hasData,
        saveEnabled: data.saveEnabled
      }
    } catch (error) {
      return { connected: false, error: error.message }
    }
  }

  return {
    loadSiteData,
    saveSiteData,
    uploadLogo,
    verifyConnection
  }
}