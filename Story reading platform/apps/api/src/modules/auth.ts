import { Router, type Request, type Response, type NextFunction } from 'express';
import { OAuth2Client, CodeChallengeMethod } from 'google-auth-library';
import { rateLimit } from 'express-rate-limit';
import { loginSchema, registerSchema, type UserDto } from '@storyhaven/contracts';
import { User, Session, OAuthState } from '../models.js';
import { config } from '../config.js';
import { ApiError, hash, hashPassword, randomToken, verifyPassword } from '../lib.js';

declare global {
  namespace Express {
    interface Request {
      user?: UserDto;
    }
  }
}
export const userDto = (u: InstanceType<typeof User>): UserDto => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role as UserDto['role'],
  matureConfirmed: !!u.matureConfirmedAt,
});
const cookieOptions = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};
export async function issueSession(user: InstanceType<typeof User>, res: Response) {
  const token = randomToken();
  await Session.create({
    userId: user._id,
    tokenHash: hash(token),
    expiresAt: new Date(Date.now() + 7 * 86400000),
  });
  res.cookie('sh_session', token, { ...cookieOptions, maxAge: 7 * 86400000 });
}
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.sh_session;
  if (typeof token === 'string') {
    const session = await Session.findOne({
      tokenHash: hash(token),
      expiresAt: { $gt: new Date() },
    });
    if (session) {
      const user = await User.findOne({ _id: session.userId, status: 'active' });
      if (user) req.user = userDto(user);
    }
    res.setHeader('Cache-Control', 'private, no-store');
  }
  next();
}
export function requireUser(req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (!req.user) throw new ApiError(401, 'AUTH_REQUIRED', 'Please sign in to continue.');
  next();
}
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireUser(req, res, () => {
    if (req.user?.role !== 'admin')
      throw new ApiError(403, 'FORBIDDEN', 'Administrator access required.');
    next();
  });
}
export function checkOrigin(req: Request, _res: Response, next: NextFunction) {
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    (req.headers.origin !== config.WEB_ORIGIN || req.headers['x-requested-with'] !== 'Storyhaven')
  )
    throw new ApiError(403, 'CSRF', 'Request origin could not be verified.');
  next();
}
export const authRouter = Router();
const loginLimit = rateLimit({
  windowMs: 15 * 60000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: { code: 'RATE_LIMIT', message: 'Too many sign-in attempts. Please try again later.' },
  },
});
authRouter.get('/me', requireUser, (req, res) => res.json(req.user));
authRouter.post('/register', loginLimit, async (req, res) => {
  const data = registerSchema.parse(req.body);
  const user = await User.create({
    name: data.name,
    email: data.email,
    passwordHash: await hashPassword(data.password),
  });
  await issueSession(user, res);
  res.status(201).json(userDto(user));
});
authRouter.post('/login', loginLimit, async (req, res) => {
  const data = loginSchema.parse(req.body);
  const user = await User.findOne({ email: data.email, status: 'active' }).select('+passwordHash');
  // Perform equal-cost password work even if the account does not exist.
  const stored = user?.passwordHash ?? `${'0'.repeat(32)}:${'0'.repeat(128)}`;
  if (!(await verifyPassword(data.password, stored)) || !user)
    throw new ApiError(401, 'LOGIN_FAILED', 'Email or password is incorrect.');
  if (req.cookies.sh_session) await Session.deleteOne({ tokenHash: hash(req.cookies.sh_session) });
  await issueSession(user, res);
  res.json(userDto(user));
});
authRouter.post('/logout', async (req, res) => {
  if (req.cookies.sh_session) await Session.deleteOne({ tokenHash: hash(req.cookies.sh_session) });
  res.clearCookie('sh_session', cookieOptions);
  res.status(204).end();
});
authRouter.get('/providers', (_req, res) =>
  res.json({ google: !!(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) }),
);
const google = () =>
  new OAuth2Client(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    config.GOOGLE_REDIRECT_URI,
  );
authRouter.get('/google', loginLimit, async (_req, res) => {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET)
    throw new ApiError(
      503,
      'GOOGLE_UNCONFIGURED',
      'Google Sign-In is not configured yet. Please use email sign-in.',
    );
  const state = randomToken(),
    nonce = randomToken();
  const client = google();
  const pkce = await client.generateCodeVerifierAsync();
  await OAuthState.create({
    tokenHash: hash(state),
    nonce,
    verifier: pkce.codeVerifier,
    expiresAt: new Date(Date.now() + 10 * 60000),
  });
  res.cookie('sh_oauth', state, { ...cookieOptions, maxAge: 10 * 60000 });
  res.redirect(
    client.generateAuthUrl({
      scope: ['openid', 'email', 'profile'],
      state,
      nonce,
      code_challenge: pkce.codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
      prompt: 'select_account',
    }),
  );
});
authRouter.get('/google/callback', loginLimit, async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  const state = req.query.state,
    code = req.query.code;
  if (typeof state !== 'string' || typeof code !== 'string' || state !== req.cookies.sh_oauth)
    return res.redirect('/sign-in?error=google');
  res.clearCookie('sh_oauth', cookieOptions);
  const challenge = await OAuthState.findOneAndDelete({
    tokenHash: hash(state),
    expiresAt: { $gt: new Date() },
  });
  if (!challenge) return res.redirect('/sign-in?error=google');
  try {
    const client = google();
    const result = await client.getToken({ code, codeVerifier: challenge.verifier ?? undefined });
    if (!result.tokens.id_token) throw new Error('Missing token');
    const ticket = await client.verifyIdToken({
      idToken: result.tokens.id_token,
      audience: config.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload() as ReturnType<typeof ticket.getPayload> & {
      nonce?: string;
    };
    if (!payload || !payload.email_verified || !payload.email || payload.nonce !== challenge.nonce)
      throw new Error('Invalid identity');
    let user = await User.findOne({ googleSub: payload.sub });
    if (!user) {
      // Never silently link an existing password account by an email claim.
      if (await User.exists({ email: payload.email.toLowerCase() }))
        return res.redirect('/sign-in?error=existing-account');
      user = await User.create({
        name: (payload.name || payload.email.split('@')[0]).slice(0, 80),
        email: payload.email.toLowerCase(),
        googleSub: payload.sub,
      });
    }
    if (user.status !== 'active') return res.redirect('/sign-in?error=unavailable');
    if (req.cookies.sh_session)
      await Session.deleteOne({ tokenHash: hash(req.cookies.sh_session) });
    await issueSession(user, res);
    return res.redirect('/library');
  } catch {
    return res.redirect('/sign-in?error=google');
  }
});
