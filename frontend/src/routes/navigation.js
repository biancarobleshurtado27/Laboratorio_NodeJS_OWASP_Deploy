const publicRoutes = ['/', '/login', '/register', '/forgot-password'];
const protectedRoutes = ['/notes', '/profile'];
const adminRoutes = ['/admin'];
module.exports = { publicRoutes, protectedRoutes, adminRoutes };
