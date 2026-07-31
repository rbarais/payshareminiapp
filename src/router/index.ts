import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { handleModalBack } from '../composables/modalBack';
import { updateTransition } from '../composables/routeTransition';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
  },
  {
    path: '/groups',
    name: 'groups',
    component: () => import('../views/GroupsView.vue'),
  },
  {
    path: '/history',
    name: 'history',
    component: () => import('../views/HistoryView.vue'),
  },
  {
    path: '/group/:id',
    name: 'group',
    component: () => import('../views/GroupView.vue'),
    props: true,
  },
  {
    path: '/add-expense',
    name: 'addExpense',
    component: () => import('../views/AddExpenseView.vue'),
  },
  {
    path: '/pay',
    name: 'pay',
    component: () => import('../views/PayView.vue'),
    props: (route) => ({
      room: route.query.room ? JSON.parse(decodeURIComponent(route.query.room as string)) : null,
      groupId: (route.query.groupId as string) || undefined,
    }),
  },
  {
    path: '/success',
    name: 'success',
    component: () => import('../views/SuccessView.vue'),
    props: (route) => ({
      amount: route.query.amount ? Number(route.query.amount) : 0,
      recipient: route.query.recipient || '',
      groupId: (route.query.groupId as string) || undefined,
    }),
  },
  {
    path: '/new-group',
    name: 'newGroup',
    component: () => import('../views/NewGroupView.vue'),
  },
  {
    path: '/join',
    name: 'join',
    component: () => import('../views/JoinGroupView.vue'),
    props: (route) => ({ groupId: route.query.g ?? '', token: route.query.t ?? '' }),
  },
  {
    path: '/scan',
    name: 'scan',
    component: () => import('../components/QRScanner.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.afterEach(updateTransition);

// After a deploy the hashed chunks of the previously loaded build are gone, and
// the SPA rewrite answers those requests with index.html — so the lazy import
// fails ("'text/html' is not a valid JavaScript MIME type" on Safari/WKWebView)
// and the tap silently does nothing. index.html is served no-store, so reloading
// on the target route picks up the new build. The timestamp guards against a
// reload loop if the chunk is missing for any other reason.
const staleChunkPattern =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|is not a valid JavaScript MIME type|Unable to preload CSS/i;

const RELOAD_KEY = 'staleChunkReloadAt';

router.onError((error, to) => {
  if (!staleChunkPattern.test(String((error as Error)?.message ?? ''))) return;

  let last = 0;
  try {
    last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable: reload without the loop guard
  }
  if (Date.now() - last < 10_000) return;

  window.location.replace(to.fullPath);
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
