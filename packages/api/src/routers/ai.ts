import OpenAI from "openai";
import { z } from "zod";
import { env } from "@node-red-project/env/server";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../index";
import { buildSystemPrompt } from "./ai-prompts";

const openaiClient = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  ...(env.OPENAI_BASE_URL ? { baseURL: env.OPENAI_BASE_URL } : {}),
});

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(2000),
});

export const aiRouter = router({
  chat: protectedProcedure
    .input(
      z.object({
        mode: z.enum(["guidance", "qa", "analysis"]),
        messages: z.array(messageSchema).min(1).max(50),
        measurementContext: z.string().max(10000).optional(),
      }),
    )
    .mutation(async function* ({ input }) {
      const systemPrompt = buildSystemPrompt(input.mode, input.measurementContext);

      let stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;

      try {
        stream = await openaiClient.chat.completions.create({
          model: "gpt-4o",
          stream: true,
          messages: [
            { role: "system", content: systemPrompt },
            ...input.messages,
          ],
        });
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to connect to AI service",
          cause: err,
        });
      }

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          yield delta;
        }
      }
    }),
});
