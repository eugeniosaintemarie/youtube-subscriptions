import { NextRequest, NextResponse } from "next/server";

const isBypassedPath = (pathname: string): boolean => {
  return (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api/oauth/callback")
  );
};

export function middleware(request: NextRequest) {
  if (isBypassedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const expectedUser = process.env.PRIVATE_ACCESS_USER;
  const expectedPass = process.env.PRIVATE_ACCESS_PASS;

  if (!expectedUser || !expectedPass) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Basic ")) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Private App"' }
    });
  }

  const encoded = authHeader.split(" ")[1];
  const decoded = Buffer.from(encoded, "base64").toString("utf-8");
  const [username, password] = decoded.split(":");

  if (username !== expectedUser || password !== expectedPass) {
    return new NextResponse("Invalid credentials", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Private App"' }
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"]
};
