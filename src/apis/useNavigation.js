import { ref } from 'vue'
import { mockData } from '../mock/mock_data.js'
import { useSiteDataAPI } from './useSiteDataAPI.js'

const SEARCH_ENGINES = ['site', 'google', 'baidu', 'bing', 'duckduckgo']

export function useNavigation() {
  const categories = ref([])
  const title = ref('')
  const defaultSearchEngine = ref('site')
  const loading = ref(false)
  const error = ref(null)

  const applyData = (data) => {
    categories.value = data.categories || []
    title.value = data.title || '精软导航'
    if (data.search && SEARCH_ENGINES.includes(data.search)) {
      defaultSearchEngine.value = data.search
    } else {
      defaultSearchEngine.value = 'site'
    }
    document.title = title.value
  }

  const fetchCategories = async () => {
    loading.value = true
    error.value = null

    try {
      const { loadSiteData } = useSiteDataAPI()
      const data = await loadSiteData()
      if (data) {
        applyData(data)
      } else {
        applyData(mockData)
      }
    } catch (err) {
      error.value = err.message
      applyData(mockData)
    } finally {
      loading.value = false
    }
  }

  return {
    categories,
    title,
    defaultSearchEngine,
    loading,
    error,
    fetchCategories
  }
}