import base64
import io
import json
import fitz
import requests
import gradio as gr
from pdf2image import convert_from_path
from PIL import Image

# ---------------- CONFIG ----------------
OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "qwen2.5vl:latest"

# ---------------- UTILITIES ----------------

def image_to_base64(img: Image.Image):
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def extract_pdf_text(path):
    doc = fitz.open(path)
    text = ""
    for page in doc:
        text += page.get_text()
    return text


def extract_pdf_images(path, max_pages=5):
    images = []
    doc = fitz.open(path)

    # Try extracting embedded images first
    for page in doc:
        for img in page.get_images(full=True):
            xref = img[0]
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]
            images.append(base64.b64encode(image_bytes).decode("utf-8"))

    # Fallback: render pages if no embedded images
    if not images:
        pages = convert_from_path(path)
        for i, page in enumerate(pages):
            if i >= max_pages:
                break
            images.append(image_to_base64(page))

    return images


# ---------------- OLLAMA STREAMING ----------------

def stream_model(prompt, images):
    payload = {
        "model": MODEL,
        "prompt": prompt,
        "images": images,
        "stream": True
    }

    with requests.post(OLLAMA_URL, json=payload, stream=True) as r:
        partial = ""

        for line in r.iter_lines():
            if not line:
                continue

            try:
                data = json.loads(line.decode("utf-8"))
                token = data.get("response", "")
            except:
                token = ""

            partial += token
            yield partial


# ---------------- CHAT FUNCTION ----------------

def chat(message, files, history):

    if history is None:
        history = []

    images = []
    pdf_text = ""

    if files:
        for file in files:
            path = file.name

            if path.lower().endswith(("png", "jpg", "jpeg")):
                img = Image.open(path)
                images.append(image_to_base64(img))

            elif path.lower().endswith("pdf"):
                pdf_text += extract_pdf_text(path)
                images.extend(extract_pdf_images(path))

    full_prompt = f"""
You are a helpful homework assistant.
Explain solutions step-by-step and use LaTeX for equations (wrap in $$).

User question:
{message}

PDF text:
{pdf_text}
"""

    history.append({"role": "user", "content": message})
    history.append({"role": "assistant", "content": ""})

    for partial in stream_model(full_prompt, images):
        history[-1]["content"] = partial
        yield history, ""


# ---------------- UI ----------------

with gr.Blocks(title="Local Homework AI") as app:

    gr.Markdown("""
# Local Homework Helper
Upload homework images or PDFs and ask questions.

Supports:
- 📄 PDFs
- 🖼 Images
- 📐 LaTeX math rendering
- ⚡ Streaming responses
""")

    chatbot = gr.Chatbot(height=500, type="messages")

    file_upload = gr.File(
        file_count="multiple",
        file_types=["image", ".pdf"],
        label="Upload Images or PDFs"
    )

    msg = gr.Textbox(
        placeholder="Ask about the homework...",
        label="Prompt"
    )

    send = gr.Button("Send")

    send.click(
        chat,
        inputs=[msg, file_upload, chatbot],
        outputs=[chatbot, msg]
    )

app.queue()
app.launch(inbrowser=True)