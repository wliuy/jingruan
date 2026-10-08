<template>
  <!-- 锁定界面 -->
  <div v-if="isLocked && !isUnlocked" class="lock-container">
    <div class="lock-box">
      <h1>🔐 访问验证</h1>
      <!-- 2026-03-30 v2.4.1 视觉微调：手机端介绍恢复显示 2 行，保持标题间距不变 -->
      <p class="lock-description">此导航站已启用访问保护</p>
      <form @submit.prevent="handleUnlock">
        <div class="form-group">
          <label for="unlock-password">请输入访问密钥:</label>
          <input
            id="unlock-password"
            type="password"
            v-model="unlockPassword"
            placeholder="请输入访问密钥"
            required
            class="form-input"
          />
        </div>
        <button type="submit" class="unlock-btn" :disabled="unlocking">
          {{ unlocking ? '验证中...' : '进入导航' }}
        </button>
      </form>
      <div v-if="unlockError" class="error-message">
        {{ unlockError }}
      </div>
    </div>
  </div>

  <!-- 正常导航界面 -->
  <div v-else class="nav-home">
    <!-- 左侧边栏 -->
    <aside class="sidebar">
      <div class="logo-section">
        <!-- 🌟 侧边栏 Logo 替换为自定义图片 -->
        <img :src="siteLogo" class="logo" alt="Logo">
        <!-- 🌟 SEO 优化：网站标题作为 H1 -->
        <h1 class="site-title">{{ title || 'jingruan 导航' }}</h1>
      </div>

      <!-- 分类导航 -->
      <nav class="category-nav">
        <h2 class="nav-title">分类导航</h2>
        <ul class="category-list">
          <li
            v-for="category in categories"
            :key="category.id"
            class="category-item"
          >
            <div class="category-main" @click="category.subcategories ? toggleSubcategory(category.id) : scrollToCategory(category.id)">
              <span class="category-icon">{{ category.icon }}</span>
              <span class="category-name">{{ category.name }}</span>
              <span v-if="category.subcategories" class="category-arrow" :class="{ expanded: expandedCategories[category.id] }">▶</span>
            </div>
            <ul v-if="category.subcategories && expandedCategories[category.id]" class="subcategory-list">
              <li
                v-for="sub in category.subcategories"
                :key="sub.id"
                class="subcategory-item"
                @click="scrollToCategory(sub.id)"
              >
                <span class="subcategory-icon">{{ sub.icon }}</span>
                <span class="subcategory-name">{{ sub.name }}</span>
              </li>
            </ul>
          </li>
        </ul>
      </nav>

<!-- 左侧边栏底部信息 -->
      <div class="sidebar-footer">
        <a
          href="https://github.com/wliuy/jingruan"
          target="_blank"
          rel="noopener noreferrer"
          class="github-link"
          title="点击访问"
        >
          <svg t="1784534845246" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="6480" width="20" height="20">
            <path d="M512 512m-331.294118 0a331.294118 331.294118 0 1 0 662.588236 0 331.294118 331.294118 0 1 0-662.588236 0Z" fill="#4474FF" p-id="6481"></path>
            <path d="M512 993.882353a481.882353 481.882353 0 1 0 0-963.764706 481.882353 481.882353 0 0 0 0 963.764706z m0-60.235294a421.647059 421.647059 0 1 1 0-843.294118 421.647059 421.647059 0 0 1 0 843.294118z" fill="#4474FF" p-id="6482"></path>
          </svg>
          <span>GitHub</span>
        </a>
      </div>
    </aside>

    <!-- 右侧主内容区 -->
    <main class="main-content">
      <!-- 顶部搜索栏 -->
      <header class="search-header">
        <div class="search-container-wrapper">
          <div class="search-container">
            <div class="search-engine-selector">
              <img :src="searchEngines[selectedEngine].icon" :alt="selectedEngine" class="engine-logo" />
              <select v-model="selectedEngine" class="engine-select">
                <option value="site">本站</option>
                <option value="google">Google</option>
                <option value="baidu">Baidu</option>
                <option value="bing">Bing</option>
                <option value="duckduckgo">DuckDuckGo</option>
              </select>
            </div>
            <input
              type="text"
              v-model="searchQuery"
              :placeholder="searchEngines[selectedEngine].placeholder"
              class="search-input"
              @input="onSearchInput"
              @keyup.enter="handleSearch"
            />
            <button v-if="searchQuery" class="search-clear-btn" @click="clearSearchResults">✕</button>
          </div>

          <!-- 本站搜索结果下拉 -->
          <div v-if="isSearching" class="search-dropdown">
            <div v-if="siteSearchResults.length === 0" class="dropdown-no-results">
              未找到匹配的站点
            </div>
            <div v-else class="dropdown-results-list">
              <a
                v-for="site in siteSearchResults"
                :key="site.id"
                :href="site.url"
                target="_blank"
                rel="noopener noreferrer"
                class="dropdown-result-item"
              >
                <div class="dropdown-result-icon">
                  <div v-if="site.icon && site.icon.includes('<svg')" v-html="site.icon" class="svg-icon-wrapper"></div>
                  <img v-else :src="site.icon || '/api/logo'" :alt="site.name" @error="handleImageError" />
                </div>
                <div class="dropdown-result-info">
                  <span class="dropdown-result-name">{{ site.name }}</span>
                  <span class="dropdown-result-meta">{{ site.categoryIcon }} {{ site.categoryName }}</span>
                </div>
              </a>
            </div>
          </div>
        </div>

        <!-- 主题切换按钮 -->
        <button class="theme-toggle-btn" @click="themeStore.toggleTheme" :title="themeStore.isDarkMode ? '切换到日间模式' : '切换到夜间模式'">
          <svg v-if="!themeStore.isDarkMode" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 18C8.68629 18 6 15.3137 6 12C6 8.68629 8.68629 6 12 6C15.3137 6 18 8.68629 18 12C18 15.3137 15.3137 18 12 18ZM12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16ZM11 1H13V4H11V1ZM11 20H13V23H11V20ZM3.51472 4.92893L4.92893 3.51472L7.05025 5.63604L5.63604 7.05025L3.51472 4.92893ZM16.9497 18.364L18.364 16.9497L20.4853 19.0711L19.0711 20.4853L16.9497 18.364ZM19.0711 3.51472L20.4853 4.92893L18.364 7.05025L16.9497 5.63604L19.0711 3.51472ZM5.63604 16.9497L7.05025 18.364L4.92893 20.4853L3.51472 19.0711L5.63604 16.9497ZM23 11V13H20V11H23ZM4 11V13H1V11H4Z"/>
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 7C10 10.866 13.134 14 17 14C18.9584 14 20.729 13.1957 21.9995 11.8995C22 11.933 22 11.9665 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C12.0335 2 12.067 2 12.1005 2.00049C10.8043 3.27098 10 5.04157 10 7ZM4 12C4 16.4183 7.58172 20 12 20C15.0583 20 17.7158 18.2839 19.062 15.7621C18.3945 15.9187 17.7035 16 17 16C12.0294 16 8 11.9706 8 7C8 6.29648 8.08133 5.60547 8.2379 4.938C5.71611 6.28423 4 8.9417 4 12Z"/>
          </svg>
        </button>

        <!-- 移动端菜单按钮 -->
        <button class="mobile-menu-btn" @click="toggleMobileMenu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>

        <!-- 移动端分类菜单 -->
        <div class="mobile-menu" :class="{ active: showMobileMenu }">
          <div class="mobile-menu-header">
            <div class="header-left">
              <h3>分类导航</h3>
            </div>
            <button class="close-btn" @click="closeMobileMenu">×</button>
          </div>
          <ul class="mobile-category-list">
            <li
              v-for="category in categories"
              :key="category.id"
              class="mobile-category-item"
            >
              <div class="mobile-category-main" @click="category.subcategories ? toggleMobileSubcategory(category.id) : scrollToCategoryMobile(category.id)">
                <span class="category-icon">{{ category.icon }}</span>
                <span class="category-name">{{ category.name }}</span>
                <span v-if="category.subcategories" class="category-arrow" :class="{ expanded: expandedMobileCategories[category.id] }">▶</span>
              </div>
              <ul v-if="category.subcategories && expandedMobileCategories[category.id]" class="mobile-subcategory-list">
                <li
                  v-for="sub in category.subcategories"
                  :key="sub.id"
                  class="mobile-subcategory-item"
                  @click="scrollToCategoryMobile(sub.id)"
                >
                  <span class="subcategory-icon">{{ sub.icon }}</span>
                  <span class="subcategory-name">{{ sub.name }}</span>
                </li>
              </ul>
            </li>
          </ul>
        </div>

        <!-- 移动端菜单遮罩 -->
        <div class="mobile-menu-overlay" :class="{ active: showMobileMenu }" @click="closeMobileMenu"></div>
      </header>

      <!-- 导航内容区 -->
      <div class="content-area">
        <!-- 加载状态 -->
        <div v-if="loading" class="loading">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <!-- 错误状态 -->
        <div v-else-if="error" class="error">
          <p>{{ error }}</p>
          <button @click="fetchCategories" class="retry-btn">重试</button>
        </div>

        <!-- 分类内容 -->
        <div v-else class="categories-container">
          <section
            v-for="category in categories"
            :key="category.id"
            class="category-section"
            :id="`category-${category.id}`"
          >
            <!-- 🌟 SEO 优化：分类名使用 H2 -->
            <h2 class="category-title">
              <span class="category-icon">{{ category.icon }}</span>
              <span class="category-name">{{ category.name }}</span>
            </h2>

            <!-- 有子分类时：渲染子分类 -->
            <template v-if="category.subcategories">
              <div v-for="sub in category.subcategories" :key="sub.id" class="subcategory-section" :id="`category-${sub.id}`">
                <h3 class="subcategory-title">
                  <span class="subcategory-icon">{{ sub.icon }}</span>
                  <span class="subcategory-name">{{ sub.name }}</span>
                </h3>
                <div class="sites-grid">
                  <a
                    v-for="site in sub.sites"
                    :key="site.id"
                    :href="site.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="site-card"
                  >
                    <div class="site-icon">
                      <div v-if="site.icon && site.icon.includes('<svg')" v-html="site.icon" class="svg-icon-wrapper"></div>
                      <img v-else :src="site.icon || '/api/logo'" :alt="site.name" @error="handleImageError" />
                    </div>
                    <div class="site-info">
                      <h3 class="site-name">{{ site.name }}</h3>
                      <p class="site-description">{{ site.description }}</p>
                    </div>
                  </a>
                </div>
              </div>
            </template>

            <!-- 无子分类时：直接渲染站点 -->
            <template v-else>
              <div class="sites-grid">
                <a
                  v-for="site in category.sites"
                  :key="site.id"
                  :href="site.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="site-card"
                >
                  <div class="site-icon">
                    <div v-if="site.icon && site.icon.includes('<svg')" v-html="site.icon" class="svg-icon-wrapper"></div>
                    <img v-else :src="site.icon || '/api/logo'" :alt="site.name" @error="handleImageError" />
                  </div>
                  <div class="site-info">
                    <h3 class="site-name">{{ site.name }}</h3>
                    <p class="site-description">{{ site.description }}</p>
                  </div>
                </a>
              </div>
            </template>
          </section>
        </div>
      </div>
    </main>

    <!-- 回到顶部 -->
    <button v-show="showBackTop" class="back-to-top" @click="scrollToTop" title="回到顶部">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 15l-6-6-6 6"/>
      </svg>
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useNavigation } from '@/apis/useNavigation.js'
import { useThemeStore } from '@/stores/counter.js'
import googleLogo from '@/assets/goolge.png'
import baiduLogo from '@/assets/baidu.png'
import bingLogo from '@/assets/bing.png'
import duckLogo from '@/assets/duck.png'
import siteLogo from '@/assets/logo.jpg'

const { categories, title, defaultSearchEngine, loading, error, fetchCategories } = useNavigation()
const themeStore = useThemeStore()

const searchQuery = ref('')
const selectedEngine = ref('site')
const showMobileMenu = ref(false)

// 子分类展开状态
const expandedCategories = ref({})
const expandedMobileCategories = ref({})

const toggleSubcategory = (categoryId) => {
  expandedCategories.value[categoryId] = !expandedCategories.value[categoryId]
}

const toggleMobileSubcategory = (categoryId) => {
  expandedMobileCategories.value[categoryId] = !expandedMobileCategories.value[categoryId]
}

// 本站搜索相关
const siteSearchResults = ref([])
const isSearching = ref(false)

const isLocked = ref(false)
const isUnlocked = ref(false)
const unlockPassword = ref('')
const unlocking = ref(false)
const unlockError = ref('')

const searchEngines = {
  site: { url: '', icon: siteLogo, placeholder: '搜索本站资源...' },
  google: { url: 'https://www.google.com/search?q=', icon: googleLogo, placeholder: 'Google (点logo切换搜索引擎)' },
  baidu: { url: 'https://www.baidu.com/s?wd=', icon: baiduLogo, placeholder: '百度一下(点logo切换搜索引擎)' },
  bing: { url: 'https://www.bing.com/search?q=', icon: bingLogo, placeholder: 'Bing (点logo切换搜索引擎)' },
  duckduckgo: { url: 'https://duckduckgo.com/?q=', icon: duckLogo, placeholder: 'DuckDuckGo (点logo切换搜索引擎)' }
}

/**
 * 🌟 核心 SEO 动态注入逻辑
 * 会根据后台设置的标题和当前分类名自动更新网页元数据
 */
const refreshSEO = () => {
  const pageTitle = title.value || 'jingruan 导航';
  document.title = pageTitle;
  
  if (categories.value && categories.value.length > 0) {
    const catSummary = categories.value.slice(0, 5).map(c => c.name).join('、');
    const dynamicDesc = `${pageTitle}是一个高效、纯净的个人导航站。涵盖${catSummary}等资源分类，助你快速定位常用资源。`;
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', dynamicDesc);

    // 构建关键词列表，包含子分类名称
    const allNames = []
    for (const c of categories.value) {
      allNames.push(c.name)
      if (c.subcategories) {
        for (const sub of c.subcategories) {
          allNames.push(sub.name)
        }
      }
    }
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    const keywordsStr = `${pageTitle}, 网址导航, ${allNames.join(', ')}`;
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.name = 'keywords';
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', keywordsStr);
  }
}

// 🌟 监控数据变化：当标题或分类数据更新时，实时刷新 SEO 信息
watch([title, categories], () => refreshSEO(), { deep: true });

const smoothScrollTo = (container, targetTop, duration = 600) => {
  const startTop = container.scrollTop
  const distance = targetTop - startTop
  let startTime = null
  const animateScroll = (currentTime) => {
    if (startTime === null) startTime = currentTime
    const timeElapsed = currentTime - startTime
    const progress = Math.min(timeElapsed / duration, 1)
    const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2
    container.scrollTop = startTop + distance * ease
    if (progress < 1) requestAnimationFrame(animateScroll)
  }
  requestAnimationFrame(animateScroll)
}

const scrollToCategory = (categoryId) => {
  const element = document.getElementById(`category-${categoryId}`)
  const container = document.querySelector('.content-area')
  if (element && container) {
    const isMobile = window.innerWidth <= 768
    let targetTop = 0
    if (isMobile) {
      targetTop = element.offsetTop - 80
    } else {
      const searchHeader = document.querySelector('.search-header')
      targetTop = element.offsetTop - (searchHeader ? searchHeader.offsetHeight + 20 : 100)
    }
    smoothScrollTo(container, Math.max(0, targetTop), 600)
  }
}

const checkLockStatus = () => {
  const openLock = import.meta.env.VITE_OPEN_LOCK
  if (openLock && openLock.trim() !== '') {
    isLocked.value = true
    if (localStorage.getItem('nav_unlocked') === 'true') isUnlocked.value = true
  } else {
    isLocked.value = false; isUnlocked.value = true
  }
}

const handleUnlock = async () => {
  unlocking.value = true
  unlockError.value = ''
  try {
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD
    if (!adminPassword) throw new Error('访问密钥未配置')
    if (unlockPassword.value === adminPassword) {
      isUnlocked.value = true
      localStorage.setItem('nav_unlocked', 'true')
      unlockPassword.value = ''
    } else {
      throw new Error('访问密钥错误，请重新输入')
    }
  } catch (error) {
    unlockError.value = error.message
  } finally {
    unlocking.value = false
  }
}

// 本站搜索：实时过滤
const doSiteSearch = (query) => {
  if (!query.trim()) {
    siteSearchResults.value = []
    isSearching.value = false
    return
  }
  isSearching.value = true
  const q = query.trim().toLowerCase()
  const results = []
  for (const category of categories.value) {
    if (category.subcategories) {
      for (const sub of category.subcategories) {
        for (const site of sub.sites) {
          if (
            site.name.toLowerCase().includes(q) ||
            (site.description && site.description.toLowerCase().includes(q)) ||
            (site.url && site.url.toLowerCase().includes(q))
          ) {
            results.push({ ...site, categoryName: `${category.name} > ${sub.name}`, categoryIcon: sub.icon })
          }
        }
      }
    } else {
      for (const site of category.sites) {
        if (
          site.name.toLowerCase().includes(q) ||
          (site.description && site.description.toLowerCase().includes(q)) ||
          (site.url && site.url.toLowerCase().includes(q))
        ) {
          results.push({ ...site, categoryName: category.name, categoryIcon: category.icon })
        }
      }
    }
  }
  siteSearchResults.value = results
}

// 输入事件处理
const onSearchInput = () => {
  if (selectedEngine.value === 'site') {
    doSiteSearch(searchQuery.value)
  } else {
    siteSearchResults.value = []
    isSearching.value = false
  }
}

// 回车搜索
const handleSearch = () => {
  if (selectedEngine.value === 'site') {
    doSiteSearch(searchQuery.value)
  } else {
    if (!searchQuery.value.trim()) return
    siteSearchResults.value = []
    isSearching.value = false
    window.open(searchEngines[selectedEngine.value].url + encodeURIComponent(searchQuery.value), '_blank')
  }
}

// 清空搜索
const clearSearchResults = () => {
  searchQuery.value = ''
  siteSearchResults.value = []
  isSearching.value = false
}

// 点击外部关闭下拉
const onClickOutside = (e) => {
  const wrapper = document.querySelector('.search-container-wrapper')
  if (wrapper && !wrapper.contains(e.target)) {
    siteSearchResults.value = []
    isSearching.value = false
  }
}

// 回到顶部
const showBackTop = ref(false)
const scrollToTop = () => {
  const container = document.querySelector('.content-area')
  if (container) container.scrollTo({ top: 0, behavior: 'smooth' })
}
const onContentScroll = () => {
  const container = document.querySelector('.content-area')
  showBackTop.value = container ? container.scrollTop > 300 : false
}

const handleImageError = (event) => {
  event.target.src = '/api/logo'
  event.target.onerror = null
}

const toggleMobileMenu = () => {
  showMobileMenu.value = !showMobileMenu.value
  document.body.style.overflow = showMobileMenu.value ? 'hidden' : ''
}

const closeMobileMenu = () => {
  showMobileMenu.value = false
  document.body.style.overflow = ''
}

const scrollToCategoryMobile = (categoryId) => {
  closeMobileMenu()
  setTimeout(() => scrollToCategory(categoryId), 200)
}

onMounted(async () => {
  checkLockStatus()
  await fetchCategories()
  refreshSEO()
  if (defaultSearchEngine.value && defaultSearchEngine.value !== 'bing') {
    selectedEngine.value = defaultSearchEngine.value
  }
  document.addEventListener('click', onClickOutside)
  // 延迟绑定滚动监听，等待 DOM 渲染完成
  setTimeout(() => {
    const container = document.querySelector('.content-area')
    if (container) container.addEventListener('scroll', onContentScroll)
  }, 100)
})

onUnmounted(() => {
  document.body.style.overflow = ''
  document.removeEventListener('click', onClickOutside)
  const container = document.querySelector('.content-area')
  if (container) container.removeEventListener('scroll', onContentScroll)
})
</script>

<style scoped>
/* 锁定与基础布局 */
.lock-container { position: fixed; top: 0; left: 0; width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center; background: #2c3e50; padding: 20px; z-index: 9999; }
.lock-box { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1); width: 100%; max-width: 400px; text-align: center; }
.lock-box h1 { color: #2d3748; margin-bottom: 8px; font-size: 28px; font-weight: 600; }
.lock-description { color: #718096; margin-bottom: 30px; font-size: 16px; }
.lock-box .form-group { margin-bottom: 20px; text-align: left; }
.lock-box .form-group label { display: block; margin-bottom: 8px; color: #4a5568; font-weight: 500; font-size: 14px; }
.lock-box .form-input { width: 100%; padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 16px; transition: all 0.3s ease; background: #fff; }
.lock-box .form-input:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1); }
.unlock-btn { width: 100%; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; margin-top: 10px; }
.unlock-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3); }
.unlock-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.lock-box .error-message { margin-top: 15px; padding: 12px; background: #fed7d7; color: #c53030; border-radius: 8px; font-size: 14px; border: 1px solid #feb2b2; }

.nav-home { display: flex; min-height: 100vh; background-color: #f5f7fa; }

/* 侧边栏 */
.sidebar { width: 280px; background-color: #2c3e50; color: white; padding: 0; box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1); height: 100vh; overflow: hidden; flex-shrink: 0; }
.logo-section { display: flex; align-items: center; padding: 15px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
.logo { width: 50px; height: 50px; border-radius: 10px; margin-right: 15px; object-fit: cover; }
.site-title { font-size: 22px; font-weight: 600; margin: 0; color: white; }
.category-nav { padding: 20px 0; height: calc(100vh - 180px); overflow-y: auto; }
.nav-title { font-size: 16px; font-weight: 600; margin: 0 20px 15px; color: #bdc3c7; text-transform: uppercase; letter-spacing: 1px; }
.category-list { list-style: none; padding: 0; margin: 0; }
.category-item { display: flex; flex-direction: column; cursor: pointer; position: relative; }
.category-main { display: flex; align-items: center; padding: 12px 20px; transition: all 0.3s ease; }
.category-main:hover { background-color: rgba(255, 255, 255, 0.1); box-shadow: inset 4px 0 0 #3498db; }
.category-icon { font-size: 18px; margin-right: 12px; width: 20px; text-align: center; }
.category-name { font-size: 15px; font-weight: 500; }
.category-arrow { margin-left: auto; font-size: 10px; transition: transform 0.3s ease; color: #7f8c8d; }
.category-arrow.expanded { transform: rotate(90deg); }

/* 子分类列表 */
.subcategory-list { list-style: none; padding: 0; margin: 0; }
.subcategory-item { display: flex; align-items: center; padding: 10px 20px 10px 52px; cursor: pointer; transition: all 0.3s ease; font-size: 14px; }
.subcategory-item:hover { background-color: rgba(255, 255, 255, 0.08); }
.subcategory-icon { font-size: 16px; margin-right: 10px; width: 18px; text-align: center; }
.subcategory-name { font-size: 14px; color: #bdc3c7; }
.subcategory-item:hover .subcategory-name { color: white; }
.sidebar-footer { padding: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1); margin-top: auto; }
.github-link { display: flex; align-items: center; color: #bdc3c7; text-decoration: none; padding: 8px 12px; border-radius: 6px; transition: all 0.3s ease; font-size: 14px; }
.github-link:hover { background: rgba(255, 255, 255, 0.1); color: white; transform: translateY(-1px); }
.github-link svg { margin-right: 8px; transition: transform 0.3s ease; }
.github-link:hover svg { transform: scale(1.1); }

/* 主内容与搜索 */
.main-content { flex: 1; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
.search-header { background: white; padding: 20px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05); position: sticky; top: 0; z-index: 100; display: flex; align-items: center; gap: 15px; }
.search-container { display: flex; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); position: relative; }
.search-engine-selector { position: relative; display: flex; align-items: center; background: #f8f9fa; border-right: 1px solid #e9ecef; transition: background-color 0.2s ease; overflow: hidden; }
.search-engine-selector:hover { background: #e9ecef; }
.engine-logo { width: 24px; height: 24px; margin: 8px; object-fit: contain; pointer-events: none; border-radius: 4px; }
.engine-logo[alt="site"] { border-radius: 50%; }
.engine-select { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; border: none; outline: none; background: transparent; }
.search-input { flex: 1; border: none; padding: 12px 36px 12px 16px; font-size: 16px; outline: none; background: white; min-width: 0; }
.search-input::placeholder { color: #95a5a6; }

.mobile-menu-btn { display: none; background: none; border: none; color: #2c3e50; cursor: pointer; padding: 8px; border-radius: 4px; transition: background-color 0.2s ease; }
.mobile-menu-btn:hover { background: #f8f9fa; }
.mobile-menu { position: fixed; top: 0; right: -100%; width: 240px; height: 100vh; background: white; box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1); z-index: 1001; transition: right 0.3s ease; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; }
.mobile-menu.active { right: 0; }
.mobile-menu-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #e9ecef; background: #2c3e50; color: white; flex-shrink: 0; }
.header-left { display: flex; align-items: center; gap: 12px; }
.mobile-menu-header h3 { margin: 0; font-size: 18px; font-weight: 600; }
.close-btn { background: none; border: none; color: white; font-size: 24px; cursor: pointer; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 4px; }
.mobile-category-list { list-style: none; padding: 0; margin: 0; flex: 1; overflow-y: auto; padding-bottom: 160px; }
.mobile-category-item { display: flex; flex-direction: column; cursor: pointer; border-bottom: 1px solid #f8f9fa; }
.mobile-category-main { display: flex; align-items: center; padding: 16px 20px; }
.mobile-category-main .category-icon { font-size: 20px; margin-right: 12px; width: 24px; text-align: center; }
.mobile-category-main .category-name { font-size: 16px; font-weight: 500; color: #2c3e50; }
.mobile-category-main .category-arrow { margin-left: auto; font-size: 10px; transition: transform 0.3s ease; color: #7f8c8d; }
.mobile-category-main .category-arrow.expanded { transform: rotate(90deg); }

/* 移动端子分类 */
.mobile-subcategory-list { list-style: none; padding: 0; margin: 0; }
.mobile-subcategory-item { display: flex; align-items: center; padding: 12px 20px 12px 56px; cursor: pointer; border-bottom: 1px solid #f8f9fa; }
.mobile-subcategory-item .subcategory-icon { font-size: 18px; margin-right: 10px; width: 20px; text-align: center; }
.mobile-subcategory-item .subcategory-name { font-size: 15px; color: #2c3e50; }
.mobile-menu-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); z-index: 999; opacity: 0; visibility: hidden; transition: opacity 0.3s ease, visibility 0.3s ease; }
.mobile-menu-overlay.active { opacity: 1; visibility: visible; }

/* 内容容器与网格 */
.content-area { flex: 1; padding: 30px; padding-bottom: 400px; overflow-y: auto; }
.loading, .error { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; color: #7f8c8d; }
.loading-spinner { width: 40px; height: 40px; border: 4px solid #ecf0f1; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.retry-btn { margin-top: 10px; padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; }

.categories-container { max-width: 1200px; margin: 0 auto; }
.category-section { margin-bottom: 50px; }
.category-title { font-size: 32px; font-weight: 800; margin-bottom: 25px; color: #000000; display: flex; align-items: center; }
.category-title .category-icon { font-size: 32px; margin-right: 16px; }
.category-title .category-name { margin-left: 10px; font-size: 26px; }

/* 子分类标题 */
.subcategory-section { margin-bottom: 40px; }
.subcategory-title { font-size: 22px; font-weight: 800; margin-bottom: 20px; color: #000000; display: flex; align-items: center; }
.subcategory-title .subcategory-icon { font-size: 22px; margin-right: 12px; }
.subcategory-title .subcategory-name { font-size: 20px; color: #2c3e50; }

/* 🌟 PC端卡片网格 */
.sites-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }

/* 🌟 PC端卡片高度：锁定 90px */
.site-card {
  display: flex !important;
  align-items: stretch !important;
  background: white !important;
  border-radius: 12px;
  padding: 0 !important;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s ease;
  border: 1px solid #e9ecef;
  position: relative;
  overflow: hidden;
  height: 90px !important;
}

/* 找回鼠标悬浮光晕效果 */
.site-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(52, 152, 219, 0.1), rgba(155, 89, 182, 0.1));
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 0; 
}

.site-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15); }
.site-card:hover::before { opacity: 1; }

.site-icon, .site-info { position: relative; z-index: 1; }

/* 图标容器：PC端 90px */
.site-icon {
  height: 100% !important; 
  aspect-ratio: 1 / 1 !important; 
  flex-shrink: 0;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.site-icon img, .site-icon :deep(svg) { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block; }

/* 🌟 信息区域：顶部对齐 */
.site-info {
  flex: 1;
  min-width: 0;
  padding: 10px 14px 4px 14px !important; 
  display: flex;
  flex-direction: column;
  justify-content: flex-start; 
}

.site-name { 
  font-size: 15px !important; 
  font-weight: 600; 
  margin: 0 0 5px 0 !important; 
  color: #2c3e50; 
  line-height: 1.2; 
  overflow: hidden; 
  text-overflow: ellipsis; 
  white-space: nowrap; 
}

/* 站点介绍：调大字号为 12px */
.site-description {
  font-size: 12px !important;
  color: #7f8c8d;
  margin: 0;
  line-height: 1.4;
  white-space: normal !important;
  display: -webkit-box !important;
  -webkit-line-clamp: 3 !important;
  -webkit-box-orient: vertical !important;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 🌟 手机端适配 */
@media (max-width: 768px) {
  .sidebar { display: none; }
  .main-content { margin-left: 0; height: 100vh; height: 100svh; overflow: hidden; }
  .search-header { padding: 12px 15px; position: fixed; top: 0; left: 0; right: 0; z-index: 500; background: white; gap: 0px; }
  .content-area { padding: 15px 12px; padding-top: 85px; padding-bottom: 200px; }
  .mobile-menu-btn { display: block; }

  .sites-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
  .site-card { height: 60px !important; border-radius: 8px; }
  
  .site-card .site-info { padding: 6px 10px !important; justify-content: flex-start; }
  
  .site-card .site-name { 
    font-size: 13px !important; 
    margin-bottom: 3px !important; 
  }
  
  /* 🌟 核心修正：显示行数恢复为 2 行，字号 11px */
  .site-card .site-description {
    font-size: 11px !important;
    -webkit-line-clamp: 2 !important;
  }

  .category-title { font-size: 20px; margin-bottom: 12px; }

  .search-dropdown { max-height: 50vh; }
}

.theme-toggle-btn { background: none; border: none; color: #2c3e50; cursor: pointer; padding: 8px; border-radius: 6px; display: flex; align-items: center; justify-content: center; margin-right: 10px; }
.theme-toggle-btn:hover { background: #f8f9fa; transform: scale(1.1); }

/* 本站搜索下拉 */
.search-container-wrapper {
  position: relative;
  flex: 1;
  max-width: 600px;
  margin: 0 auto;
}
.search-clear-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 14px;
  color: #95a5a6;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  line-height: 1;
  transition: all 0.2s ease;
}
.search-clear-btn:hover {
  color: #e74c3c;
  background: #f8f9fa;
}
.search-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: white;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  max-height: 400px;
  overflow-y: auto;
}
.dropdown-no-results {
  padding: 20px;
  text-align: center;
  color: #95a5a6;
  font-size: 14px;
}
.dropdown-results-list {
  padding: 6px;
}
.dropdown-result-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: background 0.15s ease;
}
.dropdown-result-item:hover {
  background: #f0f4f8;
}
.dropdown-result-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}
.dropdown-result-icon img,
.dropdown-result-icon :deep(svg) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.dropdown-result-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.dropdown-result-name {
  font-size: 14px;
  color: #2c3e50;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}
.dropdown-result-meta {
  font-size: 12px;
  color: #95a5a6;
  white-space: nowrap;
  flex-shrink: 0;
}

.dark .nav-home, .dark .content-area { background-color: #1a1a1a; }
.dark .sidebar, .dark .search-header, .dark .mobile-menu { background-color: #1e293b; color: #e2e8f0; }
.dark .search-dropdown { background: #1e293b; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4); }
.dark .dropdown-no-results { color: #6b7280; }
.dark .dropdown-result-item:hover { background: #334155; }
.dark .dropdown-result-name { color: #e2e8f0; }
.dark .dropdown-result-meta { color: #6b7280; }
.dark .search-clear-btn { color: #6b7280; }
.dark .search-clear-btn:hover { color: #f87171; background: #334155; }
.dark .theme-toggle-btn, .dark .mobile-menu-btn { color: #e2e8f0; }
.dark .site-card { background: #374151 !important; border: 1px solid #4b5563; color: #e2e8f0; }
.dark .site-card::before { background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15)); }
.dark .site-name { color: #e2e8f0; }
.dark .site-description { color: #9ca3af; }
.dark .category-title { color: #e2e8f0; }
.dark .subcategory-title { color: #e2e8f0; }
.dark .subcategory-item:hover { background-color: rgba(255, 255, 255, 0.08); }
.dark .subcategory-item .subcategory-name { color: #94a3b8; }
.dark .subcategory-item:hover .subcategory-name { color: #e2e8f0; }
.dark .mobile-category-main .category-name { color: #e2e8f0; }
.dark .mobile-subcategory-item .subcategory-name { color: #cbd5e1; }
.dark .category-arrow { color: #64748b; }
.dark .mobile-category-main .category-arrow { color: #64748b; }
.dark .lock-container { background: #0f172a; }
.dark .lock-box { background: #1e293b; color: #e2e8f0; }
.dark .lock-box .form-input { background: #374151; border: 2px solid #4b5563; color: #e2e8f0; }

/* 回到顶部 */
.back-to-top {
  position: fixed;
  right: 30px;
  bottom: 40px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: white;
  border: 1px solid #e9ecef;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  color: #2c3e50;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  z-index: 50;
}
.back-to-top:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  background: #3498db;
  color: white;
}
.dark .back-to-top {
  background: #1e293b;
  border-color: #4b5563;
  color: #e2e8f0;
}
.dark .back-to-top:hover {
  background: #3b82f6;
  color: white;
}
</style>
