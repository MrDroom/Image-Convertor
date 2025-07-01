import React, { useState } from "react";

const IMGBB_API_KEY = "90ae9dfd8119dd8c685f1c4c45b74f10";
const REPLICATE_API_TOKEN = process.env.REACT_APP_REPLICATE_API_TOKEN;

export default function App() {
  const [baseImage, setBaseImage] = useState(null);
  const [referenceImage, setReferenceImage] = useState(null);
  const [convertedImage, setConvertedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(null);

  const handleFileChange = (e, setter) => {
    const file = e.target.files[0];
    if (file) setter(file);
  };

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });

  const uploadToImgBB = async (file, label) => {
    setStatus(`Uploading ${label} image...`);
    const base64 = await toBase64(file);
    const formData = new FormData();
    formData.append("key", IMGBB_API_KEY);
    formData.append("image", base64.split(",")[1]);

    const res = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (data.success) return data.data.url;
    else throw new Error("Image upload failed");
  };

  const handleConvert = async () => {
    if (!baseImage || !referenceImage) {
      alert("Please upload both images.");
      return;
    }

    setLoading(true);
    setStatus("Starting conversion...");
    setError(null);
    setConvertedImage(null);

    try {
      const baseUrl = await uploadToImgBB(baseImage, "base");
      const refUrl = await uploadToImgBB(referenceImage, "reference");

      setStatus("Calling AI style transfer...");

      const res = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          Authorization: `Token ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version:
            "e5ee08e492bc65006e53f2f93e325b7880b10e6c268d36c1b2efbba271a7b6a1",
          input: {
            content: baseUrl,
            style: refUrl,
          },
        }),
      });

      let prediction = await res.json();

      while (
        prediction.status !== "succeeded" &&
        prediction.status !== "failed"
      ) {
        setStatus(`Processing... (${prediction.status})`);
        await new Promise((r) => setTimeout(r, 2000));
        const poll = await fetch(
          `https://api.replicate.com/v1/predictions/${prediction.id}`,
          {
            headers: {
              Authorization: `Token ${REPLICATE_API_TOKEN}`,
            },
          }
        );
        prediction = await poll.json();
      }

      if (prediction.status === "succeeded") {
        setConvertedImage(prediction.output);
        setStatus("Conversion complete!");
      } else {
        setError("Conversion failed.");
        setStatus("");
      }
    } catch (e) {
      setError("Error: " + e.message);
      setStatus("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🎮 Game Art Style Converter</h1>

      <div style={styles.card}>
        <label style={styles.label}>
          Base Image:
          <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setBaseImage)} />
        </label>
        {baseImage && (
          <img src={URL.createObjectURL(baseImage)} alt="Base" style={styles.preview} />
        )}

        <label style={styles.label}>
          Reference Art Style:
          <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setReferenceImage)} />
        </label>
        {referenceImage && (
          <img src={URL.createObjectURL(referenceImage)} alt="Reference" style={styles.preview} />
        )}

        <button onClick={handleConvert} disabled={loading} style={styles.button}>
          {loading ? "Converting..." : "🎨 Convert Image"}
        </button>

        {status && <p style={styles.status}>{status}</p>}
        {error && <p style={styles.error}>{error}</p>}

        {convertedImage && (
          <div style={{ marginTop: 30 }}>
            <h3>🎉 Result</h3>
            <img src={convertedImage} alt="Converted" style={styles.preview} />
            <a href={convertedImage} download="converted-image.png" style={styles.download}>
              ⬇️ Download
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: "Segoe UI, sans-serif",
    backgroundColor: "#f4f4f4",
    padding: "30px 15px",
    minHeight: "100vh",
    textAlign: "center",
  },
  title: {
    fontSize: "2rem",
    marginBottom: 30,
  },
  card: {
    background: "#fff",
    maxWidth: 500,
    margin: "0 auto",
    padding: 25,
    borderRadius: 10,
    boxShadow: "0 0 15px rgba(0,0,0,0.1)",
  },
  label: {
    display: "block",
    textAlign: "left",
    marginBottom: 10,
    fontWeight: "bold",
  },
  preview: {
    width: "100%",
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 20,
  },
  button: {
    width: "100%",
    padding: 12,
    fontSize: 16,
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: 5,
    cursor: "pointer",
  },
  status: {
    marginTop: 15,
    color: "#444",
  },
  error: {
    marginTop: 10,
    color: "red",
  },
  download: {
    display: "inline-block",
    marginTop: 15,
    padding: "10px 20px",
    backgroundColor: "#28a745",
    color: "#fff",
    textDecoration: "none",
    borderRadius: 5,
  },
};
