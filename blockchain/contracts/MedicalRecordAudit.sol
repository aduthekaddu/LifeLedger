// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MedicalRecordAudit
 * @dev Immutable audit trail for medical record access
 */
contract MedicalRecordAudit {
    struct AccessLog {
        address accessor;
        bytes32 recordHash;
        uint256 timestamp;
        string accessType;
        string patientId;
        string doctorId;
        bool isEmergency;
    }
    
    struct ConsentLog {
        address patient;
        address doctor;
        uint256 grantedAt;
        uint256 expiresAt;
        bool isActive;
        string consentType;
    }
    
    // Mappings
    mapping(bytes32 => AccessLog[]) public recordAccess;
    mapping(bytes32 => ConsentLog) public consents;
    mapping(address => bool) public authorizedUsers;
    
    address public owner;
    uint256 public totalAccesses;
    uint256 public totalConsents;
    
    // Events
    event AccessLogged(
        bytes32 indexed recordId,
        address indexed accessor,
        uint256 timestamp,
        string accessType,
        bool isEmergency
    );
    
    event ConsentGranted(
        bytes32 indexed consentId,
        address indexed patient,
        address indexed doctor,
        uint256 expiresAt
    );
    
    event ConsentRevoked(
        bytes32 indexed consentId,
        address indexed patient,
        uint256 timestamp
    );
    
    constructor() {
        owner = msg.sender;
        authorizedUsers[msg.sender] = true;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    modifier onlyAuthorized() {
        require(authorizedUsers[msg.sender], "Not authorized");
        _;
    }
    
    /**
     * @dev Authorize a new user (backend service)
     */
    function authorizeUser(address user) public onlyOwner {
        authorizedUsers[user] = true;
    }
    
    /**
     * @dev Revoke user authorization
     */
    function revokeUser(address user) public onlyOwner {
        authorizedUsers[user] = false;
    }
    
    /**
     * @dev Log medical record access
     */
    function logAccess(
        bytes32 recordId,
        bytes32 recordHash,
        string memory accessType,
        string memory patientId,
        string memory doctorId,
        bool isEmergency
    ) public onlyAuthorized {
        recordAccess[recordId].push(AccessLog({
            accessor: msg.sender,
            recordHash: recordHash,
            timestamp: block.timestamp,
            accessType: accessType,
            patientId: patientId,
            doctorId: doctorId,
            isEmergency: isEmergency
        }));
        
        totalAccesses++;
        
        emit AccessLogged(
            recordId,
            msg.sender,
            block.timestamp,
            accessType,
            isEmergency
        );
    }
    
    /**
     * @dev Grant consent for doctor to access records
     */
    function grantConsent(
        bytes32 consentId,
        address patient,
        address doctor,
        uint256 duration,
        string memory consentType
    ) public onlyAuthorized {
        consents[consentId] = ConsentLog({
            patient: patient,
            doctor: doctor,
            grantedAt: block.timestamp,
            expiresAt: block.timestamp + duration,
            isActive: true,
            consentType: consentType
        });
        
        totalConsents++;
        
        emit ConsentGranted(
            consentId,
            patient,
            doctor,
            block.timestamp + duration
        );
    }
    
    /**
     * @dev Revoke consent
     */
    function revokeConsent(bytes32 consentId) public onlyAuthorized {
        require(consents[consentId].isActive, "Consent not active");
        
        consents[consentId].isActive = false;
        
        emit ConsentRevoked(
            consentId,
            consents[consentId].patient,
            block.timestamp
        );
    }
    
    /**
     * @dev Get all access logs for a record
     */
    function getAccessLogs(bytes32 recordId) 
        public 
        view 
        returns (AccessLog[] memory) 
    {
        return recordAccess[recordId];
    }
    
    /**
     * @dev Get access count for a record
     */
    function getAccessCount(bytes32 recordId) 
        public 
        view 
        returns (uint256) 
    {
        return recordAccess[recordId].length;
    }
    
    /**
     * @dev Check if consent is valid
     */
    function isConsentValid(bytes32 consentId) 
        public 
        view 
        returns (bool) 
    {
        ConsentLog memory consent = consents[consentId];
        return consent.isActive && block.timestamp < consent.expiresAt;
    }
    
    /**
     * @dev Get consent details
     */
    function getConsent(bytes32 consentId) 
        public 
        view 
        returns (ConsentLog memory) 
    {
        return consents[consentId];
    }
    
    /**
     * @dev Get system statistics
     */
    function getStats() 
        public 
        view 
        returns (uint256 accesses, uint256 consentsCount) 
    {
        return (totalAccesses, totalConsents);
    }
}
