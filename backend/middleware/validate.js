const { validationResult } = require("express-validator");
 
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const formatted = {};
  errors.array().forEach((err) => {
    if (!formatted[err.path]) formatted[err.path] = err.msg;
  });

  res.status(422).json({ message: "Please check the highlighted fields", errors: formatted });
};

module.exports = validate;
