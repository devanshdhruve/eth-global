import { createProjectTopic, submitEventMessage, subscribeToTopic } from "../hederaService";

async function main() {
  console.log("🚀 Starting Hedera MVP test...");

  // 1️⃣ Create a project topic
  const topicId = await createProjectTopic();

  // 2️⃣ Subscribe in background
  subscribeToTopic(topicId);

  // 3️⃣ Wait for mirror node propagation (~10 s)
  await new Promise((r) => setTimeout(r, 10000));

  // 4️⃣ Submit a few sample messages
  await submitEventMessage(topicId, {
    event: "task_created",
    project_id: "demo_project",
    task_id: "T-001",
    timestamp: new Date().toISOString(),
  });

  await submitEventMessage(topicId, {
    event: "annotation_submitted",
    annotator_id: "A-101",
    task_id: "T-001",
    annotation_hash: "Qm…",
    timestamp: new Date().toISOString(),
  });

  console.log(`✅ Test complete. Listening for messages on topic ${topicId}`);
  process.stdin.resume(); // keep process alive
}

main().catch((e) => console.error("Test failed:", e));
