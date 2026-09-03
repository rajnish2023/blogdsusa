 

const PERMISSIONS = [
  { key: "gallery:view", module: "Gallery", action: "View", description: "View images and videos in the gallery" },
  { key: "gallery:upload", module: "Gallery", action: "Upload", description: "Upload new images or videos" },
  { key: "gallery:delete", module: "Gallery", action: "Delete", description: "Delete files from the gallery" },

  { key: "users:view", module: "Users", action: "View", description: "View team members" },
  { key: "users:create", module: "Users", action: "Create", description: "Invite new team members" },
  { key: "users:edit", module: "Users", action: "Edit", description: "Edit team member details and roles" },
  { key: "users:delete", module: "Users", action: "Delete", description: "Remove team members" },

  { key: "roles:view", module: "Roles", action: "View", description: "View roles and permissions" },
  { key: "roles:manage", module: "Roles", action: "Manage", description: "Create, edit, and delete roles" },

  { key: "blog:view", module: "Blog", action: "View", description: "View blog posts" },
  { key: "blog:create", module: "Blog", action: "Create", description: "Create new blog posts" },
  { key: "blog:edit", module: "Blog", action: "Edit", description: "Edit existing blog posts" },
  { key: "blog:delete", module: "Blog", action: "Delete", description: "Delete blog posts" },
  { key: "blog:publish", module: "Blog", action: "Publish", description: "Publish or unpublish blog posts" },

  { key: "pages:view", module: "Pages", action: "View", description: "View webpages" },
  { key: "pages:create", module: "Pages", action: "Create", description: "Create new webpages" },
  { key: "pages:edit", module: "Pages", action: "Edit", description: "Edit existing webpages" },
  { key: "pages:delete", module: "Pages", action: "Delete", description: "Delete webpages" },
  { key: "pages:publish", module: "Pages", action: "Publish", description: "Publish or unpublish webpages" },

  { key: "licensing:view", module: "Licensing", action: "View", description: "View licence calculator enquiries and rate card pricing" },
  { key: "licensing:manage", module: "Licensing", action: "Manage", description: "Update the status and notes on licence enquiries" },
  { key: "licensing:delete", module: "Licensing", action: "Delete", description: "Delete licence calculator enquiries" },
  { key: "licensing:pricing", module: "Licensing", action: "Pricing", description: "Edit the published Dynamics 365 licence rates" },
  { key: "licensing:catalogue", module: "Licensing", action: "Catalogue", description: "Add, edit and reorder the capabilities and groups on the rate card" },

  { key: "estimator:view", module: "Price Estimator", action: "View", description: "View price estimators, their questions and pricing" },
  { key: "estimator:create", module: "Price Estimator", action: "Create", description: "Create new price estimators" },
  { key: "estimator:edit", module: "Price Estimator", action: "Edit", description: "Edit estimator questions, pricing and result page copy" },
  { key: "estimator:delete", module: "Price Estimator", action: "Delete", description: "Delete price estimators and their submissions" },
  { key: "estimator:responses", module: "Price Estimator", action: "Responses", description: "View estimator submissions and re-send report emails" },
];

const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

module.exports = { PERMISSIONS, PERMISSION_KEYS };
