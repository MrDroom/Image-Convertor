import React, { useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage } from "react-konva";
import useImage from "use-image";

const REPLICATE_API_TOKEN = process.env.REACT_APP_REPLICATE_API_TOKEN;

export default function App() {
  const [imageUrl, setImageUrl] = useState(null);
  const [maskData, setMaskData] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [resultUrl, setResultUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef();
  const canvasRef = useRef();

  const [image] = useImage(imageUrl);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMouseDown = (e) => {
    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    setMaskData([...maskData, pointerPosition]);
  };

  const drawMaskCanvas = () => {
    const stage = canvasRef.current.getStage();
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = stage.width();
    maskCanvas.height = stage.height();
    const ctx = maskCanvas.getContext("2d");
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    ctx.fillStyle = "white";
    maskData.forEach((pos) => {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
      ctx.fill();
    });

    return maskCanvas.toDataURL("image/png");
  };

  const handleSubmit = async () => {
    if (!imageUrl || !prompt || maskData.length === 0) {
      alert("Please upload image, draw mask, and write prompt.");
      return;
    }

    setLoading(true);
    setResultUrl(null);

    const maskUrl = drawMaskCanvas();

    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "c7cdb0e5b9b915f9b1c8c66e089a486a76c81c44a5fc173926c9503f1d7b03c0",
        input: {
          image: imageUrl,
          mask: maskUrl,
          prompt: prompt,
        },
      }),
    });

    let prediction = await response.json();

    while (
      prediction.status !== "succeeded" &&
      prediction.status !== "failed"
    ) {
      await new Promise((r) => setTimeout(r, 2000));
      const pollRes = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: {
            Authorization: `Token ${REPLICATE_API_TOKEN}`,
          },
        }
      );
      prediction = await pollRes.json();
    }

    if (prediction.status === "succeeded") {
      setResultUrl(prediction.output);
    } else {
      alert("Inpainting failed.");
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>🎨 AI Image Editor (Inpainting)</h1>

      <input type="file" accept="image/*" onChange={handleImageUpload} ref={fileInputRef} />
      <br /><br />
      <textarea
        rows="3"
        placeholder="Enter your edit prompt (e.g. add sword, remove tree)..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        style={{ width: "100%", maxWidth: 500, padding: 10 }}
      />
      <br /><br />

      {image && (
        <div>
          <p>🖌️ Draw over the area you want to edit (click to mark mask points)</p>
          <Stage
            width={500}
            height={(image.height / image.width) * 500}
            onMouseDown={handleMouseDown}
            ref={canvasRef}
            style={{ border: "1px solid #ccc" }}
          >
            <Layer>
              <KonvaImage image={image} />
              {maskData.map((pos, idx) => (
                <KonvaImage
                  key={idx}
                  x={pos.x - 10}
                  y={pos.y - 10}
                  width={20}
                  height={20}
                  image={generateWhiteCircle()}
                />
              ))}
            </Layer>
          </Stage>
        </div>
      )}

      <br />
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? "Processing..." : "Submit to AI"}
      </button>

      {resultUrl && (
        <div style={{ marginTop: 20 }}>
          <h3>✨ Edited Image</h3>
          <img src={resultUrl} alt="Result" style={{ maxWidth: "100%" }} />
          <br />
          <a href={resultUrl} download="edited-image.png">⬇️ Download</a>
        </div>
      )}
    </div>
  );
}

function generateWhiteCircle() {
  const canvas = document.createElement("canvas");
  canvas.width = 20;
  canvas.height = 20;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(10, 10, 10, 0, Math.PI * 2);
  ctx.fill();
  const img = new window.Image();
  img.src = canvas.toDataURL("image/png");
  return img;
}