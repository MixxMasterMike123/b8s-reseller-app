// index.js — Print on Demand wagon: the single connection point to the train.
//
// WagonRegistry.discoverWagons() import.meta.glob's ./*/index.js and needs the
// default export to carry `manifest` + `components` (registerWagon validates the
// manifest; getRoutes/getAdminMenuItemsSync read components[route.component] and
// adminMenu). A plain object is enough — no class ceremony required.
import PodWagonManifest from './WagonManifest.js';
import PodAdminPage from './components/PodAdminPage.jsx';

export default {
  manifest: PodWagonManifest,
  components: {
    AdminComponent: PodAdminPage,
  },
};

export { PodWagonManifest };
