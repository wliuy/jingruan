<template>
  <div class="site-manager">
    <div class="manager-header">
      <h2>🌐 站点管理</h2>
      <div class="header-actions">
        <select v-model="selectedCategoryId" class="category-filter">
          <option value="">所有分类</option>
          <option v-for="category in localCategories" :key="category.id" :value="category.id">
            {{ category.icon }} {{ category.name }}
          </option>
        </select>
        <button @click="openAddModal" class="add-btn">➕ 添加站点</button>
        <button @click="handleSave" :disabled="loading" class="save-btn">
          {{ loading ? '保存中...' : '💾 保存' }}
        </button>
      </div>
    </div>

    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-number">{{ totalSites }}</span>
        <span class="stat-label">总站点数</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">{{ localCategories.length }}</span>
        <span class="stat-label">分类数</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">{{ filteredSites.length }}</span>
        <span class="stat-label">当前显示</span>
      </div>
      <div class="stat-info">
        💡 提示：v2.4.8 已锁定物理索引替换逻辑，确保编辑站点内容后其位置绝对不跳变。
      </div>
    </div>

    <div class="sites-container">
      <draggable
        v-model="currentPageSites"
        v-bind="dragOptions"
        @end="onDragEnd"
        item-key="id"
        tag="div"
        class="admin-sites-grid"
      >
        <template #item="{ element: site }">
          <div class="admin-site-card-wrapper">
            <div class="admin-drag-handle" v-if="selectedCategoryId" title="拖拽排序">⋮⋮</div>
            
            <div class="site-card">
              <div class="site-icon">
                <div v-if="isSvg(site.icon)" v-html="site.icon" class="svg-icon-wrapper"></div>
                <img v-else :src="ensureIcon(site.icon)" :alt="site.name" @error="handleImageError">
              </div>
              <div class="site-info">
                <h3 class="site-name">{{ site.name }}</h3>
                <p class="site-description">{{ site.description || '暂无描述' }}</p>
              </div>

              <div class="card-admin-actions">
                <button @click.stop="editSite(site)" class="mini-btn edit" title="编辑">✏️</button>
                <button @click.stop="deleteSite(site)" class="mini-btn delete" title="删除">🗑️</button>
              </div>
            </div>
          </div>
        </template>
      </draggable>
    </div>

    <div v-if="showAddModal || editingSite" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingSite ? '编辑站点' : '添加站点' }}</h3>
          <button @click="closeModal" class="close-btn">✕</button>
        </div>
        <form @submit.prevent="saveSite" novalidate class="site-form">
          <div class="form-row">
            <div class="form-group">
              <label>站点名称 *:</label>
              <input v-model="formData.name" placeholder="留空将自动从网页获取" class="form-input">
            </div>
            <div class="form-group">
              <label>所属分类 *:</label>
              <select v-model="formData.categoryId" required class="form-input">
                <option v-for="category in localCategories" :key="category.id" :value="category.id">
                  {{ category.icon }} {{ category.name }}
                </option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>站点地址 *:</label>
            <div class="icon-input-group">
              <input
                v-model="formData.url"
                type="url"
                required
                placeholder="https://"
                class="form-input"
                @blur="onSiteUrlBlur"
              >
              <p v-if="isFetching" class="fetch-hint">正在自动获取站点信息...</p>
              <button type="button" @click="autoFetchSiteInfo" class="auto-icon-btn" :disabled="isFetching">
                {{ isFetching ? '读取中...' : '🔍 智能填充' }}
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>站点描述:</label>
            <textarea v-model="formData.description" class="form-textarea" rows="2" placeholder="简短描述"></textarea>
          </div>
          <div class="form-group">
            <label>站点图标 (URL或SVG代码):</label>
            <input v-model="formData.icon" class="form-input" placeholder="粘贴图片地址或SVG代码">
            <div class="icon-preview-box">
               <div v-if="isSvg(formData.icon)" v-html="formData.icon" class="svg-preview"></div>
               <img v-else :src="ensureIcon(formData.icon)" alt="预览" @error="handleImageError">
            </div>
          </div>
          <div class="form-actions">
            <button type="button" @click="closeModal" class="cancel-btn">取消</button>
            <button type="submit" class="submit-btn" :disabled="isFetching">
              {{ isFetching ? '获取信息中...' : (editingSite ? '更新' : '添加') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import draggable from 'vuedraggable'
import { fetchSiteMetadata, needsMetadataFetch, applySiteMetadata } from '@/apis/fetchSiteMetadata'

const props = defineProps({
  categories: { type: Array, default: () => [] },
  initialSelectedCategoryId: { type: String, default: '' },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['update', 'save'])

const localCategories = ref([])
const selectedCategoryId = ref('')
const showAddModal = ref(false)
const editingSite = ref(null)
const isFetching = ref(false) // 新增：抓取状态

const formData = ref({ name: '', url: '', description: '', icon: '', categoryId: '' })

// 同步数据
watch(() => props.categories, (val) => { 
  localCategories.value = JSON.parse(JSON.stringify(val)) 
}, { immediate: true, deep: true })

watch(() => props.initialSelectedCategoryId, (val) => { 
  if (val) selectedCategoryId.value = val 
}, { immediate: true })

const syncToParent = () => emit('update', localCategories.value)

const isSvg = (icon) => icon && icon.trim().toLowerCase().startsWith('<svg')

const ensureIcon = (icon) => {
  if (!icon || icon.trim() === '') return '/logo.png'
  return icon
}

const allSites = computed(() => {
  const sites = []
  localCategories.value.forEach(cat => {
    if (cat.sites) cat.sites.forEach(s => sites.push({ ...s, categoryId: cat.id }))
  })
  return sites
})

const totalSites = computed(() => allSites.value.length)
const filteredSites = computed(() => selectedCategoryId.value ? allSites.value.filter(s => s.categoryId === selectedCategoryId.value) : allSites.value)

const currentPageSites = computed({
  get() { return filteredSites.value },
  set(newSites) {
    if (!selectedCategoryId.value) return
    const cat = localCategories.value.find(c => c.id === selectedCategoryId.value)
    if (cat) {
      cat.sites = newSites.map(s => ({ ...s }))
      syncToParent()
    }
  }
})

const dragOptions = computed(() => ({
  animation: 250,
  group: "sites",
  disabled: !selectedCategoryId.value,
  ghostClass: "sortable-ghost",
  handle: ".admin-drag-handle"
}))

const editSite = (site) => {
  editingSite.value = site
  formData.value = { ...site }
}

const deleteSite = (site) => {
  if (confirm(`确定删除 "${site.name}" 吗？`)) {
    const cat = localCategories.value.find(c => c.id === site.categoryId)
    if (cat) {
      cat.sites = cat.sites.filter(s => s.id !== site.id)
      syncToParent()
    }
  }
}

const onDragEnd = () => console.log('排序已同步')

const fillEmptySiteMetadata = async () => {
  if (!needsMetadataFetch(formData.value)) return true

  isFetching.value = true
  try {
    const metadata = await fetchSiteMetadata(formData.value.url, formData.value)
    applySiteMetadata(formData.value, metadata)
    return true
  } catch (error) {
    console.error('获取站点信息失败:', error)
    return false
  } finally {
    isFetching.value = false
  }
}

const onSiteUrlBlur = async () => {
  if (needsMetadataFetch(formData.value)) {
    await fillEmptySiteMetadata()
  }
}

/** 手动触发：智能填充标题、描述和图标 */
const autoFetchSiteInfo = async () => {
  if (!formData.value.url) {
    alert('请先输入站点地址！')
    return
  }

  isFetching.value = true
  try {
    const metadata = await fetchSiteMetadata(formData.value.url, formData.value)
    applySiteMetadata(formData.value, metadata)
  } catch (error) {
    console.error('获取站点信息失败:', error)
    alert('抓取失败，可能是该网站开启了高级防爬虫保护，请手动填写。')
  } finally {
    isFetching.value = false
  }
}

/**
 * 🌟 核心逻辑：保存站点 (v2.4.8)
 */
const saveSite = async () => {
  if (!formData.value.url?.trim()) {
    alert('请填写站点地址')
    return
  }

  if (needsMetadataFetch(formData.value)) {
    const ok = await fillEmptySiteMetadata()
    if (!ok && (!formData.value.name?.trim() || !formData.value.description?.trim())) {
      alert('自动获取站点信息失败，请手动填写名称和描述，或稍后再试。')
    }
  }

  if (!formData.value.name?.trim()) {
    alert('站点名称不能为空，请手动填写或检查 URL 是否可访问')
    return
  }

  const targetCatId = formData.value.categoryId
  const targetCat = localCategories.value.find(c => c.id === targetCatId)
  if (!targetCat) return

  const isEditing = !!editingSite.value
  const siteId = isEditing ? editingSite.value.id : `site-${Date.now()}`

  const siteData = isEditing 
    ? { ...editingSite.value, ...formData.value, id: siteId }
    : { ...formData.value, id: siteId }
  
  delete siteData.categoryId

  if (isEditing) {
    let siteProcessed = false
    
    for (const cat of localCategories.value) {
      if (!cat.sites) continue
      const index = cat.sites.findIndex(s => s.id === siteId)
      
      if (index !== -1) {
        siteProcessed = true
        if (cat.id === targetCatId) {
          cat.sites.splice(index, 1, siteData)
        } else {
          cat.sites.splice(index, 1)
          if (!targetCat.sites) targetCat.sites = []
          targetCat.sites.push(siteData)
        }
        break 
      }
    }
    
    if (!siteProcessed) {
      if (!targetCat.sites) targetCat.sites = []
      targetCat.sites.push(siteData)
    }
  } else {
    if (!targetCat.sites) targetCat.sites = []
    targetCat.sites.push(siteData)
  }
  
  syncToParent()
  closeModal()
}

const openAddModal = () => {
  showAddModal.value = true
  formData.value = { name: '', url: '', description: '', icon: '', categoryId: selectedCategoryId.value || localCategories.value[0]?.id }
}

const closeModal = () => {
  showAddModal.value = false
  editingSite.value = null
}

const handleImageError = (e) => { 
  if (e.target.dataset.tried === 'true') {
    e.target.style.display = 'none';
    e.target.parentNode.style.backgroundColor = '#f5f5f5';
    return;
  }
  e.target.dataset.tried = 'true';
  e.target.src = '/logo.png'; 
}

const handleSave = () => emit('save')
</script>

<style scoped>
.site-manager { padding: 10px 0; }
.manager-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.header-actions { display: flex; gap: 10px; }
.category-filter { padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; background: #fff; }

.add-btn { background: #27ae60; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; white-space: nowrap; flex-shrink: 0; }
.save-btn { background: #3498db; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; white-space: nowrap; flex-shrink: 0; }
.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.stats-bar { display: flex; gap: 20px; margin-bottom: 20px; align-items: center; background: #fff; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); flex-wrap: wrap; }
.stat-item { display: flex; flex-direction: column; align-items: center; }
.stat-number { font-size: 20px; font-weight: bold; color: #3498db; }
.stat-label { font-size: 12px; color: #999; }
.stat-info { font-size: 13px; color: #666; margin-left: auto; }

.admin-sites-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.admin-site-card-wrapper { position: relative; }
.admin-drag-handle { position: absolute; left: -8px; top: 50%; transform: translateY(-50%); cursor: move; color: #ccc; font-size: 18px; z-index: 5; padding: 10px 4px; }

.site-card { display: flex; align-items: stretch; background: white; border-radius: 12px; border: 1px solid #eee; height: 90px; overflow: hidden; position: relative; transition: all 0.3s ease; }
.site-card:hover { box-shadow: 0 8px 20px rgba(0,0,0,0.1); border-color: #3498db; }

.site-icon { aspect-ratio: 1 / 1 !important; height: 100% !important; background: #fcfcfc; flex-shrink: 0; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
.site-icon img, .site-icon :deep(svg) { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block; }
.svg-icon-wrapper { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }

.site-info { flex: 1; padding: 10px 14px; display: flex; flex-direction: column; justify-content: flex-start; min-width: 0; background: white; }
.site-name { font-size: 15px; font-weight: 600; margin: 2px 0; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.site-description { font-size: 11px; color: #999; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.card-admin-actions { position: absolute; top: 0; right: 0; bottom: 0; left: 90px; background: rgba(255,255,255,0.9); display: flex; align-items: center; justify-content: center; gap: 15px; opacity: 0; transition: opacity 0.2s; backdrop-filter: blur(2px); }
.site-card:hover .card-admin-actions { opacity: 1; }

.mini-btn { border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; }
.mini-btn.edit { background: #f39c12; color: white; }
.mini-btn.delete { background: #e74c3c; color: white; }

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: white; padding: 25px; border-radius: 12px; width: 500px; max-width: 95%; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
.close-btn { background: none; border: none; font-size: 20px; cursor: pointer; color: #94a3b8; }

.site-form { display: flex; flex-direction: column; gap: 15px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-group label { font-size: 14px; font-weight: 500; color: #555; }
.form-input, .form-textarea { padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; outline: none; }
.fetch-hint { margin: 4px 0 0; font-size: 12px; color: #3498db; }

.icon-input-group { display: flex; gap: 8px; }
.auto-icon-btn { background: #3498db; color: white; border: none; padding: 0 15px; border-radius: 8px; cursor: pointer; }
.icon-preview-box { margin-top: 5px; width: 64px; height: 64px; border: 1px solid #eee; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #fafafa; position: relative; }
.icon-preview-box img, .svg-preview :deep(svg) { width: 100%; height: 100%; object-fit: contain; }

.form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 15px; }
.submit-btn { padding: 10px 25px; background: #27ae60; color: white; border: none; border-radius: 8px; cursor: pointer; }

@media (max-width: 768px) {
  .manager-header { flex-direction: column; align-items: stretch; gap: 12px; }
  .header-actions { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .category-filter { grid-column: 1 / -1; min-height: 44px; }
  .add-btn, .save-btn { width: 100%; min-height: 44px; padding: 10px 12px; }
  .stat-info { width: 100%; margin-top: 10px; text-align: left; }
  .admin-sites-grid { grid-template-columns: 1fr; gap: 12px; }
  .site-card { height: 80px; }
  .site-icon { height: 80px; width: 80px; }
  .card-admin-actions { position: relative; left: 0; width: 64px; height: 100%; opacity: 1; background: #f8fafc; border-left: 1px solid #eee; flex-direction: column; gap: 8px; padding: 0 5px; backdrop-filter: none; }
  .mini-btn { width: 36px; height: 36px; font-size: 15px; }
  .site-info { padding: 8px 12px; }
  .site-name { font-size: 14px; }
  .site-description { -webkit-line-clamp: 2; font-size: 10px; }

  /* 🌟 弹窗移动端底部抽屉化 */
  .modal-overlay { align-items: flex-end; padding: 0; }
  .modal-content { width: 100%; max-width: 100%; border-radius: 16px 16px 0 0; padding: 20px 16px calc(20px + env(safe-area-inset-bottom)); max-height: 92vh; max-height: 92svh; overflow-y: auto; }
  .form-row { grid-template-columns: 1fr; }
  .icon-input-group { flex-direction: column; }
  .auto-icon-btn { padding: 12px; min-height: 44px; }
  .submit-btn, .cancel-btn { min-height: 44px; }
}

@media (max-width: 360px) {
  .header-actions { grid-template-columns: 1fr; }
  .category-filter { grid-column: auto; }
}
</style>