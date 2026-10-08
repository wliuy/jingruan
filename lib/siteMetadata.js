function extractTitle(html) {
  const patterns = [
    /<title[^>]*>([^<]+)<\/title>/i,
    /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i,
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return match[1].replace(/[\r\n]/g, '').trim()
  }
  return ''
}

function extractDescription(html) {
  const patterns = [
    /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i,
    /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i,
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return match[1].replace(/[\r\n]/g, '').trim()
  }
  return ''
}

function resolveUrl(href, baseUrl) {
  try {
    return new URL(href, baseUrl).href
  } catch {
    return ''
  }
}

/** 从 HTML 解析图标，优先用站点自身 favicon，避免依赖 Google 等境外服务 */
function extractIcon(html, baseUrl) {
  const patterns = [
    /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i,
    /<link[^>]*rel=["']apple-touch-icon(?:-precomposed)?["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']apple-touch-icon(?:-precomposed)?["']/i,
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      const resolved = resolveUrl(match[1], baseUrl)
      if (resolved) return resolved
    }
  }
  return resolveUrl('/favicon.ico', baseUrl)
}

export async function fetchSiteMetadataFromUrl(url, { name = '', description = '', icon = '' } = {}) {
  const result = {
    name: name?.trim() || '',
    description: description?.trim() || '',
    icon: icon?.trim() || '',
  }

  const targetUrl = url.trim()

  const response = await fetch(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`目标站点返回 HTTP ${response.status}`)
  }

  const html = await response.text()
  const finalUrl = response.url || targetUrl

  if (!result.name) {
    result.name = extractTitle(html)
  }
  if (!result.description) {
    result.description = extractDescription(html)
  }
  if (!result.icon) {
    result.icon = extractIcon(html, finalUrl) || resolveUrl('/favicon.ico', finalUrl)
  }

  return result
}

export async function handleSiteMetadataRequest(requestUrl) {
  const url = new URL(requestUrl)
  const targetUrl = url.searchParams.get('url')

  if (!targetUrl?.trim()) {
    return Response.json({ error: '缺少 url 参数' }, { status: 400 })
  }

  try {
    new URL(targetUrl)
  } catch {
    return Response.json({ error: '无效的 URL' }, { status: 400 })
  }

  try {
    const metadata = await fetchSiteMetadataFromUrl(targetUrl, {
      name: url.searchParams.get('name') || '',
      description: url.searchParams.get('description') || '',
      icon: url.searchParams.get('icon') || '',
    })
    return Response.json(metadata, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return Response.json(
      { error: '抓取失败', message: error.message || '未知错误' },
      { status: 502 }
    )
  }
}
