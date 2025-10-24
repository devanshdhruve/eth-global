import { TaskManagerAgent, Project } from '../taskmanager';

interface BatchProjectInput {
  projectId: string;
  taskCount: number;
  reward: number;
}

async function batchCreateProjects() {
  const agent = new TaskManagerAgent();
  await agent.initialize();

  // Batch project data
  const projectsToCreate: BatchProjectInput[] = [
    { projectId: "batch-proj-001", taskCount: 5, reward: 1000 },
    { projectId: "batch-proj-002", taskCount: 8, reward: 1500 },
    { projectId: "batch-proj-003", taskCount: 3, reward: 750 },
    { projectId: "batch-proj-004", taskCount: 12, reward: 3000 },
  ];

  console.log(`\n🔄 Creating ${projectsToCreate.length} projects in batch...\n`);

  const results: Project[] = [];
  
  for (const project of projectsToCreate) {
    try {
      const created = await agent.createProject(
        project.projectId,
        project.taskCount,
        project.reward
      );
      results.push(created);
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to create ${project.projectId}:`, error);
    }
  }

  console.log(`\n✅ Successfully created ${results.length} projects`);
  console.log('\nFinal Statistics:', agent.getStatistics());

  await agent.cleanup();
}

batchCreateProjects().catch(console.error);
