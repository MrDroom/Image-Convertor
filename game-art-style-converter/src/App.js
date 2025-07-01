import React, { useState } from "react";

const REPLICATE_API_TOKEN = "r8_Ai96E5BAzIKRaSWWH4mI99aVgqs87qS43UkcC";

export default function App() {
  const [baseImage, setBaseImage] = useState(null);
  const [referenceImage, setReferenceImage] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (e) => reject(e);
    });

  const handleFileChange = (e, setter) => {
    const file = e.target.files[0];
    if (!file) return;
    setter(file);
  };

  const handleConvert = async () => {
    if (!baseImage || !referenceImage) {
      alert("Please upload both images.");
      return;
    }

    setLoading(true);
    setError(null);
    setResultImage(null);

    try {
      const baseBase64 = await toBase64(baseImage);
      const styleBase64 = await toBase64(referenceImage);

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
            content: baseBase64,
            style: styleBase64,
          },
        }),
      });

      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      let prediction = await res.json();

      while (
        prediction.status !== "succeeded" &&
        prediction.status !== "failed"
      ) {
        await new Promise((r) => setTimeout(r, 2000));
        const pollRes = await fetch(
          `https://api.replicate.com/v1/predictions/${prediction.id}`,
          {
            headers: { Authorization: `Token ${REPLICATE_API_TOKEN}` },
          }
        );
        if (!pollRes.ok) throw new Error("Polling failed");
        prediction = await pollRes.json();
      }

      if (prediction.status === "succeeded") {
        setResultImage(prediction.output);
      } else {
        setError("Conversion failed.");
      }
    } catch (e) {
      setError(e.message || "Error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        fontFamily: "sans-serif",
        maxWidth: 480,
        margin: "30px auto",
        padding: 20,
        border: "1px solid #ccc",
        borderRadius: 8,
      }}
    >
      <h2 style={{ textAlign: "center" }}>Simple Game Art Style Converter</h2>

      <div>
        <label>
          Base Image:
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, setBaseImage)}
          />
        </label>
        {baseImage && (
          <img
            src={URL.createObjectURL(baseImage)}
            alt="Base Preview"
            style={{ width: "100%", marginTop: 10, borderRadius: 6 }}
          />
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <label>
          Reference Style Image:
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, setReferenceImage)}
          />
        </label>
        {referenceImage && (
          <img
            src={URL.createObjectURL(referenceImage)}
            alt="Style Preview"
            style={{ width: "100%", marginTop: 10, borderRadius: 6 }}
          />
        )}
      </div>

      <button
        onClick={handleConvert}
        disabled={loading}
        style={{
          marginTop: 20,
          width: "100%",
          padding: 12,
          backgroundColor: loading ? "#aaa" : "#007bff",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: 16,
        }}
      >
        {loading ? "Converting..." : "Convert"}
      </button>

      {error && (
        <p style={{ color: "red", marginTop: 15, textAlign: "center" }}>
          {error}
        </p>
      )}

      {resultImage && (
        <div style={{ marginTop: 30 }}>
          <h3 style={{ textAlign: "center" }}>Converted Image</h3>
          <img
            src={resultImage}
            alt="Converted Result"
            style={{ width: "100%", borderRadius: 6, marginTop: 10 }}
          />
          <a
            href={resultImage}
            download="converted-game-art.png"
            style={{
              display: "block",
              marginTop: 12,
              padding: 10,
              textAlign: "center",
              backgroundColor: "#28a745",
              color: "white",
              borderRadius: 6,
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            Download Image
          </a>
        </div>
      )}
    </div>
  );
}