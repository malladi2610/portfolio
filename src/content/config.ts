import { defineCollection, z } from "astro:content";

const topicEnum = z.enum(["electronics", "ai", "robotics"]);

const blog = defineCollection({
  type: "content",
  schema: z
    .object({
      title: z.string(),
      description: z.string(),
      pubDate: z.date(),
      updatedDate: z.date().optional(),
      topic: topicEnum.optional(),
      topics: z.array(topicEnum).min(1).optional(),
      tags: z.array(z.string()).optional(),
      heroImage: z.string().optional(),
      showHeroOnPost: z.boolean().optional(),
      draft: z.boolean().optional()
    })
    .refine((data) => Boolean(data.topic) || Boolean(data.topics?.length), {
      message: "A blog post must define either topic or topics."
    })
});

export const collections = { blog };
