<template>
  <div class="system-settings">
    <div class="settings-header">
      <h2>⚙️ 系统设置</h2>
      <p>管理导航站的系统配置和数据存储（Cloudflare KV）</p>
    </div>

    <div class="stats-bar">
      <div class="stat-info">
        💡 提示：v2.4.8 启用“全属性克隆”技术，防止修改站点时因元数据丢失导致的排序失效。
      </div>
    </div>

    <div class="settings-section">
      <h3>🔗 Cloudflare KV 集成状态</h3>
      <div class="github-status" :class="{ connected: connectionStatus?.connected }">
        <div class="status-info">
          <div class="status-indicator">
            <span class="status-dot" :class="{ active: connectionStatus?.connected }"></span>
            <span class="status-text">
              {{ connectionStatus?.connected ? 'KV 连接正常' : 'KV 连接失败' }}
            </span>
          </div>
          <div v-if="connectionStatus?.connected" class="repo-info">
            <p><strong>数据存储:</strong> Cloudflare KV（site-data / logo）</p>
            <p><strong>写入保护:</strong>
              <span v-if="adminPasswordConfigured" class="permission-badge success">ADMIN_PASSWORD 已配置</span>
              <span v-else class="permission-badge warning">ADMIN_PASSWORD 未配置</span>
            </p>
          </div>
          <div v-else-if="connectionStatus?.error" class="error-info">
            <p>错误信息: {{ connectionStatus.error }}</p>
          </div>
        </div>
        <div class="status-actions">
          <button @click="testConnection" :disabled="testing" class="test-btn">
            {{ testing ? '测试中...' : '🔄 重新测试' }}
          </button>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h3>🌐 网站设置</h3>
      <div class="website-settings">
        <div class="setting-group">
          <label>网站标题:</label>
          <div class="title-input-group">
            <input
              v-model="websiteTitle"
              type="text"
              placeholder="请输入网站标题"
              class="title-input"
              maxlength="50"
            >
            <button
              @click="saveTitle"
              :disabled="titleSaving || !websiteTitle.trim()"
              class="save-title-btn"
            >
              {{ titleSaving ? '保存中...' : '💾 保存标题' }}
            </button>
          </div>
          <p class="setting-description">当前标题: {{ currentTitle || 'jingruan 导航' }}</p>
        </div>

        <div class="setting-group">
          <label>默认搜索引擎:</label>
          <div class="search-engine-input-group">
            <select v-model="searchEngine" class="search-engine-select">
              <option
                v-for="option in searchEngineOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
            <button
              @click="saveSearchEngine"
              :disabled="searchEngineSaving || searchEngine === currentSearchEngine"
              class="save-search-engine-btn"
            >
              {{ searchEngineSaving ? '保存中...' : '💾 保存设置' }}
            </button>
          </div>
          <p class="setting-description">当前搜索引擎: {{ searchEngineOptions.find(opt => opt.value === currentSearchEngine)?.label || 'Bing' }}</p>
        </div>

        <div class="setting-group">
          <label>网站Logo:</label>
          <div class="logo-upload-area">
            <div class="logo-preview">
              <img
                v-if="logoPreview"
                :src="logoPreview"
                alt="Logo预览"
                class="logo-preview-img"
              >
              <img
                v-else-if="currentLogo"
                :src="currentLogo"
                alt="当前Logo"
                class="logo-preview-img"
              >
              <div v-else class="logo-placeholder">
                <span>🖼️</span>
                <p>暂无Logo</p>
              </div>
            </div>
            <div class="logo-upload-controls">
              <input
                ref="logoFileInput"
                type="file"
                accept="image/png"
                @change="handleLogoSelect"
                style="display: none"
              >
              <button @click="selectLogo" class="select-logo-btn">
                📁 选择PNG文件
              </button>
              <button
                @click="saveLogo"
                :disabled="logoSaving || !selectedLogoFile"
                class="save-logo-btn"
                v-if="selectedLogoFile"
              >
                {{ logoSaving ? '上传中...' : '🚀 上传Logo' }}
              </button>
            </div>
          </div>
          <p class="setting-description">仅支持PNG格式，建议尺寸: 128x128px</p>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h3>🔐 权限配置</h3>
      <div class="env-config">
        <div class="config-item">
          <label>管理员密钥 (VITE_ADMIN_PASSWORD):</label>
          <div class="config-value">
            <span v-if="envConfig.adminPassword" class="value-set">✅ 已配置</span>
            <span v-else class="value-missing">❌ 未配置</span>
          </div>
        </div>
        <div class="config-item">
          <label>Worker 写入密钥 (ADMIN_PASSWORD):</label>
          <div class="config-value">
            <span v-if="adminPasswordConfigured" class="value-set">✅ 已配置</span>
            <span v-else class="value-missing">❌ 未配置</span>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h3>📖 配置说明</h3>
      <div class="config-guide">
        <div class="guide-step">
          <h4>1. 部署 Worker（含 KV 数据同步）</h4>
          <ol>
            <li>本地执行 <code>npm run build</code> 生成前端产物</li>
            <li>执行 <code>npx wrangler deploy</code> 部署 Worker 与静态资源</li>
            <li>KV 命名空间（SITE_DATA）已在 <code>wrangler.jsonc</code> 中绑定</li>
            <li>首次部署后，站点数据保存在 KV：key <code>site-data</code>（导航数据）与 <code>logo</code>（Logo）</li>
          </ol>
        </div>

        <div class="guide-step">
          <h4>2. 配置写入密钥（ADMIN_PASSWORD）</h4>
          <div class="code-block">
            <pre><code>npx wrangler secret put ADMIN_PASSWORD</code></pre>
          </div>
          <p>或在 Cloudflare 控制台 → Workers 与 Pages → 你的 Worker → 设置 → 变量 → 添加加密变量 <code>ADMIN_PASSWORD</code>。</p>
          <p><strong>注意：</strong>该值必须与 <code>VITE_ADMIN_PASSWORD</code> 保持一致，后台保存数据时用它做鉴权。</p>
        </div>

        <div class="guide-step">
          <h4>3. 本地 .env 配置</h4>
          <div class="code-block">
            <pre><code>VITE_ADMIN_PASSWORD=你的后台登录密码</code></pre>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h3>ℹ️ 系统信息</h3>
      <div class="system-info">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Vue 版本:</span>
            <span class="info-value">{{ systemInfo.vueVersion }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">构建工具:</span>
            <span class="info-value">Vite</span>
          </div>
          <div class="info-item">
            <span class="info-label">检查时间:</span>
            <span class="info-value">{{ systemInfo.buildTime }}</span>
          </div>
        </div>
      </div>
    </div>

    <CustomDialog
      :visible="dialogVisible"
      :type="dialogType"
      :title="dialogTitle"
      :message="dialogMessage"
      :details="dialogDetails"
      @close="closeDialog"
      @confirm="closeDialog"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSiteDataAPI } from '../../apis/useSiteDataAPI.js'
import CustomDialog from './CustomDialog.vue'

const { verifyConnection, loadSiteData, saveSiteData, uploadLogo } = useSiteDataAPI()

// 连接状态
const connectionStatus = ref(null)
const testing = ref(false)
const adminPasswordConfigured = ref(false)

// 环境变量配置
const envConfig = ref({
  adminPassword: '',
  saveEnabled: false
})

// 系统信息
const systemInfo = ref({
  vueVersion: '',
  buildTime: '',
  userAgent: ''
})

// 网站设置
const websiteTitle = ref('')
const currentTitle = ref('')
const titleSaving = ref(false)

// 搜索引擎设置
const searchEngine = ref('bing')
const currentSearchEngine = ref('bing')
const searchEngineSaving = ref(false)

const searchEngineOptions = [
  { value: 'google', label: 'Google' },
  { value: 'baidu', label: '百度' },
  { value: 'bing', label: 'Bing' },
  { value: 'duckduckgo', label: 'DuckDuckGo' }
]

// Logo设置
const logoFileInput = ref(null)
const selectedLogoFile = ref(null)
const logoPreview = ref('')
const currentLogo = ref('/api/logo')
const logoSaving = ref(false)

// 自定义弹框状态
const dialogVisible = ref(false)
const dialogType = ref('success')
const dialogTitle = ref('')
const dialogMessage = ref('')
const dialogDetails = ref([])

const showDialog = (type, title, message, details = []) => {
  dialogType.value = type
  dialogTitle.value = title
  dialogMessage.value = message
  dialogDetails.value = details
  dialogVisible.value = true
}

const closeDialog = () => {
  dialogVisible.value = false
}

// 测试 KV 连接
const testConnection = async () => {
  testing.value = true
  try {
    const status = await verifyConnection()
    connectionStatus.value = status
    adminPasswordConfigured.value = !!status.saveEnabled
    envConfig.value.saveEnabled = !!status.saveEnabled
  } catch (error) {
    connectionStatus.value = { connected: false, error: error.message }
  } finally {
    testing.value = false
  }
}

// 检查环境变量配置
const checkEnvConfig = () => {
  envConfig.value = {
    adminPassword: import.meta.env.VITE_ADMIN_PASSWORD ? '***' : '',
    saveEnabled: adminPasswordConfigured.value
  }
}

const getSystemInfo = () => {
  systemInfo.value = {
    vueVersion: '3.x',
    buildTime: new Date().toLocaleString('zh-CN'),
    userAgent: navigator.userAgent
  }
}

// 加载当前网站设置
const loadWebsiteSettings = async () => {
  try {
    const data = await loadSiteData()
    currentTitle.value = (data && data.title) || 'jingruan 导航'
    websiteTitle.value = currentTitle.value
    currentSearchEngine.value = (data && data.search) || 'bing'
    searchEngine.value = currentSearchEngine.value
  } catch (error) {
    currentTitle.value = 'jingruan 导航'
    websiteTitle.value = 'jingruan 导航'
    currentSearchEngine.value = 'bing'
    searchEngine.value = 'bing'
  }
}

// 保存标题
const saveTitle = async () => {
  if (!websiteTitle.value.trim()) {
    showDialog('error', '❌ 输入错误', '请输入网站标题', [])
    return
  }

  titleSaving.value = true
  try {
    const data = await loadSiteData() || { categories: [] }
    const newTitle = websiteTitle.value.trim()
    data.title = newTitle

    await saveSiteData(data)
    currentTitle.value = newTitle
    
    // 🌟 核心修复：即时同步浏览器标签页标题
    document.title = `管理后台 - ${newTitle}`

    showDialog(
      'success',
      '🎉 保存成功',
      '网站标题已成功保存到 Cloudflare KV！',
      ['• 浏览器标签页已立即更新', '• KV 全球缓存约 60 秒内完成同步']
    )
  } catch (error) {
    showDialog('error', '❌ 保存失败', '错误详情: ' + error.message)
  } finally {
    titleSaving.value = false
  }
}

const saveSearchEngine = async () => {
  searchEngineSaving.value = true
  try {
    const data = await loadSiteData() || { categories: [] }
    data.search = searchEngine.value
    await saveSiteData(data)
    currentSearchEngine.value = searchEngine.value
    showDialog('success', '🎉 搜索引擎设置已保存到 Cloudflare KV')
  } catch (error) {
    showDialog('error', '❌ 保存失败', error.message)
  } finally {
    searchEngineSaving.value = false
  }
}

const selectLogo = () => logoFileInput.value?.click()

const handleLogoSelect = (event) => {
  const file = event.target.files[0]
  if (!file) return
  if (file.type !== 'image/png') {
    showDialog('error', '❌ 格式错误', '请选择 PNG 图片')
    return
  }
  selectedLogoFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => logoPreview.value = e.target.result
  reader.readAsDataURL(file)
}

const saveLogo = async () => {
  if (!selectedLogoFile.value) return
  logoSaving.value = true
  try {
    await uploadLogo(selectedLogoFile.value)
    currentLogo.value = logoPreview.value
    selectedLogoFile.value = null
    logoPreview.value = ''
    showDialog('success', '🎉 Logo 已上传到 Cloudflare KV')
  } catch (error) {
    showDialog('error', '❌ 上传失败', error.message)
  } finally {
    logoSaving.value = false
  }
}

onMounted(() => {
  checkEnvConfig()
  getSystemInfo()
  testConnection()
  loadWebsiteSettings()
})
</script>

<style scoped>
.system-settings { padding: 10px 0; }
.settings-header { margin-bottom: 25px; }
.settings-header h2 { color: #2c3e50; margin: 0 0 8px 0; font-size: 22px; }
.settings-header p { color: #7f8c8d; margin: 0; font-size: 14px; }

.stats-bar { 
  margin-bottom: 25px; padding: 12px 16px; background: #fff; border: 1px solid #edf2f7; 
  border-radius: 10px; font-size: 13px; color: #64748b; box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}

.settings-section { margin-bottom: 25px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
.settings-section h3 { color: #1e293b; margin: 0 0 15px 0; font-size: 16px; font-weight: 600; border-left: 4px solid #3498db; padding-left: 12px; }

.github-status { display: flex; justify-content: space-between; align-items: center; padding: 15px; background: white; border-radius: 8px; border: 1px solid #e2e8f0; }
.github-status.connected { border-color: #27ae60; background: #f8fff9; }

.status-indicator { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.status-dot { width: 10px; height: 10px; border-radius: 50%; background: #e74c3c; }
.status-dot.active { background: #27ae60; }
.status-text { font-weight: 600; color: #334155; font-size: 14px; }
.repo-info p { margin: 4px 0; color: #64748b; font-size: 13px; }

.test-btn { padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; }

.website-settings { display: flex; flex-direction: column; gap: 20px; }
.setting-group { display: flex; flex-direction: column; gap: 8px; }
.setting-group label { font-weight: 600; color: #475569; font-size: 14px; }
.setting-description { color: #94a3b8; font-size: 12px; }

.title-input-group, .search-engine-input-group { display: flex; gap: 10px; }
.title-input, .search-engine-select { flex: 1; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; outline: none; }

.save-title-btn, .save-search-engine-btn { padding: 10px 18px; background: #3498db; color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; }

.logo-upload-area { display: flex; gap: 15px; align-items: center; }
.logo-preview { width: 64px; height: 64px; border: 1px solid #e2e8f0; border-radius: 10px; background: white; overflow: hidden; }
.logo-preview-img { width: 100%; height: 100%; object-fit: contain; }

.select-logo-btn { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; padding: 8px 15px; border-radius: 6px; cursor: pointer; }
.save-logo-btn { background: #27ae60; color: white; padding: 8px 15px; border-radius: 6px; cursor: pointer; }

.env-config { display: flex; flex-direction: column; gap: 8px; }
.config-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; background: white; border-radius: 8px; border: 1px solid #edf2f7; }
.config-item label { font-size: 13px; color: #64748b; }
.value-display { font-family: monospace; font-size: 12px; color: #334155; }

.config-guide { background: white; border-radius: 8px; border: 1px solid #e2e8f0; }
.guide-step { padding: 12px; border-bottom: 1px solid #f1f5f9; }
.code-block { background: #1e293b; color: #e2e8f0; padding: 12px; border-radius: 8px; font-size: 12px; margin-top: 10px; line-height: 1.5; overflow-x: auto; }
.code-block pre { margin: 0; }
.code-block code { font-family: Menlo, Consolas, 'Courier New', monospace; white-space: pre; }

.info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
.info-item { display: flex; justify-content: space-between; padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #edf2f7; font-size: 12px; }

@media (max-width: 768px) {
  .settings-section { padding: 16px 14px; }
  .settings-header h2 { font-size: 19px; }
  .settings-header p { font-size: 13px; }
  .github-status { flex-direction: column; align-items: flex-start; gap: 12px; }
  .status-actions { width: 100%; }
  .test-btn { width: 100%; padding: 12px; min-height: 44px; }
  .config-item { flex-direction: column; align-items: flex-start; gap: 4px; }
  .title-input-group, .search-engine-input-group { flex-direction: column; }
  .save-title-btn, .save-search-engine-btn { width: 100%; min-height: 44px; }
  .select-logo-btn, .save-logo-btn { min-height: 44px; padding: 10px 15px; }
  .logo-upload-area { flex-direction: column; align-items: center; width: 100%; }
  .logo-upload-controls { display: flex; gap: 8px; width: 100%; }
  .logo-upload-controls button { flex: 1; }
  .info-grid { grid-template-columns: 1fr; }
}

@media (max-width: 360px) {
  .settings-section { padding: 14px 12px; }
  .setting-group label { font-size: 13px; }
}
</style>