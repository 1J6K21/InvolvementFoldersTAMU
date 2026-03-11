# PDF Referencing and Chat Implementation Details

This document outlines how the PDF referencing and chat functionality is implemented in this project, providing a bridge between raw PDF documents and AI-driven interactions.

## 1. Document Processing Architecture

### Parsing
We use **`pdfjs-dist`** on the client side to extract both text and visual information from PDF files before sending them to the AI.
*   **Text Extraction**: The `parsePdf` function in `ChatWindow.tsx` iterates through each page of the document. It uses `page.getTextContent()` to extract text strings and joins them, adding structural headers like `--- Slide N ---`.
*   **Visual Extraction**: To leverage the multimodal capabilities of models like **Qwen 2.5 VL**, we render the first 5 pages of the PDF to a thumbnail/canvas and convert them to Base64 images. These are sent along with the text to provide layout and visual context.

### Indexing
This project currently uses **client-side episodic indexing** rather than a persistent Vector Database (like Pinecone or Chroma).
*   **In-Memory Context**: Extracted text and images are stored in the React component's state (`attachments`) when a file is uploaded.
*   **Context Lifetime**: The context exists for the duration of the current chat message processing. When a message is sent, the extracted data is injected directly into the LLM prompt.

### Chunking
The chunking strategy is **structural/page-based**:
*   PDF content is categorized by page (referred to as "Slides" in the prompt).
*   This allows the LLM to refer to specific sections of the document by page number.
*   There is no overlapping or fixed-length chunking; we rely on the LLM's large context window to process the aggregated text.

---

## 2. The Retrieval & Chat Pipeline

### Prompt Engineering
The PDF context is injected as a "pinned" system-like entry at the start of the user's latest message. 
*   **Format**: 
    ```text
    [Attached Documents Content]
    === Document: filename.pdf ===
    --- Slide 1 ---
    [Extracted Text...]
    === End of filename.pdf ===
    [End of attached content]

    [User's actual question]
    ```

### Referencing Mechanism
We use a custom **Mention System** to bridge the gap between AI text and document references.
*   **Signal**: The UI supports mentioning files using the `@filename` syntax.
*   **Auto-highlighting**: A custom `processContent` function uses Regex to find references to attached filenames and converts them into specialized markdown links: `[@filename](mention://filename|color)`.
*   **Rendering**: The `ReactMarkdown` component intercepts these `mention://` links and renders them as interactive, colored pills that match the file's UI color.

### LLM Choice
*   **Model**: `qwen2.5vl:latest` running locally via **Ollama**.
*   **Input Types**: Supports both native text and native image input (Base64). This allows the model to "see" the PDF layout while "reading" the extracted text.

---

## 3. Frontend Implementation

### PDF Rendering
*   **thumbnails**: We use a hidden `canvas` element and `pdfjs-dist` to render the first page (or several) as a JPEG data URL for display in the chat attachment bar.
*   **Library**: `pdfjs-dist` for parsing and thumbnail generation.

### Reference Highlighting
*   References are handled via the `mention://` protocol in the generated markdown.
*   When the LLM (or user) types `@filename`, the UI transforms it into a stylized span.
*   Future implementation can easily extend this to navigate to specific pages by adding a `page` parameter to the mention URI.

### State Management
*   **Chat History**: Managed via `useState<Message[]>(messages)`.
*   **Concurrent Requests**: A `isPending` flag and a `processMessage` queue ensure that messages sent while the AI is busy are queued and processed sequentially.
*   **Abort Logic**: `AbortController` is used to stop generation immediately if the user clicks the "Stop" or "Skip" button.

---

## 4. Code Snippets & API

### Backend: API Route (`/api/generate/route.ts`)
This route acts as a proxy to the local Ollama instance.

```typescript
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const payload = {
      model: "qwen2.5vl:latest",
      messages,
      stream: true,
    };

    const response = await fetch("http://127.0.0.1:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.body) throw new Error("No response body");

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
          const lines = chunk.split("\n").filter(l => l.trim().length > 0);
          for (const line of lines) {
            const data = JSON.parse(line);
            if (data.message?.content) {
              controller.enqueue(new TextEncoder().encode(data.message.content));
            }
          }
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    return NextResponse.json({ error: "API error" }, { status: 500 });
  }
}
```

### Frontend: PDF Parsing Logic (`ChatWindow.tsx`)

```typescript
const parsePdf = async (file: File) => {
  const pdfjsLib = await import("pdfjs-dist");
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  let text = "";
  const images: string[] = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    text += `\n--- Slide ${i} ---\n` + 
            textContent.items.map((item: any) => item.str).join(" ") + "\n";
    
    // Multimedia: Capture page as image for vision model
    if (i <= 5) {
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: ctx, viewport }).promise;
        images.push(canvas.toDataURL("image/jpeg", 0.9).split(",")[1]);
      }
    }
  }
  return { text, images };
};
```

---

## specialized Dependencies
*   `pdfjs-dist`: Essential for client-side PDF cracking.
*   `react-markdown` + `remark-math` + `rehype-katex`: Required for rendering the LLM's math and structured output.
*   `framer-motion`: For the premium UI animations (pills, chat bubbles).
*   `lucide-react`: For the iconography system.
