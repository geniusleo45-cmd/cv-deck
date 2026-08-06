export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/vendor/:path*",
    "/admin/:path*",
  ],
};