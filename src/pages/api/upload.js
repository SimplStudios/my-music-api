// POST /api/upload — admin-only upload endpoint
// Protected by ADMIN_PASSWORD

import { supabase } from "@/lib/supabase";
import { IncomingForm } from "formidable";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: false, // we handle file parsing ourselves
  },
};

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB
    });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check admin password
  const password = req.headers["x-admin-password"];
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { fields, files } = await parseForm(req);

    const file = files.file?.[0] || files.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const title = (fields.title?.[0] || fields.title || file.originalFilename).replace(/\.[^/.]+$/, "");
    const tagsRaw = fields.tags?.[0] || fields.tags || "";
    const tags = tagsRaw
      ? tagsRaw.split(",").map((t) => t.trim().toLowerCase())
      : [];

    // Read file buffer
    const fileBuffer = fs.readFileSync(file.filepath);
    const ext = path.extname(file.originalFilename || ".mp3");
    const fileName = `${Date.now()}-${title.replace(/\s+/g, "-").toLowerCase()}${ext}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("music")
      .upload(fileName, fileBuffer, {
        contentType: file.mimetype || "audio/mpeg",
        upsert: false,
      });

    if (uploadError) {
      return res.status(500).json({ error: uploadError.message });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("music")
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Insert metadata into database
    const { data: track, error: dbError } = await supabase
      .from("tracks")
      .insert({
        title,
        file_url: publicUrl,
        file_name: fileName,
        tags,
        file_size: file.size,
        mime_type: file.mimetype,
      })
      .select()
      .single();

    if (dbError) {
      return res.status(500).json({ error: dbError.message });
    }

    return res.status(201).json({ track });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
