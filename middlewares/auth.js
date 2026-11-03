// middlewares/auth.js
const { getEffectivePermissions, hasAllPermissions } = require('../utils/permissions');

function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) return next();
  if (wantsJson(req)) {
    return res.status(401).json({ ok: false, error: 'Debe iniciar sesión' });
  }
  return res.redirect(`/admin/login?returnTo=${encodeURIComponent(req.originalUrl || '/admin/dash')}`);
}

function wantsJson(req) {
  return req.originalUrl.startsWith('/api/')
    || req.originalUrl.includes('/api/')
    || req.xhr
    || req.accepts(['html', 'json']) === 'json';
}

function requireRole(...allowedRoles) {
  const allowed = new Set(allowedRoles.map(Number));

  return (req, res, next) => {
    if (!(req.session && req.session.user)) {
      return wantsJson(req)
        ? res.status(401).json({ ok: false, error: 'Debe iniciar sesión' })
        : res.redirect(`/admin/login?returnTo=${encodeURIComponent(req.originalUrl || '/admin/dash')}`);
    }

    const userRole = Number(req.session.user.rol);
    if (allowed.has(userRole)) return next();

    return wantsJson(req)
      ? res.status(403).json({ ok: false, error: 'No tiene permisos para realizar esta acción' })
      : res.status(403).send('No tiene permisos para realizar esta acción');
  };
}

function requirePermission(...neededPermissions) {
  return async (req, res, next) => {
    if (!(req.session && req.session.user)) {
      return wantsJson(req)
        ? res.status(401).json({ ok: false, error: 'Debe iniciar sesión' })
        : res.redirect(`/admin/login?returnTo=${encodeURIComponent(req.originalUrl || '/admin/dash')}`);
    }

    try {
      const permissions = await getEffectivePermissions(req.session.user);
      req.session.user.permissions = permissions;
      res.locals.permissions = permissions;
      res.locals.can = (permission) => hasAllPermissions(permissions, [permission]);

      if (hasAllPermissions(permissions, neededPermissions)) return next();

      return wantsJson(req)
        ? res.status(403).json({
            ok: false,
            error: 'No tiene permisos para realizar esta acción',
            required: neededPermissions,
          })
        : res.status(403).send('No tiene permisos para realizar esta acción');
    } catch (error) {
      next(error);
    }
  };
}

function attachLocals(req, res, next) {
  res.locals.login = !!(req.session && req.session.user);
  res.locals.name = req.session?.user?.username || 'Debe iniciar sesión';
  res.locals.role = req.session?.user?.rol || null;
  res.locals.permissions = req.session?.user?.permissions || [];
  res.locals.can = (permission) => hasAllPermissions(res.locals.permissions, [permission]);
  next();
}

module.exports = { isAuthenticated, requireRole, requirePermission, attachLocals };
