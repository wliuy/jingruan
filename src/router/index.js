import { createRouter, createWebHistory } from 'vue-router'
import NavHomeView from '../views/NavHomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: NavHomeView, // 首页需要秒开，所以保持同步加载
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/AdminView.vue'), // 后台页面懒加载
      meta: {
        title: '管理后台 - jingruan 导航',
        requiresAuth: true
      }
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    },
  ],
})

// 路由前置守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta?.title) {
    document.title = to.meta.title
  } else {
    document.title = 'jingruan 导航'
  }

  next()
})

export default router