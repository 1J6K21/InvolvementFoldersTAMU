import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body;

    const payload = {
      model: "qwen2.5vl:latest",
      messages,
      stream: true,
    };

    const ollamaUrl = "http://127.0.0.1:11434/api/chat";

    const response = await fetch(ollamaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.body) {
      throw new Error("No response body from Ollama");
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder("utf-8");

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter((line) => line.trim().length > 0);

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.message && data.message.content) {
                controller.enqueue(new TextEncoder().encode(data.message.content));
              }
            } catch (e) {
              console.error("Error parsing JSON chunk from Ollama:", e);
            }
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      },
    });
  } catch (error: unknown) {
    console.error("API error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
