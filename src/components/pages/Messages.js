import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  IconButton,
  Badge,
  InputAdornment,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Send as SendIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiEmotionsIcon,
} from '@mui/icons-material';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';

function Messages() {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('participants', 'array-contains', user.uid),
        orderBy('lastMessageAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const fetchedConversations = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastMessageAt: doc.data().lastMessageAt?.toDate(),
      }));

      setConversations(fetchedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setError('Error loading messages');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      // Here you would typically send the message to your backend
      console.log('Sending message:', message);
      setMessage('');
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ height: 'calc(100vh - 200px)' }}>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        {/* Conversations List */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2 }}>
              <TextField
                fullWidth
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <List sx={{ flexGrow: 1, overflow: 'auto' }}>
              {conversations.map((conversation) => (
                <React.Fragment key={conversation.id}>
                  <ListItem
                    button
                    selected={selectedConversation?.id === conversation.id}
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <ListItemAvatar>
                      <Badge
                        color="success"
                        variant="dot"
                        invisible={!conversation.user.online}
                      >
                        <Avatar src={conversation.user.avatar} />
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="subtitle1">
                            {conversation.user.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(conversation.lastMessageAt)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '200px',
                            }}
                          >
                            {conversation.lastMessage}
                          </Typography>
                          {conversation.unread > 0 && (
                            <Badge
                              badgeContent={conversation.unread}
                              color="primary"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Chat Area */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <Box
                  sx={{
                    p: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Avatar
                    src={selectedConversation.user.avatar}
                    sx={{ mr: 2 }}
                  />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1">
                      {selectedConversation.user.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedConversation.listing.title} • ${selectedConversation.listing.price}
                    </Typography>
                  </Box>
                  <IconButton>
                    <MoreVertIcon />
                  </IconButton>
                </Box>

                {/* Messages */}
                <Box
                  sx={{
                    flexGrow: 1,
                    overflow: 'auto',
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  {/* Add your message rendering logic here */}
                </Box>

                {/* Message Input */}
                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton>
                            <EmojiEmotionsIcon />
                          </IconButton>
                          <IconButton>
                            <AttachFileIcon />
                          </IconButton>
                          <IconButton
                            color="primary"
                            onClick={handleSendMessage}
                            disabled={!message.trim()}
                          >
                            <SendIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
              </>
            ) : (
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="h6" color="text.secondary">
                  Select a conversation to start messaging
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Messages;
