import { z } from 'zod';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier');
export const slug = z
  .string()
  .trim()
  .min(2)
  .max(100)
  .regex(/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u, 'Use letters, numbers and hyphens');
export const loginSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase().trim()),
  password: z.string().min(12).max(128),
});
export const registerSchema = loginSchema.extend({ name: z.string().trim().min(2).max(80) });
export const storySchema = z.object({
  title: z.string().trim().min(2).max(200),
  slug,
  authorName: z.string().trim().min(2).max(100),
  prologue: z.string().trim().max(12000),
  status: z.enum(['draft', 'published']),
  classification: z.enum(['clean', 'mature']),
  taxonomyIds: z.array(objectId).max(30),
  coverKey: z
    .string()
    .regex(/^[a-f\d-]+\.webp$/)
    .nullable()
    .optional(),
});
export const previewSchema = z
  .object({ mode: z.enum(['percentage', 'words']), value: z.number().int().min(0).max(10000) })
  .refine((v) => v.mode !== 'percentage' || v.value < 100, 'Percentage must be below 100');
const date = z.iso.datetime().nullable();
export const chapterSchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    slug,
    status: z.enum(['draft', 'scheduled', 'published']),
    publishAt: date,
    accessType: z.enum(['free', 'premium']),
    freeAt: date,
    body: z.string().trim().min(1).max(200000),
    preview: previewSchema.default({ mode: 'percentage', value: 20 }),
  })
  .refine(
    (v) => v.status !== 'scheduled' || v.publishAt !== null,
    'Scheduled chapters need a publication date',
  );
export const taxonomySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug,
  facet: z.enum(['genre', 'subgenre', 'trope', 'descriptor', 'tag']),
  parentId: objectId.nullable(),
});
export const progressSchema = z.object({
  chapterId: objectId,
  blockAnchor: z.number().int().min(0).max(100000),
});
export type UserDto = {
  id: string;
  name: string;
  email: string;
  role: 'reader' | 'admin';
  matureConfirmed: boolean;
};
export type TaxonomyDto = {
  id: string;
  name: string;
  slug: string;
  facet: string;
  parentId: string | null;
};
export type StoryDto = {
  id: string;
  title: string;
  slug: string;
  authorName: string;
  prologue: string;
  classification: string;
  status: string;
  coverKey: string | null;
  taxonomyIds: string[];
  createdAt: string;
  score?: number;
};
export type ChapterDto = {
  id: string;
  storyId: string;
  title: string;
  slug: string;
  order: number;
  status: string;
  accessType: string;
  publishAt: string | null;
  freeAt: string | null;
  preview: { mode: 'percentage' | 'words'; value: number };
};
export type Page<T> = { items: T[]; page: number; pages: number; total: number };
