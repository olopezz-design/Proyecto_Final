// middlewares/validate.js
// Uso: router.post('/ruta', validate(schema), (req,res)=>{...})
const validate = (schema, property = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[property], { abortEarly: false, stripUnknown: true });
  if (error) {
    const details = error.details.map(d => d.message);
    return res.status(400).json({ message: 'Validación fallida', errors: details });
  }
  req[property] = value;
  next();
};

module.exports = { validate };