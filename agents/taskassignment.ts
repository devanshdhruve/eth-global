import { Client } from "@hashgraph/sdk";
import { TaskManagerAgent, Project } from "./taskmanager";
import { AnnotatorAgent, HcsProjectMessage } from "./annotator";


export class TaskAssignmentAgent {
  constructor(private taskManager: TaskManagerAgent, private annotators: AnnotatorAgent[]) {}

  assignTasks() {
    const projects = this.taskManager.listProjects();

    projects.forEach((project) => {
      this.annotators.forEach((annotator) => {
        if ((annotator as any).screeningStatus !== "pass") return;
    
        const hcsMessage: HcsProjectMessage = {
          event: "assigned_project",
          projectId: project.projectId,
          taskCount: project.taskCount,
          reward: project.reward
        };
    
        annotator.availableProjects.push(hcsMessage);
    
        // Update project status
        project.status = "assigned";
        console.log(`[TaskAssignment] Assigned ${project.projectId} to ${annotator.name}`);
      });
    });    
  }
}
