import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { teamApi, friendApi, getStoredUser } from '../services/api';
import './NexusTeam.css';

export default function NexusTeamModal({ isOpen, onClose, initialTab = 'roster', onTeamUpdated }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'roster', 'create', 'friends', 'invites'
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null); // { type: 'error'|'success', msg: '' }

  // Team state
  const [teamData, setTeamData] = useState(null); // { hasTeam: bool, team: object, isLeader: bool }
  const [currentUser, setCurrentUser] = useState(getStoredUser());

  // Add Member state
  const [addMemberQuery, setAddMemberQuery] = useState('');
  const [searchTargetUser, setSearchTargetUser] = useState(null);
  const [validatingUser, setValidatingUser] = useState(false);

  // Create Team state
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');

  // Invitations state
  const [invitations, setInvitations] = useState([]);

  // Friends state
  const [friendsList, setFriendsList] = useState([]);
  const [friendRequests, setFriendRequests] = useState({ incoming: [], outgoing: [] });
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);

  // Confirmation modal state
  const [confirmDialog, setConfirmDialog] = useState(null); // { title, message, onConfirm }

  useEffect(() => {
    if (isOpen) {
      setCurrentUser(getStoredUser());
      loadTeam();
      loadInvitations();
      loadFriends();
      loadRequests();
    }
  }, [isOpen]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const showAlert = (msg, type = 'success') => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 4000);
  };

  const loadTeam = async () => {
    try {
      const res = await teamApi.getMyTeam();
      setTeamData(res);
      if (onTeamUpdated) onTeamUpdated(res);
    } catch (e) {
      console.error(e);
    }
  };

  const loadInvitations = async () => {
    try {
      const res = await teamApi.getMyInvitations();
      setInvitations(res || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadFriends = async () => {
    try {
      const res = await friendApi.getFriends();
      setFriendsList(res || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadRequests = async () => {
    try {
      const res = await friendApi.getRequests();
      setFriendRequests(res || { incoming: [], outgoing: [] });
    } catch (e) {
      console.error(e);
    }
  };

  // Add Member validations
  const handleValidateMember = async (e) => {
    e?.preventDefault();
    if (!addMemberQuery.trim()) return;
    setValidatingUser(true);
    setSearchTargetUser(null);
    try {
      const res = await teamApi.validateUser(addMemberQuery.trim());
      if (res.exists) {
        setSearchTargetUser(res);
      } else {
        showAlert(res.message || 'User not found in database.', 'error');
      }
    } catch (err) {
      showAlert(err.message, 'error');
    } finally {
      setValidatingUser(false);
    }
  };

  const handleAddMemberSubmit = async () => {
    if (!searchTargetUser || !teamData?.team) return;
    setLoading(true);
    try {
      const targetIdentifier = searchTargetUser.user.uid || searchTargetUser.user.id;
      const res = await teamApi.addMember(teamData.team.id, targetIdentifier);
      showAlert(`Added ${searchTargetUser.user.username} to team!`, 'success');
      setAddMemberQuery('');
      setSearchTargetUser(null);
      await loadTeam();
    } catch (err) {
      showAlert(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Create Team
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setLoading(true);
    try {
      await teamApi.createTeam(newTeamName.trim(), newTeamDesc.trim());
      showAlert(`Team "${newTeamName.trim()}" created successfully!`, 'success');
      setNewTeamName('');
      setNewTeamDesc('');
      await loadTeam();
      setActiveTab('roster');
    } catch (err) {
      showAlert(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Respond Invitation
  const handleRespondInvitation = async (invitationId, accept) => {
    setLoading(true);
    try {
      await teamApi.respondInvitation(invitationId, accept);
      showAlert(accept ? 'Joined team successfully!' : 'Declined invitation.', 'success');
      await loadInvitations();
      await loadTeam();
      if (accept) setActiveTab('roster');
    } catch (err) {
      showAlert(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Role Changes
  const handleUpdateRole = (targetUserId, targetUsername, newRole) => {
    setConfirmDialog({
      title: 'CONFIRM ROLE CHANGE',
      message: `Are you sure you want to change ${targetUsername}'s role to ${newRole}?`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setLoading(true);
        try {
          await teamApi.updateMemberRole(teamData.team.id, targetUserId, newRole);
          showAlert(`Updated role for ${targetUsername} to ${newRole}.`, 'success');
          await loadTeam();
        } catch (err) {
          showAlert(err.message, 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Remove Member
  const handleRemoveMember = (targetUserId, targetUsername) => {
    setConfirmDialog({
      title: 'CONFIRM REMOVE MEMBER',
      message: `Are you sure you want to remove ${targetUsername} from the team? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setLoading(true);
        try {
          await teamApi.removeMember(teamData.team.id, targetUserId);
          showAlert(`Removed ${targetUsername} from the team.`, 'success');
          await loadTeam();
        } catch (err) {
          showAlert(err.message, 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Friends Actions
  const handleSearchFriends = async (e) => {
    e?.preventDefault();
    if (!friendSearchQuery.trim()) return;
    try {
      const res = await friendApi.searchUsers(friendSearchQuery.trim());
      setUserSearchResults(res || []);
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

  const handleSendFriendRequest = async (target) => {
    try {
      await friendApi.sendRequest(target);
      showAlert('Friend request dispatched!', 'success');
      await handleSearchFriends();
      await loadRequests();
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

  const handleRespondFriendRequest = async (requestId, accept) => {
    try {
      await friendApi.respondRequest(requestId, accept);
      showAlert(accept ? 'Friend request accepted!' : 'Friend request declined.', 'success');
      await loadRequests();
      await loadFriends();
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

  const handleCancelFriendRequest = async (requestId) => {
    try {
      await friendApi.cancelRequest(requestId);
      showAlert('Friend request canceled.', 'success');
      await loadRequests();
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

  const handleInviteFriendToTeam = async (target) => {
    if (!teamData?.team) {
      showAlert('You must belong to a team to invite friends.', 'error');
      return;
    }
    try {
      await teamApi.inviteMember(teamData.team.id, target);
      showAlert('Team invitation sent to friend!', 'success');
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

  if (!isOpen) return null;

  const isLeader = teamData?.isLeader;
  const team = teamData?.team;
  const hasTeam = teamData?.hasTeam && team;

  return (
    <div className="nexus-overlay" onClick={onClose}>
      <motion.div
        className="nexus-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ duration: 0.3 }}
      >
        {/* HEADER */}
        <div className="nexus-header">
          <div className="nexus-header-left">
            <span className="nexus-badge">CHAIN55 NEXUS</span>
            <h2 className="nexus-title">TEAM & COLLABORATION MANAGEMENT</h2>
          </div>
          <button className="nexus-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* ALERTS */}
        {alert && (
          <div className={`nexus-alert ${alert.type}`}>
            <span>{alert.type === 'error' ? '⚠️ ' : '✓ '}{alert.msg}</span>
            <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }} onClick={() => setAlert(null)}>✕</button>
          </div>
        )}

        {/* TABS */}
        <div className="nexus-tabs">
          <button
            className={`nexus-tab ${activeTab === 'roster' ? 'active' : ''}`}
            onClick={() => setActiveTab('roster')}
          >
            {hasTeam ? `TEAM: ${team.name}` : 'MY TEAM'}
          </button>
          {!hasTeam && (
            <button
              className={`nexus-tab ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => setActiveTab('create')}
            >
              CREATE TEAM
            </button>
          )}
          <button
            className={`nexus-tab ${activeTab === 'invites' ? 'active' : ''}`}
            onClick={() => setActiveTab('invites')}
          >
            INVITATIONS {invitations.length > 0 && `(${invitations.length})`}
          </button>
          <button
            className={`nexus-tab ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            FRIENDS & DISCOVERY {friendRequests.incoming.length > 0 && `(+${friendRequests.incoming.length})`}
          </button>
        </div>

        {/* BODY */}
        <div className="nexus-body">
          {/* ═══ TAB 1: TEAM ROSTER & ROLES ═══ */}
          {activeTab === 'roster' && (
            <div>
              {hasTeam ? (
                <div>
                  <div className="team-hero-banner">
                    <div>
                      <div className="team-hero-title">{team.name}</div>
                      <div className="team-hero-sub">
                        <span className="team-meta-pill">TEAM ID: {team.id}</span>
                        <span className="team-meta-pill">LEADER: {team.leaderUsername} ({team.leaderUid || 'N/A'})</span>
                        <span className="team-meta-pill">STATUS: {team.status}</span>
                        <span className="team-meta-pill">MEMBERS: {team.members.length}</span>
                      </div>
                      {team.description && (
                        <p style={{ marginTop: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                          {team.description}
                        </p>
                      )}
                    </div>
                    {isLeader && (
                      <div>
                        <span style={{ fontSize: '10px', color: '#ffaa00', letterSpacing: '2px', fontWeight: 700 }}>
                          ★ YOU ARE TEAM LEADER
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ADD MEMBER SECTION (LEADER ONLY) */}
                  {isLeader && (
                    <div style={{ background: 'rgba(12, 16, 26, 0.9)', border: '1px solid rgba(0, 229, 255, 0.2)', padding: '20px', marginBottom: '24px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '2px', color: '#00e5ff', marginBottom: '12px', textTransform: 'uppercase' }}>
                        + ADD REGISTERED MEMBER TO TEAM
                      </div>
                      <form onSubmit={handleValidateMember} className="cyber-search-box">
                        <input
                          type="text"
                          className="cyber-search-input"
                          placeholder="ENTER REGISTERED USER UID OR USERNAME (e.g. US000002, admin, sarah)"
                          value={addMemberQuery}
                          onChange={(e) => setAddMemberQuery(e.target.value)}
                        />
                        <button type="submit" className="nexus-btn-primary" disabled={validatingUser}>
                          {validatingUser ? 'SEARCHING...' : 'VALIDATE USER ↗'}
                        </button>
                      </form>

                      {/* VALIDATED USER PREVIEW CARD */}
                      {searchTargetUser && (
                        <div className="user-preview-card">
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', letterSpacing: '1px' }}>
                              {searchTargetUser.user.username}
                            </div>
                            <div style={{ fontFamily: 'Courier New', fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                              UID: <strong style={{ color: '#00e5ff' }}>{searchTargetUser.user.uid}</strong> • SYSTEM ROLE: {searchTargetUser.user.role}
                            </div>
                            {searchTargetUser.alreadyInTeam ? (
                              <div style={{ color: '#ff0055', fontSize: '11px', marginTop: '6px' }}>
                                ⚠️ User is already in team: <strong>{searchTargetUser.currentTeamName}</strong>
                              </div>
                            ) : (
                              <div style={{ color: '#00e5ff', fontSize: '11px', marginTop: '6px' }}>
                                ✓ Eligible for addition to {team.name}
                              </div>
                            )}
                          </div>
                          <div>
                            <button
                              type="button"
                              className="nexus-btn-primary"
                              disabled={searchTargetUser.alreadyInTeam || loading}
                              onClick={handleAddMemberSubmit}
                            >
                              CONFIRM & ADD MEMBER ↗
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* MEMBERS LIST */}
                  <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', letterSpacing: '2px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>
                      TEAM ROSTER ({team.members.length} MEMBERS)
                    </span>
                  </div>

                  <div className="team-roster-grid">
                    {team.members.map((member, idx) => {
                      const roleClass = (member.role || 'MEMBER').toLowerCase();
                      const isMemberLeader = member.role === 'LEADER' || member.userId === team.leaderId;
                      const isMe = currentUser?.id === member.userId || currentUser?.uid === member.uid;

                      return (
                        <div key={idx} className="member-box">
                          <div className="member-top">
                            <div>
                              <div className="member-name">
                                {member.username} {isMe && <span style={{ fontSize: '9px', opacity: 0.6 }}>(YOU)</span>}
                              </div>
                              <div className="member-uid">UID: {member.uid || 'N/A'}</div>
                            </div>
                            <span className={`role-badge ${roleClass}`}>
                              {member.role || 'MEMBER'}
                            </span>
                          </div>

                          {/* ROLE CONTROLS (VISIBLE ONLY TO TEAM LEADER) */}
                          {isLeader && !isMemberLeader && (
                            <div className="member-actions">
                              {/* PROMOTE / DEMOTE CONTROLS */}
                              {member.role !== 'ADMIN' && (
                                <button
                                  className="action-btn"
                                  onClick={() => handleUpdateRole(member.userId, member.username, 'ADMIN')}
                                >
                                  SET ADMIN
                                </button>
                              )}
                              {member.role !== 'COMMANDER' && (
                                <button
                                  className="action-btn"
                                  onClick={() => handleUpdateRole(member.userId, member.username, 'COMMANDER')}
                                >
                                  SET COMMANDER
                                </button>
                              )}
                              {member.role !== 'MEMBER' && (
                                <button
                                  className="action-btn"
                                  onClick={() => handleUpdateRole(member.userId, member.username, 'MEMBER')}
                                >
                                  DEMOTE TO MEMBER
                                </button>
                              )}
                              <button
                                className="action-btn danger"
                                onClick={() => handleRemoveMember(member.userId, member.username)}
                              >
                                REMOVE
                              </button>
                            </div>
                          )}

                          {/* IF REGULAR MEMBER (SELF-LEAVE) */}
                          {!isLeader && isMe && (
                            <div className="member-actions">
                              <button
                                className="action-btn danger"
                                onClick={() => handleRemoveMember(member.userId, member.username)}
                              >
                                LEAVE TEAM
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="nexus-empty-state">
                  <div className="nexus-empty-icon">🛡️</div>
                  <div className="nexus-empty-title">NO TEAM AFFILIATION FOUND</div>
                  <div className="nexus-empty-desc">
                    You have not yet formed or joined a team in the Chain55 distributed consensus network.
                    Create your own team or accept an invitation to start collaborating.
                  </div>
                  <div style={{ display: 'flex', gap: '14px', justifyContent: 'center' }}>
                    <button className="nexus-btn-primary" onClick={() => setActiveTab('create')}>
                      CREATE A TEAM ↗
                    </button>
                    <button className="nexus-btn-secondary" onClick={() => setActiveTab('invites')}>
                      VIEW INVITATIONS ({invitations.length})
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ TAB 2: CREATE TEAM ═══ */}
          {activeTab === 'create' && (
            <div style={{ maxWidth: '580px', margin: '0 auto' }}>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', letterSpacing: '2px', color: '#00e5ff', textTransform: 'uppercase' }}>
                  ESTABLISH NEW NEXUS TEAM
                </h3>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6' }}>
                  As the creator, you will automatically become the authorized <strong>TEAM LEADER</strong> with complete role administration,
                  member recruitment, and command authority.
                </p>
              </div>

              <form onSubmit={handleCreateTeam}>
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '10px', letterSpacing: '2px', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
                    TEAM DESIGNATION (NAME) *
                  </label>
                  <input
                    type="text"
                    className="cyber-search-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    placeholder="e.g. ALPHA CONSENSUS SQUAD"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '10px', letterSpacing: '2px', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
                    MISSION OBJECTIVE / DESCRIPTION
                  </label>
                  <textarea
                    className="cyber-search-input"
                    style={{ width: '100%', boxSizing: 'border-box', minHeight: '90px', resize: 'vertical' }}
                    placeholder="Describe your team's consensus goals and research domain..."
                    value={newTeamDesc}
                    onChange={(e) => setNewTeamDesc(e.target.value)}
                  />
                </div>

                <button type="submit" className="nexus-btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                  {loading ? 'CREATING TEAM...' : 'FOUND TEAM & BECOME LEADER ↗'}
                </button>
              </form>
            </div>
          )}

          {/* ═══ TAB 3: INVITATIONS ═══ */}
          {activeTab === 'invites' && (
            <div>
              <div style={{ fontSize: '12px', letterSpacing: '2px', color: 'rgba(255,255,255,0.7)', marginBottom: '16px', textTransform: 'uppercase' }}>
                PENDING TEAM INVITATIONS ({invitations.length})
              </div>

              {invitations.length === 0 ? (
                <div className="nexus-empty-state">
                  <div className="nexus-empty-icon">✉️</div>
                  <div className="nexus-empty-title">NO PENDING INVITATIONS</div>
                  <div className="nexus-empty-desc">
                    You currently have no incoming team recruitment invitations. Ask a Team Leader to recruit your UID: <strong>{currentUser?.uid}</strong>.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {invitations.map((inv) => (
                    <div key={inv.id} className="user-preview-card" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{inv.teamName}</div>
                        <div style={{ fontFamily: 'Courier New', fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                          INVITED BY: <strong>{inv.inviterUsername}</strong> • STATUS: {inv.status}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          className="nexus-btn-primary"
                          onClick={() => handleRespondInvitation(inv.id, true)}
                          disabled={loading}
                        >
                          ACCEPT INVITATION ↗
                        </button>
                        <button
                          className="action-btn danger"
                          onClick={() => handleRespondInvitation(inv.id, false)}
                          disabled={loading}
                        >
                          DECLINE
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ TAB 4: FRIENDS & DISCOVERY ═══ */}
          {activeTab === 'friends' && (
            <div>
              {/* SEARCH USERS BOX */}
              <div style={{ background: 'rgba(12, 16, 26, 0.9)', border: '1px solid rgba(0, 229, 255, 0.2)', padding: '20px', marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '2px', color: '#00e5ff', marginBottom: '12px', textTransform: 'uppercase' }}>
                  DISCOVER REGISTERED USERS & SEND FRIEND REQUESTS
                </div>
                <form onSubmit={handleSearchFriends} className="cyber-search-box">
                  <input
                    type="text"
                    className="cyber-search-input"
                    placeholder="SEARCH BY USERNAME OR UID (e.g. US..., admin, pavan)"
                    value={friendSearchQuery}
                    onChange={(e) => setFriendSearchQuery(e.target.value)}
                  />
                  <button type="submit" className="nexus-btn-primary">
                    SEARCH ↗
                  </button>
                </form>

                {/* SEARCH RESULTS */}
                {userSearchResults.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
                    {userSearchResults.map((usr) => (
                      <div key={usr.id} className="user-preview-card" style={{ padding: '14px 18px' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{usr.username}</div>
                          <div style={{ fontFamily: 'Courier New', fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                            UID: <strong>{usr.uid}</strong> {usr.teamName && `• TEAM: ${usr.teamName}`}
                          </div>
                        </div>
                        <div>
                          {usr.isFriend ? (
                            <span style={{ fontSize: '10px', color: '#00e5ff', fontFamily: 'Courier New', letterSpacing: '1px' }}>
                              ✓ CONNECTED FRIEND
                            </span>
                          ) : usr.isPending ? (
                            <span style={{ fontSize: '10px', color: '#ffaa00', fontFamily: 'Courier New', letterSpacing: '1px' }}>
                              ⏳ REQUEST {usr.pendingDirection}
                            </span>
                          ) : (
                            <button
                              className="action-btn"
                              onClick={() => handleSendFriendRequest(usr.uid || usr.id)}
                            >
                              + SEND FRIEND REQUEST
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* INCOMING REQUESTS */}
              {friendRequests.incoming.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '11px', letterSpacing: '2px', color: '#ffaa00', marginBottom: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                    INCOMING FRIEND REQUESTS ({friendRequests.incoming.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {friendRequests.incoming.map((req) => (
                      <div key={req.id} className="user-preview-card" style={{ borderColor: 'rgba(255, 170, 0, 0.4)' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{req.senderUsername}</div>
                          <div style={{ fontFamily: 'Courier New', fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginTop: '3px' }}>
                            UID: {req.senderUid}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="action-btn" onClick={() => handleRespondFriendRequest(req.id, true)}>
                            ACCEPT
                          </button>
                          <button className="action-btn danger" onClick={() => handleRespondFriendRequest(req.id, false)}>
                            DECLINE
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* OUTGOING REQUESTS */}
              {friendRequests.outgoing.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '11px', letterSpacing: '2px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px', textTransform: 'uppercase' }}>
                    OUTGOING PENDING REQUESTS ({friendRequests.outgoing.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {friendRequests.outgoing.map((req) => (
                      <div key={req.id} className="user-preview-card" style={{ padding: '12px 18px', borderColor: 'rgba(255,255,255,0.15)' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{req.receiverUsername}</div>
                          <div style={{ fontFamily: 'Courier New', fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                            SENT TO UID: {req.receiverUid}
                          </div>
                        </div>
                        <div>
                          <button className="action-btn danger" onClick={() => handleCancelFriendRequest(req.id)}>
                            CANCEL REQUEST
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ACCEPTED FRIENDS LIST */}
              <div>
                <div style={{ fontSize: '11px', letterSpacing: '2px', color: 'rgba(255,255,255,0.7)', marginBottom: '14px', textTransform: 'uppercase' }}>
                  MY ACCEPTED FRIENDS ({friendsList.length})
                </div>

                {friendsList.length === 0 ? (
                  <div className="nexus-empty-state">
                    <div className="nexus-empty-icon">👥</div>
                    <div className="nexus-empty-title">NO FRIENDS CONNECTED YET</div>
                    <div className="nexus-empty-desc">
                      Use the search bar above to look up registered users by UID and expand your collaborative network.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
                    {friendsList.map((friend) => (
                      <div key={friend.id} className="member-box">
                        <div>
                          <div className="member-name">{friend.username}</div>
                          <div className="member-uid">UID: {friend.uid}</div>
                          <div style={{ fontFamily: 'Courier New', fontSize: '10px', color: '#00e5ff', marginTop: '6px' }}>
                            TEAM: {friend.teamName || 'NO TEAM AFFILIATION'}
                          </div>
                        </div>

                        {/* IF LOGGED IN USER IS LEADER AND FRIEND HAS NO TEAM, ALLOW INVITATION */}
                        {isLeader && !friend.teamName && (
                          <div style={{ marginTop: '12px' }}>
                            <button
                              className="action-btn"
                              style={{ width: '100%' }}
                              onClick={() => handleInviteFriendToTeam(friend.uid || friend.id)}
                            >
                              INVITE TO {team?.name} ↗
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* CONFIRMATION MODAL OVERLAY */}
        {confirmDialog && (
          <div className="confirm-backdrop" onClick={() => setConfirmDialog(null)}>
            <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="confirm-title">{confirmDialog.title}</div>
              <div className="confirm-message">{confirmDialog.message}</div>
              <div className="confirm-actions">
                <button className="nexus-btn-secondary" onClick={() => setConfirmDialog(null)}>
                  CANCEL
                </button>
                <button className="action-btn danger" style={{ padding: '10px 20px', fontSize: '11px' }} onClick={confirmDialog.onConfirm}>
                  CONFIRM ACTION ↗
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
