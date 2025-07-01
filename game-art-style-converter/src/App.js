import React, { useState } from "react";

const IMGBB_API_KEY = "90ae9dfd8119dd8c685f1c4c45b74f10";
const REPLICATE_API_TOKEN = process.env.REACT_APP_REPLICATE_API_TOKEN;

export default function App() {
  const [baseImage, setBaseImage] = useState(null);
  const [referenceImage, setReferenceImage] = useState(null);
  const [convertedImage, setConvertedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e, setter) => {
    const file = e.target.files[0];
    if (file) {
      setter(file);
    }
  };

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });

  const uploadToImgBB = async (file) => {
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
    else throw new Error("ImgBB upload failed");
  };

  const handleConvert = async () => {
    if (!baseImage || !referenceImage) {
      alert("Upload both images.");
      return;
    }

    setLoading(true);
    setError(null);
    setConvertedImage(null);

    try {
      const baseUrl = await uploadToImgBB(baseImage);
      const refUrl = await uploadToImgBB(referenceImage);

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

      // Polling
      while (
        prediction.status !== "succeeded" &&
        prediction.status !== "failed"
      ) {
        await new Promise((res) => setTimeout(res, 2000));
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
        setConvertedImage(prediction.output);
      } else {
        setError("Conversion failed.");
      }
    } catch (e) {
      setError("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "sans-serif", padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <h2>Game Art Style Converter</h2>

      <label>
        Base Image:
        <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setBaseImage)} />
      </label>
      {baseImage && <img src={URL.createObjectURL(baseImage)} alt="Base" style={{ width: "100%", marginTop: 10 }} />}

      <label style={{ marginTop: 20 }}>
        Reference Style Image:
        <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setReferenceImage)} />
      </label>
      {referenceImage && <img src={URL.createObjectURL(referenceImage)} alt="Reference" style={{ width: "100%", marginTop: 10 }} />}

      <button onClick={handleConvert} disabled={loading} style={{ marginTop: 20, width: "100%", padding: 10 }}>
        {loading ? "Converting..." : "Convert Image"}
      </button>

      {error && <p style={{ color: "red", marginTop: 10 }}>{error}</p>}

      {convertedImage && (
        <div style={{ marginTop: 30 }}>
          <h3>Converted Image:</h3>
          <img src={convertedImage} alt="Converted" style={{ width: "100%", marginTop: 10 }} />
          <a href={convertedImage} download="converted-image.png" style={{ display: "block", marginTop: 10 }}>
            Download
          </a>
        </div>
      )}
    </div>
  );
}
