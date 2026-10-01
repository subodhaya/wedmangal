// Who counts as an admin in the UI. Mirrors the backend's _is_admin
// (base/views/product_views.py): Django staff (isAdmin) or profile role 'admin'.
// This only controls what the browser shows — the API enforces permissions itself.
export const isAdminUser = (userInfo) =>
  !!userInfo && (userInfo.role === 'admin' || userInfo.isAdmin === true);
