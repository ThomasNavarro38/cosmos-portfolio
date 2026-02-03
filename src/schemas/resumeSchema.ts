import { z } from 'zod';

export const ContactSchema = z.object({
  name: z.string(),
  title: z.string(),
  email: z.string().email(),
  location: z.string(),
  socials: z.array(z.object({
    platform: z.string(),
    url: z.string().url(),
    icon: z.string().optional(),
  })),
});

export const SkillSchema = z.object({
  name: z.string(),
  category: z.enum(['Technical', 'Creative', 'Magical', 'Other']),
  proficiency: z.number().min(0).max(1), // 0 to 1 scale
});

export const ImpactAreaSchema = z.object({
  title: z.string(),
  description: z.string(),
  metrics: z.array(z.string()).optional(),
});

export const ProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  technologies: z.array(z.string()),
  url: z.string().url().optional(),
  repo: z.string().url().optional(),
  image: z.string().optional(),
  impact: z.array(z.string()).optional(),
});

export const ResumeSchema = z.object({
  contact: ContactSchema,
  summary: z.string(),
  skills: z.array(SkillSchema),
  impactAreas: z.array(ImpactAreaSchema),
  projects: z.array(ProjectSchema),
});

export type Contact = z.infer<typeof ContactSchema>;
export type Skill = z.infer<typeof SkillSchema>;
export type ImpactArea = z.infer<typeof ImpactAreaSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type ResumeData = z.infer<typeof ResumeSchema>;
