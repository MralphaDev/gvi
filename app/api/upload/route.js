// app/api/upload/route.js

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: "No file uploaded" }), { status: 400 });
    }

    // 转发给 Hostinger PHP
    const hostingerForm = new FormData();
    hostingerForm.append("file", file, file.name);

    const res = await fetch("https://goetvalves.eu/api-inv/upload.php", {
      method: "POST",
      body: hostingerForm,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Hostinger PHP error:", errorText);
      return new Response(JSON.stringify({ error: "Upload failed on server" }), { status: 500 });
    }

    const data = await res.json();

    if (data.url) {
      return new Response(JSON.stringify({ url: data.url }), { status: 200 });
    } else {
      return new Response(JSON.stringify({ error: data.error || "Unknown error" }), { status: 500 });
    }
  } catch (err) {
    console.error("Next.js upload error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}

// 关闭默认 bodyParser
export const config = {
  api: {
    bodyParser: false,
  },
};
