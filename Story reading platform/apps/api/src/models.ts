import { Schema, model } from 'mongoose';
const ref = (name: string) => ({ type: Schema.Types.ObjectId, ref: name, required: true });
const options = { timestamps: true } as const;
const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, select: false },
    googleSub: String,
    role: { type: String, enum: ['reader', 'admin'], default: 'reader' },
    status: { type: String, enum: ['active', 'suspended', 'deleted'], default: 'active' },
    matureConfirmedAt: Date,
  },
  options,
);
userSchema.index(
  { googleSub: 1 },
  { unique: true, partialFilterExpression: { googleSub: { $type: 'string' } } },
);
export const User = model('User', userSchema);
const sessionSchema = new Schema(
  {
    userId: ref('User'),
    tokenHash: { type: String, unique: true },
    expiresAt: { type: Date, required: true },
  },
  options,
);
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const Session = model('Session', sessionSchema);
const oauthSchema = new Schema({
  tokenHash: { type: String, unique: true },
  nonce: String,
  verifier: String,
  expiresAt: Date,
});
oauthSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const OAuthState = model('OAuthState', oauthSchema);
const storySchema = new Schema(
  {
    title: String,
    slug: { type: String, unique: true },
    authorName: String,
    prologue: String,
    status: { type: String, default: 'draft' },
    classification: { type: String, default: 'clean' },
    taxonomyIds: [{ type: Schema.Types.ObjectId, ref: 'Taxonomy' }],
    coverKey: { type: String, default: null },
    searchTokens: [String],
  },
  options,
);
storySchema.index({ status: 1, createdAt: -1 });
storySchema.index({ searchTokens: 1, status: 1 });
storySchema.index({ taxonomyIds: 1, status: 1 });
export const Story = model('Story', storySchema);
const chapterSchema = new Schema(
  {
    storyId: ref('Story'),
    title: String,
    slug: String,
    order: Number,
    status: { type: String, default: 'draft' },
    publishAt: { type: Date, default: null },
    accessType: { type: String, default: 'free' },
    freeAt: { type: Date, default: null },
    preview: {
      mode: { type: String, default: 'percentage' },
      value: { type: Number, default: 20 },
    },
  },
  options,
);
chapterSchema.index({ storyId: 1, slug: 1 }, { unique: true });
chapterSchema.index({ storyId: 1, order: 1 });
chapterSchema.index({ status: 1, publishAt: 1 });
export const Chapter = model('Chapter', chapterSchema);
export const ChapterContent = model(
  'ChapterContent',
  new Schema(
    { chapterId: { ...ref('Chapter'), unique: true }, body: { type: String, required: true } },
    options,
  ),
);
const taxonomySchema = new Schema(
  {
    name: String,
    slug: String,
    facet: String,
    parentId: { type: Schema.Types.ObjectId, ref: 'Taxonomy', default: null },
  },
  options,
);
taxonomySchema.index({ facet: 1, slug: 1 }, { unique: true });
export const Taxonomy = model('Taxonomy', taxonomySchema);
const librarySchema = new Schema({ userId: ref('User'), storyId: ref('Story') }, options);
librarySchema.index({ userId: 1, storyId: 1 }, { unique: true });
export const Library = model('Library', librarySchema);
const bookmarkSchema = new Schema(
  { userId: ref('User'), chapterId: ref('Chapter'), blockAnchor: { type: Number, default: 0 } },
  options,
);
bookmarkSchema.index({ userId: 1, chapterId: 1 }, { unique: true });
export const Bookmark = model('Bookmark', bookmarkSchema);
const progressSchema = new Schema(
  { userId: ref('User'), storyId: ref('Story'), chapterId: ref('Chapter'), blockAnchor: Number },
  options,
);
progressSchema.index({ userId: 1, storyId: 1 }, { unique: true });
export const Progress = model('Progress', progressSchema);
const unlockSchema = new Schema(
  { userId: ref('User'), chapterId: ref('Chapter'), grantedAt: Date },
  options,
);
unlockSchema.index({ userId: 1, chapterId: 1 }, { unique: true });
export const Unlock = model('Unlock', unlockSchema);
const readSchema = new Schema(
  { userId: ref('User'), storyId: ref('Story'), chapterId: ref('Chapter'), day: String },
  options,
);
readSchema.index({ userId: 1, chapterId: 1, day: 1 }, { unique: true });
readSchema.index({ createdAt: 1 });
export const ReadEvent = model('ReadEvent', readSchema);
export const Audit = model(
  'Audit',
  new Schema({ actorId: ref('User'), action: String, targetId: String }, options),
);
