<template>
  <div class="admin-container">
    <div v-if="!isAuthenticated" class="login-container">
      <div class="login-box">
        <h1>🔐 管理员登录</h1>
        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="password">管理密钥:</label>
            <input
              id="password"
              type="password"
              v-model="loginPassword"
              placeholder="请输入管理密钥"
              required
              class="form-input"
            />
          </div>
          <button type="submit" class="login-btn" :disabled="loading">
            {{ loading ? '验证中...' : '登录' }}
          </button>
        </form>
        <div v-if="loginError" class="error-message">
          {{ loginError }}
        </div>
      </div>
    </div>

    <div v-else class="admin-dashboard">
      <header class="admin-header">
        <div class="header-content">
          <h1>🛠️ 导航站管理</h1>
          <div class="header-actions">
            <button @click="emergencyReset" class="emergency-btn" hidden="true">🚨 紧急重置</button>
            <button @click="debugLoadData" class="debug-btn" hidden="true">🔍 调试加载</button>
            <span class="user-info">管理员</span>
            <button @click="logout" class="logout-btn">退出</button>
          </div>
        </div>
      </header>

      <main class="admin-main">
        <div v-if="loading" class="loading-overlay">
          <div class="loading-content">
            <div class="loading-spinner"></div>
            <p>正在加载数据...</p>
            <button @click="skipLoading" class="skip-loading-btn">跳过加载</button>
          </div>
        </div>

        <div class="tab-content">
          <CategoryManager
            :categories="categories"
            @update="handleCategoriesUpdate"
            @save="saveToKV"
            :loading="saving"
          />
        </div>
      </main>
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
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import CategoryManager from '../components/admin/CategoryManager.vue'
import CustomDialog from '../components/admin/CustomDialog.vue'
import { useSiteDataAPI } from '../apis/useSiteDataAPI.js'

const router = useRouter()
const { saveSiteData, loadSiteData } = useSiteDataAPI()

// 认证状态
const isAuthenticated = ref(false)
const loginPassword = ref('')
const loginError = ref('')
const loading = ref(false)
const saving = ref(false)

// 管理界面状态
const categories = ref([])
const navTitle = ref('精软导航')

// 紧急兜底：如果5秒后loading还是true，强制重置
const fallbackTimer = setTimeout(() => {
  if (loading.value) {
    loading.value = false
    if (categories.value.length === 0) {
      categories.value = [
        {
          id: 'default',
          name: '默认分类',
          icon: '📁',
          order: 0,
          sites: []
        }
      ]
    }
  }
}, 5000)

// 自定义弹框状态
const dialogVisible = ref(false)
const dialogType = ref('success')
const dialogTitle = ref('')
const dialogMessage = ref('')
const dialogDetails = ref([])

// 验证管理员密钥（仅前端入口，真正的写权限校验由 Worker 的 ADMIN_PASSWORD 负责）
const handleLogin = async () => {
  loading.value = true
  loginError.value = ''

  try {
    isAuthenticated.value = true
    localStorage.setItem('admin_authenticated', 'true')
    sessionStorage.setItem('admin_password', loginPassword.value)

    setTimeout(async () => {
      try {
        await loadCategories()
      } catch (error) {
        loading.value = false
      }
    }, 500)
  } catch (error) {
    loginError.value = error.message
  } finally {
    // 确保登录流程的loading状态被重置
    if (!isAuthenticated.value) {
      loading.value = false
    }
  }
}

// 退出登录
const logout = () => {
  isAuthenticated.value = false
  localStorage.removeItem('admin_authenticated')
  sessionStorage.removeItem('admin_password')
  loginPassword.value = ''
  router.push('/')
}

// 调试加载数据
const debugLoadData = async () => {
  console.log('=== 开始调试加载数据 ===')

  try {
    console.log('调用 loadSiteData...')
    const data = await loadSiteData()
    console.log('调用成功，返回数据:', data)

    showDialog(
      'success',
      '🎉 调试成功',
      '从 Cloudflare KV 读取数据成功',
      [`• 数据类型: ${typeof data}`, `• 包含categories: ${!!data.categories}`, `• 分类数量: ${data.categories?.length || 0}`]
    )
  } catch (error) {
    console.error('调用失败:', error)
    showDialog(
      'error',
      '❌ 调试失败',
      '从 Cloudflare KV 读取数据失败',
      [`• 错误信息: ${error.message}`, `• 错误类型: ${error.constructor.name}`]
    )
  }
}

// 加载分类数据（优先从 KV 读取，失败则回退本地数据）
const loadCategories = async () => {
  loading.value = true

  try {
    const data = await loadSiteData()
    if (data) {
      categories.value = data.categories || []
      navTitle.value = data.title || '精软导航'
    } else {
      const { mockData } = await import('../mock/mock_data.js')
      categories.value = mockData.categories || []
      navTitle.value = mockData.title || '精软导航'
    }
  } catch (error) {
    const { mockData } = await import('../mock/mock_data.js')
    categories.value = mockData.categories || []
    navTitle.value = mockData.title || '精软导航'
  } finally {
    loading.value = false
  }
}

// 处理分类更新
const handleCategoriesUpdate = (newCategories) => {
  categories.value = newCategories
}

// 显示弹框
const showDialog = (type, title, message, details = []) => {
  dialogType.value = type
  dialogTitle.value = title
  dialogMessage.value = message
  dialogDetails.value = details
  dialogVisible.value = true
}

// 关闭弹框
const closeDialog = () => {
  dialogVisible.value = false
}

// 跳过加载
const skipLoading = async () => {
  loading.value = false

  try {
    const { mockData } = await import('../mock/mock_data.js')
    categories.value = mockData.categories || []
    navTitle.value = mockData.title || '精软导航'
  } catch (error) {
    categories.value = [
      {
        id: 'default',
        name: '默认分类',
        icon: '📁',
        order: 0,
        sites: []
      }
    ]
    navTitle.value = '精软导航'
  }

  showDialog(
    'info',
    '⏭️ 已跳过加载',
    '已跳过KV数据加载，当前使用本地数据',
    [`• 分类数量: ${categories.value.length}`, `• 前台刷新即可看到最新数据`]
  )
}

// 保存到 Cloudflare KV
const saveToKV = async () => {
  saving.value = true
  try {
    // 先从 KV 加载当前完整数据，保留 search 等其他字段
    let currentData = {}
    try {
      currentData = await loadSiteData() || {}
    } catch (error) {
      console.warn('加载当前数据失败，使用默认值:', error)
    }

    // 保存完整的数据结构，保留 search 字段
    await saveSiteData({
      categories: categories.value,
      title: navTitle.value,
      search: currentData.search || 'bing'  // 保留搜索引擎设置
    })
    showDialog(
      'success',
      '🎉 保存成功',
      '您的更改已成功保存到 Cloudflare KV！',
      [
        '• 前台将会立即读到最新数据',
        '• KV 全球缓存约 60 秒内完成同步',
        '• 如提示密码校验失败，请在 Cloudflare 环境变量中设置 ADMIN_PASSWORD'
      ]
    )
  } catch (error) {
    showDialog(
      'error',
      '❌ 保存失败',
      '保存过程中发生错误，请重试',
      [`• 错误详情: ${error.message}`]
    )
  } finally {
    saving.value = false
  }
}

// 紧急重置加载状态
const emergencyReset = () => {
  loading.value = false
  showDialog(
    'info',
    '⚠️ 加载状态已重置',
    '已强制重置加载状态，请刷新页面查看效果。',
    []
  )
}

// 组件挂载时检查认证状态
onMounted(() => {
  loading.value = false

  const savedAuth = localStorage.getItem('admin_authenticated')
  if (savedAuth === 'true') {
    isAuthenticated.value = true

    import('../mock/mock_data.js').then(({ mockData }) => {
      categories.value = mockData.categories || []
      navTitle.value = mockData.title || '精软导航'
    }).catch(() => {
      categories.value = []
      navTitle.value = '精软导航'
    })
  }
})

onUnmounted(() => {
  clearTimeout(fallbackTimer)
})
</script>

<style scoped>
.admin-container {
  min-height: 100vh;
  min-height: 100svh;
  background: #2c3e50;
}

/* 登录界面样式 */
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
}

.login-box {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 400px;
}

.login-box h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #2c3e50;
  font-size: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #555;
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e1e1e1;
  border-radius: 6px;
  font-size: 16px;
  transition: border-color 0.3s ease;
}

.form-input:focus {
  outline: none;
  border-color: #3498db;
}

.login-btn {
  width: 100%;
  padding: 12px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.login-btn:hover:not(:disabled) {
  background: #2980b9;
}

.login-btn:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.error-message {
  margin-top: 15px;
  padding: 10px;
  background: #ffebee;
  color: #c62828;
  border-radius: 4px;
  text-align: center;
  font-size: 14px;
}

/* 管理界面样式 */
.admin-dashboard {
  min-height: 100vh;
  min-height: 100svh;
  background: #f5f7fa;
}

.admin-header {
  background: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 30px;
  max-width: 1200px;
  margin: 0 auto;
}

.header-content h1 {
  color: #2c3e50;
  margin: 0;
  font-size: 20px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-info {
  color: #7f8c8d;
  font-size: 14px;
}

.emergency-btn, .debug-btn, .logout-btn {
  padding: 8px 16px;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
}

.emergency-btn { background: #e74c3c; margin-right: 15px; }
.emergency-btn:hover { background: #c0392b; }
.debug-btn { background: #f39c12; margin-right: 15px; }
.debug-btn:hover { background: #e67e22; }
.logout-btn { background: #e74c3c; }
.logout-btn:hover { background: #c0392b; }

.admin-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 30px 0;
}

/* loading overlay 样式 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(3px);
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.admin-tabs {
  display: flex;
  background: white;
  border-radius: 8px;
  padding: 5px;
  margin-bottom: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.tab-btn {
  flex: 1;
  padding: 12px 20px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #7f8c8d;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.tab-btn.active {
  background: #3498db;
  color: white;
}

.tab-btn:hover:not(.active) {
  background: #f8f9fa;
  color: #2c3e50;
}

.tab-content {
  background: white;
  border-radius: 8px;
  padding: 10px 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.skip-loading-btn {
  margin-top: 20px;
  padding: 10px 20px;
  background: #f39c12;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
}

/* 🌟 手机端深度适配：横向排列菜单 */
@media (max-width: 768px) {
  /* 登录页适配 */
  .login-container {
    padding: 16px;
  }

  .login-box {
    padding: 28px 20px;
  }

  .login-box h1 {
    font-size: 20px;
    margin-bottom: 24px;
  }

  .form-input {
    font-size: 16px;
    padding: 13px 12px;
  }

  .login-btn {
    padding: 13px;
    min-height: 48px;
  }

  .error-message {
    font-size: 13px;
  }

  .header-content {
    padding: 12px 16px;
  }

  .header-content h1 {
    font-size: 17px;
    margin-right: 12px;
    white-space: nowrap;
  }

  .header-actions {
    gap: 8px;
  }

  .user-info {
    font-size: 13px;
    white-space: nowrap;
  }

  .logout-btn {
    padding: 8px 14px;
    font-size: 13px;
    min-height: 38px;
    white-space: nowrap;
  }

  .admin-main {
    padding: 16px 12px 40px;
  }

  .tab-content {
    padding: 16px 14px;
  }

  /* 🌟 核心修改：强制横向排列并支持滑动 */
  .admin-tabs {
    flex-direction: row !important; /* 强制横排 */
    overflow-x: auto; /* 允许横向滚动 */
    padding: 8px;
    gap: 10px;
    -webkit-overflow-scrolling: touch; /* 流畅滚动 */
    margin-bottom: 16px;
    /* 隐藏滚动条 */
    scrollbar-width: none; 
  }
  
  .admin-tabs::-webkit-scrollbar {
    display: none;
  }

  .tab-btn {
    margin-bottom: 0;
    white-space: nowrap; /* 禁止文字折行 */
    flex: 0 0 auto; /* 禁止压缩，保持内容宽度 */
    padding: 0 18px;
    min-height: 44px; /* 触摸目标 */
    font-size: 14px;
  }

  /* 加载遮罩适配 */
  .loading-content {
    padding: 32px 24px;
    width: 90%;
    max-width: 320px;
  }

  .loading-spinner {
    width: 34px;
    height: 34px;
  }
}

@media (max-width: 360px) {
  .header-content h1 {
    font-size: 15px;
  }

  .user-info {
    display: none;
  }
}
</style>