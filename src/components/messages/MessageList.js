import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Badge,
  Paper,
  Box,
  CircularProgress
} from '@mui/material';
import { getConversations } from '../../services/messages';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

const MessageList = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const convs = await getConversations();
        // Fetch user details for each conversation
        const conversationsWithUsers = await Promise.all(
          convs.map(async (conv) => {
            const userDoc = await getDoc(doc(db, 'users', conv.userId));
            return {
              ...conv,
              user: userDoc.data()
            };
          })
        );
        setConversations(conversationsWithUsers);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper elevation={2} sx={{ maxHeight: '70vh', overflow: 'auto' }}>
      <List>
        {conversations.length === 0 ? (
          <ListItem>
            <ListItemText primary="No messages yet" />
          </ListItem>
        ) : (
          conversations.map((conversation) => (
            <ListItem
              key={conversation.userId}
              button
              onClick={() => navigate(`/messages/${conversation.userId}`)}
              sx={{
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)'
                }
              }}
            >
              <ListItemAvatar>
                <Badge
                  color="error"
                  badgeContent={conversation.unreadCount}
                  invisible={conversation.unreadCount === 0}
                >
                  <Avatar src={conversation.user.photoURL} alt={conversation.user.displayName}>
                    {conversation.user.displayName?.[0]}
                  </Avatar>
                </Badge>
              </ListItemAvatar>
              <ListItemText
                primary={conversation.user.displayName}
                secondary={
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {conversation.lastMessage.content}
                  </Typography>
                }
              />
              <Typography variant="caption" color="text.secondary">
                {new Date(conversation.lastMessage.timestamp?.toDate()).toLocaleDateString()}
              </Typography>
            </ListItem>
          ))
        )}
      </List>
    </Paper>
  );
};

export default MessageList;
