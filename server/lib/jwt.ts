import { SignJWT, jwtVerify } from 'jose';

function secret(): Uint8Array {
  return new TextEncoder().encode(process.env.APP_JWT_SECRET!);
}

export async function signJwt(address: string): Promise<string> {
  return new SignJWT({ sub: address, role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret());
}

export async function verifyJwt(token: string): Promise<{ sub: string }> {
  const { payload } = await jwtVerify(token, secret());
  if (typeof payload.sub !== 'string') throw new Error('invalid sub');
  return { sub: payload.sub };
}
