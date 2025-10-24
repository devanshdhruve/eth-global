import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse/sync";

const PINATA_JWT = process.env.PINATA_JWT;
if (!PINATA_JWT) throw new Error("Missing PINATA_JWT env var");

export const POST = async (req: NextRequest) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const projectId = formData.get("projectId") as string;

    if (!file || !projectId)
      return NextResponse.json({ error: "Missing file or projectId" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileText = buffer.toString("utf-8");

    let tasks: { raw: any; cid?: string }[] = [];

    if (file.name.endsWith(".csv")) {
      const rows = parse(fileText, {
        skip_empty_lines: true,
        trim: true,
      });
      tasks = rows.map((row) => ({ raw: row, cid: undefined }));
    } else if (file.name.endsWith(".json")) {
      const json = JSON.parse(fileText);
      if (!Array.isArray(json))
        return NextResponse.json({ error: "JSON must be an array" }, { status: 400 });
      tasks = json.map((item) => ({ raw: item, cid: undefined }));
    } else {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    // Pin each task to Pinata
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const cid = await pinTaskToPinata({
        taskId: i + 1,
        projectId,
        payload: task.raw,
      });
      tasks[i].cid = cid;
    }

    return NextResponse.json({ projectId, tasks });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || err.toString() }, { status: 500 });
  }
};

const pinTaskToPinata = async (task: any) => {
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pinataOptions: { cidVersion: 1 },
      pinataMetadata: { name: `task-${task.taskId}` },
      pinataContent: task,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinata upload failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  return json.IpfsHash;
};
