const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const {
  listPermissions,
  listRoles,
  createRole,
  updateRole,
  deleteRole,
} = require("../controllers/roleController");
const { protect, authorize, authorizeAny } = require("../middleware/auth");
const validate = require("../middleware/validate");

router.use(protect);

router.get("/permissions", authorize("roles:view"), listPermissions);
router.get("/", authorizeAny("roles:view", "users:view", "users:create", "users:edit"), listRoles);

router.post(
  "/",
  authorize("roles:manage"),
  [
    body("name").trim().notEmpty().withMessage("Role name is required").isLength({ max: 60 }),
    body("permissions").optional().isArray(),
  ],
  validate,
  createRole
);

router.patch(
  "/:id",
  authorize("roles:manage"),
  [body("permissions").optional().isArray()],
  validate,
  updateRole
);

router.delete("/:id", authorize("roles:manage"), deleteRole);

module.exports = router;
