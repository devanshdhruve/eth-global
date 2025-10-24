import { createTopics } from "../hedera/hcs/topics";
import { TaskManagerAgent } from "./taskmanager";
import { AnnotatorAgent } from "./annotator";
import { ScreeningAgent } from "./screening";
import { TaskAssignmentAgent } from "./taskassignment";
import { PaymentAgent } from "./payment";

async function main() {
  const topicIds = await createTopics();

  // Core agents
  const taskManager = new TaskManagerAgent(topicIds);
  const screening = new ScreeningAgent(topicIds);

  // Create projects
  await taskManager.createProject("dataset_001", 50, 5);
  await taskManager.createProject("dataset_002", 30, 3);

  // Annotators
  const annotator1 = new AnnotatorAgent("Alice", topicIds);
  annotator1.subscribeToProjects();
  (annotator1 as any).screeningStatus = await screening.evaluateAnnotator("Alice", 80);

  const annotator2 = new AnnotatorAgent("Bob", topicIds);
  annotator2.subscribeToProjects();
  (annotator2 as any).screeningStatus = await screening.evaluateAnnotator("Bob", 60);

  const annotators = [annotator1, annotator2];

  // Task Assignment
  const taskAssignment = new TaskAssignmentAgent(taskManager, annotators);
  taskAssignment.assignTasks();

  // Simulate task submission
  await annotator1.submitTask("dataset_001");

  // Payment
  const paymentAgent = new PaymentAgent(topicIds);
  // For demo, simulate HBAR account IDs
  await paymentAgent.payAnnotator("0.0.1234", 5, "dataset_001");
}

main();
