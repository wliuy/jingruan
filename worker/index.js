import { handleSiteMetadataRequest } from '../lib/siteMetadata.js'
import {
  handleSiteDataRead,
  handleSiteDataWrite,
  handleLogoRead,
  handleLogoWrite,
  handleHealthCheck
} from '../lib/siteData.js'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/api/site-metadata') {
      if (request.method !== 'GET') {
        return new Response('Method Not Allowed', { status: 405 })
      }
      return handleSiteMetadataRequest(request.url)
    }

    if (url.pathname === '/api/site-data') {
      if (request.method === 'GET') {
        return handleSiteDataRead(env)
      }
      if (request.method === 'PUT') {
        return handleSiteDataWrite(request, env)
      }
      return new Response('Method Not Allowed', { status: 405 })
    }

    if (url.pathname === '/api/logo') {
      if (request.method === 'GET') {
        return handleLogoRead(env)
      }
      if (request.method === 'PUT') {
        return handleLogoWrite(request, env)
      }
      return new Response('Method Not Allowed', { status: 405 })
    }

    if (url.pathname === '/api/health') {
      if (request.method !== 'GET') {
        return new Response('Method Not Allowed', { status: 405 })
      }
      return handleHealthCheck(env)
    }

    return env.ASSETS.fetch(request)
  },
}
