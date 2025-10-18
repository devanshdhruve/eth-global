// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../hedera/HederaTokenWrapper.sol";
import "../interface/IReputationSystem.sol";

contract AnnotationMarketplaceHTS is ReentrancyGuard, Ownable, HederaTokenWrapper {
    
    IReputationSystem public reputationSystem;
    address public asiTokenAddress;
    
    uint256 public projectCounter;
    uint256 public constant APPROVALS_NEEDED = 1;

    enum ProjectState { Open, Funded, InProgress, Completed, Cancelled }
    enum ApprovalStatus { Pending, Approved, Rejected }

    struct Project {
        uint256 id;
        address client;
        string datasetURI;
        uint256 taskReward;
        uint256 tasksCompleted;
        uint256 tasksTotal;
        ProjectState state;
        uint256 totalFunds;
        uint256 releasedFunds;
        uint256 createdAt;
        uint256 deadline;
        uint256 minReputation;
        uint256 reputationReward;
        bool fundsLocked;
    }

    struct Submission {
        string uri;
        uint256 submittedAt;
        ApprovalStatus status;
        mapping(address => bool) hasApproved;
        uint256 approvalCount;
    }

    mapping(uint256 => Project) public projects;
    mapping(uint256 => mapping(address => Submission)) public submissions;
    mapping(uint256 => address[]) public projectAnnotators;
    mapping(address => uint256[]) public clientProjects;

    event ProjectCreated(uint256 indexed projectId, address indexed client, string datasetURI, uint256 tasksTotal, uint256 taskReward);
    event ProjectFunded(uint256 indexed projectId, uint256 totalFunds);
    event ProjectStateChanged(uint256 indexed projectId, ProjectState newState);
    event AnnotationSubmitted(uint256 indexed projectId, address indexed annotator, string submissionURI);
    event AnnotationApproved(uint256 indexed projectId, address indexed annotator, uint256 amount);
    event FundsReleased(uint256 indexed projectId, address indexed annotator, uint256 amount);
    event EmergencyRefund(uint256 indexed projectId, address indexed client, uint256 amount);
    event ProjectCancelled(uint256 indexed projectId, address indexed client);

    modifier projectExists(uint256 projectId) {
        require(projects[projectId].id != 0, "Project does not exist");
        _;
    }

    modifier onlyClient(uint256 projectId) {
        require(msg.sender == projects[projectId].client, "Only client can call");
        _;
    }

    modifier projectInState(uint256 projectId, ProjectState state) {
        require(projects[projectId].state == state, "Invalid project state");
        _;
    }

    constructor(address _asiTokenAddress, address _reputationAddress) Ownable(msg.sender) {
        require(_asiTokenAddress != address(0), "Invalid token address");
        require(_reputationAddress != address(0), "Invalid reputation address");
        asiTokenAddress = _asiTokenAddress;
        reputationSystem = IReputationSystem(_reputationAddress);
    }

    function createProject(
        string calldata datasetURI,
        uint256 tasksTotal,
        uint256 taskReward,
        uint256 deadline,
        uint256 minReputation,
        uint256 reputationReward
    ) external returns (uint256) {
        require(tasksTotal > 0, "Must have at least one task");
        require(taskReward > 0, "Reward cannot be zero");
        require(deadline > block.timestamp, "Deadline must be in future");
        require(reputationReward > 0, "Reputation reward must be positive");
        
        projectCounter++;
        uint256 newProjectId = projectCounter;

        projects[newProjectId] = Project({
            id: newProjectId,
            client: msg.sender,
            datasetURI: datasetURI,
            taskReward: taskReward,
            tasksCompleted: 0,
            tasksTotal: tasksTotal,
            state: ProjectState.Open,
            totalFunds: 0,
            releasedFunds: 0,
            createdAt: block.timestamp,
            deadline: deadline,
            minReputation: minReputation,
            reputationReward: reputationReward,
            fundsLocked: false
        });

        clientProjects[msg.sender].push(newProjectId);
        emit ProjectCreated(newProjectId, msg.sender, datasetURI, tasksTotal, taskReward);
        emit ProjectStateChanged(newProjectId, ProjectState.Open);
        
        return newProjectId;
    }

    function depositFunds(uint256 projectId, int64 amount) 
        external 
        nonReentrant
        projectExists(projectId)
        onlyClient(projectId)
        projectInState(projectId, ProjectState.Open)
    {
        require(amount > 0, "Amount must be positive");
        Project storage project = projects[projectId];

        // Transfer HTS tokens from client to this contract (escrow)
        bool success = htsTransferFrom(asiTokenAddress, msg.sender, address(this), amount);
        require(success, "HTS transfer failed");

        // Update escrow balance
        project.totalFunds += uint256(uint64(amount));

        // Check if fully funded
        uint256 totalRequired = project.tasksTotal * project.taskReward;
        if (project.totalFunds >= totalRequired) {
            project.state = ProjectState.Funded;
            emit ProjectFunded(projectId, project.totalFunds);
            emit ProjectStateChanged(projectId, ProjectState.Funded);
        }
    }

    function submitAnnotation(uint256 projectId, string calldata submissionURI) 
        external 
        nonReentrant
        projectExists(projectId)
    {
        Project storage project = projects[projectId];
        
        require(
            project.state == ProjectState.Funded || project.state == ProjectState.InProgress,
            "Project not accepting submissions"
        );
        require(submissions[projectId][msg.sender].submittedAt == 0, "Already submitted");
        require(reputationSystem.getReputation(msg.sender) >= project.minReputation, "Insufficient reputation");
        
        // ADDED: Check escrow has enough funds for this task
        require(_getProjectAvailableFunds(projectId) >= project.taskReward, "Insufficient escrow funds");

        submissions[projectId][msg.sender].uri = submissionURI;
        submissions[projectId][msg.sender].submittedAt = block.timestamp;
        submissions[projectId][msg.sender].status = ApprovalStatus.Pending;

        projectAnnotators[projectId].push(msg.sender);

        if (project.state == ProjectState.Funded) {
            project.state = ProjectState.InProgress;
            emit ProjectStateChanged(projectId, ProjectState.InProgress);
        }

        if (!project.fundsLocked) {
            project.fundsLocked = true;
        }

        emit AnnotationSubmitted(projectId, msg.sender, submissionURI);
    }

    function approveAnnotation(uint256 projectId, address annotator) 
        external 
        nonReentrant
        projectExists(projectId)
        onlyClient(projectId)
    {
        Project storage project = projects[projectId];
        Submission storage submission = submissions[projectId][annotator];
    
        require(submission.submittedAt > 0, "No submission found");
        require(submission.status == ApprovalStatus.Pending, "Already processed");
        require(!submission.hasApproved[msg.sender], "Already approved");
        
        // ADDED: Verify escrow has funds before approval
        require(
            _getProjectAvailableFunds(projectId) >= project.taskReward,
            "Insufficient funds in escrow"
        );

        submission.hasApproved[msg.sender] = true;
        submission.approvalCount++;

        if (submission.approvalCount >= APPROVALS_NEEDED) {
            _releasePayment(projectId, annotator);
            submission.status = ApprovalStatus.Approved;
            project.tasksCompleted++;

            emit AnnotationApproved(projectId, annotator, project.taskReward);
        }

        if (project.tasksCompleted == project.tasksTotal) {
            project.state = ProjectState.Completed;
            emit ProjectStateChanged(projectId, ProjectState.Completed);
        }
    }

    /**
     * @notice Release payment from escrow using HTS transfer
     * @dev Follows CEI pattern: Checks-Effects-Interactions
     */
    function _releasePayment(uint256 projectId, address annotator) internal {
        Project storage project = projects[projectId];
        uint256 paymentAmount = project.taskReward;

        // CHECKS: Verify escrow has sufficient funds
        uint256 availableFunds = _getProjectAvailableFunds(projectId);
        require(availableFunds >= paymentAmount, "Insufficient escrow balance");

        // EFFECTS: Update state before external calls
        project.releasedFunds += paymentAmount;

        // INTERACTIONS: External calls last
        bool success = htsTransfer(asiTokenAddress, annotator, int64(uint64(paymentAmount)));
        require(success, "HTS payment failed");

        reputationSystem.awardReputation(annotator, project.reputationReward);

        emit FundsReleased(projectId, annotator, paymentAmount);
    }

    /**
     * @notice ADDED: Emergency refund for cancelled/expired projects
     * @dev Allows client to recover unused funds after deadline
     */
    function emergencyRefund(uint256 projectId) 
        external 
        nonReentrant
        projectExists(projectId)
        onlyClient(projectId)
    {
        Project storage project = projects[projectId];
        
        require(block.timestamp > project.deadline, "Deadline not reached");
        require(project.state != ProjectState.Completed, "Project already completed");

        uint256 refundAmount = _getProjectAvailableFunds(projectId);
        require(refundAmount > 0, "No funds to refund");

        // Update state
        project.state = ProjectState.Cancelled;
        
        // Transfer remaining escrow back to client
        bool success = htsTransfer(asiTokenAddress, project.client, int64(uint64(refundAmount)));
        require(success, "Refund transfer failed");

        emit EmergencyRefund(projectId, project.client, refundAmount);
        emit ProjectCancelled(projectId, project.client);
        emit ProjectStateChanged(projectId, ProjectState.Cancelled);
    }

    /**
     * @notice ADDED: Calculate available funds in escrow
     * @dev Available = Total deposited - Already released
     */
    function _getProjectAvailableFunds(uint256 projectId) internal view returns (uint256) {
        Project storage project = projects[projectId];
        return project.totalFunds - project.releasedFunds;
    }

    /**
     * @notice ADDED: Public view function for escrow balance
     */
    function getProjectAvailableFunds(uint256 projectId) 
        external 
        view 
        projectExists(projectId) 
        returns (uint256) 
    {
        return _getProjectAvailableFunds(projectId);
    }

    function getProjectDetails(uint256 projectId) 
        external 
        view 
        projectExists(projectId) 
        returns (
            uint256 id,
            address client,
            string memory datasetURI,
            uint256 taskReward,
            uint256 tasksCompleted,
            uint256 tasksTotal,
            ProjectState state,
            uint256 totalFunds,
            uint256 releasedFunds,
            uint256 availableFunds,
            uint256 createdAt,
            uint256 deadline,
            uint256 minReputation
        )
    {
        Project storage project = projects[projectId];
        return (
            project.id,
            project.client,
            project.datasetURI,
            project.taskReward,
            project.tasksCompleted,
            project.tasksTotal,
            project.state,
            project.totalFunds,
            project.releasedFunds,
            _getProjectAvailableFunds(projectId),
            project.createdAt,
            project.deadline,
            project.minReputation
        );
    }

    function getClientProjects(address client) external view returns (uint256[] memory) {
        return clientProjects[client];
    }
}