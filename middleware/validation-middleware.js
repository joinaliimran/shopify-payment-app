const { body, validationResult } = require("express-validator");

const validateCreateCheckout = [
  body("shipping_address.address").isString().notEmpty(),
  body("shipping_address.city").isString().notEmpty(),
  body("shipping_address.country")
    .isString()
    .isLength({ min: 2, max: 2 })
    .isUppercase()
    .notEmpty(),
  body("shipping_address.first_name").isString().notEmpty(),
  body("shipping_address.last_name").isString().notEmpty(),
  body("shipping_address.phone").isString().notEmpty(),
  body("shipping_address.province")
    .isString()
    .isLength({ min: 2, max: 2 })
    .isUppercase()
    .notEmpty(),
  body("shipping_address.zip").isString().notEmpty(),
  body("billing_address.address").isString().notEmpty(),
  body("billing_address.city").isString().notEmpty(),
  body("billing_address.country")
    .isString()
    .isLength({ min: 2, max: 2 })
    .isUppercase()
    .notEmpty(),
  body("billing_address.first_name").isString().notEmpty(),
  body("billing_address.last_name").isString().notEmpty(),
  body("billing_address.phone").isString().notEmpty(),
  body("billing_address.province")
    .isString()
    .isLength({ min: 2, max: 2 })
    .isUppercase()
    .notEmpty(),
  body("billing_address.zip").isString().notEmpty(),
  body("email").isEmail().notEmpty(),
  body("gift_card_price")
    .isNumeric()
    .custom((value) => {
      if (!value || isNaN(value) || value < 1) {
        throw new Error(
          "Gift card price must be a numeric value greater than or equal to 1"
        );
      }
      return true;
    })
    .notEmpty(),
];

const validationMiddleware = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = { validateCreateCheckout, validationMiddleware };
