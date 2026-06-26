import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import GroupsView from '../views/GroupsView.vue'
import GroupView from '../views/GroupView.vue'
import AddExpenseView from '../views/AddExpenseView.vue'
import PayView from '../views/PayView.vue'
import SuccessView from '../views/SuccessView.vue'
import NewGroupView from '../views/NewGroupView.vue'
import JoinGroupView from '../views/JoinGroupView.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/groups',
    name: 'groups',
    component: GroupsView
  },
  {
    path: '/group/:id',
    name: 'group',
    component: GroupView,
    props: true
  },
  {
    path: '/add-expense',
    name: 'addExpense',
    component: AddExpenseView
  },
  {
    path: '/pay',
    name: 'pay',
    component: PayView,
    props: (route) => ({
      room: route.query.room ? JSON.parse(decodeURIComponent(route.query.room as string)) : null
    })
  },
  {
    path: '/success',
    name: 'success',
    component: SuccessView,
    props: (route) => ({
      amount: route.query.amount ? Number(route.query.amount) : 0,
      recipient: route.query.recipient || ''
    })
  },
  {
    path: '/new-group',
    name: 'newGroup',
    component: NewGroupView
  },
  {
    path: '/join',
    name: 'join',
    component: JoinGroupView,
    props: (route) => ({ g: route.query.g ?? '', t: route.query.t ?? '' })
  },
  {
    path: '/scan',
    name: 'scan',
    component: () => import('../components/QRScanner.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// Double back to quit pour mini-apps
if (typeof window !== 'undefined') {
  let lastBackTime = 0
  let isAtRoot = true

  // Suivre si on est à la racine de la navigation
  router.afterEach((to) => {
    // Si on naviguer vers home, vérifier s'il y a de l'historique avant
    if (to.name === 'home') {
      isAtRoot = window.history.length <= 1
    } else {
      isAtRoot = false
    }
  })

  window.addEventListener('popstate', (event) => {
    const currentRoute = router.currentRoute.value
    
    // Bloquer UNIQUEMENT si on est sur home ET qu'on est à la racine de l'historique
    if (currentRoute.name === 'home' && isAtRoot) {
      const now = Date.now()
      
      if (now - lastBackTime < 2000) {
        // Double back -> on quitte
        lastBackTime = 0
      } else {
        // Premier back -> on bloque
        lastBackTime = now
        event.preventDefault()
        setTimeout(() => { lastBackTime = 0 }, 2000)
      }
    }
  })
}

export default router
