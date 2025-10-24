import { TaskManagerAgent } from './taskmanager';

async function main() {
  console.log('🚀 Starting Hedera Task Manager Agent...\n');

  // Initialize agent
  const agent = new TaskManagerAgent();
  await agent.initialize();

  try {
    // Example 1: Create multiple projects
    console.log('\n📋 Example 1: Creating Projects\n');
    await agent.createProject("proj-001", 5, 1000);
    await agent.createProject("proj-002", 3, 750);
    await agent.createProject("proj-003", 10, 2500);

    // Example 2: List open projects
    console.log('\n📋 Example 2: Listing Open Projects\n');
    const openProjects = agent.listProjects("open");
    console.log(`Found ${openProjects.length} open projects:`);
    openProjects.forEach(p => {
      console.log(`  - ${p.projectId}: ${p.taskCount} tasks, ${p.reward} HBAR`);
    });

    // Example 3: Update project status
    console.log('\n📋 Example 3: Updating Project Status\n');
    await agent.updateProjectStatus("proj-001", "assigned");
    await agent.updateProjectStatus("proj-002", "completed");

    // Example 4: Get statistics
    console.log('\n📋 Example 4: Project Statistics\n');
    const stats = agent.getStatistics();
    console.log('Statistics:', stats);

    // Example 5: List projects by status
    console.log('\n📋 Example 5: Projects by Status\n');
    console.log('Open:', agent.listProjects("open").length);
    console.log('Assigned:', agent.listProjects("assigned").length);
    console.log('Completed:', agent.listProjects("completed").length);

  } catch (error) {
    console.error('❌ Error in main execution:', error);
  } finally {
    // Cleanup
    await agent.cleanup();
  }
}

// Run the examples
main();
