import { TaskManagerAgent } from './taskmanager';

async function main() {
  console.log('🚀 Starting Hedera Task Manager Agent...\n');

  // Initialize agent
  const agent = new TaskManagerAgent();
  await agent.initialize();

  try {
    // Example 1: Create multiple projects
    console.log('\n📋 Example 1: Creating Projects\n');
    
    // Create sample tasks with IPFS hashes
    const proj001Tasks = [
      { taskId: 1, ipfsHash: "QmXYZ1..." },
      { taskId: 2, ipfsHash: "QmXYZ2..." },
      { taskId: 3, ipfsHash: "QmXYZ3..." },
      { taskId: 4, ipfsHash: "QmXYZ4..." },
      { taskId: 5, ipfsHash: "QmXYZ5..." }
    ];
    
    const proj002Tasks = [
      { taskId: 1, ipfsHash: "QmABC1..." },
      { taskId: 2, ipfsHash: "QmABC2..." },
      { taskId: 3, ipfsHash: "QmABC3..." }
    ];
    
    const proj003Tasks = Array.from({ length: 10 }, (_, i) => ({
      taskId: i + 1,
      ipfsHash: `QmDEF${i + 1}...`
    }));
    
    await agent.createProject("proj-001", 5, 1000, proj001Tasks, "Annotate medical images for diagnosis");
    await agent.createProject("proj-002", 3, 750, proj002Tasks, "Label sentiment in customer reviews");
    await agent.createProject("proj-003", 10, 2500, proj003Tasks, "Classify traffic signs for autonomous vehicles");

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
