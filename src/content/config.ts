import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    updatedDate: z.date().optional(),
    topic: z.enum(["electronics", "ai", "robotics"]),
    tags: z.array(z.string()).optional(),
    heroImage: z.string().optional(),
    draft: z.boolean().optional()
  })
});

export const collections = { blog };
