## 2024-05-23 - Accessibility in Dynamic Grids
**Learning:** When adding `role="tablist"` and `role="tabpanel"` to a structure that is already a CSS Grid, care must be taken not to break the layout. Using `display: contents` (via Tailwind `contents` class) on the intermediate `tabpanel` wrapper allows its children (the items) to participate directly in the parent grid layout while maintaining the semantic hierarchy required for accessibility.
**Action:** Use `display: contents` for semantic wrappers inside grid containers.
