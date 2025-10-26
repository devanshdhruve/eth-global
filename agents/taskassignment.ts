import { Client, TopicMessageQuery, TopicMessage } from "@hashgraph/sdk";
import { TaskManagerAgent, Project } from "./taskmanager";
import { AnnotatorAgent, HcsProjectMessage } from "./annotator";
import { client } from "../hedera/hcs/topics";

export class TaskAssignmentAgent {
  constructor(private taskManager: TaskManagerAgent, private annotators: AnnotatorAgent[], private topicIds: Record<string,string>) {
    // subscribe to screening results so we can react immediately
    this.subscribeToScreeningResults();
  }

  /**
   * Subscribe to screening-results HCS topic and handle pass/fail outcomes
   */
  subscribeToScreeningResults() {
    const screeningTopic = this.topicIds["screening-results"];
    if (!screeningTopic) {
      console.warn("[TaskAssignment] No screening-results topic id provided");
      return;
    }

    new TopicMessageQuery()
      .setTopicId(screeningTopic)
      .subscribe(
        client as unknown as Client,
        (message: TopicMessage | null, error: Error | null) => {
          if (error) {
            console.error("[TaskAssignment] Screening subscription error:", error);
          }
        },
        async (message: TopicMessage) => {
          if (!message || !message.contents) return;
          try {
            // message.contents may be a Uint8Array in some SDKs; decode accordingly
            const contentsStr = typeof (message.contents as any) === "string"
              ? (message.contents as unknown as string)
              : typeof TextDecoder !== "undefined"
                ? new TextDecoder().decode(message.contents as Uint8Array)
                : Buffer.from(message.contents as unknown as Buffer).toString();

            const payload = JSON.parse(contentsStr);
            // Expected payload: { type: 'SCREENING_RESULT', projectId, userId, score, status }
            if (payload.type !== "SCREENING_RESULT") return;

            const { projectId, userId, status } = payload;

            // find annotator with matching walletAddress
            const annotator = this.annotators.find(a => a.walletAddress === userId || a.name === userId);
            const project = this.taskManager.getProject(projectId);

            if (!project) {
              console.warn(`[TaskAssignment] Received screening for unknown project ${projectId}`);
              return;
            }

            if (!annotator) {
              console.warn(`[TaskAssignment] Received screening for unknown user ${userId}`);
              return;
            }

            if (status === "passed") {
              annotator.screeningStatus = "pass";

              const hcsMessage: HcsProjectMessage = {
                event: "assigned_project",
                projectId: project.projectId,
                taskCount: project.taskCount,
                reward: project.reward
              };

              annotator.availableProjects.push(hcsMessage);
              // Update project status via task manager
              this.taskManager.updateProjectStatus(projectId, "assigned");
              console.log(`[TaskAssignment] Assigned ${project.projectId} to ${annotator.name}`);

            } else {
              // screening failed — mark annotator and project failed assignment
              annotator.screeningStatus = "fail";
              await this.taskManager.updateProjectStatus(projectId, "failed");
              console.log(`[TaskAssignment] Annotator ${annotator.name} failed screening for ${projectId}. Project marked failed.`);
            }
          } catch (err) {
            console.error("[TaskAssignment] Failed to parse screening message:", err);
          }
        }
      );
  }

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
