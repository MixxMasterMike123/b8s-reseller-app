/**
 * Admin Neutral — shared shop-admin UI primitives.
 * See docs/ADMIN_REDESIGN_PLAN.md §3.3. Import from here:
 *   import { Page, DataTable, StatusPill, Button } from '../../components/admin/ui';
 */
export { default as Page } from './Page';
export { default as KpiStrip } from './KpiStrip';
export { default as MetricsBar } from './MetricsBar';
export { default as DataTable } from './DataTable';
export { default as RightRail } from './RightRail';
export { default as Toolbar } from './Toolbar';

export { default as Button } from './Button';

export { Card, CardSection } from './Card';

export {
  default as FilterBar,
  SegmentedTabs,
  SearchInput,
  ViewTabs,
  InlineSearch,
  Pagination,
} from './FilterBar';

export { Field, Input, Textarea, Select } from './Field';

export {
  default as StatusPill,
  ORDER_STATUS_TONE,
  PAYMENT_STATUS_TONE,
  FULFILLMENT_STATUS_TONE,
  toneForOrderStatus,
} from './StatusPill';
