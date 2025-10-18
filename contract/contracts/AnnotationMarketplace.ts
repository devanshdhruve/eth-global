// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.20;

// import "./IDataToken.sol";
// import "./IReputationSystem.sol";

// /**
//  * @title AnnotationMarketplace
//  * @notice A decentralized marketplace for data annotation tasks.
//  * This contract acts as a trustless escrow, managing projects, submissions,
//  * and payments between clients and annotators.
//  */
// contract AnnotationMarketplace {

//     //=============
//     // STATE VARIABLES
//     //=============

//     IDataToken public dataToken;
//     IReputationSystem public reputationSystem;

//     uint256 public projectCounter;

//     enum ProjectState { Open, Completed }

//     struct Project {
//         uint256 id;
//         address client;
//         string datasetURI;
//         uint256 taskReward;
//         uint256 tasksCompleted;
//         uint256 tasksTotal;
//         ProjectState state;
//         string hcsTopicId;
//     }

//     mapping(uint256 => Project) public projects;
//     mapping(uint256 => mapping(address => string)) public submissions;

//     //=============
//     // EVENTS
//     //=============

//     event ProjectCreated(uint256 indexed projectId, address indexed client, uint256 totalBounty);
//     event AnnotationSubmitted(uint256 indexed projectId, address indexed annotator, string submissionURI);
//     event AnnotationApproved(uint256 indexed projectId, address indexed annotator);

//     //=============
//     // CONSTRUCTOR
//     //=============

//     constructor(address _dataTokenAddress, address _reputationAddress) {
//         require(_dataTokenAddress != address(0), "Invalid token address");
//         require(_reputationAddress != address(0), "Invalid reputation address");
//         dataToken = IDataToken(_dataTokenAddress);
//         reputationSystem = IReputationSystem(_reputationAddress);
//     }

//     //=============
//     // CORE FUNCTIONS
//     //=============

//     function createProject(string memory _datasetURI, uint256 _tasksTotal, uint256 _taskReward,) external {
//         require(_tasksTotal > 0, "Must have at least one task");
//         require(_taskReward > 0, "Reward cannot be zero");

//         uint256 totalBounty = _tasksTotal * _taskReward;

//         // Pull the full bounty from the client into this contract for escrow.
//         // The client must have first called dataToken.approve(address(this), totalBounty)
//         bool success = dataToken.transferFrom(msg.sender, address(this), totalBounty);
//         require(success, "Token transfer for bounty failed");

//         projectCounter++;
//         uint256 newProjectId = projectCounter;

//         projects[newProjectId] = Project({
//             id: newProjectId,
//             client: msg.sender,
//             datasetURI: _datasetURI,
//             taskReward: _taskReward,
//             tasksCompleted: 0,
//             tasksTotal: _tasksTotal,
//             state: ProjectState.Open,
//             hcsTopicId: _hcsTopicId
//         });

//         emit ProjectCreated(newProjectId, msg.sender, totalBounty);
//     }

//     function submitAnnotation(uint256 _projectId, string memory _submissionURI) external {
//         require(projects[_projectId].id != 0, "Project does not exist");
//         require(projects[_projectId].state == ProjectState.Open, "Project is not active");
//         require(bytes(submissions[_projectId][msg.sender]).length == 0, "Already submitted");
        
//         submissions[_projectId][msg.sender] = _submissionURI;

//         emit AnnotationSubmitted(_projectId, msg.sender, _submissionURI);
//     }

//     function approveAnnotation(uint256 _projectId, address _annotator) external {
//         Project storage project = projects[_projectId];

//         require(msg.sender == project.client, "Only client can approve");
//         require(bytes(submissions[_projectId][_annotator]).length > 0, "No submission found");
        
//         // 1. Pay the annotator their reward from the escrow
//         dataToken.transfer(_annotator, project.taskReward);
        
//         // 2. Award reputation to the annotator (e.g., 10 points per task)
//         reputationSystem.awardReputation(_annotator, 10);

//         project.tasksCompleted++;

//         // Clear the submission to prevent double-approval and save gas
//         delete submissions[_projectId][_annotator];
            
//         // If all tasks are done, update the project state to Completed
//         if (project.tasksCompleted == project.tasksTotal) {
//             project.state = ProjectState.Completed;
//         }

//         emit AnnotationApproved(_projectId, _annotator);
//     }
// }