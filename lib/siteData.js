const SITE_DATA_KEY = 'site-data'
const LOGO_KEY = 'logo'

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8' }
})

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

function isAuthorized(request, env) {
  const secret = env.ADMIN_PASSWORD
  if (!secret) return false
  const provided = request.headers.get('X-Admin-Password')
  return timingSafeEqual(provided || '', secret)
}

function authCheck(request, env) {
  if (!env.ADMIN_PASSWORD) {
    return json({ error: 'ADMIN_PASSWORD 未配置，请在 Cloudflare 环境变量中设置' }, 401)
  }
  if (!isAuthorized(request, env)) {
    return json({ error: '管理员密码校验失败' }, 401)
  }
  return null
}

export async function handleSiteDataRead(env) {
  const raw = await env.SITE_DATA.get(SITE_DATA_KEY)
  if (raw === null) {
    return json({ error: '站内数据不存在', code: 'NOT_FOUND' }, 404)
  }
  return new Response(raw, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  })
}

export async function handleSiteDataWrite(request, env) {
  const authError = authCheck(request, env)
  if (authError) {
    return authError
  }

  let data
  try {
    data = await request.json()
  } catch {
    return json({ error: '请求体不是合法的 JSON' }, 400)
  }

  if (!data || typeof data !== 'object' || !Array.isArray(data.categories)) {
    return json({ error: '缺少 categories 字段' }, 400)
  }

  await env.SITE_DATA.put(SITE_DATA_KEY, JSON.stringify(data))
  return json({ ok: true })
}

export async function handleLogoRead(env) {
  const logo = await env.SITE_DATA.get(LOGO_KEY, 'arrayBuffer')
  if (logo === null) {
    return json({ error: 'Logo 不存在', code: 'NOT_FOUND' }, 404)
  }
  return new Response(logo, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store'
    }
  })
}

export async function handleLogoWrite(request, env) {
  const authError = authCheck(request, env)
  if (authError) {
    return authError
  }

  const contentType = request.headers.get('Content-Type') || ''
  if (!contentType.includes('image/png')) {
    return json({ error: '仅支持 PNG 图片' }, 400)
  }

  const body = await request.arrayBuffer()
  if (body.byteLength === 0) {
    return json({ error: '上传内容为空' }, 400)
  }

  await env.SITE_DATA.put(LOGO_KEY, body)
  return json({ ok: true })
}

export async function handleHealthCheck(env) {
  const raw = await env.SITE_DATA.get(SITE_DATA_KEY)
  return json({ ok: true, hasData: raw !== null, saveEnabled: !!env.ADMIN_PASSWORD })
}