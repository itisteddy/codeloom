import { Router } from 'express';
import { getInviteByToken, acceptInvite } from '../services/invitationService';

export const inviteAcceptRouter = Router();

// GET /api/invite/:token - get invite info (no auth required)
inviteAcceptRouter.get('/:token', async (req, res) => {
  try {
    const invite = await getInviteByToken(req.params.token);
    if (!invite) {
      return res.status(404).json({ error: 'Invite not found or expired' });
    }

    return res.json({
      email: invite.email,
      role: invite.role,
      practiceName: invite.practiceName,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Invalid invite token' });
  }
});

// POST /api/invite/:token/accept - accept invite and create user (no auth required)
inviteAcceptRouter.post('/:token/accept', async (req, res) => {
  try {
    const { firstName, lastName, password } = req.body;

    if (!firstName || !lastName || !password) {
      return res.status(400).json({
        error: 'Missing required fields: firstName, lastName, password',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const result = await acceptInvite(req.params.token, firstName, lastName, password);

    return res.status(201).json({
      message: 'Account created successfully',
      userId: result.userId,
      email: result.email,
      role: result.role,
    });
  } catch (error: any) {
    if (
      error.message.includes('already exists') ||
      error.message.includes('expired') ||
      error.message.includes('accepted')
    ) {
      return res.status(400).json({ error: error.message });
    }
    // eslint-disable-next-line no-console
    console.error('Error accepting invite:', error);
    return res.status(500).json({ error: error.message || 'Failed to accept invite' });
  }
});

