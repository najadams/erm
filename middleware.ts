import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: '/login',
  },
})

export const config = {
  matcher: [
    "/((?!api/auth|api/access-requests|login|request-access|uploads|_next/static|_next/image|favicon.ico).*)",
  ],
};
