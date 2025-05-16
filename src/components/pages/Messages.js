import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
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
  useMediaQuery,
  Container
} from '@mui/material';
import { Send as SendIcon, AttachMoney as AttachMoneyIcon, ArrowBack as ArrowBackIcon, ChatBubbleOutline as ChatBubbleIcon } from '@mui/icons-material';
import { sendMessage, handleOfferResponse } from '../../services/messages';
import { formatDistanceToNow } from 'date-fns';
import { getAuth } from 'firebase/auth';
import {
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  doc,
  getDoc,
  writeBatch,
  updateDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useLocation, useNavigate } from 'react-router-dom';

const Messages = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [allMessages, setAllMessages] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [counterOfferDialogOpen, setCounterOfferDialogOpen] = useState(false);
  const [selectedOfferMessage, setSelectedOfferMessage] = useState(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const location = useLocation();
  const [counterOfferAmount, setCounterOfferAmount] = useState('');
  const [counterOfferMessage, setCounterOfferMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    if (!auth.currentUser) return;

    // Set initial loading state only if we haven't loaded any conversations yet
    if (conversations.length === 0) {
      setLoading(true);
    }

    // Set up real-time listener for conversations
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', auth.currentUser.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribeConversations = onSnapshot(conversationsQuery, async (snapshot) => {
      try {
        console.log('Conversations snapshot:', snapshot.docs.length, 'documents');

        // Process any changes in conversations
        const conversationsData = await Promise.all(snapshot.docs.map(async docSnapshot => {
          const data = docSnapshot.data();
          console.log('Conversation data:', data);

          // If user or listing data is not in the document, fetch it
          let userData = data.user;
          let listingData = data.listing;

          if (!userData && data.participants) {
            const otherUserId = data.participants.find(id => id !== auth.currentUser.uid);
            if (otherUserId) {
              const userDoc = await getDoc(doc(db, 'users', otherUserId));
              if (userDoc.exists()) {
                userData = userDoc.data();
              }
            }
          }

          if (!listingData && data.listingId) {
            const listingDoc = await getDoc(doc(db, 'listings', data.listingId));
            if (listingDoc.exists()) {
              listingData = {
                id: data.listingId,
                ...listingDoc.data()
              };
            }
          }

          return {
            id: docSnapshot.id,
            userId: data.participants.find(id => id !== auth.currentUser.uid),
            lastMessage: data.lastMessage || { content: '', timestamp: null },
            unreadCount: data[`unreadCount_${auth.currentUser.uid}`] || 0,
            listing: listingData || null,
            user: userData || null,
            updatedAt: data.updatedAt
          };
        }));

        console.log('Processed conversations:', conversationsData);
        setConversations(conversationsData);
        setInitialLoadComplete(true);
      } catch (error) {
        console.error('Error in conversations listener:', error);
      } finally {
        // Only set loading to false if this was the initial load
        if (loading) {
          setLoading(false);
        }
      }
    });

    return () => {
      unsubscribeConversations();
    };
  }, [conversations.length, loading]);

  useEffect(() => {
    if (!selectedConversation) return;

    // Set up real-time listener for messages in the selected conversation
    const messagesQuery = query(
      collection(db, `conversations/${selectedConversation.id}/messages`),
      orderBy('timestamp', 'asc')
    );

    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.debug('[onSnapshot] Messages data:', messagesData.map(m => ({ id: m.id, status: m.status })));
      // Update both messages state and allMessages cache
      setMessages(messagesData);
      setAllMessages(prev => ({
        ...prev,
        [selectedConversation.id]: messagesData
      }));

      // Mark messages as read if they're not from the current user
      const auth = getAuth();
      const unreadMessages = messagesData.filter(
        msg => msg.receiverId === auth.currentUser?.uid && !msg.read
      );

      if (unreadMessages.length > 0) {
        const batch = writeBatch(db);
        unreadMessages.forEach(msg => {
          const messageRef = doc(db, `conversations/${selectedConversation.id}/messages/${msg.id}`);
          batch.update(messageRef, { read: true });
        });
        batch.update(doc(db, 'conversations', selectedConversation.id), {
          [`unreadCount_${auth.currentUser?.uid}`]: 0
        });
        batch.commit().catch(error => {
          console.error('Error marking messages as read:', error);
        });
      }
    });

    return () => {
      unsubscribeMessages();
    };
  }, [selectedConversation]);

  const scrollToBottom = (behavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  // Auto scroll when messages update
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Scroll to bottom on conversation change
  useEffect(() => {
    if (selectedConversation) {
      scrollToBottom('auto');
    }
  }, [selectedConversation]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      // Clear the input field immediately for better UX
      const messageContent = newMessage.trim();
      setNewMessage('');

      await sendMessage(
        selectedConversation.userId,
        messageContent,
        false,
        null,
        selectedConversation.listing?.id
      );

      // Scroll to bottom after sending
      scrollToBottom();
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleKeyPress = (e) => {
    const { name } = e.target;
    if (name === 'offerAmount') {
      // Only allow numbers and control keys (backspace, delete, etc)
      const char = String.fromCharCode(e.which);
      if (!/[\d]/.test(char) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
      }
    }
  };

  const handleOfferChange = (e) => {
    const { value } = e.target;

    // Remove any non-digit characters
    const numericValue = value.replace(/\D/g, '');
    if (numericValue === '') {
      setOfferAmount('');
      return;
    }

    // Convert to number and check if negative or exceeds max
    const numValue = Number(numericValue);
    if (numValue < 0) {
      return;
    }

    // If number exceeds max, set to max value
    const finalValue = numValue > 99999 ? 99999 : numValue;

    // Format with commas
    const formattedValue = finalValue.toLocaleString();

    setOfferAmount(formattedValue);
  };

  const handleSendOffer = async () => {
    if (!offerAmount) {
      return;
    }

    try {
      // Remove commas and convert to number for storage
      const numericAmount = Number(offerAmount.replace(/,/g, ''));

      // Send the offer
      await sendMessage(
        selectedConversation.userId,
        `Offer: $${offerAmount}`,
        true,
        numericAmount,
        selectedConversation.listing?.id
      );

      setOfferDialogOpen(false);
      setOfferAmount('');
    } catch (error) {
      console.error('Error sending offer:', error);
    }
  };

    const respondToOffer = async (messageId, status) => {
    try {
      console.debug('[respondToOffer] Called with', { messageId, status });

      // Optimistically update the message status in local state first for better UX
      setMessages(prevMessages =>
        prevMessages.map(msg => {
          if (msg.id === messageId) {
            console.debug('[respondToOffer] Optimistically updating local message status', {
              id: msg.id, oldStatus: msg.status, newStatus: status
            });
            return { ...msg, status: status };
          }
          return msg;
        })
      );

      // Pass boolean to handleOfferResponse: true for accept, false for reject
      const accept = status === 'accepted';
      console.debug('[respondToOffer] Calling handleOfferResponse with', {
        conversationId: selectedConversation.id,
        messageId,
        accept
      });

      // Call the service to update in database
      const result = await handleOfferResponse(selectedConversation.id, messageId, accept);
      console.debug('[respondToOffer] Result from handleOfferResponse:', result);

      // If this was an accepted offer, update the conversation's listing in local state if it exists
      if (accept && selectedConversation.listing) {
        // Update UI immediately for better user experience
        // The Cloud Function will handle the actual database update
        const updatedListing = {
          ...selectedConversation.listing,
          sold: true,
          soldAt: new Date(),
          soldTo: getAuth().currentUser.uid
        };

        // If there's an offer amount, update the price in our local state
        const message = messages.find(m => m.id === messageId);
        if (message && message.offerAmount) {
          updatedListing.price = Number(message.offerAmount);
        }

        console.debug('[respondToOffer] Updating local listing state:', updatedListing);

        // Update the selected conversation's listing
        setSelectedConversation(prev => ({
          ...prev,
          listing: updatedListing
        }));

        // Update the listing in all conversations too (to keep state consistent)
        setConversations(prevConversations =>
          prevConversations.map(conv =>
            conv.id === selectedConversation.id ?
              { ...conv, listing: updatedListing } :
              conv
          )
        );
      }

      if (result?.message) {
        console.info('[respondToOffer] Server message:', result.message);
        // TODO: Show a toast notification with the result message
      }
    } catch (error) {
      console.error('Error handling offer response:', error);

      // Revert the optimistic update if we had a complete failure
      setMessages(prevMessages =>
        prevMessages.map(msg => {
          if (msg.id === messageId) {
            console.debug('[respondToOffer] Reverting local message status due to error');
            return { ...msg, status: 'pending' }; // Revert to pending
          }
          return msg;
        })
      );

      // TODO: Show error toast notification
      // Example: toast.error("Failed to process your response to the offer. Please try again.");
    }
  };

  const handleRescindOffer = async (messageId) => {
    try {
      // Update UI immediately
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === messageId
            ? { ...msg, status: 'pending' }
            : msg
        )
      );

      // Make the API call
      await respondToOffer(messageId, 'rescinded');
    } catch (error) {
      // Revert the status on error
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === messageId
            ? { ...msg, status: 'pending' }
            : msg
        )
      );
      console.error('Error rescinding offer:', error);
    }
  };

  const handleCounterOffer = (message) => {
    setSelectedOfferMessage(message);
    setCounterOfferDialogOpen(true);
  };

  const handleSelectConversation = useCallback((conversation) => {
    // Use cached messages if available
    if (allMessages[conversation.id]) {
      setMessages(allMessages[conversation.id]);
    } else {
      setMessages([]);
    }

    // Set the selected conversation
    setSelectedConversation(conversation);
  }, [allMessages]);

  // Add this new useEffect to handle URL parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const conversationId = params.get('conversation');

    if (conversationId && conversations.length > 0) {
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        handleSelectConversation(conversation);
      }
    }
  }, [conversations, location.search, handleSelectConversation]);

  const renderMessage = (message) => {
    const isCurrentUser = message.senderId === getAuth().currentUser.uid;
    const isOffer = message.isOffer;
    const isPending = message.status === 'pending';
    const isRescinded = message.status === 'rescinded';
    const isCountered = message.status === 'countered';

    const getStatusColor = (status) => {
      switch (status) {
        case 'accepted':
          return 'success.main';
        case 'rejected':
          return 'error.main';
        case 'rescinded':
          return 'text.secondary';
        case 'countered':
          return 'info.main';
        default:
          return isCurrentUser ? 'text.secondary' : 'rgba(255, 255, 255, 0.7)';
      }
    };

    const getStatusText = (status) => {
      switch (status) {
        case 'accepted':
          return 'Offer accepted';
        case 'rejected':
          return 'Offer rejected';
        case 'rescinded':
          return 'Offer rescinded';
        case 'countered':
          return 'Offer countered';
        default:
          return `Offer ${status}`;
      }
    };

    return (
      <Box
        key={message.id}
        sx={{
          display: 'flex',
          justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
          mb: 2
        }}
      >
        <Paper
          sx={{
            p: 2,
            maxWidth: '70%',
            bgcolor: isCurrentUser ? 'grey.100' : 'primary.main',
            color: isCurrentUser ? 'text.primary' : 'white',
            borderRadius: 2,
            opacity: isRescinded ? 0.7 : 1,
          }}
        >
          {isOffer ? (
            <Box>
              <Typography
                variant="body1"
                gutterBottom
                sx={{
                  textDecoration: isRescinded ? 'line-through' : 'none',
                }}
              >
                {message.content}
              </Typography>

              {isPending && !isCountered && (
                <Box sx={{ mt: 1 }}>
                  {isCurrentUser ? (
                    <Button
                      size="small"
                      variant="contained"
                      color="error"
                      onClick={() => handleRescindOffer(message.id)}
                      sx={{
                        bgcolor: 'error.main',
                        '&:hover': { bgcolor: 'error.dark' }
                      }}
                    >
                      Rescind Offer
                    </Button>
                  ) : (
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        onClick={() => respondToOffer(message.id, 'accepted')}
                        sx={{
                          bgcolor: 'success.main',
                          '&:hover': { bgcolor: 'success.dark' }
                        }}
                      >
                        Accept
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        onClick={() => handleCounterOffer(message)}
                        sx={{
                          bgcolor: 'primary.main',
                          '&:hover': { bgcolor: 'primary.dark' }
                        }}
                      >
                        Counter
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        color="error"
                        onClick={() => respondToOffer(message.id, 'rejected')}
                        sx={{
                          bgcolor: 'error.main',
                          '&:hover': { bgcolor: 'error.dark' }
                        }}
                      >
                        Reject
                      </Button>
                    </Stack>
                  )}
                </Box>
              )}

              {isCountered && (
                <Typography
                  variant="caption"
                  sx={{
                    mt: 1,
                    display: 'block',
                    color: 'info.main',
                    fontStyle: 'italic'
                  }}
                >
                  Countered
                </Typography>
              )}

              {!isPending && !isCountered && (
                <Typography
                  variant="caption"
                  sx={{
                    mt: 1,
                    display: 'block',
                    color: message.status === 'rejected' ? 'error.main' : getStatusColor(message.status),
                    fontStyle: 'italic'
                  }}
                >
                  {message.status === 'rejected' ? 'Offer rejected' : getStatusText(message.status)}
                </Typography>
              )}
            </Box>
          ) : (
            <Typography variant="body1">{message.content}</Typography>
          )}
          <Typography
            variant="caption"
            sx={{
              mt: 1,
              display: 'block',
              color: isCurrentUser ? 'text.secondary' : 'rgba(255, 255, 255, 0.7)'
            }}
          >
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
        onClick={() => handleSelectConversation(conversation)}
        sx={{
          py: 2,
          px: { xs: 3, sm: 2 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
          '&.Mui-selected': {
            backgroundColor: 'primary.main',
            '&:hover': {
              backgroundColor: 'primary.dark',
            },
            '& .MuiTypography-root': {
              color: 'white',
            },
            '& .MuiTypography-colorTextSecondary': {
              color: 'rgba(255, 255, 255, 0.7)',
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
                right: -4,
                top: -4,
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
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
          </Badge>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Box sx={{ mb: 0.5 }}>
              <Typography
                variant="subtitle1"
                component="span"
                noWrap
                sx={{
                  fontWeight: conversation.unreadCount ? 600 : 400,
                  color: conversation.unreadCount ? 'text.primary' : 'text.secondary',
                  display: 'block',
                  fontSize: '0.95rem',
                }}
              >
                {listingTitle}
              </Typography>
              <Typography
                variant="body2"
                component="span"
                color="text.secondary"
                sx={{
                  fontSize: '0.8125rem',
                  fontWeight: conversation.unreadCount ? 500 : 400,
                  display: 'block',
                  mt: 0.5,
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
                  component="span"
                  sx={{
                    color: conversation.unreadCount ? 'text.primary' : 'text.secondary',
                    fontWeight: conversation.unreadCount ? 500 : 400,
                    fontSize: '0.875rem',
                    flex: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'block',
                  }}
                >
                  {lastMessage.content}
                </Typography>
                {timestamp && (
                  <Typography
                    variant="caption"
                    component="span"
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
            ) : (
              <Typography
                variant="body2"
                component="span"
                color="text.secondary"
              >
                No messages yet
              </Typography>
            )
          }
        />
      </ListItem>
    );
  };

  const handleBackToConversations = () => {
    setSelectedConversation(null);
  };

  const renderMessages = () => {
    if (loading && !messages.length) {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%'
          }}
        >
          <CircularProgress />
        </Box>
      );
    }

    return messages.map(renderMessage);
  };

  const handleCounterOfferChange = (e) => {
    const { value } = e.target;

    // Remove any non-digit characters
    const numericValue = value.replace(/\D/g, '');
    if (numericValue === '') {
      setCounterOfferAmount('');
      return;
    }

    // Convert to number and check if negative or exceeds max
    const numValue = Number(numericValue);
    if (numValue < 0) {
      return;
    }

    // If number exceeds max, set to max value
    const finalValue = numValue > 99999 ? 99999 : numValue;

    // Format with commas
    const formattedValue = finalValue.toLocaleString();

    setCounterOfferAmount(formattedValue);
  };

  const handleSendCounterOffer = async () => {
    if (!counterOfferAmount) {
      return;
    }

    try {
      // Remove commas and convert to number for storage
      const numericAmount = Number(counterOfferAmount.replace(/,/g, ''));

      // Send the counter offer
      await sendMessage(
        selectedConversation.userId,
        `Counter Offer: $${counterOfferAmount}`,
        true,
        numericAmount,
        selectedConversation.listing?.id
      );

      // If there's a message, send it as a separate message
      if (counterOfferMessage.trim()) {
        await sendMessage(
          selectedConversation.userId,
          counterOfferMessage.trim(),
          false,
          null,
          selectedConversation.listing?.id
        );
      }

      // Update the original offer's status to 'countered' in Firestore and local state
      if (selectedOfferMessage?.id) {
        const conversationId = selectedConversation.id;
        const messageId = selectedOfferMessage.id;
        const messageRef = doc(db, `conversations/${conversationId}/messages/${messageId}`);
        await updateDoc(messageRef, { status: 'countered' });
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === messageId ? { ...msg, status: 'countered' } : msg
          )
        );
      }

      setCounterOfferDialogOpen(false);
      setCounterOfferAmount('');
      setCounterOfferMessage('');
    } catch (error) {
      console.error('Error sending counter offer:', error);
    }
  };

  if (loading && !initialLoadComplete) {
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
      position: 'fixed',
      top: { xs: '56px', sm: '64px' },
      bottom: 0,
      left: 0,
      right: 0,
      bgcolor: 'background.default',
      overflow: 'hidden',
    }}>
      <Container maxWidth="lg" disableGutters sx={{
        height: '100%',
        display: 'flex',
        position: 'relative',
        boxShadow: { sm: '0 0 20px rgba(0, 0, 0, 0.1)' },
        borderRadius: { sm: '8px 8px 0 0' },
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        flex: 1,
      }}>
        <Paper
          elevation={0}
          sx={{
            width: { xs: '100%', sm: 320 },
            height: '100%',
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
            borderRight: { sm: '1px solid rgba(0, 0, 0, 0.08)' },
            boxShadow: { sm: '4px 0 8px -4px rgba(0, 0, 0, 0.05)' }
          }}
        >
          <Box
            sx={{
              px: { xs: 3, sm: 2 },
              py: 2,
              height: '72px',
              display: 'flex',
              alignItems: 'center',
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: '#1a1f2c',
              color: 'white',
              position: 'sticky',
              top: 0,
              zIndex: 1
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                fontSize: '1.75rem',
                lineHeight: 1.2
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
                bgcolor: '#242836',
                height: 'calc(100% - 72px)',
                overflow: 'auto'
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
                bgcolor: '#242836',
                height: 'calc(100% - 72px)',
                '& .MuiListItem-root': {
                  bgcolor: '#242836',
                  '&:hover': {
                    bgcolor: '#2c3040',
                  },
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                  },
                }
              }}
            >
              {conversations.map(renderConversationItem)}
            </List>
          )}
        </Paper>

        {selectedConversation ? (
          <Box
            sx={{
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
                px: { xs: 3, sm: 2 },
                py: 2,
                height: '72px',
                display: 'flex',
                alignItems: 'center',
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: '#1a1f2c',
                color: 'white',
                borderRadius: 0,
                cursor: selectedConversation?.listing?.id ? 'pointer' : 'default',
                '&:hover': selectedConversation?.listing?.id ? { bgcolor: '#23273a' } : {},
              }}
              onClick={() => {
                if (selectedConversation?.listing?.id) {
                  navigate(`/listings/${selectedConversation.listing.id}`);
                }
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                {isMobile && (
                  <IconButton edge="start" onClick={handleBackToConversations} sx={{ color: 'white' }}>
                    <ArrowBackIcon />
                  </IconButton>
                )}
                <Avatar
                  src={selectedConversation.listing?.images?.[0]}
                  alt={selectedConversation.listing?.title}
                  variant="rounded"
                  sx={{ width: 36, height: 36 }}
                />
                <Stack direction="column" sx={{ minWidth: 0, flex: 1, py: 0 }}>
                  <Typography
                    variant="h6"
                    noWrap
                    sx={{
                      color: 'white',
                      fontSize: '1.75rem',
                      fontWeight: 600,
                      lineHeight: 1.2
                    }}
                  >
                    {selectedConversation.listing?.title || 'Unknown Item'}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      lineHeight: 1.2
                    }}
                    noWrap
                  >
                    {selectedConversation.user?.displayName || 'Unknown User'}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>

            <Box
              ref={messagesContainerRef}
              sx={{
                flex: 1,
                overflow: 'auto',
                p: 2,
                scrollBehavior: 'smooth',
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: theme.palette.divider,
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: theme.palette.text.disabled,
                }
              }}
            >
              {renderMessages()}
              <div ref={messagesEndRef} style={{ height: '1px' }} />
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
        ) : (
          <Box
            sx={{
              display: { xs: 'none', sm: 'flex' },
              width: 'calc(100% - 320px)',
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'background.default',
              borderLeft: '1px solid',
              borderColor: 'divider',
              opacity: 0.5,
            }}
          >
            <Box
              sx={{
                textAlign: 'center',
                maxWidth: '400px',
                p: 3,
              }}
            >
              <ChatBubbleIcon
                sx={{
                  fontSize: 80,
                  color: 'primary.main',
                  opacity: 0.2,
                  mb: 2
                }}
              />
              <Typography
                variant="h5"
                gutterBottom
                sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 1
                }}
              >
                Select a Conversation
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{
                  mb: 3,
                  lineHeight: 1.6
                }}
              >
                Choose a conversation from the list to view messages and continue your discussion about listings.
              </Typography>
            </Box>
          </Box>
        )}

        <Dialog
          open={offerDialogOpen}
          onClose={() => {
            setOfferDialogOpen(false);
            setOfferAmount('');
          }}
          PaperProps={{
            sx: {
              bgcolor: 'background.default',
              borderRadius: 2,
              width: '100%',
              maxWidth: { xs: '100%', sm: 400 },
              m: { xs: 0, sm: 2 }
            }
          }}
        >
          <DialogTitle
            sx={{
              fontSize: '1.5rem',
              fontWeight: 600,
              pb: 1
            }}
          >
            Make an Offer
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Offer Amount ($)"
              name="offerAmount"
              type="text"
              fullWidth
              value={offerAmount}
              onChange={handleOfferChange}
              onKeyPress={handleKeyPress}
              sx={{
                mt: 2,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'primary.main',
                  },
                  '&:hover fieldset': {
                    borderColor: 'primary.light',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main',
                  },
                },
              }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button
              onClick={() => {
                setOfferDialogOpen(false);
                setOfferAmount('');
              }}
              sx={{
                color: 'primary.main',
                '&:hover': {
                  backgroundColor: 'rgba(124, 58, 237, 0.04)'
                }
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendOffer}
              variant="contained"
              disabled={!offerAmount}
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
                '&.Mui-disabled': {
                  bgcolor: 'rgba(124, 58, 237, 0.12)',
                  color: 'rgba(255, 255, 255, 0.7)'
                }
              }}
            >
              Send Offer
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={counterOfferDialogOpen}
          onClose={() => {
            setCounterOfferDialogOpen(false);
            setCounterOfferAmount('');
            setCounterOfferMessage('');
          }}
          PaperProps={{
            sx: {
              bgcolor: 'background.default',
              borderRadius: 2,
              width: '100%',
              maxWidth: { xs: '100%', sm: 400 },
              m: { xs: 0, sm: 2 }
            }
          }}
        >
          <DialogTitle sx={{ fontSize: '1.5rem', fontWeight: 600 }}>
            Make Counter Offer
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Original offer: ${selectedOfferMessage?.amount}
            </Typography>
            <TextField
              autoFocus
              margin="dense"
              label="Counter Offer Amount ($)"
              name="counterOfferAmount"
              type="text"
              fullWidth
              value={counterOfferAmount}
              onChange={handleCounterOfferChange}
              onKeyPress={handleKeyPress}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Additional Message (Optional)"
              type="text"
              fullWidth
              multiline
              rows={3}
              value={counterOfferMessage}
              onChange={(e) => setCounterOfferMessage(e.target.value)}
              placeholder="Add any additional details or questions about your counter offer..."
            />
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button
              onClick={() => {
                setCounterOfferDialogOpen(false);
                setCounterOfferAmount('');
                setCounterOfferMessage('');
              }}
              sx={{
                color: 'primary.main',
                '&:hover': {
                  backgroundColor: 'rgba(124, 58, 237, 0.04)'
                }
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendCounterOffer}
              variant="contained"
              disabled={!counterOfferAmount}
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
                '&.Mui-disabled': {
                  bgcolor: 'rgba(124, 58, 237, 0.12)',
                  color: 'rgba(255, 255, 255, 0.7)'
                }
              }}
            >
              Send Counter Offer
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default Messages;
