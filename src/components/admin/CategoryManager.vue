<template>
  <div class="category-manager">
    <!-- 管理头部 -->
    <div class="manager-header">
      <h2>💻 前台管理</h2>
      <div class="header-actions">
        <button @click="openAddModal" class="add-btn">➕ 添加分类</button>
        <button @click="handleSave" :disabled="loading" class="save-btn">
          {{ loading ? '保存中...' : '💾 保存' }}
        </button>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-bar">
       <div class="stat-info">
        💡 提示：v2.5.10 已支持站点在分类间拖拽迁移，点击站点图标可直接编辑。
      </div>
    </div>

    <!-- 分类列表主体 -->
    <div class="category-list">
      <draggable 
        v-model="localCategories" 
        item-key="id" 
        handle=".drag-handle"
        animation="200"
        @end="syncToParent"
        class="category-draggable-area"
      >
        <template #item="{ element: category, index }">
          <div class="category-item-card">
            <!-- 左侧拖拽手柄 -->
            <div class="drag-handle" title="按住拖动排序">⋮⋮</div>

            <div class="category-main-content">
              <!-- 顶层分类头部行 -->
              <div class="category-header-row">
                <div class="category-info">
                  <span class="category-icon-display">{{ category.icon }}</span>
                  <div class="category-text">
                    <h3 class="category-name">{{ category.name }}</h3>
                    <p class="category-meta" v-if="category.subcategories">
                      {{ category.subcategories.length }} 个子分类 · {{ countSites(category) }} 个站点
                    </p>
                    <p class="category-meta" v-else>{{ category.sites?.length || 0 }} 个站点 (拖拽可排序/跨分类移动)</p>
                  </div>
                </div>

                <div class="action-buttons">
                  <button @click="moveUp(index)" :disabled="index === 0" class="arrow-btn" title="上移">⬆️</button>
                  <button @click="moveDown(index)" :disabled="index === localCategories.length - 1" class="arrow-btn" title="下移">⬇️</button>
                  <button @click="openAddSubcategoryModal(category)" class="add-site-btn" title="添加子分类">➕ 加子分类</button>
                  <button v-if="!category.subcategories" @click="openAddSiteModal(category, null)" class="add-site-btn" title="添加站点">➕ 加站点</button>
                  <button @click="editCategory(category)" class="edit-btn">✏️ 编辑</button>
                  <button @click="deleteCategory(category)" class="delete-btn">🗑️ 删除</button>
                </div>
              </div>

              <!-- 有子分类：渲染子分类区块 -->
              <template v-if="category.subcategories">
                <div
                  v-for="(sub, subIndex) in category.subcategories"
                  :key="sub.id"
                  class="subcategory-block"
                >
                  <div class="subcategory-header-row">
                    <div class="subcategory-info">
                      <span class="subcategory-icon-display">{{ sub.icon }}</span>
                      <span class="subcategory-name">{{ sub.name }}</span>
                      <span class="subcategory-meta">{{ sub.sites?.length || 0 }} 个站点</span>
                    </div>
                    <div class="action-buttons">
                      <button @click="moveSubcategory(category, subIndex, -1)" :disabled="subIndex === 0" class="arrow-btn" title="上移">⬆️</button>
                      <button @click="moveSubcategory(category, subIndex, 1)" :disabled="subIndex === category.subcategories.length - 1" class="arrow-btn" title="下移">⬇️</button>
                      <button @click="openAddSiteModal(category, sub)" class="add-site-btn">➕ 加站点</button>
                      <button @click="editSubcategory(category, sub)" class="edit-btn">✏️</button>
                      <button @click="deleteSubcategory(category, sub)" class="delete-btn">🗑️</button>
                    </div>
                  </div>

                  <!-- 子分类站点预览 -->
                  <draggable 
                    v-model="sub.sites" 
                    group="sites" 
                    item-key="id"
                    animation="200"
                    @end="syncToParent"
                    class="category-sites-preview"
                    ghost-class="site-ghost"
                  >
                    <template #item="{ element: site }">
                      <div class="mini-site-card-wrapper">
                        <a class="site-card admin-site-card" @click.stop.prevent="openEditSiteModal(category, sub, site)">
                          <div class="site-icon">
                            <div v-if="site.icon && site.icon.includes('<svg')" v-html="site.icon" class="svg-icon-wrapper"></div>
                            <img v-else :src="site.icon || '/logo.png'" :alt="site.name" @error="handleImageError">
                          </div>
                          <div class="site-info">
                            <h3 class="site-name">{{ site.name }}</h3>
                            <p class="site-description">{{ site.description }}</p>
                          </div>
                        </a>
                        <button class="site-delete-badge" @click.stop="deleteSite(category, sub, site.id)" title="删除"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg></button>
                        <button class="site-copy-badge" title="复制此卡片" @click.stop="duplicateSite(category, sub, site)"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg></button>
                      </div>
                    </template>
                  </draggable>
                  <div v-if="!sub.sites || sub.sites.length === 0" class="empty-category-hint">此子分类下暂无站点，可从其他分类拖入</div>
                </div>
              </template>

              <!-- 无子分类：直接渲染站点 -->
              <template v-else>
                <draggable 
                  v-model="category.sites" 
                  group="sites" 
                  item-key="id"
                  animation="200"
                  @end="syncToParent"
                  class="category-sites-preview"
                  ghost-class="site-ghost"
                >
                  <template #item="{ element: site }">
                    <div class="mini-site-card-wrapper">
                      <a class="site-card admin-site-card" @click.stop.prevent="openEditSiteModal(category, null, site)">
                        <div class="site-icon">
                          <div v-if="site.icon && site.icon.includes('<svg')" v-html="site.icon" class="svg-icon-wrapper"></div>
                          <img v-else :src="site.icon || '/logo.png'" :alt="site.name" @error="handleImageError">
                        </div>
                        <div class="site-info">
                          <h3 class="site-name">{{ site.name }}</h3>
                          <p class="site-description">{{ site.description }}</p>
                        </div>
                      </a>
                      <button class="site-delete-badge" @click.stop="deleteSite(category, null, site.id)" title="删除"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg></button>
                      <button class="site-copy-badge" title="复制此卡片" @click.stop="duplicateSite(category, null, site)"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg></button>
                    </div>
                  </template>
                </draggable>
                <div v-if="!category.sites || category.sites.length === 0" class="empty-category-hint">此分类下暂无站点，可从其他分类拖入</div>
              </template>
            </div>

          </div>
        </template>
      </draggable>
    </div>

    <!-- 添加/编辑分类弹窗 -->
    <div v-if="showAddModal || editingCategory" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingCategory ? '编辑分类' : '添加分类' }}</h3>
          <button @click="closeModal" class="close-btn">✕</button>
        </div>
        <form @submit.prevent="saveCategory" class="category-form">
          <div class="form-group">
            <label>分类名称 *:</label>
            <input v-model="formData.name" required placeholder="例如：常用工具" class="form-input">
          </div>
          <div class="form-group">
            <label>分类图标 * (输入或点击下方图标):</label>
            <div class="icon-input-wrapper">
              <input v-model="formData.icon" required placeholder="粘贴 Emoji 或点击下方" class="form-input icon-input">
              <span class="icon-preview-box">{{ formData.icon }}</span>
            </div>
            
            <!-- 智能 Emoji 推荐（根据分类名称自动匹配） -->
            <div class="emoji-selector-panel" v-if="recommendedEmojis.length">
              <span 
                v-for="emoji in recommendedEmojis" 
                :key="emoji" 
                class="emoji-option"
                @click="formData.icon = emoji"
                :class="{ active: formData.icon === emoji }"
              >
                {{ emoji }}
              </span>
            </div>
            <p v-else class="emoji-hint">输入分类名称后，将自动推荐相关图标</p>
          </div>
          <div class="form-actions">
            <button type="button" @click="closeModal" class="cancel-btn">取消</button>
            <button type="submit" class="submit-btn">{{ editingCategory ? '更新分类' : '立即添加' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 🌟 站点编辑/添加弹窗 (UI 复用分类 Modal) -->
    <div v-if="showSiteModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ isAddingSite ? '添加站点' : '编辑站点' }}</h3>
          <button @click="closeSiteModal" class="close-btn">✕</button>
        </div>
        <form @submit.prevent="saveSite" novalidate class="category-form">
          <div class="form-group">
            <label>目标位置:</label>
            <div class="category-lock-display">{{ activeCategory?.name }}<template v-if="activeSubcategory"> > {{ activeSubcategory.name }}</template></div>
          </div>
          <div class="form-group">
            <label>站点名称 *:</label>
            <input v-model="siteFormData.name" placeholder="留空将自动从网页获取" class="form-input">
          </div>
          <div class="form-group">
            <label>链接 URL *:</label>
            <input
              v-model="siteFormData.url"
              placeholder="https://..."
              class="form-input"
              @blur="onSiteUrlBlur"
            >
            <p v-if="isFetchingSite" class="fetch-hint">正在自动获取站点信息...</p>
          </div>
          <div class="form-group">
            <label>站点图标 (URL或SVG):</label>
            <textarea v-model="siteFormData.icon" placeholder="图标链接或 <svg>..." class="form-input text-area"></textarea>
          </div>
          <div class="form-group">
            <label>描述:</label>
            <input v-model="siteFormData.description" placeholder="简单介绍" class="form-input">
          </div>
          <div class="form-actions">
            <button type="button" @click="closeSiteModal" class="cancel-btn">取消</button>
            <button type="submit" class="submit-btn" :disabled="isFetchingSite">
              {{ isFetchingSite ? '获取信息中...' : '确定保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 🌟 子分类添加/编辑弹窗 -->
    <div v-if="showSubcategoryModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingSubcategory ? '编辑子分类' : '添加子分类' }}</h3>
          <button @click="closeSubcategoryModal" class="close-btn">✕</button>
        </div>
        <form @submit.prevent="saveSubcategory" class="category-form">
          <div class="form-group">
            <label>所属分类:</label>
            <div class="category-lock-display">{{ activeCategory?.name }}</div>
          </div>
          <div class="form-group">
            <label>子分类名称 *:</label>
            <input v-model="subcategoryFormData.name" required placeholder="例如：音乐 APP" class="form-input">
          </div>
          <div class="form-group">
            <label>子分类图标 *:</label>
            <div class="icon-input-wrapper">
              <input v-model="subcategoryFormData.icon" required placeholder="输入或点击下方" class="form-input icon-input">
              <span class="icon-preview-box">{{ subcategoryFormData.icon }}</span>
            </div>
            <div class="emoji-selector-panel" v-if="subRecommendedEmojis.length">
              <span 
                v-for="emoji in subRecommendedEmojis" 
                :key="emoji" 
                class="emoji-option"
                @click="subcategoryFormData.icon = emoji"
                :class="{ active: subcategoryFormData.icon === emoji }"
              >
                {{ emoji }}
              </span>
            </div>
            <p v-else class="emoji-hint">输入子分类名称后，将自动推荐相关图标</p>
          </div>
          <div class="form-actions">
            <button type="button" @click="closeSubcategoryModal" class="cancel-btn">取消</button>
            <button type="submit" class="submit-btn">{{ editingSubcategory ? '更新子分类' : '添加子分类' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import draggable from 'vuedraggable'
import { fetchSiteMetadata, needsMetadataFetch, applySiteMetadata } from '@/apis/fetchSiteMetadata'

const props = defineProps({
  categories: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['update', 'save'])
const localCategories = ref([])
const showAddModal = ref(false)
const editingCategory = ref(null)
const formData = ref({ name: '', icon: '' })

// 🌟 站点管理状态
const showSiteModal = ref(false)
const isAddingSite = ref(false)
const activeCategory = ref(null)
const activeSubcategory = ref(null)
const editingSite = ref(null)
const siteFormData = ref({ name: '', url: '', description: '', icon: '' })
const isFetchingSite = ref(false)

// 🌟 子分类管理状态
const showSubcategoryModal = ref(false)
const editingSubcategory = ref(null)
const subcategoryFormData = ref({ name: '', icon: '' })

// 🌟 智能 Emoji：关键词 → 相关 Emoji 映射表
const emojiKeywordMap = [
  { keywords: ['音乐', '电台', '听歌', '歌', '音频', '无损', 'audio', 'music'], emojis: ['🎵', '🎧', '🎶', '🎤', '🎼', '📻'] },
  { keywords: ['视频', '影视', '电影', '电视剧', '爱奇艺', '优酷', '哔哩', 'bilibili', 'b站', '抖音', '快手', 'video', 'watch'], emojis: ['🎬', '📺', '🎥', '📽️', '🎞️', '🍿'] },
  { keywords: ['工具', '工具箱', 'utils', 'tool', '在线工具'], emojis: ['🛠️', '🔧', '⚙️', '🔨', '🗜️', '🪛'] },
  { keywords: ['编程', '代码', '开发', 'github', 'git', '程序员', 'code', 'developer'], emojis: ['💻', '⌨️', '🖥️', '🧑‍💻', '👨‍💻', '🤖'] },
  { keywords: ['游戏', 'steam', '游戏平台', 'game', 'play'], emojis: ['🎮', '🕹️', '🎯', '👾', '♟️', '🎲'] },
  { keywords: ['图书', '书', '阅读', '小说', '漫画', 'book', 'read'], emojis: ['📚', '📖', '📕', '📖', '🗞️', '📓'] },
  { keywords: ['教育', '学习', '课程', '考研', '网课', '大学', 'study', 'learn'], emojis: ['🎓', '📚', '✏️', '📝', '🧠', '🏫'] },
  { keywords: ['设计', '图片', 'ps', 'photoshop', '剪辑', '设计工具', 'design'], emojis: ['🎨', '🖌️', '🎨', '✂️', '🖼️', '🎭'] },
  { keywords: ['搜索', '搜索引擎', '搜索工具', 'search', 'google', '百度', 'bing'], emojis: ['🔍', '🔎', '🌐', '🗺️', '🧭', '✨'] },
  { keywords: ['邮箱', '邮件', '邮箱工具', 'email', 'mail'], emojis: ['📧', '✉️', '📮', '📩', '📨', '💌'] },
  { keywords: ['社媒', '社交', '微博', '微信', 'qq', '博客', '论坛', 'social', 'weibo', 'facebook', 'twitter'], emojis: ['💬', '📱', '💌', '👥', '🗨️', '💭'] },
  { keywords: ['下载', '下载工具', '网盘', '云盘', 'download', 'pan'], emojis: ['⬇️', '📥', '☁️', '🗂️', '📂', '💾'] },
  { keywords: ['云', '网盘', '云盘', '云服务', 'cloud', 'nas', 'oss'], emojis: ['☁️', '🛰️', '🗄️', '📡', '🌩️', '💽'] },
  { keywords: ['新闻', '资讯', '科技', '科技新闻', 'news', 'tech'], emojis: ['📰', '🗞️', '📡', '⚡', '🆕', '📢'] },
  { keywords: ['购物', '电商', '淘宝', '京东', '拼多多', '商城', 'shop', 'buy'], emojis: ['🛒', '🛍️', '💰', '💳', '📦', '🎁'] },
  { keywords: ['金融', '理财', '股票', '基金', '银行', '投资', 'finance', 'money'], emojis: ['💰', '💹', '📈', '🏦', '💵', '📊'] },
  { keywords: ['健身', '运动', '体育', '跑步', '健康', 'fitness', 'sport'], emojis: ['💪', '🏃', '⚽', '🏀', '🎽', '🩹'] },
  { keywords: ['美食', '菜谱', '做饭', '餐厅', 'food', 'cook'], emojis: ['🍔', '🍜', '🍕', '🥗', '🍰', '☕'] },
  { keywords: ['旅行', '旅游', '酒店', '机票', '地图', 'travel', 'map'], emojis: ['✈️', '🧳', '🗺️', '🌍', '🗼', '🏝️'] },
  { keywords: ['天气', '时钟', '日历', '生活', '生活工具', 'weather', 'time', 'calendar'], emojis: ['⛅', '🌤️', '🕐', '📅', '☀️', '🌧️'] },
  { keywords: ['翻译', '词典', '英语', '语言', 'translate'], emojis: ['🌐', '🔤', '🗣️', '📖', '🈯', '✨'] },
  { keywords: ['加密', '安全', '密码', '密钥', '登录', 'security', 'password'], emojis: ['🔐', '🔒', '🔑', '🛡️', '🔓', '🕵️'] },
  { keywords: ['人工智能', 'ai', 'gpt', 'chatgpt', '模型', '智能', '大模型'], emojis: ['🤖', '🧠', '⚡', '🌐', '✨', '🪄'] },
  { keywords: ['浏览器', 'chrome', 'edge', 'firefox', '插件', '扩展', 'browser'], emojis: ['🌐', '🧩', '🧭', '🔖', '🕸️', '🔗'] },
  { keywords: ['系统', 'windows', 'mac', 'linux', 'os', '软件', '软件下载'], emojis: ['🖥️', '💿', '🪟', '🍎', '🐧', '⚙️'] },
  { keywords: ['壁纸', '美化', '主题', '个性化', '美化工具'], emojis: ['🖼️', '🎨', '🌈', '✨', '🖌️', '🌠'] },
  { keywords: ['统计', '数据', '分析', '图表', 'data', 'analysis'], emojis: ['📊', '📈', '🧮', '📉', '🗂️', '🔢'] },
]

// 根据名称推荐相关 Emoji（返回去重后的前 N 个）
const matchRecommendedEmojis = (name) => {
  const text = (name || '').toLowerCase().trim()
  if (!text) return []
  let best = []
  let bestScore = 0
  for (const rule of emojiKeywordMap) {
    const hits = rule.keywords.filter(k => text.includes(k.toLowerCase())).length
    if (hits === 0) continue
    if (hits > bestScore) {
      bestScore = hits
      best = rule.emojis
    }
  }
  return best.slice(0, 6)
}

const recommendedEmojis = computed(() => matchRecommendedEmojis(formData.value.name))
const subRecommendedEmojis = computed(() => matchRecommendedEmojis(subcategoryFormData.value.name))

// 同步父组件传入的分类数据
watch(() => props.categories, (val) => {
  localCategories.value = JSON.parse(JSON.stringify(val))
}, { immediate: true, deep: true })

const syncToParent = () => emit('update', localCategories.value)

// 辅助逻辑：识别 SVG 代码
const isSvg = (icon) => icon && icon.trim().toLowerCase().startsWith('<svg')

// 统计分类（含子分类）下的总站点数
const countSites = (category) => {
  if (category.subcategories) {
    return category.subcategories.reduce((sum, sub) => sum + (sub.sites?.length || 0), 0)
  }
  return category.sites?.length || 0
}

// 辅助逻辑：确保图标有值
const ensureIcon = (icon) => {
  if (!icon || icon.trim() === '') return '/logo.png'
  return icon
}

// 核心逻辑：防止预览图加载失败导致的闪烁死循环
const handleImageError = (e) => { 
  if (e.target.dataset.tried === 'true') {
    e.target.style.display = 'none';
    e.target.parentNode.style.backgroundColor = '#f0f2f5';
    return;
  }
  e.target.dataset.tried = 'true';
  e.target.src = '/logo.png'; 
}

const editCategory = (category) => {
  editingCategory.value = category
  formData.value = { ...category }
  showAddModal.value = true
}

const deleteCategory = (category) => {
  const detail = category.subcategories
    ? `其下 ${category.subcategories.length} 个子分类`
    : `其下 ${category.sites?.length || 0} 个站点`
  if (!confirm(`确定要彻底删除分类 "${category.name}" 吗？${detail}也将一并移除！`)) return
  localCategories.value = localCategories.value.filter(c => c.id !== category.id)
  syncToParent()
}

const saveCategory = () => {
  if (editingCategory.value) {
    const target = localCategories.value.find(c => c.id === editingCategory.value.id)
    if (target) {
      target.name = formData.value.name
      target.icon = formData.value.icon
    }
  } else {
    localCategories.value.push({ 
      id: `cat-${Date.now()}`, 
      name: formData.value.name, 
      icon: formData.value.icon, 
      sites: [] 
    })
  }
  syncToParent()
  closeModal()
}

const openAddModal = () => { showAddModal.value = true; formData.value = { name: '', icon: '📁' }; }
const closeModal = () => { showAddModal.value = false; editingCategory.value = null; }

const moveUp = (idx) => { 
  if (idx > 0) { 
    const i = localCategories.value.splice(idx, 1)[0]; 
    localCategories.value.splice(idx - 1, 0, i); 
    syncToParent(); 
  } 
}
const moveDown = (idx) => { 
  if (idx < localCategories.value.length - 1) { 
    const i = localCategories.value.splice(idx, 1)[0]; 
    localCategories.value.splice(idx + 1, 0, i); 
    syncToParent(); 
  } 
}

// 🌟 站点操作逻辑
const openAddSiteModal = (category, subcategory = null) => {
  activeCategory.value = category
  activeSubcategory.value = subcategory
  isAddingSite.value = true
  siteFormData.value = { name: '', url: '', description: '', icon: '' }
  showSiteModal.value = true
}

const openEditSiteModal = (category, subcategory, site) => {
  activeCategory.value = category
  activeSubcategory.value = subcategory
  editingSite.value = site
  isAddingSite.value = false
  siteFormData.value = { ...site }
  showSiteModal.value = true
}

const closeSiteModal = () => { showSiteModal.value = false; editingSite.value = null; activeCategory.value = null; activeSubcategory.value = null; }

const fillEmptySiteMetadata = async () => {
  if (!needsMetadataFetch(siteFormData.value)) return true

  isFetchingSite.value = true
  try {
    const metadata = await fetchSiteMetadata(siteFormData.value.url, siteFormData.value)
    applySiteMetadata(siteFormData.value, metadata)
    return true
  } catch (error) {
    console.error('获取站点信息失败:', error)
    return false
  } finally {
    isFetchingSite.value = false
  }
}

const onSiteUrlBlur = async () => {
  if (needsMetadataFetch(siteFormData.value)) {
    await fillEmptySiteMetadata()
  }
}

const saveSite = async () => {
  if (!siteFormData.value.url?.trim()) {
    alert('请填写站点链接')
    return
  }

  if (needsMetadataFetch(siteFormData.value)) {
    const ok = await fillEmptySiteMetadata()
    if (!ok && (!siteFormData.value.name?.trim() || !siteFormData.value.description?.trim())) {
      alert('自动获取站点信息失败，请手动填写名称和描述，或稍后再试。')
    }
  }

  if (!siteFormData.value.name?.trim()) {
    alert('站点名称不能为空，请手动填写或检查 URL 是否可访问')
    return
  }

  const targetSites = activeSubcategory.value ? activeSubcategory.value.sites : activeCategory.value.sites
  if (isAddingSite.value) {
    targetSites.push({ id: `site-${Date.now()}`, ...siteFormData.value })
  } else {
    const idx = targetSites.findIndex(s => s.id === editingSite.value.id)
    if (idx !== -1) targetSites[idx] = { ...editingSite.value, ...siteFormData.value }
  }
  syncToParent(); closeSiteModal();
}

const deleteSite = (category, subcategory, siteId) => {
  if (!confirm('确定移除该站点吗？')) return
  const targetSites = subcategory ? subcategory.sites : category.sites
  targetSites.splice(targetSites.findIndex(s => s.id === siteId), 1)
  syncToParent()
}

// 🌟 复制站点逻辑：原地复制，插入到当前卡片后面
const duplicateSite = (category, subcategory, site) => {
  const targetSites = subcategory ? subcategory.sites : category.sites
  const idx = targetSites.indexOf(site)
  const newSite = { ...site, id: `site-${Date.now()}` }
  targetSites.splice(idx + 1, 0, newSite)
  syncToParent()
}

// 🌟 子分类操作逻辑
const openAddSubcategoryModal = (category) => {
  activeCategory.value = category
  editingSubcategory.value = null
  subcategoryFormData.value = { name: '', icon: '📁' }
  showSubcategoryModal.value = true
}

const editSubcategory = (category, subcategory) => {
  activeCategory.value = category
  editingSubcategory.value = subcategory
  subcategoryFormData.value = { name: subcategory.name, icon: subcategory.icon }
  showSubcategoryModal.value = true
}

const closeSubcategoryModal = () => {
  showSubcategoryModal.value = false
  editingSubcategory.value = null
  activeCategory.value = null
}

const saveSubcategory = () => {
  if (!subcategoryFormData.value.name?.trim()) {
    alert('子分类名称不能为空')
    return
  }
  if (editingSubcategory.value) {
    editingSubcategory.value.name = subcategoryFormData.value.name
    editingSubcategory.value.icon = subcategoryFormData.value.icon
  } else {
    const hadSites = !activeCategory.value.subcategories && (activeCategory.value.sites?.length || 0) > 0
    if (!activeCategory.value.subcategories) activeCategory.value.subcategories = []
    const newSub = {
      id: `sub-${Date.now()}`,
      name: subcategoryFormData.value.name,
      icon: subcategoryFormData.value.icon,
      sites: []
    }
    // 若分类原本只有直接站点（无子分类），将原有站点移入新建子分类，避免丢失
    if (hadSites) {
      newSub.sites = activeCategory.value.sites
      activeCategory.value.sites = []
    }
    activeCategory.value.subcategories.push(newSub)
  }
  syncToParent()
  closeSubcategoryModal()
}

const deleteSubcategory = (category, subcategory) => {
  const siteCount = subcategory.sites?.length || 0
  const msg = siteCount > 0
    ? `确定删除子分类 "${subcategory.name}" 吗？其下 ${siteCount} 个站点也将一并移除！`
    : `确定删除子分类 "${subcategory.name}" 吗？`
  if (!confirm(msg)) return
  category.subcategories.splice(category.subcategories.indexOf(subcategory), 1)
  syncToParent()
}

const moveSubcategory = (category, subIndex, direction) => {
  const newIndex = subIndex + direction
  if (newIndex < 0 || newIndex >= category.subcategories.length) return
  const item = category.subcategories.splice(subIndex, 1)[0]
  category.subcategories.splice(newIndex, 0, item)
  syncToParent()
}

const handleSave = () => emit('save')
</script>

<style scoped>
.category-manager { padding: 10px 0; }
.manager-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.manager-header h2 { color: black; }
.header-actions { display: flex; gap: 10px; }

.add-btn { 
  background: #27ae60; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; 
  font-weight: 500; transition: background 0.2s; white-space: nowrap; flex-shrink: 0;
}
.add-btn:hover { background: #219150; }
.save-btn { 
  background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; 
  font-weight: 500; white-space: nowrap; flex-shrink: 0;
}
.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.stats-bar { margin-bottom: 20px; padding: 12px 16px; background: #f8fafc; border: 1px solid #edf2f7; border-radius: 10px; font-size: 13px; color: #64748b; }

.category-item-card { position: relative; display: flex; align-items: flex-start; background: white; border-radius: 14px; border: 1px solid #e2e8f0; padding: 12px 4px; margin-bottom: 16px; transition: box-shadow 0.2s; }
.category-item-card:hover { box-shadow: 0 4px 15px rgba(0,0,0,0.05); }

.drag-handle { position: absolute; left: 0; top: 0; padding: 22px 14px; color: #cbd5e1; font-size: 18px; user-select: none; cursor: grab; z-index: 5; opacity: 0.4; }
.drag-handle:hover { opacity: 0.9; }
.category-main-content { flex: 1; min-width: 0; }
.category-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-left: 24px; }

.category-info { display: flex; align-items: center; }
.category-icon-display { font-size: 28px; margin-right: 15px; }
.category-name { font-size: 18px; font-weight: 600; color: #1e293b; margin: 0; }
.category-meta { font-size: 13px; color: #94a3b8; margin-top: 4px; }

.category-sites-preview { 
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
}

/* 前台卡片 1:1 完全复刻 */
.mini-site-card-wrapper { position: relative; display: block; }
.mini-site-card-wrapper:hover .site-delete-badge { opacity: 1; }

.admin-site-card {
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

.admin-site-card::before {
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
.admin-site-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15); cursor: pointer; }
.admin-site-card:hover::before { opacity: 1; }

.admin-site-card .site-icon, .admin-site-card .site-info { position: relative; z-index: 1; }

.admin-site-card .site-icon {
  height: 100% !important;
  aspect-ratio: 1 / 1 !important;
  flex-shrink: 0;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.admin-site-card .site-icon img, .admin-site-card .site-icon :deep(svg) { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block; }

.admin-site-card .site-info {
  flex: 1;
  min-width: 0;
  padding: 10px 14px 4px 14px !important;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}
.admin-site-card .site-name {
  font-size: 15px !important;
  font-weight: 600;
  margin: 0 0 5px 0 !important;
  color: #2c3e50;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.admin-site-card .site-description {
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

.site-delete-badge {
  position: absolute; right: 4px; top: 4px;
  background: #ff4d4f; color: white; border: none; border-radius: 50%;
  width: 18px; height: 18px; font-size: 12px;
  display: flex; align-items: center; justify-content: center; padding: 0; box-sizing: border-box;
  cursor: pointer;
  opacity: 0; transition: opacity 0.2s;
  z-index: 3;
}
.site-copy-badge {
  position: absolute; right: 4px; bottom: 4px;
  background: #27ae60; color: white; border: none; border-radius: 50%;
  width: 18px; height: 18px; font-size: 10px;
  display: flex; align-items: center; justify-content: center; padding: 0; box-sizing: border-box;
  cursor: pointer; overflow: hidden;
  opacity: 0; transition: opacity 0.2s;
  z-index: 3;
}
.mini-site-card-wrapper:hover .site-delete-badge, .mini-site-card-wrapper:hover .site-copy-badge { opacity: 1; }

.site-ghost { opacity: 0.3; background: #e0e0e0 !important; }

.empty-category-hint { font-size: 13px; color: #cbd5e1; padding: 15px; font-style: italic; }

.category-actions { margin-left: 20px; display: flex; flex-direction: column; align-items: flex-end; gap: 12px; }
.rank-badge { background: #f1f5f9; color: #64748b; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; }
.action-buttons { display: flex; gap: 8px; }

.arrow-btn { background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; cursor: pointer; transition: background 0.2s; }
.arrow-btn:hover:not(:disabled) { background: #f8fafc; }
.arrow-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.add-site-btn { background: #fff; color: #27ae60; border: 1px solid #27ae60; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-weight: 500; }
.add-site-btn:hover { background: #ebfbee; }

.edit-btn { background: #fff; color: #f39c12; border: 1px solid #f39c12; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-weight: 500; }
.edit-btn:hover { background: #fcf3e8; }
.delete-btn { background: #fff; color: #e74c3c; border: 1px solid #e74c3c; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-weight: 500; }
.delete-btn:hover { background: #fdf2f2; }

.subcategory-block {
  margin-top: 18px; margin-left: 0; padding: 16px 0 0 0;
  border-top: 1px solid #edf2f7;
}
.subcategory-header-row {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;
}
.subcategory-info { display: flex; align-items: center; gap: 8px; }
.subcategory-icon-display { font-size: 18px; }
.subcategory-name { font-size: 15px; font-weight: 600; color: #334155; }
.subcategory-meta { font-size: 12px; color: #94a3b8; }

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
.modal-content { background: white; padding: 30px; border-radius: 16px; width: 480px; max-width: 95%; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 1px solid #f1f5f9; padding-bottom: 15px; }
.close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #94a3b8; }

.category-form { display: flex; flex-direction: column; gap: 20px; }
.form-group { display: flex; flex-direction: column; gap: 10px; }
.form-group label { font-size: 14px; font-weight: 600; color: #475569; }
.form-input { padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 15px; outline: none; transition: border-color 0.2s; }
.fetch-hint { margin: 4px 0 0; font-size: 12px; color: #3498db; }
.form-input:focus { border-color: #3498db; }
.text-area { min-height: 80px; font-family: monospace; font-size: 12px; }
.category-lock-display { padding: 12px; background: #f1f5f9; border-radius: 8px; color: #64748b; font-weight: 500; }

/* 🌟 Emoji 选择面板样式 */
.icon-input-wrapper { display: flex; gap: 10px; align-items: center; }
.icon-input { flex: 1; }
.icon-preview-box { width: 46px; height: 46px; background: #f8fafc; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; border: 1px solid #e2e8f0; flex-shrink: 0; }

.emoji-selector-panel { 
  display: grid; 
  grid-template-columns: repeat(auto-fill, minmax(36px, 1fr)); 
  gap: 8px; 
  padding: 15px; 
  background: #f8fafc; 
  border-radius: 12px; 
  border: 1px solid #edf2f7;
  max-height: 200px;
  overflow-y: auto;
  box-sizing: border-box;
}
.emoji-option { 
  cursor: pointer; font-size: 20px; text-align: center; padding: 6px; 
  border-radius: 8px; transition: all 0.2s;
  display: flex; align-items: center; justify-content: center;
}
.emoji-option:hover { background: #e2e8f0; transform: scale(1.15); }
.emoji-option.active { background: #3498db; color: white; box-shadow: 0 2px 6px rgba(52, 152, 219, 0.3); }
.emoji-hint { font-size: 13px; color: #94a3b8; padding: 10px; background: #f8fafc; border-radius: 8px; border: 1px dashed #e2e8f0; text-align: center; }

.form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 10px; padding-top: 20px; border-top: 1px solid #f1f5f9; }
.cancel-btn { padding: 10px 20px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; color: #64748b; font-weight: 500; }
.submit-btn { padding: 10px 25px; background: #27ae60; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }

@media (max-width: 768px) {
  /* 头部操作按钮换行，按钮加宽方便触控 */
  .manager-header { flex-direction: column; align-items: stretch; gap: 10px; }
  .manager-header h2 { font-size: 18px; margin-bottom: 0; }
  .header-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; }
  .add-btn, .save-btn { padding: 12px 10px; font-size: 14px; width: 100%; min-height: 44px; }

  .category-item-card { padding: 12px; flex-direction: column; position: relative; }
  .drag-handle { position: static; width: 100%; text-align: center; padding: 4px 0 8px; font-size: 18px; border-bottom: 1px solid #f1f5f9; margin-bottom: 12px; opacity: 0.4; }
  .category-header-row, .subcategory-header-row { padding-left: 0; flex-wrap: wrap; row-gap: 8px; }
  
  .category-info, .subcategory-info { flex: 1 1 100%; margin-bottom: 4px; align-items: center; }
  .category-icon-display { font-size: 24px; margin-right: 10px; }
  .category-name { font-size: 16px; }
  
  .category-sites-preview { 
    grid-template-columns: 1fr 1fr !important; 
    gap: 10px !important; 
  }

  /* 🌟 站点卡片移动端紧凑化（贴合前台 2 列布局） */
  .admin-site-card { height: 72px !important; border-radius: 10px; }
  .admin-site-card .site-info { padding: 6px 10px !important; }
  .admin-site-card .site-name { font-size: 13px !important; }
  .admin-site-card .site-description { font-size: 11px !important; -webkit-line-clamp: 2 !important; }

  /* 手机上无 hover，删除/复制按钮常显便于操作 */
  .mini-site-card-wrapper .site-delete-badge,
  .mini-site-card-wrapper .site-copy-badge { opacity: 1; width: 18px; height: 18px; }
  .site-delete-badge { right: 3px; top: 3px; }
  .site-copy-badge { right: 3px; bottom: 3px; }

  .emoji-selector-panel { grid-template-columns: repeat(auto-fill, minmax(32px, 1fr)); padding: 10px; }
  
  .category-actions { margin-left: 0; width: 100%; align-items: stretch; margin-top: 12px; padding-top: 12px; border-top: 1px solid #f1f5f9; }
  .rank-badge { margin-bottom: 10px; text-align: center; font-size: 10px; }
  
  .action-buttons { 
    flex: 1 1 100%;
    display: grid; 
    grid-template-columns: 1fr 1fr; 
    gap: 8px; 
    width: 100%; 
  }
  .action-buttons button { 
    min-height: 44px;
    padding: 10px 6px; 
    font-size: 13px; 
    width: 100%; 
    text-align: center; 
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .arrow-btn { background: #f8fafc; }
  
  /* 🌟 弹窗移动端底部抽屉化，避免键盘遮挡与全屏溢出 */
  .modal-overlay { align-items: flex-end; padding: 0; }
  .modal-content { 
    width: 100%; 
    max-width: 100%; 
    border-radius: 16px 16px 0 0; 
    padding: 20px 16px calc(20px + env(safe-area-inset-bottom)); 
    max-height: 92vh; 
    max-height: 92svh; 
    overflow-y: auto; 
  }
  .modal-header { margin-bottom: 18px; padding-bottom: 12px; }
  .category-form { gap: 16px; }
  .form-actions { margin-top: 6px; }
}

@media (max-width: 360px) {
  .category-sites-preview { grid-template-columns: 1fr; }
  .action-buttons button { font-size: 12px; }
  .emoji-selector-panel { grid-template-columns: repeat(auto-fill, minmax(28px, 1fr)); }
  .header-actions { grid-template-columns: 1fr; }
}
</style>