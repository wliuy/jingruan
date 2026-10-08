/**
 * 从目标 URL 抓取页面标题与描述，用于自动填充站点信息
 */
export function needsMetadataFetch({ name, description, url }) {
  return Boolean(url?.trim() && (!name?.trim() || !description?.trim()))
}

export function applySiteMetadata(formData, metadata) {
  if (!formData.name?.trim() && metadata.name) {
    formData.name = metadata.name
  }
  if (!formData.description?.trim() && metadata.description) {
    formData.description = metadata.description
  }
  if (!formData.icon?.trim() && metadata.icon) {
    formData.icon = metadata.icon
  }
}

export async function fetchSiteMetadata(url, { name = '', description = '', icon = '' } = {}) {
  let normalizedUrl = url.trim()
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = `https://${normalizedUrl}`
  }
  const params = new URLSearchParams({ url: normalizedUrl })
  if (name?.trim()) params.set('name', name.trim())
  if (description?.trim()) params.set('description', description.trim())
  if (icon?.trim()) params.set('icon', icon.trim())

  const response = await fetch(`/api/site-metadata?${params.toString()}`)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || data.error || '抓取失败')
  }

  return {
    name: data.name || name?.trim() || '',
    description: data.description || description?.trim() || '',
    icon: data.icon || icon?.trim() || '',
  }
}
