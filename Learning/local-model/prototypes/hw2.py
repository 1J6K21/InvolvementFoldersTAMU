import base64
import io
import json
import fitz
import requests
import gradio as gr
from PIL import Image

# ---------------- CONFIG ----------------

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "qwen2.5vl:latest"

MAX_PDF_PAGES = 5

# ---------------- IMAGE UTIL ----------------

def image_to_base64(img: Image.Image):
    buffer = io.BytesIO()
    img.convert("RGB").save(buffer, format="JPEG", quality=90)
    return base64.b64encode(buffer.getvalue()).decode()


# ---------------- PDF TEXT ----------------

def extract_pdf_text(path):

    doc = fitz.open(path)
    text_parts = []

    for page in doc:
        text_parts.append(page.get_text())

    return "\n".join(text_parts)


# ---------------- PDF IMAGES ----------------

def extract_pdf_images(path):

    doc = fitz.open(path)
    images = []

    # Extract embedded images
    for page in doc:
        for img in page.get_images(full=True):

            xref = img[0]
            base = doc.extract_image(xref)
            img_bytes = base["image"]

            images.append(base64.b64encode(img_bytes).decode())

    # If no embedded images, render page
    if not images:

        for i, page in enumerate(doc):

            if i >= MAX_PDF_PAGES:
                break

            pix = page.get_pixmap(dpi=200)
            img = Image.open(io.BytesIO(pix.tobytes("png")))

            images.append(image_to_base64(img))

    return images


# ---------------- OLLAMA STREAM ----------------

def stream_ollama(prompt, images):

    payload = {
        "model": MODEL,
        "prompt": prompt,
        "images": images,
        "stream": True
    }

    response = requests.post(OLLAMA_URL, json=payload, stream=True)

    partial = ""

    for line in response.iter_lines():

        if not line:
            continue

        try:
            data = json.loads(line.decode())
            token = data.get("response", "")
        except:
            token = ""

        partial += token
        yield partial


# ---------------- FILE PROCESS ----------------

def process_files(files):

    images = []
    pdf_text = ""

    if not files:
        return images, pdf_text

    for file in files:

        path_str = file if isinstance(file, str) else file.name
        path_lower = path_str.lower()

        # Image upload
        if path_lower.endswith(("png", "jpg", "jpeg", "webp")):

            img = Image.open(path_str)
            images.append(image_to_base64(img))

        # PDF upload
        elif path_lower.endswith(".pdf"):

            pdf_text += extract_pdf_text(path_str)
            images.extend(extract_pdf_images(path_str))

    return images, pdf_text


# ---------------- CHAT ----------------
def chat(message, files, history):

    if history is None:
        history = []

    images, pdf_text = process_files(files)

    prompt = f"""
You are a helpful homework assistant.

Explain solutions step-by-step.
Use LaTeX with $$ for equations.

Question:
{message}

PDF text:
{pdf_text}
"""

    # add user message
    history.append({
        "role": "user",
        "content": message
    })

    # create assistant placeholder
    assistant_msg = {
        "role": "assistant",
        "content": ""
    }

    history.append(assistant_msg)

    for partial in stream_ollama(prompt, images):

        assistant_msg["content"] = partial
        yield history
# ---------------- UI ----------------

with gr.Blocks(title="Local Homework AI") as app:

    gr.Markdown(
        """
# 📚 Local Homework Helper

Upload homework **images or PDFs** and ask questions.

Supports:
- 📄 PDFs
- 🖼 Images
- 📐 LaTeX math
- ⚡ Streaming answers
"""
    )

    chatbot = gr.Chatbot(height=500)

    file_upload = gr.File(
        label="Upload Images or PDFs",
        file_count="multiple",
        file_types=["image", ".pdf"]
    )

    msg = gr.Textbox(
        label="Question",
        placeholder="Ask about the homework..."
    )

    send = gr.Button("Send")

    send.click(
    chat,
    inputs=[msg, file_upload, chatbot],
    outputs=[chatbot]
).then(
    lambda: "",
    None,
    msg
)

app.queue()
app.launch(inbrowser=True)