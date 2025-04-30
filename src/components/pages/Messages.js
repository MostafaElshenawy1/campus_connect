import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Badge,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Send as SendIcon, AttachMoney as AttachMoneyIcon, ArrowBack as ArrowBackIcon, ChatBubbleOutline as ChatBubbleIcon } from '@mui/icons-material';
import { getConversations, getMessages, sendMessage, handleOfferResponse } from '../../services/conversations';
import { formatDistanceToNow } from 'date-fns';
import { getAuth } from 'firebase/auth';

const Messages = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('Messages component mounted');
    const auth = getAuth();
    console.log('Current user:', auth.currentUser?.uid);
    loadConversations();

    // Set up polling interval for conversations
    const conversationsInterval = setInterval(() => {
      loadConversations();
    }, 5000);

    return () => clearInterval(conversationsInterval);
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      console.log('Selected conversation:', selectedConversation);
      loadMessages(selectedConversation.id);

      const messagesInterval = setInterval(() => {
        loadMessages(selectedConversation.id);
      }, 3000);

      return () => clearInterval(messagesInterval);
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      console.log('Loading conversations...');
      const auth = getAuth();
      if (!auth.currentUser) {
        console.log('No authenticated user');
        setConversations([]);
        setLoading(false);
        return;
      }

      const conversationsData = await getConversations();

      if (!conversationsData || conversationsData.length === 0) {
        console.log('No conversations found');
        setConversations([]);
        setLoading(false);
        return;
      }

      // Sort conversations by last message timestamp
      const sortedConversations = conversationsData.sort((a, b) => {
        const timeA = a.lastMessage?.timestamp?.toDate() || new Date(0);
        const timeB = b.lastMessage?.timestamp?.toDate() || new Date(0);
        return timeB - timeA; // Most recent first
      });

      setConversations(sortedConversations);
      setLoading(false);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setError(`Error loading conversations: ${error.message}`);
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      console.log('Loading messages for conversation:', conversationId);
      const messagesData = await getMessages(conversationId);
      console.log('Raw messages data:', messagesData);

      // Sort messages by timestamp in ascending order
      const sortedMessages = messagesData.sort((a, b) => {
        const timeA = a.timestamp?.toDate() || new Date(0);
        const timeB = b.timestamp?.toDate() || new Date(0);
        return timeA - timeB;
      });

      console.log('Sorted messages:', sortedMessages);
      setMessages(sortedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      await sendMessage(
        selectedConversation.userId,
        newMessage.trim(),
        false,
        null,
        selectedConversation.listing?.id
      );
      setNewMessage('');
      loadMessages(selectedConversation.id);
      loadConversations(); // Refresh conversations to update last message
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleSendOffer = async () => {
    if (!offerAmount || !selectedConversation) return;

    try {
      await sendMessage(
        selectedConversation.userId,
        `Offer: $${offerAmount}`,
        true,
        parseFloat(offerAmount),
        selectedConversation.listing?.id
      );
      setOfferAmount('');
      setOfferDialogOpen(false);
      loadMessages(selectedConversation.id);
      loadConversations();
    } catch (error) {
      console.error('Error sending offer:', error);
    }
  };

  const handleOfferResponse = async (messageId, status) => {
    try {
      await handleOfferResponse(selectedConversation.id, messageId, status);
      loadMessages(selectedConversation.id);
      loadConversations();
    } catch (error) {
      console.error('Error handling offer response:', error);
    }
  };

  const renderMessage = (message) => {
    const isCurrentUser = message.senderId === selectedConversation.userId;

    return (
      <Box
        key={message.id}
        sx={{
          display: 'flex',
          justifyContent: isCurrentUser ? 'flex-start' : 'flex-end',
          mb: 2
        }}
      >
        <Paper
          sx={{
            p: 2,
            maxWidth: '70%',
            bgcolor: isCurrentUser ? 'grey.100' : 'primary.main',
            color: isCurrentUser ? 'text.primary' : 'white'
          }}
        >
          {message.isOffer ? (
            <Box>
              <Typography variant="body1">{message.content}</Typography>
              {message.status === 'pending' && !isCurrentUser && (
                <Box sx={{ mt: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    onClick={() => handleOfferResponse(message.id, 'accepted')}
                    sx={{ mr: 1 }}
                  >
                    Accept
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    onClick={() => handleOfferResponse(message.id, 'rejected')}
                  >
                    Reject
                  </Button>
                </Box>
              )}
              {message.status && (
                <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                  Status: {message.status}
                </Typography>
              )}
            </Box>
          ) : (
            <Typography variant="body1">{message.content}</Typography>
          )}
          <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
            {formatDistanceToNow(message.timestamp?.toDate() || new Date(), { addSuffix: true })}
          </Typography>
        </Paper>
      </Box>
    );
  };

  const renderConversationItem = (conversation) => {
    const lastMessage = conversation.lastMessage;
    const timestamp = lastMessage?.timestamp?.toDate();
    const listingImage = conversation.listing?.images?.[0];
    const listingTitle = conversation.listing?.title || 'Unknown Item';
    const sellerName = conversation.user?.displayName || 'Unknown User';

    return (
      <ListItem
        key={conversation.id}
        button
        selected={selectedConversation?.id === conversation.id}
        onClick={() => {
          setSelectedConversation(conversation);
        }}
        sx={{
          py: 2,
          px: { xs: 3, sm: 2 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(0, 0, 0, 0.08)',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.12)',
            },
          },
        }}
      >
        <ListItemAvatar sx={{ minWidth: 65 }}>
          <Badge
            badgeContent={conversation.unreadCount}
            color="primary"
            invisible={!conversation.unreadCount}
            sx={{
              '& .MuiBadge-badge': {
                backgroundColor: '#007AFF',
                color: 'white',
                minWidth: 20,
                height: 20,
                fontSize: '0.75rem',
              },
            }}
          >
            <Avatar
              src={listingImage}
              alt={listingTitle}
              variant="rounded"
              sx={{
                width: 50,
                height: 50,
                borderRadius: 2,
              }}
            />
          </Badge>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Box sx={{ mb: 0.5 }}>
              <Typography
                variant="subtitle1"
                component="div"
                noWrap
                sx={{
                  fontWeight: conversation.unreadCount ? 600 : 400,
                  color: conversation.unreadCount ? 'text.primary' : 'text.secondary',
                }}
              >
                {listingTitle}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontSize: '0.8125rem',
                  fontWeight: conversation.unreadCount ? 500 : 400,
                }}
              >
                {sellerName}
              </Typography>
            </Box>
          }
          secondary={
            lastMessage ? (
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: conversation.unreadCount ? 'text.primary' : 'text.secondary',
                    fontWeight: conversation.unreadCount ? 500 : 400,
                    fontSize: '0.875rem',
                    flex: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {lastMessage.content}
                </Typography>
                {timestamp && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      fontSize: '0.75rem',
                      whiteSpace: 'nowrap',
                      ml: 'auto',
                      pl: 2,
                    }}
                  >
                    {formatDistanceToNow(timestamp, { addSuffix: true })}
                  </Typography>
                )}
              </Box>
            ) : 'No messages yet'
          }
        />
      </ListItem>
    );
  };

  const handleBackToConversations = () => {
    setSelectedConversation(null);
  };

  if (loading) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        bgcolor: 'background.default'
      }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{
      display: 'flex',
      height: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 64px)' },
      position: 'relative',
      bgcolor: 'background.default',
      overflow: 'hidden',
      width: '100%',
    }}>
      <Paper
        elevation={0}
        sx={{
          width: { xs: '100%', sm: 320 },
          height: '100%',
          borderRight: { sm: 1 },
          borderColor: 'divider',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: { xs: 'relative', sm: 'relative' },
          transform: {
            xs: selectedConversation ? 'translateX(-100%)' : 'translateX(0)',
            sm: 'none'
          },
          transition: 'transform 0.3s ease-in-out',
          bgcolor: 'background.default',
        }}
      >
        <Box
          sx={{
            px: { xs: 3, sm: 2 },
            py: 2,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'background.paper',
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: '1.75rem',
            }}
          >
            Messages
          </Typography>
        </Box>

        {conversations.length === 0 ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 3,
              textAlign: 'center',
              color: 'text.secondary',
              bgcolor: 'background.default',
            }}
          >
            <ChatBubbleIcon
              sx={{
                fontSize: 64,
                mb: 2,
                opacity: 0.6,
                color: 'primary.main'
              }}
            />
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                fontWeight: 500,
                color: 'text.primary'
              }}
            >
              No Conversations
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                maxWidth: '80%',
                mx: 'auto'
              }}
            >
              When you message someone about a listing, it will appear here
            </Typography>
          </Box>
        ) : (
          <List
            sx={{
              flex: 1,
              overflow: 'auto',
              p: 0,
              bgcolor: 'background.default'
            }}
          >
            {conversations.map(renderConversationItem)}
          </List>
        )}
      </Paper>

      {selectedConversation && (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            position: 'absolute',
            top: 0,
            left: 0,
            transform: {
              xs: selectedConversation ? 'translateX(0)' : 'translateX(100%)',
              sm: 'none'
            },
            transition: 'transform 0.3s ease-in-out',
            bgcolor: 'background.default',
            marginLeft: { xs: 0, sm: '320px' },
            width: { xs: '100%', sm: 'calc(100% - 320px)' }
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper'
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              {isMobile && (
                <IconButton edge="start" onClick={handleBackToConversations}>
                  <ArrowBackIcon />
                </IconButton>
              )}
              <Avatar
                src={selectedConversation.listing?.images?.[0]}
                alt={selectedConversation.listing?.title}
                variant="rounded"
                sx={{ width: 48, height: 48 }}
              />
              <Stack direction="column" sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="h6" noWrap>
                  {selectedConversation.listing?.title || 'Unknown Item'}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {selectedConversation.user?.displayName || 'Unknown User'}
                </Typography>
              </Stack>
            </Stack>
          </Paper>

          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {messages.map(renderMessage)}
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper'
            }}
          >
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                size="small"
              />
              <IconButton
                color="primary"
                onClick={() => setOfferDialogOpen(true)}
                sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
              >
                <AttachMoneyIcon />
              </IconButton>
              <IconButton color="primary" onClick={handleSendMessage}>
                <SendIcon />
              </IconButton>
            </Stack>
            {isMobile && (
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setOfferDialogOpen(true)}
                startIcon={<AttachMoneyIcon />}
                sx={{ mt: 1 }}
              >
                Make Offer
              </Button>
            )}
          </Paper>
        </Box>
      )}

      <Dialog open={offerDialogOpen} onClose={() => setOfferDialogOpen(false)}>
        <DialogTitle>Make an Offer</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Offer Amount ($)"
            type="number"
            fullWidth
            value={offerAmount}
            onChange={(e) => setOfferAmount(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOfferDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSendOffer} variant="contained" color="primary">
            Send Offer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Messages;
