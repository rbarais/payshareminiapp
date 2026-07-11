import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';
import { handleModalBack } from '../composables/modalBack';
import HomeView from '../views/HomeView.vue';
import GroupsView from '../views/GroupsView.vue';
import GroupView from '../views/GroupView.vue';
import AddExpenseView from '../views/AddExpenseView.vue';
import PayView from '../views/PayView.vue';
import SuccessView from '../views/SuccessView.vue';
import NewGroupView from '../views/NewGroupView.vue';
import JoinGroupView from '../views/JoinGroupView.vue';
import HistoryView from '../views/HistoryView.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/groups',
    name: 'groups',
    component: GroupsView,
  },
  {
    path: '/history',
    name: 'history',
    component: HistoryView,
  },
  {
    path: '/group/:id',
    name: 'group',
    component: GroupView,
    props: true,
  },
  {
    path: '/add-expense',
    name: 'addExpense',
    component: AddExpenseView,
  },
  {
    path: '/pay',
    name: 'pay',
    component: PayView,
    props: (route) => ({
      room: route.query.room ? JSON.parse(decodeURIComponent(route.query.room as string)) : null,
      groupId: (route.query.groupId as string) || undefined,
    }),
  },
  {
    path: '/success',
    name: 'success',
    component: SuccessView,
    props: (route) => ({
      amount: route.query.amount ? Number(route.query.amount) : 0,
      recipient: route.query.recipient || '',
    }),
  },
  {
    path: '/new-group',
    name: 'newGroup',
    component: NewGroupView,
  },
  {
    path: '/join',
    name: 'join',
    component: JoinGroupView,
    props: (route) => ({ groupId: route.query.g ?? '', token: route.query.t ?? '' }),
  },
  {
    path: '/scan',
    name: 'scan',
    component: () => import('../components/QRScanner.vue'),
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// Double-back-to-quit for mini-apps
if (typeof window !== 'undefined') {
  let lastBackTime = 0;
  let isAtRoot = true;

  // Track whether we are at the navigation root
  router.afterEach((to) => {
    // When navigating to home, check whether there is history before it
    if (to.name === 'home') {
      isAtRoot = window.history.length <= 1;
    } else {
      isAtRoot = false;
    }
  });

  window.addEventListener('popstate', (event) => {
    // Overlays (sheets, dialogs, dropdowns) get the back press first: they
    // close themselves instead of letting the app navigate or quit.
    if (handleModalBack()) return;

    const currentRoute = router.currentRoute.value;

    // Block ONLY if we are on home AND at the root of the history
    if (currentRoute.name === 'home' && isAtRoot) {
      const now = Date.now();

      if (now - lastBackTime < 2000) {
        // Double back -> quit
        lastBackTime = 0;
      } else {
        // First back -> block
        lastBackTime = now;
        event.preventDefault();
        setTimeout(() => {
          lastBackTime = 0;
        }, 2000);
      }
    }
  });
}

export default router;
