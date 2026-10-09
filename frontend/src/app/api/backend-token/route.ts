import { getServerSession } from "next-auth";
import { createHmac } from "crypto";
import { authOptions } from "@/lib/auth";

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  const secret = process.env.BACKEND_AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  if (!email || !secret) {
    return Response.json({ message: "Creator authentication required" }, { status: 401 });
  }

  const payload = encode(JSON.stringify({ sub: email, exp: Math.floor(Date.now() / 1000) + 300 }));
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return Response.json({ token: `${payload}.${signature}` });
}
